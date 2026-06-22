import { describe, it, expect } from 'vitest';
import { computeEcosystem } from './ecosystem.js';
import type { NormalizedProfile } from '../domain/types.js';

const NOW = new Date('2024-12-31T00:00:00Z');

const profile: NormalizedProfile = {
  login: 'dev',
  avatarUrl: 'http://x/avatar.png',
  languageBytes: { TypeScript: 50000, Python: 12000, Brainfuck: 10 },
  repos: [
    { id: 'r1', name: 'front', primaryLanguage: 'TypeScript', stars: 300, commitCount: 200, createdAt: '2021-01-01T00:00:00Z', pushedAt: '2024-12-20T00:00:00Z' },
    { id: 'r2', name: 'lib', primaryLanguage: 'TypeScript', stars: 2, commitCount: 8, createdAt: '2024-12-10T00:00:00Z', pushedAt: '2024-12-20T00:00:00Z' },
    { id: 'r3', name: 'script', primaryLanguage: 'Python', stars: 0, commitCount: 3, createdAt: '2023-01-01T00:00:00Z', pushedAt: '2023-02-01T00:00:00Z' },
    { id: 'r4', name: 'wat', primaryLanguage: 'Brainfuck', stars: 0, commitCount: 50, createdAt: '2020-01-01T00:00:00Z', pushedAt: '2020-02-01T00:00:00Z' },
  ],
};

describe('computeEcosystem', () => {
  it('cria um espécime por repo', () => {
    const eco = computeEcosystem(profile, NOW);
    expect(eco.totalEspecimes).toBe(4);
  });

  it('agrupa por bioma e ordena por proeminência (bytes de linguagem)', () => {
    const eco = computeEcosystem(profile, NOW);
    const ids = eco.biomes.map((b) => b.biome.id);
    expect(ids[0]).toBe('jardim');   // TypeScript = mais bytes
    expect(ids).toContain('selva');  // Python
    expect(ids).toContain('inexplorado'); // Brainfuck (desconhecida)
  });

  it('só inclui biomas com pelo menos um espécime', () => {
    const eco = computeEcosystem(profile, NOW);
    expect(eco.biomes.every((b) => b.specimens.length > 0)).toBe(true);
    expect(eco.biomes.find((b) => b.biome.id === 'deserto')).toBeUndefined();
  });

  it('calcula biodiversidade como espécies distintas', () => {
    const eco = computeEcosystem(profile, NOW);
    const distintas = new Set(eco.biomes.flatMap((b) => b.specimens.map((s) => s.species.id)));
    expect(eco.biodiversidade).toBe(distintas.size);
  });

  it('escolhe o espécime mais raro (prestígio alto entre normais)', () => {
    const eco = computeEcosystem(profile, NOW);
    expect(eco.rarest).not.toBeNull();
    // r1 tem 300 stars => prestige 4; nenhum morph especial esperado neste fixture.
    expect(eco.rarest!.prestige).toBe(4);
    expect(eco.rarest!.repoName).toBe('front');
  });

  it('é determinístico', () => {
    const a = computeEcosystem(profile, NOW);
    const b = computeEcosystem(profile, NOW);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('perfil sem repos gera ecossistema vazio com rarest null', () => {
    const vazio = computeEcosystem({ ...profile, repos: [], languageBytes: {} }, NOW);
    expect(vazio.totalEspecimes).toBe(0);
    expect(vazio.biomes).toEqual([]);
    expect(vazio.rarest).toBeNull();
    expect(vazio.biodiversidade).toBe(0);
  });
});
