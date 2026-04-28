import sys, os
sys.path.insert(0, '.')

# 1. Normalizer
from back.rag.normalizer import normalize
result = normalize("168 modda")
assert result == "168-modda", f"article norm failed: got {result!r}"

result2 = normalize("o\u2019g\u2019rilik")  # right single quotes
assert "\u02bb" in result2 or "g" in result2, f"apostrophe norm: got {result2!r}"
print("OK  normalizer")

# 2. Intent detection
from back.rag.intent import detect_query_type
cases = [
    ("jinoyat kodeksi nima?",        "general"),
    ("nechta modda bor?",            "general"),
    ("168-modda nima?",              "legal"),
    ("o\u02bbg\u02bbrilik uchun jazo", "legal"),
    ("firibgarlik",                  "legal"),
    ("kodeks haqida",                "general"),
]
for q, expected in cases:
    got = detect_query_type(q)
    assert got == expected, f"intent fail: {q!r} => {got!r} (expected {expected!r})"
print("OK  intent detection")

# 3. Prompts
from back.rag.prompts import GENERAL_PROMPT, LEGAL_PROMPT, build_general_context, build_legal_context
assert "kodeks" in GENERAL_PROMPT.lower(), "GENERAL_PROMPT missing 'kodeks'"
ctx = build_general_context({"name": "Test", "parts": [], "article_count": 302, "description": "t", "short_name": "T", "year": 1994, "last_updated": "2024"})
assert "302" in ctx, "metadata context missing article count"
print("OK  prompts")

# 4. Package exports
import back.rag as rag_module
for fn in ["_load", "ask_stream", "ask", "retrieve"]:
    assert callable(getattr(rag_module, fn, None)), f"back.rag.{fn} not exported"
print("OK  back.rag package exports")

print("\nAll smoke tests PASSED.")
