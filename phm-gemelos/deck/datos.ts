// Extrae del modelo del portal las cifras que usa el deck, para que ambos queden consistentes.
import { writeFileSync } from 'node:fs';
import { CATALOGO_BASE } from '../src/data/catalogoBase.ts';
import { escenariosBase } from '../src/data/escenariosBase.ts';
import { calcularSede, personasPorPerfil, mesCritico } from '../src/model/red.ts';
import { generarTerritorio } from '../src/data/territorio.ts';
import { proyectarCohorte } from '../src/model/cohortes.ts';
const cat = CATALOGO_BASE;
const esc = escenariosBase(cat);
const sq = esc[0];
const out: any = { escenarios: [], cohortes: [] };
for (const e of esc) {
  const red = cat.sedes.map((s) => calcularSede(cat, 1, s, e, sq));
  const suma = (f: (r: any) => number) => red.reduce((a, r) => a + f(r), 0);
  const norte = red.find((r) => r.sede.id === 'norte')!;
  out.escenarios.push({
    id: e.id, nombre: e.nombre,
    hosp: suma((r) => r.hospEvitadas), urg: suma((r) => r.urgEvitadas), costo: suma((r) => r.costoEsc - r.costoSQ),
    mesesSat: suma((r) => r.meses.filter((m: any) => m.peorEstado === 'saturada').length),
    opMax: Math.max(...red.flatMap((r) => r.meses.map((m: any) => m.zonas.consulta.oportunidad.p90))),
    consMax: Math.max(...red.flatMap((r) => r.meses.map((m: any) => m.zonas.consulta.utilizacion))),
    dom: suma((r) => r.domicilioMes.reduce((a: number, b: number) => a + b, 0)),
    vir: suma((r) => r.virtualMes.reduce((a: number, b: number) => a + b, 0)),
    equipos: suma((r) => r.equiposDomiciliariosExtra),
    norteConsulta: norte.meses.map((m: any) => +(m.zonas.consulta.rho * 100).toFixed(1)),
    norteCritico: mesCritico(norte),
    hospTotal: suma((r) => r.volumenSQ.hospitalizaciones.reduce((a: number, b: number) => a + b, 0)),
    urgTotal: suma((r) => r.volumenSQ.urgencias.reduce((a: number, b: number) => a + b, 0)),
    costoTotal: suma((r) => r.costoSQ),
  });
}
const cel = generarTerritorio(cat.sedes, cat.semillaTerritorio);
const { perfiles, adultos } = personasPorPerfil(cat, cel);
out.adultos = adultos; out.celdas = cel.length;
for (const co of cat.cohortes) {
  const n = perfiles.filter((p) => p.cohortes.includes(co.id)).reduce((a, p) => a + p.n, 0);
  const pr = proyectarCohorte(cat, co, Math.round(n), esc[1].cobertura[co.id]);
  out.cohortes.push({ id: co.id, nombre: co.nombre, n, cobVig: co.coberturaActual, cobAmp: esc[1].cobertura[co.id],
    ctrlHoy: co.distInicial[0], ctrlSQ: pr.central.dinSQ.inicio[12][0], ctrlAmp: pr.central.dinEsc.inicio[12][0],
    hosp: pr.hospCSCAEvitadas, urg: pr.urgenciasEvitadas, csca: co.fraccionCSCA });
}
out.union = perfiles.reduce((a, p) => a + p.n, 0);
out.multi = perfiles.filter((p) => p.cohortes.length > 1).reduce((a, p) => a + p.n, 0);
writeFileSync(new URL('./datos.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.escenarios.map((e: any) => ({ id: e.id, hosp: Math.round(e.hosp), urg: Math.round(e.urg), costoM: Math.round(e.costo / 1e6), sat: e.mesesSat, op: e.opMax.toFixed(1), cons: e.consMax.toFixed(2), dom: Math.round(e.dom), vir: Math.round(e.vir), eq: e.equipos, crit: e.norteCritico }))));
console.log(JSON.stringify(out.cohortes.map((c: any) => ({ id: c.id, n: Math.round(c.n), ctrl: [c.ctrlHoy, c.ctrlSQ.toFixed(3), c.ctrlAmp.toFixed(3)], hosp: [c.hosp.p10.toFixed(1), c.hosp.p50.toFixed(1), c.hosp.p90.toFixed(1)], urg: c.urg.p50.toFixed(0) }))));
console.log('adultos', adultos, 'union', Math.round(out.union), 'multi', Math.round(out.multi), 'SQ hosp', Math.round(out.escenarios[0].hospTotal), 'urg', Math.round(out.escenarios[0].urgTotal), 'costo M', Math.round(out.escenarios[0].costoTotal/1e6));
