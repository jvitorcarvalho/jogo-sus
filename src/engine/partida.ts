import { CENARIOS } from '../data/cenarios';
import { SIGLAS, UFS } from '../data/ufs';
import type { CenarioId, Estado, EstadoUF } from './tipos';
import { DIAS_HIST } from './tipos';

export function criarPartida(cenario: CenarioId, semente: number, opcoes: { semSUS?: boolean } = {}): Estado {
  const cen = CENARIOS[cenario];
  const semSUS = opcoes.semSUS ?? false;
  const ufs: Record<string, EstadoUF> = {};
  for (const sigla of SIGLAS) {
    const pop = UFS[sigla].pop;
    const imunes = pop * cen.imunidadeInicial;
    const casos = cen.origem.includes(sigla) ? cen.casosIniciais / cen.origem.length : 0;
    const vacinados = cen.vacina === 'pronta' ? imunes : 0;
    const recuperados = cen.vacina === 'pronta' ? 0 : imunes;
    ufs[sigla] = {
      s: pop - imunes - 2 * casos,
      e: casos,
      i: casos,
      r: recuperados,
      v: vacinados,
      obitos: 0,
      obitosPlano: 0,
      equipe: 1,
      hist: Array<number>(DIAS_HIST).fill(casos),
      sobrecarga: 0,
      ate: { forca: 0, campanha: 0, mutirao: 0, leitos: 0 },
    };
  }
  return {
    cenario,
    semente,
    rng: semente | 0,
    dia: 0,
    orcamento: semSUS ? 0 : cen.orcamentoInicial,
    confianca: 70,
    rotina: 100,
    niveis: { sanitaria: 0, vigilancia: 0, imunizacao: 0, trabalhador: 0, atencao: 0, urgencia: 0, ciencia: 0, comunicacao: 0 },
    gasto: { sanitaria: 0, vigilancia: 0, imunizacao: 0, trabalhador: 0, atencao: 0, urgencia: 0, ciencia: 0, comunicacao: 0 },
    ufs,
    vacinaProgresso: 0,
    mods: [],
    noticias: [
      {
        dia: 0,
        tipo: 'alerta',
        texto: `Primeiros casos de ${cen.nome.toLowerCase()} confirmados em ${cen.origem.join(', ')}.`,
      },
    ],
    diasControle: 0,
    diasColapso: 0,
    ativosOntem: cen.casosIniciais,
    picoAtivos: cen.casosIniciais,
    ultimoEvento: 0,
    ultimoEventoId: null,
    eventoPendente: null,
    fim: null,
    semSUS,
  };
}

/** Há vacina para aplicar nesta partida, hoje? */
export function vacinaDisponivel(estado: Estado): boolean {
  if (estado.semSUS) return false;
  return CENARIOS[estado.cenario].vacina !== 'pesquisa' || estado.vacinaProgresso >= 1;
}

export function noticiar(estado: Estado, tipo: 'evento' | 'alerta' | 'bom' | 'fato', texto: string): void {
  estado.noticias.push({ dia: estado.dia, tipo, texto });
  if (estado.noticias.length > 40) estado.noticias.splice(0, estado.noticias.length - 40);
}
