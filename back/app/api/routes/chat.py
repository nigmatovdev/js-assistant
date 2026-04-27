import asyncio
import json
import threading

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import back.rag as rag_module
from back.app.db.session import get_db
from back.app.schemas.chat import AskRequest
from back.app.services import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/{session_id}/ask/sync")
def ask_sync(
    session_id: str,
    req:        AskRequest,
    db:         Session = Depends(get_db),
):
    """Non-streaming — calls rag.ask() directly, same code path as CLI."""
    session = chat_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    chat_service.save_message(db, session_id, "user", req.question)
    history = chat_service.get_history(db, session_id)

    result = rag_module.ask(req.question, req.top_k, history, provider=req.provider, model=req.model)

    chat_service.save_message(
        db, session_id, "assistant", result["answer"], result["sources"]
    )
    return result


@router.post("/{session_id}/ask")
async def ask_stream_endpoint(
    session_id: str,
    req:        AskRequest,
    db:         Session = Depends(get_db),
):
    """SSE streaming — runs rag.ask_stream() in a thread, feeds async queue."""
    session = chat_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    chat_service.save_message(db, session_id, "user", req.question)
    history = chat_service.get_history(db, session_id)

    async def event_generator():
        loop   = asyncio.get_event_loop()
        queue: asyncio.Queue = asyncio.Queue()
        tokens:  list[str] = []
        sources: list      = []

        def run_rag():
            try:
                for kind, value in rag_module.ask_stream(req.question, req.top_k, history, req.model, req.provider):
                    loop.call_soon_threadsafe(queue.put_nowait, (kind, value))
            except Exception as exc:
                loop.call_soon_threadsafe(queue.put_nowait, ("error", str(exc)))
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

        threading.Thread(target=run_rag, daemon=True).start()

        while True:
            item = await queue.get()
            if item is None:
                break
            kind, value = item
            if kind == "token":
                tokens.append(value)
                yield f"data: {json.dumps({'type': 'token', 'content': value})}\n\n"
            elif kind == "sources":
                sources = value
                yield f"data: {json.dumps({'type': 'sources', 'sources': value})}\n\n"
            elif kind == "error":
                yield f"data: {json.dumps({'type': 'error', 'message': value})}\n\n"
                return

        answer = "".join(tokens)
        chat_service.save_message(db, session_id, "assistant", answer, sources)
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
