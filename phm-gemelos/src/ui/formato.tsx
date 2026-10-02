import { MESES_LARGOS } from '../model/calendario.ts';
import type { Estado } from '../model/red.ts';

const nf0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const n0 = (x: number) => nf0.format(Math.round(x));
export const n1 = (x: number) => nf1.format(x);
export const pct = (x: number) => `${nf0.format(Math.round(x * 100))} %`;
export const pct1 = (x: number) => `${nf1.format(x * 100)} %`;
export const millones = (x: number) => `$${nf0.format(Math.round(x / 1e6))} M`;
export const conSigno = (x: number, f: (v: number) => string) => (x > 0 ? `+${f(x)}` : x < 0 ? `−${f(-x)}` : f(0));
export const mesLargo = (m: number) => `${MESES_LARGOS[m]} 2027`;

export const COLOR_ESTADO: Record<Estado, string> = { holgada: '#2e9e6b', tensionada: '#d99a22', saturada: '#d1495b' };
export const NOMBRE_ESTADO: Record<Estado, string> = { holgada: 'Holgada', tensionada: 'Tensionada', saturada: 'Saturada' };
export const COLOR_ESTRATO = ['#2e9e6b', '#c9a93a', '#e07b39', '#c7354a'];
export const COLOR_SALIDA = '#8a94a3';

export function Pastilla({ estado }: { estado: Estado }) {
  return (
    <span className="pastilla" style={{ background: COLOR_ESTADO[estado] }}>
      {NOMBRE_ESTADO[estado]}
    </span>
  );
}
