import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, darken, lighten, blend } from './color.js';

describe('color', () => {
  it('hexToRgb decodifica canais', () => {
    expect(hexToRgb('#80a0c0')).toEqual([128, 160, 192]);
  });

  it('rgbToHex faz o caminho inverso', () => {
    expect(rgbToHex(128, 160, 192)).toBe('#80a0c0');
  });

  it('darken multiplica os canais por (1-amount)', () => {
    expect(darken('#646464', 0.5)).toBe('#323232');
  });

  it('lighten interpola em direção a 255', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080');
  });

  it('blend interpola entre duas cores', () => {
    expect(blend('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('clampa nos limites (não estoura 255)', () => {
    expect(lighten('#ffffff', 0.5)).toBe('#ffffff');
    expect(darken('#000000', 0.5)).toBe('#000000');
  });
});
