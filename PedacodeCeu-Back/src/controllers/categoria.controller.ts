import { Request, Response } from "express";
import Categoria from "../models/Categoria";
import { RespostaPaginada } from "../types";
import { lerCache, salvarCache, invalidarCache } from "../services/cache";

class CategoriaController {
  static async findAll(req: Request, res: Response) {
    const pagina = parseInt(req.query.pagina as string) || 1;
    const limite = parseInt(req.query.limite as string) || 10;
    const offset = (pagina - 1) * limite;

    const chave = `categorias:lista:${pagina}:${limite}`;
    const emCache = await lerCache<RespostaPaginada<Categoria>>(chave);
    if (emCache) return res.status(200).json(emCache);

    const { count, rows } = await Categoria.findAndCountAll({
      limit: limite,
      offset,
      order: [["nome", "ASC"]],
    });

    const resposta: RespostaPaginada<Categoria> = {
      dados: rows,
      meta: {
        total: count,
        pagina,
        limite,
        totalPaginas: Math.ceil(count / limite),
      },
    };

    await salvarCache(chave, resposta);

    return res.status(200).json(resposta);
  }

  static async getById(req: Request, res: Response) {
    const id = String(req.params.id);

    const chave = `categorias:item:${id}`;
    const emCache = await lerCache<Categoria>(chave);
    if (emCache) return res.status(200).json(emCache);

    const categoria = await Categoria.findByPk(id);

    if (!categoria) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    await salvarCache(chave, categoria);

    return res.status(200).json(categoria);
  }

  static async create(req: Request, res: Response) {
    const { nome } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    const categoria = await Categoria.create({ nome });

    await invalidarCache("categorias:");

    return res.status(201).json(categoria);
  }

  static async update(req: Request, res: Response) {
    const id = String(req.params.id);
    const { nome } = req.body;
    const categoria = await Categoria.findByPk(id);

    if (!categoria) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    await categoria.update({ nome });

    await invalidarCache("categorias:");
    await invalidarCache("produtos:");

    return res.status(200).json(categoria);
  }

  static async remove(req: Request, res: Response) {
    const id = String(req.params.id);
    const categoria = await Categoria.findByPk(id);

    if (!categoria) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    await categoria.destroy();

    await invalidarCache("categorias:");
    await invalidarCache("produtos:");

    return res.status(204).send();
  }
}

export default CategoriaController;