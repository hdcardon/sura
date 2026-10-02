import type { Estado } from '../../model/modelo.ts';

const nf0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const n0 = (x: number) => nf0.format(Math.round(x));
export const n1 = (x: number) => nf1.format(x);
export const pct = (x: number) => `${nf0.format(Math.round(x * 100))} %`;

export const COLOR_ESTADO: Record<Estado, string> = {
  holgada: '#2e9e6b',
  tensionada: '#e0a32e',
  saturada: '#d1495b',
};

export const NOMBRE_ESTADO: Record<Estado, string> = {
  holgada: 'Holgada',
  tensionada: 'Tensionada',
  saturada: 'Saturada',
};
