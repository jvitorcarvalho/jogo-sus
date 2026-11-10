import { EFEITOS } from '../data/frentes';
import { SIGLAS } from '../data/ufs';
import type { Estado } from './tipos';

/** Casos ativos que o jogador enxerga na UF: atrasados e subnotificados conforme a Vigilância. */
export function casosVisiveis(estado: Estado, sigla: string): number {
  const nivel = estado.niveis.vigilancia;
  const hist = estado.ufs[sigla].hist;
  const indice = Math.max(0, hist.length - 1 - EFEITOS.vigilanciaAtraso[nivel]);
  return hist[indice] * EFEITOS.vigilanciaDeteccao[nivel];
}

export interface Totais {
  ativos: number;
  ativosVisiveis: number;
  obitos: number;
  vacinados: number;
  ufsSobrecarga: number;
}

export function totais(estado: Estado): Totais {
  const t: Totais = { ativos: 0, ativosVisiveis: 0, obitos: 0, vacinados: 0, ufsSobrecarga: 0 };
  for (const s of SIGLAS) {
    const u = estado.ufs[s];
    t.ativos += u.i;
    t.ativosVisiveis += casosVisiveis(estado, s);
    t.obitos += u.obitos;
    t.vacinados += u.v;
    if (u.sobrecarga > 0) t.ufsSobrecarga += 1;
  }
  return t;
}

export type Nota = 'A' | 'B' | 'C' | 'D' | 'E';

/** Nota pela fração das mortes do cenário sem SUS que foi evitada. */
export function nota(vidasSalvas: number, obitosSemSUS: number): Nota {
  const fracao = obitosSemSUS > 0 ? vidasSalvas / obitosSemSUS : 0;
  if (fracao >= 0.9) return 'A';
  if (fracao >= 0.75) return 'B';
  if (fracao >= 0.55) return 'C';
  if (fracao >= 0.3) return 'D';
  return 'E';
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Data de jogo: ano de 12 meses de 30 dias. */
export function dataDeJogo(diaInicialAno: number, dia: number): string {
  const absoluto = diaInicialAno + dia;
  const ano = Math.floor(absoluto / 360) + 1;
  const diaAno = absoluto % 360;
  return `${(diaAno % 30) + 1} ${MESES[Math.floor(diaAno / 30)]} · Ano ${ano}`;
}
