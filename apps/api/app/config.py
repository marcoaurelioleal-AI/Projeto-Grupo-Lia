from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _split_origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "Projeto LIA API"
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./lia.db")
    jwt_secret: str = os.getenv("JWT_SECRET", os.getenv("SENHA_ACESSO", "lia-dev-secret-change-me"))
    access_token_minutes: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "480"))
    frontend_origins: list[str] = field(default_factory=list)
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or os.getenv("CHAVE_API")
    gemini_model: str = os.getenv("MODELO_GEMINI", "gemini-2.5-flash")
    default_admin_username: str = os.getenv("LIA_ADMIN_USER", "admin")
    default_admin_password: str = os.getenv("LIA_ADMIN_PASSWORD", os.getenv("SENHA_ACESSO", "lia-admin"))

    def __post_init__(self) -> None:
        origins = os.getenv(
            "FRONTEND_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
        )
        object.__setattr__(self, "frontend_origins", _split_origins(origins))


settings = Settings()
