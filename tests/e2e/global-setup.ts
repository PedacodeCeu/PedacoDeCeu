import { request } from '@playwright/test';
import { ApiE2E } from './helpers/api';
import { DOMINIO_EMAIL, PREFIXO } from './helpers/dados';

// Roda UMA vez antes de todos os testes.
// Cada teste já limpa o que cria; isto aqui é a rede de segurança para sobras de
// execuções interrompidas (Ctrl+C, queda do Docker...) e para o lixo das versões antigas
// dos testes, que não limpavam nada.

const BASE_URL = 'https://pedacodeceu.local';

// Nomes usados pelas versões antigas dos testes (sempre terminam com Date.now(), 13 dígitos).
// "Produto Editado" fica de fora de propósito: o teste antigo renomeava um produto REAL,
// então apagar por esse nome poderia apagar um produto de verdade.
const PADROES_ANTIGOS = [
  /^Categoria Teste \d{13}$/,
  /^Editar Depois \d{13}$/,
  /^Categoria Editada \d{13}$/,
  /^Deletar Cat \d{13}$/,
  /^Bolo Teste \d{13}$/,
  /^Deletar \d{13}$/,
];

function ehDeTeste(nome: string): boolean {
  return nome.startsWith(`${PREFIXO} `) || PADROES_ANTIGOS.some((p) => p.test(nome));
}

export default async function globalSetup() {
  const contexto = await request.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
  const api = new ApiE2E(contexto);
  const removidos = { pedidos: 0, produtos: 0, categorias: 0, usuarios: 0 };

  try {
    await api.loginAdmin(); // falha cedo, com mensagem clara, se o admin de teste não existir

    const usuarios: { id: string; email: string }[] = await api.listar('/api/usuarios');
    const usuariosTeste = new Set(usuarios.filter((u) => u.email.endsWith(DOMINIO_EMAIL)).map((u) => u.id));

    const produtos: { id: string; nome: string }[] = (await api.listar('/api/produtos?limite=1000')).dados;
    const produtosTeste = new Set(produtos.filter((p) => ehDeTeste(p.nome)).map((p) => p.id));

    // Pedidos de usuários de teste ou com produtos de teste saem primeiro (chaves estrangeiras)
    const pedidos: { id: string; usuarioId: string; itens?: { produtoId: string }[] }[] =
      (await api.listar('/api/pedidos?limite=1000')).dados;
    for (const pedido of pedidos) {
      const temProdutoTeste = (pedido.itens ?? []).some((i) => produtosTeste.has(i.produtoId));
      if (usuariosTeste.has(pedido.usuarioId) || temProdutoTeste) {
        if (await api.remover('pedidos', pedido.id)) removidos.pedidos++;
      }
    }

    for (const id of produtosTeste) if (await api.remover('produtos', id)) removidos.produtos++;

    const categorias: { id: string; nome: string }[] = (await api.listar('/api/categorias?limite=1000')).dados;
    for (const c of categorias.filter((c) => ehDeTeste(c.nome))) {
      if (await api.remover('categorias', c.id)) removidos.categorias++;
    }

    for (const id of usuariosTeste) if (await api.remover('usuarios', id)) removidos.usuarios++;

    const total = Object.values(removidos).reduce((a, b) => a + b, 0);
    if (total > 0) {
      console.log(
        `[global-setup] Sobras de testes anteriores removidas: ` +
          `${removidos.pedidos} pedidos, ${removidos.produtos} produtos, ` +
          `${removidos.categorias} categorias, ${removidos.usuarios} usuários`
      );
    }
  } finally {
    await contexto.dispose();
  }
}
