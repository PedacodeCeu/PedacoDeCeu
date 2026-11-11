"""Conexão com o banco próprio do serviço (PostgreSQL)."""

import asyncio
import logging
from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

log = logging.getLogger("avaliacoes.db")

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def criar_tabelas(tentativas: int = 10, espera: float = 2.0) -> None:
    """Cria as tabelas na subida do serviço, esperando o banco ficar disponível."""
    from app import models  # noqa: F401  (registra os modelos no Base.metadata)

    for tentativa in range(1, tentativas + 1):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            log.info("Tabelas verificadas/criadas")
            return
        except Exception as err:  # banco ainda subindo
            if tentativa == tentativas:
                raise
            log.warning("Banco indisponível (tentativa %d/%d): %s", tentativa, tentativas, err)
            await asyncio.sleep(espera)


async def banco_ok() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
