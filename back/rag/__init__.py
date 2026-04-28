"""
back.rag — Hybrid Legal Intelligence Package

Public API (identical to old back/rag.py):
  _load()       — preload all models at FastAPI startup
  retrieve()    — hybrid BM25 + semantic retrieval
  ask_stream()  — yields ("token", str) / ("sources", list)
  ask()         — non-streaming {answer, sources}

All existing imports continue to work:
  import back.rag as rag_module
  from back.rag import ask_stream
"""

from back.rag.pipeline import (  # noqa: F401
    _load,
    retrieve,
    ask_stream,
    ask,
)

__all__ = ["_load", "retrieve", "ask_stream", "ask"]
