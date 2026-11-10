import './ui/estilo.css';
import { aplicarAcao } from './engine/acoes';
import { criarPartida } from './engine/partida';
import { avancarDia } from './engine/passo';
import { simularSemSUS } from './engine/semSUS';
import type { Acao, CenarioId, Estado } from './engine/tipos';
import { nota, totais } from './engine/visao';
import { apagarPartida, carregarPartida, registrarRanking, salvarPartida } from './storage/local';
import { criarTelaJogo, type TelaJogo } from './ui/jogo';
import { telaFim, telaInicio, telaSobre } from './ui/telas';

const MS_POR_DIA = 1500;
const raiz = document.getElementById('app')!;

let estado: Estado | null = null;
let tela: TelaJogo | null = null;
let velocidade = 0;
let relogio: number | undefined;

function mostrar(el: HTMLElement): void {
  raiz.replaceChildren(el);
  window.scrollTo(0, 0);
}

function definirVelocidade(v: number): void {
  velocidade = v;
  window.clearInterval(relogio);
  relogio = v > 0 ? window.setInterval(passo, MS_POR_DIA / v) : undefined;
  if (estado && tela) tela.atualizar(estado, velocidade);
}

function passo(): void {
  if (!estado || !tela) return;
  const novo = avancarDia(estado);
  if (novo === estado) return; // evento esperando resposta
  estado = novo;
  if (estado.dia % 30 === 0) salvarPartida(estado);
  tela.atualizar(estado, velocidade);
  if (estado.fim) encerrar();
}

function agir(acao: Acao): void {
  if (!estado || !tela) return;
  const r = aplicarAcao(estado, acao);
  if (!r.ok) return;
  estado = r.estado;
  salvarPartida(estado);
  tela.atualizar(estado, velocidade);
}

function abrirJogo(e: Estado): void {
  estado = e;
  tela = criarTelaJogo(e, {
    acao: agir,
    velocidade: definirVelocidade,
    sair: () => {
      if (estado) salvarPartida(estado);
      irParaInicio(null);
    },
  });
  mostrar(tela.el);
  definirVelocidade(0);
}

function novaPartida(cenario: CenarioId): void {
  const semente = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) | 0;
  abrirJogo(criarPartida(cenario, semente));
}

function encerrar(): void {
  if (!estado?.fim) return;
  const final = estado;
  definirVelocidade(0);
  apagarPartida();
  const obitos = totais(final).obitos;
  const semSUS = simularSemSUS(final.cenario, final.semente, final.dia).obitos;
  const vidasSalvas = Math.max(0, semSUS - obitos);
  const n = nota(vidasSalvas, semSUS);
  const ranking = registrarRanking({
    cenario: final.cenario,
    vidasSalvas: Math.round(vidasSalvas),
    obitos: Math.round(obitos),
    nota: n,
    fim: final.fim!,
    dias: final.dia,
    data: new Date().toISOString().slice(0, 10),
  });
  estado = null;
  tela = null;
  mostrar(
    telaFim({
      estado: final,
      obitos,
      obitosSemSUS: semSUS,
      nota: n,
      ranking,
      denovo: () => novaPartida(final.cenario),
      menu: () => irParaInicio(null),
    }),
  );
}

function irParaInicio(aviso: string | null): void {
  definirVelocidade(0);
  estado = null;
  tela = null;
  const salvo = carregarPartida();
  const partidaSalva = salvo.tipo === 'ok' && !salvo.estado.fim ? salvo.estado : null;
  mostrar(
    telaInicio({
      partidaSalva,
      aviso:
        aviso ??
        (salvo.tipo === 'incompativel'
          ? 'O jogo foi atualizado e a partida salva anterior não pôde ser aproveitada.'
          : null),
      novo: novaPartida,
      continuar: () => partidaSalva && abrirJogo(partidaSalva),
      sobre: () => mostrar(telaSobre(() => irParaInicio(null))),
    }),
  );
}

// Pausa quando a aba fica escondida, para o surto não correr sozinho.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && velocidade > 0) definirVelocidade(0);
});
window.addEventListener('pagehide', () => {
  if (estado && !estado.fim) salvarPartida(estado);
});

irParaInicio(null);
