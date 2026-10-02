import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COHORTES, MESES, SEDE } from '../../data/supuestos.ts';
import type { TipoAtencion } from '../../data/supuestos.ts';
import { useProyeccion, useSim } from '../../store/simulacion.ts';
import { n0, n1, pct } from '../ui/formato.ts';

const C = {
  grid: '#26365f',
  eje: '#97a6c1',
  base: '#c3cde0',
  gestion: '#00dfed',
  casa: '#19a3fc',
  urg: '#e0a32e',
  hosp: '#d1495b',
};

const NOMBRE_TIPO: Record<TipoAtencion, string> = {
  controles: 'Controles programados',
  noProgramadas: 'Consultas no programadas',
  urgencias: 'Urgencias',
  hospitalizaciones: 'Hospitalizaciones',
  laboratorio: 'Laboratorio',
  procedimientos: 'Procedimientos e infusión',
};

const ESTRATOS = [
  { nombre: 'Controlado', color: '#2e9e6b' },
  { nombre: 'No controlado', color: '#19a3fc' },
  { nombre: 'Complicado', color: '#e0a32e' },
  { nombre: 'Alto riesgo', color: '#d1495b' },
];

const tooltipStyle = {
  contentStyle: { background: '#0a1430', border: '1px solid #26365f', borderRadius: 6, fontSize: 12, color: '#e6edf7' },
  labelStyle: { color: '#e6edf7', fontWeight: 600 },
  itemStyle: { padding: 0 },
};

export default function DemoPoblacional() {
  const p = useProyeccion();
  const s = useSim();
  const sec = s.saludEnCasa;

  const presencial = (m: number, conGestion: boolean) => {
    const serie = conGestion ? p.gestion : p.base;
    const tipos: TipoAtencion[] = ['controles', 'noProgramadas', 'urgencias', 'laboratorio', 'procedimientos'];
    return tipos.reduce((a, t) => a + serie[t][m] - (conGestion && sec ? p.desvio[t][m] : 0), 0);
  };

  const datos = MESES.map((mes, m) => ({
    mes,
    sin: Math.round(presencial(m, false)),
    con: Math.round(presencial(m, true)),
    casa: sec ? Math.round(p.visitasDomiciliariasMes[m]) : 0,
    urgSin: Math.round(p.base.urgencias[m]),
    urgCon: Math.round(p.gestion.urgencias[m]),
    hospSin: +p.base.hospitalizaciones[m].toFixed(1),
    hospCon: +p.gestion.hospitalizaciones[m].toFixed(1),
  }));

  const picoSin = presencial(p.mesPico, false) / SEDE.diasHabiles;
  const picoCon = presencial(p.mesPico, true) / SEDE.diasHabiles;

  return (
    <section className="banda seccion-paso" id="gemelo-poblacional" aria-labelledby="demo-a-t">
      <div className="contenedor">
        <div className="intro lectura">
          <span className="etiqueta-demo">Demo A, gemelo poblacional</span>
          <h2 id="demo-a-t">Demanda proyectada de una cohorte crónica</h2>
          <p>
            El gemelo poblacional estima mes a mes las atenciones que va a requerir una cohorte según su tamaño, su
            estratificación y la cobertura del programa de gestión del riesgo. En AlejandrIA este cálculo corre como consulta
            federada sobre los datos OMOP de cada Data Partner, sin centralizar registros individuales.
          </p>
        </div>

        <div className="demo-a">
          <div className="panel controles">
            <div className="campo">
              <span className="rotulo" id="rot-cohorte">Cohorte</span>
              <div className="chips" role="group" aria-labelledby="rot-cohorte">
                {COHORTES.map((c) => (
                  <button key={c.id} type="button" className="chip" aria-pressed={c.id === s.cohorteId} onClick={() => s.setCohorte(c.id)}>
                    {c.nombre}
                  </button>
                ))}
              </div>
              <small>
                {p.cohorte.ruta}. {p.cohorte.nota}
              </small>
            </div>

            <div className="campo">
              <label htmlFor="tamano">
                Personas en la cohorte <output htmlFor="tamano">{n0(p.tamano)}</output>
              </label>
              <input
                id="tamano"
                type="range"
                min={p.cohorte.tamanoMin}
                max={p.cohorte.tamanoMax}
                step={100}
                value={p.tamano}
                onChange={(e) => s.setTamano(+e.target.value)}
              />
              <small>Adscritas a la sede de referencia, de {n0(SEDE.adscritos)} afiliados.</small>
            </div>

            <div className="campo">
              <label htmlFor="cobertura">
                Cobertura de la gestión del riesgo <output htmlFor="cobertura">{pct(s.intervencion)}</output>
              </label>
              <input
                id="cobertura"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={s.intervencion}
                onChange={(e) => s.setIntervencion(+e.target.value)}
              />
              <small>Proporción de la cohorte enrolada y adherente al programa.</small>
            </div>

            <label className="interruptor" htmlFor="sec-a">
              <input id="sec-a" type="checkbox" checked={sec} onChange={(e) => s.setSaludEnCasa(e.target.checked)} />
              <span>
                Incluir Salud en Casa en la gestión
                <small>Los equipos domiciliarios asumen parte de los controles, las tomas de muestra y las consultas no programadas.</small>
              </span>
            </label>

            <button type="button" className="enlace-boton" onClick={s.reiniciar}>
              Restablecer los valores iniciales
            </button>

            <details className="supuestos">
              <summary>Ver supuestos de la cohorte</summary>
              <div className="tabla-scroll">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Atención</th>
                      <th className="d">Por 1.000 al mes</th>
                      <th className="d">Efecto máx.</th>
                      <th className="d">En casa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(p.cohorte.tasas) as TipoAtencion[]).map((t) => (
                      <tr key={t}>
                        <td>{NOMBRE_TIPO[t]}</td>
                        <td className="d">{n1(p.cohorte.tasas[t])}</td>
                        <td className="d">{p.cohorte.efectoMax[t] ? `${p.cohorte.efectoMax[t]! > 0 ? '+' : ''}${n0(p.cohorte.efectoMax[t]! * 100)} %` : 'n. a.'}</td>
                        <td className="d">{p.cohorte.desvioSaludEnCasa[t] ? `${n0(p.cohorte.desvioSaludEnCasa[t]! * 100)} %` : 'n. a.'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>

          <div className="demo-a-graficas">
            <dl className="kpis">
              <div className="kpi">
                <dt>Hospitalizaciones evitadas en el año</dt>
                <dd className="num">{n0(p.hospitalizacionesEvitadasAnio)}</dd>
              </div>
              <div className="kpi">
                <dt>Atenciones de urgencias evitadas en el año</dt>
                <dd className="num">{n0(p.urgenciasEvitadasAnio)}</dd>
              </div>
              <div className="kpi">
                <dt>Atenciones presenciales por día hábil en {MESES[p.mesPico]}, con gestión</dt>
                <dd className="num">
                  {n0(picoCon)}
                  <small>sin gestión {n0(picoSin)}</small>
                </dd>
              </div>
              <div className="kpi">
                <dt>Equipos de Salud en Casa adicionales para el pico</dt>
                <dd className="num">
                  {sec ? n0(p.equiposAdicionales) : '0'}
                  <small>{sec ? `${n0(p.equiposAdicionales * SEDE.visitasPorEquipoDia)} visitas/día` : 'sin desvío a casa'}</small>
                </dd>
              </div>
            </dl>

            <div className="graficas-par">
              <figure className="panel" style={{ margin: 0 }}>
                <figcaption>
                  <div className="panel-titulo">Atenciones presenciales de la cohorte por mes</div>
                  <div className="panel-sub">Consultas, urgencias, laboratorio y procedimientos en la sede, 2027</div>
                </figcaption>
                <div style={{ height: 250, marginTop: 10 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={datos} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis dataKey="mes" stroke={C.eje} tick={{ fontSize: 11, fill: C.eje }} tickLine={false} axisLine={{ stroke: C.grid }} />
                      <YAxis stroke={C.eje} tick={{ fontSize: 11, fill: C.eje }} tickLine={false} axisLine={false} tickFormatter={(v) => n0(v)} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => n0(v)} />
                      <Bar dataKey="casa" name="Visitas de Salud en Casa" fill={C.casa} fillOpacity={0.55} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                      <Line dataKey="sin" name="Sin gestión del riesgo" stroke={C.base} strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line dataKey="con" name="Con gestión del riesgo" stroke={C.gestion} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="leyenda">
                  <span><i style={{ background: C.base }} />Sin gestión del riesgo</span>
                  <span><i style={{ background: C.gestion }} />Con gestión del riesgo</span>
                  {sec && <span><i style={{ background: C.casa, height: 8 }} />Visitas de Salud en Casa</span>}
                </div>
              </figure>

              <figure className="panel" style={{ margin: 0 }}>
                <figcaption>
                  <div className="panel-titulo">Urgencias y hospitalizaciones</div>
                  <div className="panel-sub">Eventos de la cohorte por mes</div>
                </figcaption>
                <div style={{ height: 250, marginTop: 10 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={datos} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis dataKey="mes" stroke={C.eje} tick={{ fontSize: 11, fill: C.eje }} tickLine={false} axisLine={{ stroke: C.grid }} interval={1} />
                      <YAxis stroke={C.eje} tick={{ fontSize: 11, fill: C.eje }} tickLine={false} axisLine={false} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => n1(v)} />
                      <Line dataKey="urgSin" name="Urgencias sin gestión" stroke={C.urg} strokeOpacity={0.45} strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line dataKey="urgCon" name="Urgencias con gestión" stroke={C.urg} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                      <Line dataKey="hospSin" name="Hospitalizaciones sin gestión" stroke={C.hosp} strokeOpacity={0.45} strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line dataKey="hospCon" name="Hospitalizaciones con gestión" stroke={C.hosp} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="leyenda">
                  <span><i style={{ background: C.urg }} />Urgencias</span>
                  <span><i style={{ background: C.hosp }} />Hospitalizaciones</span>
                  <span>Trazo tenue sin gestión</span>
                </div>
              </figure>
            </div>

            <div className="panel estratos">
              <div>
                <div className="panel-titulo">Estratificación de la cohorte</div>
                <div className="panel-sub">Distribución por nivel de control a 12 meses con la cobertura seleccionada</div>
              </div>
              {[
                { nombre: 'Línea base', v: p.cohorte.estratos },
                { nombre: 'Con gestión', v: p.estratosGestion },
              ].map((fila) => (
                <div className="estrato-fila" key={fila.nombre}>
                  <span>{fila.nombre}</span>
                  <div className="barra" role="img" aria-label={`${fila.nombre}: ${fila.v.map((x, i) => `${ESTRATOS[i].nombre} ${pct(x)}`).join(', ')}`}>
                    {fila.v.map((x, i) => (
                      <span key={i} style={{ width: `${x * 100}%`, background: ESTRATOS[i].color }} title={`${ESTRATOS[i].nombre} ${pct(x)}`} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="leyenda" style={{ marginTop: 0 }}>
                {ESTRATOS.map((e, i) => (
                  <span key={e.nombre}>
                    <i style={{ background: e.color, height: 8 }} />
                    {e.nombre} {pct(p.estratosGestion[i])}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
