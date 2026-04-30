"""
Query Decomposer for complex legal questions.

Pipeline
--------
1. Heuristic check — is the question complex?
   Simple questions skip the LLM call entirely and return [question].
2. LLM call (non-streaming) — rewrite into 2-4 focused sub-questions.
3. JSON parse — extract list of strings; fall back to [question] on any error.

Complexity signals (any one is enough):
  • length > 90 characters
  • 2+ question words  (nima, qanday, kim, how, what, when, which, why…)
  • 2+ conjunctions    (va, yoki, hamda, and, or, also…)
  • 2+ article refs    (45-modda, modda 45, article 45…)
"""

import json
import re
from typing import Optional

from back.rag.prompts import DECOMPOSE_PROMPT

# ── Complexity heuristic ──────────────────────────────────────────────────────

_WH_WORDS = re.compile(
    r"\b(nima|qanday|qachon|kim|qayer|nega|qancha"
    r"|how|what|when|who|where|why|which)\b",
    re.IGNORECASE,
)
_CONJUNCTIONS = re.compile(
    r"\b(va|yoki|hamda|shuningdek|also|and|or|as well|in addition|furthermore)\b",
    re.IGNORECASE,
)
_ARTICLE_REF = re.compile(
    r"\d+[\-\s]?modda|\barticle\s+\d+|\bmodda\s+\d+",
    re.IGNORECASE,
)


def _is_complex(question: str) -> bool:
    if len(question) > 90:
        return True
    if len(_WH_WORDS.findall(question)) >= 2:
        return True
    if len(_CONJUNCTIONS.findall(question)) >= 2:
        return True
    if len(_ARTICLE_REF.findall(question)) >= 2:
        return True
    return False


# ── LLM call helpers ──────────────────────────────────────────────────────────

def _call_local(model: str, question: str) -> Optional[str]:
    try:
        import ollama
        resp = ollama.chat(
            model=model,
            messages=[
                {"role": "system", "content": DECOMPOSE_PROMPT},
                {"role": "user",   "content": question},
            ],
            stream=False,
        )
        return resp["message"]["content"]
    except Exception as e:
        print(f"[decomposer] local call failed: {e}")
        return None


def _call_api(model: str, question: str, api_key: str, base_url: str) -> Optional[str]:
    try:
        import requests
        headers = {
            "Authorization":    f"Bearer {api_key.strip()}",
            "Content-Type":     "application/json",
            "HTTP-Referer":     "http://localhost:5173",
            "X-OpenRouter-Title": "JK Assistant",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": DECOMPOSE_PROMPT},
                {"role": "user",   "content": question},
            ],
            "stream": False,
        }
        r = requests.post(base_url, headers=headers, json=payload, timeout=30)
        if r.status_code == 200:
            return r.json()["choices"][0]["message"]["content"]
        print(f"[decomposer] API error {r.status_code}: {r.text[:200]}")
        return None
    except Exception as e:
        print(f"[decomposer] API call failed: {e}")
        return None


# ── JSON parser ───────────────────────────────────────────────────────────────

def _parse_sub_questions(raw: str, original: str) -> list[str]:
    """
    Extract a JSON array from the LLM response.
    Falls back to [original] on any parse failure.
    """
    # Strip markdown fences if present
    text = re.sub(r"```(?:json)?|```", "", raw).strip()

    # Find the first [...] block
    m = re.search(r"\[.*\]", text, re.DOTALL)
    if not m:
        return [original]

    try:
        parsed = json.loads(m.group())
        if isinstance(parsed, list):
            qs = [str(q).strip() for q in parsed if str(q).strip()]
            if qs:
                return qs[:4]   # cap at 4 sub-questions
    except (json.JSONDecodeError, TypeError):
        pass

    return [original]


# ── Public API ────────────────────────────────────────────────────────────────

def decompose(
    question:  str,
    provider:  str = "local",
    model:     str = "qwen3:8b",
    api_key:   str = "",
    base_url:  str = "https://openrouter.ai/api/v1/chat/completions",
) -> list[str]:
    """
    Decompose a complex legal question into 2-4 targeted sub-questions.

    Returns [question] unchanged for simple questions or on any LLM error,
    so callers always get at least one query to retrieve against.
    """
    if not _is_complex(question):
        print(f"[decomposer] simple query — skipping decomposition.")
        return [question]

    print(f"[decomposer] complex query detected — decomposing...")

    if provider == "api":
        raw = _call_api(model, question, api_key, base_url)
    else:
        raw = _call_local(model, question)

    if not raw:
        return [question]

    sub_questions = _parse_sub_questions(raw, question)
    print(f"[decomposer] {len(sub_questions)} sub-questions: {sub_questions}")
    return sub_questions
