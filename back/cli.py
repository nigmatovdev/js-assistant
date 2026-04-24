import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from back.rag import ask_stream

SEPARATOR = "─" * 60


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
            for kind, value in ask_stream(question):
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
