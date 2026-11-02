"""Erros de negócio e tratamento centralizado. Toda resposta de erro tem o formato
{"message": "..."}, igual ao back em Node, para o front tratar tudo do mesmo jeito."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

log = logging.getLogger("avaliacoes.erros")


class ErroApp(Exception):
    status_code = 500

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NaoAutenticado(ErroApp):
    status_code = 401


class AcessoNegado(ErroApp):
    status_code = 403


class NaoEncontrado(ErroApp):
    status_code = 404


class Conflito(ErroApp):
    status_code = 409


class ServicoIndisponivel(ErroApp):
    status_code = 503


def registrar_handlers(app: FastAPI) -> None:
    @app.exception_handler(ErroApp)
    async def _erro_app(request: Request, exc: ErroApp):
        log.info("%s %s -> %d %s", request.method, request.url.path, exc.status_code, exc.message)
        return JSONResponse(status_code=exc.status_code, content={"message": exc.message})

    @app.exception_handler(RequestValidationError)
    async def _erro_validacao(request: Request, exc: RequestValidationError):
        erros = [
            {"campo": ".".join(str(p) for p in e["loc"][1:]) or str(e["loc"][0]), "mensagem": e["msg"]}
            for e in exc.errors()
        ]
        return JSONResponse(status_code=400, content={"message": "Dados inválidos", "erros": erros})

    @app.exception_handler(Exception)
    async def _erro_inesperado(request: Request, exc: Exception):
        log.exception("Erro inesperado em %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"message": "Erro interno"})
