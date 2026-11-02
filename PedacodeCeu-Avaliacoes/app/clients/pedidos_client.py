"""Cliente HTTP para o back principal (rota interna /internal/compras).

É a verificação de reserva: normalmente o serviço sabe das compras pelo evento pedido.entregue.
Como o Redis Pub/Sub não guarda mensagens, um evento publicado enquanto este serviço estava
fora do ar se perde. Nesse caso, perguntamos ao back diretamente.

Resiliência aplicada aqui:
- timeout: nenhuma chamada espera mais que HTTP_TIMEOUT segundos;
- retry: falhas de rede e respostas 5xx são repetidas, com espera crescente (backoff);
- circuit breaker: depois de várias falhas seguidas, para de tentar por um tempo.
"""

import asyncio
import logging
from dataclasses import dataclass

import httpx

from app.clients.circuit_breaker import CircuitBreaker
from app.config import settings
from app.errors import ServicoIndisponivel

log = logging.getLogger("avaliacoes.pedidos_client")

MENSAGEM_INDISPONIVEL = "Não foi possível verificar sua compra agora. Tente novamente em instantes."


class _ErroTemporario(Exception):
    pass


@dataclass(frozen=True)
class ResultadoCompra:
    comprou: bool
    pedido_id: str | None


class PedidosClient:
    def __init__(
        self,
        base_url: str,
        token_interno: str,
        timeout: float,
        tentativas: int,
        breaker: CircuitBreaker,
        transport: httpx.AsyncBaseTransport | None = None,
        espera_base: float = 0.2,
    ):
        self.tentativas = max(1, tentativas)
        self.breaker = breaker
        self.espera_base = espera_base
        self._http = httpx.AsyncClient(
            base_url=base_url,
            timeout=httpx.Timeout(timeout),
            headers={"X-Internal-Token": token_interno},
            transport=transport,
        )

    async def verificar_compra(self, usuario_id: str, produto_id: str) -> ResultadoCompra:
        if not self.breaker.permitir():
            log.warning("Verificação recusada: circuito ABERTO (usuarioId=%s produtoId=%s)", usuario_id, produto_id)
            raise ServicoIndisponivel(MENSAGEM_INDISPONIVEL)

        for tentativa in range(1, self.tentativas + 1):
            try:
                resposta = await self._http.get(
                    "/internal/compras", params={"usuarioId": usuario_id, "produtoId": produto_id}
                )
                if resposta.status_code >= 500:
                    raise _ErroTemporario(f"HTTP {resposta.status_code}")
                if resposta.status_code != 200:
                    # 4xx não melhora repetindo (ex.: INTERNAL_TOKEN diferente nos dois .env)
                    log.error("Back recusou a verificação: HTTP %d %s", resposta.status_code, resposta.text[:200])
                    break

                dados = resposta.json()
                self.breaker.registrar_sucesso()
                log.info(
                    "Verificação HTTP usuarioId=%s produtoId=%s comprou=%s (tentativa %d)",
                    usuario_id, produto_id, dados.get("comprou"), tentativa,
                )
                return ResultadoCompra(comprou=bool(dados.get("comprou")), pedido_id=dados.get("pedidoId"))

            except (httpx.TimeoutException, httpx.TransportError, _ErroTemporario) as err:
                log.warning(
                    "Falha ao consultar o back (tentativa %d/%d): %s",
                    tentativa, self.tentativas, type(err).__name__ if not str(err) else err,
                )
                if tentativa < self.tentativas:
                    await asyncio.sleep(self.espera_base * 2 ** (tentativa - 1))

        self.breaker.registrar_falha()
        raise ServicoIndisponivel(MENSAGEM_INDISPONIVEL)

    async def fechar(self) -> None:
        await self._http.aclose()


_cliente: PedidosClient | None = None


def get_pedidos_client() -> PedidosClient:
    global _cliente
    if _cliente is None:
        _cliente = PedidosClient(
            base_url=settings.backend_url,
            token_interno=settings.internal_token,
            timeout=settings.http_timeout,
            tentativas=settings.http_tentativas,
            breaker=CircuitBreaker("back-pedidos", settings.cb_limite_falhas, settings.cb_tempo_reset),
        )
    return _cliente


def substituir_cliente(novo: PedidosClient | None) -> None:
    global _cliente
    _cliente = novo
