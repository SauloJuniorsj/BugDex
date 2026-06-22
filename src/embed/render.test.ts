import { describe, it, expect } from 'vitest';
import { renderEmbed } from './render.js';
import { computeEcosystem } from '../engine/ecosystem.js';
import { PROFILE_EXEMPLO } from '../fixtures/profile-exemplo.js';
import type { Ecosystem } from '../domain/types.js';

const FIXED = new Date('2025-01-01T00:00:00Z');

describe('renderEmbed', () => {
  const eco = computeEcosystem(PROFILE_EXEMPLO, FIXED);

  it('produz um SVG bem-formado', () => {
    const svg = renderEmbed(eco);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="0 0 560 200"');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('é determinístico', () => {
    expect(renderEmbed(eco)).toBe(renderEmbed(eco));
  });

  it('mostra login e biodiversidade', () => {
    const svg = renderEmbed(eco);
    expect(svg).toContain(`@${eco.login}`);
    expect(svg).toContain(`biodiversidade: ${eco.biodiversidade}`);
  });

  it('não embute recurso remoto (sem href nem <image>)', () => {
    // Obs.: o SVG contém o xmlns "http://www.w3.org/2000/svg" — isso é namespace, não fetch.
    const svg = renderEmbed(eco);
    expect(svg).not.toContain('href=');
    expect(svg).not.toContain('<image');
  });

  it('escapa caracteres especiais do login', () => {
    const malicioso: Ecosystem = { ...eco, login: 'a<b&c' };
    const svg = renderEmbed(malicioso);
    expect(svg).toContain('a&lt;b&amp;c');
    expect(svg).not.toContain('a<b&c');
  });

  it('reserva vazia: estado simpático, sem quebrar', () => {
    const vazio: Ecosystem = {
      login: 'novato', avatarUrl: '', biomes: [], biodiversidade: 0, rarest: null, totalEspecimes: 0,
    };
    const svg = renderEmbed(vazio);
    expect(svg).toContain('Reserva vazia');
    expect(svg.startsWith('<svg')).toBe(true);
  });

  it('rarest nulo com biomas populados não quebra o rodapé', () => {
    const semRaro: Ecosystem = { ...eco, rarest: null };
    expect(() => renderEmbed(semRaro)).not.toThrow();
  });

  it('snapshot estável do SVG completo', () => {
    expect(renderEmbed(eco)).toMatchSnapshot();
  });
});
