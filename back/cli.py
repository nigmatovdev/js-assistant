import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from back.rag import ask_stream

SEPARATOR = "-" * 60

LOCAL_MODELS = [
    ("qwen3:4b",  "Qwen3 4B   — GPU uchun optimal"),
    ("qwen3:8b",  "Qwen3 8B   — CPU (sekin)"),
    ("tinyllama", "TinyLlama  — Tez va yengil"),
    ("mistral",   "Mistral 7B — Kuchli umumiy"),
]

API_MODELS = [
    ("nvidia/nemotron-3-super-120b-a12b:free", "Nemotron 120B — NVIDIA (Bepul)"),
    ("inclusionai/ling-2.6-1t:free",         "Ling 2.6 1T   — InclusionAI (Bepul)"),
]


def _pick(prompt: str, options: list[tuple[str, str]]) -> str:
    print(prompt)
    for i, (_, label) in enumerate(options, 1):
        print(f"  {i}. {label}")
    while True:
        try:
            raw = input(f"Tanlang (1-{len(options)}): ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nXayr!")
            sys.exit(0)
        if raw.isdigit():
            idx = int(raw) - 1
            if 0 <= idx < len(options):
                return options[idx][0]
        print(f"  Iltimos 1 dan {len(options)} gacha raqam kiriting.")


def print_sources(sources: list[dict]):
    print(f"\n{SEPARATOR}")
    print("Manbalar (Sources):")
    seen = set()
    for s in sources:
        meta = s["metadata"]
        modda = meta["modda"]
        if modda in seen:
            continue
        seen.add(modda)
        score = f"{s['score']:.2f}"
        print(f"  • {modda}-modda: {meta['title']}  (score: {score})")
    print(SEPARATOR)


def main():
    print("=" * 60)
    print("  JK Assistant — O'zbekiston Jinoyat Kodeksi")
    print("  Chiqish uchun: 'exit' yoki Ctrl+C")
    print("=" * 60)
    print()

    provider = _pick(
        "Rejim tanlang / Select mode:",
        [
            ("local", "Offline — Local LLM (Ollama)"),
            ("api",   "Online  — OpenRouter API"),
        ],
    )
    print()

    if provider == "local":
        model = _pick("Model tanlang:", LOCAL_MODELS)
    else:
        model = _pick("API model tanlang:", API_MODELS)

    mode_label = "Offline (Local)" if provider == "local" else "Online (API)"
    print(f"\nRejim: {mode_label}  |  Model: {model}")
    print(SEPARATOR)
    print()

    while True:
        try:
            question = input("Savol: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nXayr!")
            break

        if not question:
            continue
        if question.lower() in ("exit", "quit", "chiq"):
            print("Xayr!")
            break

        print("\nJavob: ", end="", flush=True)
        sources = []
        try:
            for kind, value in ask_stream(question, provider=provider, model=model):
                if kind == "token":
                    print(value, end="", flush=True)
                elif kind == "sources":
                    sources = value
        except Exception as e:
            print(f"\n[Xato: {e}]")

        print()
        print_sources(sources)
        print()


if __name__ == "__main__":
    main()
