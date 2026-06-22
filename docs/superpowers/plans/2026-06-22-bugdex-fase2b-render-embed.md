# BugDex — Fase 2b: render-embed (SVG do perfil) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o renderer do embed SVG do perfil — função pura `renderEmbed(ecosystem): string` (faixa-diorama pixel-art com sprites procedurais) mais uma CLI que grava `.embed/<login>.svg` — headless, determinístico e testável.

**Architecture:** Núcleo puro em `src/embed/` (sem rede/disco/relógio), espelhando Fase 1/2a. `color.ts` faz operações numéricas de cor; `palette.ts` mapeia bioma+morph → paleta; `sprite.ts` gera pixel-art procedural determinístico (`{grid, palette}`); `svg.ts` serializa (grid→`<rect>`, escape, estrelas); `render.ts` compõe o SVG a partir de um `Ecosystem`. A única peça com I/O é `src/embed-cli.ts`, que lê o snapshot via `FileSnapshotStore` e grava o arquivo. Nada da Fase 1/2a é alterado.

**Tech Stack:** Node 20+ (testado em 24), TypeScript 5 strict, ESM, Vitest, tsx (CLI). Nenhuma dependência nova.

## Global Constraints

- Node.js **>= 20**; `package.json` com `"type": "module"` (ESM).
- TypeScript **strict** (`"strict": true`, `"noUncheckedIndexedAccess": true`); proibido `any` implícito. Índices de array/record retornam `T | undefined` — use `!` ou `??` deliberadamente.
- **Determinismo:** nada em `src/embed/**` (exceto `src/embed-cli.ts`) pode chamar `Date.now()`, `new Date()` sem argumento, `Math.random()` ou I/O. Aleatoriedade vem só de `stableHash` (`src/util/hash.ts`).
- Idioma: identificadores e mensagens em **pt-BR**; ids/arquivos em kebab/ASCII.
- Testes co-localizados como `*.test.ts` ao lado do código.
- Imports relativos com extensão `.js` (ESM + `moduleResolution: Bundler`), como nas fases anteriores.
- Commits pequenos e frequentes, um por task (mensagens em pt-BR, Conventional Commits).
- Tipos consumidos sem alteração: `Ecosystem`, `BiomePopulation`, `Specimen`, `MetamorphosisStage`, `MorphType` de `src/domain/types.ts`.

## File Structure

- `src/embed/color.ts` — operações puras de cor (hex↔rgb, darken, lighten, blend). Sem dependências do domínio.
- `src/embed/palette.ts` — `spritePalette(biomeId, morph): string[]` ([contorno, sombra, base, luz]). Dado + transformação por morph. Depende de `color.ts`.
- `src/embed/sprite.ts` — `buildSprite(...): Sprite` procedural. Depende de `util/hash.ts` e `palette.ts`.
- `src/embed/svg.ts` — `escapeXml`, `spriteToRects`, `stars`. Depende do tipo `Sprite`.
- `src/embed/render.ts` — `renderEmbed(ecosystem): string`. Compõe tudo. Depende de `sprite.ts` e `svg.ts`.
- `src/embed-cli.ts` — CLI (I/O). Depende de `store/file-store.ts` e `embed/render.ts`.
- `package.json` (script `embed`), `.gitignore` (`.embed/`), `README.md` (seção de uso).

---

### Task 1: Operações de cor (`color.ts`)

**Files:**
- Create: `src/embed/color.ts`
- Test: `src/embed/color.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `hexToRgb(hex: string): [number, number, number]`, `rgbToHex(r: number, g: number, b: number): string`, `darken(hex: string, amount: number): string`, `lighten(hex: string, amount: number): string`, `blend(a: string, b: string, amount: number): string`. Consumidos por `palette.ts`.

- [ ] **Step 1: Escrever o teste**

Create `src/embed/color.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, darken, lighten, blend } from './color.js';

describe('color', () => {
  it('hexToRgb decodifica canais', () => {
    expect(hexToRgb('#80a0c0')).toEqual([128, 160, 192]);
  });

  it('rgbToHex faz o caminho inverso', () => {
    expect(rgbToHex(128, 160, 192)).toBe('#80a0c0');
  });

  it('darken multiplica os canais por (1-amount)', () => {
    expect(darken('#646464', 0.5)).toBe('#323232');
  });

  it('lighten interpola em direção a 255', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080');
  });

  it('blend interpola entre duas cores', () => {
    expect(blend('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('clampa nos limites (não estoura 255)', () => {
    expect(lighten('#ffffff', 0.5)).toBe('#ffffff');
    expect(darken('#000000', 0.5)).toBe('#000000');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npm test -- color`
Expected: FAIL (não existe `./color.js`).

- [ ] **Step 3: Implementar**

Create `src/embed/color.ts`:

```ts
function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number): string => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Escurece: cada canal * (1-amount). amount 0–1. */
export function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = 1 - amount;
  return rgbToHex(r * f, g * f, b * f);
}

/** Clareia: interpola cada canal em direção a 255 por amount (0–1). */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** Interpola de `a` para `b` por amount (0 = a, 1 = b). */
export function blend(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount);
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npm test -- color`
Expected: PASS (6 testes).

- [ ] **Step 5: Typecheck e commit**

Run: `npm run typecheck`
Expected: sem erros.

```bash
git add src/embed/color.ts src/embed/color.test.ts
git commit -m "feat(embed): operações puras de cor (hex/rgb, darken, lighten, blend)"
```

---

### Task 2: Paleta por bioma + morph (`palette.ts`)

**Files:**
- Create: `src/embed/palette.ts`
- Test: `src/embed/palette.test.ts`

**Interfaces:**
- Consumes: `darken`, `lighten`, `blend` de `color.ts`; tipo `MorphType` de `../domain/types.js`.
- Produces: `spritePalette(biomeId: string, morph: MorphType): string[]` — array de 4 hex `[contorno, sombra, base, luz]`. Consumido por `sprite.ts`.

- [ ] **Step 1: Escrever o teste**

Create `src/embed/palette.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { spritePalette } from './palette.js';

describe('spritePalette', () => {
  it('retorna 4 tons [contorno, sombra, base, luz]', () => {
    const p = spritePalette('jardim', 'normal');
    expect(p).toHaveLength(4);
    for (const c of p) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('biomas diferentes têm base diferente', () => {
    expect(spritePalette('jardim', 'normal')[2]).not.toBe(spritePalette('vulcanico', 'normal')[2]);
  });

  it('morph altera a base (cor), de forma distinta por tipo', () => {
    const base = spritePalette('jardim', 'normal')[2];
    const shiny = spritePalette('jardim', 'shiny')[2];
    const albino = spritePalette('jardim', 'albino')[2];
    const melanico = spritePalette('jardim', 'melanico')[2];
    expect(new Set([base, shiny, albino, melanico]).size).toBe(4);
  });

  it('bioma desconhecido cai na paleta neutra (inexplorado)', () => {
    expect(spritePalette('nao-existe', 'normal')).toEqual(spritePalette('inexplorado', 'normal'));
  });

  it('é determinística', () => {
    expect(spritePalette('selva', 'shiny')).toEqual(spritePalette('selva', 'shiny'));
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npm test -- palette`
Expected: FAIL (não existe `./palette.js`).

- [ ] **Step 3: Implementar**

Create `src/embed/palette.ts`:

```ts
import type { MorphType } from '../domain/types.js';
import { darken, lighten, blend } from './color.js';

/** Cor base por bioma (ids de src/content/biomes.ts). */
const BIOME_BASE: Record<string, string> = {
  jardim: '#6fcf52',
  selva: '#2f9e57',
  vulcanico: '#e0552b',
  caverna: '#7a818f',
  savana: '#e0b94a',
  pantano: '#5f8f6f',
  deserto: '#e6c879',
  bosque: '#c98a3c',
  inexplorado: '#9aa0a6',
};

const OUTLINE = '#15151c';

function morphBase(base: string, morph: MorphType): string {
  switch (morph) {
    case 'shiny': return blend(base, '#ffcc33', 0.55);
    case 'albino': return lighten(base, 0.78);
    case 'melanico': return darken(base, 0.62);
    case 'normal':
    default: return base;
  }
}

/** [contorno, sombra, base, luz]. */
export function spritePalette(biomeId: string, morph: MorphType): string[] {
  const raw = BIOME_BASE[biomeId] ?? BIOME_BASE['inexplorado']!;
  const base = morphBase(raw, morph);
  return [OUTLINE, darken(base, 0.35), base, lighten(base, 0.4)];
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npm test -- palette`
Expected: PASS (5 testes).

- [ ] **Step 5: Typecheck e commit**

Run: `npm run typecheck`
Expected: sem erros.

```bash
git add src/embed/palette.ts src/embed/palette.test.ts
git commit -m "feat(embed): paleta de sprite por bioma com ajuste por morph"
```

---

### Task 3: Gerador procedural de pixel-art (`sprite.ts`)

**Files:**
- Create: `src/embed/sprite.ts`
- Test: `src/embed/sprite.test.ts`

**Interfaces:**
- Consumes: `stableHash` de `../util/hash.js`; `spritePalette` de `./palette.js`; tipos `MetamorphosisStage`, `MorphType` de `../domain/types.js`.
- Produces: `interface Sprite { grid: number[][]; palette: string[] }`, `const SPRITE_SIZE = 16`, `buildSprite(spriteKey: string, stage: MetamorphosisStage, morph: MorphType, biomeId: string): Sprite`. Consumidos por `svg.ts` (tipo) e `render.ts`.

**Notas de design:** grade 16×16. Valores da grade: `-1` vazio, `0` contorno, `1` sombra, `2` base, `3` luz. Metade esquerda é gerada por hash e **espelhada** → a grade final é bilateralmente simétrica (`grid[y][x] === grid[y][15-x]`). Tons vêm de detecção de borda (topo = luz, base = sombra, interior = base); contorno preenche vazios 4-adjacentes a preenchidos. Detalhes assimétricos (olhos) ficam adiados para manter a invariante de simetria limpa e testável.

- [ ] **Step 1: Escrever o teste**

Create `src/embed/sprite.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSprite, SPRITE_SIZE, type Sprite } from './sprite.js';

function isSymmetric(s: Sprite): boolean {
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (s.grid[y]![x] !== s.grid[y]![SPRITE_SIZE - 1 - x]) return false;
    }
  }
  return true;
}

function countFilled(s: Sprite): number {
  let n = 0;
  for (const row of s.grid) for (const v of row) if (v >= 0) n++;
  return n;
}

describe('buildSprite', () => {
  it('produz grade 16x16 com paleta de 4 tons', () => {
    const s = buildSprite('joaninha', 'adulto', 'normal', 'jardim');
    expect(s.grid).toHaveLength(SPRITE_SIZE);
    for (const row of s.grid) expect(row).toHaveLength(SPRITE_SIZE);
    expect(s.palette).toHaveLength(4);
  });

  it('é bilateralmente simétrico', () => {
    expect(isSymmetric(buildSprite('abelha', 'adulto', 'normal', 'jardim'))).toBe(true);
    expect(isSymmetric(buildSprite('libelula', 'larva', 'shiny', 'pantano'))).toBe(true);
  });

  it('é determinístico (mesmos args -> mesmo sprite)', () => {
    expect(buildSprite('morpho-azul', 'pupa', 'normal', 'selva'))
      .toEqual(buildSprite('morpho-azul', 'pupa', 'normal', 'selva'));
  });

  it('só usa valores de tom válidos (-1..3)', () => {
    const s = buildSprite('cupim', 'adulto', 'melanico', 'savana');
    for (const row of s.grid) {
      for (const v of row) {
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(3);
      }
    }
  });

  it('estágios diferentes produzem formas diferentes', () => {
    const ovo = buildSprite('joaninha', 'ovo', 'normal', 'jardim');
    const adulto = buildSprite('joaninha', 'adulto', 'normal', 'jardim');
    expect(countFilled(ovo)).toBeLessThan(countFilled(adulto));
  });

  it('morph só muda a paleta, não a forma (mesma silhueta)', () => {
    const normal = buildSprite('joaninha', 'adulto', 'normal', 'jardim');
    const shiny = buildSprite('joaninha', 'adulto', 'shiny', 'jardim');
    const shape = (s: Sprite) => s.grid.map((r) => r.map((v) => (v >= 0 ? 1 : 0)));
    expect(shape(normal)).toEqual(shape(shiny));
    expect(normal.palette).not.toEqual(shiny.palette);
  });

  it('bioma inexplorado gera sprite válido', () => {
    const s = buildSprite('barata', 'adulto', 'normal', 'inexplorado');
    expect(s.grid).toHaveLength(SPRITE_SIZE);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npm test -- sprite`
Expected: FAIL (não existe `./sprite.js`).

- [ ] **Step 3: Implementar**

Create `src/embed/sprite.ts`:

```ts
import type { MetamorphosisStage, MorphType } from '../domain/types.js';
import { stableHash } from '../util/hash.js';
import { spritePalette } from './palette.js';

export const SPRITE_SIZE = 16;
const HALF = SPRITE_SIZE / 2; // 8

export interface Sprite {
  /** SPRITE_SIZE x SPRITE_SIZE. -1 vazio, 0 contorno, 1 sombra, 2 base, 3 luz. */
  grid: number[][];
  /** [contorno, sombra, base, luz]. */
  palette: string[];
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/**
 * Limiar de preenchimento (0–1000) da metade esquerda, por estágio.
 * dh = distância do eixo de espelho (0 no centro, 7 na borda); dv = distância do centro vertical.
 */
function silhouetteThreshold(stage: MetamorphosisStage, dh: number, dv: number): number {
  switch (stage) {
    case 'ovo':
      if (dh > 3 || dv > 4) return 0;
      return 950 - (dh + dv) * 100;
    case 'larva':
      if (dh > 3) return 0;
      return 900 - dh * 140 - (dv > 6 ? 400 : 0);
    case 'pupa':
      if (dh > 4 || dv > 6) return 0;
      return 980 - dh * 70 - dv * 50;
    case 'adulto':
    default:
      return 950 - dh * 70 - dv * 60;
  }
}

export function buildSprite(
  spriteKey: string,
  stage: MetamorphosisStage,
  morph: MorphType,
  biomeId: string,
): Sprite {
  const palette = spritePalette(biomeId, morph);

  // 1) Máscara booleana: gera a metade esquerda e espelha.
  const mask: boolean[][] = Array.from({ length: SPRITE_SIZE }, () =>
    new Array<boolean>(SPRITE_SIZE).fill(false));

  for (let y = 0; y < SPRITE_SIZE; y++) {
    const dv = Math.abs(y - 7);
    for (let x = 0; x < HALF; x++) {
      const dh = (HALF - 1) - x; // x=7 -> 0 (eixo), x=0 -> 7 (borda)
      const threshold = clamp(silhouetteThreshold(stage, dh, dv), 0, 1000);
      if (threshold <= 0) continue;
      const v = stableHash(`${spriteKey}:${stage}:${x}:${y}`) % 1000;
      if (v < threshold) {
        mask[y]![x] = true;
        mask[y]![SPRITE_SIZE - 1 - x] = true;
      }
    }
  }

  // 2) Tons por detecção de borda; -1 vazio.
  const grid: number[][] = Array.from({ length: SPRITE_SIZE }, () =>
    new Array<number>(SPRITE_SIZE).fill(-1));

  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (!mask[y]![x]) continue;
      const above = y > 0 && mask[y - 1]![x];
      const below = y < SPRITE_SIZE - 1 && mask[y + 1]![x];
      if (!above) grid[y]![x] = 3;       // borda de cima = luz
      else if (!below) grid[y]![x] = 1;  // borda de baixo = sombra
      else grid[y]![x] = 2;              // interior = base
    }
  }

  // 3) Contorno: vazio 4-adjacente a preenchido -> 0.
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (mask[y]![x]) continue;
      const touches =
        (y > 0 && mask[y - 1]![x]) ||
        (y < SPRITE_SIZE - 1 && mask[y + 1]![x]) ||
        (x > 0 && mask[y]![x - 1]) ||
        (x < SPRITE_SIZE - 1 && mask[y]![x + 1]);
      if (touches) grid[y]![x] = 0;
    }
  }

  return { grid, palette };
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npm test -- sprite`
Expected: PASS (7 testes).

- [ ] **Step 5: Typecheck e commit**

Run: `npm run typecheck`
Expected: sem erros.

```bash
git add src/embed/sprite.ts src/embed/sprite.test.ts
git commit -m "feat(embed): gerador procedural de pixel-art (simetria + sombreamento + contorno)"
```

---

### Task 4: Serialização SVG (`svg.ts`)

**Files:**
- Create: `src/embed/svg.ts`
- Test: `src/embed/svg.test.ts`

**Interfaces:**
- Consumes: tipo `Sprite` de `./sprite.js`.
- Produces: `escapeXml(s: string): string`, `spriteToRects(sprite: Sprite, ox: number, oy: number, cell: number): string`, `stars(prestige: number): string`, `truncate(s: string, max: number): string`. Consumidos por `render.ts`.

- [ ] **Step 1: Escrever o teste**

Create `src/embed/svg.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { escapeXml, spriteToRects, stars, truncate } from './svg.js';
import type { Sprite } from './sprite.js';

describe('escapeXml', () => {
  it('escapa os 5 caracteres especiais', () => {
    expect(escapeXml(`a&b<c>"d'e`)).toBe('a&amp;b&lt;c&gt;&quot;d&apos;e');
  });
});

describe('spriteToRects', () => {
  it('emite um <rect> por célula não-vazia com a cor da paleta', () => {
    const sprite: Sprite = {
      grid: [
        [-1, 0],
        [2, -1],
      ],
      palette: ['#000000', '#111111', '#222222', '#333333'],
    };
    const out = spriteToRects(sprite, 10, 20, 4);
    expect((out.match(/<rect /g) ?? []).length).toBe(2);
    expect(out).toContain('fill="#000000"'); // célula valor 0 (contorno)
    expect(out).toContain('fill="#222222"'); // célula valor 2 (base)
    // célula [0][1] (valor 0) -> x = 10 + 1*4 = 14; célula [1][0] (valor 2) -> x = 10.
    expect(out).toContain('x="14"');
  });

  it('posiciona pela origem e pelo tamanho da célula', () => {
    const sprite: Sprite = { grid: [[2]], palette: ['#000000', '#111111', '#222222', '#333333'] };
    expect(spriteToRects(sprite, 5, 7, 3)).toContain('x="5" y="7" width="3" height="3"');
  });
});

describe('truncate', () => {
  it('mantém strings dentro do limite', () => {
    expect(truncate('curto', 10)).toBe('curto');
  });
  it('encurta com elipse quando excede', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });
});

describe('stars', () => {
  it('mapeia prestígio 0–5 em 5 estrelas', () => {
    expect(stars(3)).toBe('★★★☆☆');
    expect(stars(0)).toBe('☆☆☆☆☆');
    expect(stars(5)).toBe('★★★★★');
  });
  it('clampa fora do intervalo', () => {
    expect(stars(9)).toBe('★★★★★');
    expect(stars(-2)).toBe('☆☆☆☆☆');
  });
});
```

Nota: o teste `x="11"` está errado de propósito? Não — corrija mentalmente: a célula `[0][1]` (valor 0) fica em `x = 10 + 1*4 = 14`; a célula `[1][0]` (valor 2) fica em `x = 10 + 0*4 = 10`. Ajuste a asserção para `expect(out).toContain('x="14"')`.

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npm test -- svg`
Expected: FAIL (não existe `./svg.js`).

- [ ] **Step 3: Implementar**

Create `src/embed/svg.ts`:

```ts
import type { Sprite } from './sprite.js';

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Emite <rect> para cada célula não-vazia, na origem (ox,oy), com lado `cell`. */
export function spriteToRects(sprite: Sprite, ox: number, oy: number, cell: number): string {
  const { grid, palette } = sprite;
  const parts: string[] = [];
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y]!;
    for (let x = 0; x < row.length; x++) {
      const v = row[x]!;
      if (v < 0) continue;
      const color = palette[v]!;
      const px = ox + x * cell;
      const py = oy + y * cell;
      parts.push(`<rect x="${px}" y="${py}" width="${cell}" height="${cell}" fill="${color}"/>`);
    }
  }
  return parts.join('');
}

/** Prestígio 0–5 -> 5 estrelas (preenchidas + vazias). */
export function stars(prestige: number): string {
  const n = prestige < 0 ? 0 : prestige > 5 ? 5 : Math.round(prestige);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/** Encurta `s` para no máximo `max` caracteres, com elipse. */
export function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + '…';
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npm test -- svg`
Expected: PASS (7 testes).

- [ ] **Step 5: Typecheck e commit**

Run: `npm run typecheck`
Expected: sem erros.

```bash
git add src/embed/svg.ts src/embed/svg.test.ts
git commit -m "feat(embed): helpers de serialização SVG (escape, grid->rect, estrelas)"
```

---

### Task 5: Composição do embed (`render.ts`)

**Files:**
- Create: `src/embed/render.ts`
- Test: `src/embed/render.test.ts`

**Interfaces:**
- Consumes: `buildSprite` de `./sprite.js`; `escapeXml`, `spriteToRects`, `stars` de `./svg.js`; tipos `Ecosystem`, `BiomePopulation` de `../domain/types.js`. Nos testes: `computeEcosystem` de `../engine/ecosystem.js` e `PROFILE_EXEMPLO` de `../fixtures/profile-exemplo.js`.
- Produces: `renderEmbed(ecosystem: Ecosystem): string`. Consumido por `src/embed-cli.ts`.

- [ ] **Step 1: Escrever o teste**

Create `src/embed/render.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderEmbed } from './render.js';
import { computeEcosystem } from '../engine/ecosystem.js';
import { PROFILE_EXEMPLO } from '../fixtures/profile-exemplo.js';
import type { Ecosystem } from '../domain/types.js';

const FIXED = new Date('2025-01-01T00:00:00Z');

describe('renderEmbed', () => {
  const eco = computeEcosystem(PROFILE_EXEMPLO, FIXED);

  it('produz um SVG bem-formado', () => {
    const svg = renderEmbed(eco);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="0 0 560 200"');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('é determinístico', () => {
    expect(renderEmbed(eco)).toBe(renderEmbed(eco));
  });

  it('mostra login e biodiversidade', () => {
    const svg = renderEmbed(eco);
    expect(svg).toContain(`@${eco.login}`);
    expect(svg).toContain(`biodiversidade: ${eco.biodiversidade}`);
  });

  it('não embute recurso remoto (sem href nem <image>)', () => {
    // Obs.: o SVG contém o xmlns "http://www.w3.org/2000/svg" — isso é namespace, não fetch.
    const svg = renderEmbed(eco);
    expect(svg).not.toContain('href=');
    expect(svg).not.toContain('<image');
  });

  it('escapa caracteres especiais do login', () => {
    const malicioso: Ecosystem = { ...eco, login: 'a<b&c' };
    const svg = renderEmbed(malicioso);
    expect(svg).toContain('a&lt;b&amp;c');
    expect(svg).not.toContain('a<b&c');
  });

  it('reserva vazia: estado simpático, sem quebrar', () => {
    const vazio: Ecosystem = {
      login: 'novato', avatarUrl: '', biomes: [], biodiversidade: 0, rarest: null, totalEspecimes: 0,
    };
    const svg = renderEmbed(vazio);
    expect(svg).toContain('Reserva vazia');
    expect(svg.startsWith('<svg')).toBe(true);
  });

  it('rarest nulo com biomas populados não quebra o rodapé', () => {
    const semRaro: Ecosystem = { ...eco, rarest: null };
    expect(() => renderEmbed(semRaro)).not.toThrow();
  });

  it('snapshot estável do SVG completo', () => {
    expect(renderEmbed(eco)).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npm test -- render`
Expected: FAIL (não existe `./render.js`).

- [ ] **Step 3: Implementar**

Create `src/embed/render.ts`:

```ts
import type { Ecosystem, BiomePopulation } from '../domain/types.js';
import { buildSprite } from './sprite.js';
import { escapeXml, spriteToRects, stars, truncate } from './svg.js';

const WIDTH = 560;
const HEIGHT = 200;
const BG = '#0d1117';
const FG = '#e6edf3';
const MUTED = '#8b949e';
const MAX_BIOMES = 3;
const MAX_SPECIMENS = 3;
const CELL = 3;                  // px por pixel do sprite
const SPRITE_PX = 16 * CELL;     // 48px
const GAP = 6;

export function renderEmbed(ecosystem: Ecosystem): string {
  const inner = ecosystem.totalEspecimes === 0 || ecosystem.biomes.length === 0
    ? renderEmpty(ecosystem)
    : renderPopulated(ecosystem);
  return wrap(inner);
}

function wrap(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" `
    + `width="${WIDTH}" height="${HEIGHT}" font-family="monospace" style="image-rendering:pixelated">`
    + `<rect width="${WIDTH}" height="${HEIGHT}" rx="10" fill="${BG}"/>`
    + inner
    + `</svg>`;
}

function header(ecosystem: Ecosystem): string {
  const login = escapeXml(truncate(ecosystem.login, 20));
  return `<text x="16" y="28" fill="${FG}" font-size="16" font-weight="bold">🪲 BugDex · @${login}</text>`
    + `<text x="${WIDTH - 16}" y="28" fill="${MUTED}" font-size="13" text-anchor="end">`
    + `biodiversidade: ${ecosystem.biodiversidade}</text>`;
}

function renderPopulated(ecosystem: Ecosystem): string {
  const biomes = ecosystem.biomes.slice(0, MAX_BIOMES);
  const colWidth = (WIDTH - 32) / biomes.length;
  let out = header(ecosystem);
  biomes.forEach((bp, i) => {
    out += biomeColumn(bp, 16 + i * colWidth, colWidth);
  });
  return out + footer(ecosystem);
}

function biomeColumn(bp: BiomePopulation, x0: number, colWidth: number): string {
  const label = `${bp.biome.emoji} ${escapeXml(bp.biome.nome)}`;
  let out = `<text x="${Math.round(x0 + colWidth / 2)}" y="62" fill="${FG}" font-size="12" `
    + `text-anchor="middle">${label}</text>`;

  const specimens = bp.specimens.slice(0, MAX_SPECIMENS);
  const totalW = specimens.length * SPRITE_PX + Math.max(0, specimens.length - 1) * GAP;
  let sx = x0 + (colWidth - totalW) / 2;
  const sy = 78;
  for (const s of specimens) {
    const sprite = buildSprite(s.species.spriteKey, s.stage, s.morph, s.species.biomeId);
    out += spriteToRects(sprite, Math.round(sx), sy, CELL);
    sx += SPRITE_PX + GAP;
  }
  return out;
}

function footer(ecosystem: Ecosystem): string {
  const r = ecosystem.rarest;
  if (!r) {
    return `<text x="16" y="${HEIGHT - 16}" fill="${MUTED}" font-size="12">`
      + `Ainda sem espécime de destaque — continue programando!</text>`;
  }
  const morphTag = r.morph === 'normal' ? '' : ` (${r.morph})`;
  const text = `raríssimo: ${escapeXml(truncate(r.species.nome, 24))}${morphTag} ${stars(r.prestige)}`;
  return `<text x="16" y="${HEIGHT - 16}" fill="${FG}" font-size="12">${text}</text>`;
}

function renderEmpty(ecosystem: Ecosystem): string {
  return header(ecosystem)
    + `<text x="${WIDTH / 2}" y="${HEIGHT / 2}" fill="${FG}" font-size="14" `
    + `text-anchor="middle">Reserva vazia 🪲</text>`
    + `<text x="${WIDTH / 2}" y="${HEIGHT / 2 + 22}" fill="${MUTED}" font-size="12" `
    + `text-anchor="middle">Crie repositórios públicos e volte para ver seu ecossistema nascer.</text>`;
}
```

- [ ] **Step 4: Rodar o teste e ver passar (gera o snapshot)**

Run: `npm test -- render`
Expected: PASS (8 testes; o snapshot é criado em `src/embed/__snapshots__/render.test.ts.snap` na primeira execução).

- [ ] **Step 5: Inspeção visual rápida (opcional, recomendada)**

Confira o `.snap` gerado: deve conter `<svg`, três rótulos de bioma e blocos de `<rect>`. Se quiser ver no browser, aguarde a Task 6 (CLI) — ou cole o conteúdo do snapshot num arquivo `.svg` temporário no scratchpad.

- [ ] **Step 6: Typecheck e commit**

Run: `npm run typecheck`
Expected: sem erros.

```bash
git add src/embed/render.ts src/embed/render.test.ts src/embed/__snapshots__/
git commit -m "feat(embed): renderEmbed compõe a faixa-diorama SVG (+ estado vazio)"
```

---

### Task 6: CLI + script + .gitignore + README

**Files:**
- Create: `src/embed-cli.ts`
- Modify: `package.json` (adicionar script `embed`)
- Modify: `.gitignore` (adicionar `.embed/`)
- Modify: `README.md` (seção de uso do embed)

**Interfaces:**
- Consumes: `FileSnapshotStore` de `./store/file-store.js`; `renderEmbed` de `./embed/render.js`.
- Produces: comando `npm run embed -- <login>` que grava `.embed/<login>.svg`. Sem exports (entrypoint).

- [ ] **Step 1: Implementar a CLI**

Create `src/embed-cli.ts` (espelha `src/ingest-cli.ts`; usa top-level await como a CLI da Fase 2a):

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { FileSnapshotStore } from './store/file-store.js';
import { renderEmbed } from './embed/render.js';

const login = process.argv[2];

if (!login) {
  console.error('Uso: npm run embed -- <login-github>');
  process.exit(1);
}

const store = new FileSnapshotStore('.snapshots');
const snap = await store.get(login);

if (!snap) {
  console.error(`Sem snapshot para @${login}. Rode antes: npm run ingest -- ${login}`);
  process.exit(1);
}

const svg = renderEmbed(snap.ecosystem);
await mkdir('.embed', { recursive: true });
const file = join('.embed', `${login.toLowerCase().replace(/[^a-z0-9-]/g, '_')}.svg`);
await writeFile(file, svg, 'utf8');
console.log(`SVG do embed gravado em ${file}`);
```

- [ ] **Step 2: Adicionar o script ao package.json**

Em `package.json`, dentro de `"scripts"`, adicione a linha após `"ingest"`:

```json
    "ingest": "tsx src/ingest-cli.ts",
    "embed": "tsx src/embed-cli.ts"
```

(Garanta a vírgula correta após a linha `ingest`.)

- [ ] **Step 3: Ignorar a saída no git**

Em `.gitignore`, adicione (se ainda não houver):

```
# Saída local do embed SVG (não versionada)
.embed/
```

- [ ] **Step 4: Documentar no README**

Em `README.md`, após a seção "Rodar a ingestão (smoke manual)", adicione:

```markdown
### Gerar o embed SVG (smoke manual)

Após ter um snapshot (via `npm run ingest`), gere o SVG do perfil:

```bash
npm run embed -- <login-github>
```

Lê `.snapshots/<login>.json` e grava `.embed/<login>.svg` — abra no browser para inspecionar.
```

- [ ] **Step 5: Rodar a suíte completa e o typecheck**

Run: `npm test`
Expected: PASS (todos os testes das fases anteriores + os novos de `src/embed/`).

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 6: Smoke da CLI (sem snapshot -> mensagem orientadora)**

Run: `npm run embed -- nao-existe-xyz`
Expected: imprime `Sem snapshot para @nao-existe-xyz. Rode antes: npm run ingest -- nao-existe-xyz` e sai com código 1. (Não gera arquivo.)

- [ ] **Step 7: Commit**

```bash
git add src/embed-cli.ts package.json .gitignore README.md
git commit -m "feat(embed): CLI de embed + script npm + .gitignore + docs"
```

---

## Notas finais

- **Determinismo end-to-end:** `renderEmbed` depende só do `Ecosystem` (puro) e de `buildSprite`/paleta (puros via `stableHash`). Sem relógio/rede/aleatório fora da CLI — snapshot tests são estáveis entre máquinas.
- **Limites de exibição** (`MAX_BIOMES=3`, `MAX_SPECIMENS=3`, `CELL=3`) são ajustáveis: se quiser revisar a estética, mude as constantes em `render.ts` e regenere o snapshot (`npm test -- render -u`).
- **Próxima fase natural:** servir `renderEmbed` numa rota HTTP `GET /{login}.svg` com headers de cache (gotcha do Camo) na fase do `web-app`, e/ou a fase de conteúdo que substitui os sprites procedurais por pixel-art real no mesmo formato `{grid, palette}`.
