import { describe, it, expect } from 'vitest';
import type { Species, NormalizedRepo, Ecosystem } from './types.js';

describe('domain types', () => {
  it('permite montar objetos válidos dos tipos principais', () => {
    const sp: Species = {
      id: 'joaninha',
      nome: 'Joaninha',
      biomeId: 'jardim',
      spriteKey: 'joaninha',
      curiosidade: 'Devora milhares de pulgões ao longo da vida.',
    };
    const repo: NormalizedRepo = {
      id: 'r1',
      name: 'meu-repo',
      primaryLanguage: 'TypeScript',
      stars: 12,
      commitCount: 40,
      createdAt: '2024-01-01T00:00:00Z',
      pushedAt: '2024-06-01T00:00:00Z',
    };
    const eco: Ecosystem = {
      login: 'fulano',
      avatarUrl: '',
      biomes: [],
      biodiversidade: 0,
      rarest: null,
      totalEspecimes: 0,
    };
    expect(sp.biomeId).toBe('jardim');
    expect(repo.primaryLanguage).toBe('TypeScript');
    expect(eco.rarest).toBeNull();
  });
});
