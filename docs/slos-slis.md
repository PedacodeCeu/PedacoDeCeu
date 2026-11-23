# SLOs e SLIs

- **SLI** (*Service Level Indicator*): o que se mede. Por exemplo, a porcentagem de requisições respondidas sem erro.
- **SLO** (*Service Level Objective*): a meta para essa medida. Por exemplo, 99% sem erro no mês.
- **Orçamento de erro:** o quanto se pode falhar sem quebrar o SLO (com 99%, sobra 1%).

As metas abaixo são compatíveis com um projeto acadêmico rodando numa única máquina. Num ambiente real de produção, seriam mais rígidas.

## Indicadores e metas

| # | SLI (o que medir) | Como medir hoje | SLO (meta) |
|---|---|---|---|
| 1 | **Disponibilidade da API:** % de requisições sem erro 5xx | Log `[http]` do back (nível `ERROR` para status ≥ 500) | ≥ 99% por mês |
| 2 | **Latência de leitura:** p95 do tempo de resposta dos `GET` de catálogo | Duração em ms no log `[http]` | p95 < 300 ms |
| 3 | **Latência de escrita:** p95 de criação e edição (pedidos, produtos, avaliações) | Duração em ms no log `[http]` | p95 < 800 ms |
| 4 | **Saúde do serviço de avaliações:** % das checagens de `/health` com resposta 200 | Healthcheck do Docker (a cada 10 s) | ≥ 99% por mês |
| 5 | **Entrega de eventos:** % de `pedido.entregue` publicados que foram recebidos | Comparar logs `PUBLICADO` (back) e `RECEBIDO` (avaliações) pelo id do evento | ≥ 99%; o restante é coberto pela consulta HTTP de reserva |
| 6 | **Eficiência do cache:** % de leituras atendidas pelo Redis | Contagem de `[cache] HIT` ÷ (`HIT` + `MISS`) | ≥ 70% nas listagens |

## Orçamento de erro na prática

Com um SLO de 99% de disponibilidade, o sistema pode ficar até **cerca de 7 horas por mês** fora do ar ou com erros. Se esse orçamento estiver se esgotando, a prioridade passa a ser estabilidade (correções, testes, resiliência) em vez de funcionalidades novas.

## Limitações atuais

Hoje os SLIs são obtidos **a partir dos logs**, manualmente. Não existe uma ferramenta que calcule os indicadores sozinha. O [plano de observabilidade](observabilidade.md) descreve como automatizar essa coleta.
