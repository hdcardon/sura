// Tipos del catálogo del portal. Todo lo que aparece en selectores, tablas y modelos se deriva de estos catálogos,
// de modo que agregar una cohorte, una sede, una zona o un escenario es un cambio de datos.

export type TipoId = 'controles' | 'noProgramadas' | 'urgencias' | 'hospitalizaciones' | 'laboratorio' | 'procedimientos';
export type Estratos4 = [number, number, number, number];
export type Matriz4 = [Estratos4, Estratos4, Estratos4, Estratos4];
export type Mes12 = number[];

export interface TipoAtencion {
  id: TipoId;
  nombre: string;
  costoUnitario: number; // COP, sintético
  alfaMultimorbilidad: number; // fracción que se suma por cada condición adicional (subaditividad)
}

export interface Rango {
  min: number;
  moda: number;
  max: number;
}

export interface Cohorte {
  id: string;
  nombre: string;
  ruta: string;
  nota: string;
  estratos: { nombre: string; criterio: string }[]; // 4 estratos ordinales
  distInicial: Estratos4;
  transicionSin: Matriz4; // anual, sin gestión del riesgo (filas suman 1 - salida)
  transicionCon: Matriz4; // anual, con gestión del riesgo a cobertura plena
  salida: Estratos4; // salida anual por mortalidad o traslado
  tasasNoControlado: Record<TipoId, number>; // por 1.000 personas al mes, estrato de referencia
  estacionalidad: Mes12; // para no programadas, urgencias y hospitalizaciones (media 1)
  fraccionCSCA: number; // hospitalizaciones por condiciones sensibles al cuidado ambulatorio
  efectoResidual: Partial<Record<TipoId, Rango>>; // efecto intraestrato a cobertura plena
  coberturaActual: number; // cobertura vigente del programa (statu quo)
  virtual: { controles: number; noProgramadas: number; fuga: number }; // resolubles por telemedicina y fuga a presencial
  indicadorControl: string; // cómo se reporta el estrato controlado
}

export interface PerfilMultimorbilidad {
  cohortes: string[]; // intersección exclusiva
  pctAdultos: number; // % de adultos adscritos
}

export type TipoZona = 'agendada' | 'espontanea' | 'domiciliaria' | 'virtual';
export type BaseDias = 'operativos' | 'calendario';

export interface Zona {
  id: string; // plantilla de layout: consulta, prioritaria, laboratorio, procedimientos, admision, domiciliaria, virtual
  nombre: string;
  tipo: TipoZona;
  servidores: number;
  horas: number; // horas de operación al día
  servicioMin: number; // minutos por atención (visitas por equipo al día en domiciliaria)
  productividad: number; // fracción de la jornada en atención directa
  baseDias: BaseDias;
  demandaObservada: number; // atenciones efectivas por día en el statu quo (media anual)
  estacionalidad: Mes12;
  meta: { esperaMin: number; pMax: number }; // espontáneas: P(W > esperaMin) <= pMax
  perfilHorario?: number[]; // 24 valores, suma 1
  equipos: { nombre: string; total: number }[];
}

export interface Sede {
  id: string;
  nombre: string;
  hex: [number, number]; // coordenadas axiales en el territorio
  adultosObjetivo: number; // adultos adscritos
  inasistencia: number;
  sobreagenda: number;
  oportunidadBaseDias: number; // tiempo mínimo de asignación sin backlog
  zonas: Zona[];
}

export interface Enrutamiento {
  tipo: TipoId;
  zona: string; // id de plantilla de zona o 'red' para red hospitalaria
  fraccion: number;
}

export interface Escenario {
  id: string;
  nombre: string;
  bloqueado?: boolean;
  cobertura: Record<string, number>;
  domicilio: boolean;
  virtual: boolean;
  medicosVirtuales: number;
  recordatorios: boolean;
}

export interface CeldaTerritorio {
  id: string;
  q: number;
  r: number;
  adultos: number;
  factorPrevalencia: number;
  sedeId: string;
  minutosASede: number;
}

export interface Catalogo {
  version: string;
  tipos: TipoAtencion[];
  cohortes: Cohorte[];
  perfiles: PerfilMultimorbilidad[];
  sedes: Sede[];
  enrutamiento: Enrutamiento[];
  desvioDomicilio: { controlesPorEstrato: Estratos4; laboratorio: number; procedimientos: number; noProgramadas: number; visitasPorEquipo: number };
  multEstrato: Record<TipoId, Estratos4>;
  rampaMeses: number;
  reduccionInasistenciaRecordatorios: number;
  semillaTerritorio: number;
}
