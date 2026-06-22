import { describe, it, expect } from 'vitest';
import { ALL_BIOMES, biomeForLanguage, getBiomeById, INEXPLORADO_ID } from './biomes.js';
import { ALL_SPECIES } from './species.js';

describe('biomes dataset', () => {
  it('tem ids únicos e todo bioma tem pelo menos uma espécie', () => {
    const ids = ALL_BIOMES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of ALL_BIOMES) {
      expect(b.speciesIds.length).toBeGreaterThan(0);
    }
  });

  it('todo speciesId referencia uma espécie existente, e vice-versa', () => {
    const speciesIds = new Set(ALL_SPECIES.map((s) => s.id));
    for (const b of ALL_BIOMES) {
      for (const sid of b.speciesIds) {
        expect(speciesIds.has(sid)).toBe(true);
      }
    }
    // toda espécie pertence a exatamente um bioma listado
    for (const s of ALL_SPECIES) {
      const owner = ALL_BIOMES.find((b) => b.speciesIds.includes(s.id));
      expect(owner?.id).toBe(s.biomeId);
    }
  });

  it('mapeia linguagem para bioma (case-insensitive)', () => {
    expect(biomeForLanguage('TypeScript').id).toBe('jardim');
    expect(biomeForLanguage('typescript').id).toBe('jardim');
    expect(biomeForLanguage('Python').id).toBe('selva');
    expect(biomeForLanguage('Rust').id).toBe('vulcanico');
  });

  it('linguagem desconhecida ou null cai no bioma inexplorado', () => {
    expect(biomeForLanguage('Brainfuck').id).toBe(INEXPLORADO_ID);
    expect(biomeForLanguage(null).id).toBe(INEXPLORADO_ID);
  });

  it('getBiomeById lança em id inexistente', () => {
    expect(getBiomeById('jardim').nome).toBe('Jardim Exuberante');
    expect(() => getBiomeById('nada')).toThrow();
  });
});
