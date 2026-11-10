import { describe, expect, it } from 'vitest';
import { DOMINIOS_PERMITIDOS, FATOS } from '../src/data/fatos';
import { FRENTES } from '../src/data/frentes';

describe('fatos reais do SUS', () => {
  it('há fatos para mostrar', () => {
    expect(FATOS.length).toBeGreaterThanOrEqual(6);
  });

  it.each(FATOS.map((f) => [f.texto.slice(0, 50), f] as const))('tem fonte oficial e data: %s', (_, f) => {
    const url = new URL(f.url);
    expect(url.protocol).toBe('https:');
    expect(DOMINIOS_PERMITIDOS.some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`)), url.hostname).toBe(true);
    expect(f.consultadoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(f.fonte.length).toBeGreaterThan(5);
    expect(f.texto.length).toBeGreaterThan(30);
    expect(FRENTES[f.frente]).toBeDefined();
  });
});
