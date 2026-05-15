"""
Hybrid retrieval engine: BM25 + FAISS semantic search with score fusion.

Architecture
------------
On startup (called once from pipeline._load):
  1. FAISS index and parallel metadata list are loaded from db/faiss/
  2. A BM25 index is built over the tokenised texts from metadata.json

On each query:
  1. BM25 retrieves top-K candidates with normalised keyword score
  2. FAISS retrieves top-K candidates with cosine similarity score
  3. Results are merged by document ID
  4. Fused score = α * BM25_norm + (1-α) * cosine_score
  5. Results above MIN_SCORE threshold are returned, sorted by fused score

Embeddings: BAAI/bge-m3 (L2-normalised) → FAISS IndexFlatIP == cosine similarity
"""

import json
import os
import re
from typing import Optional

import numpy as np
from dotenv import load_dotenv

from back.rag.normalizer  import normalize
from back.rag.meta_filter import MetaFilter, matches as meta_matches

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

# ── Configuration ──────────────────────────────────────────────────────────────
_raw_faiss_dir = os.getenv("FAISS_DIR", os.path.join(ROOT_DIR, "db", "faiss"))
FAISS_DIR      = _raw_faiss_dir if os.path.isabs(_raw_faiss_dir) else os.path.join(ROOT_DIR, _raw_faiss_dir)
INDEX_PATH     = os.path.join(FAISS_DIR, "index.faiss")
META_PATH      = os.path.join(FAISS_DIR, "metadata.json")

EMBED_MODEL     = os.getenv("EMBED_MODEL",   "BAAI/bge-m3")
MIN_SCORE       = float(os.getenv("MIN_SCORE",   "0.30"))
BM25_WEIGHT     = float(os.getenv("BM25_WEIGHT", "0.40"))   # α for fusion
SEMANTIC_WEIGHT = 1.0 - BM25_WEIGHT

# ── Module-level singletons ───────────────────────────────────────────────────
_embed_model = None          # SentenceTransformer
_faiss_index = None          # faiss.Index
_metadata: list[dict] = []  # parallel list of chunk dicts (same order as index)

_bm25       = None           # BM25Okapi instance
_bm25_ids:  list[str] = []  # chunk ids, parallel to corpus


# ── Tokeniser for BM25 ────────────────────────────────────────────────────────
_TOKEN_RE = re.compile(r"[^\w]+", re.UNICODE)

def _tokenize(text: str) -> list[str]:
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
    """Initialise embedding model, FAISS index, metadata, and BM25 index."""
    global _embed_model, _faiss_index, _metadata, _bm25, _bm25_ids

    if _embed_model is None:
        from sentence_transformers import SentenceTransformer
        device = _get_device()
        print(f"[hybrid] Loading embedding model '{EMBED_MODEL}' on {device}...", flush=True)
        _embed_model = SentenceTransformer(EMBED_MODEL, device=device)

    if _faiss_index is None:
        import faiss
        print(f"[hybrid] Loading FAISS index from {INDEX_PATH}...", flush=True)
        _faiss_index = faiss.read_index(INDEX_PATH)
        with open(META_PATH, "r", encoding="utf-8") as f:
            _metadata = json.load(f)
        print(f"[hybrid] FAISS index: {_faiss_index.ntotal} vectors, {len(_metadata)} metadata entries.", flush=True)

    if _bm25 is None:
        _build_bm25_index()


def _build_bm25_index():
    global _bm25, _bm25_ids
    from rank_bm25 import BM25Okapi

    print("[hybrid] Building BM25 index...", flush=True)
    _bm25_ids = [m["id"] for m in _metadata]
    corpus    = [_tokenize(m["text"]) for m in _metadata]
    _bm25     = BM25Okapi(corpus)
    print(f"[hybrid] BM25 index built: {len(_bm25_ids)} documents.", flush=True)


# ── Retrieval helpers ─────────────────────────────────────────────────────────

def _filter_indices(f: Optional[MetaFilter]) -> Optional[list[int]]:
    """
    Return the FAISS/BM25 positional indices whose metadata satisfies f.
    Returns None when f is empty (no filter → search everything).
    """
    if f is None or f.is_empty:
        return None
    return [i for i, m in enumerate(_metadata) if meta_matches(m, f)]


def _bm25_retrieve(
    query: str,
    top_k: int,
    allowed_indices: Optional[list[int]] = None,
) -> dict[str, float]:
    """Return {chunk_id: normalised_bm25_score} for top_k results."""
    if _bm25 is None:
        return {}
    tokens = _tokenize(query)
    if not tokens:
        return {}
    scores = _bm25.get_scores(tokens)   # shape: (n_docs,)

    # Zero out docs outside the allowed set
    if allowed_indices is not None:
        mask = np.zeros(len(scores), dtype=bool)
        mask[allowed_indices] = True
        scores = scores * mask

    max_score = float(scores.max()) if scores.size else 1.0
    if max_score == 0:
        return {}
    top_idx = np.argsort(scores)[::-1][:top_k]
    return {
        _bm25_ids[i]: float(scores[i]) / max_score
        for i in top_idx
        if scores[i] > 0
    }


def _semantic_retrieve(
    query: str,
    top_k: int,
    allowed_indices: Optional[list[int]] = None,
) -> dict[str, tuple[float, dict]]:
    """
    Return {chunk_id: (cosine_score, meta_dict)} for top_k results.

    When allowed_indices is provided, reconstruct those vectors and score
    manually — avoids scanning the entire FAISS index.
    """
    if _embed_model is None or _faiss_index is None:
        return {}

    emb = _embed_model.encode(
        [normalize(query)],
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype("float32")[0]   # shape: (dim,)

    if allowed_indices is not None and len(allowed_indices) > 0:
        # Reconstruct only the filtered vectors and score with dot product
        dim = emb.shape[0]
        subset = np.zeros((len(allowed_indices), dim), dtype=np.float32)
        for j, idx in enumerate(allowed_indices):
            _faiss_index.reconstruct(idx, subset[j])
        raw_scores = np.dot(subset, emb)   # cosine (L2-normalised)

        top_k_local = min(top_k, len(allowed_indices))
        top_local = np.argsort(raw_scores)[::-1][:top_k_local]
        out: dict[str, tuple[float, dict]] = {}
        for j in top_local:
            meta  = _metadata[allowed_indices[j]]
            score = float(raw_scores[j])
            if score > 0:
                out[meta["id"]] = (score, meta)
        return out
    else:
        # Full FAISS search
        scores, indices = _faiss_index.search(emb[np.newaxis], top_k)
        out = {}
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            meta = _metadata[idx]
            out[meta["id"]] = (float(score), meta)
        return out


def _fuse_and_rank(
    bm25_scores:     dict[str, float],
    semantic_scores: dict[str, tuple[float, dict]],
    top_k:           int,
) -> list[dict]:
    """Fuse BM25 + semantic scores, sort, and apply MIN_SCORE threshold."""
    id_to_meta: dict[str, dict] = {m["id"]: m for m in _metadata}
    all_ids = set(bm25_scores) | set(semantic_scores)
    fused: list[dict] = []

    for did in all_ids:
        bm25_s = bm25_scores.get(did, 0.0)
        if did in semantic_scores:
            sem_s, meta = semantic_scores[did]
        else:
            sem_s = 0.0
            meta  = id_to_meta.get(did, {})

        fused_score = BM25_WEIGHT * bm25_s + SEMANTIC_WEIGHT * sem_s
        fused.append({
            "id":             did,
            "text":           meta.get("text", ""),
            "metadata":       meta,
            "score":          round(fused_score, 4),
            "bm25_score":     round(bm25_s, 4),
            "semantic_score": round(sem_s, 4),
        })

    fused.sort(key=lambda x: x["score"], reverse=True)
    return [r for r in fused if r["score"] >= MIN_SCORE][:top_k]


# ── Main retrieval ─────────────────────────────────────────────────────────────

def retrieve(
    question:    str,
    top_k:       int = 5,
    meta_filter: Optional[MetaFilter] = None,
) -> list[dict]:
    """
    Hybrid BM25 + FAISS retrieval with optional metadata pre-filtering.

    When meta_filter specifies an article/section, only those chunks are
    scored — drastically reducing irrelevant results for direct lookups.

    Falls back to full unfiltered search if the filter yields no results.

    Returns list of dicts:
      id, text, metadata, score, bm25_score, semantic_score
    Sorted by fused score descending; only results >= MIN_SCORE returned.
    """
    fetch_k         = max(top_k * 2, 10)
    allowed_indices = _filter_indices(meta_filter)

    if allowed_indices is not None:
        print(
            f"[hybrid] Metadata filter active → {len(allowed_indices)} candidate chunks "
            f"(modda={getattr(meta_filter, 'modda', None)}, "
            f"qism={getattr(meta_filter, 'qism', None)}, "
            f"bob={getattr(meta_filter, 'bob', None)})",
            flush=True,
        )

    bm25_scores     = _bm25_retrieve(question, fetch_k, allowed_indices)
    semantic_scores = _semantic_retrieve(question, fetch_k, allowed_indices)

    results = _fuse_and_rank(bm25_scores, semantic_scores, top_k)

    # Fallback: if filter was too strict and returned nothing, retry without filter
    if not results and allowed_indices is not None:
        print("[hybrid] Filter yielded no results — falling back to full search.", flush=True)
        bm25_scores     = _bm25_retrieve(question, fetch_k)
        semantic_scores = _semantic_retrieve(question, fetch_k)
        results         = _fuse_and_rank(bm25_scores, semantic_scores, top_k)

    return results
