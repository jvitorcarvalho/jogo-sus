// Baixa da ANS os beneficiários de planos de assistência médica e grava src/data/ans.gerado.ts.
// Uso: npm run dados:ans
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const URL_ANS =
  'https://dadosabertos.ans.gov.br/FTP/PDA/taxa_de_cobertura_de_planos_de_saude-047/pda-047-taxa_cobertura.csv';

const resposta = await fetch(URL_ANS);
if (!resposta.ok) throw new Error(`${URL_ANS} respondeu ${resposta.status}`);
const modificado = resposta.headers.get('last-modified') ?? '';
const texto = new TextDecoder('latin1').decode(await resposta.arrayBuffer());

const linhas = texto.split(/\r?\n/);
const colunas = linhas[0].split(';');
const iPeriodo = colunas.indexOf('PERIODO');
const iUF = colunas.indexOf('SG_UF');
const iBenef = colunas.indexOf('BENEF_ASSISTENCIA_MEDICA');
if (iPeriodo < 0 || iUF < 0 || iBenef < 0) throw new Error(`Colunas inesperadas: ${linhas[0]}`);

const limpar = (v) => v.replaceAll('"', '').trim();
const porPeriodo = {};
for (const linha of linhas.slice(1)) {
  if (!linha) continue;
  const c = linha.split(';');
  const periodo = limpar(c[iPeriodo]);
  const uf = limpar(c[iUF]);
  const n = Number(limpar(c[iBenef]));
  if (!/^[A-Z]{2}$/.test(uf) || !Number.isFinite(n)) throw new Error(`Linha inesperada: ${linha}`);
  porPeriodo[periodo] ??= {};
  porPeriodo[periodo][uf] = (porPeriodo[periodo][uf] ?? 0) + n;
}

const periodos = Object.keys(porPeriodo).sort();
const periodo = periodos[periodos.length - 1];
const benef = porPeriodo[periodo];
// A ANS usa EX para residentes no exterior e XX para UF não identificada: ficam fora do mapa.
const foraDoMapa = (benef.EX ?? 0) + (benef.XX ?? 0);
delete benef.EX;
delete benef.XX;
const siglas = Object.keys(benef).sort();
if (siglas.length !== 27) throw new Error(`Esperava 27 UFs, vieram ${siglas.length}: ${siglas.join(',')}`);

const hoje = new Date().toISOString().slice(0, 10);
const arquivo = `// ARQUIVO GERADO por scripts/gerar-dados-ans.mjs. Não editar à mão.
// Fonte: ANS, dados abertos, "Taxa de cobertura de planos de saúde" (PDA-047), período ${periodo}.
//   ${URL_ANS}
// Arquivo da ANS modificado em: ${modificado}. Consultado em ${hoje}.
// Valor: beneficiários de planos de assistência médica (não inclui plano só odontológico),
// somados por UF de residência.
export const ANS_PERIODO = '${periodo}';
export const ANS_CONSULTADO_EM = '${hoje}';
export const ANS_URL = '${URL_ANS}';
export const BENEFICIARIOS_PLANO_MEDICO: Record<string, number> = {
${siglas.map((s) => `  ${s}: ${benef[s]},`).join('\n')}
};
`;
writeFileSync(fileURLToPath(new URL('../src/data/ans.gerado.ts', import.meta.url)), arquivo);
const total = siglas.reduce((t, s) => t + benef[s], 0);
console.log(`OK: período ${periodo} (de ${periodos.join(', ')}), ${total} beneficiários em 27 UFs; ${foraDoMapa} sem UF ou no exterior ficaram de fora`);
