import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MESES } from '../model/calendario.ts';
import { calcularSede } from '../model/red.ts';
import type { ResultadoSede } from '../model/red.ts';
import { usePortal } from '../store/portal.ts';
import { conSigno, millones, n0, n1, pct } from '../ui/formato.tsx';
import Selector from '../ui/Selector.tsx';

const COLORES = ['var(--tinta-3)', 'var(--acento)', '#2e9e6b', '#d1495b', '#8a6fd1', '#d99a22'];

export default function Escenarios() {
  const s = usePortal();
  const cat = s.catalogo;
  const editado = s.escenarios.find((e) => e.id === s.escenarioId) ?? s.escenarios[0];
  const sq = s.escenarios.find((e) => e.id === 'sq')!;
  const bloqueado = !!editado.bloqueado;

  const comparados = s.comparar.map((id) => s.escenarios.find((e) => e.id === id)).filter(Boolean) as typeof s.escenarios;
  const resultados = useMemo(
    () => comparados.map((e) => ({ e, red: cat.sedes.map((sd) => calcularSede(cat, s.revision, sd, e, sq)) })),
    [comparados, cat, s.revision, sq],
  );

  const suma = (red: ResultadoSede[], f: (r: ResultadoSede) => number) => red.reduce((a, r) => a + f(r), 0);
  const filas: { nombre: string; f: (red: ResultadoSede[]) => string }[] = [
    { nombre: 'Hospitalizaciones CSCA evitadas', f: (red) => conSigno(suma(red, (r) => r.hospEvitadas), n0) },
    { nombre: 'Urgencias evitadas', f: (red) => conSigno(suma(red, (r) => r.urgEvitadas), n0) },
    { nombre: 'Costo médico de las cohortes frente al escenario regular', f: (red) => conSigno(-suma(red, (r) => r.costoSQ - r.costoEsc), millones) },
    { nombre: 'Meses-sede con alguna zona saturada', f: (red) => `${suma(red, (r) => r.meses.filter((m) => m.peorEstado === 'saturada').length)} de ${red.length * 12}` },
    { nombre: 'Oportunidad de cita P90 máxima', f: (red) => `${n1(Math.max(...red.flatMap((r) => r.meses.map((m) => m.zonas.consulta.oportunidad!.p90))))} días` },
    { nombre: 'Utilización máxima de consulta externa', f: (red) => pct(Math.max(...red.flatMap((r) => r.meses.map((m) => m.zonas.consulta.utilizacion)))) },
    { nombre: 'Visitas domiciliarias de cohortes en el año', f: (red) => n0(suma(red, (r) => r.domicilioMes.reduce((a, b) => a + b, 0))) },
    { nombre: 'Atenciones virtuales de cohortes en el año', f: (red) => n0(suma(red, (r) => r.virtualMes.reduce((a, b) => a + b, 0))) },
    { nombre: 'Equipos domiciliarios adicionales', f: (red) => n0(suma(red, (r) => r.equiposDomiciliariosExtra)) },
  ];

  const serieSede = s.sedeId;
  const datos = MESES.map((m, i) => {
    const fila: Record<string, number | string> = { mes: m };
    resultados.forEach(({ e, red }) => {
      const r = red.find((x) => x.sede.id === serieSede)!;
      fila[e.id] = Math.round(r.meses[i].zonas.consulta.utilizacion * 1000) / 10;
    });
    return fila;
  });

  return (
    <div className="modulo">
      <div className="rejilla-escenarios">
        <section className="panel" aria-labelledby="edit-t">
          <div className="panel-cabeza fila">
            <div>
              <h2 id="edit-t">Configuración del escenario</h2>
              <p>{bloqueado ? 'El escenario regular refleja la cobertura vigente y no se edita. Duplíquelo para crear una variante.' : 'Los cambios se aplican de inmediato en todos los módulos.'}</p>
            </div>
          </div>
          <div className="barra-modulo" style={{ marginBottom: 12 }}>
            <Selector
              etiqueta="Escenario"
              valor={editado.id}
              opciones={s.escenarios.map((e) => ({ valor: e.id, etiqueta: e.nombre, grupo: e.bloqueado ? 'Base' : 'Escenarios' }))}
              onCambio={(v) => s.set({ escenarioId: v })}
              ancho={260}
            />
            <div className="grupo-botones">
              <button type="button" className="boton sec" onClick={() => s.duplicarEscenario(editado.id)}>Duplicar</button>
              <button type="button" className="boton sec" onClick={s.nuevoEscenario}>Nuevo escenario</button>
              {!bloqueado && (
                <button type="button" className="boton peligro" onClick={() => s.eliminarEscenario(editado.id)}>
                  Eliminar
                </button>
              )}
            </div>
          </div>
          <fieldset className="formulario" disabled={bloqueado}>
            <label className="campo" htmlFor="esc-nombre">
              <span>Nombre</span>
              <input id="esc-nombre" value={editado.nombre} onChange={(e) => s.actualizarEscenario(editado.id, { nombre: e.target.value })} />
            </label>
            <div className="campo">
              <span>Cobertura de gestión del riesgo por cohorte</span>
              <div className="coberturas">
                {cat.cohortes.map((co) => {
                  const v = editado.cobertura[co.id] ?? co.coberturaActual;
                  return (
                    <label key={co.id} className="cobertura" htmlFor={`cob-${co.id}`}>
                      <span className="cob-nombre">{co.nombre}</span>
                      <input
                        id={`cob-${co.id}`}
                        type="range"
                        min={0.05}
                        max={0.9}
                        step={0.05}
                        value={v}
                        onChange={(e) => s.actualizarEscenario(editado.id, { cobertura: { ...editado.cobertura, [co.id]: +e.target.value } })}
                      />
                      <output htmlFor={`cob-${co.id}`}>{pct(v)}</output>
                      <small>vigente {pct(co.coberturaActual)}</small>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="interruptores">
              <label className="interruptor" htmlFor="esc-dom">
                <input id="esc-dom" type="checkbox" checked={editado.domicilio} onChange={(e) => s.actualizarEscenario(editado.id, { domicilio: e.target.checked })} />
                <span>
                  Atención domiciliaria para la cohorte
                  <small>Controles según estrato, tomas de muestra y aplicaciones en casa. Dimensiona equipos adicionales.</small>
                </span>
              </label>
              <label className="interruptor" htmlFor="esc-vir">
                <input id="esc-vir" type="checkbox" checked={editado.virtual} onChange={(e) => s.actualizarEscenario(editado.id, { virtual: e.target.checked })} />
                <span>
                  Atención virtual
                  <small>Telemedicina interactiva y telemonitoreo para controles y consultas no programadas, con retorno a presencial.</small>
                </span>
              </label>
              {editado.virtual && (
                <label className="campo en-linea" htmlFor="esc-med">
                  <span>Médicos virtuales adicionales por sede</span>
                  <input id="esc-med" type="number" min={0} max={10} value={editado.medicosVirtuales} onChange={(e) => s.actualizarEscenario(editado.id, { medicosVirtuales: Math.max(0, Math.min(10, +e.target.value)) })} />
                </label>
              )}
              <label className="interruptor" htmlFor="esc-rec">
                <input id="esc-rec" type="checkbox" checked={editado.recordatorios} onChange={(e) => s.actualizarEscenario(editado.id, { recordatorios: e.target.checked })} />
                <span>
                  Recordatorios de cita
                  <small>Reduce la inasistencia en {Math.round(cat.reduccionInasistenciaRecordatorios * 100)} puntos porcentuales.</small>
                </span>
              </label>
            </div>
          </fieldset>
        </section>

        <section className="panel" aria-labelledby="comp-t">
          <div className="panel-cabeza fila">
            <div>
              <h2 id="comp-t">Comparación de escenarios en la red</h2>
              <p>Cohortes crónicas durante 2027, frente al escenario regular.</p>
            </div>
            <Selector
              etiqueta="Comparar"
              multiple
              maximo={5}
              valor={s.comparar}
              opciones={s.escenarios.map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
              onCambio={(v) => s.set({ comparar: v })}
              ancho={220}
            />
          </div>
          <div className="tabla-scroll">
            <table className="tabla comparativo">
              <thead>
                <tr>
                  <th>Indicador</th>
                  {resultados.map(({ e }) => (
                    <th key={e.id} className={`d${e.id === s.escenarioId ? ' actual' : ''}`}>{e.nombre}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.nombre}>
                    <td>{f.nombre}</td>
                    {resultados.map(({ e, red }) => (
                      <td key={e.id} className={`d${e.id === s.escenarioId ? ' actual' : ''}`}>{f.f(red)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-cabeza" style={{ marginTop: 20 }}>
            <h3>Utilización de consulta externa en {cat.sedes.find((x) => x.id === serieSede)?.nombre}</h3>
          </div>
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datos} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--linea)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--tinta-3)' }} tickLine={false} axisLine={{ stroke: 'var(--linea)' }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: 'var(--tinta-3)' }} tickLine={false} axisLine={false} unit=" %" width={52} />
                <Tooltip contentStyle={{ background: 'var(--superficie)', border: '1px solid var(--linea)', borderRadius: 6, fontSize: 12 }} formatter={(v: number) => `${n1(v)} %`} />
                {resultados.map(({ e }, i) => (
                  <Line key={e.id} dataKey={e.id} name={e.nombre} stroke={COLORES[i % COLORES.length]} strokeWidth={e.id === s.escenarioId ? 2.8 : 1.6} strokeDasharray={e.id === 'sq' ? '5 4' : undefined} dot={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="leyenda">
            {resultados.map(({ e }, i) => (
              <span key={e.id}>
                <i style={{ background: COLORES[i % COLORES.length] }} />
                {e.nombre}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
