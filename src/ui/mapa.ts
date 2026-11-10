import { ALTURA_MAPA, LARGURA_MAPA } from '../data/ibge.gerado';
import { SIGLAS, UFS } from '../data/ufs';
import { SOBRECARGA_COLAPSO } from '../engine/passo';
import type { Estado } from '../engine/tipos';
import { casosVisiveis } from '../engine/visao';
import { svg } from './dom';

// Do "sem casos" ao "muito grave".
const RAMPA: [number, number, number][] = [
  [52, 88, 102],
  [201, 162, 39],
  [217, 83, 43],
  [142, 27, 27],
];
const MAX_POR_CEM_MIL = 3000;

function cor(porCemMil: number): string {
  const t = Math.min(1, Math.log10(1 + porCemMil) / Math.log10(1 + MAX_POR_CEM_MIL));
  const pos = t * (RAMPA.length - 1);
  const i = Math.min(RAMPA.length - 2, Math.floor(pos));
  const f = pos - i;
  const c = RAMPA[i].map((a, k) => Math.round(a + (RAMPA[i + 1][k] - a) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export interface Mapa {
  el: SVGElement;
  atualizar(estado: Estado, selecionada: string | null): void;
}

export function criarMapa(aoEscolher: (sigla: string) => void): Mapa {
  const el = svg('svg', {
    viewBox: `0 0 ${LARGURA_MAPA} ${ALTURA_MAPA}`,
    class: 'mapa',
    role: 'group',
    'aria-label': 'Mapa do Brasil por estado',
  });
  const formas: Record<string, SVGElement> = {};
  const marcas: Record<string, SVGElement> = {};
  const camadaFormas = svg('g');
  const camadaMarcas = svg('g', { 'pointer-events': 'none' });

  // Estados maiores primeiro, para os pequenos ficarem por cima e clicáveis.
  const ordem = [...SIGLAS].sort((a, b) => UFS[b].d.length - UFS[a].d.length);
  for (const s of ordem) {
    const forma = svg('path', { d: UFS[s].d, class: 'uf', tabindex: 0, role: 'button', 'aria-label': UFS[s].nome });
    const titulo = svg('title');
    forma.append(titulo);
    forma.addEventListener('click', () => aoEscolher(s));
    forma.addEventListener('keydown', (ev) => {
      const tecla = (ev as KeyboardEvent).key;
      if (tecla === 'Enter' || tecla === ' ') {
        ev.preventDefault();
        aoEscolher(s);
      }
    });
    formas[s] = forma;
    camadaFormas.append(forma);

    const marca = svg('circle', { cx: UFS[s].cx, cy: UFS[s].cy, r: 7, class: 'marca-lotado' });
    marcas[s] = marca;
    camadaMarcas.append(marca);
  }
  el.append(camadaFormas, camadaMarcas);

  return {
    el,
    atualizar(estado, selecionada) {
      for (const s of SIGLAS) {
        const visiveis = casosVisiveis(estado, s);
        const porCemMil = (visiveis / UFS[s].pop) * 1e5;
        const forma = formas[s];
        forma.setAttribute('fill', cor(porCemMil));
        forma.classList.toggle('selecionada', s === selecionada);
        const sobrecarga = estado.ufs[s].sobrecarga;
        marcas[s].classList.toggle('ativa', sobrecarga > 0);
        marcas[s].classList.toggle('colapso', sobrecarga >= SOBRECARGA_COLAPSO);
        const t = forma.firstElementChild!;
        const rotulo = `${UFS[s].nome}: ${Math.round(porCemMil)} casos conhecidos por 100 mil${sobrecarga > 0 ? ' · hospitais lotados' : ''}`;
        if (t.textContent !== rotulo) t.textContent = rotulo;
      }
    },
  };
}
