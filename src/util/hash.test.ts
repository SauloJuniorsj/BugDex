import { describe, it, expect } from 'vitest';
import { stableHash } from './hash.js';

describe('stableHash', () => {
  it('é determinístico para a mesma entrada', () => {
    expect(stableHash('r1:morph')).toBe(stableHash('r1:morph'));
  });

  it('retorna inteiro >= 0 dentro do range 32-bit', () => {
    const h = stableHash('qualquer-coisa');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it('produz valores diferentes para entradas diferentes (sem colisão trivial)', () => {
    expect(stableHash('r1:species')).not.toBe(stableHash('r2:species'));
    expect(stableHash('abc')).not.toBe(stableHash('abd'));
  });
});
