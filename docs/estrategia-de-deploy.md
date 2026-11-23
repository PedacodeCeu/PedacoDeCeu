# Estratégia de Deploy

## Estratégia escolhida: deploy simples com rollback

A nova versão **substitui** a anterior (os containers são recriados com as imagens novas). Se algo der errado, faz-se **rollback** para as imagens da versão anterior.

### Por que não blue/green ou canary

- **Blue/green** exige dois ambientes completos rodando ao mesmo tempo, e **canary** exige dividir o tráfego entre versões. Os dois pressupõem mais de uma máquina e um balanceador.
- O projeto roda numa única máquina, com pouco tráfego e janela de manutenção aceitável. O ganho não compensaria o custo.
- O rollback rápido já cobre o principal risco: uma versão nova com defeito.

## Como funciona

O pipeline está em [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

```
pull request ──► avaliacoes (pytest) ─┐
             ──► back (build + jest) ─┼──► todos verdes? ──► merge na main
             ──► front (build)       ─┘
                                                │
push na main ──► mesmos 3 jobs ──► deploy:
                                     1. build das imagens Docker
                                     2. cada imagem recebe o hash do commit como tag
                                        (pedaco-back:<sha>, pedaco-avaliacoes:<sha>, pedaco-front:<sha>)
                                     3. deploy (hoje simulado)
```

1. **Nada chega à `main` sem passar pelo CI:** testes e builds rodam em todo pull request.
2. **O deploy só roda na `main`** e só se os três jobs passarem (`needs`).
3. **Cada imagem é marcada com o hash do commit**, então toda versão implantada pode ser identificada e recuperada.
4. As versões de entrega são marcadas com tags SemVer e Releases no GitHub (ver "Versionamento" no README).

> **Observação:** o passo de deploy é um esqueleto (`echo`), porque o projeto não tem servidor de produção. Num ambiente real, ele enviaria as imagens para um registro (por exemplo, GitHub Container Registry) e executaria `docker compose pull && docker compose up -d` no servidor.

## Rollback

Como cada versão tem imagens próprias, voltar é trocar a tag:

1. Identificar o último commit que funcionava (aba Actions do GitHub ou `git log`).
2. Apontar o compose do servidor para as imagens com o hash desse commit.
3. Recriar os containers: `docker compose up -d`.
4. Verificar a saúde (ver o [runbook](runbook.md)) e registrar um Bug no Jira.

Sem servidor, o equivalente local é: `git checkout <tag ou commit anterior>` e `docker compose up --build -d`.

### Cuidado com o banco

O rollback troca o **código**, não os **dados**. Mudanças de esquema devem ser compatíveis com a versão anterior (por exemplo, adicionar uma coluna opcional em vez de renomear ou apagar), para que voltar o código não quebre com o banco já alterado.
