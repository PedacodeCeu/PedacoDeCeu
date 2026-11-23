# ADR 0006: Back Node organizado em camadas, sem camada repository

**Status:** aceita

## Contexto

Na refatoração do back Node, a lógica que estava nos controllers foi separada em camadas. Era preciso decidir quantas camadas criar entre a rota e o banco.

## Opções consideradas

1. **Controller → service → repository → model:** isola totalmente o acesso a dados.
2. **Controller → service → model (Sequelize).**

## Decisão

Opção 2:

- **Controllers:** recebem a requisição, validam a entrada com os **DTOs** e devolvem a resposta HTTP.
- **Services:** concentram as regras de negócio (quem pode alterar um pedido, cálculo de total, cache, publicação de eventos).
- **Models (Sequelize):** fazem o acesso aos dados.
- Apoio: `middlewares/` (autenticação, log, erros), `infra/` (cache e eventos) e `errors/` (classes de erro).

O Sequelize já é uma camada de abstração sobre o banco (consultas, transações, associações). Um repository por cima dele só repassaria chamadas, sem ganho prático para o tamanho do projeto.

## Consequências

- **Positivas:** menos código e menos arquivos para navegar; as regras de negócio continuam fora dos controllers.
- **Negativas:** os services dependem diretamente do Sequelize; trocar de ORM exigiria mexer neles.
- **Observação:** o serviço de avaliações (Python) usa a camada repository, porque a sessão assíncrona do SQLAlchemy se beneficia de ficar encapsulada. A diferença entre os dois serviços é intencional, e cada um segue o que faz sentido para a sua stack.
