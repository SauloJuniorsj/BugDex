import { describe, it, expect } from 'vitest';
import { speciesForRepo } from './species-pick.js';
import { getBiomeById } from '../content/biomes.js';
import type { NormalizedRepo } from '../domain/types.js';

const baseRepo: NormalizedRepo = {
  id: 'r1', name: 'x', primaryLanguage: 'TypeScript',
  stars: 0, commitCount: 10, createdAt: '2024-01-01T00:00:00Z', pushedAt: '2024-02-01T00:00:00Z',
};

describe('speciesForRepo', () => {
  it('é determinístico para o mesmo repo+bioma', () => {
    const jardim = getBiomeById('jardim');
    // Duas invocações independentes devem retornar o mesmo resultado.
    const result1 = speciesForRepo(baseRepo, jardim).id;
    const result2 = speciesForRepo(baseRepo, jardim).id;
    expect(result1).toBe(result2);
    // Valor fixo para evitar regressões silenciosas no algoritmo de hash/seleção.
    expect(result1).toBe('monarca');
  });

  it('sempre retorna uma espécie pertencente ao pool do bioma', () => {
    const jardim = getBiomeById('jardim');
    for (let i = 0; i < 50; i++) {
      const repo = { ...baseRepo, id: `r${i}` };
      expect(jardim.speciesIds).toContain(speciesForRepo(repo, jardim).id);
    }
  });

  it('repos diferentes tendem a mapear para espécies diferentes', () => {
    const jardim = getBiomeById('jardim');
    // não garantimos sempre diferente, mas o hash não deve fixar tudo num só.
    const distintos = new Set(
      Array.from({ length: 20 }, (_, i) => speciesForRepo({ ...baseRepo, id: `id${i}` }, jardim).id),
    );
    expect(distintos.size).toBeGreaterThan(1);
  });
});
