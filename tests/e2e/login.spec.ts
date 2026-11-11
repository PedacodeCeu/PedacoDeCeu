import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_SENHA } from './helpers/dados';

test('login com credenciais válidas redireciona para home', async ({ page }) => {
  await page.goto('/adm/login');

  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#senha', ADMIN_SENHA);
  await page.click('button:has-text("Entrar como Administrador")');

  await expect(page).toHaveURL('/');
});

test('login com senha incorreta exibe mensagem de erro', async ({ page }) => {
  await page.goto('/adm/login');

  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#senha', 'SenhaErrada@999');
  await page.click('button:has-text("Entrar como Administrador")');

  await expect(page.locator('.mensagem-erro, [class*="erro"]').first()).toBeVisible();
});

test('login com e-mail inválido exibe erro de validação no front', async ({ page }) => {
  await page.goto('/adm/login');

  await page.fill('#email', 'emailinvalido');
  await page.fill('#senha', ADMIN_SENHA);
  await page.click('button:has-text("Entrar como Administrador")');

  await expect(page.locator('text=E-mail inválido')).toBeVisible();
  await expect(page).toHaveURL('/adm/login');
});

test('login sem preencher campos exibe erros obrigatórios', async ({ page }) => {
  await page.goto('/adm/login');

  await page.click('button:has-text("Entrar como Administrador")');

  await expect(page.locator('text=E-mail é obrigatório')).toBeVisible();
  await expect(page.locator('text=Senha é obrigatória')).toBeVisible();
  await expect(page).toHaveURL('/adm/login');
});