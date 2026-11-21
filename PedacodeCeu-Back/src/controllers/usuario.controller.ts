import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middlewares";
import UsuarioService from "../services/usuario.service";
import { AlterarRoleSchema, AtualizarUsuarioSchema, CriarUsuarioSchema } from "../dtos/usuario.dto";
import { validar } from "../dtos/validar";

class UsuarioController {
  static async findAll(_req: Request, res: Response) {
    res.status(200).json(await UsuarioService.listar());
  }

  static async getById(req: AuthRequest, res: Response) {
    res.status(200).json(await UsuarioService.buscarPorId(String(req.params.id), req.usuario!));
  }

  static async create(req: Request, res: Response) {
    const dados = validar(CriarUsuarioSchema, req.body);
    res.status(201).json(await UsuarioService.criar(dados));
  }

  static async update(req: AuthRequest, res: Response) {
    const dados = validar(AtualizarUsuarioSchema, req.body);
    res.status(200).json(await UsuarioService.atualizar(String(req.params.id), dados, req.usuario!));
  }

  static async updateRole(req: Request, res: Response) {
    const dados = validar(AlterarRoleSchema, req.body);
    res.status(200).json(await UsuarioService.alterarRole(String(req.params.id), dados));
  }

  static async remove(req: Request, res: Response) {
    await UsuarioService.remover(String(req.params.id));
    res.status(204).send();
  }
}

export default UsuarioController;
