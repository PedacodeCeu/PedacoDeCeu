"""Acesso ao banco. Os services usam estas funções e não montam SQL direto."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Avaliacao, CompraVerificada


class AvaliacaoRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def buscar_por_id(self, avaliacao_id: str) -> Avaliacao | None:
        return await self.session.get(Avaliacao, avaliacao_id)

    async def buscar_por_usuario_produto(self, usuario_id: str, produto_id: str) -> Avaliacao | None:
        consulta = select(Avaliacao).where(
            Avaliacao.usuario_id == usuario_id, Avaliacao.produto_id == produto_id
        )
        return (await self.session.execute(consulta)).scalar_one_or_none()

    async def listar_por_produto(self, produto_id: str, offset: int, limite: int) -> tuple[list[Avaliacao], int]:
        total = await self.session.scalar(
            select(func.count()).select_from(Avaliacao).where(Avaliacao.produto_id == produto_id)
        )
        consulta = (
            select(Avaliacao)
            .where(Avaliacao.produto_id == produto_id)
            .order_by(Avaliacao.criado_em.desc())
            .offset(offset)
            .limit(limite)
        )
        itens = list((await self.session.execute(consulta)).scalars())
        return itens, int(total or 0)

    async def contagem_por_nota(self, produto_id: str) -> dict[int, int]:
        consulta = (
            select(Avaliacao.nota, func.count())
            .where(Avaliacao.produto_id == produto_id)
            .group_by(Avaliacao.nota)
        )
        return {int(nota): int(qtd) for nota, qtd in (await self.session.execute(consulta)).all()}

    async def salvar(self, avaliacao: Avaliacao) -> Avaliacao:
        self.session.add(avaliacao)
        await self.session.commit()
        await self.session.refresh(avaliacao)
        return avaliacao

    async def remover(self, avaliacao: Avaliacao) -> None:
        await self.session.delete(avaliacao)
        await self.session.commit()


class CompraRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def existe(self, usuario_id: str, produto_id: str) -> bool:
        return await self.session.get(CompraVerificada, (usuario_id, produto_id)) is not None

    async def registrar(self, usuario_id: str, produto_ids: list[str], pedido_id: str | None, origem: str) -> int:
        """Grava as compras que ainda não existem. Idempotente: receber o mesmo evento
        duas vezes não duplica nada. Devolve quantos registros novos foram criados."""
        novos = 0
        for produto_id in dict.fromkeys(produto_ids):
            if await self.session.get(CompraVerificada, (usuario_id, produto_id)) is None:
                self.session.add(
                    CompraVerificada(
                        usuario_id=usuario_id, produto_id=produto_id, pedido_id=pedido_id, origem=origem
                    )
                )
                novos += 1
        await self.session.commit()
        return novos
