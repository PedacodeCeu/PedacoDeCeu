import { Response } from "express";
import Pedido from "../models/Pedido";
import PedidoItem from "../models/PedidoItem";
import Produto from "../models/Produto";
import Usuario from "../models/Usuario";
import { AuthRequest } from "../middlewares/auth.middlewares";
import { RespostaPaginada } from "../types";
import { CANAIS, publicarEvento, publicarPedidoEntregue } from "../services/eventos";

const STATUS_VALIDOS = ["pendente", "confirmado", "entregue", "cancelado"];

async function produtoIdsDoPedido(pedidoId: string): Promise<string[]> {
  const itens = await PedidoItem.findAll({ where: { pedidoId }, attributes: ["produtoId"] });
  return itens.map((item) => item.produtoId);
}

class PedidoController {

  async findAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const usuarioLogado = req.usuario;
      const isAdmin = usuarioLogado?.role === "admin";
      const pagina = parseInt(req.query.pagina as string) || 1;
      const limite = parseInt(req.query.limite as string) || 10;
      const offset = (pagina - 1) * limite;

      const where = isAdmin ? {} : { usuarioId: usuarioLogado?.id };

      const { count, rows } = await Pedido.findAndCountAll({
        where,
        limit: limite,
        offset,
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: PedidoItem,
            as: "itens",
            include: [{ model: Produto, as: "produto" }],
          },
          {
            model: Usuario,
            as: "usuario",
            attributes: ["id", "nome", "email"],
          },
        ],
      });

      const resposta: RespostaPaginada<Pedido> = {
        dados: rows,
        meta: {
          total: count,
          pagina,
          limite,
          totalPaginas: Math.ceil(count / limite),
        },
      };

      res.status(200).json(resposta);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar pedidos", error });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const usuarioLogado = req.usuario;
      const isAdmin = usuarioLogado?.role === "admin";

      const pedido = await Pedido.findByPk(id, {
        include: [
          {
            model: PedidoItem,
            as: "itens",
            include: [{ model: Produto, as: "produto" }],
          },
          {
            model: Usuario,
            as: "usuario",
            attributes: ["id", "nome", "email"],
          },
        ],
      });

      if (!pedido) {
        res.status(404).json({ message: "Pedido não encontrado" });
        return;
      }

      if (!isAdmin && pedido.usuarioId !== usuarioLogado?.id) {
        res.status(403).json({ message: "Acesso negado" });
        return;
      }

      res.status(200).json(pedido);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar pedido", error });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, itens } = req.body;
      const usuarioId = req.usuario?.id;
      const isAdmin = req.usuario?.role === "admin";

      if (!usuarioId) {
        res.status(401).json({ message: "Usuário não autenticado" });
        return;
      }

      if (status && !STATUS_VALIDOS.includes(status)) {
        res.status(400).json({ message: "Status inválido" });
        return;
      }

      // Cliente comum sempre cria o pedido como "pendente". Sem isso, alguém poderia criar
      // um pedido já "entregue" e ganhar o direito de avaliar um produto que não recebeu.
      const statusInicial = isAdmin && status ? status : "pendente";

      if (!itens || itens.length === 0) {
        res.status(400).json({ message: "O pedido deve ter ao menos um item" });
        return;
      }

      let total = 0;
      for (const item of itens) {
        const produto = await Produto.findByPk(String(item.produtoId));
        if (!produto) {
          res.status(404).json({ message: `Produto ${item.produtoId} não encontrado` });
          return;
        }
        if (!item.quantidade || item.quantidade <= 0) {
          res.status(400).json({ message: "Quantidade inválida" });
          return;
        }
        total += produto.preco * item.quantidade;
      }

      const pedido = await Pedido.create({ usuarioId, status: statusInicial, total });

      for (const item of itens) {
        const produto = await Produto.findByPk(String(item.produtoId));
        await PedidoItem.create({
          pedidoId: pedido.id,
          produtoId: String(item.produtoId),
          quantidade: item.quantidade,
          precoUnitario: produto!.preco,
        });
      }

      const pedidoCriado = await Pedido.findByPk(pedido.id, {
        include: [{ model: PedidoItem, as: "itens", include: [{ model: Produto, as: "produto" }] }],
      });

      await publicarEvento(CANAIS.PEDIDO_CRIADO, {
        pedidoId: pedido.id,
        usuarioId,
        total,
        status: pedido.status,
      });

      if (statusInicial === "entregue") {
        await publicarPedidoEntregue(pedido.id, usuarioId, await produtoIdsDoPedido(pedido.id));
      }

      res.status(201).json(pedidoCriado);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar pedido", error });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const usuarioLogado = req.usuario;
      const isAdmin = usuarioLogado?.role === "admin";
      const pedido = await Pedido.findByPk(id);

      if (!pedido) {
        res.status(404).json({ message: "Pedido não encontrado" });
        return;
      }

      if (!isAdmin && pedido.usuarioId !== usuarioLogado?.id) {
        res.status(403).json({ message: "Acesso negado" });
        return;
      }

      const { status, itens } = req.body;
      const statusAnterior = pedido.status;

      if (status && !STATUS_VALIDOS.includes(status)) {
        res.status(400).json({ message: "Status inválido" });
        return;
      }

      if (!isAdmin) {
        if (status && status !== "entregue") {
          res.status(403).json({ message: "Você só pode confirmar a entrega do pedido" });
          return;
        }
        if (status === "entregue" && pedido.status !== "confirmado") {
          res.status(400).json({ message: "Só é possível confirmar entrega de pedidos com status 'confirmado'" });
          return;
        }
        if (itens) {
          res.status(403).json({ message: "Você não tem permissão para alterar os itens do pedido" });
          return;
        }
      }

      if (status) pedido.status = status;

      if (itens && itens.length > 0) {
        await PedidoItem.destroy({ where: { pedidoId: pedido.id } });

        let total = 0;
        for (const item of itens) {
          const produto = await Produto.findByPk(String(item.produtoId));
          if (!produto) {
            res.status(404).json({ message: `Produto ${item.produtoId} não encontrado` });
            return;
          }
          total += produto.preco * item.quantidade;
          await PedidoItem.create({
            pedidoId: pedido.id,
            produtoId: String(item.produtoId),
            quantidade: item.quantidade,
            precoUnitario: produto.preco,
          });
        }
        pedido.total = total;
      }

      await pedido.save();

      const pedidoAtualizado = await Pedido.findByPk(pedido.id, {
        include: [{ model: PedidoItem, as: "itens", include: [{ model: Produto, as: "produto" }] }],
      });

      // Evento de domínio: o pedido acabou de passar para "entregue".
      // O serviço de avaliações assina este canal para saber quem pode avaliar cada produto.
      if (pedido.status === "entregue" && statusAnterior !== "entregue") {
        await publicarPedidoEntregue(pedido.id, pedido.usuarioId, await produtoIdsDoPedido(pedido.id));
      }

      res.status(200).json(pedidoAtualizado);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar pedido", error });
    }
  }

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const usuarioLogado = req.usuario;
      const isAdmin = usuarioLogado?.role === "admin";
      const pedido = await Pedido.findByPk(id);

      if (!pedido) {
        res.status(404).json({ message: "Pedido não encontrado" });
        return;
      }

      if (!isAdmin && pedido.usuarioId !== usuarioLogado?.id) {
        res.status(403).json({ message: "Acesso negado" });
        return;
      }

      await PedidoItem.destroy({ where: { pedidoId: pedido.id } });
      await pedido.destroy();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar pedido", error });
    }
  }
}

export default new PedidoController();