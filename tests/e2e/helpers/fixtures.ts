import { test as base, expect, Page } from '@playwright/test';
import { ApiE2E, Recurso } from './api';
import { ADMIN_EMAIL, ADMIN_SENHA } from './dados';

// Ordem de remoção: primeiro o que depende dos outros.
// Pedido aponta para usuário e produto; produto aponta para categoria.
const ORDEM_REMOCAO: Recurso[] = ['avaliacoes', 'pedidos', 'produtos', 'categorias', 'usuarios'];

/**
 * Tudo que um teste cria é registrado aqui e removido no final do teste,
 * mesmo se o teste falhar no meio. Assim o banco não acumula lixo.
 */
export class Limpeza {
  private registros = new Map<Recurso, Set<string>>();

  registrar(recurso: Recurso, id: string): string {
    if (!this.registros.has(recurso)) this.registros.set(recurso, new Set());
    this.registros.get(recurso)!.add(id);
    return id;
  }

  /**
   * Para itens criados PELA TELA: espera a resposta do POST que a tela faz e registra o id criado.
   * Chamar ANTES do clique que cria:
   *   const criado = limpeza.aguardarCriacao(page, 'categorias');
   *   await page.click('button:has-text("Criar categoria")');
   *   await criado;
   */
  async aguardarCriacao(page: Page, recurso: Recurso): Promise<string> {
    const caminho = `/api/${recurso}`;
    const resposta = await page.waitForResponse(
      (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === caminho && r.status() === 201
    );
    const corpo = await resposta.json();
    return this.registrar(recurso, corpo.id);
  }

  async executar(api: ApiE2E): Promise<void> {
    for (const recurso of ORDEM_REMOCAO) {
      for (const id of this.registros.get(recurso) ?? []) {
        await api.remover(recurso, id);
      }
    }
    this.registros.clear();
  }
}

type Fixtures = {
  api: ApiE2E;
  limpeza: Limpeza;
};

export const test = base.extend<Fixtures>({
  api: async ({ request }, use) => {
    await use(new ApiE2E(request));
  },
  // Roda o teste e, depois dele (passando ou falhando), remove o que foi registrado.
  limpeza: async ({ api }, use) => {
    const limpeza = new Limpeza();
    await use(limpeza);
    await limpeza.executar(api);
  },
});

export { expect };

export async function loginComoAdmin(page: Page): Promise<void> {
  await page.goto('/adm/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#senha', ADMIN_SENHA);
  await page.click('button:has-text("Entrar como Administrador")');
  await expect(page).toHaveURL('/');
  await page.waitForFunction(() => localStorage.getItem('token') !== null);
}

export async function loginComoCliente(page: Page, email: string, senha: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#senha', senha);
  await page.click('button:has-text("Entrar")');
  await expect(page).toHaveURL('/');
  await page.waitForFunction(() => localStorage.getItem('token') !== null);
}
