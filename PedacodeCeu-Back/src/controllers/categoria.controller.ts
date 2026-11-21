import { Request, Response } from "express";
import CategoriaService from "../services/categoria.service";
import { CategoriaSchema } from "../dtos/categoria.dto";
import { PaginacaoSchema } from "../dtos/comum.dto";
import { validar } from "../dtos/validar";

class CategoriaController {
  static async findAll(req: Request, res: Response) {
    const paginacao = validar(PaginacaoSchema, req.query);
    res.status(200).json(await CategoriaService.listar(paginacao));
  }

  static async getById(req: Request, res: Response) {
    res.status(200).json(await CategoriaService.buscarPorId(String(req.params.id)));
  }

  static async create(req: Request, res: Response) {
    const dados = validar(CategoriaSchema, req.body);
    res.status(201).json(await CategoriaService.criar(dados));
  }

  static async update(req: Request, res: Response) {
    const dados = validar(CategoriaSchema, req.body);
    res.status(200).json(await CategoriaService.atualizar(String(req.params.id), dados));
  }

  static async remove(req: Request, res: Response) {
    await CategoriaService.remover(String(req.params.id));
    res.status(204).send();
  }
}

export default CategoriaController;
