import type { Species } from '../domain/types.js';

export const ALL_SPECIES: Species[] = [
  // Jardim (jardim)
  { id: 'joaninha', nome: 'Joaninha', biomeId: 'jardim', spriteKey: 'joaninha', curiosidade: 'Devora milhares de pulgões ao longo da vida — controle natural de pragas.' },
  { id: 'abelha', nome: 'Abelha-europeia', biomeId: 'jardim', spriteKey: 'abelha', curiosidade: 'Comunica onde estão as flores pela "dança do requebrado".' },
  { id: 'monarca', nome: 'Borboleta-monarca', biomeId: 'jardim', spriteKey: 'monarca', curiosidade: 'Migra até ~4.000 km entre a América do Norte e o México.' },
  { id: 'vagalume', nome: 'Vaga-lume', biomeId: 'jardim', spriteKey: 'vagalume', curiosidade: 'Emite "luz fria" por bioluminescência (luciferina + luciferase).' },

  // Selva (selva)
  { id: 'formiga-cortadeira', nome: 'Formiga-cortadeira', biomeId: 'selva', spriteKey: 'formiga-cortadeira', curiosidade: 'Cultiva um fungo subterrâneo do qual se alimenta — "agricultura" há milhões de anos.' },
  { id: 'mariposa-atlas', nome: 'Mariposa-atlas', biomeId: 'selva', spriteKey: 'mariposa-atlas', curiosidade: 'Tem uma das maiores áreas de asa do mundo (até ~24 cm de envergadura).' },
  { id: 'besouro-hercules', nome: 'Besouro-hércules', biomeId: 'selva', spriteKey: 'besouro-hercules', curiosidade: 'Ergue muitas vezes o próprio peso; o macho tem um chifre enorme.' },
  { id: 'morpho-azul', nome: 'Borboleta-morpho-azul', biomeId: 'selva', spriteKey: 'morpho-azul', curiosidade: 'O azul não é pigmento: vem da nanoestrutura das escamas (cor estrutural).' },

  // Campo Vulcânico (vulcanico)
  { id: 'besouro-bombardeiro', nome: 'Besouro-bombardeiro', biomeId: 'vulcanico', spriteKey: 'besouro-bombardeiro', curiosidade: 'Dispara um jato químico fervente (~100 °C) como defesa.' },
  { id: 'formiga-de-fogo', nome: 'Formiga-de-fogo', biomeId: 'vulcanico', spriteKey: 'formiga-de-fogo', curiosidade: 'Forma jangadas vivas flutuantes para sobreviver a enchentes.' },
  { id: 'escaravelho-rinoceronte', nome: 'Escaravelho-rinoceronte', biomeId: 'vulcanico', spriteKey: 'escaravelho-rinoceronte', curiosidade: 'Está entre os animais mais fortes em relação ao próprio peso.' },
  { id: 'vespa-gigante', nome: 'Vespa-asiática-gigante', biomeId: 'vulcanico', spriteKey: 'vespa-gigante', curiosidade: 'É a maior vespa do mundo e uma predadora voraz de outros insetos.' },

  // Caverna (caverna)
  { id: 'grilo-caverna', nome: 'Grilo-das-cavernas', biomeId: 'caverna', spriteKey: 'grilo-caverna', curiosidade: 'Tem antenas e pernas longuíssimas para se orientar no escuro total.' },
  { id: 'traca-prateada', nome: 'Traça-prateada', biomeId: 'caverna', spriteKey: 'traca-prateada', curiosidade: 'Inseto sem asas tão antigo que já existia antes dos dinossauros.' },
  { id: 'besouro-cego', nome: 'Besouro-troglóbio', biomeId: 'caverna', spriteKey: 'besouro-cego', curiosidade: 'Muitos perderam olhos e pigmento por viver a vida toda no escuro.' },
  { id: 'mosquito-fungo', nome: 'Mosquito-fungo', biomeId: 'caverna', spriteKey: 'mosquito-fungo', curiosidade: 'Larvas de algumas espécies brilham para atrair presas no teto das grutas.' },

  // Savana (savana)
  { id: 'gafanhoto', nome: 'Gafanhoto', biomeId: 'savana', spriteKey: 'gafanhoto', curiosidade: 'Salta muitas vezes o tamanho do próprio corpo.' },
  { id: 'cupim', nome: 'Cupim', biomeId: 'savana', spriteKey: 'cupim', curiosidade: 'Constrói montículos com ventilação natural que regulam a temperatura.' },
  { id: 'rola-bosta', nome: 'Besouro-rola-bosta', biomeId: 'savana', spriteKey: 'rola-bosta', curiosidade: 'Orienta-se pela luz da Via Láctea para rolar a bolota em linha reta.' },
  { id: 'formiga-leao', nome: 'Formiga-leão', biomeId: 'savana', spriteKey: 'formiga-leao', curiosidade: 'A larva cava armadilhas em funil na areia para capturar presas.' },

  // Pântano (pantano)
  { id: 'libelula', nome: 'Libélula', biomeId: 'pantano', spriteKey: 'libelula', curiosidade: 'Uma das maiores taxas de sucesso de caça do reino animal (~95%).' },
  { id: 'mosquito', nome: 'Mosquito', biomeId: 'pantano', spriteKey: 'mosquito', curiosidade: 'Só as fêmeas picam: precisam de sangue para amadurecer os ovos.' },
  { id: 'alfaiate', nome: "Percevejo-d'água", biomeId: 'pantano', spriteKey: 'alfaiate', curiosidade: 'Anda sobre a água graças à tensão superficial e a pelos hidrofóbicos.' },
  { id: 'efemera', nome: 'Efeméride', biomeId: 'pantano', spriteKey: 'efemera', curiosidade: 'O adulto vive pouquíssimo (às vezes só horas) e nem se alimenta.' },

  // Deserto (deserto)
  { id: 'besouro-namibia', nome: 'Besouro-da-namíbia', biomeId: 'deserto', spriteKey: 'besouro-namibia', curiosidade: 'Coleta água da neblina na própria carapaça para beber.' },
  { id: 'formiga-prateada', nome: 'Formiga-prateada-do-saara', biomeId: 'deserto', spriteKey: 'formiga-prateada', curiosidade: 'Pelos prateados refletem o sol; é uma das formigas mais rápidas e resistentes ao calor.' },
  { id: 'locusta', nome: 'Gafanhoto-do-deserto', biomeId: 'deserto', spriteKey: 'locusta', curiosidade: 'Forma enxames gigantescos que migram por continentes inteiros.' },
  { id: 'escaravelho-sagrado', nome: 'Escaravelho-sagrado', biomeId: 'deserto', spriteKey: 'escaravelho-sagrado', curiosidade: 'Era reverenciado no Egito Antigo como símbolo do sol nascente.' },

  // Bosque Temperado (bosque)
  { id: 'cigarra', nome: 'Cigarra', biomeId: 'bosque', spriteKey: 'cigarra', curiosidade: 'Ninfas de algumas espécies vivem 13–17 anos no subsolo antes de emergir.' },
  { id: 'louva-a-deus', nome: 'Louva-a-deus', biomeId: 'bosque', spriteKey: 'louva-a-deus', curiosidade: 'Gira a cabeça ~180° e, às vezes, a fêmea devora o macho.' },
  { id: 'bicho-pau', nome: 'Bicho-pau', biomeId: 'bosque', spriteKey: 'bicho-pau', curiosidade: 'Mestre da camuflagem; algumas fêmeas se reproduzem sem macho (partenogênese).' },
  { id: 'mariposa-luna', nome: 'Mariposa-luna', biomeId: 'bosque', spriteKey: 'mariposa-luna', curiosidade: 'O adulto não tem boca e não come — vive cerca de uma semana só para reproduzir.' },

  // Terreno Baldio / fallback (inexplorado)
  { id: 'barata', nome: 'Barata', biomeId: 'inexplorado', spriteKey: 'barata', curiosidade: 'Consegue sobreviver dias sem a cabeça, pois respira pelo corpo.' },
  { id: 'mosca-domestica', nome: 'Mosca-doméstica', biomeId: 'inexplorado', spriteKey: 'mosca-domestica', curiosidade: 'Sente o gosto da comida pelos pés — o paladar fica nas patas.' },
];

const BY_ID = new Map(ALL_SPECIES.map((s) => [s.id, s]));

export function getSpeciesById(id: string): Species {
  const s = BY_ID.get(id);
  if (!s) throw new Error(`Espécie desconhecida: ${id}`);
  return s;
}
