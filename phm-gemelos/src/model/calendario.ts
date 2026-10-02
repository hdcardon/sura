// Calendario operativo 2027 con festivos de Colombia (Ley 51 de 1983 y Ley 35 de 1939).
export const ANIO = 2027;
export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const FESTIVOS_2027 = [
  '2027-01-01', '2027-01-11', '2027-03-22', '2027-03-25', '2027-03-26', '2027-05-01', '2027-05-10', '2027-05-31',
  '2027-06-07', '2027-07-05', '2027-07-20', '2027-08-07', '2027-08-16', '2027-10-18', '2027-11-01', '2027-11-15',
  '2027-12-08', '2027-12-25',
];

export interface DiaOperativo {
  mes: number;
  diaSemana: number; // 1 lunes ... 6 sábado
  fraccion: number; // 1 día completo, 0,5 sábado
}

const festivos = new Set(FESTIVOS_2027);
const iso = (d: Date) => d.toISOString().slice(0, 10);

let cache: DiaOperativo[] | null = null;
export function diasOperativos(): DiaOperativo[] {
  if (cache) return cache;
  const out: DiaOperativo[] = [];
  for (let d = new Date(Date.UTC(ANIO, 0, 1)); d.getUTCFullYear() === ANIO; d = new Date(d.getTime() + 864e5)) {
    const ds = d.getUTCDay();
    if (ds === 0 || festivos.has(iso(d))) continue;
    out.push({ mes: d.getUTCMonth(), diaSemana: ds, fraccion: ds === 6 ? 0.5 : 1 });
  }
  cache = out;
  return out;
}

// Días operativos equivalentes por mes (hábiles más medio día por sábado).
export const DIAS_OPERATIVOS = Array.from({ length: 12 }, (_, m) =>
  diasOperativos()
    .filter((d) => d.mes === m)
    .reduce((a, d) => a + d.fraccion, 0),
);
export const DIAS_HABILES = Array.from({ length: 12 }, (_, m) => diasOperativos().filter((d) => d.mes === m && d.diaSemana < 6).length);
export const DIAS_CALENDARIO = Array.from({ length: 12 }, (_, m) => new Date(Date.UTC(ANIO, m + 1, 0)).getUTCDate());

// Concentración de solicitudes de cita por día de la semana (lunes más alto).
export const FACTOR_DIA_SEMANA: Record<number, number> = { 1: 1.2, 2: 1.05, 3: 1.0, 4: 0.95, 5: 0.9, 6: 0.6 };
