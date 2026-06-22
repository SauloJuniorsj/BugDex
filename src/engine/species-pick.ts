import type { NormalizedRepo, Biome, Species } from '../domain/types.js';
import { stableHash } from '../util/hash.js';
import { getSpeciesById } from '../content/species.js';

/**
 * Escolhe deterministicamente uma espécie do pool do bioma a partir do id do repo.
 *
 * Nota: o design §6 mencionava um "viés por stars" (mais stars → espécie mais rara do pool).
 * Esse viés foi intencionalmente omitido na Fase 1: a seleção é puramente determinística pelo
 * hash do repo. O sinal de stars já é carregado pelo campo `prestige` do espécime.
 */
export function speciesForRepo(repo: NormalizedRepo, biome: Biome): Species {
  const pool = biome.speciesIds;
  const idx = stableHash(`${repo.id}:species`) % pool.length;
  const speciesId = pool[idx]!; // pool nunca é vazio (garantido pelo teste da Task 5)
  return getSpeciesById(speciesId);
}
