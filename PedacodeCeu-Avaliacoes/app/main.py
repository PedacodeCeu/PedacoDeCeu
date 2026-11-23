"""Ponto de entrada do serviço de avaliações."""

import asyncio
import logging
import time
from contextlib import asynccontextmanager, suppress
import re
import uuid

from fastapi import FastAPI, Request
from app.request_context import request_id_atual

from app.clients.pedidos_client import get_pedidos_client
from app.config import settings
from app.controllers import avaliacoes, health
from app.database import criar_tabelas, engine
from app.errors import registrar_handlers
from app.events.assinante import ouvir_eventos
from app.logging_config import configurar_logs
from app.redis_client import get_redis

configurar_logs(settings.log_level)
log = logging.getLogger("avaliacoes")
log_http = logging.getLogger("avaliacoes.http")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.jwt_secret:
        log.warning("JWT_SECRET vazio: nenhum token será aceito")
    if not settings.internal_token:
        log.warning("INTERNAL_TOKEN vazio: a verificação de compra pelo back vai falhar")

    await criar_tabelas()
    tarefa_eventos = asyncio.create_task(ouvir_eventos(), name="assinante-eventos")
    log.info("Serviço de avaliações iniciado")
    yield

    tarefa_eventos.cancel()
    with suppress(asyncio.CancelledError):
        await tarefa_eventos
    await get_pedidos_client().fechar()
    await get_redis().aclose()
    await engine.dispose()
    log.info("Serviço de avaliações encerrado")


app = FastAPI(
    title="Pedaço de Céu: Avaliações",
    version="1.0.0",
    description="Microsserviço de avaliações de produtos. Banco próprio (PostgreSQL), "
                "eventos via Redis Pub/Sub e autenticação pelo JWT do back principal.",
    lifespan=lifespan,
    docs_url="/avaliacoes/docs",
    openapi_url="/avaliacoes/openapi.json",
    redoc_url=None,
)

registrar_handlers(app)


_ID_VALIDO = re.compile(r"^[\w-]{1,64}$")


@app.middleware("http")
async def log_requisicoes(request: Request, call_next):
    # Reaproveita o id do Nginx; só gera um novo se não vier (ex.: chamada direta na rede interna).
    recebido = request.headers.get("X-Request-Id", "")
    request_id = recebido if _ID_VALIDO.match(recebido) else uuid.uuid4().hex[:8]
    token = request_id_atual.set(request_id)
    try:
        inicio = time.perf_counter()
        resposta = await call_next(request)
        ms = (time.perf_counter() - inicio) * 1000
        resposta.headers["X-Request-Id"] = request_id
        if not request.url.path.endswith("/health"):  # o healthcheck roda a cada poucos segundos
            log_http.info("%s %s -> %d (%.1f ms)", request.method, request.url.path, resposta.status_code, ms)
        return resposta
    finally:
        request_id_atual.reset(token)


app.include_router(avaliacoes.router)
app.include_router(health.router)
