# BugDex — Fase 2a: Ingestão GitHub + cache de snapshot (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a camada de ingestão do BugDex — buscar dados reais de um perfil do GitHub via GraphQL, normalizá-los para `NormalizedProfile`, computar o ecossistema (engine da Fase 1) e persistir o snapshot — tudo headless e testável, sem UI, OAuth ou banco externo.

**Architecture:** I/O nas bordas, núcleo puro (continuação da Fase 1). `github/client.ts` é a única peça com rede (wrappa `@octokit/graphql`); `github/normalize.ts` é uma função pura; `store/` define `SnapshotStore` com impls in-memory e arquivo; `ingest.ts` orquestra por injeção de dependência (`client`, `store`, `now`). Nada na Fase 1 é alterado.

**Tech Stack:** Node 20+ (testado em 24), TypeScript 5 strict, ESM, Vitest, tsx (CLI). Nova dependência de runtime: `@octokit/graphql`.

## Global Constraints

- Node.js **>= 20**; `package.json` com `"type": "module"` (ESM).
- TypeScript **strict** (`"strict": true`, `"noUncheckedIndexedAccess": true`); proibido `any` implícito.
- **Determinismo:** nada em `src/github/normalize.ts`, `src/store/in-memory-store.ts` ou no caminho puro de `src/ingest.ts` pode chamar `Date.now()`, `new Date()` sem argumento, `Math.random()` ou I/O. O tempo entra como parâmetro `now: Date`. (I/O de rede só em `client.ts`; I/O de disco só em `file-store.ts`; relógio real só na CLI.)
- Idioma: identificadores e mensagens em **pt-BR**; ids/arquivos em kebab/ASCII.
- Testes co-localizados como `*.test.ts` ao lado do código.
- Commits pequenos e frequentes, um por task (mensagens em pt-BR, Conventional Commits).
- Imports relativos com extensão `.js` (ESM + `moduleResolution: Bundler`), como na Fase 1.

---

### Task 1: Tipos do payload GraphQL (`RawProfile`)

**Files:**
- Create: `src/github/types.ts`
- Test: `src/github/types.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `RawProfile`, `RawRepo` — o subconjunto do payload GraphQL que o resto consome. Importados por `normalize.ts` e `client.ts`.

- [ ] **Step 1: Escrever o teste (compila-e-usa os tipos)**

Create `src/github/types.ts` (vazio por enquanto? não) — primeiro o teste. Create `src/github/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { RawProfile, RawRepo } from './types.js';

describe('github raw types', () => {
  it('permite montar um RawProfile válido', () => {
    const repo: RawRepo = {
      id: 'R_1',
      name: 'meu-repo',
      isFork: false,
      stargazerCount: 12,
      createdAt: '2024-01-01T00:00:00Z',
      pushedAt: '2024-06-01T00:00:00Z',
      primaryLanguage: { name: 'TypeScript' },
      languages: [{ size: 5000, name: 'TypeScript' }],
      defaultBranchRef: { totalCommits: 40 },
    };
    const raw: RawProfile = {
      login: 'fulano',
      avatarUrl: 'https://x/a.png',
      repositories: [repo],
    };
    expect(raw.repositories[0]?.defaultBranchRef?.totalCommits).toBe(40);
    expect(raw.repositories[0]?.primaryLanguage?.name).toBe('TypeScript');
  });

  it('permite repo vazio (sem branch, sem linguagem, pushedAt null)', () => {
    const repo: RawRepo = {
      id: 'R_2',
      name: 'vazio',
      isFork: false,
      stargazerCount: 0,
      createdAt: '2024-12-10T00:00:00Z',
      pushedAt: null,
      primaryLanguage: null,
      languages: [],
      defaultBranchRef: null,
    };
    expect(repo.defaultBranchRef).toBeNull();
    expect(repo.pushedAt).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/github/types.test.ts`
Expected: FAIL — `Cannot find module './types.js'`.

- [ ] **Step 3: Implementar os tipos**

Create `src/github/types.ts`:

```ts
/** Subconjunto já achatado do payload GraphQL do GitHub que o BugDex consome. */
export interface RawProfile {
  login: string;
  avatarUrl: string;
  repositories: RawRepo[];
}

export interface RawRepo {
  /** node_id do GitHub — estável entre visitas. */
  id: string;
  name: string;
  isFork: boolean;
  stargazerCount: number;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601; null em repositório vazio. */
  pushedAt: string | null;
  primaryLanguage: { name: string } | null;
  /** Já achatado de languages.edges. */
  languages: { size: number; name: string }[];
  /** history.totalCount do branch default; null se o repo não tem branch. */
  defaultBranchRef: { totalCommits: number } | null;
}
```

- [ ] **Step 4: Rodar o teste para vê-lo passar**

Run: `npx vitest run src/github/types.test.ts && npm run typecheck`
Expected: PASS + typecheck limpo.

- [ ] **Step 5: Commit**

```bash
git add src/github/types.ts src/github/types.test.ts
git commit -m "feat(github): tipos do payload GraphQL (RawProfile)"
```

---

### Task 2: Normalizador puro (`RawProfile → NormalizedProfile`)

**Files:**
- Create: `src/github/normalize.ts`
- Test: `src/github/normalize.test.ts`

**Interfaces:**
- Consumes: `RawProfile`, `RawRepo` (Task 1); `NormalizedProfile`, `NormalizedRepo` (Fase 1, `src/domain/types.ts`).
- Produces: `normalize(raw: RawProfile): NormalizedProfile` — função pura.

- [ ] **Step 1: Escrever o teste**

Create `src/github/normalize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalize } from './normalize.js';
import type { RawProfile } from './types.js';

const RAW: RawProfile = {
  login: 'dev',
  avatarUrl: 'https://x/a.png',
  repositories: [
    {
      id: 'R_1', name: 'front', isFork: false, stargazerCount: 300,
      createdAt: '2021-01-01T00:00:00Z', pushedAt: '2024-12-20T00:00:00Z',
      primaryLanguage: { name: 'TypeScript' },
      languages: [{ size: 50000, name: 'TypeScript' }, { size: 2000, name: 'CSS' }],
      defaultBranchRef: { totalCommits: 200 },
    },
    {
      id: 'R_2', name: 'vazio', isFork: false, stargazerCount: 0,
      createdAt: '2024-12-10T00:00:00Z', pushedAt: null,
      primaryLanguage: null, languages: [], defaultBranchRef: null,
    },
    {
      id: 'R_3', name: 'lib', isFork: false, stargazerCount: 5,
      createdAt: '2023-01-01T00:00:00Z', pushedAt: '2023-02-01T00:00:00Z',
      primaryLanguage: { name: 'TypeScript' },
      languages: [{ size: 10000, name: 'TypeScript' }],
      defaultBranchRef: { totalCommits: 60 },
    },
  ],
};

describe('normalize', () => {
  it('copia login e avatarUrl', () => {
    const p = normalize(RAW);
    expect(p.login).toBe('dev');
    expect(p.avatarUrl).toBe('https://x/a.png');
  });

  it('agrega languageBytes por nome entre todos os repos', () => {
    const p = normalize(RAW);
    expect(p.languageBytes).toEqual({ TypeScript: 60000, CSS: 2000 });
  });

  it('mapeia cada repo para NormalizedRepo', () => {
    const p = normalize(RAW);
    expect(p.repos).toHaveLength(3);
    const front = p.repos.find((r) => r.name === 'front')!;
    expect(front.primaryLanguage).toBe('TypeScript');
    expect(front.stars).toBe(300);
    expect(front.commitCount).toBe(200);
  });

  it('repo vazio: primaryLanguage null, commitCount 0, pushedAt cai em createdAt', () => {
    const p = normalize(RAW);
    const vazio = p.repos.find((r) => r.name === 'vazio')!;
    expect(vazio.primaryLanguage).toBeNull();
    expect(vazio.commitCount).toBe(0);
    expect(vazio.pushedAt).toBe('2024-12-10T00:00:00Z');
  });

  it('perfil sem repos gera languageBytes vazio e repos vazio', () => {
    const p = normalize({ login: 'x', avatarUrl: '', repositories: [] });
    expect(p.repos).toEqual([]);
    expect(p.languageBytes).toEqual({});
  });

  it('é determinístico (mesmo input → mesmo JSON)', () => {
    expect(JSON.stringify(normalize(RAW))).toBe(JSON.stringify(normalize(RAW)));
  });
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/github/normalize.test.ts`
Expected: FAIL — `Cannot find module './normalize.js'`.

- [ ] **Step 3: Implementar**

Create `src/github/normalize.ts`:

```ts
import type { NormalizedProfile, NormalizedRepo } from '../domain/types.js';
import type { RawProfile, RawRepo } from './types.js';

function toNormalizedRepo(r: RawRepo): NormalizedRepo {
  return {
    id: r.id,
    name: r.name,
    primaryLanguage: r.primaryLanguage?.name ?? null,
    stars: r.stargazerCount,
    commitCount: r.defaultBranchRef?.totalCommits ?? 0,
    createdAt: r.createdAt,
    pushedAt: r.pushedAt ?? r.createdAt,
  };
}

export function normalize(raw: RawProfile): NormalizedProfile {
  const languageBytes: Record<string, number> = {};
  for (const repo of raw.repositories) {
    for (const lang of repo.languages) {
      languageBytes[lang.name] = (languageBytes[lang.name] ?? 0) + lang.size;
    }
  }
  return {
    login: raw.login,
    avatarUrl: raw.avatarUrl,
    languageBytes,
    repos: raw.repositories.map(toNormalizedRepo),
  };
}
```

- [ ] **Step 4: Rodar o teste para vê-lo passar**

Run: `npx vitest run src/github/normalize.test.ts && npm run typecheck`
Expected: PASS — 6 testes; typecheck limpo.

- [ ] **Step 5: Commit**

```bash
git add src/github/normalize.ts src/github/normalize.test.ts
git commit -m "feat(github): normalizador puro RawProfile->NormalizedProfile"
```

---

### Task 3: `SnapshotStore` (interface) + impl in-memory + bateria de contrato

**Files:**
- Create: `src/store/snapshot-store.ts`
- Create: `src/store/in-memory-store.ts`
- Test: `src/store/store.test.ts`

**Interfaces:**
- Consumes: `Ecosystem` (Fase 1, `src/domain/types.ts`).
- Produces:
  - `StoredSnapshot { login: string; ecosystem: Ecosystem; computedAt: string }`
  - `SnapshotStore { get(login): Promise<StoredSnapshot | null>; put(s): Promise<void> }`
  - `InMemorySnapshotStore implements SnapshotStore`
  - `runStoreContract(label: string, makeStore: () => SnapshotStore | Promise<SnapshotStore>): void` — bateria reutilizável (usada também na Task 4).

- [ ] **Step 1: Escrever a interface + tipo (sem lógica ainda)**

Create `src/store/snapshot-store.ts`:

```ts
import type { Ecosystem } from '../domain/types.js';

export interface StoredSnapshot {
  login: string;
  ecosystem: Ecosystem;
  /** ISO 8601 — quem grava passa o now; o store não lê relógio. */
  computedAt: string;
}

export interface SnapshotStore {
  get(login: string): Promise<StoredSnapshot | null>;
  put(snapshot: StoredSnapshot): Promise<void>;
}
```

- [ ] **Step 2: Escrever a bateria de contrato + teste da impl in-memory**

Create `src/store/store.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Ecosystem } from '../domain/types.js';
import type { SnapshotStore, StoredSnapshot } from './snapshot-store.js';
import { InMemorySnapshotStore } from './in-memory-store.js';

const ECO_VAZIO: Ecosystem = {
  login: 'dev', avatarUrl: '', biomes: [], biodiversidade: 0, rarest: null, totalEspecimes: 0,
};
const SAMPLE: StoredSnapshot = { login: 'dev', ecosystem: ECO_VAZIO, computedAt: '2024-01-01T00:00:00Z' };

export function runStoreContract(
  label: string,
  makeStore: () => SnapshotStore | Promise<SnapshotStore>,
): void {
  describe(`SnapshotStore: ${label}`, () => {
    it('put seguido de get devolve o snapshot (round-trip)', async () => {
      const store = await makeStore();
      await store.put(SAMPLE);
      expect(await store.get('dev')).toEqual(SAMPLE);
    });

    it('get de login inexistente devolve null', async () => {
      const store = await makeStore();
      expect(await store.get('ninguem')).toBeNull();
    });

    it('um novo put sobrescreve o anterior', async () => {
      const store = await makeStore();
      await store.put(SAMPLE);
      await store.put({ ...SAMPLE, computedAt: '2025-01-01T00:00:00Z' });
      expect((await store.get('dev'))!.computedAt).toBe('2025-01-01T00:00:00Z');
    });

    it('get é case-insensitive no login', async () => {
      const store = await makeStore();
      await store.put(SAMPLE);
      expect(await store.get('DEV')).toEqual(SAMPLE);
    });
  });
}

runStoreContract('InMemory', () => new InMemorySnapshotStore());
```

- [ ] **Step 3: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/store/store.test.ts`
Expected: FAIL — `Cannot find module './in-memory-store.js'`.

- [ ] **Step 4: Implementar a impl in-memory**

Create `src/store/in-memory-store.ts`:

```ts
import type { SnapshotStore, StoredSnapshot } from './snapshot-store.js';

export class InMemorySnapshotStore implements SnapshotStore {
  private readonly map = new Map<string, StoredSnapshot>();

  async get(login: string): Promise<StoredSnapshot | null> {
    return this.map.get(login.toLowerCase()) ?? null;
  }

  async put(snapshot: StoredSnapshot): Promise<void> {
    // Clona para não vazar referência mutável ao chamador.
    this.map.set(snapshot.login.toLowerCase(), structuredClone(snapshot));
  }
}
```

- [ ] **Step 5: Rodar o teste para vê-lo passar**

Run: `npx vitest run src/store/store.test.ts && npm run typecheck`
Expected: PASS — 4 testes (contrato InMemory); typecheck limpo.

- [ ] **Step 6: Commit**

```bash
git add src/store/snapshot-store.ts src/store/in-memory-store.ts src/store/store.test.ts
git commit -m "feat(store): SnapshotStore + impl in-memory + bateria de contrato"
```

---

### Task 4: `FileSnapshotStore` (impl em arquivo JSON)

**Files:**
- Create: `src/store/file-store.ts`
- Modify: `src/store/store.test.ts` (adicionar uma chamada de `runStoreContract` para a impl de arquivo)

**Interfaces:**
- Consumes: `SnapshotStore`, `StoredSnapshot` (Task 3); `runStoreContract` (Task 3).
- Produces: `FileSnapshotStore implements SnapshotStore` — construtor `(dir: string)`; um arquivo `<login-sanitizado>.json` por login.

- [ ] **Step 1: Adicionar o teste da impl de arquivo**

Modify `src/store/store.test.ts` — adicionar imports no topo e mais uma chamada de contrato no fim:

```ts
// adicionar aos imports existentes:
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileSnapshotStore } from './file-store.js';

// adicionar ao final do arquivo (após a chamada do InMemory):
runStoreContract('File', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bugdex-store-'));
  return new FileSnapshotStore(dir);
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/store/store.test.ts`
Expected: FAIL — `Cannot find module './file-store.js'`.

- [ ] **Step 3: Implementar o store de arquivo**

Create `src/store/file-store.ts`:

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SnapshotStore, StoredSnapshot } from './snapshot-store.js';

function sanitize(login: string): string {
  return login.toLowerCase().replace(/[^a-z0-9-]/g, '_');
}

export class FileSnapshotStore implements SnapshotStore {
  constructor(private readonly dir: string) {}

  private fileFor(login: string): string {
    return join(this.dir, `${sanitize(login)}.json`);
  }

  async get(login: string): Promise<StoredSnapshot | null> {
    try {
      const txt = await readFile(this.fileFor(login), 'utf8');
      return JSON.parse(txt) as StoredSnapshot;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async put(snapshot: StoredSnapshot): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.fileFor(snapshot.login), JSON.stringify(snapshot, null, 2), 'utf8');
  }
}
```

- [ ] **Step 4: Rodar o teste para vê-lo passar**

Run: `npx vitest run src/store/store.test.ts && npm run typecheck`
Expected: PASS — 8 testes (4 InMemory + 4 File); typecheck limpo.

- [ ] **Step 5: Commit**

```bash
git add src/store/file-store.ts src/store/store.test.ts
git commit -m "feat(store): FileSnapshotStore em arquivo JSON"
```

---

### Task 5: Cliente GitHub GraphQL (`@octokit/graphql`)

**Files:**
- Modify: `package.json` (adicionar dependência `@octokit/graphql` + rodar install)
- Create: `src/github/client.ts`
- Test: `src/github/client.test.ts`

**Interfaces:**
- Consumes: `RawProfile`, `RawRepo` (Task 1).
- Produces:
  - `GithubClient { fetchProfile(login: string): Promise<RawProfile> }`
  - `GraphqlFn` — tipo da função GraphQL injetável.
  - `createOctokitClient(token: string, opts?: { graphqlFn?: GraphqlFn; wait?: (ms: number) => Promise<void> }): GithubClient`
  - `PerfilNaoEncontrado extends Error`

- [ ] **Step 1: Instalar a dependência**

Run: `npm install @octokit/graphql@^9.0.0`
Expected: `package.json` ganha `"dependencies": { "@octokit/graphql": "^9.0.x" }`; `package-lock.json` atualizado.

- [ ] **Step 2: Escrever o teste (com `graphqlFn` falso injetado)**

Create `src/github/client.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { createOctokitClient, PerfilNaoEncontrado, type GraphqlFn } from './client.js';

/** Resposta GraphQL crua (formato user→repositories→nodes) que o cliente achata. */
const FAKE_RESPONSE = {
  user: {
    login: 'dev',
    avatarUrl: 'https://x/a.png',
    repositories: {
      nodes: [
        {
          id: 'R_1', name: 'front', isFork: false, stargazerCount: 300,
          createdAt: '2021-01-01T00:00:00Z', pushedAt: '2024-12-20T00:00:00Z',
          primaryLanguage: { name: 'TypeScript' },
          languages: { edges: [{ size: 50000, node: { name: 'TypeScript' } }] },
          defaultBranchRef: { target: { history: { totalCount: 200 } } },
        },
        {
          id: 'R_2', name: 'vazio', isFork: false, stargazerCount: 0,
          createdAt: '2024-12-10T00:00:00Z', pushedAt: null,
          primaryLanguage: null,
          languages: { edges: [] },
          defaultBranchRef: null,
        },
      ],
    },
  },
};

describe('createOctokitClient', () => {
  it('lança se o token estiver ausente', () => {
    expect(() => createOctokitClient('')).toThrow(/GITHUB_TOKEN/);
  });

  it('busca e achata o payload em RawProfile', async () => {
    const graphqlFn = vi.fn<GraphqlFn>().mockResolvedValue(FAKE_RESPONSE);
    const client = createOctokitClient('t0ken', { graphqlFn });

    const raw = await client.fetchProfile('dev');

    // a query pediu os campos essenciais
    const queryArg = graphqlFn.mock.calls[0]![0] as string;
    expect(queryArg).toContain('repositories(');
    expect(queryArg).toContain('defaultBranchRef');
    expect(queryArg).toContain('languages(');

    expect(raw.login).toBe('dev');
    expect(raw.repositories).toHaveLength(2);
    const front = raw.repositories[0]!;
    expect(front.languages).toEqual([{ size: 50000, name: 'TypeScript' }]);
    expect(front.defaultBranchRef).toEqual({ totalCommits: 200 });
    const vazio = raw.repositories[1]!;
    expect(vazio.defaultBranchRef).toBeNull();
    expect(vazio.languages).toEqual([]);
  });

  it('lança PerfilNaoEncontrado quando user é null', async () => {
    const graphqlFn = vi.fn<GraphqlFn>().mockResolvedValue({ user: null });
    const client = createOctokitClient('t0ken', { graphqlFn });
    await expect(client.fetchProfile('ninguem')).rejects.toBeInstanceOf(PerfilNaoEncontrado);
  });

  it('mapeia 401 para erro claro de token', async () => {
    const erro = Object.assign(new Error('Unauthorized'), { status: 401 });
    const graphqlFn = vi.fn<GraphqlFn>().mockRejectedValue(erro);
    const client = createOctokitClient('t0ken', { graphqlFn });
    await expect(client.fetchProfile('dev')).rejects.toThrow(/401|token/i);
  });

  it('faz um retry em rate limit (403) e depois resolve', async () => {
    const rate = Object.assign(new Error('rate limit exceeded'), { status: 403 });
    const graphqlFn = vi.fn<GraphqlFn>()
      .mockRejectedValueOnce(rate)
      .mockResolvedValueOnce(FAKE_RESPONSE);
    const wait = vi.fn().mockResolvedValue(undefined);
    const client = createOctokitClient('t0ken', { graphqlFn, wait });

    const raw = await client.fetchProfile('dev');
    expect(graphqlFn).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
    expect(raw.login).toBe('dev');
  });
});
```

- [ ] **Step 3: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/github/client.test.ts`
Expected: FAIL — `Cannot find module './client.js'`.

- [ ] **Step 4: Implementar o cliente**

Create `src/github/client.ts`:

```ts
import { graphql as octokitGraphql } from '@octokit/graphql';
import type { RawProfile, RawRepo } from './types.js';

/** Assinatura mínima da função GraphQL que o cliente usa (injetável p/ testes). */
export type GraphqlFn = (query: string, variables: Record<string, unknown>) => Promise<unknown>;

export interface GithubClient {
  fetchProfile(login: string): Promise<RawProfile>;
}

export class PerfilNaoEncontrado extends Error {
  constructor(login: string) {
    super(`Perfil não encontrado ou privado: ${login}`);
    this.name = 'PerfilNaoEncontrado';
  }
}

const QUERY = `
query($login: String!) {
  user(login: $login) {
    login
    avatarUrl
    repositories(first: 100, ownerAffiliations: [OWNER], isFork: false, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        id
        name
        isFork
        stargazerCount
        createdAt
        pushedAt
        primaryLanguage { name }
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name } }
        }
        defaultBranchRef { target { ... on Commit { history { totalCount } } } }
      }
    }
  }
}`;

interface GqlRepo {
  id: string;
  name: string;
  isFork: boolean;
  stargazerCount: number;
  createdAt: string;
  pushedAt: string | null;
  primaryLanguage: { name: string } | null;
  languages: { edges: { size: number; node: { name: string } }[] };
  defaultBranchRef: { target: { history: { totalCount: number } } | null } | null;
}
interface GqlResponse {
  user: { login: string; avatarUrl: string; repositories: { nodes: GqlRepo[] } } | null;
}

function mapRepo(r: GqlRepo): RawRepo {
  return {
    id: r.id,
    name: r.name,
    isFork: r.isFork,
    stargazerCount: r.stargazerCount,
    createdAt: r.createdAt,
    pushedAt: r.pushedAt,
    primaryLanguage: r.primaryLanguage,
    languages: r.languages.edges.map((e) => ({ size: e.size, name: e.node.name })),
    defaultBranchRef: r.defaultBranchRef?.target
      ? { totalCommits: r.defaultBranchRef.target.history.totalCount }
      : null,
  };
}

function isRateLimit(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  return e?.status === 403 || /rate limit/i.test(e?.message ?? '');
}

function isUnauthorized(err: unknown): boolean {
  return (err as { status?: number })?.status === 401;
}

const defaultWait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function createOctokitClient(
  token: string,
  opts: { graphqlFn?: GraphqlFn; wait?: (ms: number) => Promise<void> } = {},
): GithubClient {
  if (!token) throw new Error('GITHUB_TOKEN não definido');

  const graphqlFn: GraphqlFn =
    opts.graphqlFn ??
    ((query, variables) =>
      octokitGraphql(query, { ...variables, headers: { authorization: `token ${token}` } }));
  const wait = opts.wait ?? defaultWait;

  async function callOnce(login: string): Promise<GqlResponse> {
    return (await graphqlFn(QUERY, { login })) as GqlResponse;
  }

  return {
    async fetchProfile(login: string): Promise<RawProfile> {
      let data: GqlResponse;
      try {
        data = await callOnce(login);
      } catch (err) {
        if (isUnauthorized(err)) throw new Error('GITHUB_TOKEN inválido ou ausente (401)');
        if (isRateLimit(err)) {
          await wait(1000);
          data = await callOnce(login); // um único retry
        } else {
          throw err;
        }
      }

      if (!data.user) throw new PerfilNaoEncontrado(login);
      return {
        login: data.user.login,
        avatarUrl: data.user.avatarUrl,
        repositories: data.user.repositories.nodes.map(mapRepo),
      };
    },
  };
}
```

- [ ] **Step 5: Rodar o teste para vê-lo passar**

Run: `npx vitest run src/github/client.test.ts && npm run typecheck`
Expected: PASS — 5 testes; typecheck limpo.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/github/client.ts src/github/client.test.ts
git commit -m "feat(github): cliente GraphQL sobre @octokit/graphql com retry de rate limit"
```

---

### Task 6: Orquestrador `ingestProfile`

**Files:**
- Create: `src/ingest.ts`
- Test: `src/ingest.test.ts`

**Interfaces:**
- Consumes: `GithubClient` (Task 5); `SnapshotStore`, `StoredSnapshot` (Task 3); `normalize` (Task 2); `computeEcosystem` (Fase 1, `src/engine/ecosystem.ts`); `RawProfile` (Task 1).
- Produces:
  - `IngestDeps { client: GithubClient; store: SnapshotStore; now: Date }`
  - `ingestProfile(login: string, deps: IngestDeps): Promise<StoredSnapshot>`

- [ ] **Step 1: Escrever o teste (client e store fake)**

Create `src/ingest.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ingestProfile } from './ingest.js';
import { InMemorySnapshotStore } from './store/in-memory-store.js';
import type { GithubClient } from './github/client.js';
import type { RawProfile } from './github/types.js';

const NOW = new Date('2024-12-31T00:00:00Z');

const RAW: RawProfile = {
  login: 'dev',
  avatarUrl: 'https://x/a.png',
  repositories: [
    {
      id: 'R_1', name: 'front', isFork: false, stargazerCount: 300,
      createdAt: '2021-01-01T00:00:00Z', pushedAt: '2024-12-20T00:00:00Z',
      primaryLanguage: { name: 'TypeScript' },
      languages: [{ size: 50000, name: 'TypeScript' }],
      defaultBranchRef: { totalCommits: 200 },
    },
  ],
};

function fakeClient(raw: RawProfile): { client: GithubClient; spy: ReturnType<typeof vi.fn> } {
  const spy = vi.fn().mockResolvedValue(raw);
  return { client: { fetchProfile: spy }, spy };
}

describe('ingestProfile', () => {
  it('busca uma vez, computa e grava o snapshot no store', async () => {
    const { client, spy } = fakeClient(RAW);
    const store = new InMemorySnapshotStore();

    const snap = await ingestProfile('dev', { client, store, now: NOW });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(snap.login).toBe('dev');
    expect(snap.computedAt).toBe(NOW.toISOString());
    expect(snap.ecosystem.totalEspecimes).toBe(1);
    expect(await store.get('dev')).toEqual(snap);
  });

  it('é determinístico (mesmo raw + mesmo now → mesmo JSON)', async () => {
    const a = await ingestProfile('dev', { client: fakeClient(RAW).client, store: new InMemorySnapshotStore(), now: NOW });
    const b = await ingestProfile('dev', { client: fakeClient(RAW).client, store: new InMemorySnapshotStore(), now: NOW });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `npx vitest run src/ingest.test.ts`
Expected: FAIL — `Cannot find module './ingest.js'`.

- [ ] **Step 3: Implementar**

Create `src/ingest.ts`:

```ts
import type { GithubClient } from './github/client.js';
import { normalize } from './github/normalize.js';
import { computeEcosystem } from './engine/ecosystem.js';
import type { SnapshotStore, StoredSnapshot } from './store/snapshot-store.js';

export interface IngestDeps {
  client: GithubClient;
  store: SnapshotStore;
  now: Date;
}

export async function ingestProfile(login: string, deps: IngestDeps): Promise<StoredSnapshot> {
  const raw = await deps.client.fetchProfile(login);
  const profile = normalize(raw);
  const ecosystem = computeEcosystem(profile, deps.now);
  const snapshot: StoredSnapshot = {
    login: profile.login,
    ecosystem,
    computedAt: deps.now.toISOString(),
  };
  await deps.store.put(snapshot);
  return snapshot;
}
```

- [ ] **Step 4: Rodar todos os testes**

Run: `npm test && npm run typecheck`
Expected: PASS — todos os testes (Fase 1 + Fase 2a) verdes; typecheck limpo.

- [ ] **Step 5: Commit**

```bash
git add src/ingest.ts src/ingest.test.ts
git commit -m "feat: orquestrador ingestProfile (client->normalize->engine->store)"
```

---

### Task 7: CLI de ingestão + script npm + docs

**Files:**
- Create: `src/ingest-cli.ts`
- Modify: `package.json` (script `ingest`)
- Modify: `.gitignore` (ignorar `.snapshots/`)
- Modify: `README.md` (atualizar status/uso)

**Interfaces:**
- Consumes: `createOctokitClient` (Task 5); `FileSnapshotStore` (Task 4); `ingestProfile` (Task 6).
- Produces: comando `npm run ingest -- <login>` que busca do GitHub real e imprime o ecossistema. (Sem teste automatizado — é a borda impura/ferramenta de smoke; a lógica já está coberta nas Tasks 2–6.)

- [ ] **Step 1: Criar a CLI**

Create `src/ingest-cli.ts`:

```ts
import { createOctokitClient } from './github/client.js';
import { FileSnapshotStore } from './store/file-store.js';
import { ingestProfile } from './ingest.js';

const login = process.argv[2];
const token = process.env.GITHUB_TOKEN;

if (!login) {
  console.error('Uso: npm run ingest -- <login-github>');
  process.exit(1);
}
if (!token) {
  console.error('Defina a variável de ambiente GITHUB_TOKEN (PAT com escopo public_repo/read:user).');
  process.exit(1);
}

const client = createOctokitClient(token);
const store = new FileSnapshotStore('.snapshots');

try {
  const snap = await ingestProfile(login, { client, store, now: new Date() });
  const eco = snap.ecosystem;
  console.log(`🪲 BugDex — reserva de @${eco.login}  (computado em ${snap.computedAt})`);
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
  console.log(`\nSnapshot salvo em .snapshots/`);
} catch (err) {
  console.error(`Falha ao ingerir @${login}: ${(err as Error).message}`);
  process.exit(1);
}
```

- [ ] **Step 2: Adicionar o script npm**

Modify `package.json` — adicionar em `"scripts"` (após `"demo"`):

```json
    "ingest": "tsx src/ingest-cli.ts"
```

- [ ] **Step 3: Ignorar os snapshots locais**

Modify `.gitignore` — adicionar a linha (criar o arquivo se não existir, preservando o conteúdo atual como `node_modules`/`dist`):

```
.snapshots/
```

- [ ] **Step 4: Atualizar o README**

Modify `README.md` — trocar a seção **Status** por:

```markdown
## Status

🧪 Fase 1 (engine + conteúdo) completa. Fase 2a (ingestão GitHub + cache de snapshot, headless) em implementação.

### Rodar a ingestão (smoke manual)

```bash
export GITHUB_TOKEN=<seu_PAT>   # escopo public_repo/read:user
npm run ingest -- <login-github>
```

Imprime o ecossistema computado e salva o snapshot em `.snapshots/<login>.json`.
```

- [ ] **Step 5: Verificar que a suíte segue verde e a CLI carrega**

Run: `npm test && npm run typecheck`
Expected: PASS — toda a suíte verde; typecheck limpo.

(Smoke manual opcional, requer token real: `GITHUB_TOKEN=... npm run ingest -- <seu-login>`.)

- [ ] **Step 6: Commit**

```bash
git add src/ingest-cli.ts package.json .gitignore README.md
git commit -m "feat: CLI de ingestão + script npm + docs"
```

---

## Self-Review (preenchido pelo autor do plano)

**1. Cobertura do spec (Fase 2a):**
- `github/types.ts` (RawProfile) → Task 1 ✔
- `github/normalize.ts` (puro) → Task 2 ✔
- `SnapshotStore` + InMemory → Task 3 ✔
- `FileSnapshotStore` → Task 4 ✔
- `github/client.ts` (@octokit/graphql, query, achatamento, erros, retry) → Task 5 ✔
- `ingest.ts` (orquestrador com DI, `now` injetado, determinismo) → Task 6 ✔
- `ingest-cli.ts` + script + docs → Task 7 ✔
- Casos de borda do §7 do spec: token ausente/401 (Task 5), perfil inexistente (Task 5), rate limit (Task 5), repo vazio/sem branch (Tasks 1,2), sem repos (Task 2), linguagem fora do mapa (herdado da Fase 1) ✔
- Estratégia de testes do §8: fixtures de normalize (Task 2), transport falso no client (Task 5), bateria de contrato dos stores (Tasks 3,4), fio determinístico do ingest (Task 6) ✔
- Itens em aberto do §11 decididos: `--cached` **omitido**; sanitização do nome de arquivo definida (Task 4); retry granularidade = 1 retry com `wait` injetável (Task 5).

**2. Placeholders:** nenhum "TODO/TBD"; todo passo de código mostra o código completo.

**3. Consistência de tipos:** assinaturas conferidas ponta a ponta — `RawProfile`/`RawRepo` (Task 1) usados em `normalize` (Task 2) e `client` (Task 5); `StoredSnapshot`/`SnapshotStore` (Task 3) usados em File (Task 4), `ingest` (Task 6) e CLI (Task 7); `GithubClient`/`createOctokitClient`/`PerfilNaoEncontrado` (Task 5) usados em `ingest` (Task 6) e CLI (Task 7); `normalize` (Task 2) e `computeEcosystem` (Fase 1) consumidos no `ingest` (Task 6). `IngestDeps.now: Date` → `computedAt = now.toISOString()` consistente entre Task 6 e o tipo da Task 3.

---

## Roadmap (próximas fatias — planos separados)

- **Fase 2b — App web + OAuth + persistência Postgres:** Next.js (App Router) + Tailwind; OAuth GitHub (Supabase Auth); promover `SnapshotStore` para uma impl Supabase/Postgres (a interface já existe); página "Sua Reserva" (`render-web`, pixel-art) + ficha de espécie; política de TTL/revalidação de cache.
- **Fase 3 — Embed SVG do perfil:** rota `/{usuario}.svg` computando on-the-fly de dados públicos; cache (headers + Camo); snippet copia-e-cola.
