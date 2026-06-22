import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { FileSnapshotStore } from './store/file-store.js';
import { renderEmbed } from './embed/render.js';

const login = process.argv[2];

if (!login) {
  console.error('Uso: npm run embed -- <login-github>');
  process.exit(1);
}

const store = new FileSnapshotStore('.snapshots');
const snap = await store.get(login);

if (!snap) {
  console.error(`Sem snapshot para @${login}. Rode antes: npm run ingest -- ${login}`);
  process.exit(1);
}

const svg = renderEmbed(snap.ecosystem);
await mkdir('.embed', { recursive: true });
const file = join('.embed', `${login.toLowerCase().replace(/[^a-z0-9-]/g, '_')}.svg`);
await writeFile(file, svg, 'utf8');
console.log(`SVG do embed gravado em ${file}`);
