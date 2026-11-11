import { test, expect, loginComoCliente } from './helpers/fixtures';

// Testes do microsserviço de avaliações passando pelo site inteiro:
// front -> nginx -> back (Node) -> Redis Pub/Sub -> serviço de avaliações (Python).

test('cliente sem pedido entregue vê aviso e não vê o formulário', async ({ page, api, limpeza }) => {
  const categoria = await api.criarCategoria();
  limpeza.registrar('categorias', categoria.id);
  const produto = await api.criarProduto(categoria.id);
  limpeza.registrar('produtos', produto.id);
  const cliente = await api.criarUsuario();
  limpeza.registrar('usuarios', cliente.id);

  await loginComoCliente(page, cliente.email, cliente.senha);
  await page.goto(`/produtos/${produto.id}`);

  await expect(page.locator('h2:has-text("Avaliações")')).toBeVisible();
  await expect(page.locator('text=Este produto ainda não tem avaliações.')).toBeVisible();
  await expect(
    page.locator('text=Você só pode avaliar produtos de pedidos que já foram entregues.')
  ).toBeVisible();
  await expect(page.locator('text=Avalie este produto')).not.toBeVisible();
});

test('cliente com pedido entregue avalia o produto e a média aparece', async ({ page, api, limpeza }) => {
  // Preparação pela API: produto, cliente e um pedido entregue
  const categoria = await api.criarCategoria();
  limpeza.registrar('categorias', categoria.id);
  const produto = await api.criarProduto(categoria.id);
  limpeza.registrar('produtos', produto.id);
  const cliente = await api.criarUsuario();
  limpeza.registrar('usuarios', cliente.id);

  const tokenCliente = await api.login(cliente.email, cliente.senha);
  const pedido = await api.criarPedido(tokenCliente, [{ produtoId: produto.id, quantidade: 1 }]);
  limpeza.registrar('pedidos', pedido.id);

  // Admin marca como entregue: o back publica pedido.entregue no Redis
  await api.mudarStatusPedido(pedido.id, 'entregue');

  // Pela tela: o cliente avalia
  await loginComoCliente(page, cliente.email, cliente.senha);
  await page.goto(`/produtos/${produto.id}`);

  await expect(page.locator('text=Avalie este produto')).toBeVisible();
  await page.click('button[aria-label="4 estrelas"]');
  await page.fill('.avaliacao-textarea', 'Avaliação feita pelo teste E2E');

  const criada = limpeza.aguardarCriacao(page, 'avaliacoes');
  await page.click('button:has-text("Enviar avaliação")');
  await criada;

  await expect(page.locator('h3:has-text("Sua avaliação")')).toBeVisible();
  await expect(page.locator('.avaliacoes-media')).toHaveText('4,0');
  await expect(page.locator('.avaliacoes-total')).toHaveText('1 avaliação');
  await expect(page.locator('.avaliacoes-lista')).toContainText(cliente.nome);
  await expect(page.locator('.avaliacoes-lista')).toContainText('Avaliação feita pelo teste E2E');
});
