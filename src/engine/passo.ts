import { ACOES_LOCAIS, ACAO_LOCAL_IDS } from '../data/acoesLocais';
import { CENARIOS } from '../data/cenarios';
import { EFEITOS, EQUIPE, SEM_SUS } from '../data/frentes';
import { POP_BRASIL, SIGLAS, UFS } from '../data/ufs';
import { talvezSortearEvento } from './eventos';
import { verificarFim } from './fim';
import { noticiar, vacinaDisponivel } from './partida';
import { sortear } from './rng';
import type { AlvoMod, Estado, EstadoUF } from './tipos';
import { DIAS_HIST } from './tipos';

/** Uma UF está em colapso quando metade ou mais dos pacientes graves fica sem leito. */
export const SOBRECARGA_COLAPSO = 0.5;

const vivos = (u: EstadoUF): number => u.s + u.e + u.i + u.r + u.v;

/** Produto dos modificadores de eventos e de ações locais que valem hoje para a UF. */
export function fatorMod(estado: Estado, alvo: AlvoMod, sigla: string): number {
  let f = 1;
  for (const m of estado.mods) {
    if (m.alvo === alvo && m.ate > estado.dia && (m.ufs === null || m.ufs.includes(sigla))) f *= m.fator;
  }
  const uf = estado.ufs[sigla];
  for (const id of ACAO_LOCAL_IDS) {
    const acao = ACOES_LOCAIS[id];
    if (acao.alvo === alvo && uf.ate[id] > estado.dia) f *= acao.fator;
  }
  return f;
}

export function fatorSazonal(estado: Estado): number {
  const cen = CENARIOS[estado.cenario];
  const diaAno = (cen.diaInicialAno + estado.dia) % 360;
  return 1 + cen.sazonal * Math.cos((2 * Math.PI * (diaAno - 30)) / 360);
}

/**
 * Leitos em funcionamento na UF hoje. Leito sem equipe não funciona.
 * Sem SUS só existem os leitos da rede particular, proporcionais à cobertura de planos da UF.
 */
export function capacidade(estado: Estado, sigla: string): number {
  const cen = CENARIOS[estado.cenario];
  const uf = estado.ufs[sigla];
  const base = (vivos(uf) / 1000) * cen.leitosPorMil * uf.equipe;
  if (estado.semSUS) return base * UFS[sigla].cobertura;
  return base * EFEITOS.urgenciaLeitos[estado.niveis.urgencia] * fatorMod(estado, 'leitos', sigla);
}

/** Avança um dia. Não avança se a partida acabou ou se há evento esperando resposta. */
export function avancarDia(anterior: Estado): Estado {
  if (anterior.fim || anterior.eventoPendente) return anterior;
  const e = structuredClone(anterior);
  e.dia += 1;
  const cen = CENARIOS[e.cenario];
  const n = e.niveis;
  const sus = !e.semSUS;

  const betaGlobal =
    cen.beta *
    fatorSazonal(e) *
    (sus
      ? EFEITOS.atencaoBeta[n.atencao] * EFEITOS.vigilanciaBeta[n.vigilancia] * (1 + 0.25 * (1 - e.confianca / 100))
      : SEM_SUS.beta);
  const letalGlobal = cen.letalidade * (sus ? EFEITOS.urgenciaLetal[n.urgencia] * EFEITOS.cienciaLetal[n.ciencia] : 1);
  const temVacina = vacinaDisponivel(e);
  const vacGlobal = temVacina
    ? cen.vacBase * EFEITOS.imunizacaoVac[n.imunizacao] * EFEITOS.cienciaVac[n.ciencia] * (0.4 + (0.6 * e.confianca) / 100)
    : 0;
  const fluxoAereo = cen.fluxoAereo * (sus ? EFEITOS.sanitariaAereo[n.sanitaria] : 1);
  const desgasteGlobal = EQUIPE.desgaste * (sus ? EFEITOS.trabalhadorDesgaste[n.trabalhador] : 1);

  // Prevalência de ontem, usada para o espalhamento entre UFs.
  const prev: Record<string, number> = {};
  let prevAerea = 0;
  for (const s of SIGLAS) {
    const u = anterior.ufs[s];
    prev[s] = u.i / vivos(u);
    prevAerea += prev[s] * UFS[s].aereo;
  }

  let obitosDia = 0;
  let popSobrecarga = 0;
  let popColapso = 0;
  let ativos = 0;
  let equipePonderada = 0;

  for (const s of SIGLAS) {
    const u = e.ufs[s];
    const antes = anterior.ufs[s];
    const N = vivos(antes);

    // Infectados que chegam de fora: fronteira terrestre e via aérea.
    let chegada = 0;
    for (const v of UFS[s].vizinhos) chegada += cen.fluxoVizinho * prev[v];
    chegada += fluxoAereo * UFS[s].aereo * (prevAerea - prev[s] * UFS[s].aereo);
    chegada *= antes.s / N;
    const sorteio = sortear(e);
    if (antes.e + antes.i < 1 && chegada < 1) chegada = sorteio < chegada ? 1 : 0;

    const beta = betaGlobal * fatorMod(e, 'beta', s);
    const novos = Math.min(antes.s, (beta * antes.s * antes.i) / N + chegada);
    const vacinados = Math.min(antes.s - novos, antes.s * vacGlobal * fatorMod(e, 'vacina', s));
    const adoecem = cen.sigma * antes.e;
    const saem = cen.gamma * antes.i;

    const demanda = antes.i * cen.fracHosp;
    const leitos = capacidade(e, s); // "e" ainda guarda os valores de ontem desta UF
    let sobrecarga: number;
    let mortes: number;
    if (sus) {
      sobrecarga = demanda > leitos ? (demanda - leitos) / demanda : 0;
      mortes = saem * Math.min(0.9, letalGlobal * (1 + 2 * sobrecarga));
    } else {
      // Só rede particular: quem tem plano disputa os leitos privados; quem não tem fica sem leito.
      const plano = UFS[s].cobertura;
      const demandaPlano = demanda * plano;
      const faltaPlano = demandaPlano > leitos ? (demandaPlano - leitos) / demandaPlano : 0;
      const mortesPlano = saem * plano * Math.min(0.9, letalGlobal * (1 + 2 * faltaPlano));
      const mortesSemPlano = saem * (1 - plano) * Math.min(0.9, letalGlobal * SEM_SUS.letalSemPlano * 3);
      mortes = mortesPlano + mortesSemPlano;
      sobrecarga = plano * faltaPlano + (1 - plano);
      u.obitosPlano = antes.obitosPlano + mortesPlano;
    }

    u.s = antes.s - novos - vacinados;
    u.e = antes.e + novos - adoecem;
    u.i = antes.i + adoecem - saem;
    u.r = antes.r + saem - mortes;
    u.v = antes.v + vacinados;
    u.obitos = antes.obitos + mortes;
    u.hist.push(u.i);
    if (u.hist.length > DIAS_HIST) u.hist.shift();

    // Equipes de saúde: desgastam com a doença circulando e com hospital lotado; recuperam aos poucos.
    const desgaste = desgasteGlobal * prev[s] * (1 + 2 * sobrecarga);
    u.equipe = Math.max(EQUIPE.minimo, Math.min(1, antes.equipe - desgaste + EQUIPE.recuperacao * (1 - antes.equipe)));

    if (sus && sobrecarga >= 0.1 && antes.sobrecarga < 0.1) {
      noticiar(e, 'alerta', `Hospitais lotados em ${UFS[s].nome}. Pacientes graves esperam por leito.`);
    }
    u.sobrecarga = sobrecarga;

    obitosDia += mortes;
    ativos += u.i;
    equipePonderada += u.equipe * N;
    if (sobrecarga > 0) popSobrecarga += N;
    if (sobrecarga >= SOBRECARGA_COLAPSO) popColapso += N;
  }

  if (sus) {
    // Serviços de rotina: caem quando os hospitais lotam e as equipes faltam; a Atenção Básica os sustenta.
    const alvoRotina = Math.min(
      100,
      100 * (1 - 0.8 * (popSobrecarga / POP_BRASIL)) * (equipePonderada / POP_BRASIL) + EFEITOS.atencaoRotina[n.atencao],
    );
    e.rotina = e.rotina + (alvoRotina - e.rotina) * 0.05;

    // Confiança: cai com mortes, hospitais lotados e rotina parada; sobe com comunicação e surto em queda.
    const obitosPorMilhao = (obitosDia / POP_BRASIL) * 1e6;
    const perda =
      Math.min(0.6, 0.02 * obitosPorMilhao) + 0.3 * (popSobrecarga / POP_BRASIL) + 0.15 * (1 - e.rotina / 100);
    const ganho = 0.02 + EFEITOS.comunicacaoConfianca[n.comunicacao] + (ativos < e.ativosOntem ? 0.05 : 0);
    e.confianca = Math.max(0, Math.min(100, e.confianca + ganho - perda));

    if (e.dia % 30 === 0) e.orcamento += cen.orcamentoMensal;

    if (cen.vacina === 'pesquisa' && e.vacinaProgresso < 1) {
      e.vacinaProgresso = Math.min(1, e.vacinaProgresso + EFEITOS.cienciaPesquisa[n.ciencia]);
      if (e.vacinaProgresso >= 1) {
        noticiar(e, 'bom', 'A vacina está pronta. A produção pública começa a abastecer os postos.');
      }
    }
    talvezSortearEvento(e);
  }

  e.mods = e.mods.filter((m) => m.ate > e.dia);
  e.ativosOntem = ativos;
  e.picoAtivos = Math.max(e.picoAtivos, ativos);
  verificarFim(e, ativos, popColapso);
  return e;
}
