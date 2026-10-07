from rag.vector_store import load_vector_store


# ==========================================
# GET RETRIEVER
# ALL LOGGED-IN USERS CAN ACCESS DOCUMENTS
# ==========================================

def get_retriever():

    # Load Chroma vector store
    vector_store = load_vector_store()

    # Create retriever
    retriever = vector_store.as_retriever(
        search_kwargs={
            "k": 8
        }
    )

    return retriever