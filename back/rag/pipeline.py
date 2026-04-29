"""
Hybrid RAG pipeline — top-level orchestrator.

Replaces the monolithic back/rag.py with a routed pipeline:

  1. Normalize query
  2. Detect intent: "general" vs "legal"
  3a. General → inject metadata → stream LLM answer (no Chroma)
  3b. Legal   → hybrid retrieval (BM25 + Chroma) → stream LLM answer

Public API (identical to old back/rag.py):
  _load()       — preload models at startup
  retrieve()    — hybrid retrieval (for CLI / testing)
  ask_stream()  — yields ("token", str) / ("sources", list)
  ask()         — non-streaming wrapper

All existing callers (chat_service, chat.py route) work unchanged.
"""

import json
import os
from typing import Generator, Literal

from dotenv import load_dotenv

# Load .env from project root — must happen before any os.getenv() calls
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

from back.rag.intent     import detect_query_type
from back.rag.normalizer import normalize
from back.rag.prompts    import (
    GENERAL_PROMPT,
    GREETING_PROMPT,
    LEGAL_PROMPT,
    build_general_context,
    build_legal_context,
)
import back.rag.hybrid as hybrid_engine

# ── Config ────────────────────────────────────────────────────────────────────
METADATA_PATH       = os.path.join(ROOT_DIR, "back", "app", "metadata", "legal_metadata.json")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_API_MODEL   = "openrouter/free"

# Read lazily via helper so .env values are always current
def _llm_model() -> str:
    return os.getenv("LLM_MODEL", "qwen3:8b")

def _api_key() -> str:
    return os.getenv("OPENROUTER_API_KEY", "")


# ── Metadata loader ───────────────────────────────────────────────────────────
_metadata: dict | None = None

def _load_metadata() -> dict:
    global _metadata
    if _metadata is None:
        if not os.path.exists(METADATA_PATH):
            print(f"[pipeline] CRITICAL: Metadata file not found at {METADATA_PATH}")
            return {}
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            _metadata = json.load(f)
    return _metadata


# ── Startup loader (called from main.py lifespan) ─────────────────────────────
def _load():
    """Pre-load all heavy resources: embedding model, Chroma, BM25 index, metadata."""
    hybrid_engine.load()
    _load_metadata()


# ── Public retrieval (for CLI / testing) ──────────────────────────────────────
def retrieve(question: str, top_k: int = 5) -> list[dict]:
    """Hybrid BM25 + semantic retrieval."""
    return hybrid_engine.retrieve(question, top_k)


# ── Message builders ──────────────────────────────────────────────────────────

def _build_greeting_messages(question: str, history: list[dict] | None) -> list[dict]:
    messages: list[dict] = [{"role": "system", "content": GREETING_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": question})
    return messages


def _build_general_messages(question: str, history: list[dict] | None) -> list[dict]:
    metadata = _load_metadata()
    context  = build_general_context(metadata)
    user_msg = f"{context}\n\nSavol: {question}"
    messages: list[dict] = [{"role": "system", "content": GENERAL_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_msg})
    return messages


def _build_legal_messages(
    question: str,
    chunks: list[dict],
    history: list[dict] | None,
) -> list[dict]:
    context  = build_legal_context(chunks)
    user_msg = f"Topilgan maqolalar:\n{context}\n\nSavol: {question}"
    messages: list[dict] = [{"role": "system", "content": LEGAL_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_msg})
    return messages


# ── Local Ollama streaming ─────────────────────────────────────────────────────

def _stream_local(
    messages: list[dict],
    model: str,
) -> Generator:
    import ollama
    print(f"[pipeline] Calling local Ollama (model: {model})...")
    try:
        stream = ollama.chat(model=model, messages=messages, stream=True)
        for chunk in stream:
            token = chunk["message"]["content"]
            if token:
                yield ("token", token)
    except Exception as e:
        print(f"[pipeline] Ollama error: {e}")
        yield ("token", f"Lokal model xatosi: {str(e)}")


# ── OpenRouter API streaming ───────────────────────────────────────────────────

def _stream_api(
    messages: list[dict],
    model: str,
) -> Generator:
    import requests

    api_key = _api_key()
    if not api_key or not api_key.strip():
        raise ValueError(
            "OPENROUTER_API_KEY is not set. "
            "Add it to your .env file: OPENROUTER_API_KEY=sk-or-v1-..."
        )

    print(f"[pipeline] Calling OpenRouter API via requests (model: {model})...")
    
    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type":  "application/json",
        "HTTP-Referer":  "http://localhost:5173",
        "X-OpenRouter-Title": "JK Assistant",
    }
    payload = {
        "model": model,
        "messages": messages,
        "stream": True
    }

    try:
        response = requests.post(
            OPENROUTER_BASE_URL,
            headers=headers,
            json=payload,
            stream=True,
            timeout=120
        )
        
        print(f"[pipeline] API Status: {response.status_code}")
        if response.status_code != 200:
            error_text = response.text
            print(f"[pipeline] API Error {response.status_code}: {error_text}")
            yield ("token", f"API xatosi ({response.status_code}): {error_text[:150]}")
            return

        tokens_yielded = 0
        for line in response.iter_lines():
            if not line:
                continue
            
            line_str = line.decode("utf-8")
            if line_str.startswith("data: "):
                data_str = line_str[6:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    data_obj = json.loads(data_str)
                    choices = data_obj.get("choices", [])
                    if choices:
                        delta = choices[0].get("delta", {})
                        token = delta.get("content")
                        if token:
                            yield ("token", token)
                            tokens_yielded += 1
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue
        
        # FALLBACK: If no tokens were yielded, check if it was a non-streaming JSON response
        if tokens_yielded == 0:
            print("[pipeline] No stream tokens. Attempting non-stream fallback...")
            try:
                # Try non-streaming request
                payload["stream"] = False
                res2 = requests.post(OPENROUTER_BASE_URL, headers=headers, json=payload, timeout=60)
                if res2.status_code == 200:
                    data = res2.json()
                    content = data["choices"][0]["message"].get("content", "")
                    if content:
                        print(f"[pipeline] Fallback success: {len(content)} chars.")
                        yield ("token", content)
                else:
                    print(f"[pipeline] Fallback failed: {res2.status_code}")
            except Exception as fe:
                print(f"[pipeline] Fallback exception: {fe}")

    except Exception as e:
        print(f"[pipeline] API Connection Error: {e}")
        yield ("token", f"Aloqa xatosi: {str(e)}")


# ── Main ask_stream ────────────────────────────────────────────────────────────

def ask_stream(
    question:  str,
    top_k:     int = 5,
    history:   list[dict] | None = None,
    model:     str | None = None,
    provider:  str = "local",
) -> Generator:
    """
    Yields (kind, value) tuples:
      ("token",   str)        — LLM output tokens
      ("sources", list[dict]) — retrieved chunks (empty for general queries)

    Routing:
      "general" intent → metadata context, no retrieval
      "legal"   intent → hybrid BM25+Chroma retrieval
    """
    query_type = detect_query_type(question)
    chunks: list[dict] = []

    if query_type == "greeting":
        messages = _build_greeting_messages(question, history)
        # No retrieval, no sources
    elif query_type == "general":
        messages = _build_general_messages(question, history)
        # No sources for general answers
    else:
        # Legal path: hybrid retrieval
        chunks   = hybrid_engine.retrieve(question, top_k)
        messages = _build_legal_messages(question, chunks, history)

    # Choose provider
    _model = model or _llm_model()
    if provider == "api":
        # Use provided model or fall back to default API model
        yield from _stream_api(messages, model or DEFAULT_API_MODEL)
    else:
        yield from _stream_local(messages, _model)

    yield ("sources", chunks)


# ── Non-streaming wrapper ─────────────────────────────────────────────────────

def ask(
    question:  str,
    top_k:     int = 5,
    history:   list[dict] | None = None,
    provider:  str = "local",
    model:     str | None = None,
) -> dict:
    """Non-streaming. Returns {answer: str, sources: list}."""
    answer_parts: list[str] = []
    sources: list = []
    for kind, value in ask_stream(question, top_k, history, model=model, provider=provider):
        if kind == "token":
            answer_parts.append(value)
        elif kind == "sources":
            sources = value
    return {"answer": "".join(answer_parts), "sources": sources}
