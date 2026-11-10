import { criarPartida } from './partida';
import { avancarDia } from './passo';
import type { CenarioId } from './tipos';
import { DIAS_MAX } from './tipos';
import { totais } from './visao';

/**
 * Roda o mesmo surto sem sistema público: um quarto dos leitos, sem vacinação, sem prevenção,
 * sem investimento e sem eventos. Devolve os óbitos acumulados até o dia pedido.
 */
export function simularSemSUS(cenario: CenarioId, semente: number, dias: number = DIAS_MAX): { obitos: number; dias: number } {
  let estado = criarPartida(cenario, semente, { semSUS: true });
  const limite = Math.min(dias, DIAS_MAX);
  while (estado.dia < limite && !estado.fim) estado = avancarDia(estado);
  return { obitos: totais(estado).obitos, dias: estado.dia };
}
