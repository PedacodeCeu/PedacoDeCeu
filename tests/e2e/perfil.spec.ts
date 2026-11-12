import { test, expect, loginComoCliente } from './helpers/fixtures';

test('editar nome sem preencher senha mantém a senha atual', async ({ page, api, limpeza }) => {
  const cliente = await api.criarUsuario();
  limpeza.registrar('usuarios', cliente.id);

  await loginComoCliente(page, cliente.email, cliente.senha);
  await page.goto('/perfil');

  await page.fill('#nome', 'E2E Nome Alterado');
  await page.click('button:has-text("Salvar alterações")');

  await expect(page.locator('text=Perfil atualizado com sucesso!')).toBeVisible();

  // A senha antiga continua valendo
  await expect(api.login(cliente.email, cliente.senha)).resolves.toBeTruthy();
});

test('trocar a senha pelo perfil permite login com a senha nova', async ({ page, api, limpeza }) => {
  const cliente = await api.criarUsuario();
  limpeza.registrar('usuarios', cliente.id);
  const novaSenha = 'NovaSenha@456';

  await loginComoCliente(page, cliente.email, cliente.senha);
  await page.goto('/perfil');

  await page.fill('#senha', novaSenha);
  await page.fill('#confirmarSenha', novaSenha);
  await page.click('button:has-text("Salvar alterações")');

  await expect(page.locator('text=Perfil atualizado com sucesso!')).toBeVisible();
  await expect(api.login(cliente.email, novaSenha)).resolves.toBeTruthy();
  await expect(api.login(cliente.email, cliente.senha)).rejects.toThrow();
});

test('usar o CPF de outro usuário no perfil exibe erro', async ({ page, api, limpeza }) => {
  const outro = await api.criarUsuario();
  limpeza.registrar('usuarios', outro.id);
  const cliente = await api.criarUsuario();
  limpeza.registrar('usuarios', cliente.id);

  await loginComoCliente(page, cliente.email, cliente.senha);
  await page.goto('/perfil');

  await page.fill('#cpf', outro.cpf);
  await page.click('button:has-text("Salvar alterações")');

  await expect(page.locator('text=CPF já cadastrado')).toBeVisible();
});
