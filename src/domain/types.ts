export type MorphType = 'normal' | 'shiny' | 'albino' | 'melanico';

export type MetamorphosisStage = 'ovo' | 'larva' | 'pupa' | 'adulto';

export interface Species {
  id: string;
  nome: string;
  biomeId: string;
  spriteKey: string;
  curiosidade: string;
}

export interface Biome {
  id: string;
  nome: string;
  emoji: string;
  /** Nomes canônicos de linguagem que caem neste bioma (case-insensitive). */
  languages: string[];
  /** Pool de espécies (ids referenciando Species.id). */
  speciesIds: string[];
}

export interface NormalizedRepo {
  id: string;
  name: string;
  primaryLanguage: string | null;
  stars: number;
  commitCount: number;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601 — última atividade (push). */
  pushedAt: string;
}

export interface NormalizedProfile {
  login: string;
  avatarUrl: string;
  /** Bytes por linguagem agregados nos repos. */
  languageBytes: Record<string, number>;
  repos: NormalizedRepo[];
}

export interface Specimen {
  repoName: string;
  species: Species;
  stage: MetamorphosisStage;
  morph: MorphType;
  /** 0–5, derivado de stars. */
  prestige: number;
}

export interface BiomePopulation {
  biome: Biome;
  specimens: Specimen[];
}

export interface Ecosystem {
  login: string;
  avatarUrl: string;
  /** Apenas biomas com >= 1 espécime, ordenados por proeminência. */
  biomes: BiomePopulation[];
  /** Nº de espécies distintas. */
  biodiversidade: number;
  rarest: Specimen | null;
  totalEspecimes: number;
}
