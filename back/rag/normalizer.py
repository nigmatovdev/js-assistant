"""
Text normalizer for Uzbek legal documents.

Handles:
  - Apostrophe variants → canonical ʻ (U+02BB, Uzbek modifier letter)
  - OCR Cyrillic ↔ Latin substitutions common in scanned legal texts
  - Soft hyphens, zero-width chars, BOM
  - Article number normalization (168 modda → 168-modda)
  - Collapse multiple spaces / newlines
"""

import re
import unicodedata

# ── Apostrophe variants ───────────────────────────────────────────────────────
# Map every "right single quotation" / apostrophe-like char to ʻ (U+02BB)
_APOS_SRC = "\u2018\u2019\u02bc\u0060\u00b4\u02be\u02bf\u2032'"
_APOS_DST = "ʻ" * len(_APOS_SRC)
_APOS_TABLE = str.maketrans(_APOS_SRC, _APOS_DST)

# ── Cyrillic → Latin (common OCR substitutions in Uzbek) ────────────────────
# Only the subset that is unambiguous in Uzbek legal texts
_CYR_TO_LAT: dict[str, str] = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d",
    "е": "e", "ё": "yo", "ж": "j", "з": "z", "и": "i",
    "й": "y", "к": "k", "л": "l", "м": "m", "н": "n",
    "о": "o", "п": "p", "р": "r", "с": "s", "т": "t",
    "у": "u", "ф": "f", "х": "x", "ц": "ts", "ч": "ch",
    "ш": "sh", "ъ": "", "ы": "i", "ь": "", "э": "e",
    "ю": "yu", "я": "ya",
    # Uzbek-specific Cyrillic
    "ғ": "gʻ", "қ": "q", "ҳ": "h", "ў": "oʻ", "ҷ": "j",
    # uppercase
    "А": "A", "Б": "B", "В": "V", "Г": "G", "Д": "D",
    "Е": "E", "Ё": "Yo", "Ж": "J", "З": "Z", "И": "I",
    "Й": "Y", "К": "K", "Л": "L", "М": "M", "Н": "N",
    "О": "O", "П": "P", "Р": "R", "С": "S", "Т": "T",
    "У": "U", "Ф": "F", "Х": "X", "Ц": "Ts", "Ч": "Ch",
    "Ш": "Sh", "Э": "E", "Ю": "Yu", "Я": "Ya",
    "Ғ": "Gʻ", "Қ": "Q", "Ҳ": "H", "Ў": "Oʻ", "Ҷ": "J",
}

# ── Invisible / junk characters ───────────────────────────────────────────────
_INVISIBLE = re.compile(
    r"[\u00ad\u200b\u200c\u200d\u200e\u200f\ufeff\u2060]"  # soft-hyphen, ZW chars, BOM
)

# ── Article number normalization ──────────────────────────────────────────────
# "168 modda" or "168- modda" → "168-modda"
_ARTICLE_RE = re.compile(r"\b(\d+)\s*-?\s*modda\b", re.IGNORECASE)

# ── Whitespace ────────────────────────────────────────────────────────────────
_MULTI_SPACE = re.compile(r"[ \t]{2,}")
_MULTI_NL    = re.compile(r"\n{3,}")


def _has_cyrillic(text: str) -> bool:
    """Return True if text contains any Cyrillic characters."""
    return any("\u0400" <= ch <= "\u04ff" for ch in text)


def transliterate_cyr_to_lat(text: str) -> str:
    """Transliterate Cyrillic Uzbek to Latin Uzbek (best-effort)."""
    return "".join(_CYR_TO_LAT.get(ch, ch) for ch in text)


def normalize(text: str) -> str:
    """
    Full normalization pipeline for a query or document chunk.

    Steps
    -----
    1. Unicode NFC compose
    2. Remove invisible/zero-width chars
    3. Apostrophe normalization
    4. Cyrillic → Latin transliteration (only if text is predominantly Cyrillic)
    5. Article number normalization  (168 modda → 168-modda)
    6. Collapse whitespace
    """
    if not text:
        return text

    # 1. NFC compose
    text = unicodedata.normalize("NFC", text)

    # 2. Invisible chars
    text = _INVISIBLE.sub("", text)

    # 3. Apostrophes
    text = text.translate(_APOS_TABLE)

    # 4. Cyrillic → Latin  (only transliterate if >30% chars are Cyrillic)
    if _has_cyrillic(text):
        cyrillic_ratio = sum(1 for c in text if "\u0400" <= c <= "\u04ff") / max(len(text), 1)
        if cyrillic_ratio > 0.3:
            text = transliterate_cyr_to_lat(text)

    # 5. Article numbers
    text = _ARTICLE_RE.sub(lambda m: f"{m.group(1)}-modda", text)

    # 6. Whitespace
    text = _MULTI_SPACE.sub(" ", text)
    text = _MULTI_NL.sub("\n\n", text)
    text = text.strip()

    return text


# Legacy alias used in the old rag.py (one-liner translation table)
def normalize_query(text: str) -> str:
    """Lightweight query normalization (same as `normalize` but kept for clarity)."""
    return normalize(text)
