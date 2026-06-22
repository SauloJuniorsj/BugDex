import { describe, it, expect } from 'vitest';
import { ALL_SPECIES, getSpeciesById } from './species.js';

describe('species dataset', () => {
  it('tem ids únicos', () => {
    const ids = ALL_SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('toda espécie tem nome, spriteKey e curiosidade não-vazios', () => {
    for (const s of ALL_SPECIES) {
      expect(s.nome.length).toBeGreaterThan(0);
      expect(s.spriteKey.length).toBeGreaterThan(0);
      expect(s.curiosidade.length).toBeGreaterThan(0);
    }
  });

  it('getSpeciesById encontra e lança em id inexistente', () => {
    expect(getSpeciesById('joaninha').nome).toBe('Joaninha');
    expect(() => getSpeciesById('nao-existe')).toThrow();
  });
});
