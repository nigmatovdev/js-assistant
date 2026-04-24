import os
import json
import sys
import chromadb
from sentence_transformers import SentenceTransformer

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHUNKS_PATH = os.path.join(ROOT_DIR, "data", "chunks.json")
CHROMA_DIR = os.path.join(ROOT_DIR, "db", "chroma")

COLLECTION_NAME = "jk_chunks"
MODEL_NAME = "BAAI/bge-m3"
BATCH_SIZE = 64


def main():
    print(f"Loading chunks from {CHUNKS_PATH}...")
    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)
    print(f"  {len(chunks)} chunks loaded.")

    print(f"\nLoading embedding model: {MODEL_NAME} (GPU)...")
    model = SentenceTransformer(MODEL_NAME, device="cuda")

    texts = [c["text"] for c in chunks]

    print(f"\nEmbedding {len(texts)} chunks (batch_size={BATCH_SIZE})...")
    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    print(f"  Embeddings shape: {embeddings.shape}")

    print(f"\nConnecting to ChromaDB at {CHROMA_DIR}...")
    client = chromadb.PersistentClient(path=CHROMA_DIR)

    # Drop and recreate so re-runs are idempotent
    try:
        client.delete_collection(COLLECTION_NAME)
        print(f"  Deleted existing collection '{COLLECTION_NAME}'.")
    except Exception:
        pass

    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    print(f"\nIngesting into ChromaDB collection '{COLLECTION_NAME}'...")
    ids = [c["id"] for c in chunks]
    metadatas = [
        {
            "modda": str(c["modda"]),
            "chunk_id": c["chunk_id"],
            "title": c["metadata"]["title"],
            "qism": c["metadata"].get("qism", ""),
            "bolim": c["metadata"].get("bolim", ""),
            "bob": c["metadata"].get("bob", ""),
        }
        for c in chunks
    ]

    # Ingest in batches (ChromaDB recommends ≤ 5000 per call)
    ingest_batch = 500
    for start in range(0, len(chunks), ingest_batch):
        end = min(start + ingest_batch, len(chunks))
        collection.add(
            ids=ids[start:end],
            embeddings=embeddings[start:end].tolist(),
            documents=texts[start:end],
            metadatas=metadatas[start:end],
        )
        print(f"  Ingested {end}/{len(chunks)}", end="\r")

    print(f"\nDone. Collection '{COLLECTION_NAME}' has {collection.count()} vectors.")


if __name__ == "__main__":
    main()
