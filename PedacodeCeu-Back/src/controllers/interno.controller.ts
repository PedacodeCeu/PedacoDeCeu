import { Request, Response } from "express";
import Pedido from "../models/Pedido";
import PedidoItem from "../models/PedidoItem";

class InternoController {
  // GET /internal/compras?usuarioId=...&produtoId=...
  // Usado pelo serviço de avaliações quando ele ainda não recebeu o evento pedido.entregue
  // (por exemplo, se estava fora do ar quando o pedido foi entregue).
  static async verificarCompra(req: Request, res: Response) {
    const usuarioId = String(req.query.usuarioId || "");
    const produtoId = String(req.query.produtoId || "");

    if (!usuarioId || !produtoId) {
      return res.status(400).json({ message: "usuarioId e produtoId são obrigatórios" });
    }

    try {
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

      return res.status(200).json({
        comprou,
        pedidoId: comprou ? item!.pedidoId : null,
      });
    } catch (err) {
      console.error("[interno] erro ao verificar compra:", (err as Error).message);
      return res.status(500).json({ message: "Erro ao verificar compra" });
    }
  }
}

export default InternoController;
