import type { Sprite } from './sprite.js';

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Emite <rect> para cada célula não-vazia, na origem (ox,oy), com lado `cell`. */
export function spriteToRects(sprite: Sprite, ox: number, oy: number, cell: number): string {
  const { grid, palette } = sprite;
  const parts: string[] = [];
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y]!;
    for (let x = 0; x < row.length; x++) {
      const v = row[x]!;
      if (v < 0) continue;
      const color = palette[v]!;
      const px = ox + x * cell;
      const py = oy + y * cell;
      parts.push(`<rect x="${px}" y="${py}" width="${cell}" height="${cell}" fill="${color}"/>`);
    }
  }
  return parts.join('');
}

/** Prestígio 0–5 -> 5 estrelas (preenchidas + vazias). */
export function stars(prestige: number): string {
  const n = prestige < 0 ? 0 : prestige > 5 ? 5 : Math.round(prestige);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/** Encurta `s` para no máximo `max` caracteres, com elipse. */
export function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + '…';
}
