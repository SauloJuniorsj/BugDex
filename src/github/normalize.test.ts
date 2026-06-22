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
