"""Circuit breaker simples.

- FECHADO: chamadas passam normalmente.
- ABERTO: depois de N falhas seguidas, as chamadas são recusadas na hora, sem esperar timeout,
  durante `tempo_reset` segundos. Isso evita empilhar requisições num serviço que já está fora.
- MEIO-ABERTO: passado o tempo, uma chamada de teste é liberada. Se der certo, fecha;
  se falhar, abre de novo.
"""

import logging
import time
from collections.abc import Callable

log = logging.getLogger("avaliacoes.circuit_breaker")

FECHADO = "fechado"
ABERTO = "aberto"
MEIO_ABERTO = "meio-aberto"


class CircuitBreaker:
    def __init__(self, nome: str, limite_falhas: int, tempo_reset: float, relogio: Callable[[], float] = time.monotonic):
        self.nome = nome
        self.limite_falhas = limite_falhas
        self.tempo_reset = tempo_reset
        self._relogio = relogio
        self.estado = FECHADO
        self.falhas = 0
        self._aberto_em = 0.0

    def permitir(self) -> bool:
        if self.estado == ABERTO and self._relogio() - self._aberto_em >= self.tempo_reset:
            self.estado = MEIO_ABERTO
            log.info("[%s] MEIO-ABERTO: liberando uma chamada de teste", self.nome)
        return self.estado != ABERTO

    def registrar_sucesso(self) -> None:
        if self.estado != FECHADO:
            log.info("[%s] FECHADO: serviço respondeu de novo", self.nome)
        self.estado = FECHADO
        self.falhas = 0

    def registrar_falha(self) -> None:
        self.falhas += 1
        if self.estado == MEIO_ABERTO or self.falhas >= self.limite_falhas:
            self.estado = ABERTO
            self._aberto_em = self._relogio()
            log.warning(
                "[%s] ABERTO após %d falha(s): chamadas recusadas por %.0fs",
                self.nome, self.falhas, self.tempo_reset,
            )
