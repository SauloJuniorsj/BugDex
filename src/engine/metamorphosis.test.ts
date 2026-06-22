import { describe, it, expect } from 'vitest';
import { metamorphosisStage } from './metamorphosis.js';
import type { NormalizedRepo } from '../domain/types.js';

const NOW = new Date('2024-12-31T00:00:00Z');

function repo(over: Partial<NormalizedRepo>): NormalizedRepo {
  return {
    id: 'r', name: 'x', primaryLanguage: 'Go', stars: 0,
    commitCount: 100, createdAt: '2020-01-01T00:00:00Z', pushedAt: '2024-12-01T00:00:00Z',
    ...over,
  };
}

describe('metamorphosisStage', () => {
  it('ovo quando há pouquíssimos commits', () => {
    expect(metamorphosisStage(repo({ commitCount: 2 }), NOW)).toBe('ovo');
  });

  it('larva quando o repo é jovem (< 90 dias) e tem commits suficientes', () => {
    expect(metamorphosisStage(repo({ commitCount: 30, createdAt: '2024-12-01T00:00:00Z' }), NOW)).toBe('larva');
  });

  it('pupa quando é maduro mas está dormente (sem push há > 180 dias)', () => {
    expect(metamorphosisStage(repo({ commitCount: 200, createdAt: '2021-01-01T00:00:00Z', pushedAt: '2024-01-01T00:00:00Z' }), NOW)).toBe('pupa');
  });

  it('adulto quando é maduro e ativo', () => {
    expect(metamorphosisStage(repo({ commitCount: 200, createdAt: '2021-01-01T00:00:00Z', pushedAt: '2024-12-20T00:00:00Z' }), NOW)).toBe('adulto');
  });
});

describe('metamorphosisStage — bordas', () => {
  it('commitCount: 4 → ovo (último valor ovo)', () => {
    expect(metamorphosisStage(repo({ commitCount: 4 }), NOW)).toBe('ovo');
  });

  it('commitCount: 5 com repo jovem → larva (primeiro acima de ovo)', () => {
    const createdAt = new Date(NOW.getTime() - 10 * 86_400_000).toISOString();
    expect(metamorphosisStage(repo({ commitCount: 5, createdAt, pushedAt: NOW.toISOString() }), NOW)).toBe('larva');
  });

  it('idade exatamente 90 dias: createdAt 90d atrás → adulto (90 não é < 90)', () => {
    const createdAt = new Date(NOW.getTime() - 90 * 86_400_000).toISOString();
    expect(metamorphosisStage(repo({ commitCount: 50, createdAt, pushedAt: NOW.toISOString() }), NOW)).toBe('adulto');
  });

  it('idade exatamente 89 dias: createdAt 89d atrás → larva', () => {
    const createdAt = new Date(NOW.getTime() - 89 * 86_400_000).toISOString();
    expect(metamorphosisStage(repo({ commitCount: 50, createdAt, pushedAt: NOW.toISOString() }), NOW)).toBe('larva');
  });

  it('sem push há exatamente 180 dias → adulto (180 não é > 180)', () => {
    const createdAt = '2020-01-01T00:00:00Z';
    const pushedAt = new Date(NOW.getTime() - 180 * 86_400_000).toISOString();
    expect(metamorphosisStage(repo({ commitCount: 50, createdAt, pushedAt }), NOW)).toBe('adulto');
  });

  it('sem push há exatamente 181 dias → pupa', () => {
    const createdAt = '2020-01-01T00:00:00Z';
    const pushedAt = new Date(NOW.getTime() - 181 * 86_400_000).toISOString();
    expect(metamorphosisStage(repo({ commitCount: 50, createdAt, pushedAt }), NOW)).toBe('pupa');
  });
});
