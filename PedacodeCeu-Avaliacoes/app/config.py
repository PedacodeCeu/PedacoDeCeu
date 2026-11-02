"""Configuração do serviço, lida das variáveis de ambiente (.env + docker-compose)."""

import os
from dataclasses import dataclass

from sqlalchemy.engine import URL


def _montar_url_banco() -> str | URL:
    # DATABASE_URL tem prioridade (usado nos testes com SQLite).
    url = os.getenv("DATABASE_URL")
    if url:
        return url

    # No Docker, a URL é montada com as mesmas variáveis que o container do Postgres usa,
    # assim usuário e senha ficam num lugar só (PedacodeCeu-Avaliacoes/.env).
    return URL.create(
        "postgresql+asyncpg",
        username=os.getenv("POSTGRES_USER", "avaliacoes"),
        password=os.getenv("POSTGRES_PASSWORD", "avaliacoes"),
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("POSTGRES_DB", "avaliacoes"),
    )


@dataclass(frozen=True)
class Settings:
    database_url: str | URL
    redis_host: str
    redis_port: int
    jwt_secret: str
    backend_url: str
    internal_token: str
    cache_ttl: int
    log_level: str
    http_timeout: float
    http_tentativas: int
    cb_limite_falhas: int
    cb_tempo_reset: float


def carregar_settings() -> Settings:
    return Settings(
        database_url=_montar_url_banco(),
        redis_host=os.getenv("REDIS_HOST", "localhost"),
        redis_port=int(os.getenv("REDIS_PORT", "6379")),
        jwt_secret=os.getenv("JWT_SECRET", ""),
        backend_url=os.getenv("BACKEND_URL", "http://localhost:3000"),
        internal_token=os.getenv("INTERNAL_TOKEN", ""),
        cache_ttl=int(os.getenv("CACHE_TTL", "60")),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        # Resiliência da chamada HTTP ao back (verificação de compra de reserva)
        http_timeout=float(os.getenv("HTTP_TIMEOUT", "2.0")),
        http_tentativas=int(os.getenv("HTTP_TENTATIVAS", "3")),
        cb_limite_falhas=int(os.getenv("CB_LIMITE_FALHAS", "3")),
        cb_tempo_reset=float(os.getenv("CB_TEMPO_RESET", "30")),
    )


settings = carregar_settings()
