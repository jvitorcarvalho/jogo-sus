import { CUSTO_NIVEL } from '../src/data/frentes';
import { aplicarAcao } from '../src/engine/acoes';
import { criarPartida } from '../src/engine/partida';
import { avancarDia } from '../src/engine/passo';
import type { CenarioId, Estado, FrenteId } from '../src/engine/tipos';

/** Responde o evento pendente com a opção preferida; se não puder pagar, tenta as outras. */
export function responderEvento(e: Estado, preferida: number): Estado {
  for (const opcao of [preferida, 0, 1]) {
    const r = aplicarAcao(e, { tipo: 'evento', opcao });
    if (r.ok) return r.estado;
  }
  throw new Error('Evento sem opção possível');
}

/** Jogador automático: investe na ordem dada sempre que há saldo e responde eventos. */
export function jogar(
  cenario: CenarioId,
  semente: number,
  ordem: FrenteId[],
  opcaoEvento = 0,
  aCadaDia?: (e: Estado) => void,
): Estado {
  let e = criarPartida(cenario, semente);
  const fila = [...ordem];
  while (!e.fim) {
    if (e.eventoPendente) e = responderEvento(e, opcaoEvento);
    while (fila.length && e.orcamento >= CUSTO_NIVEL[e.niveis[fila[0]]]) {
      e = aplicarAcao(e, { tipo: 'investir', frente: fila.shift()! }).estado;
    }
    e = avancarDia(e);
    aCadaDia?.(e);
  }
  return e;
}

/** Impede o sorteio de eventos na partida (para testes que medem uma coisa só). */
export function semEventos(e: Estado): Estado {
  return { ...e, ultimoEvento: 1e9 };
}

export function avancar(e: Estado, dias: number): Estado {
  for (let d = 0; d < dias; d++) e = avancarDia(e);
  return e;
}

export const ESTRATEGIA: Record<CenarioId, FrenteId[]> = {
  dengue: ['atencao', 'vigilancia', 'urgencia', 'comunicacao', 'imunizacao', 'ciencia'],
  sarampo: ['imunizacao', 'comunicacao', 'vigilancia', 'atencao', 'urgencia', 'ciencia'],
  respiratoria: ['ciencia', 'atencao', 'urgencia', 'comunicacao', 'vigilancia', 'imunizacao'],
};

export const tresVezes = (ordem: FrenteId[]): FrenteId[] => [...ordem, ...ordem, ...ordem];
