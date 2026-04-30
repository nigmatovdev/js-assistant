"""
Embed chunks.json with BAAI/bge-m3 and persist as a FAISS index.

Outputs (both under db/faiss/):
  index.faiss    — IndexFlatIP, one vector per chunk (L2-normalised → cosine)
  metadata.json  — parallel list of chunk metadata, same order as the index
"""

import json
import os

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

ROOT_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHUNKS_PATH = os.path.join(ROOT_DIR, "data", "chunks.json")
FAISS_DIR   = os.path.join(ROOT_DIR, "db", "faiss")
INDEX_PATH  = os.path.join(FAISS_DIR, "index.faiss")
META_PATH   = os.path.join(FAISS_DIR, "metadata.json")

MODEL_NAME  = "BAAI/bge-m3"
BATCH_SIZE  = 64


def main():
    os.makedirs(FAISS_DIR, exist_ok=True)

    print(f"Loading chunks from {CHUNKS_PATH}...")
    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)
    print(f"  {len(chunks)} chunks loaded.")

    print(f"\nLoading embedding model: {MODEL_NAME}...")
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        device = "cpu"
    print(f"  Device: {device}")
    model = SentenceTransformer(MODEL_NAME, device=device)

    texts = [c["text"] for c in chunks]

    print(f"\nEmbedding {len(texts)} chunks (batch_size={BATCH_SIZE})...")
    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,   # L2-norm → inner product == cosine similarity
    )
    embeddings = embeddings.astype(np.float32)
    print(f"  Shape: {embeddings.shape}")

    dim = embeddings.shape[1]
    print(f"\nBuilding FAISS IndexFlatIP (dim={dim})...")
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    faiss.write_index(index, INDEX_PATH)
    print(f"  Saved index → {INDEX_PATH}  ({index.ntotal} vectors)")

    # Parallel metadata list — same order as the FAISS index
    metadata = [
        {
            "id":         c["id"],
            "text":       c["text"],
            "modda":      str(c["modda"]),
            "para_id":    c["para_id"],
            "chunk_type": c["chunk_type"],
            "title":      c["metadata"]["title"],
            "qism":       c["metadata"].get("qism", ""),
            "bolim":      c["metadata"].get("bolim", ""),
            "bob":        c["metadata"].get("bob", ""),
        }
        for c in chunks
    ]
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    print(f"  Saved metadata → {META_PATH}")

    print(f"\nDone. {index.ntotal} vectors in FAISS index.")


if __name__ == "__main__":
    main()
