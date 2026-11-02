"""Ambiente de teste: SQLite no lugar do PostgreSQL, fakeredis no lugar do Redis e um back
simulado (httpx.MockTransport). Assim os testes rodam sem Docker, inclusive no CI."""

import os
import tempfile

_db = os.path.join(tempfile.mkdtemp(), "avaliacoes_teste.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_db}"
os.environ["JWT_SECRET"] = "segredo-de-teste-com-mais-de-32-caracteres"
os.environ["INTERNAL_TOKEN"] = "token-interno-teste"
os.environ["LOG_LEVEL"] = "INFO"

import uuid  # noqa: E402

import fakeredis  # noqa: E402
import httpx  # noqa: E402
import jwt  # noqa: E402
import pytest  # noqa: E402

from app.clients import pedidos_client  # noqa: E402
from app.clients.circuit_breaker import CircuitBreaker  # noqa: E402
from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app import redis_client  # noqa: E402


class BackFalso:
    """Simula a rota GET /internal/compras do back."""

    def __init__(self):
        self.compras: set[tuple[str, str]] = set()
        self.fora_do_ar = False
        self.chamadas = 0

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.chamadas += 1
        if self.fora_do_ar:
            raise httpx.ConnectError("back fora do ar", request=request)
        assert request.headers["X-Internal-Token"] == "token-interno-teste"
        chave = (request.url.params["usuarioId"], request.url.params["produtoId"])
        comprou = chave in self.compras
        return httpx.Response(200, json={"comprou": comprou, "pedidoId": "pedido-http" if comprou else None})


@pytest.fixture
async def back():
    falso = BackFalso()
    cliente = pedidos_client.PedidosClient(
        base_url="http://back",
        token_interno="token-interno-teste",
        timeout=1,
        tentativas=3,
        breaker=CircuitBreaker("teste", limite_falhas=2, tempo_reset=30),
        transport=httpx.MockTransport(falso.handler),
        espera_base=0,
    )
    pedidos_client.substituir_cliente(cliente)
    yield falso
    await cliente.fechar()
    pedidos_client.substituir_cliente(None)


@pytest.fixture
async def redis():
    falso = fakeredis.FakeAsyncRedis(decode_responses=True)
    redis_client.substituir_cliente(falso)
    yield falso
    await falso.flushall()


@pytest.fixture(autouse=True)
async def banco_limpo():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.fixture
async def api(back, redis):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://teste") as cliente:
        yield cliente


def token(usuario_id: str | None = None, nome: str = "Maria", role: str = "usuario") -> dict[str, str]:
    payload = {"id": usuario_id or str(uuid.uuid4()), "nome": nome, "email": "maria@teste.com", "role": role}
    return {"Authorization": f"Bearer {jwt.encode(payload, 'segredo-de-teste-com-mais-de-32-caracteres', algorithm='HS256')}"}


def novo_id() -> str:
    return str(uuid.uuid4())
