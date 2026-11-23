# Quality Scenarios (Cenários de Qualidade)

Cada cenário descreve como o sistema deve reagir a uma situação concreta, no formato: **fonte → estímulo → ambiente → resposta esperada → medida**. As medidas são **metas** do projeto; as que já podem ser observadas indicam onde.

## Desempenho

| | Cenário 1: listagem do catálogo |
|---|---|
| **Fonte** | Cliente |
| **Estímulo** | Abre a lista de produtos ou de categorias |
| **Ambiente** | Operação normal, consulta já feita antes por outro usuário (dado em cache) |
| **Resposta** | O back responde direto do Redis, sem consultar o MySQL |
| **Medida** | p95 abaixo de 300 ms (tempo registrado no log `[http]`); log `[cache] HIT` |

| | Cenário 2: resumo de avaliações |
|---|---|
| **Fonte** | Cliente |
| **Estímulo** | Abre a página de um produto (média e total de avaliações) |
| **Ambiente** | Operação normal |
| **Resposta** | O resumo vem do cache do serviço de avaliações; só é recalculado quando uma avaliação muda |
| **Medida** | p95 abaixo de 300 ms; recálculo apenas após `INVALIDADO` |

## Disponibilidade

| | Cenário 3: Redis fora do ar |
|---|---|
| **Fonte** | Falha de infraestrutura |
| **Estímulo** | O Redis para de responder |
| **Ambiente** | Operação normal |
| **Resposta** | Os serviços continuam respondendo direto do banco (sem cache); o serviço de avaliações informa estado `degradado` no `/health`; o assinante tenta reconectar sozinho |
| **Medida** | Nenhuma requisição falha por causa do cache; reconexão automática em até 30 s após o Redis voltar |

| | Cenário 4: back Node fora do ar |
|---|---|
| **Fonte** | Falha do back |
| **Estímulo** | O serviço de avaliações precisa verificar uma compra que não está na base local |
| **Ambiente** | Back indisponível |
| **Resposta** | A consulta HTTP tenta 3 vezes com timeout; após 3 falhas seguidas, o circuit breaker abre e as próximas consultas falham na hora, sem esperar timeout |
| **Medida** | Nenhuma requisição espera mais que ~7 s; com o circuito aberto, resposta imediata; leituras de avaliações continuam funcionando |

| | Cenário 5: container cai |
|---|---|
| **Fonte** | Erro inesperado no processo |
| **Estímulo** | Um container de serviço ou banco encerra |
| **Ambiente** | Operação normal |
| **Resposta** | O Docker reinicia o container (`restart: always`); os dependentes só sobem depois do healthcheck passar |
| **Medida** | Volta automática, sem intervenção manual |

## Confiabilidade dos dados

| | Cenário 6: falha no meio de um pedido |
|---|---|
| **Fonte** | Cliente |
| **Estímulo** | Cria ou edita um pedido e ocorre um erro durante a gravação dos itens |
| **Ambiente** | Operação normal |
| **Resposta** | Pedido e itens são gravados numa transação; nada fica salvo pela metade, e o evento só é publicado depois do commit |
| **Medida** | Zero pedidos sem itens ou com total divergente |

## Segurança

| | Cenário 7: acesso a rota interna |
|---|---|
| **Fonte** | Usuário externo mal-intencionado |
| **Estímulo** | Tenta acessar `/api/internal/compras` pelo navegador |
| **Ambiente** | Operação normal |
| **Resposta** | O Nginx responde 404; mesmo dentro da rede, a rota exige `X-Internal-Token` |
| **Medida** | 100% das tentativas externas bloqueadas |

## Modificabilidade e testabilidade

| | Cenário 8: mudança no código |
|---|---|
| **Fonte** | Desenvolvedor |
| **Estímulo** | Abre um pull request para a `main` |
| **Ambiente** | Desenvolvimento |
| **Resposta** | O CI roda os testes do serviço de avaliações, o build e os testes do back e o build do front; o merge só ocorre com tudo verde |
| **Medida** | Pipeline concluído em até ~2 min; nenhuma quebra chega à `main` sem ser detectada |
