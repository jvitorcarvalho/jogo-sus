// Baixa do IBGE a população do Censo 2022 e a malha das 27 UFs e grava src/data/ibge.gerado.ts.
// Uso: npm run dados
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const URL_POP = 'https://apisidra.ibge.gov.br/values/t/4714/n3/all/v/93/p/2022';
const URL_MALHA =
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF';

const SIGLAS = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
  21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
  31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS',
  50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
};

const ESCALA = 20; // pixels por grau
const LON0 = -74.5;
const LAT0 = 5.8;
const PASSO_MIN = 0.07; // graus; pontos mais próximos que isso são descartados

async function baixar(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${url} respondeu ${r.status}`);
  return r.json();
}

function areaAnel(anel) {
  let a = 0;
  for (let i = 0; i < anel.length - 1; i++) a += anel[i][0] * anel[i + 1][1] - anel[i + 1][0] * anel[i][1];
  return Math.abs(a / 2);
}

function simplificar(anel) {
  const saida = [anel[0]];
  for (const p of anel) {
    const u = saida[saida.length - 1];
    if (Math.hypot(p[0] - u[0], p[1] - u[1]) >= PASSO_MIN) saida.push(p);
  }
  return saida;
}

const proj = ([lon, lat]) => [
  Math.round((lon - LON0) * ESCALA * 10) / 10,
  Math.round((LAT0 - lat) * ESCALA * 10) / 10,
];

function contorno(geometria) {
  const poligonos = geometria.type === 'Polygon' ? [geometria.coordinates] : geometria.coordinates;
  const aneis = poligonos.map((p) => p[0]).sort((a, b) => areaAnel(b) - areaAnel(a));
  const maior = areaAnel(aneis[0]);
  const usados = aneis.filter((a) => areaAnel(a) >= maior * 0.02);
  let d = '';
  for (const anel of usados) {
    const pts = simplificar(anel).map(proj);
    if (pts.length < 4) continue;
    d += 'M' + pts.map((p) => p.join(',')).join('L') + 'Z';
  }
  const principal = aneis[0].map(proj);
  const xs = principal.map((p) => p[0]);
  const ys = principal.map((p) => p[1]);
  const cx = Math.round(((Math.min(...xs) + Math.max(...xs)) / 2) * 10) / 10;
  const cy = Math.round(((Math.min(...ys) + Math.max(...ys)) / 2) * 10) / 10;
  return { d, cx, cy };
}

const [pop, malha] = await Promise.all([baixar(URL_POP), baixar(URL_MALHA)]);

const ufs = {};
for (const linha of pop.slice(1)) {
  const sigla = SIGLAS[Number(linha.D1C)];
  if (!sigla) throw new Error(`UF desconhecida no SIDRA: ${linha.D1C}`);
  const valor = Number(linha.V);
  if (!Number.isFinite(valor) || valor <= 0) throw new Error(`População inválida para ${sigla}: ${linha.V}`);
  ufs[sigla] = { nome: linha.D1N, pop: valor };
}
for (const f of malha.features) {
  const sigla = SIGLAS[Number(f.properties.codarea)];
  if (!sigla) throw new Error(`UF desconhecida na malha: ${f.properties.codarea}`);
  Object.assign(ufs[sigla], contorno(f.geometry));
}

const siglas = Object.keys(ufs).sort();
if (siglas.length !== 27) throw new Error(`Esperava 27 UFs, vieram ${siglas.length}`);
for (const s of siglas) if (!ufs[s].d) throw new Error(`UF sem contorno: ${s}`);

const hoje = new Date().toISOString().slice(0, 10);
const corpo = siglas
  .map((s) => `  ${s}: ${JSON.stringify(ufs[s])},`)
  .join('\n');
const arquivo = `// ARQUIVO GERADO por scripts/gerar-dados-ibge.mjs. Não editar à mão.
// Fonte da população: IBGE, Censo Demográfico 2022, tabela SIDRA 4714, variável 93.
//   ${URL_POP}
// Fonte da malha: IBGE, API de malhas geográficas v3, qualidade mínima.
//   ${URL_MALHA}
// Consultado em ${hoje}.
export interface DadoIBGE { nome: string; pop: number; d: string; cx: number; cy: number }
export const CONSULTADO_EM = '${hoje}';
export const LARGURA_MAPA = ${Math.round((-34.5 - LON0) * ESCALA)};
export const ALTURA_MAPA = ${Math.round((LAT0 + 34) * ESCALA)};
export const IBGE: Record<string, DadoIBGE> = {
${corpo}
};
`;
const destino = fileURLToPath(new URL('../src/data/ibge.gerado.ts', import.meta.url));
writeFileSync(destino, arquivo);
const total = siglas.reduce((t, s) => t + ufs[s].pop, 0);
console.log(`OK: ${siglas.length} UFs, população total ${total}, ${arquivo.length} bytes`);
