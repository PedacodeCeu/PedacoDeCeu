"""Id da requisição atual, acessível de qualquer ponto do código (logs, cliente HTTP).

O ContextVar guarda um valor separado para cada requisição, mesmo com várias rodando ao mesmo tempo.
"""

from contextvars import ContextVar

SEM_REQUISICAO = "-"

request_id_atual: ContextVar[str] = ContextVar("request_id", default=SEM_REQUISICAO)