import { CENARIOS, CENARIO_IDS } from '../data/cenarios';
import { FATOS, type Fato } from '../data/fatos';
import { FRENTES, FRENTE_IDS, SEM_SUS } from '../data/frentes';
import { CONSULTADO_EM } from '../data/ibge.gerado';
import type { CenarioId, Estado, Fim } from '../engine/tipos';
import type { Nota } from '../engine/visao';
import { lerRanking, type EntradaRanking } from '../storage/local';
import { num, pct } from './formato';

function Fonte({ fato }: { fato: Fato }) {
  return (
    <a href={fato.url} target="_blank" rel="noopener noreferrer">
      Fonte: {fato.fonte}
    </a>
  );
}

interface PropsInicio {
  partidaSalva: Estado | null;
  aviso: string | null;
  novo(cenario: CenarioId): void;
  continuar(): void;
  sobre(): void;
}

export function Inicio({ partidaSalva, aviso, novo, continuar, sobre }: PropsInicio) {
  return (
    <div className="tela">
      <header className="capa">
        <p className="etiqueta">Jogo de estratégia</p>
        <h1>Linha de Frente: SUS</h1>
        <p className="lema">Um surto começou. Você comanda a resposta do sistema público de saúde do Brasil.</p>
      </header>
      {aviso && <p className="aviso">{aviso}</p>}
      {partidaSalva && (
        <div className="continuar">
          <span>
            Partida em andamento: {CENARIOS[partidaSalva.cenario].nome}, dia {partidaSalva.dia}.
          </span>
          <button type="button" className="principal" onClick={continuar}>
            Continuar
          </button>
        </div>
      )}
      <div className="grade">
        {CENARIO_IDS.map((id) => {
          const c = CENARIOS[id];
          const melhor = lerRanking(id)[0];
          return (
            <article className="cartao cenario" key={id}>
              <p className="etiqueta">{c.dificuldade}</p>
              <h3>{c.nome}</h3>
              <p>{c.resumo}</p>
              {melhor && (
                <p className="fraco pequeno">
                  Seu melhor: {num(melhor.vidasSalvas)} vidas salvas (nota {melhor.nota})
                </p>
              )}
              <button type="button" className="principal" aria-label={`Jogar ${c.nome}`} onClick={() => novo(id)}>
                Jogar
              </button>
            </article>
          );
        })}
      </div>
      <p className="centro">
        <button type="button" className="discreto" onClick={sobre}>
          Sobre o jogo e as fontes
        </button>
      </p>
    </div>
  );
}

const TITULO_FIM: Record<Exclude<Fim, null>, [string, string]> = {
  vitoria: ['Surto controlado', 'O sistema aguentou. O surto está sob controle.'],
  'derrota-confianca': ['A população deixou de confiar', 'Sem confiança, ninguém se vacina nem segue orientação. A resposta desmoronou.'],
  'derrota-colapso': ['Os hospitais colapsaram', 'Mais da metade do país ficou um mês sem leito para os casos graves.'],
  'derrota-tempo': ['O surto não foi controlado', 'Depois de um ano e meio, a doença continua circulando.'],
};

export interface Resultado {
  obitos: number;
  obitosSemSUS: number;
  nota: Nota;
}

interface PropsFim {
  estado: Estado;
  resultado: Resultado;
  ranking: EntradaRanking[];
  denovo(): void;
  menu(): void;
}

export function FimDePartida({ estado, resultado, ranking, denovo, menu }: PropsFim) {
  const fim = estado.fim ?? 'derrota-tempo';
  const [titulo, subtitulo] = TITULO_FIM[fim];
  const vidas = Math.max(0, resultado.obitosSemSUS - resultado.obitos);
  const maisUsadas = [...FRENTE_IDS]
    .sort((a, b) => estado.gasto[b] - estado.gasto[a])
    .filter((f) => estado.gasto[f] > 0)
    .slice(0, 2);
  const fatos = (maisUsadas.length ? maisUsadas : FRENTE_IDS.slice(0, 2))
    .map((f) => FATOS.find((x) => x.frente === f))
    .filter((x): x is Fato => x !== undefined);

  return (
    <div className={`tela fim ${fim === 'vitoria' ? 'venceu' : 'perdeu'}`}>
      <p className="etiqueta">
        {CENARIOS[estado.cenario].nome} · dia {estado.dia}
      </p>
      <h1>{titulo}</h1>
      <p className="lema">{subtitulo}</p>
      <div className="placar">
        <div className="destaque">
          <strong data-testid="vidas-salvas">{num(vidas)}</strong>
          <span>vidas salvas pelo SUS nesta simulação</span>
        </div>
        <div>
          <strong>{num(resultado.obitos)}</strong>
          <span>óbitos na sua partida</span>
        </div>
        <div>
          <strong>{num(resultado.obitosSemSUS)}</strong>
          <span>óbitos no mesmo surto, sem SUS</span>
        </div>
        <div>
          <strong>{resultado.nota}</strong>
          <span>nota</span>
        </div>
      </div>
      <p className="fraco pequeno">
        A comparação roda o mesmo surto, pelo mesmo número de dias, num país sem sistema público: {pct(SEM_SUS.leitos)} dos leitos, sem vacinação e sem prevenção. É
        uma simulação didática, não uma previsão.
      </p>
      <p>
        {maisUsadas.length
          ? `Onde você mais investiu: ${maisUsadas.map((f) => FRENTES[f].nome).join(' e ')}.`
          : 'Você não reforçou nenhuma frente. Mesmo assim, o SUS básico já fez diferença.'}
      </p>
      <section className="painel">
        <h2>Na vida real</h2>
        {fatos.map((f) => (
          <p key={f.texto}>
            {f.texto} <Fonte fato={f} />
          </p>
        ))}
      </section>
      {ranking.length > 0 && (
        <section className="painel">
          <h2>Suas melhores partidas neste cenário</h2>
          <ol className="ranking">
            {ranking.map((r, i) => (
              <li key={i}>
                {num(r.vidasSalvas)} vidas salvas · nota {r.nota} · {r.dias} dias · {r.data}
              </li>
            ))}
          </ol>
        </section>
      )}
      <p className="centro">
        <button type="button" className="principal grande" onClick={denovo}>
          Jogar de novo
        </button>{' '}
        <button type="button" className="discreto" onClick={menu}>
          Menu
        </button>
      </p>
    </div>
  );
}

export function Sobre({ voltar }: { voltar(): void }) {
  return (
    <div className="tela sobre">
      <h1>Sobre o jogo</h1>
      <p>
        Linha de Frente: SUS é um jogo independente e de código aberto. Não tem vínculo com o Ministério da Saúde nem com nenhum órgão público, e não usa marcas
        oficiais.
      </p>
      <h2>É uma simplificação</h2>
      <p>
        As doenças, os custos e os efeitos de cada frente foram ajustados para a partida ser boa de jogar. O jogo não é um modelo epidemiológico e os números de casos
        e óbitos não são previsões nem dados reais.
      </p>
      <p>A comparação "sem SUS" assume um país com {pct(SEM_SUS.leitos)} dos leitos, sem vacinação pública e sem prevenção. É uma hipótese do jogo.</p>
      <h2>O que é real</h2>
      <p>
        A população de cada estado vem do Censo 2022 do IBGE e o mapa vem da malha geográfica do IBGE (consulta em {CONSULTADO_EM}). Os textos "Na vida real" foram
        conferidos nas páginas oficiais abaixo.
      </p>
      <ul className="fontes">
        {FATOS.map((f) => (
          <li key={f.texto}>
            {f.texto} <Fonte fato={f} />
            <span className="fraco"> (consulta em {f.consultadoEm})</span>
          </li>
        ))}
      </ul>
      <h2>Privacidade</h2>
      <p>O jogo não coleta nada. A partida salva e o ranking ficam só neste navegador.</p>
      <p className="centro">
        <button type="button" className="principal" onClick={voltar}>
          Voltar
        </button>
      </p>
    </div>
  );
}
