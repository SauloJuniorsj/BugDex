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
