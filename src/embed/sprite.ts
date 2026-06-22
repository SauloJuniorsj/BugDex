import type { MetamorphosisStage, MorphType } from '../domain/types.js';
import { stableHash } from '../util/hash.js';
import { spritePalette } from './palette.js';

export const SPRITE_SIZE = 16;
const HALF = SPRITE_SIZE / 2; // 8

export interface Sprite {
  /** SPRITE_SIZE x SPRITE_SIZE. -1 vazio, 0 contorno, 1 sombra, 2 base, 3 luz. */
  grid: number[][];
  /** [contorno, sombra, base, luz]. */
  palette: string[];
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/**
 * Limiar de preenchimento (0–1000) da metade esquerda, por estágio.
 * dh = distância do eixo de espelho (0 no centro, 7 na borda); dv = distância do centro vertical.
 */
function silhouetteThreshold(stage: MetamorphosisStage, dh: number, dv: number): number {
  switch (stage) {
    case 'ovo':
      if (dh > 3 || dv > 4) return 0;
      return 950 - (dh + dv) * 100;
    case 'larva':
      if (dh > 3) return 0;
      return 900 - dh * 140 - (dv > 6 ? 400 : 0);
    case 'pupa':
      if (dh > 4 || dv > 6) return 0;
      return 980 - dh * 70 - dv * 50;
    case 'adulto':
    default:
      return 950 - dh * 70 - dv * 60;
  }
}

export function buildSprite(
  spriteKey: string,
  stage: MetamorphosisStage,
  morph: MorphType,
  biomeId: string,
): Sprite {
  const palette = spritePalette(biomeId, morph);

  // 1) Máscara booleana: gera a metade esquerda e espelha.
  const mask: boolean[][] = Array.from({ length: SPRITE_SIZE }, () =>
    new Array<boolean>(SPRITE_SIZE).fill(false));

  for (let y = 0; y < SPRITE_SIZE; y++) {
    const dv = Math.abs(y - 7);
    for (let x = 0; x < HALF; x++) {
      const dh = (HALF - 1) - x; // x=7 -> 0 (eixo), x=0 -> 7 (borda)
      const threshold = clamp(silhouetteThreshold(stage, dh, dv), 0, 1000);
      if (threshold <= 0) continue;
      const v = stableHash(`${spriteKey}:${stage}:${x}:${y}`) % 1000;
      if (v < threshold) {
        mask[y]![x] = true;
        mask[y]![SPRITE_SIZE - 1 - x] = true;
      }
    }
  }

  // 2) Tons por detecção de borda; -1 vazio.
  const grid: number[][] = Array.from({ length: SPRITE_SIZE }, () =>
    new Array<number>(SPRITE_SIZE).fill(-1));

  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (!mask[y]![x]) continue;
      const above = y > 0 && mask[y - 1]![x];
      const below = y < SPRITE_SIZE - 1 && mask[y + 1]![x];
      if (!above) grid[y]![x] = 3;       // borda de cima = luz
      else if (!below) grid[y]![x] = 1;  // borda de baixo = sombra
      else grid[y]![x] = 2;              // interior = base
    }
  }

  // 3) Contorno: vazio 4-adjacente a preenchido -> 0.
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (mask[y]![x]) continue;
      const touches =
        (y > 0 && mask[y - 1]![x]) ||
        (y < SPRITE_SIZE - 1 && mask[y + 1]![x]) ||
        (x > 0 && mask[y]![x - 1]) ||
        (x < SPRITE_SIZE - 1 && mask[y]![x + 1]);
      if (touches) grid[y]![x] = 0;
    }
  }

  return { grid, palette };
}
