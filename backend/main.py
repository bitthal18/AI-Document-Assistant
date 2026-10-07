from fastapi import (
    FastAPI,
    HTTPException,
    Depends,
    UploadFile,
    File
)

from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base, SessionLocal
import models

from schemas import (
    UserCreate,
    UserLogin,
    QuestionRequest
)

from pwdlib import PasswordHash

from auth import (
    create_access_token,
    get_current_user
)

from rag.loader import load_pdf
from rag.text_splitter import split_documents
from rag.vector_store import (
    create_vector_store,
    load_vector_store
)

from rag.llm import get_llm

import os
import shutil


# ==========================================
# CREATE DATABASE TABLES
# ==========================================

Base.metadata.create_all(bind=engine)


# ==========================================
# CREATE FASTAPI APP
# ==========================================

app = FastAPI()


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ==========================================
# PASSWORD HASHING
# ==========================================

password_hash = PasswordHash.recommended()


# ==========================================
# UPLOAD DIRECTORY
# ==========================================

UPLOAD_DIR = "uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():

    return {
        "message": "AI Document Assistant is running"
    }


# ==========================================
# REGISTER
# ==========================================

@app.post("/register")
def register(
    user: UserCreate
):

    db = SessionLocal()

    try:

        # Check existing email
        existing_user = db.query(
            models.User
        ).filter(
            models.User.email == user.email
        ).first()

        if existing_user:

            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        # Hash password
        hashed_password = password_hash.hash(
            user.password
        )

        # Every newly registered user is normal user
        new_user = models.User(
            name=user.name,
            email=user.email,
            password=hashed_password,
            role="user"
        )

        db.add(new_user)

        db.commit()

        db.refresh(new_user)

        return {

            "message":
                "User registered successfully",

            "id":
                new_user.id,

            "name":
                new_user.name,

            "email":
                new_user.email,

            "role":
                new_user.role
        }

    finally:

        db.close()


# ==========================================
# LOGIN
# ==========================================

@app.post("/login")
def login(
    user: UserLogin
):

    db = SessionLocal()

    try:

        # Find user
        db_user = db.query(
            models.User
        ).filter(
            models.User.email == user.email
        ).first()

        if db_user is None:

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Verify password
        password_correct = password_hash.verify(
            user.password,
            db_user.password
        )

        if not password_correct:

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Create JWT token
        access_token = create_access_token({

            "sub":
                str(db_user.id),

            "role":
                db_user.role
        })

        return {

            "message":
                "Login successful",

            "access_token":
                access_token,

            "token_type":
                "bearer",

            "id":
                db_user.id,

            "name":
                db_user.name,

            "email":
                db_user.email,

            "role":
                db_user.role
        }

    finally:

        db.close()


# ==========================================
# GET CURRENT USER
# ==========================================

@app.get("/me")
def get_me(
    current_user: dict =
        Depends(get_current_user)
):

    return {

        "message":
            "You are authenticated",

        "user_id":
            current_user["id"],

        "role":
            current_user["role"]
    }


# ==========================================
# ADMIN ONLY
# ==========================================

@app.get("/admin")
def admin_only(
    current_user: dict =
        Depends(get_current_user)
):

    if current_user["role"] != "admin":

        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return {

        "message":
            "Welcome Admin",

        "user_id":
            current_user["id"],

        "role":
            current_user["role"]
    }


# ==========================================
# UPLOAD DOCUMENT
# ADMIN ONLY
# ==========================================

@app.post("/documents/upload")
def upload_document(

    file: UploadFile = File(...),

    current_user: dict =
        Depends(get_current_user)
):

    # ==========================================
    # CHECK ADMIN
    # ==========================================

    if current_user["role"] != "admin":

        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )


    # ==========================================
    # CHECK FILE TYPE
    # ==========================================

    if not file.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )


    # ==========================================
    # CREATE FILE PATH
    # ==========================================

    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )


    # ==========================================
    # SAVE PDF
    # ==========================================

    with open(
        file_path,
        "wb"
    ) as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )


    db = SessionLocal()

    try:

        # ==========================================
        # CREATE DOCUMENT RECORD
        # ==========================================

        new_document = models.Document(

            title =
                os.path.splitext(
                    file.filename
                )[0],

            filename =
                file.filename,

            uploaded_by =
                current_user["id"]
        )


        db.add(new_document)

        db.commit()

        db.refresh(new_document)


        document_id = new_document.id


        # ==========================================
        # LOAD PDF
        # ==========================================

        documents = load_pdf(
            file_path
        )


        # ==========================================
        # SPLIT DOCUMENT
        # ==========================================

        chunks = split_documents(
            documents
        )


        # ==========================================
        # CREATE VECTOR STORE
        # ==========================================

        create_vector_store(
            chunks,
            document_id
        )


        return {

            "message":
                "Document uploaded and indexed successfully",

            "document_id":
                document_id,

            "title":
                new_document.title,

            "filename":
                new_document.filename,

            "uploaded_by":
                new_document.uploaded_by,

            "total_chunks":
                len(chunks)
        }


    except Exception as e:

        # Rollback DB
        db.rollback()


        # Delete uploaded file
        if os.path.exists(file_path):

            os.remove(file_path)


        raise HTTPException(

            status_code=500,

            detail=
                f"Document processing failed: {str(e)}"
        )


    finally:

        db.close()


# ==========================================
# GET ALL DOCUMENTS
# ADMIN ONLY
# ==========================================

@app.get("/documents")
def get_documents(

    current_user: dict =
        Depends(get_current_user)
):

    # Check admin
    if current_user["role"] != "admin":

        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )


    db = SessionLocal()

    try:

        documents = db.query(
            models.Document
        ).all()


        result = []


        for document in documents:

            result.append({

                "id":
                    document.id,

                "title":
                    document.title,

                "filename":
                    document.filename,

                "uploaded_by":
                    document.uploaded_by,

                "created_at":
                    document.created_at
            })


        return {

            "documents":
                result
        }


    finally:

        db.close()


# ==========================================
# DELETE DOCUMENT
# ADMIN ONLY
# ==========================================

@app.delete("/documents/{document_id}")
def delete_document(

    document_id: int,

    current_user: dict =
        Depends(get_current_user)
):

    # ==========================================
    # CHECK ADMIN
    # ==========================================

    if current_user["role"] != "admin":

        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )


    db = SessionLocal()

    try:

        # ==========================================
        # FIND DOCUMENT
        # ==========================================

        document = db.query(
            models.Document
        ).filter(
            models.Document.id == document_id
        ).first()


        if document is None:

            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )


        filename = document.filename


        # ==========================================
        # DELETE VECTOR DATA
        # ==========================================

        try:

            vector_store = load_vector_store()

            vector_store._collection.delete(

                where={
                    "document_id":
                        document_id
                }

            )

        except Exception as vector_error:

            print(
                "Vector deletion warning:",
                vector_error
            )


        # ==========================================
        # DELETE DOCUMENT ACCESS RECORDS
        # ==========================================

        db.query(
            models.DocumentAccess
        ).filter(
            models.DocumentAccess.document_id
            == document_id
        ).delete(
            synchronize_session=False
        )


        # ==========================================
        # DELETE DATABASE DOCUMENT
        # ==========================================

        db.delete(
            document
        )

        db.commit()


        # ==========================================
        # DELETE PDF FILE
        # ==========================================

        file_path = os.path.join(
            UPLOAD_DIR,
            filename
        )


        if os.path.exists(file_path):

            os.remove(file_path)


        return {

            "message":
                "Document deleted successfully",

            "document_id":
                document_id
        }


    finally:

        db.close()


# ==========================================
# ASK QUESTION
# ADMIN + USER
# ==========================================

@app.post("/ask")
def ask_question(

    request: QuestionRequest,

    current_user: dict =
        Depends(get_current_user)
):

    # ==========================================
    # LOAD VECTOR STORE
    # ==========================================

    vector_store = load_vector_store()


    # ==========================================
    # CREATE RETRIEVER
    # ==========================================

    retriever = vector_store.as_retriever(

        search_kwargs={

            "k": 8

        }

    )


    # ==========================================
    # GET LLM
    # ==========================================

    llm = get_llm()


    # ==========================================
    # RETRIEVE RELEVANT CHUNKS
    # ==========================================

    documents = retriever.invoke(
        request.question
    )


    # ==========================================
    # CHECK RESULT
    # ==========================================

    if not documents:

        raise HTTPException(

            status_code=404,

            detail=
                "No relevant document found"
        )


    # ==========================================
    # CREATE CONTEXT
    # ==========================================

    context_parts = []


    for document in documents:

        metadata = document.metadata


        context_parts.append(

            f"""
Metadata:
{metadata}

Content:
{document.page_content}
"""
        )


    context = "\n\n".join(
        context_parts
    )


    # ==========================================
    # CREATE PROMPT
    # ==========================================

    prompt = f"""
You are an AI document assistant.

Answer the user's question using ONLY the provided context.

Rules:

1. Give a clear and accurate answer.
2. Keep the answer appropriate to the question.
3. Do not repeat the same information.
4. Do not add outside knowledge.
5. If the answer is not present in the context,
say "I don't know based on the documents."

Context:

{context}

Question:

{request.question}

Answer:
"""


    # ==========================================
    # GENERATE ANSWER
    # ==========================================

    answer = llm.invoke(
        prompt
    )


    # ==========================================
    # SAVE CHAT HISTORY
    # ==========================================

    db = SessionLocal()

    try:

        chat = models.ChatHistory(

            user_id =
                current_user["id"],

            question =
                request.question,

            answer =
                answer
        )


        db.add(chat)

        db.commit()


    finally:

        db.close()


    # ==========================================
    # PREPARE UNIQUE SOURCES
    # ==========================================

    sources = []

    seen_sources = set()


    for document in documents:

        page = document.metadata.get(
            "page_label"
        )

        source = document.metadata.get(
            "source"
        )


        # ==========================================
        # CREATE UNIQUE KEY
        # ==========================================

        source_key = (
            source,
            page
        )


        # ==========================================
        # SKIP DUPLICATE
        # ==========================================

        if source_key in seen_sources:

            continue


        seen_sources.add(
            source_key
        )


        # ==========================================
        # ADD SOURCE
        # ==========================================

        sources.append({

            "page":
                page,

            "source":
                source
        })


    # ==========================================
    # RETURN RESPONSE
    # ==========================================

    return {

        "answer":
            answer,

        "sources":
            sources
    }


# ==========================================
# CHAT HISTORY
# ==========================================

@app.get("/chat-history")
def get_chat_history(

    current_user: dict =
        Depends(get_current_user)
):

    db = SessionLocal()

    try:

        history = db.query(
            models.ChatHistory
        ).filter(

            models.ChatHistory.user_id
            ==
            current_user["id"]

        ).order_by(

            models.ChatHistory.created_at.desc()

        ).all()


        result = []


        for chat in history:

            result.append({

                "id":
                    chat.id,

                "question":
                    chat.question,

                "answer":
                    chat.answer,

                "created_at":
                    chat.created_at
            })


        return {

            "chat_history":
                result
        }


    finally:

        db.close()