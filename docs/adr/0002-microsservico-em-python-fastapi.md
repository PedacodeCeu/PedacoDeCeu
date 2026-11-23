# ADR 0002: Microsserviço de avaliações em Python com FastAPI

**Status:** aceita

## Contexto

O microsserviço de avaliações podia ser escrito em qualquer linguagem (a proposta do bimestre permitia NestJS, Python ou outra). O back existente é Node.js/TypeScript.

## Opções consideradas

1. **Node.js/NestJS:** mesma linguagem do back, reaproveitamento de conhecimento.
2. **Python com FastAPI:** linguagem diferente, assíncrona, com validação e documentação embutidas.

## Decisão

Python com **FastAPI**, usando SQLAlchemy assíncrono (asyncpg) para o banco, Pydantic para validação dos dados e httpx para chamadas HTTP.

Motivos:
- demonstra na prática que microsserviços podem usar tecnologias diferentes, já que a comunicação é por contrato (HTTP e eventos), e não por código compartilhado;
- o FastAPI gera automaticamente a documentação OpenAPI/Swagger (`/api/avaliacoes/docs`);
- os testes rodam sem Docker (SQLite e Redis simulado), o que facilita o CI.

## Consequências

- **Positivas:** independência tecnológica real; documentação de API sem esforço extra; testes rápidos.
- **Negativas:** duas stacks para manter (npm e pip, Jest e pytest); regras compartilhadas, como a validação do JWT, existem duas vezes, uma em cada linguagem, e precisam usar o mesmo `JWT_SECRET`.
