import { CENARIOS } from '../data/cenarios';
import { SIGLAS } from '../data/ufs';
import type { CenarioId, Estado, Fim } from '../engine/tipos';
import type { Nota } from '../engine/visao';

/** Aumentar sempre que o formato de Estado mudar; salvamentos antigos são descartados. */
export const VERSAO = 1;
const CHAVE_PARTIDA = 'jogo-sus:partida';
const CHAVE_RANKING = 'jogo-sus:ranking';
const MAX_RANKING = 10;

export interface EntradaRanking {
  cenario: CenarioId;
  vidasSalvas: number;
  obitos: number;
  nota: Nota;
  fim: Exclude<Fim, null>;
  dias: number;
  /** Data real da partida, AAAA-MM-DD. */
  data: string;
}

function ler(chave: string): unknown {
  try {
    const bruto = globalThis.localStorage?.getItem(chave);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown): boolean {
  try {
    globalThis.localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

function estadoValido(e: unknown): e is Estado {
  if (typeof e !== 'object' || e === null) return false;
  const x = e as Partial<Estado>;
  return (
    typeof x.cenario === 'string' &&
    x.cenario in CENARIOS &&
    typeof x.dia === 'number' &&
    typeof x.orcamento === 'number' &&
    typeof x.ufs === 'object' &&
    x.ufs !== null &&
    SIGLAS.every((s) => typeof x.ufs![s]?.s === 'number')
  );
}

/** Devolve false se o navegador não deixou gravar; o jogo segue sem salvar. */
export function salvarPartida(estado: Estado): boolean {
  return gravar(CHAVE_PARTIDA, { versao: VERSAO, estado });
}

export type Carregamento =
  | { tipo: 'ok'; estado: Estado }
  | { tipo: 'vazio' }
  | { tipo: 'incompativel' };

export function carregarPartida(): Carregamento {
  const dado = ler(CHAVE_PARTIDA) as { versao?: number; estado?: unknown } | null;
  if (!dado) return { tipo: 'vazio' };
  if (dado.versao !== VERSAO || !estadoValido(dado.estado)) {
    apagarPartida();
    return { tipo: 'incompativel' };
  }
  return { tipo: 'ok', estado: dado.estado };
}

export function apagarPartida(): void {
  try {
    globalThis.localStorage?.removeItem(CHAVE_PARTIDA);
  } catch {
    // sem armazenamento não há o que apagar
  }
}

function lerTodoRanking(): EntradaRanking[] {
  const dado = ler(CHAVE_RANKING) as { versao?: number; entradas?: unknown } | null;
  if (!dado || dado.versao !== VERSAO || !Array.isArray(dado.entradas)) return [];
  return dado.entradas.filter(
    (x): x is EntradaRanking => typeof x?.vidasSalvas === 'number' && typeof x?.cenario === 'string' && x.cenario in CENARIOS,
  );
}

export function lerRanking(cenario: CenarioId): EntradaRanking[] {
  return lerTodoRanking()
    .filter((x) => x.cenario === cenario)
    .sort((a, b) => b.vidasSalvas - a.vidasSalvas)
    .slice(0, MAX_RANKING);
}

/** Guarda a partida no ranking e devolve os dez melhores do cenário. */
export function registrarRanking(entrada: EntradaRanking): EntradaRanking[] {
  const outros = lerTodoRanking().filter((x) => x.cenario !== entrada.cenario);
  const doCenario = [...lerRanking(entrada.cenario), entrada]
    .sort((a, b) => b.vidasSalvas - a.vidasSalvas)
    .slice(0, MAX_RANKING);
  gravar(CHAVE_RANKING, { versao: VERSAO, entradas: [...outros, ...doCenario] });
  return doCenario;
}
