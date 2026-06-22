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
