const BASE_URL = process.env.REACT_APP_API_URL || "/api";

function getToken() {
  return localStorage.getItem("token");
}

function headersAutenticados() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function tratarResposta(res) {
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Erro inesperado");
  }
  return data;
}

// Monta a URL completa da imagem a partir do nome do arquivo salvo no servidor
export function urlDaImagem(nomeArquivo) {
  if (!nomeArquivo) return null;
  const origem = BASE_URL.replace(/\/api\/?$/, "");
  return `${origem}/uploads/produtos/${nomeArquivo}`;
}

export async function loginApi(payload) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return tratarResposta(res);
}

export async function loginAdminApi(payload) {
  const res = await fetch(`${BASE_URL}/auth/login/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return tratarResposta(res);
}

export async function cadastrarUsuario(payload) {
  const res = await fetch(`${BASE_URL}/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return tratarResposta(res);
}

export async function editarUsuario(id, payload) {
  const res = await fetch(`${BASE_URL}/usuarios/${id}`, {
    method: "PUT",
    headers: headersAutenticados(),
    body: JSON.stringify(payload),
  });
  return tratarResposta(res);
}

export async function listarCategorias(pagina = 1, limite = 100) {
  const token = getToken();
  const headers = token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };

  const res = await fetch(`${BASE_URL}/categorias?pagina=${pagina}&limite=${limite}`, {
    headers,
  });
  return tratarResposta(res);
}

export async function criarCategoria(dados) {
  const res = await fetch(`${BASE_URL}/categorias`, {
    method: "POST",
    headers: headersAutenticados(),
    body: JSON.stringify({ nome: dados.nome }),
  });
  return tratarResposta(res);
}

export async function editarCategoria(id, dados) {
  const res = await fetch(`${BASE_URL}/categorias/${id}`, {
    method: "PUT",
    headers: headersAutenticados(),
    body: JSON.stringify({ nome: dados.nome }),
  });
  return tratarResposta(res);
}

export async function deletarCategoria(id) {
  const res = await fetch(`${BASE_URL}/categorias/${id}`, {
    method: "DELETE",
    headers: headersAutenticados(),
  });
  return tratarResposta(res);
}

export async function listarProdutos(pagina = 1, limite = 10) {
  const res = await fetch(`${BASE_URL}/produtos?pagina=${pagina}&limite=${limite}`, {
    headers: headersAutenticados(),
  });
  return tratarResposta(res);
}

export async function buscarProduto(id) {
  const res = await fetch(`${BASE_URL}/produtos/${id}`, {
    headers: headersAutenticados(),
  });
  return tratarResposta(res);
}

// Monta o FormData de produto — dados.arquivoImagem deve ser um File (do input type="file"),
// ou undefined/null quando não há foto nova pra enviar.
function montarFormDataProduto(dados) {
  const form = new FormData();
  form.append("nome", dados.nome);
  form.append("descricao", dados.descricao);
  form.append("preco", String(Number(dados.preco)));
  form.append("categoriaId", dados.categoriaId);
  form.append("destaque", String(dados.destaque ?? false));
  if (dados.ativo !== undefined) form.append("ativo", String(dados.ativo));
  if (dados.arquivoImagem) form.append("imagem", dados.arquivoImagem);
  return form;
}

export async function criarProduto(dados) {
  const res = await fetch(`${BASE_URL}/produtos`, {
    method: "POST",
    // Sem "Content-Type" aqui: o navegador define o boundary do multipart sozinho.
    headers: { Authorization: `Bearer ${getToken()}` },
    body: montarFormDataProduto(dados),
  });
  return tratarResposta(res);
}

export async function editarProduto(id, dados) {
  const res = await fetch(`${BASE_URL}/produtos/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: montarFormDataProduto(dados),
  });
  return tratarResposta(res);
}

export async function deletarProduto(id) {
  const res = await fetch(`${BASE_URL}/produtos/${id}`, {
    method: "DELETE",
    headers: headersAutenticados(),
  });
  return tratarResposta(res);
}

export async function listarPedidos(pagina = 1, limite = 10) {
  const res = await fetch(`${BASE_URL}/pedidos?pagina=${pagina}&limite=${limite}`, {
    headers: headersAutenticados(),
  });
  return tratarResposta(res);
}

export async function criarPedido(dados) {
  const res = await fetch(`${BASE_URL}/pedidos`, {
    method: "POST",
    headers: headersAutenticados(),
    body: JSON.stringify({
      status: dados.status || "pendente",
      itens: dados.itens,
    }),
  });
  return tratarResposta(res);
}

export async function editarPedido(id, dados) {
  const res = await fetch(`${BASE_URL}/pedidos/${id}`, {
    method: "PUT",
    headers: headersAutenticados(),
    body: JSON.stringify({
      status: dados.status,
      itens: dados.itens,
    }),
  });
  return tratarResposta(res);
}

export async function deletarPedido(id) {
  const res = await fetch(`${BASE_URL}/pedidos/${id}`, {
    method: "DELETE",
    headers: headersAutenticados(),
  });
  return tratarResposta(res);
}

// ---------- Avaliações (microsserviço Python, roteado pelo nginx em /api/avaliacoes) ----------

export async function resumoAvaliacoes(produtoId) {
  const res = await fetch(`${BASE_URL}/avaliacoes/produto/${produtoId}/resumo`);
  return tratarResposta(res);
}

export async function listarAvaliacoes(produtoId, pagina = 1, limite = 5) {
  const res = await fetch(`${BASE_URL}/avaliacoes/produto/${produtoId}?pagina=${pagina}&limite=${limite}`);
  return tratarResposta(res);
}

export async function minhaAvaliacao(produtoId) {
  const res = await fetch(`${BASE_URL}/avaliacoes/produto/${produtoId}/minha`, {
    headers: headersAutenticados(),
  });
  return tratarResposta(res);
}

export async function criarAvaliacao(dados) {
  const res = await fetch(`${BASE_URL}/avaliacoes`, {
    method: "POST",
    headers: headersAutenticados(),
    body: JSON.stringify({ produtoId: dados.produtoId, nota: dados.nota, comentario: dados.comentario }),
  });
  return tratarResposta(res);
}

export async function editarAvaliacao(id, dados) {
  const res = await fetch(`${BASE_URL}/avaliacoes/${id}`, {
    method: "PUT",
    headers: headersAutenticados(),
    body: JSON.stringify({ nota: dados.nota, comentario: dados.comentario }),
  });
  return tratarResposta(res);
}

export async function removerAvaliacao(id) {
  const res = await fetch(`${BASE_URL}/avaliacoes/${id}`, {
    method: "DELETE",
    headers: headersAutenticados(),
  });
  return tratarResposta(res);
}
