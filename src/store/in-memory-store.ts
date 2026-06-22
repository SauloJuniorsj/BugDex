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
