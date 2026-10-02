import type { Catalogo, Cohorte, Estratos4, Matriz4, Sede, Zona } from './tipos.ts';

// Catálogo base sintético. Ningún valor corresponde a datos reales de afiliados.
// Tasas por 1.000 personas al mes para el estrato de referencia (no controlado); multiplicadores por estrato abajo.

const norm = (xs: number[]) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.map((x) => +(x / m).toFixed(4));
};

const M = (...filas: Estratos4[]) => filas as unknown as Matriz4;

const cohortes: Cohorte[] = [
  {
    id: 'hta',
    nombre: 'Hipertensión arterial',
    ruta: 'RIAS cardio-cerebro-vascular-metabólica',
    nota: 'Control en la ruta CCVM con medicina, enfermería y nutrición.',
    estratos: [
      { nombre: 'Controlada', criterio: 'PA <140/90 sin daño de órgano blanco' },
      { nombre: 'No controlada', criterio: 'PA ≥140/90 sin daño de órgano blanco' },
      { nombre: 'Con daño de órgano blanco', criterio: 'HVI, albuminuria, ERC o enfermedad coronaria estable' },
      { nombre: 'Alto riesgo', criterio: 'Evento CV u hospitalización en 12 meses, o riesgo CV a 10 años ≥20 %' },
    ],
    distInicial: [0.52, 0.3, 0.13, 0.05],
    transicionSin: M([0.82, 0.14, 0.03, 0.01], [0.22, 0.68, 0.08, 0.02], [0, 0, 0.9, 0.1], [0, 0, 0.3, 0.7]),
    transicionCon: M([0.9, 0.08, 0.015, 0.005], [0.4, 0.53, 0.06, 0.01], [0, 0, 0.93, 0.07], [0, 0, 0.4, 0.6]),
    salida: [0.003, 0.005, 0.015, 0.06],
    tasasNoControlado: { controles: 300, noProgramadas: 40, urgencias: 10, hospitalizaciones: 3, laboratorio: 120, procedimientos: 2 },
    estacionalidad: norm([1.04, 1.0, 0.99, 1.0, 1.01, 0.98, 0.97, 0.98, 1.0, 1.01, 1.0, 1.02]),
    fraccionCSCA: 0.25,
    efectoResidual: {
      hospitalizaciones: { min: -0.12, moda: -0.07, max: -0.02 },
      urgencias: { min: -0.08, moda: -0.05, max: -0.01 },
      noProgramadas: { min: -0.06, moda: -0.03, max: 0 },
      controles: { min: 0.08, moda: 0.15, max: 0.2 },
      laboratorio: { min: 0.08, moda: 0.15, max: 0.2 },
    },
    coberturaActual: 0.45,
    virtual: { controles: 0.35, noProgramadas: 0.22, fuga: 0.18 },
    indicadorControl: 'PA <140/90',
  },
  {
    id: 'dm2',
    nombre: 'Diabetes mellitus tipo 2',
    ruta: 'RIAS cardio-cerebro-vascular-metabólica',
    nota: 'Control trimestral con HbA1c, tamización de retinopatía, pie y función renal.',
    estratos: [
      { nombre: 'Controlada', criterio: 'HbA1c <7 % sin complicaciones' },
      { nombre: 'No controlada', criterio: 'HbA1c ≥7 % sin complicaciones' },
      { nombre: 'Con complicaciones', criterio: 'Complicación micro o macrovascular' },
      { nombre: 'Alto riesgo', criterio: 'HbA1c >9 % con complicación, pie de alto riesgo u hospitalización en 12 meses' },
    ],
    distInicial: [0.45, 0.33, 0.16, 0.06],
    transicionSin: M([0.7, 0.25, 0.04, 0.01], [0.2, 0.68, 0.1, 0.02], [0, 0, 0.88, 0.12], [0, 0, 0.25, 0.75]),
    transicionCon: M([0.8, 0.17, 0.025, 0.005], [0.32, 0.58, 0.08, 0.02], [0, 0, 0.91, 0.09], [0, 0, 0.35, 0.65]),
    salida: [0.004, 0.006, 0.02, 0.07],
    tasasNoControlado: { controles: 333, noProgramadas: 55, urgencias: 15, hospitalizaciones: 4, laboratorio: 300, procedimientos: 4 },
    estacionalidad: norm([1.08, 1.03, 1.0, 1.0, 1.0, 0.97, 0.95, 0.96, 1.0, 1.0, 1.0, 1.06]),
    fraccionCSCA: 0.35,
    efectoResidual: {
      hospitalizaciones: { min: -0.15, moda: -0.09, max: -0.03 },
      urgencias: { min: -0.1, moda: -0.06, max: -0.02 },
      noProgramadas: { min: -0.08, moda: -0.05, max: 0 },
      controles: { min: 0.1, moda: 0.2, max: 0.25 },
      laboratorio: { min: 0.1, moda: 0.2, max: 0.25 },
    },
    coberturaActual: 0.5,
    virtual: { controles: 0.3, noProgramadas: 0.18, fuga: 0.2 },
    indicadorControl: 'HbA1c <7 %',
  },
  {
    id: 'erc',
    nombre: 'Enfermedad renal crónica G3a–G4',
    ruta: 'RIAS cardio-cerebro-vascular-metabólica',
    nota: 'Protección renal con seguimiento de TFG y albuminuria; incluye hierro intravenoso y agentes estimulantes de eritropoyesis.',
    estratos: [
      { nombre: 'Riesgo moderado', criterio: 'KDIGO G3a A1' },
      { nombre: 'Riesgo alto', criterio: 'KDIGO G3a A2 o G3b A1' },
      { nombre: 'Riesgo muy alto', criterio: 'KDIGO G3b A2 o mayor, o G4' },
      { nombre: 'Prediálisis', criterio: 'G4 con TFG <20 o caída >25 % al año' },
    ],
    distInicial: [0.4, 0.33, 0.2, 0.07],
    transicionSin: M([0.85, 0.12, 0.025, 0.005], [0.05, 0.8, 0.13, 0.02], [0, 0.03, 0.87, 0.1], [0, 0, 0.05, 0.95]),
    transicionCon: M([0.9, 0.08, 0.015, 0.005], [0.1, 0.8, 0.09, 0.01], [0, 0.06, 0.88, 0.06], [0, 0, 0.08, 0.92]),
    salida: [0.01, 0.015, 0.03, 0.12],
    tasasNoControlado: { controles: 333, noProgramadas: 70, urgencias: 25, hospitalizaciones: 7, laboratorio: 400, procedimientos: 45 },
    estacionalidad: norm([1.04, 1.0, 1.0, 1.01, 1.01, 0.98, 0.97, 0.98, 1.0, 1.01, 1.0, 1.0]),
    fraccionCSCA: 0.25,
    efectoResidual: {
      hospitalizaciones: { min: -0.1, moda: -0.06, max: -0.02 },
      urgencias: { min: -0.07, moda: -0.04, max: 0 },
      noProgramadas: { min: -0.05, moda: -0.02, max: 0 },
      controles: { min: 0.05, moda: 0.1, max: 0.15 },
      laboratorio: { min: 0.05, moda: 0.1, max: 0.15 },
    },
    coberturaActual: 0.55,
    virtual: { controles: 0.2, noProgramadas: 0.1, fuga: 0.28 },
    indicadorControl: 'sin progresión de estadio',
  },
  {
    id: 'epoc',
    nombre: 'EPOC',
    ruta: 'Ruta de enfermedad respiratoria crónica',
    nota: 'Plan de acción ante exacerbación, rehabilitación pulmonar y vacunación.',
    estratos: [
      { nombre: 'GOLD A', criterio: 'Pocos síntomas y sin exacerbaciones moderadas o graves' },
      { nombre: 'GOLD B', criterio: 'Más síntomas y sin exacerbaciones moderadas o graves' },
      { nombre: 'GOLD E', criterio: '≥2 exacerbaciones moderadas o ≥1 hospitalización en el año' },
      { nombre: 'Alto riesgo', criterio: 'GOLD E con hospitalización reciente u oxígeno domiciliario' },
    ],
    distInicial: [0.3, 0.38, 0.22, 0.1],
    transicionSin: M([0.7, 0.2, 0.08, 0.02], [0.1, 0.68, 0.17, 0.05], [0.05, 0.25, 0.5, 0.2], [0, 0.05, 0.3, 0.65]),
    transicionCon: M([0.76, 0.17, 0.06, 0.01], [0.15, 0.68, 0.13, 0.04], [0.08, 0.32, 0.45, 0.15], [0, 0.08, 0.35, 0.57]),
    salida: [0.01, 0.02, 0.04, 0.1],
    tasasNoControlado: { controles: 250, noProgramadas: 90, urgencias: 35, hospitalizaciones: 9, laboratorio: 50, procedimientos: 12 },
    // Picos en las temporadas de lluvias y de circulación de virus respiratorios (abril–mayo y octubre–noviembre).
    estacionalidad: norm([0.95, 0.93, 1.02, 1.18, 1.22, 1.0, 0.9, 0.9, 0.98, 1.15, 1.2, 1.0]),
    fraccionCSCA: 0.55,
    efectoResidual: {
      hospitalizaciones: { min: -0.15, moda: -0.1, max: -0.04 },
      urgencias: { min: -0.08, moda: -0.04, max: 0 },
      noProgramadas: { min: -0.02, moda: 0.03, max: 0.08 },
      controles: { min: 0.1, moda: 0.15, max: 0.2 },
      laboratorio: { min: 0.05, moda: 0.1, max: 0.15 },
    },
    coberturaActual: 0.35,
    virtual: { controles: 0.25, noProgramadas: 0.25, fuga: 0.3 },
    indicadorControl: 'GOLD A o B, sin exacerbaciones',
  },
  {
    id: 'ic',
    nombre: 'Insuficiencia cardíaca',
    ruta: 'RIAS cardio-cerebro-vascular-metabólica',
    nota: 'Seguimiento de peso y síntomas, titulación de medicamentos y gestión anticipatoria de rehospitalización.',
    estratos: [
      { nombre: 'Estable', criterio: 'NYHA I–II sin hospitalización en 12 meses' },
      { nombre: 'Sintomática', criterio: 'NYHA II–III' },
      { nombre: 'Avanzada', criterio: 'NYHA III–IV o FEVI <30 %' },
      { nombre: 'Alto riesgo', criterio: 'Hospitalización por IC en los últimos 6 meses' },
    ],
    distInicial: [0.4, 0.33, 0.17, 0.1],
    transicionSin: M([0.78, 0.17, 0.04, 0.01], [0.15, 0.65, 0.14, 0.06], [0, 0.1, 0.7, 0.2], [0, 0.08, 0.3, 0.62]),
    transicionCon: M([0.85, 0.12, 0.025, 0.005], [0.25, 0.6, 0.11, 0.04], [0, 0.15, 0.7, 0.15], [0, 0.12, 0.35, 0.53]),
    salida: [0.02, 0.05, 0.1, 0.15],
    tasasNoControlado: { controles: 333, noProgramadas: 65, urgencias: 25, hospitalizaciones: 12, laboratorio: 180, procedimientos: 5 },
    estacionalidad: norm([1.03, 1.0, 1.0, 1.05, 1.06, 1.0, 0.96, 0.96, 0.98, 1.03, 1.05, 1.0]),
    fraccionCSCA: 0.5,
    efectoResidual: {
      hospitalizaciones: { min: -0.2, moda: -0.12, max: -0.05 },
      urgencias: { min: -0.1, moda: -0.06, max: -0.02 },
      noProgramadas: { min: -0.05, moda: -0.02, max: 0.03 },
      controles: { min: 0.1, moda: 0.15, max: 0.2 },
      laboratorio: { min: 0.05, moda: 0.1, max: 0.15 },
    },
    coberturaActual: 0.4,
    virtual: { controles: 0.35, noProgramadas: 0.2, fuga: 0.22 },
    indicadorControl: 'sin hospitalización por IC',
  },
];

// Intersecciones exclusivas como % de adultos adscritos (unión 16,5 %).
const perfiles = [
  [['hta'], 8.83], [['hta', 'dm2'], 2.6], [['dm2'], 1.33], [['hta', 'erc'], 0.5], [['hta', 'dm2', 'erc'], 0.55],
  [['hta', 'dm2', 'erc', 'ic'], 0.1], [['hta', 'erc', 'ic'], 0.15], [['hta', 'ic'], 0.35], [['hta', 'dm2', 'ic'], 0.2],
  [['hta', 'epoc'], 0.45], [['hta', 'dm2', 'epoc'], 0.12], [['hta', 'epoc', 'ic'], 0.15], [['epoc'], 0.68], [['epoc', 'ic'], 0.05],
  [['dm2', 'epoc'], 0.05], [['dm2', 'erc'], 0.05], [['erc'], 0.15], [['ic'], 0.2],
].map(([c, p]) => ({ cohortes: c as string[], pctAdultos: p as number }));

const PERFIL_PRIORITARIA = [0, 0, 0, 0, 0, 0, 0, 0.06, 0.09, 0.1, 0.1, 0.09, 0.07, 0.07, 0.08, 0.08, 0.07, 0.07, 0.06, 0.04, 0.02, 0, 0, 0];
const PERFIL_LABORATORIO = [0, 0, 0, 0, 0, 0, 0.12, 0.2, 0.22, 0.18, 0.15, 0.13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const PERFIL_ADMISION = [0, 0, 0, 0, 0, 0, 0, 0.12, 0.13, 0.12, 0.11, 0.09, 0.06, 0.07, 0.08, 0.07, 0.06, 0.05, 0.04, 0, 0, 0, 0, 0];

const EST_AGENDA = norm([0.93, 1.01, 0.98, 1.03, 1.03, 0.98, 0.94, 1.01, 1.04, 1.03, 1.03, 0.97]);
const EST_RESP = norm([0.97, 0.95, 1.0, 1.08, 1.1, 1.0, 0.93, 0.94, 0.99, 1.06, 1.08, 1.0]);

interface ParamSede {
  f: number; // escala de capacidad
  p: number; // presión de demanda relativa
}

function zonas({ f, p }: ParamSede): Zona[] {
  const r = (x: number) => Math.round(x);
  return [
    {
      id: 'admision', nombre: 'Admisión y triage', tipo: 'espontanea', servidores: r(6 * f), horas: 12, servicioMin: 5, productividad: 1,
      baseDias: 'operativos', demandaObservada: r(470 * f * p), estacionalidad: EST_AGENDA, meta: { esperaMin: 10, pMax: 0.2 },
      perfilHorario: PERFIL_ADMISION, equipos: [{ nombre: 'Kioscos de autoadmisión', total: 3 }, { nombre: 'Monitores de signos vitales', total: 2 }],
    },
    {
      id: 'consulta', nombre: 'Consulta externa', tipo: 'agendada', servidores: r(16 * f), horas: 10, servicioMin: 20, productividad: 0.85,
      baseDias: 'operativos', demandaObservada: r(318 * f * p), estacionalidad: EST_AGENDA, meta: { esperaMin: 3, pMax: 0.1 },
      equipos: [{ nombre: 'Tensiómetros conectados', total: r(16 * f) }, { nombre: 'Electrocardiógrafos', total: 2 }],
    },
    {
      id: 'prioritaria', nombre: 'Atención prioritaria', tipo: 'espontanea', servidores: r(5 * f), horas: 14, servicioMin: 40, productividad: 1,
      baseDias: 'calendario', demandaObservada: r(50 * f * p), estacionalidad: EST_RESP, meta: { esperaMin: 45, pMax: 0.2 },
      perfilHorario: PERFIL_PRIORITARIA, equipos: [{ nombre: 'Monitores multiparámetro', total: 6 }, { nombre: 'Desfibrilador', total: 1 }],
    },
    {
      id: 'laboratorio', nombre: 'Laboratorio y ayudas diagnósticas', tipo: 'espontanea', servidores: r(7 * f), horas: 6, servicioMin: 6, productividad: 1,
      baseDias: 'operativos', demandaObservada: r(255 * f * p), estacionalidad: EST_AGENDA, meta: { esperaMin: 20, pMax: 0.2 },
      perfilHorario: PERFIL_LABORATORIO, equipos: [{ nombre: 'Analizador de química', total: 2 }, { nombre: 'Ecógrafo', total: 1 }, { nombre: 'Rayos X digital', total: 1 }],
    },
    {
      id: 'procedimientos', nombre: 'Procedimientos e infusión', tipo: 'agendada', servidores: r(10 * f), horas: 10, servicioMin: 90, productividad: 0.85,
      baseDias: 'operativos', demandaObservada: r(36 * f * p), estacionalidad: EST_AGENDA, meta: { esperaMin: 5, pMax: 0.1 },
      equipos: [{ nombre: 'Bombas de infusión', total: r(10 * f) }],
    },
    {
      id: 'domiciliaria', nombre: 'Atención domiciliaria', tipo: 'domiciliaria', servidores: r(6 * f), horas: 9, servicioMin: 75, productividad: 0.95,
      baseDias: 'operativos', demandaObservada: r(27 * f * p), estacionalidad: EST_AGENDA, meta: { esperaMin: 2, pMax: 0.1 },
      equipos: [{ nombre: 'Kits de monitoreo remoto', total: r(40 * f) }],
    },
    {
      id: 'virtual', nombre: 'Atención virtual', tipo: 'virtual', servidores: r(4 * f), horas: 8, servicioMin: 20, productividad: 0.85,
      baseDias: 'operativos', demandaObservada: r(52 * f * p), estacionalidad: EST_AGENDA, meta: { esperaMin: 1, pMax: 0.1 },
      equipos: [],
    },
  ];
}

const sede = (id: string, nombre: string, hex: [number, number], ps: ParamSede, inasistencia: number, adultosObjetivo: number): Sede => ({
  id, nombre, hex, inasistencia, sobreagenda: 0.08, oportunidadBaseDias: 2.1, zonas: zonas(ps), adultosObjetivo,
});

export const SEDES_BASE = [
  sede('norte', 'Sede Norte', [1, -4], { f: 1, p: 1.12 }, 0.16, 27500),
  sede('centro', 'Sede Centro', [0, 0], { f: 1.15, p: 0.98 }, 0.14, 30500),
  sede('occidente', 'Sede Occidente', [-4, 2], { f: 0.9, p: 0.97 }, 0.17, 24000),
  sede('sur', 'Sede Sur', [3, 2], { f: 0.95, p: 1.08 }, 0.18, 25500),
];

export const CATALOGO_BASE: Catalogo = {
  version: '2027.1',
  tipos: [
    { id: 'controles', nombre: 'Controles programados', costoUnitario: 48000, alfaMultimorbilidad: 0.4 },
    { id: 'noProgramadas', nombre: 'Consultas no programadas', costoUnitario: 52000, alfaMultimorbilidad: 0.8 },
    { id: 'urgencias', nombre: 'Urgencias', costoUnitario: 210000, alfaMultimorbilidad: 0.9 },
    { id: 'hospitalizaciones', nombre: 'Hospitalizaciones', costoUnitario: 5800000, alfaMultimorbilidad: 0.9 },
    { id: 'laboratorio', nombre: 'Laboratorio', costoUnitario: 35000, alfaMultimorbilidad: 0.4 },
    { id: 'procedimientos', nombre: 'Procedimientos e infusión', costoUnitario: 260000, alfaMultimorbilidad: 1 },
  ],
  cohortes,
  perfiles,
  sedes: SEDES_BASE,
  enrutamiento: [
    { tipo: 'controles', zona: 'consulta', fraccion: 1 },
    { tipo: 'noProgramadas', zona: 'consulta', fraccion: 0.6 },
    { tipo: 'noProgramadas', zona: 'prioritaria', fraccion: 0.4 },
    { tipo: 'urgencias', zona: 'prioritaria', fraccion: 0.6 },
    { tipo: 'urgencias', zona: 'red', fraccion: 0.4 },
    { tipo: 'hospitalizaciones', zona: 'red', fraccion: 1 },
    { tipo: 'laboratorio', zona: 'laboratorio', fraccion: 1 },
    { tipo: 'procedimientos', zona: 'procedimientos', fraccion: 1 },
    { tipo: 'controles', zona: 'admision', fraccion: 1 },
    { tipo: 'noProgramadas', zona: 'admision', fraccion: 1 },
    { tipo: 'urgencias', zona: 'admision', fraccion: 0.6 },
    { tipo: 'laboratorio', zona: 'admision', fraccion: 0.5 },
    { tipo: 'procedimientos', zona: 'admision', fraccion: 1 },
  ],
  desvioDomicilio: { controlesPorEstrato: [0.03, 0.08, 0.22, 0.65], laboratorio: 0.2, procedimientos: 0.35, noProgramadas: 0.1, visitasPorEquipo: 6.8 },
  multEstrato: {
    controles: [0.75, 1, 1.2, 1.5],
    noProgramadas: [0.7, 1, 1.4, 2],
    urgencias: [0.6, 1, 1.6, 2.8],
    hospitalizaciones: [0.5, 1, 1.8, 3.5],
    laboratorio: [0.8, 1, 1.2, 1.4],
    procedimientos: [0.6, 1, 1.5, 2],
  },
  rampaMeses: 3.5,
  reduccionInasistenciaRecordatorios: 0.04,
  semillaTerritorio: 7,
};

export const COSTOS_CANAL = { visitaDomiciliaria: 135000, teleconsulta: 32000 };
