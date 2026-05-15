"""
Metadata filter detector for legal queries.

Parses the user question for explicit references to:
  • Article number  (45-modda, 18¹-modda, article 45, modda 45)
  • Code section    (UMUMIY QISM, MAXSUS QISM)
  • Chapter         (I bob, II bob, …)

Returns a MetaFilter that hybrid.retrieve() uses to narrow the candidate
pool before BM25/FAISS scoring, so we don't waste compute on irrelevant chunks.

Fallback: if no matching chunks survive the filter, retrieve() automatically
drops the filter and runs a full search — zero precision loss.
"""

import re
from dataclasses import dataclass, field
from typing import Optional

# ── Unicode superscript → digit map ───────────────────────────────────────────
_SUP = {"¹": "1", "²": "2", "³": "3", "⁴": "4",
        "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9"}

# ── Regex patterns ─────────────────────────────────────────────────────────────
# Matches: "45-modda", "18¹-modda", "18 1-modda", "modda 45", "article 45"
_MODDA_PATTERN = re.compile(
    r"(?:"
    r"(\d+)([¹²³⁴⁵⁶⁷⁸⁹]|\s\d)?[\s\-]*modda"   # "45-modda" / "18¹-modda"
    r"|modda[\s\-]+(\d+)"                         # "modda 45"
    r"|\barticle[\s]+(\d+)"                       # "article 45"
    r")",
    re.IGNORECASE,
)
_QISM_PATTERN = re.compile(
    r"\b(umumiy|maxsus)\s+qism\b",
    re.IGNORECASE,
)
_BOB_PATTERN = re.compile(
    r"\b([IVXLC]{1,6})\s+bob\b",
    re.IGNORECASE,
)


# ── Filter dataclass ──────────────────────────────────────────────────────────

@dataclass
class MetaFilter:
    modda:      Optional[str] = None   # "45" | "18_1"
    qism:       Optional[str] = None   # "UMUMIY QISM" | "MAXSUS QISM"
    bob:        Optional[str] = None   # "I bob" (prefix match)
    chunk_type: Optional[str] = None   # "article" | "paragraph" | "intro"

    @property
    def is_empty(self) -> bool:
        return not any([self.modda, self.qism, self.bob, self.chunk_type])


def _normalize_modda(main: str, superscript: Optional[str]) -> str:
    """Convert raw regex groups into the modda key used in metadata."""
    result = main.strip()
    if superscript:
        sup = superscript.strip()
        # Unicode superscript character
        if sup in _SUP:
            result += f"_{_SUP[sup]}"
        # Space + digit or underscore + digit (e.g. " 1" → "_1")
        elif sup and sup[0].isdigit():
            result += f"_{sup}"
        elif len(sup) > 1 and sup[1].isdigit():
            result += f"_{sup[1]}"
    return result


# ── Public API ────────────────────────────────────────────────────────────────

def detect_filter(query: str) -> MetaFilter:
    """
    Extract metadata filter criteria from a user question.

    Examples
    --------
    "45-modda nimani bildiradi?"              → MetaFilter(modda="45")
    "18¹-modda va mehnat nizo"                → MetaFilter(modda="18_1")
    "MAXSUS QISM jinoyatlari"                 → MetaFilter(qism="MAXSUS QISM")
    "I bob bo'yicha"                          → MetaFilter(bob="I bob")
    "article 168 applies to employment"       → MetaFilter(modda="168")
    """
    f = MetaFilter()

    # ── Article number ──────────────────────────────────────────────────────
    m = _MODDA_PATTERN.search(query)
    if m:
        if m.group(1):                              # "45-modda" / "18¹-modda"
            f.modda = _normalize_modda(m.group(1), m.group(2))
        elif m.group(3):                            # "modda 45"
            f.modda = m.group(3).strip()
        elif m.group(4):                            # "article 45"
            f.modda = m.group(4).strip()

    # ── Section (qism) ─────────────────────────────────────────────────────
    qm = _QISM_PATTERN.search(query)
    if qm:
        f.qism = qm.group(0).upper().strip()

    # ── Chapter (bob) ───────────────────────────────────────────────────────
    bm = _BOB_PATTERN.search(query)
    if bm:
        f.bob = f"{bm.group(1).upper()} bob"

    return f


def matches(meta: dict, f: MetaFilter) -> bool:
    """Return True if a chunk's metadata satisfies all set filter fields."""
    if f.modda is not None:
        if meta.get("modda") != f.modda:
            return False
    if f.qism is not None:
        if f.qism.lower() not in meta.get("qism", "").lower():
            return False
    if f.bob is not None:
        if f.bob.lower() not in meta.get("bob", "").lower():
            return False
    if f.chunk_type is not None:
        if meta.get("chunk_type") != f.chunk_type:
            return False
    return True
