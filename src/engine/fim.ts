import { CENARIOS } from '../data/cenarios';
import { POP_BRASIL } from '../data/ufs';
import type { Estado } from './tipos';
import { DIAS_MAX } from './tipos';

export const DIA_MIN_VITORIA = 90;
export const DIAS_SEGUIDOS = 30;

/** Atualiza contadores e define o fim da partida. Altera o estado recebido (que já é uma cópia). */
export function verificarFim(e: Estado, ativos: number, popColapso: number): void {
  if (e.semSUS) {
    if (e.dia >= DIAS_MAX) e.fim = 'derrota-tempo';
    return;
  }
  const porCemMil = (ativos / POP_BRASIL) * 1e5;
  e.diasControle = porCemMil < CENARIOS[e.cenario].limiarControle ? e.diasControle + 1 : 0;
  e.diasColapso = popColapso / POP_BRASIL > 0.5 ? e.diasColapso + 1 : 0;

  if (e.confianca <= 0) e.fim = 'derrota-confianca';
  else if (e.diasColapso >= DIAS_SEGUIDOS) e.fim = 'derrota-colapso';
  else if (e.dia >= DIA_MIN_VITORIA && e.diasControle >= DIAS_SEGUIDOS && ativos <= e.picoAtivos * 0.5) e.fim = 'vitoria';
  else if (e.dia >= DIAS_MAX) e.fim = 'derrota-tempo';
}
