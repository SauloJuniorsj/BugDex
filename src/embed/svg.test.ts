import { describe, it, expect } from 'vitest';
import { escapeXml, spriteToRects, stars, truncate } from './svg.js';
import type { Sprite } from './sprite.js';

describe('escapeXml', () => {
  it('escapa os 5 caracteres especiais', () => {
    expect(escapeXml(`a&b<c>"d'e`)).toBe('a&amp;b&lt;c&gt;&quot;d&apos;e');
  });
});

describe('spriteToRects', () => {
  it('emite um <rect> por célula não-vazia com a cor da paleta', () => {
    const sprite: Sprite = {
      grid: [
        [-1, 0],
        [2, -1],
      ],
      palette: ['#000000', '#111111', '#222222', '#333333'],
    };
    const out = spriteToRects(sprite, 10, 20, 4);
    expect((out.match(/<rect /g) ?? []).length).toBe(2);
    expect(out).toContain('fill="#000000"'); // célula valor 0 (contorno)
    expect(out).toContain('fill="#222222"'); // célula valor 2 (base)
    // célula [0][1] (valor 0) -> x = 10 + 1*4 = 14; célula [1][0] (valor 2) -> x = 10.
    expect(out).toContain('x="14"');
  });

  it('posiciona pela origem e pelo tamanho da célula', () => {
    const sprite: Sprite = { grid: [[2]], palette: ['#000000', '#111111', '#222222', '#333333'] };
    expect(spriteToRects(sprite, 5, 7, 3)).toContain('x="5" y="7" width="3" height="3"');
  });
});

describe('truncate', () => {
  it('mantém strings dentro do limite', () => {
    expect(truncate('curto', 10)).toBe('curto');
  });
  it('encurta com elipse quando excede', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });
});

describe('stars', () => {
  it('mapeia prestígio 0–5 em 5 estrelas', () => {
    expect(stars(3)).toBe('★★★☆☆');
    expect(stars(0)).toBe('☆☆☆☆☆');
    expect(stars(5)).toBe('★★★★★');
  });
  it('clampa fora do intervalo', () => {
    expect(stars(9)).toBe('★★★★★');
    expect(stars(-2)).toBe('☆☆☆☆☆');
  });
});
