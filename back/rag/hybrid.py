"""
Hybrid retrieval engine: BM25 + ChromaDB semantic search with score fusion.

Architecture
------------
On startup (called once from pipeline._load):
  1. All documents are fetched from Chroma collection
  2. A BM25 index is built over the tokenized texts

On each query:
  1. BM25 retrieves top-K candidates with keyword score
  2. Chroma retrieves top-K candidates with semantic score
  3. Results are merged by document ID
  4. Fused score = α * BM25_norm + (1-α) * semantic_score
  5. Results above MIN_SCORE threshold are returned, sorted by fused score

Keeps: ChromaDB, BAAI/bge-m3, all existing metadata fields.
Adds:  rank_bm25 (pure-Python, no native deps).
"""

import os
import re
from typing import Optional

from dotenv import load_dotenv

import chromadb
from sentence_transformers import SentenceTransformer

from back.rag.normalizer import normalize

# Load .env from project root
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

# ── Configuration ─────────────────────────────────────────────────────────────
_raw_chroma_dir = os.getenv("CHROMA_DIR", os.path.join(ROOT_DIR, "db", "chroma"))

# Resolve relative CHROMA_DIR paths against project root
CHROMA_DIR      = _raw_chroma_dir if os.path.isabs(_raw_chroma_dir) else os.path.join(ROOT_DIR, _raw_chroma_dir)
COLLECTION_NAME = "jk_chunks"
EMBED_MODEL     = os.getenv("EMBED_MODEL",  "BAAI/bge-m3")
MIN_SCORE       = float(os.getenv("MIN_SCORE", "0.30"))   # lowered — fallback handles weak hits
BM25_WEIGHT     = float(os.getenv("BM25_WEIGHT", "0.40")) # α for fusion
SEMANTIC_WEIGHT = 1.0 - BM25_WEIGHT

# ── Module-level singletons ───────────────────────────────────────────────────
_embed_model: Optional[SentenceTransformer] = None
_collection  = None
_bm25        = None          # BM25Okapi instance
_bm25_ids: list[str] = []   # parallel list of doc IDs for BM25


# ── Tokenizer for BM25 ────────────────────────────────────────────────────────
_TOKEN_RE = re.compile(r"[^\w]+", re.UNICODE)

def _tokenize(text: str) -> list[str]:
    """Simple whitespace/punct tokenizer, lowercased, after normalization."""
    normed = normalize(text)
    return [t for t in _TOKEN_RE.split(normed.lower()) if len(t) > 1]


# ── Device detection ──────────────────────────────────────────────────────────
def _get_device() -> str:
    try:
        import torch
        return "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        return "cpu"


# ── Loader (called once at startup) ───────────────────────────────────────────
def load():
    """
    Initialize embedding model, Chroma collection, and BM25 index.
    Safe to call multiple times — uses module-level singletons.
    """
    global _embed_model, _collection, _bm25, _bm25_ids

    if _embed_model is None:
        device = _get_device()
        print(f"[hybrid] Loading embedding model '{EMBED_MODEL}' on {device}...", flush=True)
        _embed_model = SentenceTransformer(EMBED_MODEL, device=device)

    if _collection is None:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        _collection = client.get_collection(COLLECTION_NAME)

    if _bm25 is None:
        _build_bm25_index()


def _build_bm25_index():
    """Fetch all documents from Chroma and build BM25 index."""
    global _bm25, _bm25_ids
    from rank_bm25 import BM25Okapi

    print("[hybrid] Building BM25 index from Chroma...", flush=True)
    # Fetch all docs (ids + documents only — skip embeddings for speed)
    all_docs = _collection.get(include=["documents"])
    ids   = all_docs["ids"]
    texts = all_docs["documents"]

    _bm25_ids = ids
    corpus    = [_tokenize(t) for t in texts]
    _bm25     = BM25Okapi(corpus)
    print(f"[hybrid] BM25 index built: {len(ids)} documents.", flush=True)


# ── Retrieval ─────────────────────────────────────────────────────────────────

def _bm25_retrieve(query: str, top_k: int) -> dict[str, float]:
    """Return {doc_id: normalized_bm25_score} for top_k results."""
    if _bm25 is None:
        return {}
    tokens = _tokenize(query)
    if not tokens:
        return {}
    scores = _bm25.get_scores(tokens)

    # Normalize to [0, 1]
    max_score = float(max(scores)) if scores.any() else 1.0
    if max_score == 0:
        return {}

    # Take top_k indices
    import numpy as np
    top_indices = np.argsort(scores)[::-1][:top_k]
    return {
        _bm25_ids[i]: float(scores[i]) / max_score
        for i in top_indices
        if scores[i] > 0
    }


def _semantic_retrieve(query: str, top_k: int) -> dict[str, tuple[float, str, dict]]:
    """Return {doc_id: (semantic_score, text, metadata)} for top_k results."""
    if _embed_model is None or _collection is None:
        return {}
    emb = _embed_model.encode(
        [normalize(query)],
        normalize_embeddings=True,
    )[0].tolist()
    results = _collection.query(query_embeddings=[emb], n_results=top_k)
    out: dict[str, tuple[float, str, dict]] = {}
    for i in range(len(results["ids"][0])):
        doc_id = results["ids"][0][i]
        # Chroma cosine distance → similarity
        score = 1.0 - results["distances"][0][i]
        text  = results["documents"][0][i]
        meta  = results["metadatas"][0][i]
        out[doc_id] = (score, text, meta)
    return out


def retrieve(question: str, top_k: int = 5) -> list[dict]:
    """
    Hybrid retrieval: BM25 + semantic fusion.

    Parameters
    ----------
    question : str
        User question (raw, will be normalized internally)
    top_k : int
        Number of results to return (after fusion and filtering)

    Returns
    -------
    list of dicts with keys: id, text, metadata, score, bm25_score, semantic_score
    Sorted by fused score descending. Only results >= MIN_SCORE are returned.
    """
    # Retrieve from both sources (fetch 2×top_k to have enough candidates)
    fetch_k = max(top_k * 2, 10)
    bm25_scores     = _bm25_retrieve(question, fetch_k)
    semantic_scores = _semantic_retrieve(question, fetch_k)

    # Union of all candidate doc IDs
    all_ids = set(bm25_scores) | set(semantic_scores)

    # Need doc text+metadata for BM25-only results
    # Fetch them from Chroma if missing from semantic results
    missing_ids = [did for did in all_ids if did not in semantic_scores]
    meta_cache: dict[str, tuple[str, dict]] = {}
    if missing_ids:
        fetched = _collection.get(
            ids=missing_ids,
            include=["documents", "metadatas"],
        )
        for i, did in enumerate(fetched["ids"]):
            meta_cache[did] = (fetched["documents"][i], fetched["metadatas"][i])

    # Fuse scores
    fused: list[dict] = []
    for did in all_ids:
        bm25_s = bm25_scores.get(did, 0.0)
        sem_s, text, meta = (
            semantic_scores[did]
            if did in semantic_scores
            else (0.0, *meta_cache.get(did, ("", {})))
        )
        fused_score = BM25_WEIGHT * bm25_s + SEMANTIC_WEIGHT * sem_s
        fused.append({
            "id":            did,
            "text":          text,
            "metadata":      meta,
            "score":         round(fused_score, 4),
            "bm25_score":    round(bm25_s, 4),
            "semantic_score": round(sem_s, 4),
        })

    # Sort by fused score and apply threshold
    fused.sort(key=lambda x: x["score"], reverse=True)
    results = [r for r in fused if r["score"] >= MIN_SCORE][:top_k]

    return results
