import type { MorphType } from '../domain/types.js';
import { darken, lighten, blend } from './color.js';

/** Cor base por bioma (ids de src/content/biomes.ts). */
const BIOME_BASE: Record<string, string> = {
  jardim: '#6fcf52',
  selva: '#2f9e57',
  vulcanico: '#e0552b',
  caverna: '#7a818f',
  savana: '#e0b94a',
  pantano: '#5f8f6f',
  deserto: '#e6c879',
  bosque: '#c98a3c',
  inexplorado: '#9aa0a6',
};

const OUTLINE = '#15151c';

function morphBase(base: string, morph: MorphType): string {
  switch (morph) {
    case 'shiny': return blend(base, '#ffcc33', 0.55);
    case 'albino': return lighten(base, 0.78);
    case 'melanico': return darken(base, 0.62);
    case 'normal':
    default: return base;
  }
}

/** [contorno, sombra, base, luz]. */
export function spritePalette(biomeId: string, morph: MorphType): string[] {
  const raw = BIOME_BASE[biomeId] ?? BIOME_BASE['inexplorado']!;
  const base = morphBase(raw, morph);
  return [OUTLINE, darken(base, 0.35), base, lighten(base, 0.4)];
}
