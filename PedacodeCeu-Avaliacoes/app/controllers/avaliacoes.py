"""Rotas HTTP. Só recebem a requisição, chamam o service e devolvem o DTO."""

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UsuarioToken, usuario_atual
from app.clients.pedidos_client import get_pedidos_client
from app.database import get_session
from app.schemas import (
    AtualizarAvaliacaoDTO,
    AvaliacaoDTO,
    CriarAvaliacaoDTO,
    ListaAvaliacoesDTO,
    MinhaAvaliacaoDTO,
    ResumoDTO,
)
from app.services.avaliacao_service import AvaliacaoService

router = APIRouter(prefix="/avaliacoes", tags=["Avaliações"])

ERRO = {"content": {"application/json": {"example": {"message": "Descrição do erro"}}}}


def get_service(session: AsyncSession = Depends(get_session)) -> AvaliacaoService:
    return AvaliacaoService(session, get_pedidos_client())


@router.post(
    "",
    response_model=AvaliacaoDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Avaliar um produto",
    description="Só é permitido para quem tem um pedido **entregue** com o produto. Uma avaliação por produto.",
    responses={401: ERRO, 403: ERRO, 409: ERRO, 503: ERRO},
)
async def criar(dto: CriarAvaliacaoDTO, usuario: UsuarioToken = Depends(usuario_atual),
                service: AvaliacaoService = Depends(get_service)):
    return await service.criar(usuario, dto)


@router.get("/produto/{produto_id}/resumo", response_model=ResumoDTO, summary="Média e total de avaliações")
async def resumo(produto_id: str, service: AvaliacaoService = Depends(get_service)):
    return await service.resumo(produto_id)


@router.get(
    "/produto/{produto_id}/minha",
    response_model=MinhaAvaliacaoDTO,
    summary="Situação do usuário logado para este produto",
    description="Diz se o usuário pode avaliar e devolve a avaliação dele, se já existir.",
    responses={401: ERRO},
)
async def minha(produto_id: str, usuario: UsuarioToken = Depends(usuario_atual),
                service: AvaliacaoService = Depends(get_service)):
    return await service.minha(usuario, produto_id)


@router.get("/produto/{produto_id}", response_model=ListaAvaliacoesDTO, summary="Listar avaliações de um produto")
async def listar(
    produto_id: str,
    pagina: int = Query(1, ge=1),
    limite: int = Query(10, ge=1, le=50),
    service: AvaliacaoService = Depends(get_service),
):
    return await service.listar_por_produto(produto_id, pagina, limite)


@router.put(
    "/{avaliacao_id}",
    response_model=AvaliacaoDTO,
    summary="Editar a própria avaliação",
    responses={401: ERRO, 403: ERRO, 404: ERRO},
)
async def atualizar(avaliacao_id: str, dto: AtualizarAvaliacaoDTO,
                    usuario: UsuarioToken = Depends(usuario_atual),
                    service: AvaliacaoService = Depends(get_service)):
    return await service.atualizar(usuario, avaliacao_id, dto)


@router.delete(
    "/{avaliacao_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover avaliação (autor ou admin)",
    responses={401: ERRO, 403: ERRO, 404: ERRO},
)
async def remover(avaliacao_id: str, usuario: UsuarioToken = Depends(usuario_atual),
                  service: AvaliacaoService = Depends(get_service)):
    await service.remover(usuario, avaliacao_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
