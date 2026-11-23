# Plano de Observabilidade

Objetivo: conseguir responder rapidamente **"o sistema está funcionando?"** e, quando não estiver, **"onde está o problema?"**.

## 1. Logs (já implementados)

Todos os serviços escrevem logs na saída padrão, lidos com `docker compose logs`.

| Prefixo / origem | Exemplo do que registra | Para que serve |
|---|---|---|
| `[http]` (back) | `INFO a1b2c3d4 GET /produtos 200 12.3ms` | Cada requisição: id, método, rota, status, duração e nível (INFO, WARN para 4xx, ERROR para 5xx) |
| `[erro]` (back) | `[erro] a1b2c3d4 409 valor duplicado` | Erros tratados, com o mesmo id da requisição |
| `[cache]` (back) e `avaliacoes.cache` | `HIT`, `MISS`, `INVALIDADO produtos:* (4 chaves)` | Comprovar o cache-aside e a invalidação |
| `[pubsub]` (back) | `PUBLICADO pedido.entregue id=... (1 assinante(s))` | Saída de eventos |
| `avaliacoes.eventos` | `RECEBIDO pedido.entregue id=... novos_registros=2` | Chegada de eventos (mesmo id do `PUBLICADO`) |
| `avaliacoes.http` | Cada requisição ao serviço de avaliações: método, rota, status e duração | Mesmo papel do `[http]` no back |
| `avaliacoes.circuit_breaker` | `ABERTO após 3 falha(s)`, `MEIO-ABERTO`, `FECHADO` | Mudanças de estado do circuit breaker |

O id da requisição também volta para o cliente no header `X-Request-Id`, e aparece na resposta de erro 500. Isso permite achar no log exatamente a requisição de que um usuário está reclamando.

**Comandos úteis:**

```bash
docker compose logs -f backend avaliacoes      # acompanhar os dois serviços
docker compose logs backend | grep ERROR       # só erros do back
docker compose logs backend | grep a1b2c3d4    # tudo de uma requisição específica
```

## 2. Métricas a coletar

| Métrica | Origem | Uso |
|---|---|---|
| Requisições por segundo, por rota | log `[http]` | Volume de uso |
| Latência (p50, p95, p99) | duração no `[http]` | SLOs 2 e 3 ([SLOs e SLIs](slos-slis.md)) |
| Taxa de erros 4xx e 5xx | status no `[http]` | SLO 1 |
| Taxa de acerto do cache | `HIT` ÷ (`HIT` + `MISS`) | SLO 6 |
| Eventos publicados × recebidos | `PUBLICADO` × `RECEBIDO` | SLO 5 |
| Estado do circuit breaker | log do circuit breaker | Detectar o back instável |
| Saúde dos containers | healthchecks e `/avaliacoes/health` | SLO 4 |
| CPU, memória e reinícios dos containers | `docker stats` / `docker compose ps` | Capacidade e estabilidade |

## 3. Alertas sugeridos

- Taxa de 5xx acima de 1% por 5 minutos.
- p95 de leitura acima de 300 ms por 10 minutos.
- `/avaliacoes/health` em `degradado` ou `fora`.
- Circuit breaker em `ABERTO`.
- Container reiniciando repetidamente.

## 4. Próximos passos

1. **Logs estruturados em JSON**, para facilitar filtrar e agregar.
2. **Propagar o `X-Request-Id`** do back para o serviço de avaliações, para seguir um fluxo de ponta a ponta nos dois serviços.
3. **Coleta automática:** expor um endpoint `/metrics` (Prometheus) e montar painéis (Grafana), ou centralizar os logs (por exemplo, Loki).
4. **Rota de saúde no back** (como a do serviço de avaliações) com healthcheck no compose.
