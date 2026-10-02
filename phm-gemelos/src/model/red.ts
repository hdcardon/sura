import { COSTOS_CANAL } from '../data/catalogoBase.ts';
import { generarTerritorio } from '../data/territorio.ts';
import type { Catalogo, CeldaTerritorio, Escenario, Sede, TipoId, Zona } from '../data/tipos.ts';
import { conteoSobredisperso, mulberry32, percentil } from './aleatorio.ts';
import { DIAS_CALENDARIO, DIAS_OPERATIVOS, FACTOR_DIA_SEMANA, diasOperativos } from './calendario.ts';
import { colaGGc } from './colas.ts';
import type { ResultadoCola } from './colas.ts';
import { TIPOS, serieVacia, tasasCohorte } from './cohortes.ts';
import type { SerieTipos, TasasCohorte } from './cohortes.ts';

export type Estado = 'holgada' | 'tensionada' | 'saturada';
export const ORDEN_ESTADO: Record<Estado, number> = { holgada: 0, tensionada: 1, saturada: 2 };

export interface ZonaMes {
  zona: Zona;
  demandaDia: number; // atenciones efectivas por día operativo (o calendario)
  capacidadDia: number; // atenciones que la zona puede absorber por día
  utilizacion: number; // 0-1, acotada
  rho: number; // sin acotar
  diferidaDia: number;
  aporteCronicoDia: number;
  estado: Estado;
  indicador: { etiqueta: string; valor: string; numero: number };
  cola?: ResultadoCola; // hora pico, zonas espontáneas
  horario?: { hora: number; rho: number; esperaMin: number }[];
  oportunidad?: { p50: number; p90: number };
}

export interface SedeMes {
  zonas: Record<string, ZonaMes>;
  hospitalizacionesRed: number;
  urgenciasRed: number;
  peorEstado: Estado;
  saturadas: number;
}

export interface ResultadoSede {
  sede: Sede;
  escenario: Escenario;
  meses: SedeMes[];
  personasPorCohorte: Record<string, number>;
  adultos: number;
  volumenSQ: SerieTipos; // atenciones de las cohortes crónicas por mes, escenario regular
  volumenEsc: SerieTipos; // escenario, todos los canales
  domicilioMes: number[]; // visitas domiciliarias de las cohortes
  virtualMes: number[]; // atenciones virtuales de las cohortes
  fugaMes: number[];
  equiposDomiciliariosExtra: number;
  medicosVirtualesExtra: number;
  costoSQ: number;
  costoEsc: number;
  hospEvitadas: number;
  urgEvitadas: number;
}

const tasasCache = new Map<string, TasasCohorte>();
export function tasasCacheadas(cat: Catalogo, revision: number, cohorteId: string, c: number): TasasCohorte {
  const k = `${revision}|${cohorteId}|${c.toFixed(3)}`;
  let v = tasasCache.get(k);
  if (!v) {
    const co = cat.cohortes.find((x) => x.id === cohorteId)!;
    v = tasasCohorte(cat, co, c);
    tasasCache.set(k, v);
    if (tasasCache.size > 400) tasasCache.delete(tasasCache.keys().next().value!);
  }
  return v;
}

export function personasPorPerfil(cat: Catalogo, celdas: CeldaTerritorio[], sedeId?: string) {
  const propias = sedeId ? celdas.filter((c) => c.sedeId === sedeId) : celdas;
  const base = propias.reduce((a, c) => a + c.adultos * c.factorPrevalencia, 0);
  const adultos = propias.reduce((a, c) => a + c.adultos, 0);
  return {
    adultos,
    perfiles: cat.perfiles.map((p) => ({ ...p, n: (base * p.pctAdultos) / 100 })),
  };
}

const diasDe = (z: Zona, m: number) => (z.baseDias === 'calendario' ? DIAS_CALENDARIO[m] : DIAS_OPERATIVOS[m]);
const capacidadPorServidor = (z: Zona) => z.horas * (60 / z.servicioMin) * z.productividad;

// Oportunidad de asignación de citas: recursión de Lindley diaria con llegadas sobredispersas.
function oportunidadMC(cuposReqMes: number[], cuposOfDia: number, base: number, semilla: number, replicas = 120) {
  const dias = diasOperativos();
  const factorMedioMes = Array.from({ length: 12 }, (_, m) => {
    const ds = dias.filter((d) => d.mes === m);
    return ds.reduce((a, d) => a + FACTOR_DIA_SEMANA[d.diaSemana] * d.fraccion, 0) / ds.reduce((a, d) => a + d.fraccion, 0);
  });
  const r = mulberry32(semilla);
  const porMes: number[][] = Array.from({ length: 12 }, () => []);
  for (let k = 0; k < replicas; k++) {
    let B = 0;
    // Calentamiento con los parámetros de enero.
    for (let w = 0; w < 15; w++) B = Math.max(0, B + conteoSobredisperso(r, cuposReqMes[0], 60) - cuposOfDia);
    const acum = new Array(12).fill(0);
    const n = new Array(12).fill(0);
    for (const d of dias) {
      const media = (cuposReqMes[d.mes] * d.fraccion * FACTOR_DIA_SEMANA[d.diaSemana]) / factorMedioMes[d.mes];
      const S = cuposOfDia * d.fraccion;
      B = Math.max(0, B + conteoSobredisperso(r, media, 60) - S);
      acum[d.mes] += base + B / cuposOfDia;
      n[d.mes]++;
    }
    for (let m = 0; m < 12; m++) porMes[m].push(acum[m] / n[m]);
  }
  return porMes.map((xs) => ({ p50: percentil(xs, 0.5), p90: percentil(xs, 0.9) }));
}

const peor = (a: Estado, b: Estado): Estado => (ORDEN_ESTADO[a] >= ORDEN_ESTADO[b] ? a : b);

const resCache = new Map<string, ResultadoSede>();

export function calcularSede(cat: Catalogo, revision: number, sede: Sede, esc: Escenario, sq: Escenario): ResultadoSede {
  const clave = `${revision}|${sede.id}|${JSON.stringify(esc)}|${JSON.stringify(sq.cobertura)}`;
  const enCache = resCache.get(clave);
  if (enCache) return enCache;

  const celdas = generarTerritorio(cat.sedes, cat.semillaTerritorio);
  const { adultos, perfiles } = personasPorPerfil(cat, celdas, sede.id);
  const personasPorCohorte: Record<string, number> = {};
  for (const co of cat.cohortes) personasPorCohorte[co.id] = perfiles.filter((p) => p.cohortes.includes(co.id)).reduce((a, p) => a + p.n, 0);

  const tSQ: Record<string, TasasCohorte> = {};
  const tEsc: Record<string, TasasCohorte> = {};
  for (const co of cat.cohortes) {
    tSQ[co.id] = tasasCacheadas(cat, revision, co.id, sq.cobertura[co.id] ?? co.coberturaActual);
    tEsc[co.id] = tasasCacheadas(cat, revision, co.id, esc.cobertura[co.id] ?? co.coberturaActual);
  }

  // Demanda de perfiles con subaditividad por multimorbilidad.
  const volumen = (fuente: 'sq' | 'esc') => {
    const out = serieVacia();
    for (const tipo of cat.tipos) {
      for (let m = 0; m < 12; m++) {
        let v = 0;
        for (const p of perfiles) {
          const rs = p.cohortes
            .filter((c) => (fuente === 'sq' ? tSQ[c] : tEsc[c]))
            .map((c) => (fuente === 'sq' ? tSQ[c].sq : tEsc[c].esc)[tipo.id][m])
            .sort((a, b) => b - a);
          if (!rs.length) continue;
          v += p.n * (rs[0] + tipo.alfaMultimorbilidad * rs.slice(1).reduce((a, b) => a + b, 0));
        }
        out[tipo.id][m] = v;
      }
    }
    return out;
  };
  const volSQ = volumen('sq');
  const volEsc = volumen('esc');

  // Desvío a canales domiciliario y virtual (ponderado por el aporte de cada cohorte a cada tipo de atención).
  const peso = (tipo: TipoId, m: number) => {
    const ws = cat.cohortes.map((co) => personasPorCohorte[co.id] * tEsc[co.id].esc[tipo][m]);
    const s = ws.reduce((a, b) => a + b, 0) || 1;
    return ws.map((w) => w / s);
  };
  const domicilio = serieVacia();
  const virtual = serieVacia();
  const presencial = serieVacia();
  const fugaMes = new Array(12).fill(0);
  for (let m = 0; m < 12; m++) {
    for (const t of TIPOS) {
      const V = volEsc[t][m];
      let fDom = 0;
      let fVir = 0;
      let fuga = 0;
      if (esc.domicilio) {
        if (t === 'controles') {
          const w = peso(t, m);
          fDom = cat.cohortes.reduce((a, co, i) => a + w[i] * tEsc[co.id].dinEsc.medio[m].reduce((x, p, s) => x + p * cat.desvioDomicilio.controlesPorEstrato[s], 0), 0);
        } else if (t === 'laboratorio') fDom = cat.desvioDomicilio.laboratorio;
        else if (t === 'procedimientos') fDom = cat.desvioDomicilio.procedimientos;
        else if (t === 'noProgramadas') fDom = cat.desvioDomicilio.noProgramadas;
      }
      if (esc.virtual && (t === 'controles' || t === 'noProgramadas')) {
        const w = peso(t, m);
        fVir = cat.cohortes.reduce((a, co, i) => a + w[i] * co.virtual[t], 0);
        fuga = cat.cohortes.reduce((a, co, i) => a + w[i] * co.virtual.fuga, 0);
      }
      domicilio[t][m] = V * fDom;
      virtual[t][m] = (V - domicilio[t][m]) * fVir;
      presencial[t][m] = V - domicilio[t][m] - virtual[t][m];
      fugaMes[m] += virtual[t][m] * fuga;
    }
  }
  const domicilioMes = Array.from({ length: 12 }, (_, m) =>
    domicilio.controles[m] + domicilio.noProgramadas[m] + domicilio.procedimientos[m] + 0.4 * domicilio.laboratorio[m],
  );
  const virtualMes = Array.from({ length: 12 }, (_, m) => virtual.controles[m] + virtual.noProgramadas[m]);

  // Demanda crónica enrutada por zona (atenciones por mes).
  const enrutar = (fuente: SerieTipos, z: string, m: number) =>
    cat.enrutamiento.filter((e) => e.zona === z).reduce((a, e) => a + fuente[e.tipo][m] * e.fraccion, 0);

  const ns = Math.max(0, sede.inasistencia - (esc.recordatorios ? cat.reduccionInasistenciaRecordatorios : 0));

  // Equipos domiciliarios y médicos virtuales adicionales.
  const zDom = sede.zonas.find((z) => z.tipo === 'domiciliaria');
  let equiposExtra = 0;
  if (zDom && esc.domicilio) {
    const capBase = zDom.servidores * capacidadPorServidor(zDom);
    let pico = 0;
    for (let m = 0; m < 12; m++) pico = Math.max(pico, zDom.demandaObservada * zDom.estacionalidad[m] + domicilioMes[m] / diasDe(zDom, m));
    equiposExtra = Math.ceil(Math.max(0, pico - 0.88 * capBase) / capacidadPorServidor(zDom));
  }
  const medicosExtra = esc.virtual ? esc.medicosVirtuales : 0;

  const oportunidades: Record<string, { p50: number; p90: number }[]> = {};
  const meses: SedeMes[] = [];

  // Pre-cálculo de demanda por zona y mes.
  const lam: Record<string, number[]> = {};
  const cronico: Record<string, number[]> = {};
  for (const z of sede.zonas) {
    lam[z.id] = [];
    cronico[z.id] = [];
    for (let m = 0; m < 12; m++) {
      const dias = diasDe(z, m);
      const obs = z.demandaObservada * z.estacionalidad[m];
      let cSQ = 0;
      let cE = 0;
      if (z.tipo === 'domiciliaria') cE = domicilioMes[m] / dias;
      else if (z.tipo === 'virtual') cE = virtualMes[m] / dias;
      else {
        cSQ = enrutar(volSQ, z.id, m) / dias;
        cE = enrutar(presencial, z.id, m) / dias;
        if (z.id === 'consulta' || z.id === 'admision') cE += fugaMes[m] / dias;
      }
      const residual = Math.max(0.15 * obs, obs - cSQ);
      lam[z.id].push(residual + cE);
      cronico[z.id].push(cE);
    }
    if (z.tipo === 'agendada') {
      const capDia = z.servidores * capacidadPorServidor(z) * (1 + sede.sobreagenda);
      const req = lam[z.id].map((l) => l / (1 - ns));
      const semilla = [...`${sede.id}${z.id}`].reduce((a, ch) => a + ch.charCodeAt(0), 0) + Math.round(req[0]);
      oportunidades[z.id] = oportunidadMC(req, capDia, z.id === 'consulta' ? sede.oportunidadBaseDias : 1.5, semilla);
    }
  }

  for (let m = 0; m < 12; m++) {
    const zonas: Record<string, ZonaMes> = {};
    let peorE: Estado = 'holgada';
    let saturadas = 0;
    for (const z of sede.zonas) {
      const demandaDia = lam[z.id][m];
      let zm: ZonaMes;
      if (z.tipo === 'agendada') {
        const cuposOf = z.servidores * capacidadPorServidor(z) * (1 + sede.sobreagenda);
        const capacidadDia = cuposOf * (1 - ns);
        const rho = demandaDia / capacidadDia;
        const op = oportunidades[z.id][m];
        const meta = z.meta.esperaMin;
        const estado: Estado = op.p90 > 1.5 * meta || rho >= 1 ? 'saturada' : op.p90 > meta || rho >= 0.85 ? 'tensionada' : 'holgada';
        zm = {
          zona: z, demandaDia, capacidadDia, rho, utilizacion: Math.min(1, rho), diferidaDia: Math.max(0, demandaDia - capacidadDia),
          aporteCronicoDia: cronico[z.id][m], estado, oportunidad: op,
          indicador: { etiqueta: 'Oportunidad de cita P90', valor: `${op.p90.toFixed(1).replace('.', ',')} días`, numero: op.p90 },
        };
      } else if (z.tipo === 'espontanea') {
        const mu = 60 / z.servicioMin;
        const perfil = z.perfilHorario ?? new Array(24).fill(1 / z.horas);
        const horario = perfil
          .map((f, h) => ({ h, f }))
          .filter((x) => x.f > 0)
          .map(({ h, f }) => {
            const c = colaGGc(demandaDia * f, mu, z.servidores, z.meta.esperaMin);
            return { hora: h, rho: c.rho, esperaMin: c.esperaMediaMin, cola: c };
          });
        const pico = horario.reduce((a, b) => (b.rho > a.rho ? b : a));
        const capacidadDia = z.servidores * mu * z.horas;
        const p = pico.cola.pSuperaMeta;
        const estado: Estado = !pico.cola.estable || p > 2 * z.meta.pMax ? 'saturada' : p > z.meta.pMax ? 'tensionada' : 'holgada';
        zm = {
          zona: z, demandaDia, capacidadDia, rho: pico.rho, utilizacion: Math.min(1, pico.rho), diferidaDia: Math.max(0, demandaDia - capacidadDia),
          aporteCronicoDia: cronico[z.id][m], estado, cola: pico.cola,
          horario: horario.map(({ hora, rho, esperaMin }) => ({ hora, rho, esperaMin })),
          indicador: {
            etiqueta: `Espera mayor a ${z.meta.esperaMin} min en hora pico`,
            valor: pico.cola.estable ? `${Math.round(p * 100)} %` : 'Cola inestable',
            numero: p,
          },
        };
      } else {
        const extra = z.tipo === 'domiciliaria' ? equiposExtra : medicosExtra;
        const capacidadDia = (z.servidores + extra) * capacidadPorServidor(z);
        const rho = demandaDia / capacidadDia;
        const estado: Estado = rho >= 0.95 ? 'saturada' : rho >= 0.8 ? 'tensionada' : 'holgada';
        zm = {
          zona: z, demandaDia, capacidadDia, rho, utilizacion: Math.min(1, rho), diferidaDia: Math.max(0, demandaDia - capacidadDia),
          aporteCronicoDia: cronico[z.id][m], estado,
          indicador: { etiqueta: 'Utilización', valor: `${Math.round(Math.min(1, rho) * 100)} %`, numero: rho },
        };
      }
      zonas[z.id] = zm;
      peorE = peor(peorE, zm.estado);
      if (zm.estado === 'saturada') saturadas++;
    }
    meses.push({
      zonas,
      hospitalizacionesRed: volEsc.hospitalizaciones[m],
      urgenciasRed: volEsc.urgencias[m] * 0.4,
      peorEstado: peorE,
      saturadas,
    });
  }

  // Costo médico de las cohortes (sintético).
  const costo = (fuente: SerieTipos, dom: number[], vir: number[], presencialSerie: SerieTipos) => {
    let total = 0;
    for (const tipo of cat.tipos) for (let m = 0; m < 12; m++) total += presencialSerie[tipo.id][m] * tipo.costoUnitario;
    for (let m = 0; m < 12; m++) total += dom[m] * COSTOS_CANAL.visitaDomiciliaria + vir[m] * COSTOS_CANAL.teleconsulta;
    void fuente;
    return total;
  };
  const presencialConFuga = serieVacia();
  for (const t of TIPOS) for (let m = 0; m < 12; m++) presencialConFuga[t][m] = presencial[t][m] + (t === 'noProgramadas' ? fugaMes[m] : 0);
  const cero = new Array(12).fill(0);
  const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  const res: ResultadoSede = {
    sede, escenario: esc, meses, personasPorCohorte, adultos,
    volumenSQ: volSQ, volumenEsc: volEsc, domicilioMes, virtualMes, fugaMes,
    equiposDomiciliariosExtra: equiposExtra, medicosVirtualesExtra: medicosExtra,
    costoSQ: costo(volSQ, cero, cero, volSQ),
    costoEsc: costo(volEsc, domicilioMes, virtualMes, presencialConFuga),
    hospEvitadas: suma(volSQ.hospitalizaciones) - suma(volEsc.hospitalizaciones),
    urgEvitadas: suma(volSQ.urgencias) - suma(volEsc.urgencias),
  };
  resCache.set(clave, res);
  if (resCache.size > 120) resCache.delete(resCache.keys().next().value!);
  return res;
}

export function mesCritico(r: ResultadoSede): number {
  let mejor = 0;
  let valor = -1;
  r.meses.forEach((mm, i) => {
    const v = mm.saturadas * 10 + Object.values(mm.zonas).reduce((a, z) => a + z.utilizacion, 0);
    if (v > valor) {
      valor = v;
      mejor = i;
    }
  });
  return mejor;
}
