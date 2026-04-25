import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from back.app.db.session import get_db
from back.app.schemas.chat import (
    MessageOut,
    SessionCreate,
    SessionOut,
    SessionUpdate,
    SessionWithMessages,
    SourceChunk,
)
from back.app.services import chat_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _session_out(s) -> SessionOut:
    return SessionOut(
        id=s.id,
        title=s.title,
        created_at=s.created_at,
        updated_at=s.updated_at,
        message_count=len(s.messages),
    )


@router.get("", response_model=list[SessionOut])
def list_sessions(db: Session = Depends(get_db)):
    return [_session_out(s) for s in chat_service.list_sessions(db)]


@router.post("", response_model=SessionOut, status_code=201)
def create_session(data: SessionCreate, db: Session = Depends(get_db)):
    return _session_out(chat_service.create_session(db, data))


@router.get("/{session_id}", response_model=SessionWithMessages)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = chat_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = []
    for m in session.messages:
        raw_sources = json.loads(m.sources) if m.sources else None
        sources = [SourceChunk(**s) for s in raw_sources] if raw_sources else None
        messages.append(MessageOut(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            sources=sources,
            created_at=m.created_at,
        ))

    return SessionWithMessages(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=len(session.messages),
        messages=messages,
    )


@router.put("/{session_id}", response_model=SessionOut)
def update_session(session_id: str, data: SessionUpdate, db: Session = Depends(get_db)):
    session = chat_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _session_out(chat_service.update_session(db, session, data))


@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: str, db: Session = Depends(get_db)):
    session = chat_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    chat_service.delete_session(db, session)
