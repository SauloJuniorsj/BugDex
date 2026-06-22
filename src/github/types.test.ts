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
