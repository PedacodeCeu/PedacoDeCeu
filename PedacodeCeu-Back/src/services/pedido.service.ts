import sequelize from "../config/database";
import Pedido from "../models/Pedido";
import PedidoItem from "../models/PedidoItem";
import Produto from "../models/Produto";
import Usuario from "../models/Usuario";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors/AppError";
import { UsuarioPayload } from "../types";
import { PaginacaoDTO, paraRespostaPaginada, RespostaPaginada } from "../dtos/comum.dto";
import {
  AtualizarPedidoDTO,
  CriarPedidoDTO,
  ItemPedidoDTO,
  RespostaVerificarCompraDTO,
  VerificarCompraDTO,
} from "../dtos/pedido.dto";
import { CANAIS, publicarEvento, publicarPedidoEntregue } from "../infra/eventos";

const COM_ITENS = { model: PedidoItem, as: "itens", include: [{ model: Produto, as: "produto" }] };
const COM_USUARIO = { model: Usuario, as: "usuario", attributes: ["id", "nome", "email"] };

type ItemCalculado = { produtoId: string; quantidade: number; precoUnitario: number };

const ehAdmin = (usuario: UsuarioPayload) => usuario.role === "admin";

// Busca todos os produtos do pedido numa consulta só e calcula o total.
// Se algum produto não existir, falha ANTES de qualquer escrita no banco.
async function calcularItens(itens: ItemPedidoDTO[]): Promise<{ itens: ItemCalculado[]; total: number }> {
  const ids = [...new Set(itens.map((item) => item.produtoId))];
  const produtos = await Produto.findAll({ where: { id: ids } });
  const precoPorId = new Map(produtos.map((p) => [p.id, p.preco]));

  let total = 0;
  const calculados = itens.map((item) => {
    const preco = precoPorId.get(item.produtoId);
    if (preco === undefined) {
      throw new NotFoundError(`Produto ${item.produtoId} não encontrado`);
    }
    total += preco * item.quantidade;
    return { produtoId: item.produtoId, quantidade: item.quantidade, precoUnitario: preco };
  });

  return { itens: calculados, total };
}

async function produtoIdsDoPedido(pedidoId: string): Promise<string[]> {
  const itens = await PedidoItem.findAll({ where: { pedidoId }, attributes: ["produtoId"] });
  return itens.map((item) => item.produtoId);
}

// Pedido existe e pertence a quem pediu (ou quem pediu é admin).
async function buscarDoSolicitante(id: string, solicitante: UsuarioPayload, opcoes = {}): Promise<Pedido> {
  const pedido = await Pedido.findByPk(id, opcoes);
  if (!pedido) {
    throw new NotFoundError("Pedido não encontrado");
  }
  if (!ehAdmin(solicitante) && pedido.usuarioId !== solicitante.id) {
    throw new ForbiddenError("Acesso negado");
  }
  return pedido;
}

// Regras do que o cliente comum pode fazer num pedido: só confirmar a entrega de um pedido confirmado.
function validarAlteracaoDoCliente(pedido: Pedido, dados: AtualizarPedidoDTO): void {
  if (dados.status && dados.status !== "entregue") {
    throw new ForbiddenError("Você só pode confirmar a entrega do pedido");
  }
  if (dados.status === "entregue" && pedido.status !== "confirmado") {
    throw new BadRequestError("Só é possível confirmar entrega de pedidos com status 'confirmado'");
  }
  if (dados.itens) {
    throw new ForbiddenError("Você não tem permissão para alterar os itens do pedido");
  }
}

class PedidoService {
  // Admin vê todos os pedidos; cliente vê só os seus.
  static async listar(solicitante: UsuarioPayload, paginacao: PaginacaoDTO): Promise<RespostaPaginada<Pedido>> {
    const { count, rows } = await Pedido.findAndCountAll({
      where: ehAdmin(solicitante) ? {} : { usuarioId: solicitante.id },
      limit: paginacao.limite,
      offset: (paginacao.pagina - 1) * paginacao.limite,
      order: [["createdAt", "DESC"]],
      include: [COM_ITENS, COM_USUARIO],
      // Sem isso o count soma as linhas do JOIN com os itens, e não os pedidos.
      distinct: true,
    });

    return paraRespostaPaginada(rows, count, paginacao);
  }

  static async buscarPorId(id: string, solicitante: UsuarioPayload): Promise<Pedido> {
    return buscarDoSolicitante(id, solicitante, { include: [COM_ITENS, COM_USUARIO] });
  }

  static async criar(dados: CriarPedidoDTO, solicitante: UsuarioPayload): Promise<Pedido> {
    // Cliente comum sempre cria o pedido como "pendente". Sem isso, alguém poderia criar
    // um pedido já "entregue" e ganhar o direito de avaliar um produto que não recebeu.
    const statusInicial = ehAdmin(solicitante) && dados.status ? dados.status : "pendente";

    const { itens, total } = await calcularItens(dados.itens);

    // Pedido e itens são gravados juntos: se algo falhar no meio, nada fica salvo pela metade.
    const pedido = await sequelize.transaction(async (transaction) => {
      const novo = await Pedido.create({ usuarioId: solicitante.id, status: statusInicial, total }, { transaction });
      await PedidoItem.bulkCreate(
        itens.map((item) => ({ ...item, pedidoId: novo.id })),
        { transaction }
      );
      return novo;
    });

    // Eventos só depois do commit, para ninguém reagir a um pedido que não chegou a existir.
    await publicarEvento(CANAIS.PEDIDO_CRIADO, {
      pedidoId: pedido.id,
      usuarioId: solicitante.id,
      total,
      status: pedido.status,
    });

    if (statusInicial === "entregue") {
      await publicarPedidoEntregue(pedido.id, solicitante.id, await produtoIdsDoPedido(pedido.id));
    }

    return (await Pedido.findByPk(pedido.id, { include: [COM_ITENS] }))!;
  }

  static async atualizar(id: string, dados: AtualizarPedidoDTO, solicitante: UsuarioPayload): Promise<Pedido> {
    const pedido = await buscarDoSolicitante(id, solicitante);
    const statusAnterior = pedido.status;

    if (!ehAdmin(solicitante)) {
      validarAlteracaoDoCliente(pedido, dados);
    }

    if (dados.status) pedido.status = dados.status;

    if (dados.itens && dados.itens.length > 0) {
      // Valida e calcula ANTES de apagar os itens atuais. Antes, um produto inexistente
      // dava 404 depois que os itens já tinham sido apagados, e o pedido ficava vazio.
      const { itens, total } = await calcularItens(dados.itens);

      await sequelize.transaction(async (transaction) => {
        await PedidoItem.destroy({ where: { pedidoId: pedido.id }, transaction });
        await PedidoItem.bulkCreate(
          itens.map((item) => ({ ...item, pedidoId: pedido.id })),
          { transaction }
        );
        pedido.total = total;
        await pedido.save({ transaction });
      });
    } else {
      await pedido.save();
    }

    // Evento de domínio: o pedido acabou de passar para "entregue".
    // O serviço de avaliações assina este canal para saber quem pode avaliar cada produto.
    if (pedido.status === "entregue" && statusAnterior !== "entregue") {
      await publicarPedidoEntregue(pedido.id, pedido.usuarioId, await produtoIdsDoPedido(pedido.id));
    }

    return (await Pedido.findByPk(pedido.id, { include: [COM_ITENS] }))!;
  }

  static async remover(id: string, solicitante: UsuarioPayload): Promise<void> {
    const pedido = await buscarDoSolicitante(id, solicitante);

    await sequelize.transaction(async (transaction) => {
      await PedidoItem.destroy({ where: { pedidoId: pedido.id }, transaction });
      await pedido.destroy({ transaction });
    });
  }

  // Rota interna: usada pelo serviço de avaliações quando ele ainda não recebeu o evento
  // pedido.entregue (por exemplo, se estava fora do ar quando o pedido foi entregue).
  static async verificarCompra({ usuarioId, produtoId }: VerificarCompraDTO): Promise<RespostaVerificarCompraDTO> {
    const item = await PedidoItem.findOne({
      where: { produtoId },
      include: [
        {
          model: Pedido,
          required: true,
          where: { usuarioId, status: "entregue" },
          attributes: ["id"],
        },
      ],
    });

    const comprou = item !== null;
    console.log(`[interno] verificarCompra usuarioId=${usuarioId} produtoId=${produtoId} comprou=${comprou}`);

    return { comprou, pedidoId: item ? item.pedidoId : null };
  }
}

export default PedidoService;
