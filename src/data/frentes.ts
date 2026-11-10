import type { FrenteId } from '../engine/tipos';

export interface Frente {
  id: FrenteId;
  nome: string;
  exemplos: string;
  descricao: string;
  /** O que cada nível entrega, em linguagem de jogador. */
  niveis: readonly string[];
}

/** Custo para subir ao nível 1, 2 e 3. */
export const CUSTO_NIVEL: readonly number[] = [40, 80, 140];

export const FRENTES: Record<FrenteId, Frente> = {
  atencao: {
    id: 'atencao',
    nome: 'Atenção Básica',
    exemplos: 'UBS, Saúde da Família, agentes comunitários',
    descricao: 'A porta de entrada. Equipes que conhecem o bairro orientam, previnem e acham os casos cedo.',
    niveis: ['Transmissão cai 8%', 'Transmissão cai 15%', 'Transmissão cai 22%'],
  },
  vigilancia: {
    id: 'vigilancia',
    nome: 'Vigilância',
    exemplos: 'notificação, testagem, laboratórios',
    descricao: 'Sem vigilância você enxerga o surto com atraso e pela metade. Com ela, o mapa mostra a verdade.',
    niveis: ['Vê 55% dos casos, 4 dias de atraso', 'Vê 80% dos casos, 2 dias de atraso', 'Vê todos os casos em tempo real'],
  },
  imunizacao: {
    id: 'imunizacao',
    nome: 'Imunização',
    exemplos: 'Programa Nacional de Imunizações, rede de frio',
    descricao: 'Levar a vacina até o braço: salas de vacina, transporte refrigerado, equipes volantes.',
    niveis: ['Vacinação 60% mais rápida', 'Vacinação 2,4 vezes mais rápida', 'Vacinação 3,4 vezes mais rápida'],
  },
  urgencia: {
    id: 'urgencia',
    nome: 'Urgência',
    exemplos: 'SAMU 192, UPAs, leitos de UTI',
    descricao: 'Quando falta leito, morre quem poderia viver. Esta frente amplia a capacidade de atender casos graves.',
    niveis: ['Leitos +30%', 'Leitos +70%', 'Leitos +120%'],
  },
  ciencia: {
    id: 'ciencia',
    nome: 'Ciência',
    exemplos: 'Fiocruz, Instituto Butantan, universidades',
    descricao: 'Pesquisa e produção pública de vacinas e tratamentos. Em doença nova, é daqui que sai a vacina.',
    niveis: ['Pesquisa em andamento, tratamento melhor', 'Pesquisa acelerada', 'Pesquisa em ritmo máximo'],
  },
  comunicacao: {
    id: 'comunicacao',
    nome: 'Comunicação',
    exemplos: 'campanhas públicas, combate à desinformação',
    descricao: 'Sem confiança a população não se vacina nem se cuida. Informação clara segura a confiança.',
    niveis: ['Confiança se recupera aos poucos', 'Boatos perdem força', 'Boatos quase não pegam'],
  },
};

export const FRENTE_IDS = Object.keys(FRENTES) as FrenteId[];

/** Efeitos por nível (índice 0 = sem investimento). Parâmetros de jogo. */
export const EFEITOS = {
  atencaoBeta: [1, 0.92, 0.85, 0.78],
  vigilanciaDeteccao: [0.3, 0.55, 0.8, 1],
  vigilanciaAtraso: [7, 4, 2, 0],
  vigilanciaBeta: [1, 0.97, 0.94, 0.9],
  imunizacaoVac: [1, 1.6, 2.4, 3.4],
  urgenciaLeitos: [1, 1.3, 1.7, 2.2],
  urgenciaLetal: [1, 0.95, 0.9, 0.85],
  cienciaPesquisa: [0, 1 / 240, 1 / 170, 1 / 120],
  cienciaLetal: [1, 0.93, 0.86, 0.8],
  cienciaVac: [1, 1.2, 1.4, 1.6],
  comunicacaoConfianca: [0, 0.12, 0.24, 0.36],
  comunicacaoBoato: [1, 0.6, 0.3, 0.1],
} as const;

/** Como o motor simula o país sem um sistema público de saúde. Hipótese de jogo, declarada na tela Sobre. */
export const SEM_SUS = { leitos: 0.25, beta: 1.15, letal: 1.5 } as const;
