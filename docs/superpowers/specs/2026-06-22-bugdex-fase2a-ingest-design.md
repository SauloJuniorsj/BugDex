# BugDex — Fase 2a: Ingestão GitHub + cache de snapshot (headless) — Design

- **Data:** 2026-06-22
- **Status:** Design aprovado (aguardando revisão final do spec)
- **Fase anterior:** [Fase 1 — Engine + Conteúdo](../plans/2026-06-19-bugdex-fase1-engine.md) (completa: `domain` + `content` + `engine`, 39 testes verdes)
- **Design-mãe:** [BugDex — Documento de Design](2026-06-19-bugdex-design.md)

---

## 1. Resumo (1 frase)

Adicionar a camada de **ingestão** do BugDex — buscar dados reais de um perfil do GitHub via GraphQL, normalizá-los para `NormalizedProfile` (o input do engine da Fase 1), computar o ecossistema e persistir o snapshot — tudo **headless e testável**, sem UI, sem OAuth e sem banco externo.

## 2. Contexto e fatiamento

O roadmap da Fase 1 define a "Fase 2" como *App web + OAuth + persistência + fetch real*. Isso empacota vários subsistemas independentes (Next.js, OAuth, Supabase, `github-ingest`, `render-web`). Para manter ciclos curtos e validáveis, decompomos:

- **Fase 2a (este spec):** ingestão GitHub + cache de snapshot, headless, validado por testes/CLI.
- **Fase 2b (futura):** App web Next.js + OAuth GitHub + página "Sua Reserva" (`render-web`) + ficha de espécie; promove o `SnapshotStore` para Supabase/Postgres.
- **Fase 3 (futura):** embed SVG do perfil.

Decisões desta fatia:
- **OAuth adiado** para a Fase 2b — é um fluxo de redirect no browser, órfão sem UI. Aqui usamos um **token de ambiente** (`GITHUB_TOKEN`/PAT) para buscar dados públicos de qualquer login.
- **Persistência por interface** `SnapshotStore` com implementações **in-memory** e **arquivo JSON**; Supabase/Postgres entra como mais uma implementação na Fase 2b, sem alterar o resto.
- **Cliente GraphQL:** `@octokit/graphql` (primeira dependência de runtime do projeto) — traz tipos, retry e throttling prontos.

## 3. Objetivos e não-objetivos

**Objetivos**
- `github-ingest`: buscar (GraphQL) e normalizar dados reais para `NormalizedProfile`.
- Persistir/recuperar `EcosystemSnapshot` por uma interface com 2 implementações testáveis.
- Orquestrar o fio ponta-a-ponta (`ingestProfile`) de forma determinística (injetando `now`, `client`, `store`).
- CLI para smoke test manual contra o GitHub real.
- Continuar a disciplina da Fase 1: núcleo puro, I/O nas bordas, tudo coberto por testes headless.

**Não-objetivos (desta fatia)**
- OAuth / sessão / persistir token de usuário.
- Supabase / Postgres (a interface fica pronta para recebê-lo depois).
- Paginação além de 100 repositórios.
- Política de TTL / revalidação de cache.
- Qualquer UI ou render (web/embed).
- Calendário de contribuições / streak (Onda 2).

## 4. Arquitetura & layout de módulos

A fatia adiciona uma camada de ingestão **ao redor** do núcleo da Fase 1, sem tocar em `domain/`, `content/` ou `engine/`.

```
src/
  github/
    types.ts           # RawProfile e subtipos (shape do payload GraphQL consumido).
    client.ts          # ÚNICA peça com I/O de rede. Wrappa @octokit/graphql.
    client.test.ts     # transport injetado (fake) — sem rede real.
    normalize.ts       # PURA: normalize(raw: RawProfile): NormalizedProfile.
    normalize.test.ts  # fixtures de payload → NormalizedProfile; bordas.
  store/
    snapshot-store.ts  # interface SnapshotStore + tipo StoredSnapshot.
    in-memory-store.ts # impl em Map (default p/ testes).
    file-store.ts      # impl em arquivo JSON local (um arquivo por login).
    store.test.ts      # bateria de contrato comum às duas impls.
  ingest.ts            # orquestra: client → normalize → computeEcosystem → store.
  ingest.test.ts       # client + store fake; valida o fio determinístico.
  ingest-cli.ts        # CLI: GITHUB_TOKEN + login → ingest → imprime resumo.
```

**Fronteiras (continuação da Fase 1):**
- `github/normalize.ts` e `store/in-memory-store.ts` são **puros/determinísticos** — sem `Date.now()`, `new Date()` sem argumento, `Math.random()` ou I/O.
- `github/client.ts` é a **única** fonte de I/O de rede; `store/file-store.ts` é a única de I/O de disco. Ambos isolados e mockáveis.
- `ingest.ts` não conhece HTTP/GraphQL diretamente: recebe `client`, `store` e `now` por injeção de dependência → testável sem rede nem disco.
- O pacote da Fase 1 é consumido como está, sem alterações.

## 5. Contratos dos módulos

### 5.1 `github/types.ts`

```ts
export interface RawProfile {
  login: string;
  avatarUrl: string;
  repositories: RawRepo[];
}
export interface RawRepo {
  id: string;              // node_id do GitHub (estável entre visitas)
  name: string;
  isFork: boolean;
  stargazerCount: number;
  createdAt: string;       // ISO 8601
  pushedAt: string | null; // ISO 8601; null em repo vazio
  primaryLanguage: { name: string } | null;
  languages: { size: number; name: string }[];       // achatado de languages.edges
  defaultBranchRef: { totalCommits: number } | null;  // history.totalCount do branch default
}
```

### 5.2 `github/client.ts`

```ts
export interface GithubClient {
  fetchProfile(login: string): Promise<RawProfile>;
}
export function createOctokitClient(token: string): GithubClient;
```

- Roda **uma** query GraphQL sobre `user(login:)` →
  `repositories(first: 100, ownerAffiliations: [OWNER], isFork: false, orderBy: { field: PUSHED_AT, direction: DESC })`
  pedindo: `id`, `name`, `isFork`, `stargazerCount`, `createdAt`, `pushedAt`,
  `primaryLanguage { name }`, `languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } }`,
  `defaultBranchRef { target { ... on Commit { history { totalCount } } } }`.
- Achata `languages.edges` → `{ size, name }[]` e `history.totalCount` → `totalCommits` aqui, devolvendo um `RawProfile` já limpo.
- **Não pagina** nesta fatia (cap de 100 repos — limite conhecido, documentado).

### 5.3 `github/normalize.ts`

```ts
export function normalize(raw: RawProfile): NormalizedProfile;
```

- `login` ← `raw.login`; `avatarUrl` ← `raw.avatarUrl`.
- `languageBytes`: soma de `languages[].size` por nome, **agregada entre todos os repos**.
- `repos[]`: cada `RawRepo` → `NormalizedRepo`:
  - `id` ← `id`
  - `name` ← `name`
  - `primaryLanguage` ← `primaryLanguage?.name ?? null`
  - `stars` ← `stargazerCount`
  - `commitCount` ← `defaultBranchRef?.totalCommits ?? 0`
  - `createdAt` ← `createdAt`
  - `pushedAt` ← `pushedAt ?? createdAt` (fallback p/ repo vazio)
- Função pura: sem rede, sem relógio, sem aleatoriedade.

### 5.4 `store/snapshot-store.ts`

```ts
export interface StoredSnapshot {
  login: string;
  ecosystem: Ecosystem;   // tipo da Fase 1
  computedAt: string;     // ISO 8601 — quem grava passa o now; o store não lê relógio
}
export interface SnapshotStore {
  get(login: string): Promise<StoredSnapshot | null>;
  put(snapshot: StoredSnapshot): Promise<void>;
}
```

- `InMemorySnapshotStore` — `Map<login, StoredSnapshot>`.
- `FileSnapshotStore(dir)` — um arquivo JSON por login (nome do arquivo sanitizado do login).
- Mesma **bateria de contrato** roda contra ambas: put→get round-trip, `get` de inexistente → `null`, sobrescrita por novo `put`.

### 5.5 `ingest.ts`

```ts
export interface IngestDeps {
  client: GithubClient;
  store: SnapshotStore;
  now: Date;
}
export async function ingestProfile(login: string, deps: IngestDeps): Promise<StoredSnapshot>;
```

- Fluxo: `client.fetchProfile(login)` → `normalize` → `computeEcosystem(profile, now)` → monta `StoredSnapshot { login, ecosystem, computedAt: now.toISOString() }` → `store.put(snapshot)` → retorna o snapshot.
- `now` injetado mantém determinismo nos testes.
- A política de leitura-de-cache/TTL **não** vive aqui (fora do escopo); quem chama decide. Uma flag `--cached` na CLI (que só lê do store) é opcional — decidida no plano.

## 6. Fluxo de dados (headless, ponta-a-ponta)

```
CLI (token + login)
   → GithubClient.fetchProfile(login)          [rede: 1 query GraphQL]
   → normalize(raw): NormalizedProfile          [puro]
   → computeEcosystem(profile, now): Ecosystem  [engine F1, puro]
   → StoredSnapshot{ login, ecosystem, computedAt }
   → SnapshotStore.put(snapshot)                [memória ou arquivo]
   → imprime resumo (estilo demo.ts)
```

## 7. Tratamento de erros & casos de borda

- **Token ausente/inválido** → `client` lança erro claro (`GITHUB_TOKEN não definido` / 401); a CLI sai com código ≠ 0 e mensagem amigável.
- **Login inexistente / perfil privado** → GraphQL retorna erro ou `user: null` → `client` lança `PerfilNaoEncontrado(login)`.
- **Rate limit (403 / secondary)** → o `client` faz **um** retry com backoff curto; persistindo, propaga erro tipado. (Throttle elaborado fica para a Fase 2b.)
- **Repo vazio / sem branch default** → `defaultBranchRef = null` → `commitCount = 0` → engine trata como `ovo`. Sem crash.
- **Usuário sem repos** → `repos = []` → `computeEcosystem` devolve ecossistema vazio (`rarest: null`) — já coberto na Fase 1.
- **Linguagem fora do mapa** → bioma `inexplorado` (Fase 1).

## 8. Estratégia de testes

- **`normalize.test.ts`** — fixtures de `RawProfile` (perfil cheio; repo vazio/sem branch; sem linguagem; sem repos) → asserts no `NormalizedProfile`. Puro, sem mocks.
- **`client.test.ts`** — injeta um **transport falso** (recebe a query, devolve payload/erros canned): valida que a query pede os campos certos, o achatamento de `languages`/`history`, e o mapeamento de erros (401, `user: null`, rate limit). Sem rede real.
- **`store/store.test.ts`** — bateria de contrato única rodada contra `InMemory` e `File` (put→get, get de inexistente → null, sobrescrita). `FileSnapshotStore` usa diretório temporário.
- **`ingest.test.ts`** — `client` e `store` fake; verifica o fio: fetch chamado uma vez, normaliza, computa, grava com `computedAt = now`, e o resultado é **determinístico** (mesmo input + mesmo `now` → mesmo JSON).
- Sem teste de rede real no CI; a CLI é o smoke manual contra o GitHub de verdade.

## 9. Dependências

- **Runtime (nova):** `@octokit/graphql`.
- **Dev:** nada novo (Vitest mocka o transport; `tsx` já roda CLIs).
- `package.json` ganha um script `ingest` (ex.: `tsx src/ingest-cli.ts`).

## 10. Restrições globais (herdadas da Fase 1)

- Node.js **>= 20**; ESM (`"type": "module"`).
- TypeScript **strict**; sem `any` implícito.
- **Determinismo:** nada em `github/normalize.ts`, `store/in-memory-store.ts` ou no caminho puro do `ingest` pode chamar relógio/aleatório/I/O; `now: Date` é injetado.
- Idioma: identificadores e mensagens em pt-BR; ids em kebab-case ASCII.
- Testes co-localizados como `*.test.ts`.
- Commits pequenos e frequentes, um por task, em pt-BR (Conventional Commits).

## 11. Itens em aberto (decididos no plano)

- Flag `--cached` na CLI (só leitura do store) — incluir ou omitir.
- Formato exato do nome de arquivo no `FileSnapshotStore` (sanitização do login).
- Granularidade do retry de rate limit no `client`.

## 12. Próximos passos

1. Revisão final deste spec pelo autor.
2. Invocar **writing-plans** para gerar o plano de implementação detalhado (task-by-task, TDD), espelhando o formato do plano da Fase 1.
