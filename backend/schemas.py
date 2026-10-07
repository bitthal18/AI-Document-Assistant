from pydantic import BaseModel, EmailStr


# ==========================================
# REGISTER SCHEMA
# ==========================================

class UserCreate(BaseModel):

    name: str
    email: EmailStr
    password: str


# ==========================================
# LOGIN SCHEMA
# ==========================================

class UserLogin(BaseModel):

    email: EmailStr
    password: str


# ==========================================
# ASK QUESTION SCHEMA
# ==========================================

class QuestionRequest(BaseModel):

    question: str