import type { ZonaId } from '../../data/supuestos.ts';

export type V2 = [number, number]; // x, z

export interface ZonaPlano {
  id: ZonaId;
  corto: string;
  centro: V2;
  tam: V2;
  puestos: V2[]; // posiciones de mobiliario y destino de los pacientes
  mueble: [number, number, number]; // ancho, alto, fondo del mueble tipo
  divisor: number; // atenciones por día que representa cada partícula
}

const filas = (x0: number, x1: number, z0: number, z1: number, nx: number, nz: number): V2[] => {
  const out: V2[] = [];
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++)
      out.push([nx === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (nx - 1), nz === 1 ? (z0 + z1) / 2 : z0 + ((z1 - z0) * j) / (nz - 1)]);
  return out;
};

export const PLANO: ZonaPlano[] = [
  { id: 'consulta', corto: 'Consulta externa', centro: [-7.5, 0], tam: [9, 16], puestos: filas(-10.2, -4.8, -6.4, 6.4, 2, 7), mueble: [1.9, 0.45, 1.1], divisor: 5 },
  { id: 'admision', corto: 'Admisión y triage', centro: [0.5, 5], tam: [7, 6], puestos: filas(-1.8, 2.8, 4.3, 4.3, 6, 1).concat(filas(-1.5, 2.5, 6.6, 6.6, 2, 1)), mueble: [0.6, 0.7, 0.5], divisor: 12 },
  { id: 'laboratorio', corto: 'Laboratorio', centro: [0.5, -4.5], tam: [7, 7], puestos: filas(-2, 3, -6.6, -6.6, 5, 1).concat([[-1.4, -3], [2.4, -3]]), mueble: [0.8, 0.55, 0.8], divisor: 5 },
  { id: 'prioritaria', corto: 'Atención prioritaria', centro: [8, 4.5], tam: [8, 7], puestos: filas(5.3, 10.7, 3.2, 3.2, 4, 1).concat(filas(6.2, 9.8, 6.6, 6.6, 2, 1)), mueble: [0.9, 0.45, 2], divisor: 1.25 },
  { id: 'procedimientos', corto: 'Procedimientos', centro: [8, -3.5], tam: [8, 9], puestos: filas(5.2, 10.8, -6.2, -1.6, 5, 2), mueble: [0.8, 0.6, 0.8], divisor: 1 },
];

export const PASILLO = { centro: [0.5, 0.5] as V2, tam: [7, 3] as V2 };
export const EDIFICIO = { min: [-12, -8] as V2, max: [12, 8] as V2 };
export const PUERTA_PRINCIPAL: V2 = [0.5, 8];
export const PUERTA_PRIORITARIA: V2 = [8, 8];
export const CALLE_Z = 11.2;
export const BASE_DOMICILIARIA: V2 = [17.5, 5];
export const RED_HOSPITALARIA: V2 = [-17, CALLE_Z];

export const HOGARES: V2[] = [
  [21.5, -8], [25, -6.5], [28, -9], [21.5, -3], [26, -2], [28.5, 2], [22.5, 2], [25.5, 6.5], [28.5, 7.5], [21.5, 15], [25, 15.5], [28.5, 14],
];
