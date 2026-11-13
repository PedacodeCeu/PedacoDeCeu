import { test, expect, loginComoAdmin } from './helpers/fixtures';
import { nomeTeste } from './helpers/dados';

test('listar categorias exibe a tabela', async ({ page }) => {
  await loginComoAdmin(page);
  await page.goto('/admin/categorias');
  await page.waitForURL('/admin/categorias');
  await expect(page.locator('.pagina-crud__topo h2', { hasText: 'Categorias' })).toBeVisible();
  await expect(page.locator('table.tabela')).toBeVisible();
});

test('criar categoria com nome válido e retornar para a lista', async ({ page, limpeza }) => {
  await loginComoAdmin(page);
  await page.goto('/admin/categorias/nova');

  const nomeCategoria = nomeTeste('Categoria');
  await page.fill('#nome', nomeCategoria);

  const criada = limpeza.aguardarCriacao(page, 'categorias');
  await page.click('button:has-text("Criar categoria")');
  await criada;

  await expect(page).toHaveURL('/admin/categorias');
  await expect(page.locator('table.tabela')).toContainText(nomeCategoria);
});

test('criar categoria sem nome exibe erro de validação', async ({ page }) => {
  await loginComoAdmin(page);
  await page.goto('/admin/categorias/nova');

  await page.click('button:has-text("Criar categoria")');

  await expect(page.locator('text=Nome é obrigatório')).toBeVisible();
  await expect(page).toHaveURL('/admin/categorias/nova');
});

test('criar categoria com nome só de espaços exibe erro de validação', async ({ page }) => {
  await loginComoAdmin(page);
  await page.goto('/admin/categorias/nova');

  await page.fill('#nome', '   ');
  await page.click('button:has-text("Criar categoria")');

  await expect(page.locator('text=Nome é obrigatório')).toBeVisible();
  await expect(page).toHaveURL('/admin/categorias/nova');
});

test('editar categoria altera o nome e retorna para a lista', async ({ page, api, limpeza }) => {
  // Preparação pela API: o foco do teste é a edição, não a criação
  const categoria = await api.criarCategoria();
  limpeza.registrar('categorias', categoria.id);

  await loginComoAdmin(page);
  await page.goto('/admin/categorias');

  // Só dentro da tabela: a barra lateral também lista as categorias
  const linha = page.locator('table.tabela tr', { hasText: categoria.nome });
  await expect(linha).toBeVisible();
  await linha.locator('button.btn-sm--editar').click();

  await expect(page).toHaveURL(/\/admin\/categorias\/editar\//);
  await expect(page.locator('#nome')).toHaveValue(categoria.nome);

  const nomeAtualizado = nomeTeste('Categoria Editada');
  await page.fill('#nome', nomeAtualizado);
  await page.click('button:has-text("Salvar alterações")');

  await expect(page).toHaveURL('/admin/categorias');
  await expect(page.locator('table.tabela')).toContainText(nomeAtualizado);
});

test('excluir categoria remove da lista', async ({ page, api, limpeza }) => {
  const categoria = await api.criarCategoria();
  limpeza.registrar('categorias', categoria.id); // se o teste falhar antes de excluir, a limpeza remove

  await loginComoAdmin(page);
  await page.goto('/admin/categorias');

  // Só dentro da tabela: a barra lateral também lista as categorias
  const linha = page.locator('table.tabela tr', { hasText: categoria.nome });
  await expect(linha).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await linha.locator('button.btn-sm--deletar').click();

  await expect(page.locator('table.tabela tr', { hasText: categoria.nome })).toHaveCount(0);
});
