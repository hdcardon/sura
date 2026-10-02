import { COHORTES, SEDE, UMBRALES, ZONAS } from '../data/supuestos.ts';

import type { Cohorte, TipoAtencion, ZonaId } from '../data/supuestos.ts';

export type Serie = Record<TipoAtencion, number[]>;

export interface Proyeccion {
  cohorte: Cohorte;
  tamano: number;
  intervencion: number;
  base: Serie; // sin gestión del riesgo, atenciones por mes
  gestion: Serie; // con gestión del riesgo, atenciones por mes (antes de desvío a Salud en Casa)
  desvio: Serie; // atenciones por mes que asume Salud en Casa en el escenario con gestión
  visitasDomiciliariasMes: number[];
  equiposAdicionales: number; // dimensionamiento sugerido para el mes pico
  mesPico: number;
  hospitalizacionesEvitadasAnio: number;
  urgenciasEvitadasAnio: number;
  estratosGestion: [number, number, number, number];
}

const TIPOS: TipoAtencion[] = ['controles', 'noProgramadas', 'urgencias', 'hospitalizaciones', 'laboratorio', 'procedimientos'];
const ESTACIONALES: TipoAtencion[] = ['noProgramadas', 'urgencias', 'hospitalizaciones'];

const vacia = (): Serie =>
  Object.fromEntries(TIPOS.map((t) => [t, new Array(12).fill(0)])) as Serie;

export const sumaAnio = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function cohortePorId(id: string): Cohorte {
  return COHORTES.find((c) => c.id === id) ?? COHORTES[0];
}

export function proyectar(cohorte: Cohorte, tamano: number, intervencion: number): Proyeccion {
  const base = vacia();
  const gestion = vacia();
  const desvio = vacia();
  const visitasDomiciliariasMes = new Array(12).fill(0);
  const k = tamano / 1000;

  for (let m = 0; m < 12; m++) {
    for (const t of TIPOS) {
      const est = ESTACIONALES.includes(t) ? cohorte.estacionalidad[m] : 1;
      const b = cohorte.tasas[t] * k * est;
      base[t][m] = b;
      const efecto = (cohorte.efectoMax[t] ?? 0) * intervencion;
      const g = b * (1 + efecto);
      gestion[t][m] = g;
      // Fracción de la atención de la cohorte que asumen los equipos domiciliarios cuando la gestión del riesgo los incluye.
      desvio[t][m] = g * (cohorte.desvioSaludEnCasa[t] ?? 0);
    }
    // Una visita domiciliaria agrupa control y toma de muestras; el laboratorio cuenta 0,4 visitas.
    visitasDomiciliariasMes[m] =
      desvio.controles[m] + desvio.noProgramadas[m] + desvio.procedimientos[m] + 0.4 * desvio.laboratorio[m];
  }

  // Mes pico: el de mayor tensión en la sede (consulta externa o atención prioritaria) sin gestión del riesgo.
  const zc = ZONAS.find((z) => z.id === 'consulta')!;
  const zp = ZONAS.find((z) => z.id === 'prioritaria')!;
  const tension = base.controles.map((_, m) => {
    const oc = (zc.capacidadDia * zc.ocupacionBase * zc.estacionalidadBase[m] + (base.controles[m] + 0.6 * base.noProgramadas[m]) / SEDE.diasHabiles) / zc.capacidadDia;
    const op = (zp.capacidadDia * zp.ocupacionBase * zp.estacionalidadBase[m] + (base.urgencias[m] + 0.4 * base.noProgramadas[m]) / SEDE.diasCalendario) / zp.capacidadDia;
    return Math.max(oc, op);
  });
  const mesPico = tension.indexOf(Math.max(...tension));
  const visitasPicoDia = Math.max(...visitasDomiciliariasMes) / SEDE.diasHabiles;
  const equiposAdicionales = Math.ceil(visitasPicoDia / SEDE.visitasPorEquipoDia);

  const [c, nc, comp, alto] = cohorte.estratos;
  const mov = 0.35 * intervencion;
  const estratosGestion: [number, number, number, number] = [
    c + nc * mov + comp * mov * 0.3,
    nc * (1 - mov) + comp * mov * 0.5,
    comp * (1 - mov * 0.8) + alto * mov * 0.4,
    alto * (1 - mov * 0.4),
  ];
  const s = estratosGestion.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 4; i++) estratosGestion[i] /= s;

  return {
    cohorte,
    tamano,
    intervencion,
    base,
    gestion,
    desvio,
    visitasDomiciliariasMes,
    equiposAdicionales,
    mesPico,
    hospitalizacionesEvitadasAnio: sumaAnio(base.hospitalizaciones) - sumaAnio(gestion.hospitalizaciones),
    urgenciasEvitadasAnio: sumaAnio(base.urgencias) - sumaAnio(gestion.urgencias),
    estratosGestion,
  };
}

export type Escenario = 'general' | 'sinGestion' | 'conGestion';
export type Estado = 'holgada' | 'tensionada' | 'saturada';

export interface CargaZona {
  id: ZonaId;
  demandaDia: number;
  capacidadDia: number;
  ocupacion: number;
  estado: Estado;
  aporteCohorteDia: number;
}

export interface CargaSede {
  zonas: Record<ZonaId, CargaZona>;
  hospitalizacionesMes: number;
  oportunidadDias: number;
  visitasDomiciliariasDia: number;
  equiposDomiciliarios: number;
}

export function estadoDe(ocupacion: number): Estado {
  if (ocupacion >= UMBRALES.saturada) return 'saturada';
  if (ocupacion >= UMBRALES.tensionada) return 'tensionada';
  return 'holgada';
}

export function cargaSede(p: Proyeccion, escenario: Escenario, saludEnCasa: boolean, m: number): CargaSede {
  const H = SEDE.diasHabiles;
  const C = SEDE.diasCalendario;
  const conCohorte = escenario !== 'general';
  const serie = escenario === 'conGestion' ? p.gestion : p.base;
  const usaDesvio = escenario === 'conGestion' && saludEnCasa;
  const d = (t: TipoAtencion) => (conCohorte ? serie[t][m] - (usaDesvio ? p.desvio[t][m] : 0) : 0);

  const aporte: Record<ZonaId, number> = {
    consulta: (d('controles') + 0.6 * d('noProgramadas')) / H,
    prioritaria: d('urgencias') / C + (0.4 * d('noProgramadas')) / C,
    laboratorio: d('laboratorio') / H,
    procedimientos: d('procedimientos') / H,
    admision: 0,
    domiciliaria: usaDesvio ? p.visitasDomiciliariasMes[m] / H : 0,
  };
  aporte.admision = aporte.consulta + aporte.prioritaria + 0.5 * aporte.laboratorio + aporte.procedimientos;

  const equiposDomiciliarios = SEDE.equiposDomiciliariosBase + (usaDesvio ? p.equiposAdicionales : 0);
  const zonas = {} as Record<ZonaId, CargaZona>;
  for (const z of ZONAS) {
    const capacidadDia = z.id === 'domiciliaria' ? equiposDomiciliarios * SEDE.visitasPorEquipoDia : z.capacidadDia;
    const general = z.capacidadDia * z.ocupacionBase * z.estacionalidadBase[m];
    const demandaDia = general + aporte[z.id];
    const ocupacion = demandaDia / capacidadDia;
    zonas[z.id] = { id: z.id, demandaDia, capacidadDia, ocupacion, estado: estadoDe(ocupacion), aporteCohorteDia: aporte[z.id] };
  }

  const occ = zonas.consulta.ocupacion;
  const oportunidadDias = SEDE.oportunidadBaseDias * (1 + 6 * Math.max(0, occ - 0.8));

  return {
    zonas,
    hospitalizacionesMes: conCohorte ? serie.hospitalizaciones[m] : 0,
    oportunidadDias,
    visitasDomiciliariasDia: zonas.domiciliaria.demandaDia,
    equiposDomiciliarios,
  };
}

// Serie diaria de consulta externa para la curva de portada y la Demo A.
export function serieConsulta(p: Proyeccion, escenario: Escenario, saludEnCasa: boolean) {
  return Array.from({ length: 12 }, (_, m) => cargaSede(p, escenario, saludEnCasa, m).zonas.consulta.demandaDia);
}
