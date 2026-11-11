import { criarPartida } from './partida';
import { avancarDia } from './passo';
import type { CenarioId } from './tipos';
import { DIAS_MAX } from './tipos';
import { totais } from './visao';

export interface ResultadoSemSUS {
  obitos: number;
  /** Parte dos óbitos que ocorreu entre quem tem plano de saúde. */
  obitosPlano: number;
  dias: number;
}

/**
 * Roda o mesmo surto num país só com a rede particular: leitos para a parcela com plano
 * (cobertura real da ANS por estado), sem vigilância, sem vacinação pública, sem prevenção,
 * sem investimento e sem eventos. Devolve os óbitos acumulados até o dia pedido.
 */
export function simularSemSUS(cenario: CenarioId, semente: number, dias: number = DIAS_MAX): ResultadoSemSUS {
  let estado = criarPartida(cenario, semente, { semSUS: true });
  const limite = Math.min(dias, DIAS_MAX);
  while (estado.dia < limite && !estado.fim) estado = avancarDia(estado);
  const t = totais(estado);
  return { obitos: t.obitos, obitosPlano: t.obitosPlano, dias: estado.dia };
}
