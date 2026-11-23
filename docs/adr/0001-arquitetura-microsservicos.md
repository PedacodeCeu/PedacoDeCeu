# ADR 0001: Monólito com um microsserviço extraído

**Status:** aceita

## Contexto

O Pedaço de Céu nasceu no 1º bimestre como um monólito: um back em Node.js/Express com um banco MySQL, responsável por usuários, catálogo e pedidos. No 3º bimestre, o projeto passou a exigir uma arquitetura com microsserviço, mas a equipe tem duas pessoas e pouco tempo, e reescrever tudo como microsserviços multiplicaria a infraestrutura (bancos, deploys, comunicação) sem ganho real para o tamanho do sistema.

## Opções consideradas

1. **Manter o monólito:** simples, mas não atende ao objetivo do bimestre.
2. **Quebrar tudo em microsserviços** (usuários, catálogo, pedidos, avaliações): máxima independência, com custo de operação desproporcional.
3. **Monólito + extração de um contexto com fronteira clara:** o monólito continua cuidando do núcleo, e uma funcionalidade nova nasce como serviço separado.

## Decisão

Opção 3. O back Node continua como monólito organizado em camadas (Identidade, Catálogo e Pedidos), e a funcionalidade nova de **avaliações de produtos** nasce como microsserviço independente, com banco próprio.

Avaliações foi escolhida porque tem fronteira natural: depende do restante do sistema em um único ponto (saber se o cliente recebeu o produto), o que pode ser resolvido por evento.

## Consequências

- **Positivas:** o microsserviço pode ser desenvolvido, testado e implantado sem mexer no monólito; uma falha nele não derruba a loja; a infraestrutura cresce pouco (um serviço e um banco).
- **Negativas:** o sistema passa a ter comunicação entre processos (eventos e HTTP), com os problemas típicos de sistemas distribuídos (mensagens perdidas, serviço indisponível), tratados no [ADR 0004](0004-comunicacao-por-eventos-redis-pubsub.md) e em [resiliência](../resiliencia.md).
- O monólito pode ter outros contextos extraídos no futuro, seguindo o mesmo caminho.
