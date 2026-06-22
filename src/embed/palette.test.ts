import { describe, it, expect } from 'vitest';
import { spritePalette } from './palette.js';

describe('spritePalette', () => {
  it('retorna 4 tons [contorno, sombra, base, luz]', () => {
    const p = spritePalette('jardim', 'normal');
    expect(p).toHaveLength(4);
    for (const c of p) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('biomas diferentes têm base diferente', () => {
    expect(spritePalette('jardim', 'normal')[2]).not.toBe(spritePalette('vulcanico', 'normal')[2]);
  });

  it('morph altera a base (cor), de forma distinta por tipo', () => {
    const base = spritePalette('jardim', 'normal')[2];
    const shiny = spritePalette('jardim', 'shiny')[2];
    const albino = spritePalette('jardim', 'albino')[2];
    const melanico = spritePalette('jardim', 'melanico')[2];
    expect(new Set([base, shiny, albino, melanico]).size).toBe(4);
  });

  it('bioma desconhecido cai na paleta neutra (inexplorado)', () => {
    expect(spritePalette('nao-existe', 'normal')).toEqual(spritePalette('inexplorado', 'normal'));
  });

  it('é determinística', () => {
    expect(spritePalette('selva', 'shiny')).toEqual(spritePalette('selva', 'shiny'));
  });
});
