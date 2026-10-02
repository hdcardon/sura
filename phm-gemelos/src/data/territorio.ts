import { mulberry32 } from '../model/aleatorio.ts';
import type { CeldaTerritorio, Sede } from './tipos.ts';

// Territorio sintético en hexágonos (coordenadas axiales). Cada celda se asigna a la sede más cercana.

export const distanciaHex = (a: [number, number], b: [number, number]) => {
  const dq = a[0] - b[0];
  const dr = a[1] - b[1];
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
};

export const VECINOS: [number, number][] = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
];

let cache: { clave: string; celdas: CeldaTerritorio[] } | null = null;

export function generarTerritorio(sedes: Sede[], semilla: number): CeldaTerritorio[] {
  const clave = `${semilla}|${sedes.map((s) => `${s.id}:${s.hex.join(',')}:${s.adultosObjetivo}`).join(';')}`;
  if (cache?.clave === clave) return cache.celdas;
  const rnd = mulberry32(semilla);
  const R = 7;
  const candidatas: { q: number; r: number; ruido: number }[] = [];
  for (let q = -R; q <= R; q++)
    for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) candidatas.push({ q, r, ruido: rnd() });

  const forma = (q: number, r: number, ruido: number) => {
    const x = q + r / 2;
    const y = (r * Math.sqrt(3)) / 2;
    const ang = Math.atan2(y, x);
    const radio = 5.6 + 1.1 * Math.sin(3 * ang + 0.6) + 0.7 * Math.cos(2 * ang) + (ruido - 0.5) * 1.2;
    return Math.hypot(x, y) <= radio;
  };

  const celdasBase = candidatas.filter((c) => forma(c.q, c.r, c.ruido) || sedes.some((s) => s.hex[0] === c.q && s.hex[1] === c.r));

  const celdas: CeldaTerritorio[] = celdasBase.map((c) => {
    let mejor = sedes[0];
    let dmin = Infinity;
    for (const s of sedes) {
      const d = distanciaHex([c.q, c.r], s.hex);
      if (d < dmin) {
        dmin = d;
        mejor = s;
      }
    }
    const y = (c.r * Math.sqrt(3)) / 2;
    // Prevalencia mayor hacia el norte y oriente (población de más edad) con variación local.
    const factor = 1 + 0.035 * -y + 0.025 * (c.q + c.r / 2) + (rnd() - 0.5) * 0.22;
    return {
      id: '',
      q: c.q,
      r: c.r,
      adultos: 600 + rnd() * 1400,
      factorPrevalencia: Math.min(1.4, Math.max(0.68, factor)),
      sedeId: mejor.id,
      minutosASede: Math.round(4 + dmin * 6.5 + rnd() * 5),
    };
  });

  // Ajuste de adultos por sede al objetivo y normalización de la prevalencia ponderada a 1.
  for (const s of sedes) {
    const propias = celdas.filter((c) => c.sedeId === s.id);
    const suma = propias.reduce((a, c) => a + c.adultos, 0);
    for (const c of propias) c.adultos = Math.round((c.adultos / suma) * s.adultosObjetivo);
  }
  const tot = celdas.reduce((a, c) => a + c.adultos, 0);
  const media = celdas.reduce((a, c) => a + c.adultos * c.factorPrevalencia, 0) / tot;
  for (const c of celdas) c.factorPrevalencia = +(c.factorPrevalencia / media).toFixed(3);

  celdas.sort((a, b) => a.r - b.r || a.q - b.q);
  celdas.forEach((c, i) => (c.id = `C${String(i + 1).padStart(2, '0')}`));
  cache = { clave, celdas };
  return celdas;
}
