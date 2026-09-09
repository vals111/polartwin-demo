import os
import logging
from typing import List
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()

logger = logging.getLogger("polartwin.config")


def _require_env(name: str, fallback: str | None = None) -> str:
    """Return env var value; raise at startup if missing and no safe fallback."""
    val = os.getenv(name, fallback)
    if not val:
        raise RuntimeError(
            f"Required environment variable '{name}' is not set. "
            "Copy backend/.env.example to backend/.env and fill in all required values."
        )
    return val


class Settings(BaseSettings):
    PROJECT_NAME: str = "POLARTWIN"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./polartwin.db")

    # ── Supabase (optional — only used if SUPABASE_URL is set) ──────────────
    # Stack note: Auth is custom JWT+bcrypt; DB is SQLAlchemy against
    # SQLite (dev) or Render-managed PostgreSQL (prod).
    # These keys are only needed if you switch to a real Supabase project.
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    # ── JWT — NO hardcoded default, MUST be set via environment ──────────────
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── CORS — no wildcard; list only real deployed origins ─────────────────
    # Remove "*" entirely — combining "*" with allow_credentials=True is
    # rejected by browsers and defeats the purpose of an allowlist.
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        # Production Cloudflare Pages domain (update to your real domain):
        os.getenv("FRONTEND_ORIGIN", "https://polartwin.pages.dev"),
    ]

    SIMULATION_TICK_SECONDS: int = int(os.getenv("SIMULATION_TICK_SECONDS", "4"))
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "https://polartwin.pages.dev")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="allow")

    def validate_secrets(self) -> None:
        """Call at startup — raises immediately if JWT_SECRET is not set."""
        if not self.JWT_SECRET:
            raise RuntimeError(
                "JWT_SECRET environment variable is NOT set. "
                "Generate a strong random secret and add it to your .env file:\n"
                "  python -c \"import secrets; print(secrets.token_hex(48))\"\n"
                "Never commit the real secret to source control."
            )


settings = Settings()
