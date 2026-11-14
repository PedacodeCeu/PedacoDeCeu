import Categoria from "../models/Categoria";
import { NotFoundError } from "../errors/AppError";
import { CategoriaDTO } from "../dtos/categoria.dto";
import { PaginacaoDTO, paraRespostaPaginada, RespostaPaginada } from "../dtos/comum.dto";
import { invalidarCache, lerCache, salvarCache } from "../infra/cache";

const PREFIXO_CACHE = "categorias:";

async function buscarOuFalhar(id: string): Promise<Categoria> {
  const categoria = await Categoria.findByPk(id);
  if (!categoria) {
    throw new NotFoundError("Categoria não encontrada");
  }
  return categoria;
}

class CategoriaService {
  static async listar(paginacao: PaginacaoDTO): Promise<RespostaPaginada<Categoria>> {
    const chave = `${PREFIXO_CACHE}lista:${paginacao.pagina}:${paginacao.limite}`;
    const emCache = await lerCache<RespostaPaginada<Categoria>>(chave);
    if (emCache) return emCache;

    const { count, rows } = await Categoria.findAndCountAll({
      limit: paginacao.limite,
      offset: (paginacao.pagina - 1) * paginacao.limite,
      order: [["nome", "ASC"]],
    });

    const resposta = paraRespostaPaginada(rows, count, paginacao);
    await salvarCache(chave, resposta);
    return resposta;
  }

  static async buscarPorId(id: string): Promise<Categoria> {
    const chave = `${PREFIXO_CACHE}item:${id}`;
    const emCache = await lerCache<Categoria>(chave);
    if (emCache) return emCache;

    const categoria = await buscarOuFalhar(id);
    await salvarCache(chave, categoria);
    return categoria;
  }

  static async criar(dados: CategoriaDTO): Promise<Categoria> {
    const categoria = await Categoria.create({ nome: dados.nome });
    await invalidarCache(PREFIXO_CACHE);
    return categoria;
  }

  // Produtos em cache trazem a categoria embutida, então o cache de produtos também é invalidado.
  static async atualizar(id: string, dados: CategoriaDTO): Promise<Categoria> {
    const categoria = await buscarOuFalhar(id);
    await categoria.update({ nome: dados.nome });

    await invalidarCache(PREFIXO_CACHE);
    await invalidarCache("produtos:");
    return categoria;
  }

  static async remover(id: string): Promise<void> {
    const categoria = await buscarOuFalhar(id);
    await categoria.destroy();

    await invalidarCache(PREFIXO_CACHE);
    await invalidarCache("produtos:");
  }
}

export default CategoriaService;
