# Análise Cynefin e Escolha da Abordagem

## O framework

O Cynefin classifica um problema pela relação entre **causa e efeito**, e indica a forma de agir em cada caso:

| Domínio | Causa e efeito | Como agir | Abordagem |
|---|---|---|---|
| **Simples (Claro)** | Óbvia | Seguir boas práticas conhecidas | Preditiva |
| **Complicado** | Existe, mas exige análise ou especialista | Analisar, depois agir | Preditiva ou híbrida |
| **Complexo** | Só fica clara depois de agir | Experimentar, observar, ajustar | Ágil |
| **Caótico** | Não há relação perceptível | Agir já para estabilizar | Ação imediata |

## Classificação do Pedaço de Céu

**Características de Complicado:**
- o escopo era conhecido: a proposta de cada bimestre definia o que precisava existir (cache, mensageria, proxy reverso, microsserviço, pipeline);
- os prazos eram fixos (fim de cada bimestre);
- as tecnologias são consolidadas e bem documentadas no mercado.

**Características de Complexo:**
- **tecnologias novas para a equipe:** Redis, mensageria, microsserviços, FastAPI e CI/CD foram aprendidos durante o projeto, então o resultado de cada passo não era previsível para quem executava;
- **problemas descobertos na execução, e não no planejamento:** por exemplo, o conflito de versões entre TypeScript e ts-jest, o `package-lock` que funcionava com uma versão do npm e não com outra, e os avisos do ESLint que escondiam bugs reais. Todos só apareceram quando o pipeline de CI passou a rodar;
- **decisões emergentes:** a linguagem do microsserviço, qual funcionalidade extrair, o banco por serviço e a consulta HTTP de reserva para eventos perdidos foram decididos ao longo do caminho (ver os [ADRs](adr/));
- **o próprio projeto mudou de forma** entre bimestres: web fullstack, depois mobile, depois microsserviços.

**Conclusão: domínio Complexo, com partes Complicadas.** O "o quê" era conhecido, mas o "como" só ficou claro fazendo. O Cynefin também prevê que os problemas **mudam de domínio**: o que começou Complexo (cada tecnologia nova era um experimento) foi ficando Complicado à medida que a equipe dominou as ferramentas. Ainda assim, a natureza do trabalho continuou exigindo experimentar e ajustar.

## Abordagem escolhida: Ágil, com Kanban

O domínio Complexo pede uma abordagem **ágil**: entregas pequenas, feedback rápido e ajuste contínuo. A equipe usa **Kanban**, e não Scrum, porque:

- são duas pessoas, sem necessidade de cerimônias e papéis formais do Scrum (Scrum Master, Product Owner);
- o trabalho chega de forma contínua (funcionalidades, bugs descobertos, débitos técnicos), e encaixa melhor num fluxo do que em sprints de tamanho fixo;
- o fluxo é visível no Jira: cada card passa por *A fazer → Em andamento → Concluído*.

**Por que não híbrida:** o prazo e o escopo fixos poderiam sugerir uma parte preditiva. Mas, no Cynefin, a abordagem segue a natureza do **trabalho**, não do prazo. O prazo apenas limita quanto cabe em cada entrega, o que o ágil já resolve priorizando o backlog.

## Como a abordagem aparece na prática

| Prática ágil | Evidência no projeto |
|---|---|
| Backlog priorizado com User Stories | Jira |
| Fluxo Kanban com status visível | Quadro do Jira |
| Entregas pequenas e frequentes | Um pull request por funcionalidade ou correção |
| Feedback rápido | CI rodando testes e builds em cada pull request |
| Débito técnico registrado e tratado | Cards de Bug criados quando o CI expôs problemas, corrigidos e fechados citando o PR |
| Lançamentos parciais versionados | Tags SemVer e Releases no GitHub (ver "Versionamento" no README) |
