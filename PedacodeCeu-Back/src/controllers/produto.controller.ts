import { Request, Response } from "express";
import ProdutoService from "../services/produto.service";
import { AtualizarProdutoSchema, CriarProdutoSchema } from "../dtos/produto.dto";
import { PaginacaoSchema } from "../dtos/comum.dto";
import { validar } from "../dtos/validar";

// Se a validação ou o service falharem depois do upload, o middleware limparUploadEmErro apaga a imagem.
class ProdutoController {
  static async findAll(req: Request, res: Response) {
    const paginacao = validar(PaginacaoSchema, req.query);
    res.status(200).json(await ProdutoService.listar(paginacao));
  }

  static async getById(req: Request, res: Response) {
    res.status(200).json(await ProdutoService.buscarPorId(String(req.params.id)));
  }

  static async create(req: Request, res: Response) {
    const dados = validar(CriarProdutoSchema, req.body);
    res.status(201).json(await ProdutoService.criar(dados, req.file?.filename));
  }

  static async update(req: Request, res: Response) {
    const dados = validar(AtualizarProdutoSchema, req.body);
    res.status(200).json(await ProdutoService.atualizar(String(req.params.id), dados, req.file?.filename));
  }

  static async remove(req: Request, res: Response) {
    await ProdutoService.remover(String(req.params.id));
    res.status(204).send();
  }
}

export default ProdutoController;
