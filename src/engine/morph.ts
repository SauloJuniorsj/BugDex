import type { NormalizedRepo, MorphType } from '../domain/types.js';
import { stableHash } from '../util/hash.js';

export function morphForRepo(repo: NormalizedRepo): MorphType {
  const r = stableHash(`${repo.id}:morph`) % 10_000;
  if (r < 30) return 'shiny';      // 0,30%
  if (r < 45) return 'albino';     // 0,15%
  if (r < 55) return 'melanico';   // 0,10%
  return 'normal';
}

const RANK: Record<MorphType, number> = { normal: 0, shiny: 1, albino: 2, melanico: 3 };

export function morphRank(morph: MorphType): number {
  return RANK[morph];
}

export function prestigeFromStars(stars: number): number {
  if (stars >= 1000) return 5;
  if (stars >= 200) return 4;
  if (stars >= 50) return 3;
  if (stars >= 10) return 2;
  if (stars >= 1) return 1;
  return 0;
}
