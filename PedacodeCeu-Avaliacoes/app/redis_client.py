"""Conexão com o Redis (o mesmo container usado pelo back), usado para cache e Pub/Sub.
As chaves deste serviço usam o prefixo "avaliacoes:" para não se misturar com as do back."""

from redis.asyncio import Redis

from app.config import settings

_cliente: Redis = Redis(
    host=settings.redis_host,
    port=settings.redis_port,
    decode_responses=True,
    socket_connect_timeout=2,
    socket_timeout=2,
)


def get_redis() -> Redis:
    return _cliente


def substituir_cliente(novo: Redis) -> None:
    """Usado nos testes para trocar o Redis real por um falso (fakeredis)."""
    global _cliente
    _cliente = novo


async def redis_ok() -> bool:
    try:
        return bool(await get_redis().ping())
    except Exception:
        return False
