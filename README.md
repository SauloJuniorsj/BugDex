# BugDex 🪲

> Seu GitHub vira um **ecossistema vivo de criaturas**: suas linguagens viram biomas,
> seus repositórios viram espécimes reais que passam por metamorfose conforme você
> programa, com morphs raros (shiny/albino), espécies apex/invasoras (vibe Monster
> Hunter) e um widget vivo que você cola no README do seu perfil do GitHub.

**Passion project — em fase de design.** Nada implementado ainda.

## Documentação

- Design / brainstorming: [`docs/superpowers/specs/`](docs/superpowers/specs/)

## Status

🧪 Fase 1 (engine + conteúdo) completa. Fase 2a (ingestão GitHub + cache de snapshot, headless) em implementação.

### Rodar a ingestão (smoke manual)

```bash
export GITHUB_TOKEN=<seu_PAT>   # escopo public_repo/read:user
npm run ingest -- <login-github>
```

Imprime o ecossistema computado e salva o snapshot em `.snapshots/<login>.json`.
