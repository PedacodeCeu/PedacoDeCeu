import { test, expect, loginComoAdmin } from './helpers/fixtures';
import { nomeTeste } from './helpers/dados';

// Cada teste cria a própria categoria pela API. Antes, os testes escolhiam
// "a primeira categoria da lista" e quebravam com o banco sem categorias.

test('listar produtos exibe a tabela', async ({ page }) => {
  await loginComoAdmin(page);
  await page.goto('/admin/produtos');

  await expect(page.locator('table.tabela')).toBeVisible();
  await expect(page.locator('h2:has-text("Produtos")')).toBeVisible();
});

test('criar produto com dados válidos e retornar para a lista', async ({ page, api, limpeza }) => {
  const categoria = await api.criarCategoria();
  limpeza.registrar('categorias', categoria.id);

  await loginComoAdmin(page);
  await page.goto('/admin/produtos/novo');

  const nomeProduto = nomeTeste('Bolo');
  await page.fill('#nome', nomeProduto);
  await page.fill('#descricao', 'Descrição de teste do Playwright');
  await page.fill('#preco', '29.90');
  await page.selectOption('#categoria', { label: categoria.nome });

  const criado = limpeza.aguardarCriacao(page, 'produtos');
  await page.click('button:has-text("Criar produto")');
  await criado;

  await expect(page).toHaveURL('/admin/produtos');
  await expect(page.locator('table.tabela')).toContainText(nomeProduto);
});

test('criar produto sem preencher campos exibe erros de validação', async ({ page }) => {
  await loginComoAdmin(page);
  await page.goto('/admin/produtos/novo');

  await page.click('button:has-text("Criar produto")');

  await expect(page.locator('text=Nome é obrigatório')).toBeVisible();
  await expect(page.locator('text=Descrição é obrigatória')).toBeVisible();
  await expect(page.locator('text=Preço é obrigatório')).toBeVisible();
  await expect(page.locator('text=Categoria é obrigatória')).toBeVisible();
  await expect(page).toHaveURL('/admin/produtos/novo');
});

test('criar produto com preço inválido exibe erro de validação', async ({ page, api, limpeza }) => {
  const categoria = await api.criarCategoria();
  limpeza.registrar('categorias', categoria.id);

  await loginComoAdmin(page);
  await page.goto('/admin/produtos/novo');

  await page.fill('#nome', nomeTeste('Produto Inválido'));
  await page.fill('#descricao', 'Descrição');
  await page.fill('#preco', '-10');
  await page.selectOption('#categoria', { label: categoria.nome });

  await page.click('button:has-text("Criar produto")');

  await expect(page.locator('text=Preço inválido')).toBeVisible();
  await expect(page).toHaveURL('/admin/produtos/novo');
});

test('editar produto altera o nome e retorna para a lista', async ({ page, api, limpeza }) => {
  // Antes este teste editava o PRIMEIRO produto da lista, ou seja, renomeava um produto real.
  // Agora ele cria o próprio produto e edita só ele.
  const categoria = await api.criarCategoria();
  limpeza.registrar('categorias', categoria.id);
  const produto = await api.criarProduto(categoria.id);
  limpeza.registrar('produtos', produto.id);

  await loginComoAdmin(page);
  await page.goto('/admin/produtos');

  const linha = page.locator('table.tabela tr', { hasText: produto.nome });
  await expect(linha).toBeVisible();
  await linha.locator('button.btn-sm--editar').click();

  await expect(page).toHaveURL(/\/admin\/produtos\/editar\//);
  await expect(page.locator('#nome')).toHaveValue(produto.nome);

  const nomeAtualizado = nomeTeste('Produto Editado');
  await page.fill('#nome', nomeAtualizado);
  await page.click('button:has-text("Salvar alterações")');

  await expect(page).toHaveURL('/admin/produtos');
  await expect(page.locator('table.tabela')).toContainText(nomeAtualizado);
});

test('excluir produto remove da lista', async ({ page, api, limpeza }) => {
  const categoria = await api.criarCategoria();
  limpeza.registrar('categorias', categoria.id);
  const produto = await api.criarProduto(categoria.id);
  limpeza.registrar('produtos', produto.id);

  await loginComoAdmin(page);
  await page.goto('/admin/produtos');

  const linha = page.locator('table.tabela tr', { hasText: produto.nome });
  await expect(linha).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await linha.locator('button.btn-sm--deletar').click();

  await expect(page.locator('table.tabela tr', { hasText: produto.nome })).toHaveCount(0);
});
