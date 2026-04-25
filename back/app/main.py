import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import back.rag as rag_module
from back.app.api.routes import chat, sessions
from back.app.config import settings
from back.app.db.models import Base
from back.app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Pre-load embedding model + ChromaDB in a thread so the first request is instant
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, rag_module._load)
    yield


app = FastAPI(
    title="JK Assistant API",
    description="O'zbekiston Jinoyat Kodeksi — AI yuridik yordamchi",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix=settings.api_prefix)
app.include_router(chat.router,     prefix=settings.api_prefix)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "version": "1.0.0"}
