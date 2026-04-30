from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # RAG / LLM
    faiss_dir: str   = str(ROOT_DIR / "db" / "faiss")
    embed_model: str = "BAAI/bge-m3"
    llm_model: str   = "qwen3:8b"
    min_score: float = 0.40
    ollama_host: str = "http://localhost:11434"

    # OpenRouter API
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # OpenAI (GPT-4o)
    openai_api_key: str = "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"
    openai_base_url: str = "https://api.openai.com/v1/chat/completions"

    # Google Gemini
    gemini_api_key: str = ""

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
