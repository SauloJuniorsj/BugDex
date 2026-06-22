import { computeEcosystem } from './engine/ecosystem.js';
import { PROFILE_EXEMPLO } from './fixtures/profile-exemplo.js';

const eco = computeEcosystem(PROFILE_EXEMPLO, new Date());

console.log(`🪲 BugDex — reserva de @${eco.login}`);
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
