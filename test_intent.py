import sys
sys.path.insert(0, ".")
from back.rag.intent import detect_query_type as d

cases = [
    # GENERAL
    ("jinoyat kodeksi nima?",           "general"),
    ("Jinoyat Kodeksi nima haqida?",    "general"),
    ("nechta modda bor?",               "general"),
    ("kodeksda nechta bob bor",         "general"),
    ("umumiy qism nima",                "general"),
    ("maxsus qism nima",                "general"),
    ("kodeks qachon qabul qilingan",    "general"),
    ("kodeksning tuzilishi",            "general"),
    ("jinoyat kodeksi haqida",          "general"),
    ("qanday qonun bu",                 "general"),
    # LEGAL
    ("168-modda nima?",                 "legal"),
    ("o\u02bbg\u02bbrilik uchun jazo",  "legal"),
    ("firibgarlik",                     "legal"),
    ("qotillik jazosi qancha",          "legal"),
    ("bosqinchilik uchun necha yil",    "legal"),
    ("168 modda mazmuni",               "legal"),
    ("qamoq muddati",                   "legal"),
    ("o\u02bbg\u02bbrini qanday jazolayman", "legal"),
]

failed = 0
for q, exp in cases:
    got = d(q)
    status = "OK" if got == exp else "FAIL"
    if got != exp:
        failed += 1
    print(f"{status:4}  [{exp:7}]  {q!r}  => {got!r}")

print()
print(f"{len(cases)-failed}/{len(cases)} passed", "- ALL OK" if failed == 0 else f"- {failed} FAILED")
