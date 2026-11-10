import { CENARIOS, CENARIO_IDS } from '../data/cenarios';
import { FATOS } from '../data/fatos';
import { FRENTES, FRENTE_IDS, SEM_SUS } from '../data/frentes';
import { CONSULTADO_EM } from '../data/ibge.gerado';
import type { CenarioId, Estado, Fim } from '../engine/tipos';
import type { Nota } from '../engine/visao';
import { lerRanking, type EntradaRanking } from '../storage/local';
import { h, num, pct } from './dom';

const botao = (rotulo: string, classe: string, aoClicar: () => void): HTMLButtonElement => {
  const b = h('button', { type: 'button', class: classe }, rotulo);
  b.addEventListener('click', aoClicar);
  return b;
};

export interface OpcoesInicio {
  partidaSalva: Estado | null;
  aviso: string | null;
  novo(cenario: CenarioId): void;
  continuar(): void;
  sobre(): void;
}

export function telaInicio(o: OpcoesInicio): HTMLElement {
  const cartoes = CENARIO_IDS.map((id) => {
    const c = CENARIOS[id];
    const melhor = lerRanking(id)[0];
    return h(
      'article',
      { class: 'cartao cenario' },
      h('p', { class: 'etiqueta' }, c.dificuldade),
      h('h3', null, c.nome),
      h('p', null, c.resumo),
      melhor ? h('p', { class: 'fraco pequeno' }, `Seu melhor: ${num(melhor.vidasSalvas)} vidas salvas (nota ${melhor.nota})`) : null,
      botao('Jogar', 'principal', () => o.novo(id)),
    );
  });
  const salva = o.partidaSalva;
  return h(
    'div',
    { class: 'tela' },
    h(
      'header',
      { class: 'capa' },
      h('p', { class: 'etiqueta' }, 'Jogo de estratégia'),
      h('h1', null, 'Linha de Frente: SUS'),
      h('p', { class: 'lema' }, 'Um surto começou. Você comanda a resposta do sistema público de saúde do Brasil.'),
    ),
    o.aviso ? h('p', { class: 'aviso' }, o.aviso) : null,
    salva
      ? h(
          'div',
          { class: 'continuar' },
          h('span', null, `Partida em andamento: ${CENARIOS[salva.cenario].nome}, dia ${salva.dia}.`),
          botao('Continuar', 'principal', o.continuar),
        )
      : null,
    h('div', { class: 'grade' }, ...cartoes),
    h('p', { class: 'centro' }, botao('Sobre o jogo e as fontes', 'discreto', o.sobre)),
  );
}

const TITULO_FIM: Record<Exclude<Fim, null>, [string, string]> = {
  vitoria: ['Surto controlado', 'O sistema aguentou. O surto está sob controle.'],
  'derrota-confianca': ['A população deixou de confiar', 'Sem confiança, ninguém se vacina nem segue orientação. A resposta desmoronou.'],
  'derrota-colapso': ['Os hospitais colapsaram', 'Mais da metade do país ficou um mês sem leito para os casos graves.'],
  'derrota-tempo': ['O surto não foi controlado', 'Depois de um ano e meio, a doença continua circulando.'],
};

export interface OpcoesFim {
  estado: Estado;
  obitos: number;
  obitosSemSUS: number;
  nota: Nota;
  ranking: EntradaRanking[];
  denovo(): void;
  menu(): void;
}

export function telaFim(o: OpcoesFim): HTMLElement {
  const fim = o.estado.fim ?? 'derrota-tempo';
  const [titulo, subtitulo] = TITULO_FIM[fim];
  const vidas = Math.max(0, o.obitosSemSUS - o.obitos);
  const maisUsadas = [...FRENTE_IDS]
    .sort((a, b) => o.estado.gasto[b] - o.estado.gasto[a])
    .filter((f) => o.estado.gasto[f] > 0)
    .slice(0, 2);
  const fatos = (maisUsadas.length ? maisUsadas : FRENTE_IDS.slice(0, 2))
    .map((f) => FATOS.find((x) => x.frente === f))
    .filter((x) => x !== undefined);

  return h(
    'div',
    { class: `tela fim ${fim === 'vitoria' ? 'venceu' : 'perdeu'}` },
    h('p', { class: 'etiqueta' }, `${CENARIOS[o.estado.cenario].nome} · dia ${o.estado.dia}`),
    h('h1', null, titulo),
    h('p', { class: 'lema' }, subtitulo),
    h(
      'div',
      { class: 'placar' },
      h('div', { class: 'destaque' }, h('strong', null, num(vidas)), h('span', null, 'vidas salvas pelo SUS nesta simulação')),
      h('div', null, h('strong', null, num(o.obitos)), h('span', null, 'óbitos na sua partida')),
      h('div', null, h('strong', null, num(o.obitosSemSUS)), h('span', null, 'óbitos no mesmo surto, sem SUS')),
      h('div', null, h('strong', null, o.nota), h('span', null, 'nota')),
    ),
    h(
      'p',
      { class: 'fraco pequeno' },
      `A comparação roda o mesmo surto, pelo mesmo número de dias, num país sem sistema público: ${pct(SEM_SUS.leitos)} dos leitos, sem vacinação e sem prevenção. É uma simulação didática, não uma previsão.`,
    ),
    maisUsadas.length
      ? h('p', null, `Onde você mais investiu: ${maisUsadas.map((f) => FRENTES[f].nome).join(' e ')}.`)
      : h('p', null, 'Você não reforçou nenhuma frente. Mesmo assim, o SUS básico já fez diferença.'),
    h(
      'section',
      { class: 'painel' },
      h('h2', null, 'Na vida real'),
      ...fatos.map((f) =>
        h('p', null, f.texto, ' ', h('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, `Fonte: ${f.fonte}`)),
      ),
    ),
    o.ranking.length
      ? h(
          'section',
          { class: 'painel' },
          h('h2', null, 'Suas melhores partidas neste cenário'),
          h(
            'ol',
            { class: 'ranking' },
            ...o.ranking.map((r) => h('li', null, `${num(r.vidasSalvas)} vidas salvas · nota ${r.nota} · ${r.dias} dias · ${r.data}`)),
          ),
        )
      : null,
    h('p', { class: 'centro' }, botao('Jogar de novo', 'principal grande', o.denovo), ' ', botao('Menu', 'discreto', o.menu)),
  );
}

export function telaSobre(voltar: () => void): HTMLElement {
  return h(
    'div',
    { class: 'tela sobre' },
    h('h1', null, 'Sobre o jogo'),
    h(
      'p',
      null,
      'Linha de Frente: SUS é um jogo independente. Não tem vínculo com o Ministério da Saúde nem com nenhum órgão público, e não usa marcas oficiais.',
    ),
    h('h2', null, 'É uma simplificação'),
    h(
      'p',
      null,
      'As doenças, os custos e os efeitos de cada frente foram ajustados para a partida ser boa de jogar. O jogo não é um modelo epidemiológico e os números de casos e óbitos não são previsões nem dados reais.',
    ),
    h(
      'p',
      null,
      `A comparação "sem SUS" assume um país com ${pct(SEM_SUS.leitos)} dos leitos, sem vacinação pública e sem prevenção. É uma hipótese do jogo.`,
    ),
    h('h2', null, 'O que é real'),
    h(
      'p',
      null,
      `A população de cada estado vem do Censo 2022 do IBGE e o mapa vem da malha geográfica do IBGE (consulta em ${CONSULTADO_EM}). Os textos "Na vida real" foram conferidos nas páginas oficiais abaixo.`,
    ),
    h(
      'ul',
      { class: 'fontes' },
      ...FATOS.map((f) =>
        h(
          'li',
          null,
          f.texto,
          ' ',
          h('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.fonte),
          h('span', { class: 'fraco' }, ` (consulta em ${f.consultadoEm})`),
        ),
      ),
    ),
    h('h2', null, 'Privacidade'),
    h('p', null, 'O jogo não coleta nada. A partida salva e o ranking ficam só neste navegador.'),
    h('p', { class: 'centro' }, botao('Voltar', 'principal', voltar)),
  );
}
