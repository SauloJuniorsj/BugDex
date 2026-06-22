import type { Ecosystem, BiomePopulation } from '../domain/types.js';
import { buildSprite } from './sprite.js';
import { escapeXml, spriteToRects, stars, truncate } from './svg.js';

const WIDTH = 560;
const HEIGHT = 200;
const BG = '#0d1117';
const FG = '#e6edf3';
const MUTED = '#8b949e';
const MAX_BIOMES = 3;
const MAX_SPECIMENS = 3;
const CELL = 3;                  // px por pixel do sprite
const SPRITE_PX = 16 * CELL;     // 48px
const GAP = 6;

export function renderEmbed(ecosystem: Ecosystem): string {
  const inner = ecosystem.totalEspecimes === 0 || ecosystem.biomes.length === 0
    ? renderEmpty(ecosystem)
    : renderPopulated(ecosystem);
  return wrap(inner);
}

function wrap(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" `
    + `width="${WIDTH}" height="${HEIGHT}" font-family="monospace" style="image-rendering:pixelated">`
    + `<rect width="${WIDTH}" height="${HEIGHT}" rx="10" fill="${BG}"/>`
    + inner
    + `</svg>`;
}

function header(ecosystem: Ecosystem): string {
  const login = escapeXml(truncate(ecosystem.login, 20));
  return `<text x="16" y="28" fill="${FG}" font-size="16" font-weight="bold">🪲 BugDex · @${login}</text>`
    + `<text x="${WIDTH - 16}" y="28" fill="${MUTED}" font-size="13" text-anchor="end">`
    + `biodiversidade: ${ecosystem.biodiversidade}</text>`;
}

function renderPopulated(ecosystem: Ecosystem): string {
  const biomes = ecosystem.biomes.slice(0, MAX_BIOMES);
  const colWidth = (WIDTH - 32) / biomes.length;
  let out = header(ecosystem);
  biomes.forEach((bp, i) => {
    out += biomeColumn(bp, 16 + i * colWidth, colWidth);
  });
  return out + footer(ecosystem);
}

function biomeColumn(bp: BiomePopulation, x0: number, colWidth: number): string {
  const label = `${bp.biome.emoji} ${escapeXml(bp.biome.nome)}`;
  let out = `<text x="${Math.round(x0 + colWidth / 2)}" y="62" fill="${FG}" font-size="12" `
    + `text-anchor="middle">${label}</text>`;

  const specimens = bp.specimens.slice(0, MAX_SPECIMENS);
  const totalW = specimens.length * SPRITE_PX + Math.max(0, specimens.length - 1) * GAP;
  let sx = x0 + (colWidth - totalW) / 2;
  const sy = 78;
  for (const s of specimens) {
    const sprite = buildSprite(s.species.spriteKey, s.stage, s.morph, s.species.biomeId);
    out += spriteToRects(sprite, Math.round(sx), sy, CELL);
    sx += SPRITE_PX + GAP;
  }
  return out;
}

function footer(ecosystem: Ecosystem): string {
  const r = ecosystem.rarest;
  if (!r) {
    return `<text x="16" y="${HEIGHT - 16}" fill="${MUTED}" font-size="12">`
      + `Ainda sem espécime de destaque — continue programando!</text>`;
  }
  const morphTag = r.morph === 'normal' ? '' : ` (${r.morph})`;
  const text = `raríssimo: ${escapeXml(truncate(r.species.nome, 24))}${morphTag} ${stars(r.prestige)}`;
  return `<text x="16" y="${HEIGHT - 16}" fill="${FG}" font-size="12">${text}</text>`;
}

function renderEmpty(ecosystem: Ecosystem): string {
  return header(ecosystem)
    + `<text x="${WIDTH / 2}" y="${HEIGHT / 2}" fill="${FG}" font-size="14" `
    + `text-anchor="middle">Reserva vazia 🪲</text>`
    + `<text x="${WIDTH / 2}" y="${HEIGHT / 2 + 22}" fill="${MUTED}" font-size="12" `
    + `text-anchor="middle">Crie repositórios públicos e volte para ver seu ecossistema nascer.</text>`;
}
