import { describe, it } from 'vitest';
import { CENARIO_IDS } from '../src/data/cenarios';
import { FRENTE_IDS } from '../src/data/frentes';
import { POP_BRASIL } from '../src/data/ufs';
import { simularSemSUS } from '../src/engine/semSUS';
import type { Estado } from '../src/engine/tipos';
import { totais } from '../src/engine/visao';
import { ESTRATEGIA, jogar, tresVezes } from './jogador';

const linha = (e: Estado): void => {
  if (e.dia % 30 !== 0 && !e.fim) return;
  const t = totais(e);
  console.log(
    `  d${e.dia} ativos/100mil=${((t.ativos / POP_BRASIL) * 1e5).toFixed(1)} obitos=${Math.round(t.obitos)} conf=${e.confianca.toFixed(0)} ufsLotadas=${t.ufsSobrecarga} vac=${e.vacinaProgresso.toFixed(2)} ${e.fim ?? ''}`,
  );
};

// Relatório para ajustar src/data/cenarios.ts. Não roda no `npm test`.
// Rodar com: npx vitest run --mode calibrar tests/calibragem.test.ts
describe.skipIf(import.meta.env.MODE !== 'calibrar')('calibragem', () => {
  for (const c of CENARIO_IDS) {
    it(c, () => {
      console.log(`\n== ${c}: sem SUS obitos=${Math.round(simularSemSUS(c, 7).obitos)}`);
      console.log(' parado:');
      const parado = jogar(c, 7, [], 1, linha);
      console.log(`  semSUS no mesmo dia=${Math.round(simularSemSUS(c, 7, parado.dia).obitos)}`);
      console.log(' estrategia razoavel:');
      const bom = jogar(c, 7, tresVezes(ESTRATEGIA[c]), 0, linha);
      console.log(`  semSUS no mesmo dia=${Math.round(simularSemSUS(c, 7, bom.dia).obitos)}`);
      for (const f of FRENTE_IDS) {
        const so = jogar(c, 7, [f, f, f], 1);
        console.log(`  so ${f}: fim=${so.fim} dia=${so.dia} obitos=${Math.round(totais(so).obitos)}`);
      }
    });
  }
});
