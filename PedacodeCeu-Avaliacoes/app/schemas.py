"""DTOs de entrada e saída. Os campos são snake_case no Python e camelCase no JSON,
igual ao resto da API (produtoId, totalPaginas...)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


def _limpar_comentario(valor: str | None) -> str | None:
    if valor is None:
        return None
    valor = valor.strip()
    return valor or None


# ---------- Entrada ----------

class CriarAvaliacaoDTO(CamelModel):
    produto_id: str = Field(min_length=1, max_length=36)
    nota: int = Field(ge=1, le=5, description="Nota de 1 a 5")
    comentario: str | None = Field(default=None, max_length=1000)

    _comentario = field_validator("comentario")(_limpar_comentario)


class AtualizarAvaliacaoDTO(CamelModel):
    nota: int = Field(ge=1, le=5)
    comentario: str | None = Field(default=None, max_length=1000)

    _comentario = field_validator("comentario")(_limpar_comentario)


# ---------- Saída ----------

class AvaliacaoDTO(CamelModel):
    id: str
    produto_id: str
    usuario_id: str
    autor_nome: str
    nota: int
    comentario: str | None
    criado_em: datetime
    atualizado_em: datetime


class MetaDTO(CamelModel):
    total: int
    pagina: int
    limite: int
    total_paginas: int


class ListaAvaliacoesDTO(CamelModel):
    dados: list[AvaliacaoDTO]
    meta: MetaDTO


class ResumoDTO(CamelModel):
    produto_id: str
    media: float | None = Field(description="Média das notas, com 1 casa decimal. null se não houver avaliações")
    total: int
    distribuicao: dict[str, int] = Field(description='Quantidade por nota: {"1": 0, ..., "5": 3}')


class MinhaAvaliacaoDTO(CamelModel):
    pode_avaliar: bool
    motivo: str | None = None
    avaliacao: AvaliacaoDTO | None = None


class HealthDTO(CamelModel):
    status: str
    banco: bool
    redis: bool
    assinante_eventos: bool


# ---------- Eventos recebidos ----------

class DadosPedidoEntregue(CamelModel):
    pedido_id: str
    usuario_id: str
    produto_ids: list[str]


class EventoPedidoEntregue(CamelModel):
    id: str
    tipo: str
    ocorrido_em: datetime
    dados: DadosPedidoEntregue
