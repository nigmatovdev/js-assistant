"""
Context Compressor — Extractive sentence selection.

For each retrieved chunk, keeps only the sentences most relevant to the
query instead of sending the full text to the LLM.

Strategy
--------
1. Skip chunks already short enough (< MIN_CHARS) — no compression needed.
2. Split chunk text into segments on sentence / clause boundaries.
3. Segment 0 is always the article header ("18-modda. Title.") — always kept.
4. Remaining segments are scored by Jaccard similarity against the query tokens.
5. Top MAX_BODY_SEGS segments are kept; the rest are dropped.
6. Compressed chunk gets a "compressed": True flag and updated "text".

Token savings: typically 60–85% for long multi-paragraph chunks.
"""

import re

from back.rag.normalizer import normalize

# ── Parameters ────────────────────────────────────────────────────────────────
MIN_CHARS     = 280   # chunks shorter than this are not compressed
MAX_BODY_SEGS = 3     # max body sentences to keep per chunk (+ always the header)

# ── Tokeniser (lightweight, shared logic with BM25 tokeniser) ─────────────────
_TOKEN_RE = re.compile(r"[^\w]+", re.UNICODE)

def _tokenize(text: str) -> set[str]:
    normed = normalize(text)
    return {t for t in _TOKEN_RE.split(normed.lower()) if len(t) > 1}


# ── Sentence splitter ─────────────────────────────────────────────────────────
# Split on:  period or semicolon followed by whitespace  |  bare newline
_SPLIT_RE = re.compile(r"(?<=[.;])\s+|\n+")

def _split_segments(text: str) -> list[str]:
    parts = [s.strip() for s in _SPLIT_RE.split(text)]
    return [p for p in parts if p]


# ── Jaccard relevance score ───────────────────────────────────────────────────
def _jaccard(sent_tokens: set[str], query_tokens: set[str]) -> float:
    if not query_tokens:
        return 0.0
    intersection = len(sent_tokens & query_tokens)
    union        = len(sent_tokens | query_tokens)
    return intersection / union if union else 0.0


# ── Public API ────────────────────────────────────────────────────────────────

def compress_chunks(chunks: list[dict], query: str) -> list[dict]:
    """
    Extractive compression: replace each long chunk's text with only the
    sentences relevant to the query.

    Parameters
    ----------
    chunks : list[dict]
        Retrieved chunks (from hybrid retrieval / merge).
        Each dict must have at least a "text" key.
    query : str
        The original user question (used to score sentence relevance).

    Returns
    -------
    Same list with "text" fields compressed and "compressed": bool added.
    Original chunk dicts are not mutated — new dicts are returned.
    """
    if not query or not chunks:
        return chunks

    query_tokens = _tokenize(query)
    compressed: list[dict] = []

    for chunk in chunks:
        text = chunk.get("text", "")

        if len(text) < MIN_CHARS:
            compressed.append({**chunk, "compressed": False})
            continue

        segments = _split_segments(text)

        if len(segments) <= 2:
            # Too few segments — nothing meaningful to compress
            compressed.append({**chunk, "compressed": False})
            continue

        # Segment 0: article header — always kept
        header   = segments[0]
        body     = segments[1:]

        # Score each body segment
        scored = [
            (seg, _jaccard(_tokenize(seg), query_tokens))
            for seg in body
        ]
        scored.sort(key=lambda x: x[1], reverse=True)

        # Keep top MAX_BODY_SEGS; ensure at least 1 body segment is kept
        kept_body = [seg for seg, _ in scored[:MAX_BODY_SEGS]]

        # Rebuild in original order for readability
        original_order = [s for s in body if s in set(kept_body)]
        new_text = header + "\n" + " ".join(original_order)

        chars_before = len(text)
        chars_after  = len(new_text)
        ratio        = 1 - chars_after / chars_before if chars_before else 0
        print(
            f"[compressor] {chunk.get('id', '?')[:40]} "
            f"{chars_before}→{chars_after} chars  ({ratio:.0%} reduction)",
            flush=True,
        )

        compressed.append({**chunk, "text": new_text, "compressed": True})

    return compressed
