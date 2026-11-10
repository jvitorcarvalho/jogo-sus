type Filho = Node | string | null | undefined | false;

/** Cria um elemento HTML. `class` e demais chaves viram atributos. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> | null = null,
  ...filhos: Filho[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const f of filhos) if (f) el.append(f);
  return el;
}

const SVG = 'http://www.w3.org/2000/svg';
export function svg(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** Só toca o DOM se o texto mudou. */
export function texto(el: Element, valor: string): void {
  if (el.textContent !== valor) el.textContent = valor;
}

const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export const num = (n: number): string => inteiro.format(Math.round(n));
export const curto = (n: number): string => (Math.abs(n) < 10000 ? num(n) : compacto.format(n));
export const pct = (fracao: number): string => `${Math.round(fracao * 100)}%`;
