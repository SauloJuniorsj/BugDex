import { createOctokitClient } from './github/client.js';
import { FileSnapshotStore } from './store/file-store.js';
import { ingestProfile } from './ingest.js';

const login = process.argv[2];
const token = process.env.GITHUB_TOKEN;

if (!login) {
  console.error('Uso: npm run ingest -- <login-github>');
  process.exit(1);
}
if (!token) {
  console.error('Defina a variável de ambiente GITHUB_TOKEN (PAT com escopo public_repo/read:user).');
  process.exit(1);
}

const client = createOctokitClient(token);
const store = new FileSnapshotStore('.snapshots');

try {
  const snap = await ingestProfile(login, { client, store, now: new Date() });
  const eco = snap.ecosystem;
  console.log(`🪲 BugDex — reserva de @${eco.login}  (computado em ${snap.computedAt})`);
  console.log(`Biodiversidade: ${eco.biodiversidade} | Espécimes: ${eco.totalEspecimes}`);
  if (eco.rarest) {
    console.log(`Mais raro: ${eco.rarest.species.nome} (${eco.rarest.morph}, prestígio ${eco.rarest.prestige})`);
  }
  console.log('');
  for (const bp of eco.biomes) {
    console.log(`${bp.biome.emoji} ${bp.biome.nome}`);
    for (const s of bp.specimens) {
      const tag = s.morph === 'normal' ? '' : ` ✨${s.morph}`;
      console.log(`   • ${s.species.nome} [${s.stage}]${tag} — repo "${s.repoName}"`);
    }
  }
  console.log(`\nSnapshot salvo em .snapshots/`);
} catch (err) {
  console.error(`Falha ao ingerir @${login}: ${(err as Error).message}`);
  process.exit(1);
}
