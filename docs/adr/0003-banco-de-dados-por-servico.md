# ADR 0003: Banco de dados por serviço (MySQL no monólito, PostgreSQL nas avaliações)

**Status:** aceita

## Contexto

O monólito já usa MySQL (via Sequelize) para usuários, categorias, produtos e pedidos. O novo serviço de avaliações precisa guardar avaliações e saber quais clientes compraram quais produtos. Era preciso decidir se ele usaria o mesmo banco ou um próprio, e qual tecnologia.

## Opções consideradas

1. **Banco compartilhado:** o serviço de avaliações lê direto as tabelas de pedidos do MySQL. Simples, mas acopla os dois serviços pelo esquema do banco: qualquer mudança numa tabela pode quebrar o outro serviço, e um banco fora do ar derruba os dois.
2. **Banco próprio, não relacional (MongoDB):** flexível, mas os dados são pequenos e estruturados, e as regras (uma avaliação por cliente e produto, nota de 1 a 5) se expressam melhor como restrições relacionais.
3. **Banco próprio, relacional (PostgreSQL).**

## Decisão

**Cada serviço tem o seu banco** (padrão *database per service*):

- **Monólito: MySQL 8.** Os dados de pedidos são fortemente relacionais (pedido, itens, produto, usuário, com chaves estrangeiras) e precisam de transações: pedido e itens são gravados juntos ou não são gravados.
- **Avaliações: PostgreSQL 16.** Relacional, com restrições declaradas no próprio banco: `UNIQUE (usuario_id, produto_id)` impede avaliar o mesmo produto duas vezes, e `CHECK (nota BETWEEN 1 AND 5)` impede notas inválidas. Tem driver assíncrono maduro (asyncpg), que combina com o FastAPI.

O serviço de avaliações não lê o banco do monólito. Ele mantém a sua própria cópia das compras (`compras_verificadas`), alimentada pelo evento `pedido.entregue` (ver [ADR 0004](0004-comunicacao-por-eventos-redis-pubsub.md)).

## Consequências

- **Positivas:** os serviços evoluem os esquemas de forma independente; uma falha no MySQL não impede ler e escrever avaliações; cada banco foi escolhido pelo que o seu serviço precisa.
- **Negativas:** dados duplicados (as compras existem nos dois bancos) e consistência eventual (por alguns instantes, uma entrega pode existir no MySQL e ainda não nas avaliações); duas tecnologias de banco para operar e fazer backup.
