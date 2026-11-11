import { describe, expect, it } from 'vitest';
import { BENEFICIARIOS_PLANO_MEDICO } from '../src/data/ans.gerado';
import { CENARIO_IDS } from '../src/data/cenarios';
import { CAMPOS, FRENTES, FRENTE_IDS } from '../src/data/frentes';
import { COBERTURA_BRASIL, POP_BRASIL, SIGLAS, UFS } from '../src/data/ufs';
import { criarPartida } from '../src/engine/partida';
import { avancarDia, capacidade } from '../src/engine/passo';
import { simularSemSUS } from '../src/engine/semSUS';
import type { Estado } from '../src/engine/tipos';
import { totais } from '../src/engine/visao';
import { avancar, jogar, responderEvento, semEventos } from './jogador';

const SEMENTE = 7;

describe('cobertura de planos (ANS)', () => {
  it('há beneficiários para as 27 UFs e a cobertura é uma fração plausível', () => {
    expect(Object.keys(BENEFICIARIOS_PLANO_MEDICO).sort()).toEqual([...SIGLAS].sort());
    for (const s of SIGLAS) {
      expect(UFS[s].cobertura, s).toBeGreaterThan(0.01);
      expect(UFS[s].cobertura, s).toBeLessThanOrEqual(0.95);
    }
  });

  it('a cobertura nacional fica entre 15% e 40% e é desigual entre estados', () => {
    expect(COBERTURA_BRASIL).toBeGreaterThan(0.15);
    expect(COBERTURA_BRASIL).toBeLessThan(0.4);
    expect(UFS.SP.cobertura).toBeGreaterThan(UFS.MA.cobertura * 2);
  });
});

describe('campos de atuação da Lei 8.080', () => {
  it('lista as seis alíneas do art. 6º, I, em ordem, mais o apoio', () => {
    expect(CAMPOS.map((c) => c.alinea)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', null]);
  });

  it('toda frente pertence a um campo que existe', () => {
    const ids = CAMPOS.map((c) => c.id);
    for (const f of FRENTE_IDS) expect(ids, f).toContain(FRENTES[f].campo);
  });

  it('só saúde bucal fica sem frente própria, porque entra pela rotina', () => {
    const comFrente = new Set(FRENTE_IDS.map((f) => FRENTES[f].campo));
    expect(CAMPOS.filter((c) => !comFrente.has(c.id)).map((c) => c.id)).toEqual(['bucal']);
  });
});

describe('vigilância sanitária', () => {
  const casosForaDaOrigem = (e: Estado): number =>
    SIGLAS.filter((s) => s !== 'SP' && s !== 'RJ').reduce((t, s) => t + e.ufs[s].e + e.ufs[s].i, 0);

  it('a barreira em aeroportos reduz os casos que chegam a outros estados', () => {
    const base = semEventos(criarPartida('respiratoria', SEMENTE));
    const comBarreira: Estado = { ...base, niveis: { ...base.niveis, sanitaria: 3 } };
    expect(casosForaDaOrigem(avancar(comBarreira, 25))).toBeLessThan(casosForaDaOrigem(avancar(base, 25)) * 0.8);
  });

  it('no nível 2 a fiscalização evita o evento de falta de insumo', () => {
    const eventosVistos = (nivel: 0 | 2): Set<string> => {
      const vistos = new Set<string>();
      for (const semente of [1, 2, 3, 4, 5, 6]) {
        let e = criarPartida('dengue', semente);
        e.niveis.sanitaria = nivel;
        while (!e.fim) {
          if (e.eventoPendente) {
            vistos.add(e.eventoPendente.id);
            e = responderEvento(e, 1);
          }
          e = avancarDia(e);
        }
      }
      return vistos;
    };
    expect(eventosVistos(0), 'controle: sem a frente o evento acontece').toContain('insumo');
    expect(eventosVistos(2)).not.toContain('insumo');
  });
});

describe('saúde do trabalhador', () => {
  /** Surto grande em SP, para desgastar as equipes. */
  const surto = (protecao: 0 | 3): Estado => {
    const e = semEventos(criarPartida('respiratoria', SEMENTE));
    e.ufs.SP.s -= 3e6;
    e.ufs.SP.i += 3e6;
    e.niveis.trabalhador = protecao;
    return e;
  };

  it('as equipes começam inteiras', () => {
    const e = criarPartida('dengue', SEMENTE);
    for (const s of SIGLAS) expect(e.ufs[s].equipe).toBe(1);
  });

  it('num surto as equipes se desgastam e os leitos perdem capacidade', () => {
    const inicio = surto(0);
    const depois = avancar(inicio, 20);
    expect(depois.ufs.SP.equipe).toBeLessThan(0.9);
    expect(depois.ufs.SP.equipe).toBeGreaterThanOrEqual(0.4);
    expect(capacidade(depois, 'SP')).toBeLessThan(capacidade(inicio, 'SP') * 0.95);
  });

  it('a frente protege as equipes e com isso salva vidas', () => {
    const sem = avancar(surto(0), 20);
    const com = avancar(surto(3), 20);
    expect(com.ufs.SP.equipe).toBeGreaterThan(sem.ufs.SP.equipe + 0.05);
    expect(com.ufs.SP.obitos).toBeLessThan(sem.ufs.SP.obitos);
  });

  it('passado o surto as equipes se recuperam', () => {
    const e = semEventos(criarPartida('dengue', SEMENTE));
    e.ufs.AC.equipe = 0.5;
    expect(avancar(e, 60).ufs.AC.equipe).toBeGreaterThan(0.75);
  });
});

describe('serviços de rotina', () => {
  it('começam em 100 e ficam lá sem surto grave', () => {
    const e = avancar(semEventos(criarPartida('sarampo', SEMENTE)), 20);
    expect(e.rotina).toBeGreaterThan(99);
  });

  it('caem quando os hospitais lotam', () => {
    let minimo = 100;
    jogar('respiratoria', SEMENTE, [], 1, (e) => {
      minimo = Math.min(minimo, e.rotina);
    });
    expect(minimo).toBeLessThan(70);
  });

  it('a Atenção Básica sustenta a rotina durante o surto', () => {
    const rotinaNoDia = (ordem: Parameters<typeof jogar>[2]): number => {
      let r = -1;
      jogar('respiratoria', SEMENTE, ordem, 1, (e) => {
        if (e.dia === 170) r = e.rotina;
      });
      return r;
    };
    expect(rotinaNoDia(['atencao', 'atencao', 'atencao'])).toBeGreaterThan(rotinaNoDia([]) + 3);
  });
});

describe('simulação só com a rede particular', () => {
  it.each(CENARIO_IDS)('conserva a população (%s)', (c) => {
    const e = avancar(criarPartida(c, SEMENTE, { semSUS: true }), 200);
    for (const s of SIGLAS) {
      const u = e.ufs[s];
      expect(Math.abs(u.s + u.e + u.i + u.r + u.v + u.obitos - UFS[s].pop) / UFS[s].pop).toBeLessThan(1e-9);
    }
  });

  it.each(CENARIO_IDS)('quem tem plano morre menos que quem não tem, mas também morre (%s)', (c) => {
    const r = simularSemSUS(c, SEMENTE);
    const semPlano = r.obitos - r.obitosPlano;
    expect(r.obitosPlano).toBeGreaterThan(0);
    const taxaPlano = r.obitosPlano / (POP_BRASIL * COBERTURA_BRASIL);
    const taxaSemPlano = semPlano / (POP_BRASIL * (1 - COBERTURA_BRASIL));
    expect(taxaPlano).toBeLessThan(taxaSemPlano);
  });

  it('na partida normal ninguém é contado como óbito "com plano"', () => {
    expect(totais(jogar('dengue', SEMENTE, [])).obitosPlano).toBe(0);
  });

  it('estado com menos cobertura tem menos leitos por habitante', () => {
    const e = criarPartida('respiratoria', SEMENTE, { semSUS: true });
    expect(capacidade(e, 'MA') / UFS.MA.pop).toBeLessThan(capacidade(e, 'SP') / UFS.SP.pop);
  });
});
