import type { Biome } from '../domain/types.js';

export const INEXPLORADO_ID = 'inexplorado';

export const ALL_BIOMES: Biome[] = [
  {
    id: 'jardim', nome: 'Jardim Exuberante', emoji: '🌼',
    languages: ['JavaScript', 'TypeScript'],
    speciesIds: ['joaninha', 'abelha', 'monarca', 'vagalume'],
  },
  {
    id: 'selva', nome: 'Selva Tropical', emoji: '🌿',
    languages: ['Python'],
    speciesIds: ['formiga-cortadeira', 'mariposa-atlas', 'besouro-hercules', 'morpho-azul'],
  },
  {
    id: 'vulcanico', nome: 'Campo Vulcânico', emoji: '🌋',
    languages: ['Rust'],
    speciesIds: ['besouro-bombardeiro', 'formiga-de-fogo', 'escaravelho-rinoceronte', 'vespa-gigante'],
  },
  {
    id: 'caverna', nome: 'Caverna Profunda', emoji: '🪨',
    languages: ['C', 'C++'],
    speciesIds: ['grilo-caverna', 'traca-prateada', 'besouro-cego', 'mosquito-fungo'],
  },
  {
    id: 'savana', nome: 'Savana Dourada', emoji: '🌾',
    languages: ['Go'],
    speciesIds: ['gafanhoto', 'cupim', 'rola-bosta', 'formiga-leao'],
  },
  {
    id: 'pantano', nome: 'Pântano Brumoso', emoji: '🐊',
    languages: ['Java', 'Kotlin'],
    speciesIds: ['libelula', 'mosquito', 'alfaiate', 'efemera'],
  },
  {
    id: 'deserto', nome: 'Deserto Árido', emoji: '🏜️',
    languages: ['Ruby', 'PHP'],
    speciesIds: ['besouro-namibia', 'formiga-prateada', 'locusta', 'escaravelho-sagrado'],
  },
  {
    id: 'bosque', nome: 'Bosque Temperado', emoji: '🍂',
    languages: ['C#', 'Swift'],
    speciesIds: ['cigarra', 'louva-a-deus', 'bicho-pau', 'mariposa-luna'],
  },
  {
    id: INEXPLORADO_ID, nome: 'Terreno Baldio', emoji: '🌫️',
    languages: [],
    speciesIds: ['barata', 'mosca-domestica'],
  },
];

const BY_ID = new Map(ALL_BIOMES.map((b) => [b.id, b]));

const BY_LANGUAGE = new Map<string, Biome>();
for (const b of ALL_BIOMES) {
  for (const lang of b.languages) {
    BY_LANGUAGE.set(lang.toLowerCase(), b);
  }
}

export function getBiomeById(id: string): Biome {
  const b = BY_ID.get(id);
  if (!b) throw new Error(`Bioma desconhecido: ${id}`);
  return b;
}

export function biomeForLanguage(language: string | null): Biome {
  if (!language) return getBiomeById(INEXPLORADO_ID);
  return BY_LANGUAGE.get(language.toLowerCase()) ?? getBiomeById(INEXPLORADO_ID);
}
