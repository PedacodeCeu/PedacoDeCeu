import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import Produto from "../models/Produto";
import Categoria from "../models/Categoria";
import { RespostaPaginada } from "../types";
import { PASTA_UPLOADS } from "../config/upload";
import { lerCache, salvarCache, invalidarCache } from "../services/cache";

function removerArquivoImagem(nomeArquivo: string | null) {
  if (!nomeArquivo) return;
  const caminho = path.join(PASTA_UPLOADS, nomeArquivo);
  fs.unlink(caminho, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("Erro ao remover imagem antiga:", err);
    }
  });
}

class ProdutoController {
  static async findAll(req: Request, res: Response) {
    const pagina = parseInt(req.query.pagina as string) || 1;
    const limite = parseInt(req.query.limite as string) || 10;
    const offset = (pagina - 1) * limite;

    const chave = `produtos:lista:${pagina}:${limite}`;
    const emCache = await lerCache<RespostaPaginada<Produto>>(chave);
    if (emCache) return res.status(200).json(emCache);

    const { count, rows } = await Produto.findAndCountAll({
      limit: limite,
      offset,
      order: [["nome", "ASC"]],
      include: [{ model: Categoria, as: "categoria" }],
    });

    const resposta: RespostaPaginada<Produto> = {
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

    const chave = `produtos:item:${id}`;
    const emCache = await lerCache<Produto>(chave);
    if (emCache) return res.status(200).json(emCache);

    const produto = await Produto.findByPk(id, {
      include: [{ model: Categoria, as: "categoria" }],
    });

    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    await salvarCache(chave, produto);

    return res.status(200).json(produto);
  }

  static async create(req: Request, res: Response) {
    const { nome, descricao, preco, destaque, categoriaId } = req.body;
    const arquivo = req.file;

    if (!nome || nome.trim() === "") {
      if (arquivo) removerArquivoImagem(arquivo.filename);
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    if (!descricao || descricao.trim() === "") {
      if (arquivo) removerArquivoImagem(arquivo.filename);
      return res.status(400).json({ message: "Descrição é obrigatória" });
    }

    const precoNumero = Number(preco);
    if (!precoNumero || precoNumero <= 0) {
      if (arquivo) removerArquivoImagem(arquivo.filename);
      return res.status(400).json({ message: "Preço inválido" });
    }

    const categoria = await Categoria.findByPk(categoriaId);
    if (!categoria) {
      if (arquivo) removerArquivoImagem(arquivo.filename);
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    const produto = await Produto.create({
      nome,
      descricao,
      preco: precoNumero,
      imagem: arquivo ? arquivo.filename : null,
      destaque: destaque === "true" || destaque === true,
      categoriaId,
    });

    await invalidarCache("produtos:");

    return res.status(201).json(produto);
  }

  static async update(req: Request, res: Response) {
    const id = String(req.params.id);
    const { nome, descricao, preco, destaque, ativo, categoriaId } = req.body;
    const arquivo = req.file;
    const produto = await Produto.findByPk(id);

    if (!produto) {
      if (arquivo) removerArquivoImagem(arquivo.filename);
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    if (!nome || nome.trim() === "") {
      if (arquivo) removerArquivoImagem(arquivo.filename);
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    if (!descricao || descricao.trim() === "") {
      if (arquivo) removerArquivoImagem(arquivo.filename);
      return res.status(400).json({ message: "Descrição é obrigatória" });
    }

    const precoNumero = Number(preco);
    if (!precoNumero || precoNumero <= 0) {
      if (arquivo) removerArquivoImagem(arquivo.filename);
      return res.status(400).json({ message: "Preço inválido" });
    }

    const imagemAntiga = produto.imagem;
    const novaImagem = arquivo ? arquivo.filename : produto.imagem;

    await produto.update({
      nome,
      descricao,
      preco: precoNumero,
      imagem: novaImagem,
      destaque: destaque === "true" || destaque === true,
      ativo: ativo === "true" || ativo === true,
      categoriaId,
    });

    if (arquivo && imagemAntiga) {
      removerArquivoImagem(imagemAntiga);
    }

    await invalidarCache("produtos:");

    return res.status(200).json(produto);
  }

  static async remove(req: Request, res: Response) {
    const id = String(req.params.id);
    const produto = await Produto.findByPk(id);

    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    removerArquivoImagem(produto.imagem);
    await produto.destroy();

    await invalidarCache("produtos:");

    return res.status(204).send();
  }
}

export default ProdutoController;