# ADR 0005: Nginx como ponto único de entrada (proxy reverso)

**Status:** aceita

## Contexto

O sistema tem três aplicações acessadas pelo navegador: o front (React), o back (Node) e o serviço de avaliações (FastAPI). Expor cada uma numa porta diferente obrigaria o front a conhecer vários endereços, multiplicaria a superfície de ataque e complicaria o HTTPS e o CORS.

## Decisão

Um **Nginx** é o único container com portas publicadas (80 e 443) e encaminha as requisições pelo caminho:

| Caminho | Destino |
|---|---|
| `/` | front (React, servido por um Nginx interno) |
| `/api/` | back Node (`pedaco-back:3000`) |
| `/api/avaliacoes` | serviço de avaliações (`pedaco-avaliacoes:8000`) |
| `/uploads/` | imagens servidas pelo back |
| `/api/internal/` | **bloqueado** (404): rotas serviço-a-serviço não ficam acessíveis de fora |

Ele também redireciona HTTP para HTTPS, limita o tamanho dos uploads (5 MB) e adiciona headers de segurança (CSP, X-Frame-Options, X-Content-Type-Options, entre outros). Back, Redis e serviço de avaliações só ficam visíveis na rede interna do Docker. Os bancos só aceitam conexões da própria máquina (`127.0.0.1`), para acesso pelo DBeaver.

## Consequências

- **Positivas:** o front usa um único endereço (`/api`); HTTPS e segurança ficam num lugar só; adicionar ou mover um serviço é só uma regra no Nginx.
- **Negativas:** o Nginx vira ponto único de falha (se ele cair, tudo fica inacessível); a configuração dele passa a fazer parte do que precisa ser testado a cada mudança de rota.
