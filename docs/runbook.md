# Runbook de Incidentes

Guia rápido do que fazer quando o sistema apresenta problemas. Os comandos devem ser executados na raiz do projeto.

## Primeiros passos (qualquer incidente)

1. **Ver o estado dos containers:**
   ```bash
   docker compose ps
   ```
   Procure containers com status `Exited`, `Restarting` ou `unhealthy`.
2. **Ver os logs recentes do serviço suspeito:**
   ```bash
   docker compose logs --tail=100 <serviço>     # nginx, frontend, backend, avaliacoes, database, avaliacoes-db, redis
   ```
3. **Checar a saúde do serviço de avaliações:** `https://pedacodeceu.local/api/avaliacoes/health`.
4. **Houve deploy recente?** Se o problema começou logo depois de uma versão nova, considere o **rollback** (ver [estratégia de deploy](estrategia-de-deploy.md)) antes de investigar.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| **Site não abre** (conexão recusada) | `nginx-proxy` parado | `docker compose up -d nginx`. Se não subir, verificar os certificados em `nginx/certs/` e a sintaxe com `docker compose exec nginx nginx -t` |
| **Site abre, mas a API dá 502 Bad Gateway** | `pedaco-back` parado ou reiniciando | `docker compose logs backend`; procurar erro de conexão com MySQL/Redis ou variável de ambiente faltando. Depois, `docker compose restart backend` |
| **Erros 500 em várias telas** | Falha no back ou no banco | Pegar o `requestId` da resposta de erro e buscar: `docker compose logs backend \| grep <requestId>` |
| **Login e listagens falham, back reclama de banco** | `mysql-db` fora | `docker compose ps database`; `docker compose logs database`; `docker compose restart database`. O back espera o healthcheck do banco |
| **Sistema lento, logs com "erro ao ler" do cache** | Redis fora | O sistema segue funcionando pelo banco (mais lento). `docker compose restart redis`; o assinante de eventos reconecta sozinho |
| **`/avaliacoes/health` diz `degradado`** | Redis fora | Mesmo procedimento da linha anterior |
| **`/avaliacoes/health` diz `fora` (503)** | `avaliacoes-db` (Postgres) fora | `docker compose logs avaliacoes-db`; `docker compose restart avaliacoes-db avaliacoes` |
| **Cliente recebeu o pedido, mas não consegue avaliar** | Evento `pedido.entregue` perdido **e** back inacessível (circuit breaker aberto) | Ver no log das avaliações se há `ABERTO`. Resolver o back; após 30 s o circuito testa de novo. Conferir se o evento saiu: `docker compose logs backend \| grep pedido.entregue` |
| **Container reinicia sem parar** | Erro na inicialização (código ou configuração) | `docker compose logs <serviço>` mostra o erro. Se foi um deploy, fazer rollback |
| **Disco cheio / Docker sem espaço** | Imagens e builds antigos acumulados | `docker system df` para ver o uso; `docker image prune` remove imagens sem uso (não apaga os volumes dos bancos) |

## Depois de resolver

1. Confirmar: `docker compose ps` todo saudável, site navegável, login e uma listagem funcionando.
2. **Registrar um Bug no Jira** com: o que aconteceu, quando, causa, como foi resolvido e o que evitaria a repetição.
3. Se a correção exigiu mudança de código, ela segue o fluxo normal: branch, pull request, CI verde e merge.

## Atenção

- **Nunca** use `docker compose down -v` em produção: o `-v` apaga os volumes, ou seja, **todos os dados dos bancos**.
- Os segredos (`.env`) não estão no repositório. Ao recriar o ambiente do zero, siga a seção "Variáveis de ambiente" do README.
