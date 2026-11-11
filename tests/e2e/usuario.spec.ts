import { test, expect, loginComoCliente } from './helpers/fixtures';
import { SENHA_PADRAO, gerarCPF, gerarEmail } from './helpers/dados';

test('cadastro com dados válidos exibe confirmação', async ({ page, limpeza }) => {
  await page.goto('/cadastro');

  await page.fill('#nome', 'E2E Usuário Playwright');
  await page.fill('#email', gerarEmail('cadastro'));
  await page.fill('#cpf', gerarCPF());
  await page.fill('#senha', SENHA_PADRAO);
  await page.fill('#confirmarSenha', SENHA_PADRAO);

  const criado = limpeza.aguardarCriacao(page, 'usuarios');
  await page.click('button[type="submit"]');
  await criado;

  await expect(page.locator('text=Cadastro realizado!')).toBeVisible();
});

test('cadastro seguido de login com a conta nova', async ({ page, limpeza }) => {
  const email = gerarEmail('login');

  await page.goto('/cadastro');
  await page.fill('#nome', 'E2E Cliente Novo');
  await page.fill('#email', email);
  await page.fill('#cpf', gerarCPF());
  await page.fill('#senha', SENHA_PADRAO);
  await page.fill('#confirmarSenha', SENHA_PADRAO);

  const criado = limpeza.aguardarCriacao(page, 'usuarios');
  await page.click('button[type="submit"]');
  await criado;

  await loginComoCliente(page, email, SENHA_PADRAO);
});

test('cadastro com CPF já cadastrado exibe erro', async ({ page, api, limpeza }) => {
  // O próprio teste cria o usuário que vai "duplicar": funciona com o banco vazio ou cheio
  const existente = await api.criarUsuario();
  limpeza.registrar('usuarios', existente.id);

  await page.goto('/cadastro');
  await page.fill('#nome', 'E2E Duplicado');
  await page.fill('#email', gerarEmail('duplicado'));
  await page.fill('#cpf', existente.cpf);
  await page.fill('#senha', SENHA_PADRAO);
  await page.fill('#confirmarSenha', SENHA_PADRAO);
  await page.click('button[type="submit"]');

  await expect(page.locator('text=CPF já cadastrado')).toBeVisible();
  await expect(page).toHaveURL('/cadastro');
});

test('cadastro com e-mail já cadastrado exibe erro', async ({ page, api, limpeza }) => {
  const existente = await api.criarUsuario();
  limpeza.registrar('usuarios', existente.id);

  await page.goto('/cadastro');
  await page.fill('#nome', 'E2E Duplicado');
  await page.fill('#email', existente.email);
  await page.fill('#cpf', gerarCPF());
  await page.fill('#senha', SENHA_PADRAO);
  await page.fill('#confirmarSenha', SENHA_PADRAO);
  await page.click('button[type="submit"]');

  await expect(page.locator('text=E-mail já cadastrado')).toBeVisible();
  await expect(page).toHaveURL('/cadastro');
});

test('cadastro com e-mail inválido exibe erro de validação', async ({ page }) => {
  await page.goto('/cadastro');

  await page.fill('#nome', 'Teste');
  await page.fill('#email', 'emailinvalido');
  await page.fill('#cpf', gerarCPF());
  await page.fill('#senha', SENHA_PADRAO);
  await page.fill('#confirmarSenha', SENHA_PADRAO);

  await page.click('button[type="submit"]');

  await expect(page.locator('text=E-mail inválido')).toBeVisible();
  await expect(page).toHaveURL('/cadastro');
});

test('cadastro com senha fraca exibe erro de validação', async ({ page }) => {
  await page.goto('/cadastro');

  await page.fill('#nome', 'Teste');
  await page.fill('#email', gerarEmail('fraco'));
  await page.fill('#cpf', gerarCPF());
  await page.fill('#senha', '12345678');
  await page.fill('#confirmarSenha', '12345678');

  await page.click('button[type="submit"]');

  await expect(
    page.locator('.erro-msg').filter({ hasText: /senha/i }).first()
  ).toBeVisible();
  await expect(page).toHaveURL('/cadastro');
});

test('cadastro com CPF inválido exibe erro de validação', async ({ page }) => {
  await page.goto('/cadastro');

  await page.fill('#nome', 'Teste');
  await page.fill('#email', gerarEmail('cpf'));
  await page.fill('#cpf', '111.111.111-11');
  await page.fill('#senha', SENHA_PADRAO);
  await page.fill('#confirmarSenha', SENHA_PADRAO);

  await page.click('button[type="submit"]');

  await expect(page.locator('text=CPF inválido')).toBeVisible();
  await expect(page).toHaveURL('/cadastro');
});

test('cadastro com senhas diferentes exibe erro de confirmação', async ({ page }) => {
  await page.goto('/cadastro');

  await page.fill('#nome', 'Teste');
  await page.fill('#email', gerarEmail('conf'));
  await page.fill('#cpf', gerarCPF());
  await page.fill('#senha', SENHA_PADRAO);
  await page.fill('#confirmarSenha', 'Diferente@456');

  await page.click('button[type="submit"]');

  await expect(page.locator('text=As senhas não coincidem')).toBeVisible();
  await expect(page).toHaveURL('/cadastro');
});
