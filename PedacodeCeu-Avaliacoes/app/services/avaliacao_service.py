"""Regras de negócio das avaliações."""

import logging
import math

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UsuarioToken
from app.clients.pedidos_client import PedidosClient
from app.errors import AcessoNegado, Conflito, NaoEncontrado, ServicoIndisponivel
from app.models import Avaliacao
from app.repositories.avaliacao_repository import AvaliacaoRepository, CompraRepository
from app.schemas import (
    AtualizarAvaliacaoDTO,
    AvaliacaoDTO,
    CriarAvaliacaoDTO,
    ListaAvaliacoesDTO,
    MetaDTO,
    MinhaAvaliacaoDTO,
    ResumoDTO,
)
from app.services.cache import chave_resumo, invalidar_cache, ler_cache, salvar_cache

log = logging.getLogger("avaliacoes.service")

MSG_NAO_COMPROU = "Você só pode avaliar produtos de pedidos que já foram entregues."


class AvaliacaoService:
    def __init__(self, session: AsyncSession, pedidos: PedidosClient):
        self.avaliacoes = AvaliacaoRepository(session)
        self.compras = CompraRepository(session)
        self.pedidos = pedidos

    # ---------- Regra principal: só avalia quem recebeu o produto ----------

    async def _cliente_recebeu(self, usuario_id: str, produto_id: str) -> bool:
        # 1) Caminho normal: o evento pedido.entregue já gravou a compra no banco local.
        if await self.compras.existe(usuario_id, produto_id):
            return True

        # 2) Reserva: o evento pode ter se perdido. Pergunta ao back (timeout + retry + circuit breaker).
        resultado = await self.pedidos.verificar_compra(usuario_id, produto_id)
        if resultado.comprou:
            # Guarda localmente para não precisar perguntar de novo.
            await self.compras.registrar(usuario_id, [produto_id], resultado.pedido_id, origem="http")
        return resultado.comprou

    # ---------- Casos de uso ----------

    async def criar(self, usuario: UsuarioToken, dto: CriarAvaliacaoDTO) -> Avaliacao:
        if await self.avaliacoes.buscar_por_usuario_produto(usuario.id, dto.produto_id):
            raise Conflito("Você já avaliou este produto. Edite a sua avaliação.")

        if not await self._cliente_recebeu(usuario.id, dto.produto_id):
            raise AcessoNegado(MSG_NAO_COMPROU)

        avaliacao = Avaliacao(
            produto_id=dto.produto_id,
            usuario_id=usuario.id,
            autor_nome=usuario.nome,
            nota=dto.nota,
            comentario=dto.comentario,
        )
        try:
            avaliacao = await self.avaliacoes.salvar(avaliacao)
        except IntegrityError:
            # Duas requisições ao mesmo tempo: a UNIQUE (usuario_id, produto_id) do banco barra a segunda.
            await self.avaliacoes.session.rollback()
            raise Conflito("Você já avaliou este produto. Edite a sua avaliação.")

        await invalidar_cache(chave_resumo(dto.produto_id))
        log.info(
            "Avaliação criada id=%s produtoId=%s usuarioId=%s nota=%d",
            avaliacao.id, avaliacao.produto_id, avaliacao.usuario_id, avaliacao.nota,
        )
        return avaliacao

    async def atualizar(self, usuario: UsuarioToken, avaliacao_id: str, dto: AtualizarAvaliacaoDTO) -> Avaliacao:
        avaliacao = await self._buscar_ou_404(avaliacao_id)
        if avaliacao.usuario_id != usuario.id:
            raise AcessoNegado("Você só pode editar a sua própria avaliação")

        avaliacao.nota = dto.nota
        avaliacao.comentario = dto.comentario
        avaliacao = await self.avaliacoes.salvar(avaliacao)

        await invalidar_cache(chave_resumo(avaliacao.produto_id))
        log.info("Avaliação atualizada id=%s nota=%d", avaliacao.id, avaliacao.nota)
        return avaliacao

    async def remover(self, usuario: UsuarioToken, avaliacao_id: str) -> None:
        avaliacao = await self._buscar_ou_404(avaliacao_id)
        if avaliacao.usuario_id != usuario.id and not usuario.is_admin:
            raise AcessoNegado("Você só pode remover a sua própria avaliação")

        produto_id = avaliacao.produto_id
        await self.avaliacoes.remover(avaliacao)
        await invalidar_cache(chave_resumo(produto_id))
        log.info("Avaliação removida id=%s por usuarioId=%s admin=%s", avaliacao_id, usuario.id, usuario.is_admin)

    async def listar_por_produto(self, produto_id: str, pagina: int, limite: int) -> ListaAvaliacoesDTO:
        itens, total = await self.avaliacoes.listar_por_produto(produto_id, (pagina - 1) * limite, limite)
        return ListaAvaliacoesDTO(
            dados=[AvaliacaoDTO.model_validate(a) for a in itens],
            meta=MetaDTO(total=total, pagina=pagina, limite=limite, total_paginas=math.ceil(total / limite)),
        )

    async def resumo(self, produto_id: str) -> ResumoDTO:
        # Cache-aside: tenta o Redis; se não tiver, calcula no banco e guarda com TTL.
        chave = chave_resumo(produto_id)
        em_cache = await ler_cache(chave)
        if em_cache is not None:
            return ResumoDTO.model_validate(em_cache)

        contagem = await self.avaliacoes.contagem_por_nota(produto_id)
        total = sum(contagem.values())
        media = round(sum(nota * qtd for nota, qtd in contagem.items()) / total, 1) if total else None
        resumo = ResumoDTO(
            produto_id=produto_id,
            media=media,
            total=total,
            distribuicao={str(n): contagem.get(n, 0) for n in range(1, 6)},
        )
        await salvar_cache(chave, resumo.model_dump(by_alias=True))
        return resumo

    async def minha(self, usuario: UsuarioToken, produto_id: str) -> MinhaAvaliacaoDTO:
        """O que o front precisa para decidir se mostra o formulário, a avaliação do usuário ou um aviso."""
        existente = await self.avaliacoes.buscar_por_usuario_produto(usuario.id, produto_id)
        if existente:
            return MinhaAvaliacaoDTO(pode_avaliar=False, motivo="Você já avaliou este produto",
                                     avaliacao=AvaliacaoDTO.model_validate(existente))
        try:
            recebeu = await self._cliente_recebeu(usuario.id, produto_id)
        except ServicoIndisponivel as err:
            return MinhaAvaliacaoDTO(pode_avaliar=False, motivo=err.message)

        return MinhaAvaliacaoDTO(pode_avaliar=recebeu, motivo=None if recebeu else MSG_NAO_COMPROU)

    async def _buscar_ou_404(self, avaliacao_id: str) -> Avaliacao:
        avaliacao = await self.avaliacoes.buscar_por_id(avaliacao_id)
        if not avaliacao:
            raise NaoEncontrado("Avaliação não encontrada")
        return avaliacao
