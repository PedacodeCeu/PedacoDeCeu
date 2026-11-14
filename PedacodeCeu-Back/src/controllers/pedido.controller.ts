import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middlewares";
import PedidoService from "../services/pedido.service";
import { AtualizarPedidoSchema, CriarPedidoSchema } from "../dtos/pedido.dto";
import { PaginacaoSchema } from "../dtos/comum.dto";
import { validar } from "../dtos/validar";

// Todas as rotas de pedido passam pelo authMiddleware, então req.usuario sempre existe aqui.
class PedidoController {
  static async findAll(req: AuthRequest, res: Response) {
    const paginacao = validar(PaginacaoSchema, req.query);
    res.status(200).json(await PedidoService.listar(req.usuario!, paginacao));
  }

  static async getById(req: AuthRequest, res: Response) {
    res.status(200).json(await PedidoService.buscarPorId(String(req.params.id), req.usuario!));
  }

  static async create(req: AuthRequest, res: Response) {
    const dados = validar(CriarPedidoSchema, req.body);
    res.status(201).json(await PedidoService.criar(dados, req.usuario!));
  }

  static async update(req: AuthRequest, res: Response) {
    const dados = validar(AtualizarPedidoSchema, req.body);
    res.status(200).json(await PedidoService.atualizar(String(req.params.id), dados, req.usuario!));
  }

  static async remove(req: AuthRequest, res: Response) {
    await PedidoService.remover(String(req.params.id), req.usuario!);
    res.status(204).send();
  }
}

export default PedidoController;
