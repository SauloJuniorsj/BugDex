# BugDex — Fase 2b: render-embed (SVG do perfil) — Documento de Design

- **Data:** 2026-06-22
- **Status:** Design aprovado (aguardando revisão final do spec)
- **Fase anterior:** 2a (ingestão GitHub + cache de snapshot) — completa e mergeada
- **Módulo do design geral:** `render-embed` (§10) / superfície-herói (§7) de [`2026-06-19-bugdex-design.md`](2026-06-19-bugdex-design.md)

---

## 1. Resumo (1 frase)

Construir o **renderer do embed SVG do perfil** — a superfície-herói viral do BugDex: uma função pura `Ecosystem → string SVG` (faixa-diorama pixel-art) mais uma CLI que grava o `.svg` para inspeção — tudo headless, determinístico e testável, sem servidor HTTP, OAuth ou banco.

## 2. Objetivos e não-objetivos

**Objetivos**
- Transformar o `Ecosystem` (já produzido pelo engine) num **SVG pixel-art auto-contido** que segue o mockup da §7 do design geral.
- Manter o núcleo **puro e determinístico** (mesmo ecossistema → mesmo SVG), viabilizando snapshot tests — espelha a filosofia da Fase 1 e 2a.
- Desacoplar **renderer** de **fonte de arte**: o renderer consome dados de sprite (`{ grid, palette }`); a fonte é plugável e pode melhorar sem reescrever o renderer.
- Permitir "ver" o resultado agora via CLI que grava um arquivo `.svg` abrível no browser.

**Não-objetivos (desta fase)**
- Rota HTTP `GET /{usuario}.svg`, headers de cache e o gotcha do Camo → **fase do web-app**.
- Sprites pixel-art reais de qualidade Gen-5 (hand/IA) → **fase de conteúdo dedicada** (mesmo formato `{ grid, palette }`).
- Avatar remoto, animação (GIF/SVG animado), OAuth, banco, qualquer I/O de rede.
- SVG de erro de perfil inexistente/privado (é decisão da camada HTTP) → fase do web-app.

## 3. Onde encaixa na arquitetura

```
NormalizedProfile ──► engine.computeEcosystem ──► Ecosystem ──► embed/render.renderEmbed ──► string SVG
   (Fase 2a)              (Fase 1)                  (já existe)        (esta fase)
                                                                          │
                                                            embed/sprite.buildSprite  (pixel-art procedural)
                                                            embed/palette             (cores por bioma + morph)
                                                            embed/svg                 (helpers de serialização)
```

**Fronteira:** `render-embed` **não** conhece GitHub, HTTP nem disco. Recebe um `Ecosystem` e devolve uma string SVG. A única peça com I/O é a CLI (`src/embed-cli.ts`), que lê o snapshot do `store/` e grava o arquivo.

O tipo `Ecosystem` (de `src/domain/types.ts`) é consumido **sem alterações**. Esta fase não modifica Fase 1 nem Fase 2a.

## 4. Modelo de sprite (dado plugável)

A peça central da fase. O renderer nunca sabe *de onde* vem o pixel-art — consome **dados**:

```ts
interface Sprite {
  /** Matriz quadrada de índices de cor; -1 = célula vazia (transparente). */
  grid: number[][];
  /** Cores indexadas por valor da grade (palette[grid[y][x]]). */
  palette: string[];
}
```

- Testável por valor (sem parsear SVG): simetria, estabilidade por hash, variação por morph/stage.
- Serialização para `<rect>` vive em `embed/svg.ts` / `render.ts`, não no produtor do sprite.
- Fontes plugáveis sobre o mesmo formato: **procedural** (esta fase) ou **autoral/IA** (fase futura). Trocar a fonte não toca o renderer.

## 5. Gerador procedural de pixel-art (fonte desta fase)

`buildSprite(spriteKey: string, stage: MetamorphosisStage, morph: MorphType, biomeId: string): Sprite` — **função pura**, sem assets externos, determinística.

- **Tamanho:** grade **16×16**.
- **Simetria bilateral:** preenche apenas a metade esquerda (8 colunas) a partir do hash de `spriteKey` (reusa `src/util/hash.ts`) e espelha para a direita. Simetria faz o ruído "ler" como criatura/inseto.
- **Sombreamento:** cada cor base vira uma **rampa de 2–3 tons** (base + sombra + luz). A escolha de tom por célula é derivada do hash + posição (ex.: células de borda/baixo recebem o tom de sombra; topo recebe luz), dando volume pixel-art em vez de chapado.
- **Contorno:** células vazias adjacentes a células preenchidas recebem um tom de contorno escuro (1px), no estilo dos sprites clássicos.
- **Detalhes assimétricos leves:** após espelhar, um pequeno número de células (derivado do hash) pode ser alterado para quebrar a simetria perfeita (olhos, manchas) — ainda determinístico.
- **Estágio modula a forma:**
  - `ovo` — blob pequeno arredondado, centralizado, poucas linhas preenchidas.
  - `larva` — corpo alongado vertical/segmentado.
  - `pupa` — casulo (forma fechada, oval).
  - `adulto` — sprite simétrico completo (asas/pernas conforme densidade do hash).
- **Morph modula a paleta** (ver §6), não a forma — assim a metamorfose (forma) e a raridade (cor) ficam visualmente independentes, como manda o princípio de determinismo do design.

**Determinismo:** `buildSprite` nunca chama `Date.now()`, `Math.random()` nem I/O. Mesmos argumentos → mesmo `Sprite`.

## 6. Paletas (`embed/palette.ts` — dado, não lógica)

- **Paleta base por bioma** (`biomeId → cor[]`): casa com o tema do bioma (ex.: jardim = verdes/amarelos; vulcânico = vermelhos/laranjas; caverna = cinzas/azul-escuro). Bioma `inexplorado` tem paleta neutra.
- **Morph ajusta a paleta base:**
  - `normal` — paleta base do bioma.
  - `shiny` — paleta vívida/saturada (deslocamento para tons dourados/brilhantes); pode incluir 1–2 células de "brilho".
  - `albino` — paleta pálida/clara (alta luminosidade, baixa saturação).
  - `melanico` — paleta escura/dessaturada.
- A geração da rampa de tons (base→sombra→luz) é uma função determinística sobre a cor base (ex.: ajuste de luminância), para não precisar listar todos os tons à mão.

## 7. Layout do SVG (segue §7 do design geral)

Faixa-diorama horizontal, auto-contida (somente `<rect>`, `<text>`, `<g>`; **sem `<image>` remoto**, sem fontes externas — usa famílias genéricas como `monospace`/`sans-serif`).

```
┌────────────────────────────────────────────────────┐
│  🪲 BugDex · @login                biodiversidade: N │
│  [ bioma1 emoji nome ]  [ bioma2 ... ]  [ bioma3 ... ]│
│     <sprites-assinatura>   <sprites>      <sprites>   │
│  raríssimo: <Nome da espécie> (morph) ★★★★☆           │
└────────────────────────────────────────────────────┘
```

- **Cabeçalho:** `🪲 BugDex · @{login}` à esquerda; `biodiversidade: {N}` à direita.
- **Faixa de biomas:** os biomas **mais proeminentes** (já vêm ordenados em `ecosystem.biomes`), limitados a um teto (ex.: top 3–4 para caber). Cada bioma mostra `emoji` + `nome` e alguns **espécimes-assinatura** (sprites procedurais), também limitados por bioma.
- **Rodapé "raríssimo":** destaca `ecosystem.rarest` — nome da espécie, morph (se ≠ normal) e prestígio em estrelas (★ preenchidas = `prestige`, de 0 a 5).
- **Dimensões:** largura fixa adequada ao README (ex.: ~480–640px), altura fixa; `viewBox` definido; `image-rendering: pixelated` (ou `crisp-edges`) nas células para nitidez pixel-art ao escalar.
- **Limites explícitos:** o nº de biomas e de espécimes por bioma exibidos é limitado para caber no layout; o excedente não aparece no embed (decisão de produto, documentada — o site completo mostrará tudo numa fase futura).

## 8. CLI `npm run embed -- <login>`

Arquivo `src/embed-cli.ts` (espelha `src/ingest-cli.ts` da Fase 2a):

1. Lê `.snapshots/<login>.json` via `FileSnapshotStore`.
2. Se não existir, imprime mensagem orientando rodar `npm run ingest -- <login>` primeiro e sai com código ≠ 0.
3. Renderiza com `renderEmbed(ecosystem)`.
4. Grava em `.embed/<login>.svg` e imprime o caminho.

`.embed/` entra no `.gitignore` (como `.snapshots/`). Relógio real e I/O só na CLI.

## 9. Tratamento de erros & casos de borda (§14 do design geral)

- **Reserva vazia** (`biomes` vazio / `totalEspecimes === 0`): SVG dedicado com estado inicial simpático e call-to-action curto, em vez de faixa vazia.
- **`rarest === null`:** rodapé "raríssimo" é omitido ou substituído por texto neutro; o renderer nunca lança.
- **Bioma `Inexplorado`:** renderiza normalmente com a paleta neutra (linguagem fora do mapa).
- **Texto longo** (login/nome de espécie): truncamento/elipse para não estourar o layout.
- **Sanitização:** escapar `&`, `<`, `>`, aspas em todo texto interpolado no SVG (login vem do GitHub).

## 10. Estratégia de testes (§15 do design geral)

- **Unit `buildSprite`** (por valor): grade é 16×16; simetria bilateral (coluna `x` == coluna `15-x`, salvo detalhes assimétricos controlados); estabilidade (mesmos args → mesmo sprite); variação por `morph` (paletas diferentes) e por `stage` (formas diferentes); `inexplorado` produz sprite válido.
- **Unit `palette`:** cada bioma tem paleta; cada morph transforma a base de forma distinta; rampa de tons é determinística.
- **Snapshot `renderEmbed`:** SVG estável para um `Ecosystem` de fixture (determinismo). Reusar/estender `src/fixtures/`.
- **Bordas como testes explícitos:** reserva vazia, `rarest: null`, bioma `inexplorado`, login com caracteres que exigem escape.
- **Sanidade do SVG:** começa com `<svg`, tem `viewBox`, é string não vazia, sem `href` http(s) remoto.

## 11. Arquivos previstos (refináveis no plano)

- `src/embed/sprite.ts` (+ `.test.ts`) — `buildSprite` procedural.
- `src/embed/palette.ts` (+ `.test.ts`) — paletas por bioma + transformações por morph + rampa de tons.
- `src/embed/svg.ts` (+ `.test.ts`) — helpers de serialização (grid→`<rect>`, escape de texto, estrelas de prestígio).
- `src/embed/render.ts` (+ `.test.ts`) — `renderEmbed(ecosystem): string` (compõe a faixa + estados de borda; snapshot tests).
- `src/embed-cli.ts` — CLI (I/O).
- `package.json` — script `"embed"`; `.gitignore` — `.embed/`; `README.md` — seção de uso.

## 12. Restrições globais (herdadas das fases anteriores)

- Node **>= 20**, ESM (`"type": "module"`), TypeScript **strict** + `noUncheckedIndexedAccess`; proibido `any` implícito.
- **Determinismo:** nada em `src/embed/**` (exceto a CLI) chama `Date.now()`, `new Date()` sem argumento, `Math.random()` ou I/O.
- Idioma: identificadores e mensagens em **pt-BR**; ids/arquivos em kebab/ASCII.
- Testes co-localizados `*.test.ts`. Imports relativos com extensão `.js`.
- Commits pequenos, um por task, Conventional Commits em pt-BR.

## 13. Riscos & itens em aberto

- **Qualidade do procedural:** 16×16 + simetria + sombreamento fica num meio-termo "criatura abstrata bonita" — **não** é Pokémon Gen-5-reconhecível. Aceito de propósito; o formato `{ grid, palette }` permite trocar por sprites reais depois sem reescrever o renderer.
- **Caber no layout:** limites de biomas/espécimes exibidos precisam de ajuste fino visual via a CLI durante a implementação.
- **Renderização de emoji em SVG** depende da fonte do dispositivo de quem visualiza (biomas usam emoji). Aceitável nesta fase; se ficar inconsistente, futura migração dos rótulos de bioma para pixel-art também.

## 14. Próximos passos

1. Revisão final deste spec pelo autor.
2. Invocar a skill **writing-plans** para gerar o plano de implementação detalhado (task-by-task).
