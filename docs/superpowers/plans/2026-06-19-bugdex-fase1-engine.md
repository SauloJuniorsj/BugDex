# BugDex — Fase 1: Engine + Conteúdo (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o núcleo determinístico do BugDex — funções puras que transformam dados normalizados de um perfil do GitHub num modelo de ecossistema (biomas, espécimes, metamorfose, morphs raros) — junto com o dataset de conteúdo curado, tudo coberto por testes.

**Architecture:** TypeScript puro, sem infraestrutura. Três camadas isoladas: `domain` (tipos), `content` (dados curados: biomas + espécies), `engine` (funções puras de mapeamento). Nenhuma função do engine lê relógio/rede — `now` é injetado como parâmetro, garantindo determinismo total. As Fases 2 (app web/OAuth/fetch) e 3 (embed SVG) consomem este pacote sem alterá-lo.

**Tech Stack:** Node 20+, TypeScript 5 (strict), Vitest (testes), tsx (script de demo). Sem dependências de runtime.

## Global Constraints

- Node.js **>= 20**; `package.json` com `"type": "module"` (ESM).
- TypeScript em **strict mode** (`"strict": true`); proibido `any` implícito.
- **Determinismo:** nenhuma função em `src/engine/**` ou `src/content/**` pode chamar `Date.now()`, `new Date()` sem argumento, `Math.random()` ou I/O. O tempo entra sempre como parâmetro `now: Date`.
- Idioma do conteúdo e dos identificadores de domínio: **português** (nomes de biomas/espécies em pt-BR; ids em kebab-case ASCII).
- Testes co-localizados como `*.test.ts` ao lado do código.
- Commits pequenos e frequentes, um por task (mensagens em pt-BR, prefixo Conventional Commits).

---

### Task 1: Scaffold do projeto TypeScript + Vitest

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/sanity.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: ambiente onde `npm test` roda Vitest e `npm run demo` roda tsx.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "bugdex",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "demo": "tsx src/demo.ts"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Criar `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Escrever um teste de sanidade**

Create `src/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('roda o test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Instalar dependências e rodar os testes**

Run: `npm install && npm test`
Expected: PASS — 1 teste passa (`sanity > roda o test runner`).

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json src/sanity.test.ts package-lock.json
git commit -m "chore: scaffold TypeScript + Vitest"
```

---

### Task 2: Tipos de domínio

**Files:**
- Create: `src/domain/types.ts`
- Test: `src/domain/types.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: todos os tipos abaixo, importados por `content` e `engine`:
  `MorphType`, `MetamorphosisStage`, `Species`, `Biome`, `NormalizedRepo`, `NormalizedProfile`, `Specimen`, `BiomePopulation`, `Ecosystem`.

- [ ] **Step 1: Escrever o teste (compila-e-usa os tipos)**

Create `src/domain/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Species, NormalizedRepo, Ecosystem } from './types.js';

describe('domain types', () => {
  it('permite montar objetos válidos dos tipos principais', () => {
    const sp: Species = {
      id: 'joaninha',
      nome: 'Joaninha',
      biomeId: 'jardim',
      spriteKey: 'joaninha',
      curiosidade: 'Devora milhares de pulgões ao longo da vida.',
    };
    const repo: NormalizedRepo = {
      id: 'r1',
      name: 'meu-repo',
      primaryLanguage: 'TypeScript',
      stars: 12,
      commitCount: 40,
      createdAt: '2024-01-01T00:00:00Z',
      pushedAt: '2024-06-01T00:00:00Z',
    };
    const eco: Ecosystem = {
      login: 'fulano',
      avatarUrl: '',
      biomes: [],
      biodiversidade: 0,
      rarest: null,
      totalEspecimes: 0,
    };
    expect(sp.biomeId).toBe('jardim');
    expect(repo.primaryLanguage).toBe('TypeScript');
    expect(eco.rarest).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/domain/types.test.ts`
Expected: FAIL — `Cannot find module './types.js'`.

- [ ] **Step 3: Implementar os tipos**

Create `src/domain/types.ts`:

```ts
export type MorphType = 'normal' | 'shiny' | 'albino' | 'melanico';

export type MetamorphosisStage = 'ovo' | 'larva' | 'pupa' | 'adulto';

export interface Species {
  id: string;
  nome: string;
  biomeId: string;
  spriteKey: string;
  curiosidade: string;
}

export interface Biome {
  id: string;
  nome: string;
  emoji: string;
  /** Nomes canônicos de linguagem que caem neste bioma (case-insensitive). */
  languages: string[];
  /** Pool de espécies (ids referenciando Species.id). */
  speciesIds: string[];
}

export interface NormalizedRepo {
  id: string;
  name: string;
  primaryLanguage: string | null;
  stars: number;
  commitCount: number;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601 — última atividade (push). */
  pushedAt: string;
}

export interface NormalizedProfile {
  login: string;
  avatarUrl: string;
  /** Bytes por linguagem agregados nos repos. */
  languageBytes: Record<string, number>;
  repos: NormalizedRepo[];
}

export interface Specimen {
  repoName: string;
  species: Species;
  stage: MetamorphosisStage;
  morph: MorphType;
  /** 0–5, derivado de stars. */
  prestige: number;
}

export interface BiomePopulation {
  biome: Biome;
  specimens: Specimen[];
}

export interface Ecosystem {
  login: string;
  avatarUrl: string;
  /** Apenas biomas com >= 1 espécime, ordenados por proeminência. */
  biomes: BiomePopulation[];
  /** Nº de espécies distintas. */
  biodiversidade: number;
  rarest: Specimen | null;
  totalEspecimes: number;
}
```

- [ ] **Step 4: Rodar o teste para vê-lo passar**

Run: `npx vitest run src/domain/types.test.ts && npm run typecheck`
Expected: PASS + typecheck sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/types.test.ts
git commit -m "feat(domain): tipos de domínio do ecossistema"
```

---

### Task 3: Util de hash estável

**Files:**
- Create: `src/util/hash.ts`
- Test: `src/util/hash.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `stableHash(input: string): number` — inteiro sem sinal 32-bit, determinístico (mesma string → mesmo número, em qualquer máquina/processo).

- [ ] **Step 1: Escrever o teste**

Create `src/util/hash.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { stableHash } from './hash.js';

describe('stableHash', () => {
  it('é determinístico para a mesma entrada', () => {
    expect(stableHash('r1:morph')).toBe(stableHash('r1:morph'));
  });

  it('retorna inteiro >= 0 dentro do range 32-bit', () => {
    const h = stableHash('qualquer-coisa');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it('produz valores diferentes para entradas diferentes (sem colisão trivial)', () => {
    expect(stableHash('r1:species')).not.toBe(stableHash('r2:species'));
    expect(stableHash('abc')).not.toBe(stableHash('abd'));
  });
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/util/hash.test.ts`
Expected: FAIL — `Cannot find module './hash.js'`.

- [ ] **Step 3: Implementar (djb2)**

Create `src/util/hash.ts`:

```ts
/**
 * Hash djb2 determinístico. Retorna inteiro sem sinal de 32 bits.
 * Não usa nada que dependa de ambiente — mesmo input sempre dá mesmo output.
 */
export function stableHash(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    // hash * 33 + charCode, mantido em 32 bits.
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}
```

- [ ] **Step 4: Rodar o teste para vê-lo passar**

Run: `npx vitest run src/util/hash.test.ts`
Expected: PASS — 3 testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/util/hash.ts src/util/hash.test.ts
git commit -m "feat(util): hash estável djb2"
```

---

### Task 4: Conteúdo — espécies

**Files:**
- Create: `src/content/species.ts`
- Test: `src/content/species.test.ts`

**Interfaces:**
- Consumes: `Species` (Task 2).
- Produces: `ALL_SPECIES: Species[]` e `getSpeciesById(id: string): Species` (lança se não existir). Cada `Species.biomeId` referencia um bioma definido na Task 5.

- [ ] **Step 1: Escrever o teste de integridade do dataset**

Create `src/content/species.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ALL_SPECIES, getSpeciesById } from './species.js';

describe('species dataset', () => {
  it('tem ids únicos', () => {
    const ids = ALL_SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('toda espécie tem nome, spriteKey e curiosidade não-vazios', () => {
    for (const s of ALL_SPECIES) {
      expect(s.nome.length).toBeGreaterThan(0);
      expect(s.spriteKey.length).toBeGreaterThan(0);
      expect(s.curiosidade.length).toBeGreaterThan(0);
    }
  });

  it('getSpeciesById encontra e lança em id inexistente', () => {
    expect(getSpeciesById('joaninha').nome).toBe('Joaninha');
    expect(() => getSpeciesById('nao-existe')).toThrow();
  });
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/content/species.test.ts`
Expected: FAIL — `Cannot find module './species.js'`.

- [ ] **Step 3: Implementar o dataset (34 espécies reais com curiosidades verdadeiras)**

Create `src/content/species.ts`:

```ts
import type { Species } from '../domain/types.js';

export const ALL_SPECIES: Species[] = [
  // Jardim (jardim)
  { id: 'joaninha', nome: 'Joaninha', biomeId: 'jardim', spriteKey: 'joaninha', curiosidade: 'Devora milhares de pulgões ao longo da vida — controle natural de pragas.' },
  { id: 'abelha', nome: 'Abelha-europeia', biomeId: 'jardim', spriteKey: 'abelha', curiosidade: 'Comunica onde estão as flores pela "dança do requebrado".' },
  { id: 'monarca', nome: 'Borboleta-monarca', biomeId: 'jardim', spriteKey: 'monarca', curiosidade: 'Migra até ~4.000 km entre a América do Norte e o México.' },
  { id: 'vagalume', nome: 'Vaga-lume', biomeId: 'jardim', spriteKey: 'vagalume', curiosidade: 'Emite "luz fria" por bioluminescência (luciferina + luciferase).' },

  // Selva (selva)
  { id: 'formiga-cortadeira', nome: 'Formiga-cortadeira', biomeId: 'selva', spriteKey: 'formiga-cortadeira', curiosidade: 'Cultiva um fungo subterrâneo do qual se alimenta — "agricultura" há milhões de anos.' },
  { id: 'mariposa-atlas', nome: 'Mariposa-atlas', biomeId: 'selva', spriteKey: 'mariposa-atlas', curiosidade: 'Tem uma das maiores áreas de asa do mundo (até ~24 cm de envergadura).' },
  { id: 'besouro-hercules', nome: 'Besouro-hércules', biomeId: 'selva', spriteKey: 'besouro-hercules', curiosidade: 'Ergue muitas vezes o próprio peso; o macho tem um chifre enorme.' },
  { id: 'morpho-azul', nome: 'Borboleta-morpho-azul', biomeId: 'selva', spriteKey: 'morpho-azul', curiosidade: 'O azul não é pigmento: vem da nanoestrutura das escamas (cor estrutural).' },

  // Campo Vulcânico (vulcanico)
  { id: 'besouro-bombardeiro', nome: 'Besouro-bombardeiro', biomeId: 'vulcanico', spriteKey: 'besouro-bombardeiro', curiosidade: 'Dispara um jato químico fervente (~100 °C) como defesa.' },
  { id: 'formiga-de-fogo', nome: 'Formiga-de-fogo', biomeId: 'vulcanico', spriteKey: 'formiga-de-fogo', curiosidade: 'Forma jangadas vivas flutuantes para sobreviver a enchentes.' },
  { id: 'escaravelho-rinoceronte', nome: 'Escaravelho-rinoceronte', biomeId: 'vulcanico', spriteKey: 'escaravelho-rinoceronte', curiosidade: 'Está entre os animais mais fortes em relação ao próprio peso.' },
  { id: 'vespa-gigante', nome: 'Vespa-asiática-gigante', biomeId: 'vulcanico', spriteKey: 'vespa-gigante', curiosidade: 'É a maior vespa do mundo e uma predadora voraz de outros insetos.' },

  // Caverna (caverna)
  { id: 'grilo-caverna', nome: 'Grilo-das-cavernas', biomeId: 'caverna', spriteKey: 'grilo-caverna', curiosidade: 'Tem antenas e pernas longuíssimas para se orientar no escuro total.' },
  { id: 'traca-prateada', nome: 'Traça-prateada', biomeId: 'caverna', spriteKey: 'traca-prateada', curiosidade: 'Inseto sem asas tão antigo que já existia antes dos dinossauros.' },
  { id: 'besouro-cego', nome: 'Besouro-troglóbio', biomeId: 'caverna', spriteKey: 'besouro-cego', curiosidade: 'Muitos perderam olhos e pigmento por viver a vida toda no escuro.' },
  { id: 'mosquito-fungo', nome: 'Mosquito-fungo', biomeId: 'caverna', spriteKey: 'mosquito-fungo', curiosidade: 'Larvas de algumas espécies brilham para atrair presas no teto das grutas.' },

  // Savana (savana)
  { id: 'gafanhoto', nome: 'Gafanhoto', biomeId: 'savana', spriteKey: 'gafanhoto', curiosidade: 'Salta muitas vezes o tamanho do próprio corpo.' },
  { id: 'cupim', nome: 'Cupim', biomeId: 'savana', spriteKey: 'cupim', curiosidade: 'Constrói montículos com ventilação natural que regulam a temperatura.' },
  { id: 'rola-bosta', nome: 'Besouro-rola-bosta', biomeId: 'savana', spriteKey: 'rola-bosta', curiosidade: 'Orienta-se pela luz da Via Láctea para rolar a bolota em linha reta.' },
  { id: 'formiga-leao', nome: 'Formiga-leão', biomeId: 'savana', spriteKey: 'formiga-leao', curiosidade: 'A larva cava armadilhas em funil na areia para capturar presas.' },

  // Pântano (pantano)
  { id: 'libelula', nome: 'Libélula', biomeId: 'pantano', spriteKey: 'libelula', curiosidade: 'Uma das maiores taxas de sucesso de caça do reino animal (~95%).' },
  { id: 'mosquito', nome: 'Mosquito', biomeId: 'pantano', spriteKey: 'mosquito', curiosidade: 'Só as fêmeas picam: precisam de sangue para amadurecer os ovos.' },
  { id: 'alfaiate', nome: "Percevejo-d'água", biomeId: 'pantano', spriteKey: 'alfaiate', curiosidade: 'Anda sobre a água graças à tensão superficial e a pelos hidrofóbicos.' },
  { id: 'efemera', nome: 'Efeméride', biomeId: 'pantano', spriteKey: 'efemera', curiosidade: 'O adulto vive pouquíssimo (às vezes só horas) e nem se alimenta.' },

  // Deserto (deserto)
  { id: 'besouro-namibia', nome: 'Besouro-da-namíbia', biomeId: 'deserto', spriteKey: 'besouro-namibia', curiosidade: 'Coleta água da neblina na própria carapaça para beber.' },
  { id: 'formiga-prateada', nome: 'Formiga-prateada-do-saara', biomeId: 'deserto', spriteKey: 'formiga-prateada', curiosidade: 'Pelos prateados refletem o sol; é uma das formigas mais rápidas e resistentes ao calor.' },
  { id: 'locusta', nome: 'Gafanhoto-do-deserto', biomeId: 'deserto', spriteKey: 'locusta', curiosidade: 'Forma enxames gigantescos que migram por continentes inteiros.' },
  { id: 'escaravelho-sagrado', nome: 'Escaravelho-sagrado', biomeId: 'deserto', spriteKey: 'escaravelho-sagrado', curiosidade: 'Era reverenciado no Egito Antigo como símbolo do sol nascente.' },

  // Bosque Temperado (bosque)
  { id: 'cigarra', nome: 'Cigarra', biomeId: 'bosque', spriteKey: 'cigarra', curiosidade: 'Ninfas de algumas espécies vivem 13–17 anos no subsolo antes de emergir.' },
  { id: 'louva-a-deus', nome: 'Louva-a-deus', biomeId: 'bosque', spriteKey: 'louva-a-deus', curiosidade: 'Gira a cabeça ~180° e, às vezes, a fêmea devora o macho.' },
  { id: 'bicho-pau', nome: 'Bicho-pau', biomeId: 'bosque', spriteKey: 'bicho-pau', curiosidade: 'Mestre da camuflagem; algumas fêmeas se reproduzem sem macho (partenogênese).' },
  { id: 'mariposa-luna', nome: 'Mariposa-luna', biomeId: 'bosque', spriteKey: 'mariposa-luna', curiosidade: 'O adulto não tem boca e não come — vive cerca de uma semana só para reproduzir.' },

  // Terreno Baldio / fallback (inexplorado)
  { id: 'barata', nome: 'Barata', biomeId: 'inexplorado', spriteKey: 'barata', curiosidade: 'Consegue sobreviver dias sem a cabeça, pois respira pelo corpo.' },
  { id: 'mosca-domestica', nome: 'Mosca-doméstica', biomeId: 'inexplorado', spriteKey: 'mosca-domestica', curiosidade: 'Sente o gosto da comida pelos pés — o paladar fica nas patas.' },
];

const BY_ID = new Map(ALL_SPECIES.map((s) => [s.id, s]));

export function getSpeciesById(id: string): Species {
  const s = BY_ID.get(id);
  if (!s) throw new Error(`Espécie desconhecida: ${id}`);
  return s;
}
```

- [ ] **Step 4: Rodar o teste para vê-lo passar**

Run: `npx vitest run src/content/species.test.ts`
Expected: PASS — 3 testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/content/species.ts src/content/species.test.ts
git commit -m "feat(content): dataset de espécies com curiosidades"
```

---

### Task 5: Conteúdo — biomas + mapa de linguagens

**Files:**
- Create: `src/content/biomes.ts`
- Test: `src/content/biomes.test.ts`

**Interfaces:**
- Consumes: `Biome` (Task 2), `ALL_SPECIES` (Task 4).
- Produces:
  - `ALL_BIOMES: Biome[]`
  - `INEXPLORADO_ID = 'inexplorado'`
  - `biomeForLanguage(language: string | null): Biome` — case-insensitive; `null`/desconhecida → bioma `inexplorado`.
  - `getBiomeById(id: string): Biome` (lança se não existir).

- [ ] **Step 1: Escrever o teste**

Create `src/content/biomes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ALL_BIOMES, biomeForLanguage, getBiomeById, INEXPLORADO_ID } from './biomes.js';
import { ALL_SPECIES } from './species.js';

describe('biomes dataset', () => {
  it('tem ids únicos e todo bioma tem pelo menos uma espécie', () => {
    const ids = ALL_BIOMES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of ALL_BIOMES) {
      expect(b.speciesIds.length).toBeGreaterThan(0);
    }
  });

  it('todo speciesId referencia uma espécie existente, e vice-versa', () => {
    const speciesIds = new Set(ALL_SPECIES.map((s) => s.id));
    for (const b of ALL_BIOMES) {
      for (const sid of b.speciesIds) {
        expect(speciesIds.has(sid)).toBe(true);
      }
    }
    // toda espécie pertence a exatamente um bioma listado
    for (const s of ALL_SPECIES) {
      const owner = ALL_BIOMES.find((b) => b.speciesIds.includes(s.id));
      expect(owner?.id).toBe(s.biomeId);
    }
  });

  it('mapeia linguagem para bioma (case-insensitive)', () => {
    expect(biomeForLanguage('TypeScript').id).toBe('jardim');
    expect(biomeForLanguage('typescript').id).toBe('jardim');
    expect(biomeForLanguage('Python').id).toBe('selva');
    expect(biomeForLanguage('Rust').id).toBe('vulcanico');
  });

  it('linguagem desconhecida ou null cai no bioma inexplorado', () => {
    expect(biomeForLanguage('Brainfuck').id).toBe(INEXPLORADO_ID);
    expect(biomeForLanguage(null).id).toBe(INEXPLORADO_ID);
  });

  it('getBiomeById lança em id inexistente', () => {
    expect(getBiomeById('jardim').nome).toBeTruthy();
    expect(() => getBiomeById('nada')).toThrow();
  });
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/content/biomes.test.ts`
Expected: FAIL — `Cannot find module './biomes.js'`.

- [ ] **Step 3: Implementar biomas + mapa**

Create `src/content/biomes.ts`:

```ts
import type { Biome } from '../domain/types.js';

export const INEXPLORADO_ID = 'inexplorado';

export const ALL_BIOMES: Biome[] = [
  {
    id: 'jardim', nome: 'Jardim Exuberante', emoji: '🌼',
    languages: ['JavaScript', 'TypeScript'],
    speciesIds: ['joaninha', 'abelha', 'monarca', 'vagalume'],
  },
  {
    id: 'selva', nome: 'Selva Tropical', emoji: '🌿',
    languages: ['Python'],
    speciesIds: ['formiga-cortadeira', 'mariposa-atlas', 'besouro-hercules', 'morpho-azul'],
  },
  {
    id: 'vulcanico', nome: 'Campo Vulcânico', emoji: '🌋',
    languages: ['Rust'],
    speciesIds: ['besouro-bombardeiro', 'formiga-de-fogo', 'escaravelho-rinoceronte', 'vespa-gigante'],
  },
  {
    id: 'caverna', nome: 'Caverna Profunda', emoji: '🪨',
    languages: ['C', 'C++'],
    speciesIds: ['grilo-caverna', 'traca-prateada', 'besouro-cego', 'mosquito-fungo'],
  },
  {
    id: 'savana', nome: 'Savana Dourada', emoji: '🌾',
    languages: ['Go'],
    speciesIds: ['gafanhoto', 'cupim', 'rola-bosta', 'formiga-leao'],
  },
  {
    id: 'pantano', nome: 'Pântano Brumoso', emoji: '🐊',
    languages: ['Java', 'Kotlin'],
    speciesIds: ['libelula', 'mosquito', 'alfaiate', 'efemera'],
  },
  {
    id: 'deserto', nome: 'Deserto Árido', emoji: '🏜️',
    languages: ['Ruby', 'PHP'],
    speciesIds: ['besouro-namibia', 'formiga-prateada', 'locusta', 'escaravelho-sagrado'],
  },
  {
    id: 'bosque', nome: 'Bosque Temperado', emoji: '🍂',
    languages: ['C#', 'Swift'],
    speciesIds: ['cigarra', 'louva-a-deus', 'bicho-pau', 'mariposa-luna'],
  },
  {
    id: INEXPLORADO_ID, nome: 'Terreno Baldio', emoji: '🌫️',
    languages: [],
    speciesIds: ['barata', 'mosca-domestica'],
  },
];

const BY_ID = new Map(ALL_BIOMES.map((b) => [b.id, b]));

const BY_LANGUAGE = new Map<string, Biome>();
for (const b of ALL_BIOMES) {
  for (const lang of b.languages) {
    BY_LANGUAGE.set(lang.toLowerCase(), b);
  }
}

export function getBiomeById(id: string): Biome {
  const b = BY_ID.get(id);
  if (!b) throw new Error(`Bioma desconhecido: ${id}`);
  return b;
}

export function biomeForLanguage(language: string | null): Biome {
  if (!language) return getBiomeById(INEXPLORADO_ID);
  return BY_LANGUAGE.get(language.toLowerCase()) ?? getBiomeById(INEXPLORADO_ID);
}
```

- [ ] **Step 4: Rodar o teste para vê-lo passar**

Run: `npx vitest run src/content/biomes.test.ts`
Expected: PASS — 5 testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/content/biomes.ts src/content/biomes.test.ts
git commit -m "feat(content): biomas e mapa linguagem→bioma"
```

---

### Task 6: Engine — seleção de espécie por repo

**Files:**
- Create: `src/engine/species-pick.ts`
- Test: `src/engine/species-pick.test.ts`

**Interfaces:**
- Consumes: `NormalizedRepo`, `Biome`, `Species` (Task 2); `stableHash` (Task 3); `getSpeciesById` (Task 4).
- Produces: `speciesForRepo(repo: NormalizedRepo, biome: Biome): Species` — escolhe deterministicamente uma espécie do pool do bioma.

- [ ] **Step 1: Escrever o teste**

Create `src/engine/species-pick.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { speciesForRepo } from './species-pick.js';
import { getBiomeById } from '../content/biomes.js';
import type { NormalizedRepo } from '../domain/types.js';

const baseRepo: NormalizedRepo = {
  id: 'r1', name: 'x', primaryLanguage: 'TypeScript',
  stars: 0, commitCount: 10, createdAt: '2024-01-01T00:00:00Z', pushedAt: '2024-02-01T00:00:00Z',
};

describe('speciesForRepo', () => {
  it('é determinístico para o mesmo repo+bioma', () => {
    const jardim = getBiomeById('jardim');
    expect(speciesForRepo(baseRepo, jardim).id).toBe(speciesForRepo(baseRepo, jardim).id);
  });

  it('sempre retorna uma espécie pertencente ao pool do bioma', () => {
    const jardim = getBiomeById('jardim');
    for (let i = 0; i < 50; i++) {
      const repo = { ...baseRepo, id: `r${i}` };
      expect(jardim.speciesIds).toContain(speciesForRepo(repo, jardim).id);
    }
  });

  it('repos diferentes tendem a mapear para espécies diferentes', () => {
    const jardim = getBiomeById('jardim');
    const a = speciesForRepo({ ...baseRepo, id: 'aaa' }, jardim).id;
    const b = speciesForRepo({ ...baseRepo, id: 'zzz' }, jardim).id;
    // não garantimos sempre diferente, mas o hash não deve fixar tudo num só.
    const distintos = new Set(
      Array.from({ length: 20 }, (_, i) => speciesForRepo({ ...baseRepo, id: `id${i}` }, jardim).id),
    );
    expect(distintos.size).toBeGreaterThan(1);
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/engine/species-pick.test.ts`
Expected: FAIL — `Cannot find module './species-pick.js'`.

- [ ] **Step 3: Implementar**

Create `src/engine/species-pick.ts`:

```ts
import type { NormalizedRepo, Biome, Species } from '../domain/types.js';
import { stableHash } from '../util/hash.js';
import { getSpeciesById } from '../content/species.js';

/** Escolhe deterministicamente uma espécie do pool do bioma a partir do id do repo. */
export function speciesForRepo(repo: NormalizedRepo, biome: Biome): Species {
  const pool = biome.speciesIds;
  const idx = stableHash(`${repo.id}:species`) % pool.length;
  const speciesId = pool[idx]!; // pool nunca é vazio (garantido pelo teste da Task 5)
  return getSpeciesById(speciesId);
}
```

- [ ] **Step 4: Rodar o teste para vê-lo passar**

Run: `npx vitest run src/engine/species-pick.test.ts`
Expected: PASS — 3 testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/engine/species-pick.ts src/engine/species-pick.test.ts
git commit -m "feat(engine): seleção determinística de espécie por repo"
```

---

### Task 7: Engine — estágio de metamorfose

**Files:**
- Create: `src/engine/metamorphosis.ts`
- Test: `src/engine/metamorphosis.test.ts`

**Interfaces:**
- Consumes: `NormalizedRepo`, `MetamorphosisStage` (Task 2).
- Produces: `metamorphosisStage(repo: NormalizedRepo, now: Date): MetamorphosisStage`.

Regra (do design): `ovo` se quase sem commits; `larva` se jovem; `pupa` se maduro porém dormente; `adulto` se maduro e ativo.

- [ ] **Step 1: Escrever o teste**

Create `src/engine/metamorphosis.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { metamorphosisStage } from './metamorphosis.js';
import type { NormalizedRepo } from '../domain/types.js';

const NOW = new Date('2024-12-31T00:00:00Z');

function repo(over: Partial<NormalizedRepo>): NormalizedRepo {
  return {
    id: 'r', name: 'x', primaryLanguage: 'Go', stars: 0,
    commitCount: 100, createdAt: '2020-01-01T00:00:00Z', pushedAt: '2024-12-01T00:00:00Z',
    ...over,
  };
}

describe('metamorphosisStage', () => {
  it('ovo quando há pouquíssimos commits', () => {
    expect(metamorphosisStage(repo({ commitCount: 2 }), NOW)).toBe('ovo');
  });

  it('larva quando o repo é jovem (< 90 dias) e tem commits suficientes', () => {
    expect(metamorphosisStage(repo({ commitCount: 30, createdAt: '2024-12-01T00:00:00Z' }), NOW)).toBe('larva');
  });

  it('pupa quando é maduro mas está dormente (sem push há > 180 dias)', () => {
    expect(metamorphosisStage(repo({ commitCount: 200, createdAt: '2021-01-01T00:00:00Z', pushedAt: '2024-01-01T00:00:00Z' }), NOW)).toBe('pupa');
  });

  it('adulto quando é maduro e ativo', () => {
    expect(metamorphosisStage(repo({ commitCount: 200, createdAt: '2021-01-01T00:00:00Z', pushedAt: '2024-12-20T00:00:00Z' }), NOW)).toBe('adulto');
  });
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/engine/metamorphosis.test.ts`
Expected: FAIL — `Cannot find module './metamorphosis.js'`.

- [ ] **Step 3: Implementar**

Create `src/engine/metamorphosis.ts`:

```ts
import type { NormalizedRepo, MetamorphosisStage } from '../domain/types.js';

const DIA_MS = 86_400_000;
const COMMITS_MINIMOS = 5;
const JOVEM_DIAS = 90;
const DORMENTE_DIAS = 180;

export function metamorphosisStage(repo: NormalizedRepo, now: Date): MetamorphosisStage {
  if (repo.commitCount < COMMITS_MINIMOS) return 'ovo';

  const ageDays = (now.getTime() - new Date(repo.createdAt).getTime()) / DIA_MS;
  if (ageDays < JOVEM_DIAS) return 'larva';

  const sincePushDays = (now.getTime() - new Date(repo.pushedAt).getTime()) / DIA_MS;
  if (sincePushDays > DORMENTE_DIAS) return 'pupa';

  return 'adulto';
}
```

- [ ] **Step 4: Rodar o teste para vê-lo passar**

Run: `npx vitest run src/engine/metamorphosis.test.ts`
Expected: PASS — 4 testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/engine/metamorphosis.ts src/engine/metamorphosis.test.ts
git commit -m "feat(engine): estágio de metamorfose por repo"
```

---

### Task 8: Engine — morph raro + prestígio

**Files:**
- Create: `src/engine/morph.ts`
- Test: `src/engine/morph.test.ts`

**Interfaces:**
- Consumes: `NormalizedRepo`, `MorphType` (Task 2); `stableHash` (Task 3).
- Produces:
  - `morphForRepo(repo: NormalizedRepo): MorphType` — determinístico. Probabilidades: shiny 0,30%, albino 0,15%, melânico 0,10%, senão normal.
  - `morphRank(morph: MorphType): number` — normal=0, shiny=1, albino=2, melanico=3 (maior = mais raro).
  - `prestigeFromStars(stars: number): number` — 0–5.

- [ ] **Step 1: Escrever o teste**

Create `src/engine/morph.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { morphForRepo, morphRank, prestigeFromStars } from './morph.js';
import type { NormalizedRepo } from '../domain/types.js';

function repo(id: string): NormalizedRepo {
  return { id, name: 'x', primaryLanguage: 'Go', stars: 0, commitCount: 10, createdAt: '2024-01-01T00:00:00Z', pushedAt: '2024-02-01T00:00:00Z' };
}

describe('morphForRepo', () => {
  it('é determinístico', () => {
    expect(morphForRepo(repo('abc'))).toBe(morphForRepo(repo('abc')));
  });

  it('a esmagadora maioria é normal e morphs raros aparecem em proporção pequena', () => {
    let normal = 0, especiais = 0;
    for (let i = 0; i < 20000; i++) {
      const m = morphForRepo(repo(`repo-${i}`));
      if (m === 'normal') normal++; else especiais++;
    }
    expect(normal).toBeGreaterThan(especiais * 50); // < ~2% especiais
    expect(especiais).toBeGreaterThan(0);            // mas existem
  });
});

describe('morphRank', () => {
  it('ordena do comum ao raro', () => {
    expect(morphRank('normal')).toBe(0);
    expect(morphRank('melanico')).toBeGreaterThan(morphRank('albino'));
    expect(morphRank('albino')).toBeGreaterThan(morphRank('shiny'));
  });
});

describe('prestigeFromStars', () => {
  it('mapeia faixas de stars para 0–5', () => {
    expect(prestigeFromStars(0)).toBe(0);
    expect(prestigeFromStars(5)).toBe(1);
    expect(prestigeFromStars(30)).toBe(2);
    expect(prestigeFromStars(120)).toBe(3);
    expect(prestigeFromStars(500)).toBe(4);
    expect(prestigeFromStars(5000)).toBe(5);
  });
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/engine/morph.test.ts`
Expected: FAIL — `Cannot find module './morph.js'`.

- [ ] **Step 3: Implementar**

Create `src/engine/morph.ts`:

```ts
import type { NormalizedRepo, MorphType } from '../domain/types.js';
import { stableHash } from '../util/hash.js';

export function morphForRepo(repo: NormalizedRepo): MorphType {
  const r = stableHash(`${repo.id}:morph`) % 10_000;
  if (r < 30) return 'shiny';      // 0,30%
  if (r < 45) return 'albino';     // 0,15%
  if (r < 55) return 'melanico';   // 0,10%
  return 'normal';
}

const RANK: Record<MorphType, number> = { normal: 0, shiny: 1, albino: 2, melanico: 3 };

export function morphRank(morph: MorphType): number {
  return RANK[morph];
}

export function prestigeFromStars(stars: number): number {
  if (stars >= 1000) return 5;
  if (stars >= 200) return 4;
  if (stars >= 50) return 3;
  if (stars >= 10) return 2;
  if (stars >= 1) return 1;
  return 0;
}
```

- [ ] **Step 4: Rodar o teste para vê-lo passar**

Run: `npx vitest run src/engine/morph.test.ts`
Expected: PASS — 4 testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/engine/morph.ts src/engine/morph.test.ts
git commit -m "feat(engine): morph raro determinístico e prestígio"
```

---

### Task 9: Engine — montagem do ecossistema

**Files:**
- Create: `src/engine/ecosystem.ts`
- Test: `src/engine/ecosystem.test.ts`

**Interfaces:**
- Consumes: tudo das Tasks 2–8 — `NormalizedProfile`, `Ecosystem`, `Specimen`, `BiomePopulation`; `biomeForLanguage`; `speciesForRepo`; `metamorphosisStage`; `morphForRepo`, `morphRank`, `prestigeFromStars`.
- Produces: `computeEcosystem(profile: NormalizedProfile, now: Date): Ecosystem`.

Regras:
- Cada repo vira 1 espécime (bioma via linguagem primária; espécie/estágio/morph/prestígio pelas funções acima).
- `biomes`: agrupados por bioma, **só** os com >= 1 espécime, ordenados por proeminência = soma de `languageBytes` das linguagens do bioma (desempate: nº de espécimes).
- `biodiversidade`: nº de `species.id` distintos.
- `rarest`: espécime de maior `morphRank`, desempatando por `prestige`, depois por `commitCount` (via lookup); `null` se não há espécimes.
- `totalEspecimes`: total de espécimes.

- [ ] **Step 1: Escrever o teste**

Create `src/engine/ecosystem.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeEcosystem } from './ecosystem.js';
import type { NormalizedProfile } from '../domain/types.js';

const NOW = new Date('2024-12-31T00:00:00Z');

const profile: NormalizedProfile = {
  login: 'dev',
  avatarUrl: 'http://x/avatar.png',
  languageBytes: { TypeScript: 50000, Python: 12000, Brainfuck: 10 },
  repos: [
    { id: 'r1', name: 'front', primaryLanguage: 'TypeScript', stars: 300, commitCount: 200, createdAt: '2021-01-01T00:00:00Z', pushedAt: '2024-12-20T00:00:00Z' },
    { id: 'r2', name: 'lib', primaryLanguage: 'TypeScript', stars: 2, commitCount: 8, createdAt: '2024-12-10T00:00:00Z', pushedAt: '2024-12-20T00:00:00Z' },
    { id: 'r3', name: 'script', primaryLanguage: 'Python', stars: 0, commitCount: 3, createdAt: '2023-01-01T00:00:00Z', pushedAt: '2023-02-01T00:00:00Z' },
    { id: 'r4', name: 'wat', primaryLanguage: 'Brainfuck', stars: 0, commitCount: 50, createdAt: '2020-01-01T00:00:00Z', pushedAt: '2020-02-01T00:00:00Z' },
  ],
};

describe('computeEcosystem', () => {
  it('cria um espécime por repo', () => {
    const eco = computeEcosystem(profile, NOW);
    expect(eco.totalEspecimes).toBe(4);
  });

  it('agrupa por bioma e ordena por proeminência (bytes de linguagem)', () => {
    const eco = computeEcosystem(profile, NOW);
    const ids = eco.biomes.map((b) => b.biome.id);
    expect(ids[0]).toBe('jardim');   // TypeScript = mais bytes
    expect(ids).toContain('selva');  // Python
    expect(ids).toContain('inexplorado'); // Brainfuck (desconhecida)
  });

  it('só inclui biomas com pelo menos um espécime', () => {
    const eco = computeEcosystem(profile, NOW);
    expect(eco.biomes.every((b) => b.specimens.length > 0)).toBe(true);
    expect(eco.biomes.find((b) => b.biome.id === 'deserto')).toBeUndefined();
  });

  it('calcula biodiversidade como espécies distintas', () => {
    const eco = computeEcosystem(profile, NOW);
    const distintas = new Set(eco.biomes.flatMap((b) => b.specimens.map((s) => s.species.id)));
    expect(eco.biodiversidade).toBe(distintas.size);
  });

  it('escolhe o espécime mais raro (prestígio alto entre normais)', () => {
    const eco = computeEcosystem(profile, NOW);
    expect(eco.rarest).not.toBeNull();
    // r1 tem 300 stars => prestige 4; nenhum morph especial esperado neste fixture.
    expect(eco.rarest!.prestige).toBe(4);
    expect(eco.rarest!.repoName).toBe('front');
  });

  it('é determinístico', () => {
    const a = computeEcosystem(profile, NOW);
    const b = computeEcosystem(profile, NOW);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('perfil sem repos gera ecossistema vazio com rarest null', () => {
    const vazio = computeEcosystem({ ...profile, repos: [], languageBytes: {} }, NOW);
    expect(vazio.totalEspecimes).toBe(0);
    expect(vazio.biomes).toEqual([]);
    expect(vazio.rarest).toBeNull();
    expect(vazio.biodiversidade).toBe(0);
  });
});
```

> Nota para quem implementa: o fixture foi escolhido para que `r1` (300 stars, maduro e ativo) seja o mais raro por prestígio na ausência de morphs especiais. Se ao rodar você descobrir que algum repo do fixture calhou de receber um morph especial (o que mudaria o `rarest`), ajuste os `id`s do fixture (ex.: `r1`→`r1a`) até que nenhum dos 4 receba morph especial — eles são raríssimos, então é trivial. Não altere a lógica do engine para acomodar o teste.

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/engine/ecosystem.test.ts`
Expected: FAIL — `Cannot find module './ecosystem.js'`.

- [ ] **Step 3: Implementar**

Create `src/engine/ecosystem.ts`:

```ts
import type {
  NormalizedProfile, NormalizedRepo, Ecosystem, Specimen, BiomePopulation, Biome,
} from '../domain/types.js';
import { biomeForLanguage } from '../content/biomes.js';
import { speciesForRepo } from './species-pick.js';
import { metamorphosisStage } from './metamorphosis.js';
import { morphForRepo, morphRank, prestigeFromStars } from './morph.js';

interface SpecimenWithRepo {
  specimen: Specimen;
  repo: NormalizedRepo;
  biome: Biome;
}

function buildSpecimen(repo: NormalizedRepo, now: Date): SpecimenWithRepo {
  const biome = biomeForLanguage(repo.primaryLanguage);
  const specimen: Specimen = {
    repoName: repo.name,
    species: speciesForRepo(repo, biome),
    stage: metamorphosisStage(repo, now),
    morph: morphForRepo(repo),
    prestige: prestigeFromStars(repo.stars),
  };
  return { specimen, repo, biome };
}

function biomeProminence(biome: Biome, profile: NormalizedProfile, specimenCount: number): number {
  let bytes = 0;
  for (const lang of biome.languages) bytes += profile.languageBytes[lang] ?? 0;
  // bytes domina; nº de espécimes desempata.
  return bytes * 1000 + specimenCount;
}

export function computeEcosystem(profile: NormalizedProfile, now: Date): Ecosystem {
  const built = profile.repos.map((r) => buildSpecimen(r, now));

  // Agrupar por bioma.
  const groups = new Map<string, SpecimenWithRepo[]>();
  for (const b of built) {
    const arr = groups.get(b.biome.id) ?? [];
    arr.push(b);
    groups.set(b.biome.id, arr);
  }

  const biomes: BiomePopulation[] = [...groups.values()]
    .map((arr) => ({
      biome: arr[0]!.biome,
      specimens: arr.map((x) => x.specimen),
    }))
    .sort(
      (a, b) =>
        biomeProminence(b.biome, profile, b.specimens.length) -
        biomeProminence(a.biome, profile, a.specimens.length),
    );

  const biodiversidade = new Set(built.map((b) => b.specimen.species.id)).size;

  let rarest: SpecimenWithRepo | null = null;
  for (const cur of built) {
    if (rarest === null || compareRarity(cur, rarest) > 0) rarest = cur;
  }

  return {
    login: profile.login,
    avatarUrl: profile.avatarUrl,
    biomes,
    biodiversidade,
    rarest: rarest ? rarest.specimen : null,
    totalEspecimes: built.length,
  };
}

/** > 0 se `a` é mais raro que `b`. */
function compareRarity(a: SpecimenWithRepo, b: SpecimenWithRepo): number {
  const byMorph = morphRank(a.specimen.morph) - morphRank(b.specimen.morph);
  if (byMorph !== 0) return byMorph;
  const byPrestige = a.specimen.prestige - b.specimen.prestige;
  if (byPrestige !== 0) return byPrestige;
  return a.repo.commitCount - b.repo.commitCount;
}
```

- [ ] **Step 4: Rodar todos os testes**

Run: `npm test && npm run typecheck`
Expected: PASS — todos os testes (Tasks 1–9) verdes; typecheck limpo.

- [ ] **Step 5: Commit**

```bash
git add src/engine/ecosystem.ts src/engine/ecosystem.test.ts
git commit -m "feat(engine): montagem determinística do ecossistema"
```

---

### Task 10: Demo CLI — ver o engine funcionando

**Files:**
- Create: `src/demo.ts`
- Create: `src/fixtures/profile-exemplo.ts`

**Interfaces:**
- Consumes: `computeEcosystem` (Task 9); tipos (Task 2).
- Produces: `npm run demo` imprime um ecossistema legível a partir de um perfil de exemplo. (Sem teste automatizado — é uma ferramenta de inspeção; a lógica já está coberta na Task 9.)

- [ ] **Step 1: Criar o fixture de perfil**

Create `src/fixtures/profile-exemplo.ts`:

```ts
import type { NormalizedProfile } from '../domain/types.js';

export const PROFILE_EXEMPLO: NormalizedProfile = {
  login: 'dev-exemplo',
  avatarUrl: 'https://example.com/avatar.png',
  languageBytes: { TypeScript: 90000, Python: 30000, Rust: 15000, Go: 5000 },
  repos: [
    { id: 'p1', name: 'site', primaryLanguage: 'TypeScript', stars: 1200, commitCount: 400, createdAt: '2020-03-01T00:00:00Z', pushedAt: '2024-12-25T00:00:00Z' },
    { id: 'p2', name: 'cli', primaryLanguage: 'Rust', stars: 80, commitCount: 150, createdAt: '2022-06-01T00:00:00Z', pushedAt: '2024-11-01T00:00:00Z' },
    { id: 'p3', name: 'notebook', primaryLanguage: 'Python', stars: 5, commitCount: 60, createdAt: '2023-01-01T00:00:00Z', pushedAt: '2023-03-01T00:00:00Z' },
    { id: 'p4', name: 'rascunho', primaryLanguage: 'Go', stars: 0, commitCount: 2, createdAt: '2024-12-20T00:00:00Z', pushedAt: '2024-12-21T00:00:00Z' },
  ],
};
```

- [ ] **Step 2: Criar o script de demo**

Create `src/demo.ts`:

```ts
import { computeEcosystem } from './engine/ecosystem.js';
import { PROFILE_EXEMPLO } from './fixtures/profile-exemplo.js';

const eco = computeEcosystem(PROFILE_EXEMPLO, new Date());

console.log(`🪲 BugDex — reserva de @${eco.login}`);
console.log(`Biodiversidade: ${eco.biodiversidade} | Espécimes: ${eco.totalEspecimes}`);
if (eco.rarest) {
  console.log(`Mais raro: ${eco.rarest.species.nome} (${eco.rarest.morph}, prestígio ${eco.rarest.prestige})`);
}
console.log('');
for (const bp of eco.biomes) {
  console.log(`${bp.biome.emoji} ${bp.biome.nome}`);
  for (const s of bp.specimens) {
    const tag = s.morph === 'normal' ? '' : ` ✨${s.morph}`;
    console.log(`   • ${s.species.nome} [${s.stage}]${tag} — repo "${s.repoName}"`);
  }
}
```

- [ ] **Step 3: Rodar a demo**

Run: `npm run demo`
Expected: imprime a reserva de `@dev-exemplo` com os biomas Jardim/Campo Vulcânico/Selva/Savana, espécimes com estágios, e o mais raro (deve ser o `site`, 1200 stars → prestígio 5, salvo morph especial).

- [ ] **Step 4: Commit**

```bash
git add src/demo.ts src/fixtures/profile-exemplo.ts
git commit -m "feat: demo CLI do ecossistema"
```

---

## Self-Review (preenchido pelo autor do plano)

**1. Cobertura do spec (Fase 1):**
- Mapeamento linguagem→bioma → Task 5 ✔
- Repo→espécie determinístico → Task 6 ✔
- Atividade→metamorfose → Task 7 ✔
- Morphs raros determinísticos + raridade → Task 8 ✔
- Dataset de espécies + curiosidades → Task 4 ✔
- Montagem do ecossistema (biomas, biodiversidade, rarest) → Task 9 ✔
- Determinismo (sem relógio interno) → garantido por `now` injetado (Tasks 7, 9) e por testes de determinismo (Tasks 6, 8, 9) ✔
- Bioma fallback "Inexplorado" → Task 5 ✔
- *Fora da Fase 1 (vão para Fases 2/3):* OAuth, fetch real do GitHub, persistência, render web, embed SVG, apex/invasoras, issues→pragas. Listados como não-objetivos desta fase.

**2. Placeholders:** nenhum "TODO/TBD"; todo passo de código mostra o código completo. A nota da Task 9 sobre ajustar `id`s do fixture é orientação de robustez de teste, não um placeholder de implementação.

**3. Consistência de tipos:** nomes conferidos ponta a ponta — `stableHash`, `biomeForLanguage`, `getSpeciesById`, `speciesForRepo`, `metamorphosisStage`, `morphForRepo`/`morphRank`/`prestigeFromStars`, `computeEcosystem`. Assinaturas usadas na Task 9 batem com as produzidas nas Tasks 3–8.

---

## Roadmap (próximas fases — planos separados)

- **Fase 2 — App web + OAuth + persistência + fetch real:** Next.js (App Router) + Tailwind; Supabase (Postgres + OAuth GitHub); módulo `github-ingest` que busca via GraphQL e normaliza para `NormalizedProfile` (consumindo este engine); página "Sua Reserva" (`render-web`, pixel-art) e ficha de espécie; cache do `EcosystemSnapshot`.
- **Fase 3 — Embed SVG do perfil:** rota `/{usuario}.svg` (`render-embed`) computando on-the-fly de dados públicos quando não logado; estratégia de cache (headers + Camo); página com snippet copia-e-cola.
- **Ondas futuras (do design §9):** apex/invasoras (Monster Hunter), embed animado, biomas aquáticos/marinhos e taxa amplo, comunidade, issues→pragas, loja/conquistas.
