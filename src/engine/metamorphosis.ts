import type { NormalizedRepo, MetamorphosisStage } from '../domain/types.js';

const DIA_MS = 86_400_000;
const COMMITS_MINIMOS = 5;
const JOVEM_DIAS = 90;
const DORMENTE_DIAS = 180;

export function metamorphosisStage(repo: NormalizedRepo, now: Date): MetamorphosisStage {
  if (repo.commitCount < COMMITS_MINIMOS) return 'ovo';

  const ageDays = (now.getTime() - new Date(repo.createdAt).getTime()) / DIA_MS;
  if (ageDays < JOVEM_DIAS) return 'larva';

  const sincePushDays = (now.getTime() - new Date(repo.pushedAt).getTime()) / DIA_MS;
  if (sincePushDays > DORMENTE_DIAS) return 'pupa';

  return 'adulto';
}
