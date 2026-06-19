import { describe, it, expect } from 'vitest';
import { morphForRepo, morphRank, prestigeFromStars } from './morph.js';
import type { NormalizedRepo } from '../domain/types.js';

function repo(id: string): NormalizedRepo {
  return { id, name: 'x', primaryLanguage: 'Go', stars: 0, commitCount: 10, createdAt: '2024-01-01T00:00:00Z', pushedAt: '2024-02-01T00:00:00Z' };
}

describe('morphForRepo', () => {
  it('é determinístico', () => {
    expect(morphForRepo(repo('abc'))).toBe(morphForRepo(repo('abc')));
  });

  it('a esmagadora maioria é normal e morphs raros aparecem em proporção pequena', () => {
    let normal = 0, especiais = 0;
    for (let i = 0; i < 20000; i++) {
      const m = morphForRepo(repo(`repo-${i}`));
      if (m === 'normal') normal++; else especiais++;
    }
    expect(normal).toBeGreaterThan(especiais * 50); // < ~2% especiais
    expect(especiais).toBeGreaterThan(0);            // mas existem
  });
});

describe('morphRank', () => {
  it('ordena do comum ao raro', () => {
    expect(morphRank('normal')).toBe(0);
    expect(morphRank('melanico')).toBeGreaterThan(morphRank('albino'));
    expect(morphRank('albino')).toBeGreaterThan(morphRank('shiny'));
  });

  it('retorna os valores exatos mandatados', () => {
    expect(morphRank('normal')).toBe(0);
    expect(morphRank('shiny')).toBe(1);
    expect(morphRank('albino')).toBe(2);
    expect(morphRank('melanico')).toBe(3);
  });
});

describe('prestigeFromStars', () => {
  it('mapeia faixas de stars para 0–5', () => {
    expect(prestigeFromStars(0)).toBe(0);
    expect(prestigeFromStars(5)).toBe(1);
    expect(prestigeFromStars(30)).toBe(2);
    expect(prestigeFromStars(120)).toBe(3);
    expect(prestigeFromStars(500)).toBe(4);
    expect(prestigeFromStars(5000)).toBe(5);
  });

  it('cobre limites exatos das faixas de prestígio', () => {
    expect(prestigeFromStars(0)).toBe(0);
    expect(prestigeFromStars(1)).toBe(1);
    expect(prestigeFromStars(9)).toBe(1);
    expect(prestigeFromStars(10)).toBe(2);
    expect(prestigeFromStars(49)).toBe(2);
    expect(prestigeFromStars(50)).toBe(3);
    expect(prestigeFromStars(199)).toBe(3);
    expect(prestigeFromStars(200)).toBe(4);
    expect(prestigeFromStars(999)).toBe(4);
    expect(prestigeFromStars(1000)).toBe(5);
  });
});
