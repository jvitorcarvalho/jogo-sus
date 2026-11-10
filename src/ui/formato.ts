const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export const num = (n: number): string => inteiro.format(Math.round(n));
export const curto = (n: number): string => (Math.abs(n) < 10000 ? num(n) : compacto.format(n));
export const pct = (fracao: number): string => `${Math.round(fracao * 100)}%`;
