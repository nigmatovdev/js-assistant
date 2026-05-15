"""
Structure-aware chunker for the Uzbekistan Criminal Code.

Splitting strategy (per article / modda):
  1. Try to detect internal paragraph boundaries using legal markup patterns.
  2. If boundaries are found → emit one chunk per paragraph, each prefixed
     with the article header so every chunk is self-contained.
  3. If no boundaries → the whole article becomes a single chunk.

Detected boundaries (at the start of a line):
  • Numbered clause    — "1. " or "1) "
  • Lettered sub-item  — "a) " (Latin or Cyrillic single lowercase letter)
  • Em-dash item       — "— "

Chunk types stored in metadata:
  "article"   — whole article with no detected sub-structure
  "intro"     — leading prose before the first numbered clause
  "paragraph" — a numbered / lettered / dash-delimited paragraph
"""

import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH  = os.path.join(SCRIPT_DIR, "structured.json")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "chunks.json")

# Zero-width lookahead: split just before a paragraph marker at line start.
_PARA_BOUNDARY = re.compile(
    r"(?m)^(?="
    r"\d+[\.\)]\s+"         # 1.  or  1)
    r"|[a-zа-яʻʼ]\)\s+"    # a)  (single Latin or Cyrillic lowercase letter)
    r"|—\s+"                # — em-dash enumeration
    r")"
)


def _split_paragraphs(content: str) -> list[tuple[str, str]]:
    """
    Split article content into (chunk_type, text) pairs.

    Returns:
      [("intro", "…")]                     — no structure: just leading prose
      [("intro", "…"), ("paragraph", "…"), …]  — intro + numbered paragraphs
      [("paragraph", "…"), …]              — starts immediately with a clause
    """
    parts = [p.strip() for p in _PARA_BOUNDARY.split(content.strip()) if p.strip()]
    if not parts:
        return []

    result: list[tuple[str, str]] = []
    # The first part is "intro" only if it does NOT start with a paragraph marker.
    first_is_marker = bool(re.match(r"^\d+[\.\)]\s+|^[a-zа-яʻʼ]\)\s+|^—\s+", parts[0]))
    chunk_type_first = "paragraph" if first_is_marker else "intro"
    result.append((chunk_type_first, parts[0]))

    for part in parts[1:]:
        result.append(("paragraph", part))

    return result


def _make_chunk(item: dict, para_id: int, chunk_type: str, text: str) -> dict:
    return {
        "id":            f"{item['id']}_para_{para_id}",
        "modda":         item["modda"],
        "modda_display": item["modda_display"],
        "para_id":       para_id,
        "chunk_type":    chunk_type,
        "text":          text,
        "metadata": {
            "qism":          item["hierarchy"]["qism"],
            "bolim":         item["hierarchy"]["bolim"],
            "bob":           item["hierarchy"]["bob"],
            "title":         item["title"],
            "modda_display": item["modda_display"],
            "para_id":       para_id,
            "chunk_type":    chunk_type,
        },
    }


def process():
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    all_chunks: list[dict] = []

    for item in data:
        header  = f"{item['modda_display']}-modda. {item['title']}."
        content = item.get("content", "").strip()

        if not content:
            # Title-only article → single chunk
            all_chunks.append(_make_chunk(item, 0, "article", header))
            continue

        parts = _split_paragraphs(content)

        if len(parts) <= 1:
            # No internal structure: whole article is one chunk
            body = parts[0][1] if parts else content
            all_chunks.append(_make_chunk(item, 0, "article", f"{header}\n{body}"))
        else:
            for idx, (chunk_type, body) in enumerate(parts):
                all_chunks.append(
                    _make_chunk(item, idx, chunk_type, f"{header}\n{body}")
                )

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    # Summary
    type_counts: dict[str, int] = {}
    for c in all_chunks:
        t = c["chunk_type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    print(f"Processed {len(data)} articles → {len(all_chunks)} structure-aware chunks.")
    for t, n in sorted(type_counts.items()):
        print(f"  {t:12s} {n}")
    print(f"Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    process()
