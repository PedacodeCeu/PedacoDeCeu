"""Tabelas do banco do serviço de avaliações.

produto_id e usuario_id são os UUIDs que vêm do back principal. Não há chave estrangeira
para lá: cada serviço é dono do próprio banco e só guarda as referências.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _agora() -> datetime:
    return datetime.now(timezone.utc)


class Avaliacao(Base):
    __tablename__ = "avaliacoes"
    __table_args__ = (
        # Regras de negócio garantidas pelo próprio banco
        UniqueConstraint("usuario_id", "produto_id", name="uq_avaliacao_usuario_produto"),
        CheckConstraint("nota BETWEEN 1 AND 5", name="ck_avaliacao_nota"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    produto_id: Mapped[str] = mapped_column(String(36), index=True)
    usuario_id: Mapped[str] = mapped_column(String(36), index=True)
    # Cópia do nome no momento da avaliação, vinda do token. Evita consultar o back a cada listagem.
    autor_nome: Mapped[str] = mapped_column(String(120))
    nota: Mapped[int] = mapped_column(SmallInteger)
    comentario: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora, onupdate=_agora)


class CompraVerificada(Base):
    """Quem recebeu qual produto. Preenchida pelo evento pedido.entregue (ou pela verificação HTTP)."""

    __tablename__ = "compras_verificadas"

    usuario_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    produto_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    pedido_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # "evento" = veio do Redis Pub/Sub; "http" = veio da verificação de reserva no back
    origem: Mapped[str] = mapped_column(String(10))
    registrado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)
