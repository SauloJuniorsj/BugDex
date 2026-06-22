import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SnapshotStore, StoredSnapshot } from './snapshot-store.js';

function sanitize(login: string): string {
  return login.toLowerCase().replace(/[^a-z0-9-]/g, '_');
}

export class FileSnapshotStore implements SnapshotStore {
  constructor(private readonly dir: string) {}

  private fileFor(login: string): string {
    return join(this.dir, `${sanitize(login)}.json`);
  }

  async get(login: string): Promise<StoredSnapshot | null> {
    try {
      const txt = await readFile(this.fileFor(login), 'utf8');
      return JSON.parse(txt) as StoredSnapshot;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async put(snapshot: StoredSnapshot): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.fileFor(snapshot.login), JSON.stringify(snapshot, null, 2), 'utf8');
  }
}
