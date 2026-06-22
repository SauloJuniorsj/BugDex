import { describe, it, expect } from 'vitest';
import { buildSprite, SPRITE_SIZE, type Sprite } from './sprite.js';

function isSymmetric(s: Sprite): boolean {
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (s.grid[y]![x] !== s.grid[y]![SPRITE_SIZE - 1 - x]) return false;
    }
  }
  return true;
}

function countFilled(s: Sprite): number {
  let n = 0;
  for (const row of s.grid) for (const v of row) if (v >= 0) n++;
  return n;
}

describe('buildSprite', () => {
  it('produz grade 16x16 com paleta de 4 tons', () => {
    const s = buildSprite('joaninha', 'adulto', 'normal', 'jardim');
    expect(s.grid).toHaveLength(SPRITE_SIZE);
    for (const row of s.grid) expect(row).toHaveLength(SPRITE_SIZE);
    expect(s.palette).toHaveLength(4);
  });

  it('é bilateralmente simétrico', () => {
    expect(isSymmetric(buildSprite('abelha', 'adulto', 'normal', 'jardim'))).toBe(true);
    expect(isSymmetric(buildSprite('libelula', 'larva', 'shiny', 'pantano'))).toBe(true);
  });

  it('é determinístico (mesmos args -> mesmo sprite)', () => {
    expect(buildSprite('morpho-azul', 'pupa', 'normal', 'selva'))
      .toEqual(buildSprite('morpho-azul', 'pupa', 'normal', 'selva'));
  });

  it('só usa valores de tom válidos (-1..3)', () => {
    const s = buildSprite('cupim', 'adulto', 'melanico', 'savana');
    for (const row of s.grid) {
      for (const v of row) {
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(3);
      }
    }
  });

  it('estágios diferentes produzem formas diferentes', () => {
    const ovo = buildSprite('joaninha', 'ovo', 'normal', 'jardim');
    const adulto = buildSprite('joaninha', 'adulto', 'normal', 'jardim');
    expect(countFilled(ovo)).toBeLessThan(countFilled(adulto));
  });

  it('morph só muda a paleta, não a forma (mesma silhueta)', () => {
    const normal = buildSprite('joaninha', 'adulto', 'normal', 'jardim');
    const shiny = buildSprite('joaninha', 'adulto', 'shiny', 'jardim');
    const shape = (s: Sprite) => s.grid.map((r) => r.map((v) => (v >= 0 ? 1 : 0)));
    expect(shape(normal)).toEqual(shape(shiny));
    expect(normal.palette).not.toEqual(shiny.palette);
  });

  it('bioma inexplorado gera sprite válido', () => {
    const s = buildSprite('barata', 'adulto', 'normal', 'inexplorado');
    expect(s.grid).toHaveLength(SPRITE_SIZE);
  });
});
