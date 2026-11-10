import { IBGE } from './ibge.gerado';

export interface UF {
  sigla: string;
  nome: string;
  pop: number;
  vizinhos: string[];
  /** Peso da UF na malha aérea, de 0 a 1. Parâmetro de jogo, não dado oficial. */
  aereo: number;
  d: string;
  cx: number;
  cy: number;
}

/** Fronteiras terrestres entre unidades da federação. */
const VIZINHOS: Record<string, string[]> = {
  AC: ['AM', 'RO'],
  AL: ['PE', 'BA', 'SE'],
  AM: ['AC', 'RO', 'RR', 'PA', 'MT'],
  AP: ['PA'],
  BA: ['SE', 'AL', 'PE', 'PI', 'TO', 'GO', 'MG', 'ES'],
  CE: ['PI', 'PE', 'PB', 'RN'],
  DF: ['GO', 'MG'],
  ES: ['BA', 'MG', 'RJ'],
  GO: ['MT', 'MS', 'MG', 'BA', 'TO', 'DF'],
  MA: ['PA', 'TO', 'PI'],
  MG: ['BA', 'GO', 'DF', 'MS', 'SP', 'RJ', 'ES'],
  MS: ['PR', 'SP', 'MG', 'GO', 'MT'],
  MT: ['MS', 'GO', 'TO', 'PA', 'AM', 'RO'],
  PA: ['AM', 'RR', 'AP', 'MA', 'TO', 'MT'],
  PB: ['RN', 'CE', 'PE'],
  PE: ['PB', 'CE', 'PI', 'BA', 'AL'],
  PI: ['MA', 'TO', 'BA', 'PE', 'CE'],
  PR: ['SP', 'MS', 'SC'],
  RJ: ['ES', 'MG', 'SP'],
  RN: ['CE', 'PB'],
  RO: ['AC', 'AM', 'MT'],
  RR: ['AM', 'PA'],
  RS: ['SC'],
  SC: ['PR', 'RS'],
  SE: ['AL', 'BA'],
  SP: ['RJ', 'MG', 'MS', 'PR'],
  TO: ['PA', 'MA', 'PI', 'BA', 'GO', 'MT'],
};

const maiorPop = Math.max(...Object.values(IBGE).map((u) => u.pop));

export const UFS: Record<string, UF> = Object.fromEntries(
  Object.entries(IBGE).map(([sigla, dado]) => {
    // Peso aéreo proporcional à população, com piso para capitais menores e reforço ao DF (conexões).
    const base = dado.pop / maiorPop;
    const aereo = Math.min(1, Math.max(0.05, sigla === 'DF' ? base + 0.4 : base));
    return [sigla, { sigla, ...dado, vizinhos: VIZINHOS[sigla] ?? [], aereo }];
  }),
);

export const SIGLAS: string[] = Object.keys(UFS).sort();
export const POP_BRASIL: number = SIGLAS.reduce((t, s) => t + UFS[s].pop, 0);
