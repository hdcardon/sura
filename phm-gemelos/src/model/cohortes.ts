import type { Catalogo, Cohorte, Estratos4, Matriz4, TipoId } from '../data/tipos.ts';
import { mulberry32, multGamma, percentil, pert } from './aleatorio.ts';
import type { Aleatorio } from './aleatorio.ts';

export const TIPOS: TipoId[] = ['controles', 'noProgramadas', 'urgencias', 'hospitalizaciones', 'laboratorio', 'procedimientos'];
const ESTACIONALES: TipoId[] = ['noProgramadas', 'urgencias', 'hospitalizaciones'];

export type SerieTipos = Record<TipoId, number[]>;
export const serieVacia = (): SerieTipos => Object.fromEntries(TIPOS.map((t) => [t, new Array(12).fill(0)])) as SerieTipos;

// Matriz anual con gestión a cobertura c: Psin + c·k·(Pcon − Psin), filas reescaladas a 1 − salida.
function mezcla(co: Cohorte, c: number, k: number): Matriz4 {
  const out = [0, 1, 2, 3].map((i) => {
    const fila = [0, 1, 2, 3].map((j) => Math.max(0, co.transicionSin[i][j] + c * k * (co.transicionCon[i][j] - co.transicionSin[i][j])));
    const s = fila.reduce((a, b) => a + b, 0) || 1;
    return fila.map((x) => (x / s) * (1 - co.salida[i]));
  });
  return out as unknown as Matriz4;
}

export const coberturaEnMes = (cSQ: number, cObj: number, m: number, rampa: number) =>
  cSQ + (cObj - cSQ) * (1 - Math.exp(-(m + 0.5) / rampa));

export interface Dinamica {
  medio: Estratos4[]; // distribución media de cada mes
  inicio: Estratos4[]; // 13 valores: inicio de cada mes y cierre del año
  cobertura: number[];
  flujo: number[][]; // 4 x 5: de estrato inicial a estrato final o salida, en 12 meses (fracción de la cohorte)
}

// Cadena de Markov mensual con reingreso de casos nuevos al estrato no controlado (cohorte de tamaño estable).
export function dinamica(co: Cohorte, cSQ: number, cObj: number, rampa: number, k = 1): Dinamica {
  let pi = [...co.distInicial] as Estratos4;
  const inicio: Estratos4[] = [pi];
  const medio: Estratos4[] = [];
  const cobertura: number[] = [];
  // Flujo trazado por origen: masa de cada estrato inicial distribuida en estratos actuales y salida.
  let traza = [0, 1, 2, 3].map((i) => {
    const v = [0, 0, 0, 0, 0];
    v[i] = co.distInicial[i];
    return v;
  });
  for (let m = 0; m < 12; m++) {
    const c = coberturaEnMes(cSQ, cObj, m, rampa);
    cobertura.push(c);
    const P = mezcla(co, c, k);
    const Mm = P.map((fila, i) => fila.map((p, j) => (i === j ? 1 : 0) + (p - (i === j ? 1 : 0)) / 12));
    const sig = [0, 0, 0, 0];
    let salidas = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) sig[j] += pi[i] * Mm[i][j];
      salidas += pi[i] * (co.salida[i] / 12);
    }
    sig[1] += salidas; // casos nuevos diagnosticados entran como no controlados
    traza = traza.map((v) => {
      const n = [0, 0, 0, 0, v[4]];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) n[j] += v[i] * Mm[i][j];
        n[4] += v[i] * (co.salida[i] / 12);
      }
      return n;
    });
    medio.push(pi.map((x, i) => (x + sig[i]) / 2) as Estratos4);
    pi = sig as Estratos4;
    inicio.push(pi);
  }
  return { medio, inicio, cobertura, flujo: traza };
}

export interface Muestra {
  k: number;
  efecto: Partial<Record<TipoId, number>>;
  tasa: Record<TipoId, number>;
}

export const MUESTRA_CENTRAL = (co: Cohorte): Muestra => ({
  k: 1,
  efecto: Object.fromEntries(Object.entries(co.efectoResidual).map(([t, r]) => [t, r!.moda])),
  tasa: Object.fromEntries(TIPOS.map((t) => [t, 1])) as Record<TipoId, number>,
});

function muestraAleatoria(co: Cohorte, r: Aleatorio): Muestra {
  return {
    k: pert(r, 0.6, 1, 1.25),
    efecto: Object.fromEntries(Object.entries(co.efectoResidual).map(([t, x]) => [t, pert(r, x!.min, x!.moda, x!.max)])),
    tasa: Object.fromEntries(TIPOS.map((t) => [t, multGamma(r, 0.12)])) as Record<TipoId, number>,
  };
}

// Tasas por persona y mes con la distribución de estratos y la cobertura del mes.
function tasasPorPersona(cat: Catalogo, co: Cohorte, d: Dinamica, m: number, s: Muestra): Record<TipoId, number> {
  const out = {} as Record<TipoId, number>;
  for (const t of TIPOS) {
    const mix = d.medio[m].reduce((a, p, i) => a + p * cat.multEstrato[t][i], 0);
    const est = ESTACIONALES.includes(t) ? co.estacionalidad[m] : 1;
    const ef = 1 + (s.efecto[t] ?? 0) * d.cobertura[m];
    out[t] = (co.tasasNoControlado[t] / 1000) * mix * est * ef * s.tasa[t];
  }
  return out;
}

export interface TasasCohorte {
  sq: SerieTipos; // por persona y mes, statu quo
  esc: SerieTipos; // por persona y mes, escenario (hospitalizaciones con efecto solo en la fracción CSCA)
  dinSQ: Dinamica;
  dinEsc: Dinamica;
}

export function tasasCohorte(cat: Catalogo, co: Cohorte, cObj: number, s?: Muestra): TasasCohorte {
  const m0 = s ?? MUESTRA_CENTRAL(co);
  const dinSQ = dinamica(co, co.coberturaActual, co.coberturaActual, cat.rampaMeses, m0.k);
  const dinEsc = dinamica(co, co.coberturaActual, cObj, cat.rampaMeses, m0.k);
  const sq = serieVacia();
  const esc = serieVacia();
  for (let m = 0; m < 12; m++) {
    const a = tasasPorPersona(cat, co, dinSQ, m, m0);
    const b = tasasPorPersona(cat, co, dinEsc, m, m0);
    for (const t of TIPOS) {
      sq[t][m] = a[t];
      esc[t][m] = t === 'hospitalizaciones' ? a[t] * (1 - co.fraccionCSCA) + b[t] * co.fraccionCSCA : b[t];
    }
  }
  return { sq, esc, dinSQ, dinEsc };
}

// Proyección de una cohorte con bandas de incertidumbre (Monte Carlo con semilla).
export interface ProyeccionCohorte {
  tamano: number;
  central: TasasCohorte;
  volSQ: SerieTipos;
  volEsc: SerieTipos;
  banda: Record<TipoId, { p10: number[]; p90: number[] }>;
  hospCSCAEvitadas: { p10: number; p50: number; p90: number };
  urgenciasEvitadas: { p10: number; p50: number; p90: number };
}

export function proyectarCohorte(cat: Catalogo, co: Cohorte, tamano: number, cObj: number, replicas = 200): ProyeccionCohorte {
  const central = tasasCohorte(cat, co, cObj);
  const vol = (s: SerieTipos) => Object.fromEntries(TIPOS.map((t) => [t, s[t].map((x) => x * tamano)])) as SerieTipos;
  const r = mulberry32(1234 + Math.round(cObj * 1000) + tamano);
  const muestras: Record<TipoId, number[][]> = Object.fromEntries(TIPOS.map((t) => [t, Array.from({ length: 12 }, () => [] as number[])])) as Record<TipoId, number[][]>;
  const hosp: number[] = [];
  const urg: number[] = [];
  for (let i = 0; i < replicas; i++) {
    const tc = tasasCohorte(cat, co, cObj, muestraAleatoria(co, r));
    for (const t of TIPOS) for (let m = 0; m < 12; m++) muestras[t][m].push(tc.esc[t][m] * tamano);
    let h = 0;
    let u = 0;
    for (let m = 0; m < 12; m++) {
      h += (tc.sq.hospitalizaciones[m] - tc.esc.hospitalizaciones[m]) * tamano;
      u += (tc.sq.urgencias[m] - tc.esc.urgencias[m]) * tamano;
    }
    hosp.push(h);
    urg.push(u);
  }
  const banda = Object.fromEntries(
    TIPOS.map((t) => [t, { p10: muestras[t].map((xs) => percentil(xs, 0.1)), p90: muestras[t].map((xs) => percentil(xs, 0.9)) }]),
  ) as ProyeccionCohorte['banda'];
  const q = (xs: number[]) => ({ p10: percentil(xs, 0.1), p50: percentil(xs, 0.5), p90: percentil(xs, 0.9) });
  return { tamano, central, volSQ: vol(central.sq), volEsc: vol(central.esc), banda, hospCSCAEvitadas: q(hosp), urgenciasEvitadas: q(urg) };
}
