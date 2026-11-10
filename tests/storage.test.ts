import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarPartida } from '../src/engine/partida';
import {
  VERSAO,
  apagarPartida,
  carregarPartida,
  lerRanking,
  registrarRanking,
  salvarPartida,
  type EntradaRanking,
} from '../src/storage/local';
import { avancar } from './jogador';

function armazenamentoFalso(): Storage {
  const mapa = new Map<string, string>();
  return {
    getItem: (k) => mapa.get(k) ?? null,
    setItem: (k, v) => void mapa.set(k, v),
    removeItem: (k) => void mapa.delete(k),
    clear: () => mapa.clear(),
    key: () => null,
    get length() {
      return mapa.size;
    },
  };
}

const entrada = (vidasSalvas: number, cenario: EntradaRanking['cenario'] = 'dengue'): EntradaRanking => ({
  cenario,
  vidasSalvas,
  obitos: 10,
  nota: 'B',
  fim: 'vitoria',
  dias: 200,
  data: '2026-11-10',
});

describe('armazenamento local', () => {
  beforeEach(() => vi.stubGlobal('localStorage', armazenamentoFalso()));
  afterEach(() => vi.unstubAllGlobals());

  it('salvar e carregar devolve o mesmo estado', () => {
    const estado = avancar(criarPartida('sarampo', 3), 15);
    expect(salvarPartida(estado)).toBe(true);
    const lido = carregarPartida();
    expect(lido.tipo).toBe('ok');
    if (lido.tipo === 'ok') expect(lido.estado).toEqual(estado);
  });

  it('sem salvamento devolve vazio', () => {
    expect(carregarPartida().tipo).toBe('vazio');
  });

  it('descarta salvamento de outra versão', () => {
    localStorage.setItem('jogo-sus:partida', JSON.stringify({ versao: VERSAO + 1, estado: criarPartida('dengue', 1) }));
    expect(carregarPartida().tipo).toBe('incompativel');
    expect(carregarPartida().tipo, 'o salvamento ruim foi apagado').toBe('vazio');
  });

  it('descarta salvamento corrompido', () => {
    localStorage.setItem('jogo-sus:partida', '{isto não é json');
    expect(carregarPartida().tipo).toBe('vazio');
    localStorage.setItem('jogo-sus:partida', JSON.stringify({ versao: VERSAO, estado: { cenario: 'dengue' } }));
    expect(carregarPartida().tipo).toBe('incompativel');
  });

  it('apagar remove a partida salva', () => {
    salvarPartida(criarPartida('dengue', 1));
    apagarPartida();
    expect(carregarPartida().tipo).toBe('vazio');
  });

  it('ranking guarda os dez melhores por cenário, em ordem', () => {
    for (let n = 1; n <= 12; n++) registrarRanking(entrada(n * 100));
    registrarRanking(entrada(5, 'sarampo'));
    const dengue = lerRanking('dengue');
    expect(dengue).toHaveLength(10);
    expect(dengue[0].vidasSalvas).toBe(1200);
    expect(dengue[9].vidasSalvas).toBe(300);
    expect(lerRanking('sarampo')).toHaveLength(1);
    expect(lerRanking('respiratoria')).toHaveLength(0);
  });

  it('armazenamento que falha não derruba o jogo', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('cheio');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    });
    expect(salvarPartida(criarPartida('dengue', 1))).toBe(false);
    expect(carregarPartida().tipo).toBe('vazio');
    expect(() => apagarPartida()).not.toThrow();
    expect(registrarRanking(entrada(1))).toHaveLength(1);
    expect(lerRanking('dengue')).toEqual([]);
  });

  it('sem localStorage (navegação privada antiga) também não derruba', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(salvarPartida(criarPartida('dengue', 1))).toBe(false);
    expect(carregarPartida().tipo).toBe('vazio');
  });
});
