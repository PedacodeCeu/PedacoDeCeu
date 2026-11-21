import { Request, Response } from "express";
import PedidoService from "../services/pedido.service";
import { VerificarCompraSchema } from "../dtos/pedido.dto";
import { validar } from "../dtos/validar";

class InternoController {
  // GET /internal/compras?usuarioId=...&produtoId=...
  static async verificarCompra(req: Request, res: Response) {
    const dados = validar(VerificarCompraSchema, req.query);
    res.status(200).json(await PedidoService.verificarCompra(dados));
  }
}

export default InternoController;
