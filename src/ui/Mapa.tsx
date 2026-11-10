import { ALTURA_MAPA, LARGURA_MAPA } from '../data/ibge.gerado';
import { SIGLAS, UFS } from '../data/ufs';
import { SOBRECARGA_COLAPSO } from '../engine/passo';
import type { Estado } from '../engine/tipos';
import { casosVisiveis } from '../engine/visao';

// Do "sem casos" ao "muito grave".
const RAMPA: [number, number, number][] = [
  [52, 88, 102],
  [201, 162, 39],
  [217, 83, 43],
  [142, 27, 27],
];
const MAX_POR_CEM_MIL = 3000;

export function corDeCasos(porCemMil: number): string {
  const t = Math.min(1, Math.log10(1 + porCemMil) / Math.log10(1 + MAX_POR_CEM_MIL));
  const pos = t * (RAMPA.length - 1);
  const i = Math.min(RAMPA.length - 2, Math.floor(pos));
  const f = pos - i;
  const c = RAMPA[i].map((a, k) => Math.round(a + (RAMPA[i + 1][k] - a) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// Estados maiores primeiro, para os pequenos ficarem por cima e clicáveis.
const ORDEM = [...SIGLAS].sort((a, b) => UFS[b].d.length - UFS[a].d.length);

interface Props {
  estado: Estado;
  selecionada: string | null;
  aoEscolher(sigla: string): void;
}

export function Mapa({ estado, selecionada, aoEscolher }: Props) {
  return (
    <svg className="mapa" viewBox={`0 0 ${LARGURA_MAPA} ${ALTURA_MAPA}`} role="group" aria-label="Mapa do Brasil por estado">
      <g>
        {ORDEM.map((s) => {
          const porCemMil = (casosVisiveis(estado, s) / UFS[s].pop) * 1e5;
          const lotado = estado.ufs[s].sobrecarga > 0;
          return (
            <path
              key={s}
              d={UFS[s].d}
              className={s === selecionada ? 'uf selecionada' : 'uf'}
              fill={corDeCasos(porCemMil)}
              tabIndex={0}
              role="button"
              aria-label={UFS[s].nome}
              aria-pressed={s === selecionada}
              data-uf={s}
              onClick={() => aoEscolher(s)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  aoEscolher(s);
                }
              }}
            >
              <title>{`${UFS[s].nome}: ${Math.round(porCemMil)} casos conhecidos por 100 mil${lotado ? ' · hospitais lotados' : ''}`}</title>
            </path>
          );
        })}
      </g>
      <g pointerEvents="none">
        {SIGLAS.map((s) => {
          const sobrecarga = estado.ufs[s].sobrecarga;
          if (sobrecarga <= 0) return null;
          return (
            <circle
              key={s}
              cx={UFS[s].cx}
              cy={UFS[s].cy}
              r={7}
              className={sobrecarga >= SOBRECARGA_COLAPSO ? 'marca-lotado ativa colapso' : 'marca-lotado ativa'}
            />
          );
        })}
      </g>
    </svg>
  );
}
