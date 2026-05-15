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

from back.rag.intent      import detect_query_type
from back.rag.normalizer  import normalize
from back.rag.decomposer  import decompose
from back.rag.compressor  import compress_chunks
from back.rag.meta_filter import detect_filter
from back.rag.prompts     import (
    GENERAL_PROMPT,
    GREETING_PROMPT,
    LEGAL_PROMPT,
    LEGAL_PROMPT_API,
    build_general_context,
    build_legal_context,
)
import back.rag.hybrid as hybrid_engine

# ── Config ────────────────────────────────────────────────────────────────────
METADATA_PATH         = os.path.join(ROOT_DIR, "back", "app", "metadata", "legal_metadata.json")
OPENROUTER_BASE_URL   = "https://openrouter.ai/api/v1/chat/completions"
OPENAI_BASE_URL       = "https://api.openai.com/v1/chat/completions"
GEMINI_OPENAI_URL     = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
DEFAULT_API_MODEL     = "openrouter/free"
DEFAULT_OPENAI_MODEL  = "gpt-4o"
DEFAULT_GEMINI_MODEL  = "gemini-2.5-flash"

def _llm_model() -> str:
    return os.getenv("LLM_MODEL", "qwen3:8b")

def _openai_key() -> str:
    return os.getenv("OPENAI_API_KEY", "")

def _api_key() -> str:
    return os.getenv("OPENROUTER_API_KEY", "")

def _gemini_key() -> str:
    return os.getenv("GEMINI_API_KEY", "")


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


# ── History-aware filter inheritance ──────────────────────────────────────────

def _inherit_filter_from_history(history: list[dict] | None) -> "MetaFilter":
    """
    When the current question has no article reference (follow-up like "Bu nima?"),
    look back through recent history messages and reuse the last detected filter.
    This prevents follow-ups from fetching completely unrelated chunks.
    """
    from back.rag.meta_filter import MetaFilter
    if not history:
        return MetaFilter()
    for msg in reversed(history[-4:]):   # scan last 2 turns
        f = detect_filter(msg.get("content", ""))
        if not f.is_empty:
            print(f"[pipeline] Follow-up: inheriting filter from history (modda={f.modda})", flush=True)
            return f
    return MetaFilter()


# ── Multi-query merge ─────────────────────────────────────────────────────────

def _merge_retrieval(result_lists: list[list[dict]], top_k: int) -> list[dict]:
    """
    Merge results from multiple sub-question retrievals.
    Deduplicates by chunk id, keeps the highest fused score per chunk.
    """
    best: dict[str, dict] = {}
    for results in result_lists:
        for r in results:
            cid = r["id"]
            if cid not in best or r["score"] > best[cid]["score"]:
                best[cid] = r
    merged = sorted(best.values(), key=lambda x: x["score"], reverse=True)
    return merged[:top_k]


# ── Message builders ──────────────────────────────────────────────────────────

def _build_greeting_messages(question: str, history: list[dict] | None) -> list[dict]:
    messages: list[dict] = [{"role": "system", "content": GREETING_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": question})
    return messages


def _inject_memory(system_prompt: str, memory_summary: str | None) -> str:
    """Append long-term memory summary to a system prompt when available."""
    if not memory_summary:
        return system_prompt
    return system_prompt + f"\n\n[Suhbat xotirasi]\n{memory_summary}"


def _build_general_messages(
    question:       str,
    history:        list[dict] | None,
    memory_summary: str | None = None,
) -> list[dict]:
    metadata = _load_metadata()
    context  = build_general_context(metadata)
    user_msg = f"{context}\n\nSavol: {question}"
    system   = _inject_memory(GENERAL_PROMPT, memory_summary)
    messages: list[dict] = [{"role": "system", "content": system}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_msg})
    return messages


def _build_legal_messages(
    question:       str,
    chunks:         list[dict],
    history:        list[dict] | None,
    memory_summary: str | None = None,
) -> list[dict]:
    """Full format for local inference — includes short-term history."""
    context  = build_legal_context(chunks)
    user_msg = f"Topilgan maqolalar:\n{context}\n\nSavol: {question}"
    system   = _inject_memory(LEGAL_PROMPT, memory_summary)
    messages: list[dict] = [{"role": "system", "content": system}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_msg})
    return messages


def _build_api_messages(
    question:       str,
    chunks:         list[dict],
    memory_summary: str | None = None,
) -> list[dict]:
    """
    Cost-optimised format for paid API calls.

    Structure (2 messages only — no history tokens):
      SYSTEM  : compact legal prompt
      USER    : [memory] + CONTEXT + QUESTION
    """
    context = build_legal_context(chunks)

    user_parts: list[str] = []
    if memory_summary:
        user_parts.append(f"[Suhbat tarixi]\n{memory_summary}")
    user_parts.append(f"CONTEXT:\n{context}")
    user_parts.append(f"QUESTION:\n{question}")

    return [
        {"role": "system", "content": LEGAL_PROMPT_API},
        {"role": "user",   "content": "\n\n".join(user_parts)},
    ]


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


# ── OpenAI streaming (GPT-4o) ─────────────────────────────────────────────────

def _stream_openai(messages: list[dict], model: str) -> Generator:
    import requests

    api_key = _openai_key()
    if not api_key or not api_key.strip():
        raise ValueError(
            "OPENAI_API_KEY is not set. Add it to your .env file: OPENAI_API_KEY=sk-..."
        )

    print(f"[pipeline] Calling OpenAI API (model: {model})...")
    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type":  "application/json",
    }
    payload = {"model": model, "messages": messages, "stream": True}

    try:
        response = requests.post(
            OPENAI_BASE_URL, headers=headers, json=payload, stream=True, timeout=120
        )
        print(f"[pipeline] OpenAI status: {response.status_code}")
        if response.status_code != 200:
            yield ("token", f"OpenAI xatosi ({response.status_code}): {response.text[:200]}")
            return

        for line in response.iter_lines():
            if not line:
                continue
            line_str = line.decode("utf-8")
            if line_str.startswith("data: "):
                data_str = line_str[6:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    obj = json.loads(data_str)
                    token = obj["choices"][0]["delta"].get("content")
                    if token:
                        yield ("token", token)
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue

    except Exception as e:
        print(f"[pipeline] OpenAI error: {e}")
        yield ("token", f"OpenAI aloqa xatosi: {str(e)}")


# ── Google Gemini streaming ───────────────────────────────────────────────────

def _stream_gemini(messages: list[dict], model: str) -> Generator:
    from google import genai
    from google.genai import types as genai_types

    api_key = _gemini_key()
    if not api_key or not api_key.strip():
        yield ("token", "GEMINI_API_KEY sozlanmagan. .env fayliga qo'shing.")
        return

    # Convert OpenAI-format messages to Gemini format
    system_parts: list[str] = []
    contents:     list[dict] = []
    for msg in messages:
        role = msg.get("role", "")
        text = msg.get("content", "")
        if role == "system":
            system_parts.append(text)
        elif role == "user":
            contents.append({"role": "user",  "parts": [{"text": text}]})
        elif role == "assistant":
            contents.append({"role": "model", "parts": [{"text": text}]})

    if not contents:
        yield ("token", "Xato: Xabar yo'q.")
        return

    config = genai_types.GenerateContentConfig(
        system_instruction="\n\n".join(system_parts) if system_parts else None,
    )

    masked = api_key[:6] + "..." + api_key[-4:] if len(api_key) > 10 else "***"
    print(f"[pipeline] Calling Gemini API (model: {model}, key: {masked})...")
    try:
        client = genai.Client(api_key=api_key.strip())
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=config,
        ):
            if chunk.text:
                yield ("token", chunk.text)
    except Exception as e:
        print(f"[pipeline] Gemini error: {e}")
        yield ("token", f"Gemini xatosi: {str(e)}")


# ── Main ask_stream ────────────────────────────────────────────────────────────

def ask_stream(
    question:       str,
    top_k:          int = 5,
    history:        list[dict] | None = None,
    model:          str | None = None,
    provider:       str = "local",
    memory_summary: str | None = None,
) -> Generator:
    """
    Yields (kind, value) tuples:
      ("token",   str)        — LLM output tokens
      ("sources", list[dict]) — retrieved chunks (empty for general queries)

    Routing:
      "greeting" → polite reply, no retrieval
      "general"  → metadata context, no retrieval
      "legal"    → decompose → hybrid retrieve → compress → answer
    """
    query_type = detect_query_type(question)
    chunks: list[dict] = []

    if query_type == "greeting":
        messages = _build_greeting_messages(question, history)
    elif query_type == "general":
        messages = _build_general_messages(question, history, memory_summary)
    else:
        # Legal path: decompose → multi-retrieve → merge → compress → answer
        if provider == "openai":
            _decompose_prov  = "api"
            _decompose_key   = _openai_key()
            _decompose_url   = OPENAI_BASE_URL
            _decompose_model = model or DEFAULT_OPENAI_MODEL
        elif provider == "gemini":
            _decompose_prov  = "api"
            _decompose_key   = _gemini_key()
            _decompose_url   = GEMINI_OPENAI_URL
            _decompose_model = model or DEFAULT_GEMINI_MODEL
        elif provider == "api":
            _decompose_prov  = "api"
            _decompose_key   = _api_key()
            _decompose_url   = OPENROUTER_BASE_URL
            _decompose_model = model or DEFAULT_API_MODEL
        else:
            _decompose_prov  = "local"
            _decompose_key   = ""
            _decompose_url   = ""
            _decompose_model = model or _llm_model()

        sub_questions = decompose(
            question,
            provider  = _decompose_prov,
            model     = _decompose_model,
            api_key   = _decompose_key,
            base_url  = _decompose_url,
        )
        meta_filter = detect_filter(question)
        if meta_filter.is_empty:
            meta_filter = _inherit_filter_from_history(history)
        result_lists = [hybrid_engine.retrieve(q, top_k, meta_filter) for q in sub_questions]
        chunks   = _merge_retrieval(result_lists, top_k)
        chunks   = compress_chunks(chunks, question)
        if provider in ("api", "openai", "gemini"):
            # Compact format: no history tokens, memory summary replaces it
            messages = _build_api_messages(question, chunks, memory_summary)
        else:
            # Full format: includes short-term history for local inference
            messages = _build_legal_messages(question, chunks, history, memory_summary)

    # Choose provider
    _model = model or _llm_model()
    if provider == "openai":
        yield from _stream_openai(messages, model or DEFAULT_OPENAI_MODEL)
    elif provider == "gemini":
        yield from _stream_gemini(messages, model or DEFAULT_GEMINI_MODEL)
    elif provider == "api":
        yield from _stream_api(messages, model or DEFAULT_API_MODEL)
    else:
        yield from _stream_local(messages, _model)

    yield ("sources", chunks)


# ── Non-streaming wrapper ─────────────────────────────────────────────────────

def ask(
    question:       str,
    top_k:          int = 5,
    history:        list[dict] | None = None,
    provider:       str = "local",
    model:          str | None = None,
    memory_summary: str | None = None,
) -> dict:
    """Non-streaming. Returns {answer: str, sources: list}."""
    answer_parts: list[str] = []
    sources: list = []
    for kind, value in ask_stream(
        question, top_k, history, model=model, provider=provider, memory_summary=memory_summary
    ):
        if kind == "token":
            answer_parts.append(value)
        elif kind == "sources":
            sources = value
    return {"answer": "".join(answer_parts), "sources": sources}
