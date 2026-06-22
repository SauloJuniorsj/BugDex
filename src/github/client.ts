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
