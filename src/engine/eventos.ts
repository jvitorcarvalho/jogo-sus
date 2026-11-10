import { CENARIOS } from '../data/cenarios';
import { EVENTOS } from '../data/eventos';
import { EFEITOS } from '../data/frentes';
import { SIGLAS, UFS } from '../data/ufs';
import { noticiar } from './partida';
import { sortear } from './rng';
import type { Estado } from './tipos';

const PRIMEIRO_DIA = 20;
const INTERVALO_MIN = 25;
const CHANCE_DIA = 0.06;

/** Sorteia um evento para o dia. Altera o estado recebido (que já é uma cópia). */
export function talvezSortearEvento(e: Estado): void {
  if (e.eventoPendente || e.dia < PRIMEIRO_DIA || e.dia - e.ultimoEvento < INTERVALO_MIN) return;
  if (sortear(e) >= CHANCE_DIA) return;
  const candidatos = CENARIOS[e.cenario].eventos.filter((id) => id !== e.ultimoEventoId);
  const id = candidatos[Math.floor(sortear(e) * candidatos.length)];
  const evento = EVENTOS[id];
  let ufs: string[] = [];
  if (evento.regional) {
    const centro = SIGLAS[Math.floor(sortear(e) * SIGLAS.length)];
    ufs = [centro, ...UFS[centro].vizinhos.slice(0, 2)];
  }
  e.eventoPendente = { id, ufs };
  e.ultimoEvento = e.dia;
  e.ultimoEventoId = id;
}

export function textoEvento(texto: string, ufs: string[]): string {
  return texto.replaceAll('{ufs}', ufs.map((s) => UFS[s].nome).join(', '));
}

/** Aplica a opção escolhida ao evento pendente. Altera o estado recebido (que já é uma cópia). */
export function resolverEvento(e: Estado, opcao: number): void {
  const pendente = e.eventoPendente;
  if (!pendente) return;
  const evento = EVENTOS[pendente.id];
  const escolha = evento.opcoes[opcao];
  e.orcamento -= escolha.custo ?? 0;
  for (const ef of escolha.efeitos) {
    if (ef.tipo === 'confianca') {
      const fator = ef.atenuaComunicacao ? EFEITOS.comunicacaoBoato[e.niveis.comunicacao] : 1;
      e.confianca = Math.max(0, Math.min(100, e.confianca + ef.valor * fator));
    } else if (ef.tipo === 'orcamento') {
      e.orcamento = Math.max(0, e.orcamento + ef.valor);
    } else {
      e.mods.push({
        alvo: ef.alvo,
        fator: ef.fator,
        ate: e.dia + ef.dias,
        ufs: ef.regional ? pendente.ufs : null,
      });
    }
  }
  noticiar(e, 'evento', `${textoEvento(evento.titulo, pendente.ufs)}: ${escolha.resultado}`);
  e.eventoPendente = null;
}
