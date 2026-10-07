from langchain_ollama import OllamaEmbeddings


def get_embeddings():

    embeddings = OllamaEmbeddings(
        model="nomic-embed-text-v2-moe:latest"
    )

    return embeddings