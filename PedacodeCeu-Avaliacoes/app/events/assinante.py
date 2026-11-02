"""Assinante do Redis Pub/Sub.

Fica ouvindo o canal pedido.entregue, publicado pelo back quando um pedido passa para
"entregue". Cada evento vira registros em compras_verificadas: é assim que o serviço
sabe, sem consultar o banco do back, quem pode avaliar cada produto.

Se a conexão com o Redis cair, o laço espera e se inscreve de novo (com espera crescente).
"""

import asyncio
import logging

from pydantic import ValidationError

from app.database import SessionLocal
from app.redis_client import get_redis
from app.repositories.avaliacao_repository import CompraRepository
from app.schemas import EventoPedidoEntregue

log = logging.getLogger("avaliacoes.eventos")

CANAL_PEDIDO_ENTREGUE = "pedido.entregue"

estado = {"inscrito": False}


async def processar_pedido_entregue(mensagem: str) -> int:
    """Processa uma mensagem do canal. Devolve quantas compras novas foram registradas."""
    try:
        evento = EventoPedidoEntregue.model_validate_json(mensagem)
    except ValidationError as err:
        log.error("Evento inválido descartado: %s | conteúdo=%s", err.errors()[:1], mensagem[:200])
        return 0

    dados = evento.dados
    async with SessionLocal() as session:
        novos = await CompraRepository(session).registrar(
            dados.usuario_id, dados.produto_ids, dados.pedido_id, origem="evento"
        )

    log.info(
        "RECEBIDO %s id=%s pedidoId=%s usuarioId=%s produtos=%d novos_registros=%d",
        evento.tipo, evento.id, dados.pedido_id, dados.usuario_id, len(dados.produto_ids), novos,
    )
    return novos


async def ouvir_eventos() -> None:
    espera = 1.0
    while True:
        pubsub = get_redis().pubsub()
        try:
            await pubsub.subscribe(CANAL_PEDIDO_ENTREGUE)
            estado["inscrito"] = True
            espera = 1.0
            log.info("Inscrito no canal %s", CANAL_PEDIDO_ENTREGUE)

            while True:
                msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if msg and msg.get("type") == "message":
                    try:
                        await processar_pedido_entregue(msg["data"])
                    except Exception:
                        # Erro ao gravar um evento não pode derrubar o assinante.
                        log.exception("Erro ao processar evento de %s", CANAL_PEDIDO_ENTREGUE)

        except asyncio.CancelledError:
            raise
        except Exception as err:
            estado["inscrito"] = False
            log.warning("Conexão com o Redis perdida (%s). Nova tentativa em %.0fs", err, espera)
            await asyncio.sleep(espera)
            espera = min(espera * 2, 30)
        finally:
            estado["inscrito"] = False
            try:
                await pubsub.aclose()
            except Exception:
                pass
