"""
Intent detector for legal assistant queries.

Returns "general" or "legal" based on the user's question.

"general" — meta questions about the Criminal Code itself
    (what is it, how many articles, what sections, introduction)

"legal"   — questions about specific articles, crimes, penalties
    (article numbers, crime names, punishment types)

No ML model required — pure keyword/regex matching.
Fast, deterministic, works offline.
"""

import re
from typing import Literal

QueryType = Literal["general", "legal", "greeting"]

# ── Uzbek suffix note ─────────────────────────────────────────────────────────
# Uzbek nouns take case suffixes: -i, -da, -dan, -ga, -ni, -ning, -lar, -lari
# We use \bkodeks\w* to match kodeks, kodeksi, kodeksida, etc.

# ── General intent patterns ────────────────────────────────────────────────────
# High-confidence signals that the user asks about the Code as a document/concept.
# Each match scores +5 (high weight to beat incidental legal-keyword matches).

_GENERAL_PATTERNS: list[re.Pattern] = [
    # "kodeks* nima" / "nima kodeks*"  — "what is the criminal code"
    re.compile(r"\bkodeks\w*\s+nima\b",                 re.I),
    re.compile(r"\bnima\b.{0,30}\bkodeks\w*\b",         re.I),

    # "jinoyat kodeks* nima/haqida" — most common general phrasing
    re.compile(r"\bjinoyat\s+kodeks\w*\s+(nima|haqida)", re.I),
    re.compile(r"\bkodeks\w*\s+haqida\b",               re.I),

    # Article count questions
    re.compile(r"\bnechta\b.{0,30}\bmodda\b",           re.I),
    re.compile(r"\bnecha\b.{0,30}\bmodda\b",            re.I),
    re.compile(r"\bqancha\b.{0,30}\bmodda\b",           re.I),
    re.compile(r"\bmodda\w*\s+soni\b",                  re.I),

    # Chapter/section count
    re.compile(r"\bnechta\b.{0,30}\bbob\b",             re.I),
    re.compile(r"\bnechta\b.{0,30}\bqism\b",            re.I),

    # Structure / sections
    re.compile(r"\btuzilish\w*\b",                      re.I),
    re.compile(r"\btarkib\w*\b",                        re.I),
    re.compile(r"\bbo['ʻ]limlari?\b",                   re.I),
    re.compile(r"\b(umumiy|maxsus)\s+qism\w*\b",        re.I),

    # Adoption / year
    re.compile(r"\bqachon\b.{0,30}\bqabul\b",           re.I),
    re.compile(r"\bqaysi\s+yil\b",                      re.I),

    # Purpose / scope
    re.compile(r"\bmaqsad\w*\s+nima\b",                 re.I),
    re.compile(r"\bvazifa\w*\s+nima\b",                 re.I),
    re.compile(r"\bnimani\s+tartibga\b",                re.I),
    re.compile(r"\bnimaga\s+oid\b",                     re.I),
    re.compile(r"\bnima\s+haqida\b",                    re.I),

    # "what kind of law/document is this"
    re.compile(r"\bqanday\b.{0,25}\bqonun\b",           re.I),
    re.compile(r"\bqanday\b.{0,25}\bhujjat\b",          re.I),
]

# ── Legal intent patterns ──────────────────────────────────────────────────────
# Signals that the user asks about a specific crime, article, or penalty.

_LEGAL_PATTERNS: list[re.Pattern] = [
    # Explicit article number  "168-modda", "168 modda"
    re.compile(r"\b\d+\s*-?\s*modda\b",                re.I),

    # "modda" with case suffixes (not bare "modda" which appears in count questions)
    re.compile(r"\bmodda(si|da|ni|ning|ga|dan|lar)\b",  re.I),

    # Specific crime names
    re.compile(
        r"\b(o['ʻ]g['ʻ]rilik|firibgarlik|qotillik|bosqinchilik"
        r"|talon[- ]taroj|zo['ʻ]ravonlik|talonchilik"
        r"|poraxo['ʻ]rlik|mansabdan\s+suiiste"
        r"|kontrabanda|giyohvandlik)\b",
        re.I,
    ),

    # Crime actor forms (o'g'ri, firibgar, etc.)
    re.compile(
        r"\b(o['ʻ]g['ʻ]ri|firibgar|qotil|bosqinchi|poraxo['ʻ]r)\w*\b",
        re.I,
    ),

    # Punishment / penalty terms (NOT standalone "jinoyat")
    re.compile(
        r"\b(sanksiya|qamoq|jarima|mahkum|javobgar|ozodlikdan|muddati)\w*\b",
        re.I,
    ),

    # "jazo" only when paired with uchun / jazosi etc.
    re.compile(r"\buchun\b.{0,40}\bjazo\w*\b",          re.I),
    re.compile(r"\bjazo\w*\b.{0,40}\buchun\b",          re.I),
    re.compile(r"\bjazosi\b",                           re.I),
    re.compile(r"\bjazolash\b",                         re.I),

    # Sentence duration questions
    re.compile(r"\bnecha\s+(yil|oy|kun)\b",             re.I),
]

# ── Greeting / chitchat patterns ──────────────────────────────────────────────
# Matches conversational messages that are NOT legal questions.

_GREETING_PATTERNS: list[re.Pattern] = [
    # Greetings
    re.compile(r"\b(salom|assalomu[\s-]?alaykum)\b",          re.I),
    re.compile(r"^\s*(hey|hi|hello)\W*$",                      re.I),

    # How are you
    re.compile(r"\bqandaysan\b",                               re.I),
    re.compile(r"\byaxshimisan\b",                             re.I),
    re.compile(r"\bnima\s+gap\b",                              re.I),

    # Who are you / what are you
    re.compile(r"\bsen\s+kim(san)?\b",                         re.I),
    re.compile(r"\bkimsan\b",                                  re.I),
    re.compile(r"\bisming\s+nima\b",                           re.I),
    re.compile(r"\bnima\s+qila\s+olasan\b",                    re.I),
    re.compile(r"\bnima\s+bilasan\b",                          re.I),
    re.compile(r"\bsen\s+nima(san)?\b",                        re.I),

    # Short acknowledgements / farewells (whole-message anchored)
    re.compile(r"^\s*rahmat\W*$",                              re.I),
    re.compile(r"^\s*(xayr|ko['ʻ]rishguncha|sog['ʻ]lig[''ʻ]ingiz)\W*$", re.I),
    re.compile(r"^\s*(ha|yo['ʻ]q|ok|okay|tushunarli|tushundim|mayli)\W*$", re.I),
]


# ── Scorer ─────────────────────────────────────────────────────────────────────

def _score_greeting(text: str) -> int:
    score = 0
    for pat in _GREETING_PATTERNS:
        if pat.search(text):
            score += 5
    return score


def _score_general(text: str) -> int:
    score = 0
    for pat in _GENERAL_PATTERNS:
        if pat.search(text):
            score += 5
    return score


def _score_legal(text: str) -> int:
    score = 0
    for pat in _LEGAL_PATTERNS:
        if pat.search(text):
            score += 5
    return score


# ── Public API ─────────────────────────────────────────────────────────────────

def detect_query_type(question: str) -> QueryType:
    """
    Detect whether a question is "general", "legal", or "greeting".

    Rules
    -----
    - Explicit article number (e.g. "168-modda") -> always "legal"
    - Score all three categories; highest score wins
    - Greeting wins only when it outscores both legal and general
    - Ties default to "legal" (retrieval handles edge cases)
    """
    # Fast-path: explicit article number -> always legal
    if re.search(r"\b\d+\s*-?\s*modda\b", question, re.I):
        return "legal"

    greeting_score = _score_greeting(question)
    general_score  = _score_general(question)
    legal_score    = _score_legal(question)

    # Greeting only wins when it dominates and no legal/general signal present
    if greeting_score > 0 and greeting_score >= general_score and greeting_score >= legal_score:
        return "greeting"

    if general_score > legal_score:
        return "general"

    return "legal"
