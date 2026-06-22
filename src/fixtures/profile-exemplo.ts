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
