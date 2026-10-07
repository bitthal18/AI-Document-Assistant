from rag.loader import load_pdf
from rag.text_splitter import split_documents
from rag.vector_store import create_vector_store


# ==========================================
# DOCUMENT INFORMATION
# ==========================================

file_path = "uploads/sample.pdf"

document_id = 2


# ==========================================
# LOAD PDF
# ==========================================

documents = load_pdf(file_path)


# ==========================================
# SPLIT PDF
# ==========================================

chunks = split_documents(documents)

print("Total Chunks:", len(chunks))


# ==========================================
# CREATE VECTOR STORE
# ==========================================

vector_store = create_vector_store(
    chunks,
    document_id
)


print("Vector store created successfully!")