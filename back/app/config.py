from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # RAG / LLM
    chroma_dir: str  = str(ROOT_DIR / "db" / "chroma")
    embed_model: str = "BAAI/bge-m3"
    llm_model: str   = "qwen3:8b"
    min_score: float = 0.40
    ollama_host: str = "http://localhost:11434"

    # Database (SQLite by default; set DATABASE_URL for PostgreSQL)
    database_url: str = f"sqlite:///{ROOT_DIR}/db/jk_assistant.db"

    # API
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]
    api_prefix: str = "/api"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
