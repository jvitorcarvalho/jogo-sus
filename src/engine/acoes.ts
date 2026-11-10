import { ACOES_LOCAIS } from '../data/acoesLocais';
import { CENARIOS } from '../data/cenarios';
import { EVENTOS } from '../data/eventos';
import { CUSTO_NIVEL, FRENTES } from '../data/frentes';
import { UFS } from '../data/ufs';
import { resolverEvento } from './eventos';
import { noticiar, vacinaDisponivel } from './partida';
import type { Acao, Estado, Nivel, ResultadoAcao } from './tipos';

const recusa = (estado: Estado, motivo: string): ResultadoAcao => ({ estado, ok: false, motivo });

/** Diz por que a ação não pode ser feita agora, ou null se pode. Usado pelo motor e pela interface. */
export function impedimento(estado: Estado, acao: Acao): string | null {
  if (estado.fim) return 'A partida terminou.';
  if (estado.semSUS) return 'Nesta simulação não há SUS.';
  if (acao.tipo === 'investir') {
    const nivel = estado.niveis[acao.frente];
    if (nivel >= 3) return 'Frente já está no nível máximo.';
    if (estado.orcamento < CUSTO_NIVEL[nivel]) return 'Orçamento insuficiente.';
    return null;
  }
  if (acao.tipo === 'local') {
    const def = ACOES_LOCAIS[acao.acao];
    if (!UFS[acao.uf]) return 'Estado desconhecido.';
    if (def.soVetor && !CENARIOS[estado.cenario].mutirao) return 'Esta doença não é transmitida por mosquito.';
    if (def.exigeVacina && !vacinaDisponivel(estado)) return 'Ainda não há vacina.';
    if (estado.ufs[acao.uf].ate[acao.acao] > estado.dia) return 'Ação já em andamento neste estado.';
    if (estado.orcamento < def.custo) return 'Orçamento insuficiente.';
    return null;
  }
  if (!estado.eventoPendente) return 'Não há evento esperando resposta.';
  const opcao = EVENTOS[estado.eventoPendente.id].opcoes[acao.opcao];
  if (!opcao) return 'Opção inexistente.';
  if (estado.orcamento < (opcao.custo ?? 0)) return 'Orçamento insuficiente.';
  return null;
}

export function aplicarAcao(estado: Estado, acao: Acao): ResultadoAcao {
  const motivo = impedimento(estado, acao);
  if (motivo) return recusa(estado, motivo);
  const e = structuredClone(estado);
  if (acao.tipo === 'investir') {
    const nivel = e.niveis[acao.frente];
    const custo = CUSTO_NIVEL[nivel];
    e.orcamento -= custo;
    e.gasto[acao.frente] += custo;
    e.niveis[acao.frente] = (nivel + 1) as Nivel;
    noticiar(e, 'bom', `${FRENTES[acao.frente].nome} reforçada: nível ${nivel + 1}.`);
  } else if (acao.tipo === 'local') {
    const def = ACOES_LOCAIS[acao.acao];
    e.orcamento -= def.custo;
    e.ufs[acao.uf].ate[acao.acao] = e.dia + def.dias;
    noticiar(e, 'bom', `${def.nome}: ${UFS[acao.uf].nome}.`);
  } else {
    resolverEvento(e, acao.opcao);
  }
  return { estado: e, ok: true };
}
