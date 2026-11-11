"""Cache-aside no Redis, com TTL e invalidação.

Se o Redis falhar, as funções só logam e devolvem "sem cache": o serviço continua
respondendo direto do banco (degradação controlada, em vez de erro para o usuário)."""

import json
import logging
from typing import Any

from app.config import settings
from app.redis_client import get_redis

log = logging.getLogger("avaliacoes.cache")


def chave_resumo(produto_id: str) -> str:
    return f"avaliacoes:resumo:{produto_id}"


async def ler_cache(chave: str) -> Any | None:
    try:
        valor = await get_redis().get(chave)
    except Exception as err:
        log.warning("Erro ao ler %s: %s (seguindo sem cache)", chave, err)
        return None
    if valor is None:
        log.info("MISS %s", chave)
        return None
    log.info("HIT %s", chave)
    return json.loads(valor)


async def salvar_cache(chave: str, valor: Any, ttl: int | None = None) -> None:
    try:
        await get_redis().set(chave, json.dumps(valor, default=str), ex=ttl or settings.cache_ttl)
    except Exception as err:
        log.warning("Erro ao salvar %s: %s", chave, err)


async def invalidar_cache(chave: str) -> None:
    try:
        removidas = await get_redis().delete(chave)
        log.info("INVALIDADO %s (%d chave)", chave, removidas)
    except Exception as err:
        log.warning("Erro ao invalidar %s: %s", chave, err)
