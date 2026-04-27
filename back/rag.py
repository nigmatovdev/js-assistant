import json
import os
import chromadb
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

CHROMA_DIR      = os.getenv("CHROMA_DIR",   os.path.join(ROOT_DIR, "db", "chroma"))
COLLECTION_NAME = "jk_chunks"
EMBED_MODEL     = os.getenv("EMBED_MODEL",  "BAAI/bge-m3")
LLM_MODEL       = os.getenv("LLM_MODEL",    "qwen3:8b")
MIN_SCORE       = float(os.getenv("MIN_SCORE", "0.40"))

OPENROUTER_BASE_URL   = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_API_MODEL     = "inclusionai/ling-2.6-1t:free"

_model      = None
_collection = None


def _get_device() -> str:
    try:
        import torch
        return "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        return "cpu"


def _load():
    global _model, _collection
    if _model is None:
        device = _get_device()
        print(f"Loading embedding model on {device}...", flush=True)
        _model = SentenceTransformer(EMBED_MODEL, device=device)
    if _collection is None:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        _collection = client.get_collection(COLLECTION_NAME)


_APOSTROPHE_NORM = str.maketrans("'''ʼ", "ʻʻʻʻ")

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
            "id":       results["ids"][0][i],
            "text":     results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "score":    score,
        })
    return chunks


def _build_messages(question: str, chunks: list[dict], history: list[dict] | None) -> list[dict]:
    system = (
        "Siz O'zbekiston Jinoyat Kodeksi bo'yicha yuridik yordamchisiz.\n"
        "Faqat quyida berilgan maqolalar asosida javob bering.\n"
        "Agar javob berilgan maqolalarda bo'lmasa: "
        "\"Ushbu savol bo'yicha Jinoyat Kodeksida ma'lumot topilmadi\" deb ayting.\n"
        "Javobda tegishli maqola raqamlarini ko'rsating.\n"
        "Suhbat tarixini hisobga olib, izchil javob bering."
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

    messages: list[dict] = [{"role": "system", "content": system}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_msg})
    return messages


def _ask_stream_local(
    question: str,
    top_k: int = 5,
    history: list[dict] | None = None,
    model: str | None = None,
):
    import ollama
    chunks   = retrieve(question, top_k)
    messages = _build_messages(question, chunks, history)
    stream   = ollama.chat(model=model or LLM_MODEL, messages=messages, stream=True)
    for chunk in stream:
        token = chunk["message"]["content"]
        if token:
            yield ("token", token)
    yield ("sources", chunks)


def _ask_stream_api(
    question: str,
    top_k: int = 5,
    history: list[dict] | None = None,
    model: str | None = None,
):
    import httpx
    chunks    = retrieve(question, top_k)
    messages  = _build_messages(question, chunks, history)
    api_key   = os.getenv("OPENROUTER_API_KEY", "")
    api_model = model or DEFAULT_API_MODEL

    with httpx.Client(timeout=120.0) as client:
        with client.stream(
            "POST",
            OPENROUTER_BASE_URL,
            headers={
                "Authorization":  f"Bearer {api_key}",
                "Content-Type":   "application/json",
                "HTTP-Referer":   "http://localhost:5173",
                "X-Title":        "JK Assistant",
            },
            json={"model": api_model, "messages": messages, "stream": True},
        ) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data = line[6:]
                if data == "[DONE]":
                    break
                try:
                    obj   = json.loads(data)
                    token = obj["choices"][0]["delta"].get("content", "")
                    if token:
                        yield ("token", token)
                except (json.JSONDecodeError, KeyError, IndexError):
                    pass

    yield ("sources", chunks)


def ask_stream(
    question: str,
    top_k: int = 5,
    history: list[dict] | None = None,
    model: str | None = None,
    provider: str = "local",
):
    """Yields (kind, value) tuples: ('token', str) then ('sources', list).

    provider: 'local' uses Ollama; 'api' uses OpenRouter.
    model:    overrides default model for the chosen provider.
    history:  prior turns as [{"role": "user"|"assistant", "content": str}, ...]
    """
    if provider == "api":
        yield from _ask_stream_api(question, top_k, history, model)
    else:
        yield from _ask_stream_local(question, top_k, history, model)


def ask(
    question: str,
    top_k: int = 5,
    history: list[dict] | None = None,
    provider: str = "local",
    model: str | None = None,
) -> dict:
    """Non-streaming version. Returns {answer, sources}."""
    answer_parts = []
    sources = []
    for kind, value in ask_stream(question, top_k, history, model=model, provider=provider):
        if kind == "token":
            answer_parts.append(value)
        elif kind == "sources":
            sources = value
    return {"answer": "".join(answer_parts), "sources": sources}
