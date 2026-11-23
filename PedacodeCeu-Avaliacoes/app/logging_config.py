"""Formato único de log para o serviço. Cada módulo usa logging.getLogger("avaliacoes.<area>")."""

import logging

from app.request_context import request_id_atual


class _FiltroRequestId(logging.Filter):
    """Coloca o id da requisição atual em todo registro de log ("-" fora de requisições, ex.: eventos)."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_atual.get()
        return True


def configurar_logs(nivel: str = "INFO") -> None:
    logging.basicConfig(
        level=nivel.upper(),
        format="%(asctime)s %(levelname)-7s [%(name)s] [%(request_id)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        force=True,
    )
    for handler in logging.getLogger().handlers:
        handler.addFilter(_FiltroRequestId())

    # Bibliotecas barulhentas ficam só em WARNING.
    for nome in ("httpx", "httpcore", "sqlalchemy.engine", "asyncio"):
        logging.getLogger(nome).setLevel(logging.WARNING)