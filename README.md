# Pedaço de Céu

Catálogo web fictício desenvolvido como projeto de portfólio. A aplicação permite visualizar e gerenciar produtos em um ambiente fullstack containerizado.

**Stack:** React · Node.js · MySQL · Redis · Python (FastAPI) · PostgreSQL · Nginx · Docker · Playwright · TypeScript

---

## Como rodar localmente

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
- [mkcert](https://github.com/FiloSottile/mkcert) instalado
- Adicionar `pedacodeceu.local` ao arquivo `C:\Windows\System32\drivers\etc\hosts`:

127.0.0.1 pedacodeceu.local

### Certificado SSL

```bash
mkcert pedacodeceu.local
```

Mova os arquivos gerados para a pasta `nginx/certs/`.

### Variáveis de ambiente

São três arquivos `.env`, cada um com um `.env.example` ao lado:

| Arquivo | Usado por |
|---|---|
| `.env` | MySQL |
| `PedacodeCeu-Back/.env` | Back em Node |
| `PedacodeCeu-Avaliacoes/.env` | Serviço de avaliações e o PostgreSQL dele |

```bash
cp .env.example .env
cp PedacodeCeu-Back/.env.example PedacodeCeu-Back/.env
cp PedacodeCeu-Avaliacoes/.env.example PedacodeCeu-Avaliacoes/.env
```

Valores que precisam ser iguais entre os arquivos:

- `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` (raiz) = `DB_NAME`, `DB_USER`, `DB_PASS` (back)
- `JWT_SECRET` (back) = `JWT_SECRET` (avaliações)
- `INTERNAL_TOKEN` (back) = `INTERNAL_TOKEN` (avaliações)

### Subir a aplicação

```bash
docker compose up --build
```

Acesse: [https://pedacodeceu.local](https://pedacodeceu.local)

### Endereços úteis

| O quê | Onde |
|---|---|
| Site | https://pedacodeceu.local |
| Swagger do serviço de avaliações | https://pedacodeceu.local/api/avaliacoes/docs |
| MySQL (DBeaver) | `localhost:3307` |
| PostgreSQL das avaliações (DBeaver) | `localhost:5433` |

---

## Serviço de avaliações (microsserviço)

Clientes avaliam (nota de 1 a 5 e comentário) produtos de pedidos que já foram **entregues**.
Fica em `PedacodeCeu-Avaliacoes/`, em Python com FastAPI, e tem banco próprio (PostgreSQL).

Como o serviço sabe quem pode avaliar:

1. Quando um pedido passa para `entregue`, o back publica o evento `pedido.entregue` no Redis Pub/Sub.
2. O serviço de avaliações assina esse canal e grava a compra na tabela `compras_verificadas`, no banco dele.
3. Ao avaliar, ele consulta só o próprio banco.
4. Se o evento tiver se perdido (o Pub/Sub não guarda mensagens), o serviço pergunta ao back pela rota interna
   `/internal/compras`, com timeout, retry e circuit breaker.

Para ver os eventos circulando:

```bash
docker compose logs -f backend avaliacoes
```

Testes do serviço (não precisam de Docker):

```bash
cd PedacodeCeu-Avaliacoes
pip install -r requirements-dev.txt
pytest
```

---

### Rodar os testes

```bash
npx playwright test
```

> Os testes E2E requerem a aplicação rodando (`docker compose up -d`).

Antes da primeira execução, crie o usuário admin dos testes: cadastre pelo site
`admin@testepedacodoceu.com` com a senha `Admin@123` e mude o `role` dele para `admin` no banco.

Os testes não deixam lixo no banco:

- tudo o que um teste cria (usuário, categoria, produto, pedido, avaliação) é removido no fim do próprio teste, mesmo se ele falhar;
- antes de começar, o `tests/e2e/global-setup.ts` remove sobras de execuções interrompidas (nomes começando com `E2E ` e e-mails `@playwright.com`);
- CPF, e-mails e nomes são gerados a cada execução (`tests/e2e/helpers/dados.ts`), então os testes podem rodar quantas vezes quiser.
