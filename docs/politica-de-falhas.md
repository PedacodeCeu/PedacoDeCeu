# Política de Falhas

O que fazer quando o sistema falha: as 6 falhas mais prováveis, o que o sistema já faz sozinho e o passo a passo da equipe. Os comandos são executados na raiz do projeto. O detalhamento técnico está no [runbook](runbook.md) e nas [estratégias de resiliência](resiliencia.md).

## Primeiros passos (qualquer falha)

1. `docker compose ps`: procurar containers `Exited`, `Restarting` ou `unhealthy`.
2. Abrir `https://pedacodeceu.local/api/health` (loja) e `https://pedacodeceu.local/api/avaliacoes/health` (avaliações): mostram `ok`, `degradado` ou `fora`, com o estado do banco e do Redis.
3. Houve deploy recente? Se a falha começou logo depois, fazer o rollback antes de investigar ([estratégia de deploy](estrategia-de-deploy.md)).

| Sintoma | Falha provável |
|---|---|
| Tela com "Erro interno do servidor" | [1. Erro 500](#1-erro-500-inesperado) |
| Tudo funciona, mas o health diz `degradado` | [2. Redis fora](#2-redis-parado-ou-apagado) |
| Site abre, mas as telas dão 502 Bad Gateway | [3. Back fora](#3-back-fora-do-ar) |
| Login, catálogo ou avaliações falham e o health diz `fora` | [4. Banco fora](#4-banco-fora-mysql-ou-postgresql) |
| Cliente recebeu o pedido, mas não consegue avaliar | [5. Avaliação bloqueada](#5-cliente-recebeu-o-pedido-mas-não-consegue-avaliar) |
| O site não abre | [6. Site fora](#6-site-não-abre) |

## 1. Erro 500 inesperado

- **O usuário vê:** "Erro interno do servidor". A resposta traz um `requestId`.
- **O sistema faz sozinho:** registra no log `[erro] <requestId> 500 <rota>` com o detalhe do erro, sem mostrar nada interno ao usuário.
- **A equipe faz:**
    1. Pegar o `requestId` da resposta (ou o cabeçalho `X-Request-Id`, na aba Network do navegador).
    2. `docker compose logs backend avaliacoes | grep <requestId>` para ver a requisição completa nos dois serviços.
    3. Erro de conexão com banco: ver a falha 4. Erro de código: rollback se veio de um deploy; senão, corrigir numa branch, com PR e CI verde.
- **Confirmar:** repetir a ação do usuário e receber resposta normal.

## 2. Redis parado ou apagado

- **O usuário vê:** nada de errado. As páginas só ficam um pouco mais lentas, porque estão sem cache.
- **O sistema faz sozinho:** busca tudo direto no banco; o health passa a `degradado` (HTTP 200); o serviço de avaliações tenta reconectar a cada 1 s, 2 s, 4 s... até 30 s. Avisos de entrega enviados nesse período se perdem, mas a consulta de reserva compensa (falha 5).
- **A equipe faz:**
    1. `docker compose ps redis`.
    2. Container parado: `docker compose start redis`.
    3. Container apagado: `docker compose up -d redis` (`start` e `restart` não recriam um container apagado).
- **Confirmar:** health volta a `ok`; nos logs, "Redis conectado" (back) e "Inscrito no canal pedido.entregue" (avaliações); o catálogo mostra `[cache] MISS` e depois `HIT`.

## 3. Back fora do ar

- **O usuário vê:** o site abre, mas as telas com dados mostram erro (502 Bad Gateway).
- **O sistema faz sozinho:** o Docker reinicia o container (`restart: always`). As avaliações continuam sendo listadas. A consulta de compras ao back passa pelo circuit breaker: após 3 falhas, ele recusa na hora por 30 s, em vez de deixar o usuário esperando.
- **A equipe faz:**
    1. `docker compose logs --tail=100 backend`: procurar variável de ambiente faltando (`.env`), banco ou Redis inacessível, ou erro de código.
    2. Se começou após um deploy, rollback.
    3. `docker compose up -d backend`.
- **Confirmar:** `/api/health` responde 200 e as telas carregam.

## 4. Banco fora (MySQL ou PostgreSQL)

- **O usuário vê:**
    - MySQL fora: login, catálogo e pedidos falham; `/api/health` diz `fora` (503).
    - PostgreSQL fora: só as avaliações falham; `/api/avaliacoes/health` diz `fora` (503). A loja continua vendendo, porque cada serviço tem o seu banco ([ADR 0003](adr/0003-banco-de-dados-por-servico.md)).
- **O sistema faz sozinho:** o Docker tenta reiniciar o banco (`restart: always`).
- **A equipe faz:**
    1. `docker compose logs database` (MySQL) ou `docker compose logs avaliacoes-db` (PostgreSQL).
    2. `docker compose up -d database` ou `docker compose up -d avaliacoes-db`. Os dados ficam no volume e não se perdem.
    3. **Nunca** usar `docker compose down -v`: o `-v` apaga os volumes, ou seja, todos os dados.
- **Confirmar:** health volta a `ok`; login e listagem funcionando (ou a página de um produto com avaliações).

## 5. Cliente recebeu o pedido, mas não consegue avaliar

- **Causa:** o aviso de entrega se perdeu (Redis ou avaliações fora no momento) **e** a consulta de reserva ao back também falhou.
- **O sistema faz sozinho:** normalmente a consulta de reserva resolve: o serviço pergunta ao back, encontra a compra e grava localmente.
- **A equipe faz:**
    1. `docker compose logs backend | grep pedido.entregue`: o aviso saiu?
    2. `docker compose logs avaliacoes | grep -E "RECEBIDO|ABERTO"`: chegou? O circuito está aberto?
    3. Circuito aberto: resolver o back (falha 3). Depois de 30 s o circuito testa de novo; o cliente tenta avaliar outra vez.
- **Confirmar:** a avaliação é aceita; no log, o circuito aparece como `FECHADO`.

## 6. Site não abre

- **O usuário vê:** conexão recusada ou erro de certificado.
- **O sistema faz sozinho:** o Docker reinicia o Nginx (`restart: always`).
- **A equipe faz:**
    1. `docker compose ps nginx` e `docker compose logs nginx`.
    2. `docker compose exec nginx nginx -t` para conferir a configuração; conferir os certificados em `nginx/certs/`.
    3. `docker compose up -d nginx`. Atenção: o Nginx só sobe depois que o back e as avaliações estão saudáveis. Se ele não subir, verificar esses dois primeiro (falhas 3 e 4).
- **Confirmar:** `https://pedacodeceu.local` abre normalmente.

## Depois de qualquer falha

1. Confirmar com `docker compose ps` que tudo está saudável.
2. Registrar um Bug no Jira: o que aconteceu, quando, o `requestId` (se houver), a causa, a solução e o que evitaria a repetição.
3. Se a correção exigiu código: branch, pull request, CI verde e merge.
