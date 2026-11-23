# Estratégias de Resiliência

Estratégias **já implementadas** no código, que mantêm o sistema funcionando (mesmo que parcialmente) quando uma parte falha.

| # | Estratégia | Onde | Como funciona |
|---|---|---|---|
| 1 | **Timeout** | Avaliações → back (`clients/pedidos_client.py`) | Nenhuma chamada HTTP ao back espera mais que **2 s** (`HTTP_TIMEOUT`) |
| 2 | **Retry com backoff exponencial** | Avaliações → back | Até **3 tentativas** (`HTTP_TENTATIVAS`), com espera crescente (0,2 s, depois 0,4 s). Só repete falhas temporárias (rede, timeout, HTTP 5xx); erros 4xx não são repetidos |
| 3 | **Circuit breaker** | Avaliações → back (`clients/circuit_breaker.py`) | Após **3 falhas seguidas** (`CB_LIMITE_FALHAS`), o circuito **abre** e recusa chamadas na hora por **30 s** (`CB_TEMPO_RESET`). Depois, fica **meio-aberto** e libera uma chamada de teste: se der certo, fecha; se falhar, abre de novo |
| 4 | **Fallback (reserva)** | Verificação de compra | Se o evento `pedido.entregue` se perdeu, o serviço consulta o back por HTTP (com 1, 2 e 3). A compra encontrada é gravada localmente, e a próxima consulta nem precisa do back |
| 5 | **Degradação controlada do cache** | Back (`infra/cache.ts`) e avaliações (`services/cache.py`) | Se o Redis falhar, a leitura do cache devolve "sem cache" e o sistema segue direto pelo banco. O erro é só registrado em log, nunca repassado ao usuário |
| 6 | **Reconexão automática do assinante** | Avaliações (`events/assinante.py`) | Se a conexão com o Redis cair, o assinante tenta de novo com espera crescente (1 s, 2 s, 4 s... até 30 s) |
| 7 | **Processamento idempotente de eventos** | Avaliações | A tabela `compras_verificadas` usa (`usuario_id`, `produto_id`) como chave: receber o mesmo evento duas vezes não duplica dados |
| 8 | **Isolamento de falhas no consumidor** | Avaliações | Um evento com erro é registrado em log e descartado, sem derrubar o assinante |
| 9 | **Health check com estado degradado** | Avaliações (`/avaliacoes/health`) | Retorna `ok`, `degradado` (Redis fora, mas banco OK: continua no ar) ou `fora` (banco fora: HTTP 503) |
| 10 | **Healthchecks e ordem de inicialização** | `docker-compose.yml` | MySQL, Postgres, Redis e avaliações têm healthcheck. Os serviços só sobem depois que as dependências estão saudáveis (`depends_on: condition: service_healthy`) |
| 11 | **Reinício automático** | `docker-compose.yml` | `restart: always` nos bancos, no Redis, no back e no serviço de avaliações |
| 12 | **Transações** | Back (`services/pedido.service.ts`) | Pedido e itens são gravados juntos; uma falha no meio desfaz tudo. Eventos só são publicados depois do commit |

## Como foi validado

O arquivo `PedacodeCeu-Avaliacoes/tests/test_resiliencia.py` testa o retry, o circuit breaker (abrir, recusar e meio-abrir) e o fallback com o back simulado fora do ar. Esses testes rodam a cada pull request no CI.

## Limitações conhecidas

- O back Node não tem rota de saúde nem healthcheck no compose; o front e o Nginx não têm `restart: always`.
- Os eventos do Redis Pub/Sub não são guardados: a perda é compensada pelo fallback (item 4), não evitada.
- Tudo roda numa única máquina: se ela cair, o sistema inteiro cai (ver o [runbook](runbook.md)).
