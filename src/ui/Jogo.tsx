import { useState } from 'react';
import { ACOES_LOCAIS, ACAO_LOCAL_IDS } from '../data/acoesLocais';
import { CENARIOS } from '../data/cenarios';
import { EVENTOS } from '../data/eventos';
import { FATOS } from '../data/fatos';
import { CAMPOS, CUSTO_NIVEL, EFEITOS, FRENTES, FRENTE_IDS } from '../data/frentes';
import { SIGLAS, UFS } from '../data/ufs';
import { impedimento } from '../engine/acoes';
import { textoEvento } from '../engine/eventos';
import { vacinaDisponivel } from '../engine/partida';
import { SOBRECARGA_COLAPSO } from '../engine/passo';
import type { Acao, Estado } from '../engine/tipos';
import { DIAS_MAX } from '../engine/tipos';
import { casosVisiveis, dataDeJogo, totais } from '../engine/visao';
import { curto, num, pct } from './formato';
import { Mapa } from './Mapa';

const VELOCIDADES: [number, string, string][] = [
  [0, 'Pausa', 'Pausar'],
  [1, '1x', 'Velocidade normal'],
  [2, '2x', 'Duas vezes mais rápido'],
  [4, '4x', 'Quatro vezes mais rápido'],
];
const DIAS_POR_FATO = 45;
const UFS_POR_NOME = [...SIGLAS].sort((a, b) => UFS[a].nome.localeCompare(UFS[b].nome, 'pt-BR'));

interface Props {
  estado: Estado;
  velocidade: number;
  definirVelocidade(v: number): void;
  agir(acao: Acao): void;
  sair(): void;
}

export function Jogo({ estado, velocidade, definirVelocidade, agir, sair }: Props) {
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [ajudaAberta, setAjudaAberta] = useState(estado.dia === 0);
  const cen = CENARIOS[estado.cenario];
  const t = totais(estado);
  const vig = estado.niveis.vigilancia;
  const fato = FATOS[(Math.floor(estado.dia / DIAS_POR_FATO) + Math.abs(estado.semente)) % FATOS.length];

  return (
    <div className="jogo">
      <header className="topo">
        <div className="relogio">
          <div>
            <strong>{dataDeJogo(cen.diaInicialAno, estado.dia)}</strong>{' '}
            <span className="fraco">
              dia {estado.dia} de {DIAS_MAX}
            </span>
          </div>
          <div className="vels">
            {VELOCIDADES.map(([v, rotulo, dica]) => (
              <button key={v} type="button" className="vel" title={dica} aria-label={dica} aria-pressed={v === velocidade} onClick={() => definirVelocidade(v)}>
                {rotulo}
              </button>
            ))}
          </div>
        </div>
        <Indicador rotulo="Orçamento" dica="Entra todo mês de jogo. Use para reforçar frentes e agir nos estados." valor={num(estado.orcamento)} />
        <Indicador rotulo="Confiança" dica="Confiança da população no sistema. Se zerar, a partida acaba." valor={`${Math.round(estado.confianca)}%`}>
          <div className={estado.confianca < 30 ? 'barra perigo' : 'barra'}>
            <i style={{ width: `${estado.confianca}%` }} />
          </div>
        </Indicador>
        <Indicador
          rotulo="Rotina"
          dica="Serviços de rotina funcionando: pré-natal, doenças crônicas, saúde bucal. Caem quando os hospitais lotam e as equipes faltam."
          valor={`${Math.round(estado.rotina)}%`}
        />
        <Indicador rotulo="Casos conhecidos" dica="Casos ativos que a Vigilância consegue enxergar." valor={curto(t.ativosVisiveis)} />
        <Indicador rotulo="Óbitos" dica="Mortes acumuladas no surto." valor={curto(t.obitos)} />
        {cen.vacina === 'pesquisa' && (
          <Indicador
            rotulo="Vacina"
            dica="Andamento da pesquisa da vacina."
            valor={estado.vacinaProgresso >= 1 ? 'Pronta' : estado.niveis.ciencia === 0 ? 'Sem pesquisa' : pct(estado.vacinaProgresso)}
          />
        )}
        <button type="button" className="discreto" onClick={sair}>
          Menu
        </button>
      </header>

      <main className="palco">
        <div className="area-mapa">
          <Mapa estado={estado} selecionada={selecionada} aoEscolher={setSelecionada} />
          <div className="legenda">
            <span>Casos conhecidos por 100 mil:</span>
            <span className="rampa" />
            <span>poucos → muitos</span>
            <span className="ponto-legenda" />
            <span>hospitais lotados</span>
          </div>
          {vig < 3 && (
            <p className="nevoa">
              Vigilância nível {vig}: você vê cerca de {pct(EFEITOS.vigilanciaDeteccao[vig])} dos casos, com {EFEITOS.vigilanciaAtraso[vig]} dias de atraso.
            </p>
          )}
        </div>

        <aside className="lateral">
          <section className="painel">
            <h2>Estado</h2>
            <select aria-label="Escolher estado" value={selecionada ?? ''} onChange={(ev) => setSelecionada(ev.target.value || null)}>
              <option value="">Escolha um estado…</option>
              {UFS_POR_NOME.map((s) => (
                <option key={s} value={s}>
                  {UFS[s].nome}
                </option>
              ))}
            </select>
            {selecionada ? <PainelUF estado={estado} sigla={selecionada} agir={agir} /> : <p className="fraco">Clique num estado do mapa para ver a situação e agir nele.</p>}
          </section>

          <section className="painel">
            <h2>Frentes do SUS</h2>
            <p className="fraco pequeno">Agrupadas pelas ações que a Lei nº 8.080, art. 6º, põe no campo de atuação do SUS.</p>
            {CAMPOS.map((campo) => {
              const frentes = FRENTE_IDS.filter((id) => FRENTES[id].campo === campo.id);
              return (
                <div className="campo" key={campo.id}>
                  <h3 className="campo-titulo">{campo.alinea ? `${campo.alinea}) ${campo.nome}` : campo.nome}</h3>
                  {frentes.length === 0 && <p className="pequeno">{campo.noJogo}</p>}
                  {frentes.map((id) => {
                    const f = FRENTES[id];
                    const nivel = estado.niveis[id];
                    const motivo = impedimento(estado, { tipo: 'investir', frente: id });
                    return (
                      <article className="cartao" key={id} data-frente={id}>
                        <header>
                          <h4>{f.nome}</h4>
                          <span className="pips" aria-label={`${f.nome}: nível ${nivel} de 3`}>
                            {'●'.repeat(nivel) + '○'.repeat(3 - nivel)}
                          </span>
                        </header>
                        <p className="fraco pequeno">{f.exemplos}</p>
                        <p className="pequeno">{f.descricao}</p>
                        <p className="prox">{nivel >= 3 ? 'Frente no nível máximo.' : `Próximo nível: ${f.niveis[nivel]}`}</p>
                        <button
                          type="button"
                          className="principal"
                          disabled={!!motivo}
                          title={motivo ?? ''}
                          aria-label={nivel >= 3 ? `${f.nome}: nível máximo` : `Reforçar ${f.nome} por ${CUSTO_NIVEL[nivel]}`}
                          onClick={() => agir({ tipo: 'investir', frente: id })}
                        >
                          {nivel >= 3 ? 'Nível máximo' : `Reforçar · ${CUSTO_NIVEL[nivel]}`}
                        </button>
                      </article>
                    );
                  })}
                </div>
              );
            })}
          </section>
        </aside>
      </main>

      <footer className="rodape">
        <h2>Notícias</h2>
        <ul className="noticias" aria-live="polite">
          {estado.noticias
            .slice(-4)
            .reverse()
            .map((n, i) => (
              <li key={`${n.dia}-${i}-${n.texto}`} className={n.tipo}>
                <span className="fraco">Dia {n.dia} · </span>
                {n.texto}
              </li>
            ))}
        </ul>
        <p className="fato">
          <strong>Na vida real: </strong>
          {fato.texto}{' '}
          <a href={fato.url} target="_blank" rel="noopener noreferrer">
            Fonte: {fato.fonte}
          </a>
        </p>
      </footer>

      {estado.eventoPendente && <ModalEvento estado={estado} agir={agir} />}

      {ajudaAberta && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-ajuda">
          <div className="caixa">
            <h2 id="titulo-ajuda">{cen.nome}: você comanda o SUS</h2>
            <p>{cen.resumo}</p>
            <ul>
              <li>O orçamento entra todo mês. Não dá para comprar tudo: escolher é o jogo.</li>
              <li>Reforce as frentes do SUS e aja nos estados clicando no mapa.</li>
              <li>Sem Vigilância, o mapa mostra só parte dos casos, com atraso.</li>
              <li>Você vence controlando o surto. Perde se os hospitais colapsarem ou a confiança zerar.</li>
            </ul>
            <button
              type="button"
              className="principal grande"
              autoFocus
              onClick={() => {
                setAjudaAberta(false);
                definirVelocidade(1);
              }}
            >
              Começar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Indicador({ rotulo, dica, valor, children }: { rotulo: string; dica: string; valor: string; children?: React.ReactNode }) {
  return (
    <div className="indicador" title={dica}>
      <span className="fraco">{rotulo}</span>
      <strong>{valor}</strong>
      {children}
    </div>
  );
}

function PainelUF({ estado, sigla, agir }: { estado: Estado; sigla: string; agir(acao: Acao): void }) {
  const cen = CENARIOS[estado.cenario];
  const u = estado.ufs[sigla];
  const pop = UFS[sigla].pop;
  const hospitais =
    u.sobrecarga >= SOBRECARGA_COLAPSO
      ? `Em colapso: ${pct(u.sobrecarga)} dos graves sem leito`
      : u.sobrecarga > 0
        ? `Lotados: ${pct(u.sobrecarga)} dos graves sem leito`
        : 'Com leitos disponíveis';
  return (
    <div className="uf-corpo">
      <dl className="dados">
        <dt>População</dt>
        <dd>{num(pop)}</dd>
        <dt>Casos conhecidos</dt>
        <dd>{num(casosVisiveis(estado, sigla))}</dd>
        <dt>Óbitos</dt>
        <dd>{num(u.obitos)}</dd>
        <dt>Hospitais</dt>
        <dd className={u.sobrecarga > 0 ? 'perigo' : undefined}>{hospitais}</dd>
        <dt>Equipes de saúde</dt>
        <dd className={u.equipe < 0.8 ? 'perigo' : undefined}>{pct(u.equipe)} em atividade</dd>
        <dt>Vacinados</dt>
        <dd>{vacinaDisponivel(estado) || u.v > 0 ? pct(u.v / pop) : 'Ainda não há vacina'}</dd>
        <dt title="Dado real da ANS dividido pela população do Censo 2022">Têm plano de saúde</dt>
        <dd>{pct(UFS[sigla].cobertura)}</dd>
      </dl>
      <h3>Ações neste estado</h3>
      <div className="acoes">
        {ACAO_LOCAL_IDS.filter((id) => !ACOES_LOCAIS[id].soVetor || cen.mutirao).map((id) => {
          const a = ACOES_LOCAIS[id];
          const restam = u.ate[id] - estado.dia;
          const motivo = impedimento(estado, { tipo: 'local', uf: sigla, acao: id });
          return (
            <div className="acao" key={id}>
              <strong>{a.nome}</strong>
              <p className="pequeno">{a.descricao}</p>
              <button type="button" className="principal" disabled={!!motivo} onClick={() => agir({ tipo: 'local', uf: sigla, acao: id })}>
                {restam > 0 ? `Em andamento · ${restam} dias` : `Acionar · ${a.custo}`}
              </button>
              {restam <= 0 && motivo && <span className="fraco pequeno">{motivo}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModalEvento({ estado, agir }: { estado: Estado; agir(acao: Acao): void }) {
  const pendente = estado.eventoPendente!;
  const ev = EVENTOS[pendente.id];
  const motivos = ev.opcoes.map((_, i) => impedimento(estado, { tipo: 'evento', opcao: i }));
  const primeiraLivre = motivos.findIndex((m) => !m);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-evento">
      <div className="caixa">
        <p className="etiqueta">Decisão</p>
        <h2 id="titulo-evento">{textoEvento(ev.titulo, pendente.ufs)}</h2>
        <p>{textoEvento(ev.texto, pendente.ufs)}</p>
        <p className="fraco pequeno">Orçamento disponível: {num(estado.orcamento)}</p>
        <div className="opcoes">
          {ev.opcoes.map((o, i) => (
            <button
              key={o.rotulo}
              type="button"
              className="principal"
              disabled={!!motivos[i]}
              title={motivos[i] ?? ''}
              autoFocus={i === primeiraLivre}
              onClick={() => agir({ tipo: 'evento', opcao: i })}
            >
              {o.custo ? `${o.rotulo} · ${o.custo}` : o.rotulo}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
