import type {
  NormalizedProfile, NormalizedRepo, Ecosystem, Specimen, BiomePopulation, Biome,
} from '../domain/types.js';
import { biomeForLanguage } from '../content/biomes.js';
import { speciesForRepo } from './species-pick.js';
import { metamorphosisStage } from './metamorphosis.js';
import { morphForRepo, morphRank, prestigeFromStars } from './morph.js';

interface SpecimenWithRepo {
  specimen: Specimen;
  repo: NormalizedRepo;
  biome: Biome;
}

function buildSpecimen(repo: NormalizedRepo, now: Date): SpecimenWithRepo {
  const biome = biomeForLanguage(repo.primaryLanguage);
  const specimen: Specimen = {
    repoName: repo.name,
    species: speciesForRepo(repo, biome),
    stage: metamorphosisStage(repo, now),
    morph: morphForRepo(repo),
    prestige: prestigeFromStars(repo.stars),
  };
  return { specimen, repo, biome };
}

function biomeBytes(biome: Biome, profile: NormalizedProfile): number {
  let bytes = 0;
  for (const lang of biome.languages) bytes += profile.languageBytes[lang] ?? 0;
  return bytes;
}

export function computeEcosystem(profile: NormalizedProfile, now: Date): Ecosystem {
  const built = profile.repos.map((r) => buildSpecimen(r, now));

  // Agrupar por bioma.
  const groups = new Map<string, SpecimenWithRepo[]>();
  for (const b of built) {
    const arr = groups.get(b.biome.id) ?? [];
    arr.push(b);
    groups.set(b.biome.id, arr);
  }

  const biomes: BiomePopulation[] = [...groups.values()]
    .map((arr) => ({
      biome: arr[0]!.biome,
      specimens: arr.map((x) => x.specimen),
    }))
    .sort((a, b) => {
      // Primário: soma de bytes das linguagens do bioma (desc).
      const bytesDiff = biomeBytes(b.biome, profile) - biomeBytes(a.biome, profile);
      if (bytesDiff !== 0) return bytesDiff;
      // Desempate: número de espécimes (desc).
      return b.specimens.length - a.specimens.length;
    });

  const biodiversidade = new Set(built.map((b) => b.specimen.species.id)).size;

  let rarest: SpecimenWithRepo | null = null;
  for (const cur of built) {
    if (rarest === null || compareRarity(cur, rarest) > 0) rarest = cur;
  }

  return {
    login: profile.login,
    avatarUrl: profile.avatarUrl,
    biomes,
    biodiversidade,
    rarest: rarest ? rarest.specimen : null,
    totalEspecimes: built.length,
  };
}

/** > 0 se `a` é mais raro que `b`. */
function compareRarity(a: SpecimenWithRepo, b: SpecimenWithRepo): number {
  const byMorph = morphRank(a.specimen.morph) - morphRank(b.specimen.morph);
  if (byMorph !== 0) return byMorph;
  const byPrestige = a.specimen.prestige - b.specimen.prestige;
  if (byPrestige !== 0) return byPrestige;
  return a.repo.commitCount - b.repo.commitCount;
}
