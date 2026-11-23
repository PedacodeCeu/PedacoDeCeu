# Pedaço de Céu

Catálogo web fictício desenvolvido como projeto de portfólio. A aplicação permite visualizar e gerenciar produtos em um ambiente fullstack containerizado.

**Stack:** React · Node.js · MySQL · Redis · Python (FastAPI) · PostgreSQL · Nginx · Docker · Playwright · TypeScript

## Documentação

A documentação de arquitetura está em [`docs/`](docs/):

- [Diagramas C4 (Contexto e Containers)](docs/c4.md)
- [Decisões de arquitetura (ADRs)](docs/adr/)
- [Quality Scenarios](docs/quality-scenarios.md)
- [DDD: Context Map, Bounded Contexts e Aggregates](docs/ddd.md)
- [SLOs e SLIs](docs/slos-slis.md)
- [Estratégias de resiliência](docs/resiliencia.md)
- [Plano de observabilidade](docs/observabilidade.md)
- [Estratégia de deploy](docs/estrategia-de-deploy.md)
- [Runbook de incidentes](docs/runbook.md)
- [Análise Cynefin](docs/cynefin.md)
- [API do back-end (OpenAPI)](docs/openapi.yaml)

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

---

## Versionamento

O projeto segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/): cada versão tem o formato `MAJOR.MINOR.PATCH` (por exemplo, `1.4.1`).

| Parte | Quando aumenta | Exemplo |
|---|---|---|
| **MAJOR** | Mudança que quebra compatibilidade (uma rota da API que muda de formato ou deixa de existir) | `1.4.1` → `2.0.0` |
| **MINOR** | Funcionalidade nova, sem quebrar o que já existe | `1.4.1` → `1.5.0` |
| **PATCH** | Correção de bug, sem funcionalidade nova | `1.4.1` → `1.4.2` |

Ao aumentar uma parte, as da direita voltam a zero.

### Como o número é escolhido

Os commits seguem o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (verificado pelo commitlint), e o tipo dos commits desde a última versão define a próxima:

- algum `feat!:` ou `BREAKING CHANGE` → MAJOR
- algum `feat:` → MINOR
- só `fix:` → PATCH
- só `ci:`, `docs:`, `test:`, `refactor:` ou `chore:` → não gera versão; entra na próxima

### Quando uma versão é criada

Não a cada PR: uma versão marca uma **entrega parcial** (uma funcionalidade concluída, uma etapa apresentada ou uma leva de correções). Ela é criada na `main`, depois do merge, como uma tag (`vX.Y.Z`) acompanhada de uma [Release](https://github.com/PedacodeCeu/PedacoDeCeu/releases) no GitHub com o resumo do que mudou.