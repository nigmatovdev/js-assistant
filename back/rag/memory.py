"""
Long-term conversation memory — rolling summary generator.

Triggered every SUMMARY_EVERY messages (default: 6).
Produces a short Uzbek-language paragraph describing:
  - what legal topics the user asked about
  - which articles / code sections were discussed
  - key conclusions or answers given

The summary is persisted in the SessionMemory table and injected into
the system prompt on the next request so the LLM keeps context across
many turns without receiving the full raw history.
"""

import os
from typing import Optional

from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

SUMMARY_EVERY   = 6          # trigger re-summarization every N new messages
OPENROUTER_URL  = "https://openrouter.ai/api/v1/chat/completions"

SUMMARY_PROMPT = """\
Quyidagi suhbat tarixini va mavjud xulasani o'qib, yangilangan qisqacha xulasa (3-5 jumla) yozing.

Xulasada albatta ko'rsating:
- Foydalanuvchi qanday huquqiy mavzular va maqolalar haqida savol berdi
- Qanday kodeks bo'limlari, maqola raqamlari muhokama qilindi
- Asosiy xulosalar va berilgan javoblarning mohiyati

QOIDALAR:
- FAQAT xulosa matni yozing (markdown, sarlavha, izoh yo'q)
- O'zbek tilida, qisqa va aniq
- Agar oldingi xulasa bo'lsa — uni yangi ma'lumotlar bilan yangilab biring
"""


def _build_summary_input(
    existing_summary: Optional[str],
    recent_messages:  list[dict],
) -> str:
    parts: list[str] = []
    if existing_summary:
        parts.append(f"[Oldingi xulasa]\n{existing_summary}")
    parts.append("[Yangi suhbat]\n" + "\n".join(
        f"{m['role'].upper()}: {m['content']}"
        for m in recent_messages
    ))
    return "\n\n".join(parts)


def _call_local(model: str, prompt_input: str) -> Optional[str]:
    try:
        import ollama
        resp = ollama.chat(
            model=model,
            messages=[
                {"role": "system", "content": SUMMARY_PROMPT},
                {"role": "user",   "content": prompt_input},
            ],
            stream=False,
        )
        return resp["message"]["content"].strip()
    except Exception as e:
        print(f"[memory] local summarizer failed: {e}")
        return None


def _call_api(model: str, prompt_input: str, api_key: str, base_url: str) -> Optional[str]:
    try:
        import requests
        headers = {
            "Authorization":      f"Bearer {api_key.strip()}",
            "Content-Type":       "application/json",
            "HTTP-Referer":       "http://localhost:5173",
            "X-OpenRouter-Title": "JK Assistant",
        }
        r = requests.post(
            base_url,
            headers=headers,
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": SUMMARY_PROMPT},
                    {"role": "user",   "content": prompt_input},
                ],
                "stream": False,
            },
            timeout=30,
        )
        if r.status_code == 200:
            return r.json()["choices"][0]["message"]["content"].strip()
        print(f"[memory] API summarizer error {r.status_code}: {r.text[:200]}")
        return None
    except Exception as e:
        print(f"[memory] API summarizer failed: {e}")
        return None


def summarize_conversation(
    recent_messages:  list[dict],
    existing_summary: Optional[str] = None,
    provider:         str = "local",
    model:            str = "qwen3:8b",
    api_key:          str = "",
    base_url:         str = OPENROUTER_URL,
) -> Optional[str]:
    """
    Generate (or update) a rolling conversation summary.

    Parameters
    ----------
    recent_messages  : last N raw messages {"role", "content"}
    existing_summary : previous summary to roll forward (optional)
    provider         : "local" | "api"
    model            : model id for the chosen provider
    api_key          : OpenRouter key (only needed for "api")
    base_url         : OpenRouter completions URL

    Returns the new summary string, or None if LLM call failed.
    """
    if not recent_messages:
        return existing_summary

    prompt_input = _build_summary_input(existing_summary, recent_messages)

    print(f"[memory] Generating conversation summary ({provider})...", flush=True)
    if provider == "api":
        result = _call_api(model, prompt_input, api_key, base_url)
    else:
        result = _call_local(model, prompt_input)

    if result:
        print(f"[memory] Summary updated ({len(result)} chars).", flush=True)
    return result
