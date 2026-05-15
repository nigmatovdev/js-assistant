import json
import uuid
from datetime import datetime
from typing import Generator, Optional

from sqlalchemy.orm import Session

from back.app.db.models import ChatSession, Message, SessionMemory
from back.app.schemas.chat import AskRequest, SessionCreate, SessionUpdate
from back.rag import ask_stream as rag_ask_stream
from back.rag.memory import SUMMARY_EVERY, summarize_conversation


# ── Sessions ──────────────────────────────────────────────────────────────────

def list_sessions(db: Session) -> list[ChatSession]:
    return db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()


def search_sessions(db: Session, q: str, limit: int = 30) -> list[dict]:
    q_lower = q.strip().lower()
    if not q_lower:
        return []
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
    results = []
    for s in sessions:
        title_hit = q_lower in (s.title or '').lower()
        msg_match = None
        for m in s.messages:
            if q_lower in m.content.lower():
                idx   = m.content.lower().index(q_lower)
                start = max(0, idx - 60)
                end   = min(len(m.content), idx + len(q_lower) + 120)
                snippet = (
                    ('…' if start > 0 else '') +
                    m.content[start:end] +
                    ('…' if end < len(m.content) else '')
                )
                msg_match = {'role': m.role, 'snippet': snippet}
                break
        if title_hit or msg_match:
            results.append({
                'id':            s.id,
                'title':         s.title,
                'updated_at':    s.updated_at,
                'message_count': len(s.messages),
                'match':         msg_match,
            })
        if len(results) >= limit:
            break
    return results


def get_session(db: Session, session_id: str) -> ChatSession | None:
    return db.query(ChatSession).filter(ChatSession.id == session_id).first()


def create_session(db: Session, data: SessionCreate) -> ChatSession:
    session = ChatSession(id=str(uuid.uuid4()), title=data.title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def update_session(db: Session, session: ChatSession, data: SessionUpdate) -> ChatSession:
    session.title      = data.title
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: Session, session: ChatSession) -> None:
    db.delete(session)
    db.commit()


# ── Messages ──────────────────────────────────────────────────────────────────

def get_history(db: Session, session_id: str, limit: int = 6) -> list[dict]:
    """Return the last `limit` messages (short-term window) before the most recent one.

    The most recent row is the current user question (just saved), so we skip
    it with offset(1). Default limit=6 → 3 user+assistant turns.
    """
    rows = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at.desc())
        .offset(1)
        .limit(limit)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in reversed(rows)]


# ── Long-term memory ──────────────────────────────────────────────────────────

def get_session_summary(db: Session, session_id: str) -> Optional[str]:
    """Fetch the current long-term summary for a session (None if not yet created)."""
    mem = db.query(SessionMemory).filter(SessionMemory.session_id == session_id).first()
    return mem.summary if mem else None


def maybe_update_summary(
    session_id: str,
    provider:   str = "local",
    model:      str = "qwen3:8b",
    api_key:    str = "",
    base_url:   str = "https://openrouter.ai/api/v1/chat/completions",
) -> None:
    """
    Check if summarization should be triggered; if so, run it and persist.
    Intended to be called in a background thread — opens its own DB session.

    Trigger condition: total message count has grown by >= SUMMARY_EVERY
    since the last summarization.
    """
    from back.app.db.session import SessionLocal

    db = SessionLocal()
    try:
        total = db.query(Message).filter(Message.session_id == session_id).count()

        mem = db.query(SessionMemory).filter(SessionMemory.session_id == session_id).first()
        last_count = mem.message_count if mem else 0

        if total - last_count < SUMMARY_EVERY:
            return   # not enough new messages yet

        # Fetch recent messages to summarize (last 12 = 6 turns)
        rows = (
            db.query(Message)
            .filter(Message.session_id == session_id)
            .order_by(Message.created_at.desc())
            .limit(12)
            .all()
        )
        recent = [{"role": m.role, "content": m.content} for m in reversed(rows)]

        new_summary = summarize_conversation(
            recent_messages  = recent,
            existing_summary = mem.summary if mem else None,
            provider         = provider,
            model            = model,
            api_key          = api_key,
            base_url         = base_url,
        )
        if not new_summary:
            return

        if mem:
            mem.summary       = new_summary
            mem.message_count = total
            mem.updated_at    = datetime.utcnow()
        else:
            db.add(SessionMemory(
                session_id    = session_id,
                summary       = new_summary,
                message_count = total,
                updated_at    = datetime.utcnow(),
            ))

        db.commit()
        print(f"[memory] session {session_id[:8]}… summary saved.", flush=True)

    except Exception as e:
        print(f"[memory] summary update error: {e}", flush=True)
    finally:
        db.close()


def save_message(
    db:         Session,
    session_id: str,
    role:       str,
    content:    str,
    sources:    list | None = None,
) -> Message:
    msg = Message(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role=role,
        content=content,
        sources=json.dumps(sources) if sources else None,
    )
    db.add(msg)

    # Touch updated_at and auto-title on first user message
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session:
        session.updated_at = datetime.utcnow()
        if not session.title and role == "user":
            session.title = content[:80]

    db.commit()
    db.refresh(msg)
    return msg


# ── Streaming ─────────────────────────────────────────────────────────────────

def stream_answer(question: str, top_k: int = 5) -> Generator[str, None, None]:
    """Wraps rag.ask_stream; yields JSON strings ready for SSE."""
    for kind, value in rag_ask_stream(question, top_k):
        if kind == "token":
            yield json.dumps({"type": "token", "content": value})
        elif kind == "sources":
            yield json.dumps({"type": "sources", "sources": value})
    yield json.dumps({"type": "done"})
