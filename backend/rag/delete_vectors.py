from rag.vector_store import delete_document_vectors


# sample.pdf ka document_id
document_id = 2


delete_document_vectors(
    document_id
)


print(
    f"Vectors deleted successfully for document_id={document_id}"
)