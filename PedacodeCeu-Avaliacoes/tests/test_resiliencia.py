import asyncio
import json

from app.clients.circuit_breaker import ABERTO, FECHADO, MEIO_ABERTO, CircuitBreaker
from app.database import SessionLocal
from app.events import assinante
from app.repositories.avaliacao_repository import CompraRepository
from tests.conftest import novo_id


def test_circuit_breaker_ciclo_completo():
    agora = [0.0]
    cb = CircuitBreaker("teste", limite_falhas=2, tempo_reset=10, relogio=lambda: agora[0])

    assert cb.permitir() and cb.estado == FECHADO
    cb.registrar_falha()
    assert cb.estado == FECHADO
    cb.registrar_falha()
    assert cb.estado == ABERTO and not cb.permitir()

    agora[0] = 10
    assert cb.permitir() and cb.estado == MEIO_ABERTO
    cb.registrar_falha()  # falhou no teste: abre de novo
    assert cb.estado == ABERTO

    agora[0] = 20
    assert cb.permitir()
    cb.registrar_sucesso()
    assert cb.estado == FECHADO and cb.falhas == 0


async def test_assinante_recebe_evento_pelo_redis(redis):
    usuario, produto = novo_id(), novo_id()
    tarefa = asyncio.create_task(assinante.ouvir_eventos())
    try:
        for _ in range(50):  # espera a inscrição no canal
            if assinante.estado["inscrito"]:
                break
            await asyncio.sleep(0.05)
        assert assinante.estado["inscrito"]

        mensagem = json.dumps({
            "id": novo_id(), "tipo": "pedido.entregue", "ocorridoEm": "2026-11-02T12:00:00Z",
            "dados": {"pedidoId": novo_id(), "usuarioId": usuario, "produtoIds": [produto]},
        })
        assert await redis.publish("pedido.entregue", mensagem) == 1

        async with SessionLocal() as session:
            repo = CompraRepository(session)
            for _ in range(50):
                if await repo.existe(usuario, produto):
                    break
                await asyncio.sleep(0.05)
            assert await repo.existe(usuario, produto)
    finally:
        tarefa.cancel()
        try:
            await tarefa
        except asyncio.CancelledError:
            pass


async def test_cache_fora_do_ar_nao_derruba_resumo(api, monkeypatch):
    from app.services import cache

    class RedisQuebrado:
        async def get(self, *a, **k):
            raise ConnectionError("redis fora")

        async def set(self, *a, **k):
            raise ConnectionError("redis fora")

        async def delete(self, *a, **k):
            raise ConnectionError("redis fora")

    monkeypatch.setattr(cache, "get_redis", lambda: RedisQuebrado())
    r = await api.get(f"/avaliacoes/produto/{novo_id()}/resumo")
    assert r.status_code == 200 and r.json()["total"] == 0
