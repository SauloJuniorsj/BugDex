# BugDex 🪲

> Seu GitHub vira um **ecossistema vivo de criaturas**: suas linguagens viram biomas,
> seus repositórios viram espécimes reais que passam por metamorfose conforme você
> programa, com morphs raros (shiny/albino), espécies apex/invasoras (vibe Monster
> Hunter) e um widget vivo que você cola no README do seu perfil do GitHub.

**Passion project.** Núcleo headless e testável em pé; falta a camada web (OAuth + páginas) e a arte real.

## Documentação

- Design / brainstorming: [`docs/superpowers/specs/`](docs/superpowers/specs/)
- Planos de implementação: [`docs/superpowers/plans/`](docs/superpowers/plans/)

## Status

🧪 **Fase 1** (engine + conteúdo) ✅ · **Fase 2a** (ingestão GitHub + cache de snapshot) ✅ · **Fase 2b** (render-embed — SVG do perfil) ✅ — tudo headless, determinístico, 95 testes.

Falta (próximas fases): `web-app` (Next.js + OAuth GitHub + páginas), `render-web` (pixel-art no browser), `persistence` de users/collection, rota HTTP `GET /{login}.svg` com cache (gotcha do Camo), e a fase de **arte real** (sprites pixel-art de qualidade substituindo os procedurais, mesmo formato `{grid, palette}`).

### Rodar a ingestão (smoke manual)

```bash
export GITHUB_TOKEN=<seu_PAT>   # escopo public_repo/read:user
npm run ingest -- <login-github>
```

Imprime o ecossistema computado e salva o snapshot em `.snapshots/<login>.json`.

### Gerar o embed SVG (smoke manual)

Após ter um snapshot (via `npm run ingest`), gere o SVG do perfil:

```bash
npm run embed -- <login-github>
```

Lê `.snapshots/<login>.json` e grava `.embed/<login>.svg` — abra no browser para inspecionar.
