"""Autenticação: valida o mesmo JWT emitido pelo back (mesmo JWT_SECRET).
O usuário não loga de novo, e o id dele sempre vem do token, nunca do corpo da requisição."""

from dataclasses import dataclass

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.errors import NaoAutenticado

bearer = HTTPBearer(auto_error=False, description="Token JWT obtido no login do site (/api/auth/login)")


@dataclass(frozen=True)
class UsuarioToken:
    id: str
    nome: str
    email: str
    role: str

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def _decodificar(token: str) -> UsuarioToken:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise NaoAutenticado("Token expirado")
    except jwt.InvalidTokenError:
        raise NaoAutenticado("Token inválido")

    if not payload.get("id"):
        raise NaoAutenticado("Token inválido")

    return UsuarioToken(
        id=str(payload["id"]),
        # Tokens antigos (emitidos antes desta versão) não têm "nome"
        nome=payload.get("nome") or "Cliente",
        email=payload.get("email", ""),
        role=payload.get("role", "usuario"),
    )


def usuario_atual(cred: HTTPAuthorizationCredentials | None = Depends(bearer)) -> UsuarioToken:
    if cred is None:
        raise NaoAutenticado("Token não fornecido")
    return _decodificar(cred.credentials)


def usuario_opcional(cred: HTTPAuthorizationCredentials | None = Depends(bearer)) -> UsuarioToken | None:
    return _decodificar(cred.credentials) if cred else None
