import { APIRequestContext, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_SENHA, SENHA_PADRAO, gerarCPF, gerarEmail, nomeTeste } from './dados';

// Chamadas diretas à API (/api/...). Usadas para PREPARAR o cenário de um teste
// (criar usuário, categoria, pedido...) e para LIMPAR no final, sem passar pela tela.
// A tela fica só para o que o teste está realmente verificando.

export type Recurso = 'avaliacoes' | 'pedidos' | 'produtos' | 'categorias' | 'usuarios';

export type UsuarioCriado = { id: string; nome: string; email: string; cpf: string; senha: string };

export class ApiE2E {
  private tokenAdmin: string | null = null;

  constructor(private readonly request: APIRequestContext) {}

  private async json(resposta: Awaited<ReturnType<APIRequestContext['get']>>, acao: string) {
    if (!resposta.ok()) {
      throw new Error(`${acao} falhou: HTTP ${resposta.status()} ${await resposta.text()}`);
    }
    return resposta.status() === 204 ? null : resposta.json();
  }

  private auth(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  async login(email: string, senha: string): Promise<string> {
    const r = await this.request.post('/api/auth/login', { data: { email, senha } });
    return (await this.json(r, `Login de ${email}`)).token;
  }

  async loginAdmin(): Promise<string> {
    if (this.tokenAdmin) return this.tokenAdmin;
    const r = await this.request.post('/api/auth/login/admin', {
      data: { email: ADMIN_EMAIL, senha: ADMIN_SENHA },
    });
    if (!r.ok()) {
      throw new Error(
        `Não foi possível logar como admin de teste (${ADMIN_EMAIL}). ` +
          `Crie esse usuário pelo site e mude o role dele para 'admin' no banco. ` +
          `Resposta: HTTP ${r.status()} ${await r.text()}`
      );
    }
    this.tokenAdmin = (await r.json()).token;
    return this.tokenAdmin!;
  }

  async criarUsuario(dados: Partial<Omit<UsuarioCriado, 'id'>> = {}): Promise<UsuarioCriado> {
    const usuario = {
      nome: dados.nome ?? nomeTeste('Cliente'),
      email: dados.email ?? gerarEmail('cliente'),
      // Só os números, igual ao que a tela de cadastro envia. Se mandar com pontos,
      // o back grava "123.456.789-09" e a checagem de CPF duplicado da tela não encontra.
      cpf: (dados.cpf ?? gerarCPF()).replace(/\D/g, ''),
      senha: dados.senha ?? SENHA_PADRAO,
    };
    const r = await this.request.post('/api/usuarios', { data: usuario });
    const criado = await this.json(r, 'Criar usuário');
    return { ...usuario, id: criado.id };
  }

  async criarCategoria(nome = nomeTeste('Categoria')): Promise<{ id: string; nome: string }> {
    const r = await this.request.post('/api/categorias', {
      headers: this.auth(await this.loginAdmin()),
      data: { nome },
    });
    return this.json(r, 'Criar categoria');
  }

  async criarProduto(categoriaId: string, nome = nomeTeste('Produto'), preco = 19.9): Promise<{ id: string; nome: string }> {
    const r = await this.request.post('/api/produtos', {
      headers: this.auth(await this.loginAdmin()),
      multipart: {
        nome,
        descricao: 'Produto criado pelos testes E2E',
        preco: String(preco),
        categoriaId,
        destaque: 'false',
      },
    });
    return this.json(r, 'Criar produto');
  }

  async criarPedido(tokenCliente: string, itens: { produtoId: string; quantidade: number }[]): Promise<{ id: string }> {
    const r = await this.request.post('/api/pedidos', {
      headers: this.auth(tokenCliente),
      data: { itens },
    });
    return this.json(r, 'Criar pedido');
  }

  async mudarStatusPedido(pedidoId: string, status: string): Promise<void> {
    const r = await this.request.put(`/api/pedidos/${pedidoId}`, {
      headers: this.auth(await this.loginAdmin()),
      data: { status },
    });
    await this.json(r, `Mudar pedido para ${status}`);
  }

  async listar(caminho: string): Promise<any> {
    const r = await this.request.get(caminho, { headers: this.auth(await this.loginAdmin()) });
    return this.json(r, `Listar ${caminho}`);
  }

  /** Remove como admin. Devolve true se removeu ou se já não existia (404). */
  async remover(recurso: Recurso, id: string): Promise<boolean> {
    const r = await this.request.delete(`/api/${recurso}/${id}`, {
      headers: this.auth(await this.loginAdmin()),
    });
    if (r.ok() || r.status() === 404) return true;
    console.warn(`[limpeza] não removeu ${recurso}/${id}: HTTP ${r.status()} ${(await r.text()).slice(0, 200)}`);
    return false;
  }
}

export { expect };
