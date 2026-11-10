import { describe, expect, it } from 'vitest';
import { ACOES_LOCAIS } from '../src/data/acoesLocais';
import { CENARIOS, CENARIO_IDS } from '../src/data/cenarios';
import { EVENTOS } from '../src/data/eventos';
import { CUSTO_NIVEL, FRENTE_IDS } from '../src/data/frentes';
import { POP_BRASIL, SIGLAS, UFS } from '../src/data/ufs';
import { aplicarAcao, impedimento } from '../src/engine/acoes';
import { criarPartida } from '../src/engine/partida';
import { avancarDia, capacidade } from '../src/engine/passo';
import { simularSemSUS } from '../src/engine/semSUS';
import type { Estado } from '../src/engine/tipos';
import { casosVisiveis, nota, totais } from '../src/engine/visao';
import { ESTRATEGIA, avancar, jogar, semEventos, tresVezes } from './jogador';

const SEMENTE = 7;

describe('dados das UFs (IBGE)', () => {
  it('tem as 27 unidades da federação com população e contorno', () => {
    expect(SIGLAS).toHaveLength(27);
    for (const s of SIGLAS) {
      expect(UFS[s].pop).toBeGreaterThan(0);
      expect(UFS[s].d.startsWith('M')).toBe(true);
      expect(UFS[s].nome.length).toBeGreaterThan(3);
    }
  });

  it('soma a população do Censo 2022', () => {
    expect(POP_BRASIL).toBeGreaterThan(190e6);
    expect(POP_BRASIL).toBeLessThan(220e6);
  });

  it('tem vizinhança simétrica e sem UF isolada', () => {
    for (const s of SIGLAS) {
      expect(UFS[s].vizinhos.length).toBeGreaterThan(0);
      for (const v of UFS[s].vizinhos) {
        expect(UFS[v], `${s} cita ${v}`).toBeDefined();
        expect(UFS[v].vizinhos, `${v} deveria citar ${s}`).toContain(s);
      }
    }
  });
});

describe('integridade dos dados de jogo', () => {
  it('todo cenário aponta para UFs e eventos que existem', () => {
    for (const id of CENARIO_IDS) {
      const c = CENARIOS[id];
      for (const s of c.origem) expect(UFS[s]).toBeDefined();
      for (const ev of c.eventos) expect(EVENTOS[ev], ev).toBeDefined();
    }
  });

  it('todo evento tem uma opção sem custo, para nunca travar a partida', () => {
    for (const ev of Object.values(EVENTOS)) {
      expect(ev.opcoes.some((o) => !o.custo), ev.id).toBe(true);
    }
  });
});

describe('epidemia', () => {
  it('é determinística: mesma semente e mesmas ações dão a mesma partida', () => {
    const a = jogar('dengue', SEMENTE, tresVezes(ESTRATEGIA.dengue));
    const b = jogar('dengue', SEMENTE, tresVezes(ESTRATEGIA.dengue));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('sementes diferentes dão partidas diferentes', () => {
    const a = jogar('dengue', 1, []);
    const b = jogar('dengue', 2, []);
    expect(totais(a).obitos).not.toBe(totais(b).obitos);
  });

  it.each(CENARIO_IDS)('conserva a população de cada UF (%s)', (c) => {
    const e = avancar(semEventos(criarPartida(c, SEMENTE)), 200);
    for (const s of SIGLAS) {
      const u = e.ufs[s];
      const soma = u.s + u.e + u.i + u.r + u.v + u.obitos;
      expect(Math.abs(soma - UFS[s].pop) / UFS[s].pop).toBeLessThan(1e-9);
      for (const k of ['s', 'e', 'i', 'r', 'v', 'obitos'] as const) expect(u[k]).toBeGreaterThanOrEqual(0);
    }
  });

  it('sem intervenção o surto cresce e chega a outros estados', () => {
    const inicio = criarPartida('respiratoria', SEMENTE);
    const depois = avancar(semEventos(inicio), 60);
    expect(totais(depois).ativos).toBeGreaterThan(totais(inicio).ativos * 5);
    const comCaso = SIGLAS.filter((s) => depois.ufs[s].i >= 1);
    expect(comCaso.length).toBeGreaterThan(CENARIOS.respiratoria.origem.length);
  });
});

describe('hospital, vacina, confiança e orçamento', () => {
  /** Partida com um surto grande em SP, para forçar falta de leito. */
  const lotado = (): Estado => {
    const e = semEventos(criarPartida('respiratoria', SEMENTE));
    const sp = e.ufs.SP;
    sp.s -= 4e6;
    sp.i += 4e6;
    return e;
  };

  it('falta de leito aumenta as mortes; a frente Urgência reduz', () => {
    const base = avancarDia(lotado());
    expect(base.ufs.SP.sobrecarga).toBeGreaterThan(0);
    const reforcado = lotado();
    reforcado.niveis.urgencia = 3;
    const comUrgencia = avancarDia(reforcado);
    expect(comUrgencia.ufs.SP.sobrecarga).toBeLessThan(base.ufs.SP.sobrecarga);
    expect(comUrgencia.ufs.SP.obitos).toBeLessThan(base.ufs.SP.obitos);
  });

  it('vacinação reduz suscetíveis e depende da confiança', () => {
    const alta = semEventos(criarPartida('sarampo', SEMENTE));
    const baixa = { ...semEventos(criarPartida('sarampo', SEMENTE)), confianca: 10 };
    const v0 = alta.ufs.MG.v;
    const depoisAlta = avancarDia(alta);
    const depoisBaixa = avancarDia(baixa);
    expect(depoisAlta.ufs.MG.v).toBeGreaterThan(v0);
    expect(depoisBaixa.ufs.MG.v - v0).toBeLessThan(depoisAlta.ufs.MG.v - v0);
  });

  it('sem vacina pronta ninguém é vacinado', () => {
    const e = avancar(semEventos(criarPartida('respiratoria', SEMENTE)), 30);
    expect(totais(e).vacinados).toBe(0);
  });

  it('o orçamento entra a cada 30 dias', () => {
    const c = CENARIOS.dengue;
    const inicio = semEventos(criarPartida('dengue', SEMENTE));
    expect(avancar(inicio, 29).orcamento).toBe(c.orcamentoInicial);
    expect(avancar(inicio, 30).orcamento).toBe(c.orcamentoInicial + c.orcamentoMensal);
    expect(avancar(inicio, 60).orcamento).toBe(c.orcamentoInicial + 2 * c.orcamentoMensal);
  });

  it('sem Vigilância o jogador vê menos casos e com atraso; no nível 3 vê tudo', () => {
    const e = avancar(semEventos(criarPartida('respiratoria', SEMENTE)), 40);
    const real = e.ufs.SP.i;
    expect(casosVisiveis(e, 'SP')).toBeCloseTo(e.ufs.SP.hist[0] * 0.3, 6);
    expect(casosVisiveis(e, 'SP')).toBeLessThan(real * 0.3);
    const comVigilancia = { ...e, niveis: { ...e.niveis, vigilancia: 3 as const } };
    expect(casosVisiveis(comVigilancia, 'SP')).toBe(real);
  });
});

describe('ações do jogador', () => {
  it('investir debita o orçamento e sobe o nível', () => {
    const e = criarPartida('dengue', SEMENTE);
    const r = aplicarAcao(e, { tipo: 'investir', frente: 'atencao' });
    expect(r.ok).toBe(true);
    expect(r.estado.niveis.atencao).toBe(1);
    expect(r.estado.orcamento).toBe(e.orcamento - CUSTO_NIVEL[0]);
    expect(r.estado.gasto.atencao).toBe(CUSTO_NIVEL[0]);
    expect(e.niveis.atencao, 'o estado original não muda').toBe(0);
  });

  it('recusa investimento sem saldo e acima do nível máximo', () => {
    const pobre = { ...criarPartida('dengue', SEMENTE), orcamento: 10 };
    const r = aplicarAcao(pobre, { tipo: 'investir', frente: 'atencao' });
    expect(r.ok).toBe(false);
    expect(r.estado).toBe(pobre);
    const rico = { ...criarPartida('dengue', SEMENTE), orcamento: 9999 };
    rico.niveis.atencao = 3;
    expect(aplicarAcao(rico, { tipo: 'investir', frente: 'atencao' }).ok).toBe(false);
  });

  it('mutirão só existe em doença de mosquito; campanha exige vacina', () => {
    const sarampo = criarPartida('sarampo', SEMENTE);
    expect(impedimento(sarampo, { tipo: 'local', uf: 'SP', acao: 'mutirao' })).not.toBeNull();
    expect(impedimento(sarampo, { tipo: 'local', uf: 'SP', acao: 'campanha' })).toBeNull();
    const resp = criarPartida('respiratoria', SEMENTE);
    expect(impedimento(resp, { tipo: 'local', uf: 'SP', acao: 'campanha' })).not.toBeNull();
    expect(impedimento({ ...resp, vacinaProgresso: 1 }, { tipo: 'local', uf: 'SP', acao: 'campanha' })).toBeNull();
  });

  it('ação local vale pelo prazo e depois expira', () => {
    const inicio = semEventos(criarPartida('respiratoria', SEMENTE));
    const antes = capacidade(inicio, 'SP');
    const r = aplicarAcao(inicio, { tipo: 'local', uf: 'SP', acao: 'leitos' });
    expect(r.ok).toBe(true);
    expect(r.estado.orcamento).toBe(inicio.orcamento - ACOES_LOCAIS.leitos.custo);
    expect(capacidade(r.estado, 'SP') / antes).toBeCloseTo(ACOES_LOCAIS.leitos.fator, 6);
    expect(capacidade(r.estado, 'RJ')).toBe(capacidade(inicio, 'RJ'));
    expect(aplicarAcao(r.estado, { tipo: 'local', uf: 'SP', acao: 'leitos' }).ok, 'não repete enquanto vale').toBe(false);
    const depois = avancar(r.estado, ACOES_LOCAIS.leitos.dias);
    const semAcao = avancar(inicio, ACOES_LOCAIS.leitos.dias);
    expect(capacidade(depois, 'SP') / capacidade(semAcao, 'SP')).toBeLessThan(1.01);
  });

  it('evento pendente trava o relógio até o jogador responder', () => {
    const e: Estado = { ...criarPartida('dengue', SEMENTE), eventoPendente: { id: 'insumo', ufs: [] } };
    expect(avancarDia(e)).toBe(e);
    const r = aplicarAcao(e, { tipo: 'evento', opcao: 0 });
    expect(r.ok).toBe(true);
    expect(r.estado.eventoPendente).toBeNull();
    expect(r.estado.orcamento).toBe(e.orcamento - 30);
    expect(avancarDia(r.estado).dia).toBe(1);
  });

  it('evento regional só afeta os estados atingidos', () => {
    const e: Estado = { ...criarPartida('dengue', SEMENTE), eventoPendente: { id: 'enchente', ufs: ['RS', 'SC'] } };
    const r = aplicarAcao(e, { tipo: 'evento', opcao: 1 }).estado;
    expect(capacidade(r, 'RS')).toBeLessThan(capacidade(e, 'RS'));
    expect(capacidade(r, 'AM')).toBe(capacidade(e, 'AM'));
  });

  it('Comunicação atenua o estrago de um boato ignorado', () => {
    const base: Estado = { ...criarPartida('sarampo', SEMENTE), eventoPendente: { id: 'boato', ufs: [] } };
    const forte: Estado = { ...base, niveis: { ...base.niveis, comunicacao: 3 } };
    const a = aplicarAcao(base, { tipo: 'evento', opcao: 1 }).estado;
    const b = aplicarAcao(forte, { tipo: 'evento', opcao: 1 }).estado;
    expect(b.confianca).toBeGreaterThan(a.confianca);
  });
});

describe('frentes do SUS', () => {
  const parado = Object.fromEntries(CENARIO_IDS.map((c) => [c, totais(jogar(c, SEMENTE, [], 1)).obitos]));

  it.each(FRENTE_IDS)('investir só em %s nunca piora e melhora ao menos um cenário', (f) => {
    let melhorou = false;
    for (const c of CENARIO_IDS) {
      const obitos = totais(jogar(c, SEMENTE, [f, f, f], 1)).obitos;
      expect(obitos, `${f} em ${c}`).toBeLessThanOrEqual(parado[c]);
      if (obitos < parado[c] * 0.95) melhorou = true;
    }
    expect(melhorou).toBe(true);
  });
});

describe('fim de partida', () => {
  it.each(CENARIO_IDS)('estratégia razoável vence (%s)', (c) => {
    expect(jogar(c, SEMENTE, tresVezes(ESTRATEGIA[c])).fim).toBe('vitoria');
  });

  it('ficar parado na pandemia leva ao colapso dos hospitais', () => {
    expect(jogar('respiratoria', SEMENTE, [], 1).fim).toBe('derrota-colapso');
  });

  it('confiança zerada encerra a partida', () => {
    const e = { ...semEventos(criarPartida('respiratoria', SEMENTE)), confianca: 0.01 };
    e.ufs.SP.s -= 8e6;
    e.ufs.SP.i += 8e6;
    expect(avancarDia(e).fim).toBe('derrota-confianca');
  });

  it('o prazo de 540 dias encerra a partida', () => {
    const e = { ...semEventos(criarPartida('sarampo', SEMENTE)), dia: 539 };
    expect(avancarDia(e).fim).toBe('derrota-tempo');
  });

  it('partida encerrada não avança nem aceita ação', () => {
    const fim = jogar('dengue', SEMENTE, []);
    expect(avancarDia(fim)).toBe(fim);
    expect(aplicarAcao({ ...fim, orcamento: 999 }, { tipo: 'investir', frente: 'atencao' }).ok).toBe(false);
  });
});

describe('simulação sem SUS', () => {
  it('é determinística', () => {
    expect(simularSemSUS('dengue', SEMENTE)).toEqual(simularSemSUS('dengue', SEMENTE));
  });

  it.each(CENARIO_IDS)('é pior que o SUS básico sem nenhuma decisão do jogador (%s)', (c) => {
    const parado = jogar(c, SEMENTE, [], 1);
    const sem = simularSemSUS(c, SEMENTE, parado.dia);
    expect(sem.dias).toBe(parado.dia);
    expect(sem.obitos).toBeGreaterThan(totais(parado).obitos * 1.2);
  });

  it('nota vai de A a E conforme a fração de mortes evitadas', () => {
    expect(nota(95, 100)).toBe('A');
    expect(nota(80, 100)).toBe('B');
    expect(nota(60, 100)).toBe('C');
    expect(nota(35, 100)).toBe('D');
    expect(nota(5, 100)).toBe('E');
    expect(nota(0, 0)).toBe('E');
  });
});
