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
