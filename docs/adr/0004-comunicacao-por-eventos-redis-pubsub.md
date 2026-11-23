# ADR 0004: Comunicação por eventos com Redis Pub/Sub, com consulta HTTP de reserva

**Status:** aceita

## Contexto

O serviço de avaliações só deve aceitar avaliações de quem recebeu o produto, mas quem sabe disso é o monólito (pedidos com status `entregue`). Os serviços precisam conversar sem que um dependa de o outro estar no ar o tempo todo. O Redis já fazia parte do projeto, como cache.

## Opções consideradas

1. **Só HTTP síncrono:** a cada avaliação, perguntar ao back se o cliente comprou. Simples, mas acopla a disponibilidade: back fora, avaliações fora.
2. **Fila durável (RabbitMQ, Kafka ou Redis Streams):** garante entrega, mas acrescenta infraestrutura e complexidade.
3. **Redis Pub/Sub + base local + HTTP de reserva.**

## Decisão

Opção 3:

1. Quando um pedido passa para `entregue`, o back publica o evento `pedido.entregue` (com `pedidoId`, `usuarioId` e `produtoIds`) num envelope com id, tipo e data.
2. O serviço de avaliações assina o canal e grava as compras na tabela própria `compras_verificadas`.
3. Ao avaliar, ele consulta só o próprio banco.
4. Como o Pub/Sub não guarda mensagens (se o assinante estiver fora no momento, o evento se perde), existe uma **reserva**: se a compra não estiver na base local, o serviço pergunta ao back pela rota interna `GET /internal/compras`, protegida por token e com timeout, retry e circuit breaker.

O back também publica `produto.criado` e `pedido.criado`, consumidos por ele mesmo como notificações simuladas.

## Consequências

- **Positivas:** no caminho normal, as avaliações não dependem do back estar no ar; reaproveita o Redis já existente; os logs `PUBLICADO` e `RECEBIDO` com o mesmo id mostram a circulação das mensagens.
- **Negativas:** entrega "no máximo uma vez" (compensada pela consulta HTTP); consistência eventual entre os serviços; a rota interna precisa ser protegida (token e bloqueio no Nginx).
- **Evolução possível:** trocar o Pub/Sub por Redis Streams, que guarda as mensagens, eliminaria a necessidade da reserva.
