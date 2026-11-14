import Produto from "../models/Produto";
import Categoria from "../models/Categoria";
import { NotFoundError } from "../errors/AppError";
import { AtualizarProdutoDTO, CriarProdutoDTO } from "../dtos/produto.dto";
import { PaginacaoDTO, paraRespostaPaginada, RespostaPaginada } from "../dtos/comum.dto";
import { removerImagem } from "../config/upload";
import { invalidarCache, lerCache, salvarCache } from "../infra/cache";
import { CANAIS, publicarEvento } from "../infra/eventos";

const PREFIXO_CACHE = "produtos:";
const COM_CATEGORIA = { include: [{ model: Categoria, as: "categoria" }] };

async function buscarOuFalhar(id: string): Promise<Produto> {
  const produto = await Produto.findByPk(id);
  if (!produto) {
    throw new NotFoundError("Produto não encontrado");
  }
  return produto;
}

async function garantirCategoria(categoriaId: string | undefined): Promise<void> {
  if (!categoriaId || !(await Categoria.findByPk(categoriaId))) {
    throw new NotFoundError("Categoria não encontrada");
  }
}

// O service recebe só o NOME do arquivo já salvo pelo multer, não o objeto do Express.
// Se der erro, quem apaga a imagem enviada é o middleware limparUploadEmErro.
class ProdutoService {
  static async listar(paginacao: PaginacaoDTO): Promise<RespostaPaginada<Produto>> {
    const chave = `${PREFIXO_CACHE}lista:${paginacao.pagina}:${paginacao.limite}`;
    const emCache = await lerCache<RespostaPaginada<Produto>>(chave);
    if (emCache) return emCache;

    const { count, rows } = await Produto.findAndCountAll({
      ...COM_CATEGORIA,
      limit: paginacao.limite,
      offset: (paginacao.pagina - 1) * paginacao.limite,
      order: [["nome", "ASC"]],
    });

    const resposta = paraRespostaPaginada(rows, count, paginacao);
    await salvarCache(chave, resposta);
    return resposta;
  }

  static async buscarPorId(id: string): Promise<Produto> {
    const chave = `${PREFIXO_CACHE}item:${id}`;
    const emCache = await lerCache<Produto>(chave);
    if (emCache) return emCache;

    const produto = await Produto.findByPk(id, COM_CATEGORIA);
    if (!produto) {
      throw new NotFoundError("Produto não encontrado");
    }

    await salvarCache(chave, produto);
    return produto;
  }

  static async criar(dados: CriarProdutoDTO, imagem?: string): Promise<Produto> {
    await garantirCategoria(dados.categoriaId);

    const produto = await Produto.create({
      nome: dados.nome,
      descricao: dados.descricao,
      preco: dados.preco,
      imagem: imagem ?? null,
      destaque: dados.destaque,
      categoriaId: dados.categoriaId,
    });

    await invalidarCache(PREFIXO_CACHE);
    await publicarEvento(CANAIS.PRODUTO_CRIADO, {
      produtoId: produto.id,
      nome: produto.nome,
      preco: produto.preco,
    });

    return produto;
  }

  static async atualizar(id: string, dados: AtualizarProdutoDTO, novaImagem?: string): Promise<Produto> {
    const produto = await buscarOuFalhar(id);

    // Trocar de categoria exige que a nova exista (antes isso estourava erro de chave estrangeira).
    if (dados.categoriaId && dados.categoriaId !== produto.categoriaId) {
      await garantirCategoria(dados.categoriaId);
    }

    const imagemAntiga = produto.imagem;

    await produto.update({
      nome: dados.nome,
      descricao: dados.descricao,
      preco: dados.preco,
      imagem: novaImagem ?? produto.imagem,
      destaque: dados.destaque,
      ativo: dados.ativo,
      categoriaId: dados.categoriaId,
    });

    // A imagem antiga só é apagada depois que o banco já aponta para a nova.
    if (novaImagem && imagemAntiga) {
      await removerImagem(imagemAntiga);
    }

    await invalidarCache(PREFIXO_CACHE);
    return produto;
  }

  static async remover(id: string): Promise<void> {
    const produto = await buscarOuFalhar(id);

    // Primeiro o banco, depois o arquivo. Antes a imagem era apagada primeiro: se o produto
    // estivesse em algum pedido, o destroy falhava (409) e o produto ficava sem imagem.
    await produto.destroy();
    await removerImagem(produto.imagem);

    await invalidarCache(PREFIXO_CACHE);
  }
}

export default ProdutoService;
