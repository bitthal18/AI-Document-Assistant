from langchain_chroma import Chroma

from rag.embeddings import get_embeddings


# ==========================================
# CREATE VECTOR STORE
# ==========================================

def create_vector_store(chunks, document_id):

    embeddings = get_embeddings()

    # Add document_id to every chunk
    for chunk in chunks:

        chunk.metadata["document_id"] = document_id

    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory="chroma_db"
    )

    return vector_store


# ==========================================
# LOAD VECTOR STORE
# ==========================================

def load_vector_store():

    embeddings = get_embeddings()

    vector_store = Chroma(
        persist_directory="chroma_db",
        embedding_function=embeddings
    )

    return vector_store


# ==========================================
# DELETE DOCUMENT VECTORS
# ==========================================

def delete_document_vectors(document_id):

    vector_store = load_vector_store()

    vector_store.delete(
        where={
            "document_id": document_id
        }
    )

    return True