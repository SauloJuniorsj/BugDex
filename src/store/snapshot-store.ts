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
