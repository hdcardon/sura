// Supuestos sintéticos e ilustrativos. Ningún valor proviene de datos reales de afiliados.
// Tasas expresadas por 1.000 personas de la cohorte por mes.

export type TipoAtencion = 'controles' | 'noProgramadas' | 'urgencias' | 'hospitalizaciones' | 'laboratorio' | 'procedimientos';

export interface Cohorte {
  id: string;
  nombre: string;
  ruta: string;
  tamanoDefault: number;
  tamanoMin: number;
  tamanoMax: number;
  tasas: Record<TipoAtencion, number>;
  // Multiplicador mensual (ene–dic) aplicado a la demanda no programada, urgencias y hospitalizaciones.
  estacionalidad: number[];
  // Efecto máximo de la gestión del riesgo con cobertura del 100 %.
  // Valores negativos reducen la demanda; positivos la aumentan (más controles por mayor adherencia).
  efectoMax: Partial<Record<TipoAtencion, number>>;
  // Fracción de cada tipo de atención que Salud en Casa puede asumir cuando la gestión del riesgo la incluye.
  desvioSaludEnCasa: Partial<Record<TipoAtencion, number>>;
  // Estratificación de la cohorte: controlado, no controlado, complicado, alto riesgo (suma 1).
  estratos: [number, number, number, number];
  nota: string;
}

export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const ANIO = 2027;

export const COHORTES: Cohorte[] = [
  {
    id: 'rcv',
    nombre: 'Riesgo cardiovascular y metabólico',
    ruta: 'RIAS cardio-cerebro-vascular-metabólica',
    tamanoDefault: 5000,
    tamanoMin: 2000,
    tamanoMax: 10000,
    tasas: { controles: 250, noProgramadas: 52, urgencias: 14, hospitalizaciones: 2.8, laboratorio: 160, procedimientos: 3 },
    estacionalidad: [1.08, 1.0, 0.98, 1.0, 1.02, 0.97, 0.95, 0.96, 1.0, 1.02, 1.04, 1.12],
    efectoMax: { noProgramadas: -0.28, urgencias: -0.32, hospitalizaciones: -0.27, controles: 0.1 },
    desvioSaludEnCasa: { controles: 0.45, laboratorio: 0.4, noProgramadas: 0.15 },
    estratos: [0.46, 0.31, 0.17, 0.06],
    nota: 'Hipertensión arterial y diabetes tipo 2 gestionadas en una misma ruta.',
  },
  {
    id: 'dm2',
    nombre: 'Diabetes tipo 2',
    ruta: 'Cohorte de diabetes',
    tamanoDefault: 2900,
    tamanoMin: 1000,
    tamanoMax: 6000,
    tasas: { controles: 333, noProgramadas: 64, urgencias: 19, hospitalizaciones: 4.2, laboratorio: 290, procedimientos: 6 },
    estacionalidad: [1.1, 1.04, 1.0, 1.0, 1.0, 0.97, 0.95, 0.96, 1.0, 1.0, 1.04, 1.14],
    efectoMax: { noProgramadas: -0.3, urgencias: -0.35, hospitalizaciones: -0.3, controles: 0.15 },
    desvioSaludEnCasa: { controles: 0.45, laboratorio: 0.4, noProgramadas: 0.15 },
    estratos: [0.47, 0.32, 0.16, 0.05],
    nota: 'Control trimestral con hemoglobina glicosilada y tamización de complicaciones.',
  },
  {
    id: 'erc',
    nombre: 'Protección renal (ERC estadios 3 y 4)',
    ruta: 'Programa de protección renal',
    tamanoDefault: 1300,
    tamanoMin: 400,
    tamanoMax: 2600,
    tasas: { controles: 333, noProgramadas: 85, urgencias: 32, hospitalizaciones: 9, laboratorio: 420, procedimientos: 60 },
    estacionalidad: [1.05, 1.0, 1.0, 1.02, 1.02, 0.98, 0.96, 0.97, 1.0, 1.02, 1.03, 1.08],
    efectoMax: { noProgramadas: -0.26, urgencias: -0.3, hospitalizaciones: -0.35, controles: 0.08 },
    desvioSaludEnCasa: { controles: 0.4, laboratorio: 0.4, procedimientos: 0.35, noProgramadas: 0.12 },
    estratos: [0.38, 0.33, 0.2, 0.09],
    nota: 'Incluye aplicación de hierro intravenoso y seguimiento de progresión.',
  },
  {
    id: 'epoc',
    nombre: 'EPOC',
    ruta: 'Programa de enfermedad respiratoria crónica',
    tamanoDefault: 1500,
    tamanoMin: 500,
    tamanoMax: 3000,
    tasas: { controles: 250, noProgramadas: 95, urgencias: 48, hospitalizaciones: 12, laboratorio: 60, procedimientos: 14 },
    // Picos en las temporadas de lluvias (abril–mayo y octubre–noviembre).
    estacionalidad: [0.92, 0.9, 1.05, 1.3, 1.36, 1.0, 0.86, 0.86, 1.0, 1.3, 1.4, 1.05],
    efectoMax: { noProgramadas: -0.32, urgencias: -0.4, hospitalizaciones: -0.35, controles: 0.12 },
    desvioSaludEnCasa: { controles: 0.4, procedimientos: 0.4, noProgramadas: 0.18, laboratorio: 0.25 },
    estratos: [0.34, 0.33, 0.22, 0.11],
    nota: 'Rehabilitación pulmonar, plan de acción ante exacerbación y vacunación.',
  },
];

export type ZonaId = 'admision' | 'consulta' | 'prioritaria' | 'laboratorio' | 'procedimientos' | 'domiciliaria';

export interface Zona {
  id: ZonaId;
  nombre: string;
  unidad: string;
  capacidadDia: number;
  // Ocupación de la demanda general de la sede (sin la cohorte) en un mes promedio.
  ocupacionBase: number;
  estacionalidadBase: number[];
  recursos: string;
  equipos: { nombre: string; total: number }[];
}

const estacionalidadConsulta = [0.95, 1.0, 1.02, 1.0, 1.02, 0.98, 0.93, 1.0, 1.02, 1.02, 1.0, 0.92];
const estacionalidadRespiratoria = [0.97, 0.95, 1.0, 1.06, 1.07, 1.0, 0.94, 0.95, 1.0, 1.05, 1.07, 1.0];

export const SEDE = {
  nombre: 'Sede CIS de referencia',
  adscritos: 38000,
  diasHabiles: 21,
  diasCalendario: 30,
  visitasPorEquipoDia: 7,
  equiposDomiciliariosBase: 5,
  oportunidadBaseDias: 2.6,
  oportunidadNormativaDias: 3,
};

export const ZONAS: Zona[] = [
  {
    id: 'admision',
    nombre: 'Admisión y triage',
    unidad: 'admisiones/día',
    capacidadDia: 560,
    ocupacionBase: 0.7,
    estacionalidadBase: estacionalidadConsulta,
    recursos: '6 puestos de admisión y 2 consultorios de triage',
    equipos: [{ nombre: 'Kioscos de autoadmisión', total: 3 }, { nombre: 'Monitores de signos vitales', total: 2 }],
  },
  {
    id: 'consulta',
    nombre: 'Consulta externa',
    unidad: 'consultas/día',
    capacidadDia: 252,
    ocupacionBase: 0.74,
    estacionalidadBase: estacionalidadConsulta,
    recursos: '14 consultorios, 18 consultas por consultorio al día',
    equipos: [{ nombre: 'Tensiómetros conectados', total: 14 }, { nombre: 'Electrocardiógrafos', total: 2 }],
  },
  {
    id: 'prioritaria',
    nombre: 'Atención prioritaria y urgencias',
    unidad: 'atenciones/día',
    capacidadDia: 48,
    ocupacionBase: 0.8,
    estacionalidadBase: estacionalidadRespiratoria,
    recursos: '4 cubículos y 2 salas de observación',
    equipos: [{ nombre: 'Monitores multiparámetro', total: 6 }, { nombre: 'Desfibrilador', total: 1 }],
  },
  {
    id: 'laboratorio',
    nombre: 'Laboratorio y ayudas diagnósticas',
    unidad: 'tomas/día',
    capacidadDia: 190,
    ocupacionBase: 0.72,
    estacionalidadBase: estacionalidadConsulta,
    recursos: '5 cubículos de toma de muestras, rayos X y ecografía',
    equipos: [{ nombre: 'Analizador de química', total: 2 }, { nombre: 'Ecógrafo', total: 1 }, { nombre: 'Rayos X digital', total: 1 }],
  },
  {
    id: 'procedimientos',
    nombre: 'Procedimientos e infusión',
    unidad: 'procedimientos/día',
    capacidadDia: 30,
    ocupacionBase: 0.62,
    estacionalidadBase: estacionalidadConsulta,
    recursos: '10 sillas de infusión, 3 turnos',
    equipos: [{ nombre: 'Bombas de infusión', total: 10 }],
  },
  {
    id: 'domiciliaria',
    nombre: 'Salud en Casa',
    unidad: 'visitas/día',
    capacidadDia: 35,
    ocupacionBase: 0.62,
    estacionalidadBase: estacionalidadConsulta,
    recursos: '5 equipos domiciliarios, 7 visitas por equipo al día',
    equipos: [{ nombre: 'Kits de monitoreo remoto', total: 40 }],
  },
];

export const UMBRALES = { tensionada: 0.8, saturada: 0.95 };
