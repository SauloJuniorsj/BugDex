import type { GithubClient } from './github/client.js';
import { normalize } from './github/normalize.js';
import { computeEcosystem } from './engine/ecosystem.js';
import type { SnapshotStore, StoredSnapshot } from './store/snapshot-store.js';

export interface IngestDeps {
  client: GithubClient;
  store: SnapshotStore;
  now: Date;
}

export async function ingestProfile(login: string, deps: IngestDeps): Promise<StoredSnapshot> {
  const raw = await deps.client.fetchProfile(login);
  const profile = normalize(raw);
  const ecosystem = computeEcosystem(profile, deps.now);
  const snapshot: StoredSnapshot = {
    login: profile.login,
    ecosystem,
    computedAt: deps.now.toISOString(),
  };
  await deps.store.put(snapshot);
  return snapshot;
}
