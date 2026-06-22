import type { NormalizedProfile, NormalizedRepo } from '../domain/types.js';
import type { RawProfile, RawRepo } from './types.js';

function toNormalizedRepo(r: RawRepo): NormalizedRepo {
  return {
    id: r.id,
    name: r.name,
    primaryLanguage: r.primaryLanguage?.name ?? null,
    stars: r.stargazerCount,
    commitCount: r.defaultBranchRef?.totalCommits ?? 0,
    createdAt: r.createdAt,
    pushedAt: r.pushedAt ?? r.createdAt,
  };
}

export function normalize(raw: RawProfile): NormalizedProfile {
  const languageBytes: Record<string, number> = {};
  for (const repo of raw.repositories) {
    for (const lang of repo.languages) {
      languageBytes[lang.name] = (languageBytes[lang.name] ?? 0) + lang.size;
    }
  }
  return {
    login: raw.login,
    avatarUrl: raw.avatarUrl,
    languageBytes,
    repos: raw.repositories.map(toNormalizedRepo),
  };
}
