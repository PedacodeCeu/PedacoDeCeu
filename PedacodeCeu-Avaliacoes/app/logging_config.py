"""Formato único de log para o serviço. Cada módulo usa logging.getLogger("avaliacoes.<area>")."""

import logging


def configurar_logs(nivel: str = "INFO") -> None:
    logging.basicConfig(
        level=nivel.upper(),
        format="%(asctime)s %(levelname)-7s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        force=True,
    )
    # Bibliotecas barulhentas ficam só em WARNING.
    for nome in ("httpx", "httpcore", "sqlalchemy.engine", "asyncio"):
        logging.getLogger(nome).setLevel(logging.WARNING)
