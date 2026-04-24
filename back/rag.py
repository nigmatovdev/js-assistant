import os
import chromadb
from sentence_transformers import SentenceTransformer

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_DIR = os.path.join(ROOT_DIR, "db", "chroma")

COLLECTION_NAME = "jk_chunks"
EMBED_MODEL = "BAAI/bge-m3"
LLM_MODEL = "llama3"  # change to qwen2.5:14b if you have the VRAM
MIN_SCORE = 0.40  # discard chunks below this similarity — avoids hallucination on irrelevant context

_model = None
_collection = None


def _load():
    global _model, _collection
    if _model is None:
        print("Loading embedding model...", flush=True)
        _model = SentenceTransformer(EMBED_MODEL, device="cuda")
    if _collection is None:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        _collection = client.get_collection(COLLECTION_NAME)


# Normalize Uzbek apostrophe variants to U+02BB (ʻ) used in the source text.
_APOSTROPHE_NORM = str.maketrans("'‘’ʼ", "ʻʻʻʻ")

def _normalize(text: str) -> str:
    return text.translate(_APOSTROPHE_NORM)


def retrieve(question: str, top_k: int = 5) -> list[dict]:
    _load()
    emb = _model.encode([_normalize(question)], normalize_embeddings=True)[0].tolist()
    results = _collection.query(query_embeddings=[emb], n_results=top_k)
    chunks = []
    for i in range(len(results["ids"][0])):
        score = 1 - results["distances"][0][i]
        if score < MIN_SCORE:
            continue
        chunks.append({
            "id": results["ids"][0][i],
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "score": score,
        })
    return chunks


def ask_stream(question: str, top_k: int = 5):
    """Yields text tokens as they stream from Ollama, then yields sources as last item."""
    import ollama

    chunks = retrieve(question, top_k)

    system = (
        "Siz O'zbekiston Jinoyat Kodeksi bo'yicha yuridik yordamchisiz.\n"
        "Faqat quyida berilgan maqolalar asosida javob bering.\n"
        "Agar javob berilgan maqolalarda bo'lmasa: "
        "\"Ushbu savol bo'yicha Jinoyat Kodeksida ma'lumot topilmadi\" deb ayting.\n"
        "Javobda tegishli maqola raqamlarini ko'rsating."
    )

    if chunks:
        context = "\n\n".join(
            f"[{c['metadata']['modda']}-modda: {c['metadata']['title']}]\n{c['text']}"
            for c in chunks
        )
        user_msg = f"Topilgan maqolalar:\n{context}\n\nSavol: {question}"
    else:
        user_msg = (
            f"Savol: {question}\n\n"
            "Izoh: Ushbu savol bo'yicha hech qanday tegishli maqola topilmadi. "
            "Shuni foydalanuvchiga ayting."
        )

    stream = ollama.chat(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        stream=True,
    )

    for chunk in stream:
        token = chunk["message"]["content"]
        if token:
            yield ("token", token)

    yield ("sources", chunks)


def ask(question: str, top_k: int = 5) -> dict:
    """Non-streaming version. Returns {answer, sources}."""
    answer_parts = []
    sources = []
    for kind, value in ask_stream(question, top_k):
        if kind == "token":
            answer_parts.append(value)
        elif kind == "sources":
            sources = value
    return {"answer": "".join(answer_parts), "sources": sources}
