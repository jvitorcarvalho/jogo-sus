import type { FrenteId } from '../engine/tipos';

export type CampoId = 'sanitaria' | 'epidemiologica' | 'trabalhador' | 'assistencia' | 'bucal' | 'inovacao' | 'apoio';

/**
 * Campos de atuação do SUS, na ordem das alíneas do art. 6º, inciso I, da Lei nº 8.080/1990
 * (texto conferido no Planalto em 2026-11-11). "apoio" não é alínea da lei.
 */
export interface Campo {
  id: CampoId;
  /** Letra da alínea na lei, ou null se o campo não vem da lei. */
  alinea: string | null;
  nome: string;
  /** O que o jogador faz neste campo. */
  noJogo: string;
  /** O que a simulação "só rede particular" assume para este campo. Hipótese de jogo. */
  semSUS: string;
}

export const CAMPOS: Campo[] = [
  {
    id: 'sanitaria',
    alinea: 'a',
    nome: 'Vigilância sanitária',
    noJogo: 'Barreira em portos e aeroportos e fiscalização de insumos.',
    semSUS: 'Sem barreira sanitária: os casos chegam de avião sem controle.',
  },
  {
    id: 'epidemiologica',
    alinea: 'b',
    nome: 'Vigilância epidemiológica',
    noJogo: 'Notificação e testagem para enxergar o surto; vacinação da população.',
    semSUS: 'Ninguém conta os casos do país e não há campanha de vacinação.',
  },
  {
    id: 'trabalhador',
    alinea: 'c',
    nome: 'Saúde do trabalhador',
    noJogo: 'Proteção das equipes de saúde, para os leitos terem quem os opere.',
    semSUS: 'Equipes sem proteção adicional: adoecem e os leitos perdem capacidade.',
  },
  {
    id: 'assistencia',
    alinea: 'd',
    nome: 'Assistência terapêutica e farmacêutica',
    noJogo: 'Posto de saúde, SAMU, UPA, leitos e medicamentos para todos.',
    semSUS: 'Leito só para quem tem plano. Quem não tem fica sem atendimento.',
  },
  {
    id: 'bucal',
    alinea: 'e',
    nome: 'Saúde bucal',
    noJogo: 'Faz parte dos serviços de rotina, que você precisa manter funcionando durante o surto.',
    semSUS: 'Não é simulada.',
  },
  {
    id: 'inovacao',
    alinea: 'f',
    nome: 'Inovação e produção em saúde',
    noJogo: 'Pesquisa e produção pública de vacinas e tratamentos.',
    semSUS: 'Sem produção pública: a vacina não chega à população.',
  },
  {
    id: 'apoio',
    alinea: null,
    nome: 'Apoio',
    noJogo: 'Comunicação com a população.',
    semSUS: 'Não é simulada.',
  },
];

export interface Frente {
  id: FrenteId;
  campo: CampoId;
  nome: string;
  exemplos: string;
  descricao: string;
  /** O que cada nível entrega, em linguagem de jogador. */
  niveis: readonly string[];
}

/** Custo para subir ao nível 1, 2 e 3. */
export const CUSTO_NIVEL: readonly number[] = [40, 80, 140];

export const FRENTES: Record<FrenteId, Frente> = {
  sanitaria: {
    id: 'sanitaria',
    campo: 'sanitaria',
    nome: 'Vigilância Sanitária',
    exemplos: 'Anvisa, vigilâncias estaduais e municipais',
    descricao: 'Controle em portos, aeroportos e fronteiras, e fiscalização de produtos e serviços de saúde.',
    niveis: [
      'Casos que chegam de avião caem 30%',
      'Caem 50%, e a fiscalização evita falta de insumo',
      'Casos que chegam de avião caem 68%',
    ],
  },
  vigilancia: {
    id: 'vigilancia',
    campo: 'epidemiologica',
    nome: 'Vigilância Epidemiológica',
    exemplos: 'notificação, testagem, laboratórios',
    descricao: 'Sem vigilância você enxerga o surto com atraso e pela metade. Com ela, o mapa mostra a verdade.',
    niveis: ['Vê 55% dos casos, 4 dias de atraso', 'Vê 80% dos casos, 2 dias de atraso', 'Vê todos os casos em tempo real'],
  },
  imunizacao: {
    id: 'imunizacao',
    campo: 'epidemiologica',
    nome: 'Imunização',
    exemplos: 'Programa Nacional de Imunizações, rede de frio',
    descricao: 'Levar a vacina até o braço: salas de vacina, transporte refrigerado, equipes volantes.',
    niveis: ['Vacinação 60% mais rápida', 'Vacinação 2,4 vezes mais rápida', 'Vacinação 3,4 vezes mais rápida'],
  },
  trabalhador: {
    id: 'trabalhador',
    campo: 'trabalhador',
    nome: 'Saúde do Trabalhador',
    exemplos: 'equipamento de proteção, escalas, cuidado com quem cuida',
    descricao: 'Num surto, profissionais de saúde adoecem e se esgotam. Sem equipe, leito não funciona.',
    niveis: ['Desgaste das equipes cai 40%', 'Desgaste das equipes cai 65%', 'Desgaste das equipes cai 85%'],
  },
  atencao: {
    id: 'atencao',
    campo: 'assistencia',
    nome: 'Atenção Básica',
    exemplos: 'UBS, Saúde da Família, agentes comunitários, farmácia básica',
    descricao: 'A porta de entrada. Equipes que conhecem o bairro orientam, previnem e mantêm o cuidado de rotina.',
    niveis: ['Transmissão cai 8%', 'Transmissão cai 15%', 'Transmissão cai 22%'],
  },
  urgencia: {
    id: 'urgencia',
    campo: 'assistencia',
    nome: 'Urgência',
    exemplos: 'SAMU 192, UPAs, leitos de UTI',
    descricao: 'Quando falta leito, morre quem poderia viver. Esta frente amplia a capacidade de atender casos graves.',
    niveis: ['Leitos +30%', 'Leitos +70%', 'Leitos +120%'],
  },
  ciencia: {
    id: 'ciencia',
    campo: 'inovacao',
    nome: 'Ciência',
    exemplos: 'Fiocruz, Instituto Butantan, universidades',
    descricao: 'Pesquisa e produção pública de vacinas e tratamentos. Em doença nova, é daqui que sai a vacina.',
    niveis: ['Pesquisa em andamento, tratamento melhor', 'Pesquisa acelerada', 'Pesquisa em ritmo máximo'],
  },
  comunicacao: {
    id: 'comunicacao',
    campo: 'apoio',
    nome: 'Comunicação',
    exemplos: 'campanhas públicas, combate à desinformação',
    descricao: 'Sem confiança a população não se vacina nem se cuida. Informação clara segura a confiança.',
    niveis: ['Confiança se recupera aos poucos', 'Boatos perdem força', 'Boatos quase não pegam'],
  },
};

export const FRENTE_IDS = Object.keys(FRENTES) as FrenteId[];

/** Efeitos por nível (índice 0 = sem investimento). Parâmetros de jogo. */
export const EFEITOS = {
  sanitariaAereo: [1, 0.7, 0.5, 0.32],
  /** A partir deste nível o evento de falta de insumo deixa de acontecer. */
  sanitariaNivelInsumo: 2,
  atencaoBeta: [1, 0.92, 0.85, 0.78],
  atencaoRotina: [0, 5, 10, 15],
  vigilanciaDeteccao: [0.3, 0.55, 0.8, 1],
  vigilanciaAtraso: [7, 4, 2, 0],
  vigilanciaBeta: [1, 0.97, 0.94, 0.9],
  imunizacaoVac: [1, 1.6, 2.4, 3.4],
  trabalhadorDesgaste: [1, 0.6, 0.35, 0.15],
  urgenciaLeitos: [1, 1.3, 1.7, 2.2],
  urgenciaLetal: [1, 0.95, 0.9, 0.85],
  cienciaPesquisa: [0, 1 / 240, 1 / 170, 1 / 120],
  cienciaLetal: [1, 0.93, 0.86, 0.8],
  cienciaVac: [1, 1.2, 1.4, 1.6],
  comunicacaoConfianca: [0, 0.12, 0.24, 0.36],
  comunicacaoBoato: [1, 0.6, 0.3, 0.1],
} as const;

/** Desgaste e recuperação das equipes de saúde. Parâmetros de jogo. */
export const EQUIPE = { desgaste: 0.22, recuperacao: 0.02, minimo: 0.4 } as const;

/**
 * Como o motor simula o país só com a rede particular. Hipóteses de jogo, declaradas na tela Sobre:
 * leitos proporcionais à cobertura real de planos em cada estado (ANS), para quem tem plano;
 * sem prevenção (transmissão maior); quem não tem plano fica sem leito e sem atenção básica.
 */
export const SEM_SUS = { beta: 1.15, letalSemPlano: 1.5 } as const;
