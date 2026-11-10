import { ACOES_LOCAIS, ACAO_LOCAL_IDS } from '../data/acoesLocais';
import { CENARIOS } from '../data/cenarios';
import { EVENTOS } from '../data/eventos';
import { FATOS } from '../data/fatos';
import { CUSTO_NIVEL, EFEITOS, FRENTES, FRENTE_IDS } from '../data/frentes';
import { SIGLAS, UFS } from '../data/ufs';
import { impedimento } from '../engine/acoes';
import { textoEvento } from '../engine/eventos';
import { vacinaDisponivel } from '../engine/partida';
import { SOBRECARGA_COLAPSO } from '../engine/passo';
import type { Acao, AcaoLocalId, Estado, FrenteId } from '../engine/tipos';
import { DIAS_MAX } from '../engine/tipos';
import { casosVisiveis, dataDeJogo, totais } from '../engine/visao';
import { curto, h, num, pct, texto } from './dom';
import { criarMapa } from './mapa';

export interface Controles {
  acao(a: Acao): void;
  velocidade(v: number): void;
  sair(): void;
}

export interface TelaJogo {
  el: HTMLElement;
  atualizar(estado: Estado, velocidade: number): void;
}

const VELOCIDADES: [number, string, string][] = [
  [0, 'Pausa', 'Pausar'],
  [1, '1x', 'Velocidade normal'],
  [2, '2x', 'Duas vezes mais rápido'],
  [4, '4x', 'Quatro vezes mais rápido'],
];
const DIAS_POR_FATO = 45;

export function criarTelaJogo(inicial: Estado, c: Controles): TelaJogo {
  const cen = CENARIOS[inicial.cenario];
  let estado = inicial;
  let selecionada: string | null = null;
  let eventoMostrado: string | null = null;

  // ---------- barra superior ----------
  const elData = h('strong');
  const elPrazo = h('span', { class: 'fraco' });
  const botoesVel = VELOCIDADES.map(([v, rotulo, dica]) => {
    const b = h('button', { type: 'button', class: 'vel', title: dica, 'aria-label': dica }, rotulo);
    b.addEventListener('click', () => c.velocidade(v));
    return b;
  });
  const indicador = (rotulo: string, dica: string) => {
    const valor = h('strong');
    const rot = h('span', { class: 'fraco' }, rotulo);
    return { el: h('div', { class: 'indicador', title: dica }, rot, valor), valor, rot };
  };
  const iOrc = indicador('Orçamento', 'Entra todo mês de jogo. Use para reforçar frentes e agir nos estados.');
  const iConf = indicador('Confiança', 'Confiança da população no sistema. Se zerar, a partida acaba.');
  const iCasos = indicador('Casos conhecidos', 'Casos ativos que a Vigilância consegue enxergar.');
  const iObitos = indicador('Óbitos', 'Mortes acumuladas no surto.');
  const iVacina = indicador('Vacina', 'Andamento da pesquisa da vacina.');
  const barraConf = h('div', { class: 'barra' }, h('i'));
  iConf.el.append(barraConf);
  const btnSair = h('button', { type: 'button', class: 'discreto' }, 'Menu');
  btnSair.addEventListener('click', () => c.sair());
  const barra = h(
    'header',
    { class: 'topo' },
    h('div', { class: 'relogio' }, h('div', null, elData, ' ', elPrazo), h('div', { class: 'vels' }, ...botoesVel)),
    iOrc.el,
    iConf.el,
    iCasos.el,
    iObitos.el,
    iVacina.el,
    btnSair,
  );

  // ---------- mapa ----------
  const mapa = criarMapa((s) => selecionar(s));
  const legenda = h(
    'div',
    { class: 'legenda' },
    h('span', null, 'Casos conhecidos por 100 mil:'),
    h('span', { class: 'rampa' }),
    h('span', null, 'poucos → muitos'),
    h('span', { class: 'ponto-legenda' }),
    h('span', null, 'hospitais lotados'),
  );
  const avisoNevoa = h('p', { class: 'nevoa' });

  // ---------- painel de frentes ----------
  const cartoes = {} as Record<FrenteId, { nivel: HTMLElement; prox: HTMLElement; botao: HTMLButtonElement }>;
  const painelFrentes = h('section', { class: 'painel' }, h('h2', null, 'Frentes do SUS'));
  for (const id of FRENTE_IDS) {
    const f = FRENTES[id];
    const nivel = h('span', { class: 'pips' });
    const prox = h('p', { class: 'prox' });
    const botao = h('button', { type: 'button', class: 'principal' });
    botao.addEventListener('click', () => c.acao({ tipo: 'investir', frente: id }));
    cartoes[id] = { nivel, prox, botao };
    painelFrentes.append(
      h(
        'article',
        { class: 'cartao' },
        h('header', null, h('h3', null, f.nome), nivel),
        h('p', { class: 'fraco pequeno' }, f.exemplos),
        h('p', { class: 'pequeno' }, f.descricao),
        prox,
        botao,
      ),
    );
  }

  // ---------- painel do estado ----------
  const seletor = h('select', { 'aria-label': 'Escolher estado' }, h('option', { value: '' }, 'Escolha um estado…'));
  for (const s of [...SIGLAS].sort((a, b) => UFS[a].nome.localeCompare(UFS[b].nome, 'pt-BR'))) {
    seletor.append(h('option', { value: s }, UFS[s].nome));
  }
  seletor.addEventListener('change', () => selecionar(seletor.value || null));
  const ufDados = h('dl', { class: 'dados' });
  const linha = (rotulo: string) => {
    const dd = h('dd');
    ufDados.append(h('dt', null, rotulo), dd);
    return dd;
  };
  const dPop = linha('População');
  const dCasos = linha('Casos conhecidos');
  const dObitos = linha('Óbitos');
  const dHosp = linha('Hospitais');
  const dImunes = linha('Vacinados');
  const botoesLocais = {} as Record<AcaoLocalId, { botao: HTMLButtonElement; nota: HTMLElement; el: HTMLElement }>;
  const ufAcoes = h('div', { class: 'acoes' });
  for (const id of ACAO_LOCAL_IDS) {
    const a = ACOES_LOCAIS[id];
    const botao = h('button', { type: 'button', class: 'principal' });
    const nota = h('span', { class: 'fraco pequeno' });
    botao.addEventListener('click', () => selecionada && c.acao({ tipo: 'local', uf: selecionada, acao: id }));
    const el = h('div', { class: 'acao' }, h('strong', null, a.nome), h('p', { class: 'pequeno' }, a.descricao), botao, nota);
    botoesLocais[id] = { botao, nota, el };
    ufAcoes.append(el);
  }
  const ufCorpo = h('div', { class: 'uf-corpo', hidden: '' }, ufDados, h('h3', null, 'Ações neste estado'), ufAcoes);
  const ufVazio = h('p', { class: 'fraco' }, 'Clique num estado do mapa para ver a situação e agir nele.');
  const painelUF = h('section', { class: 'painel' }, h('h2', null, 'Estado'), seletor, ufVazio, ufCorpo);

  // ---------- notícias ----------
  const listaNoticias = h('ul', { class: 'noticias', 'aria-live': 'polite' });
  const elFato = h('p', { class: 'fato' });
  const rodape = h('footer', { class: 'rodape' }, h('h2', null, 'Notícias'), listaNoticias, elFato);
  let noticiasMostradas = '';
  let fatoMostrado = -1;

  // ---------- evento ----------
  const modal = h('div', { class: 'modal', hidden: '', role: 'dialog', 'aria-modal': 'true' });

  // ---------- ajuda inicial ----------
  const ajuda = h(
    'div',
    { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
    h(
      'div',
      { class: 'caixa' },
      h('h2', null, `${cen.nome}: você comanda o SUS`),
      h('p', null, cen.resumo),
      h(
        'ul',
        null,
        h('li', null, 'O orçamento entra todo mês. Não dá para comprar tudo: escolher é o jogo.'),
        h('li', null, 'Reforce as frentes do SUS (à direita) e aja nos estados clicando no mapa.'),
        h('li', null, 'Sem Vigilância, o mapa mostra só parte dos casos, com atraso.'),
        h('li', null, 'Você vence controlando o surto. Perde se os hospitais colapsarem ou a confiança zerar.'),
      ),
      (() => {
        const b = h('button', { type: 'button', class: 'principal grande' }, 'Começar');
        b.addEventListener('click', () => {
          ajuda.remove();
          c.velocidade(1);
        });
        return b;
      })(),
    ),
  );

  const el = h(
    'div',
    { class: 'jogo' },
    barra,
    h('main', { class: 'palco' }, h('div', { class: 'area-mapa' }, mapa.el, legenda, avisoNevoa), h('aside', { class: 'lateral' }, painelUF, painelFrentes)),
    rodape,
    modal,
  );
  if (inicial.dia === 0) el.append(ajuda);

  function selecionar(s: string | null): void {
    selecionada = s;
    seletor.value = s ?? '';
    ufVazio.hidden = !!s;
    ufCorpo.hidden = !s;
    desenhar();
  }

  function desenharEvento(): void {
    const p = estado.eventoPendente;
    const chave = p ? `${p.id}@${estado.ultimoEvento}` : null;
    if (chave === eventoMostrado) return;
    eventoMostrado = chave;
    modal.replaceChildren();
    modal.hidden = !p;
    if (!p) return;
    const ev = EVENTOS[p.id];
    const opcoes = ev.opcoes.map((o, i) => {
      const custo = o.custo ?? 0;
      const b = h('button', { type: 'button', class: 'principal' }, custo ? `${o.rotulo} · ${custo}` : o.rotulo);
      const motivo = impedimento(estado, { tipo: 'evento', opcao: i });
      if (motivo) {
        b.disabled = true;
        b.title = motivo;
      }
      b.addEventListener('click', () => c.acao({ tipo: 'evento', opcao: i }));
      return b;
    });
    modal.append(
      h(
        'div',
        { class: 'caixa' },
        h('p', { class: 'etiqueta' }, 'Decisão'),
        h('h2', null, textoEvento(ev.titulo, p.ufs)),
        h('p', null, textoEvento(ev.texto, p.ufs)),
        h('p', { class: 'fraco pequeno' }, `Orçamento disponível: ${num(estado.orcamento)}`),
        h('div', { class: 'opcoes' }, ...opcoes),
      ),
    );
    opcoes.find((b) => !b.disabled)?.focus();
  }

  function desenhar(): void {
    const t = totais(estado);
    const vig = estado.niveis.vigilancia;

    texto(elData, dataDeJogo(cen.diaInicialAno, estado.dia));
    texto(elPrazo, `dia ${estado.dia} de ${DIAS_MAX}`);
    texto(iOrc.valor, num(estado.orcamento));
    texto(iConf.valor, `${Math.round(estado.confianca)}%`);
    (barraConf.firstElementChild as HTMLElement).style.width = `${estado.confianca}%`;
    barraConf.classList.toggle('perigo', estado.confianca < 30);
    texto(iCasos.valor, curto(t.ativosVisiveis));
    texto(iObitos.valor, curto(t.obitos));
    iVacina.el.hidden = cen.vacina !== 'pesquisa';
    texto(
      iVacina.valor,
      estado.vacinaProgresso >= 1 ? 'Pronta' : estado.niveis.ciencia === 0 ? 'Sem pesquisa' : pct(estado.vacinaProgresso),
    );

    avisoNevoa.hidden = vig === 3;
    texto(
      avisoNevoa,
      `Vigilância nível ${vig}: você vê cerca de ${pct(EFEITOS.vigilanciaDeteccao[vig])} dos casos, com ${EFEITOS.vigilanciaAtraso[vig]} dias de atraso.`,
    );

    mapa.atualizar(estado, selecionada);

    for (const id of FRENTE_IDS) {
      const nivel = estado.niveis[id];
      const cartao = cartoes[id];
      texto(cartao.nivel, '●'.repeat(nivel) + '○'.repeat(3 - nivel));
      cartao.nivel.setAttribute('aria-label', `Nível ${nivel} de 3`);
      const motivo = impedimento(estado, { tipo: 'investir', frente: id });
      cartao.botao.disabled = !!motivo;
      cartao.botao.title = motivo ?? '';
      if (nivel >= 3) {
        texto(cartao.prox, 'Frente no nível máximo.');
        texto(cartao.botao, 'Nível máximo');
      } else {
        texto(cartao.prox, `Próximo nível: ${FRENTES[id].niveis[nivel]}`);
        texto(cartao.botao, `Reforçar · ${CUSTO_NIVEL[nivel]}`);
      }
    }

    if (selecionada) {
      const u = estado.ufs[selecionada];
      const pop = UFS[selecionada].pop;
      texto(dPop, num(pop));
      texto(dCasos, num(casosVisiveis(estado, selecionada)));
      texto(dObitos, num(u.obitos));
      texto(
        dHosp,
        u.sobrecarga >= SOBRECARGA_COLAPSO
          ? `Em colapso: ${pct(u.sobrecarga)} dos graves sem leito`
          : u.sobrecarga > 0
            ? `Lotados: ${pct(u.sobrecarga)} dos graves sem leito`
            : 'Com leitos disponíveis',
      );
      dHosp.classList.toggle('perigo', u.sobrecarga > 0);
      texto(dImunes, vacinaDisponivel(estado) || u.v > 0 ? pct(u.v / pop) : 'Ainda não há vacina');
      for (const id of ACAO_LOCAL_IDS) {
        const a = ACOES_LOCAIS[id];
        const b = botoesLocais[id];
        b.el.hidden = !!a.soVetor && !cen.mutirao;
        const restam = u.ate[id] - estado.dia;
        const motivo = impedimento(estado, { tipo: 'local', uf: selecionada, acao: id });
        b.botao.disabled = !!motivo;
        texto(b.botao, restam > 0 ? `Em andamento · ${restam} dias` : `Acionar · ${a.custo}`);
        texto(b.nota, restam > 0 ? '' : (motivo ?? ''));
      }
    }

    const ultimas = estado.noticias.slice(-4).reverse();
    const chave = ultimas.map((n) => `${n.dia}${n.texto}`).join('|');
    if (chave !== noticiasMostradas) {
      noticiasMostradas = chave;
      listaNoticias.replaceChildren(
        ...ultimas.map((n) =>
          h('li', { class: n.tipo }, h('span', { class: 'fraco' }, `Dia ${n.dia} · `), n.texto),
        ),
      );
    }

    const indiceFato = Math.floor(estado.dia / DIAS_POR_FATO) % FATOS.length;
    if (indiceFato !== fatoMostrado) {
      fatoMostrado = indiceFato;
      const fato = FATOS[(indiceFato + Math.abs(estado.semente)) % FATOS.length];
      elFato.replaceChildren(
        h('strong', null, 'Na vida real: '),
        fato.texto,
        ' ',
        h('a', { href: fato.url, target: '_blank', rel: 'noopener noreferrer' }, `Fonte: ${fato.fonte}`),
      );
    }

    desenharEvento();
  }

  return {
    el,
    atualizar(novo, velocidade) {
      estado = novo;
      botoesVel.forEach((b, i) => b.setAttribute('aria-pressed', String(VELOCIDADES[i][0] === velocidade)));
      desenhar();
    },
  };
}
