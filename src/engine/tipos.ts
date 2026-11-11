export type FrenteId =
  | 'sanitaria'
  | 'vigilancia'
  | 'imunizacao'
  | 'trabalhador'
  | 'atencao'
  | 'urgencia'
  | 'ciencia'
  | 'comunicacao';
export type CenarioId = 'dengue' | 'sarampo' | 'respiratoria';
export type AcaoLocalId = 'forca' | 'campanha' | 'mutirao' | 'leitos';
export type Fim = null | 'vitoria' | 'derrota-confianca' | 'derrota-colapso' | 'derrota-tempo';
export type Nivel = 0 | 1 | 2 | 3;
export type AlvoMod = 'beta' | 'leitos' | 'vacina';

export interface Cenario {
  id: CenarioId;
  nome: string;
  dificuldade: 'Fácil' | 'Média' | 'Difícil';
  resumo: string;
  /** UFs onde o surto começa. */
  origem: string[];
  casosIniciais: number;
  /** Dia do ano (0 a 359) em que a partida começa. O ano de jogo tem 12 meses de 30 dias. */
  diaInicialAno: number;
  beta: number;
  sigma: number;
  gamma: number;
  letalidade: number;
  fracHosp: number;
  leitosPorMil: number;
  /** Amplitude sazonal de 0 a 1; pico no verão. */
  sazonal: number;
  imunidadeInicial: number;
  vacina: 'pronta' | 'limitada' | 'pesquisa';
  /** Fração dos suscetíveis vacinada por dia sem investimento. */
  vacBase: number;
  /** Viajantes por dia em cada fronteira terrestre. */
  fluxoVizinho: number;
  /** Viajantes por dia entre duas UFs de peso aéreo 1. */
  fluxoAereo: number;
  orcamentoInicial: number;
  orcamentoMensal: number;
  /** Casos ativos por 100 mil habitantes abaixo dos quais o surto está sob controle. */
  limiarControle: number;
  eventos: string[];
  mutirao: boolean;
}

export interface EstadoUF {
  s: number;
  e: number;
  i: number;
  r: number;
  v: number;
  obitos: number;
  /** Só na simulação sem SUS: óbitos entre quem tem plano de saúde. */
  obitosPlano: number;
  /** Fração das equipes de saúde em condição de trabalhar, de 0,4 a 1. */
  equipe: number;
  /** Infectados dos últimos dias, do mais antigo ao mais recente. */
  hist: number[];
  /** Fração da demanda hospitalar sem leito, de 0 a 1. */
  sobrecarga: number;
  /** Dia até o qual cada ação local vale. */
  ate: Record<AcaoLocalId, number>;
}

export interface Modificador {
  alvo: AlvoMod;
  fator: number;
  ate: number;
  /** null vale para o país inteiro. */
  ufs: string[] | null;
}

export interface Noticia {
  dia: number;
  texto: string;
  tipo: 'evento' | 'alerta' | 'bom' | 'fato';
}

export interface EventoPendente {
  id: string;
  ufs: string[];
}

export interface Estado {
  cenario: CenarioId;
  semente: number;
  rng: number;
  dia: number;
  orcamento: number;
  confianca: number;
  /** Serviços de rotina funcionando (pré-natal, doenças crônicas, saúde bucal), de 0 a 100. */
  rotina: number;
  niveis: Record<FrenteId, Nivel>;
  gasto: Record<FrenteId, number>;
  ufs: Record<string, EstadoUF>;
  vacinaProgresso: number;
  mods: Modificador[];
  noticias: Noticia[];
  diasControle: number;
  diasColapso: number;
  ativosOntem: number;
  picoAtivos: number;
  ultimoEvento: number;
  ultimoEventoId: string | null;
  eventoPendente: EventoPendente | null;
  fim: Fim;
  semSUS: boolean;
}

export type Acao =
  | { tipo: 'investir'; frente: FrenteId }
  | { tipo: 'local'; uf: string; acao: AcaoLocalId }
  | { tipo: 'evento'; opcao: number };

export interface ResultadoAcao {
  estado: Estado;
  ok: boolean;
  motivo?: string;
}

export const DIAS_MAX = 540;
export const DIAS_HIST = 8;
