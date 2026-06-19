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
