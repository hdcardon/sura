import { useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TipoId } from '../../data/tipos.ts';
import { MESES } from '../../model/calendario.ts';
import { proyectarCohorte } from '../../model/cohortes.ts';
import { personasPorPerfil } from '../../model/red.ts';
import { usePortal } from '../../store/portal.ts';
import { useEscenario, useTerritorio } from '../../store/selectores.ts';
import { COLOR_ESTRATO, conSigno, n0, n1, pct } from '../../ui/formato.tsx';
import Selector from '../../ui/Selector.tsx';
import MatrizUnidades from './MatrizUnidades.tsx';
import Multimorbilidad from './Multimorbilidad.tsx';
import Transiciones from './Transiciones.tsx';

const tooltip = {
  contentStyle: { background: 'var(--superficie)', border: '1px solid var(--linea)', borderRadius: 6, fontSize: 12, color: 'var(--tinta)' },
  labelStyle: { color: 'var(--tinta)', fontWeight: 600 },
};

export default function Cohortes() {
  const s = usePortal();
  const escGlobal = useEscenario();
  // El modelo poblacional siempre compara contra el statu quo; si el escenario activo es el statu quo, usa la gestión ampliada.
  const esc = escGlobal.id !== 'sq' ? escGlobal : s.escenarios.find((e) => e.id === 'ampliada') ?? s.escenarios.find((e) => e.id !== 'sq') ?? escGlobal;
  const celdas = useTerritorio();
  const cat = s.catalogo;
  const co = cat.cohortes.find((c) => c.id === s.cohorteId) ?? cat.cohortes[0];
  const [tipo, setTipo] = useState<TipoId>('controles');
  const [vista, setVista] = useState<'sq' | 'esc'>('esc');

  const { perfiles, adultos } = useMemo(() => personasPorPerfil(cat, celdas, s.ambito === 'red' ? undefined : s.ambito), [cat, celdas, s.ambito]);
  const n = perfiles.filter((p) => p.cohortes.includes(co.id)).reduce((a, p) => a + p.n, 0);
  const cObj = esc.cobertura[co.id] ?? co.coberturaActual;
  const proy = useMemo(() => proyectarCohorte(cat, co, Math.round(n), cObj), [cat, co, n, cObj]);
  const din = vista === 'sq' ? proy.central.dinSQ : proy.central.dinEsc;
  const controladoHoy = co.distInicial[0];
  const controladoDicSQ = proy.central.dinSQ.inicio[12][0];
  const controladoDicEsc = proy.central.dinEsc.inicio[12][0];

  const datos = MESES.map((m, i) => ({
    mes: m,
    sq: Math.round(proy.volSQ[tipo][i]),
    esc: Math.round(proy.volEsc[tipo][i]),
    banda: [Math.round(proy.banda[tipo].p10[i]), Math.round(proy.banda[tipo].p90[i])],
  }));

  const opcionesCohorte = cat.cohortes.map((c) => ({ valor: c.id, etiqueta: c.nombre, grupo: c.ruta }));
  opcionesCohorte.sort((a, b) => a.grupo.localeCompare(b.grupo) || a.etiqueta.localeCompare(b.etiqueta));

  return (
    <div className="modulo">
      <div className="barra-modulo">
        <Selector etiqueta="Cohorte" valor={co.id} opciones={opcionesCohorte} onCambio={(v) => s.set({ cohorteId: v })} ancho={300} buscar />
        <Selector
          etiqueta="Comparar el statu quo con"
          valor={esc.id}
          opciones={s.escenarios.filter((e) => e.id !== 'sq').map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
          onCambio={(v) => s.set({ escenarioId: v })}
          ancho={250}
        />
        <Selector
          etiqueta="Ámbito"
          valor={s.ambito}
          opciones={[{ valor: 'red', etiqueta: 'Red completa' }, ...cat.sedes.map((x) => ({ valor: x.id, etiqueta: x.nombre }))]}
          onCambio={(v) => s.set({ ambito: v })}
          ancho={190}
        />
        <p className="barra-nota">
          {co.nota} Cobertura del programa: {pct(co.coberturaActual)} vigente y {pct(cObj)} en el escenario {esc.nombre.toLowerCase()}.
        </p>
      </div>

      <dl className="kpis">
        <div className="kpi">
          <dt>Personas en la cohorte</dt>
          <dd>{n0(n)}</dd>
          <small>{n1((n / adultos) * 100)} % de {n0(adultos)} adultos</small>
        </div>
        <div className="kpi">
          <dt>{co.estratos[0].nombre} ({co.indicadorControl})</dt>
          <dd>{pct(controladoDicEsc)}</dd>
          <small>
            Hoy {pct(controladoHoy)}; en diciembre con statu quo {pct(controladoDicSQ)}
          </small>
        </div>
        <div className="kpi">
          <dt>Hospitalizaciones CSCA evitadas en 2027</dt>
          <dd>{conSigno(proy.hospCSCAEvitadas.p50, n0)}</dd>
          <small>
            Rango P10–P90: {n0(proy.hospCSCAEvitadas.p10)} a {n0(proy.hospCSCAEvitadas.p90)}
          </small>
        </div>
        <div className="kpi">
          <dt>Urgencias evitadas en 2027</dt>
          <dd>{conSigno(proy.urgenciasEvitadas.p50, n0)}</dd>
          <small>
            Rango P10–P90: {n0(proy.urgenciasEvitadas.p10)} a {n0(proy.urgenciasEvitadas.p90)}
          </small>
        </div>
      </dl>

      <div className="rejilla-2">
        <section className="panel" aria-labelledby="unidades-t">
          <div className="panel-cabeza">
            <h2 id="unidades-t">Composición de la cohorte por estrato</h2>
            <p>Cada punto representa un grupo de personas. Compare hoy con diciembre de 2027.</p>
          </div>
          <MatrizUnidades cohorte={co} n={n} hoy={co.distInicial} sq={proy.central.dinSQ.inicio[12]} esc={proy.central.dinEsc.inicio[12]} nombreEsc={esc.nombre} />
        </section>

        <section className="panel" aria-labelledby="trans-t">
          <div className="panel-cabeza fila">
            <div>
              <h2 id="trans-t">Transiciones entre estratos en 12 meses</h2>
              <p>Personas de la cohorte inicial: estrato en enero y estrato o salida en diciembre.</p>
            </div>
            <div className="conmutador" role="group" aria-label="Escenario de las transiciones">
              <button type="button" aria-pressed={vista === 'sq'} onClick={() => setVista('sq')}>
                Statu quo
              </button>
              <button type="button" aria-pressed={vista === 'esc'} onClick={() => setVista('esc')}>
                {esc.nombre}
              </button>
            </div>
          </div>
          <Transiciones cohorte={co} flujo={din.flujo} n={n} />
        </section>
      </div>

      <div className="rejilla-2">
        <section className="panel" aria-labelledby="proy-t">
          <div className="panel-cabeza fila">
            <div>
              <h2 id="proy-t">Proyección mensual de atenciones</h2>
              <p>Escenario con banda P10–P90 de 200 simulaciones y statu quo como referencia.</p>
            </div>
            <Selector
              etiqueta="Tipo de atención"
              compacto
              valor={tipo}
              opciones={cat.tipos.map((t) => ({ valor: t.id, etiqueta: t.nombre }))}
              onCambio={(v) => setTipo(v as TipoId)}
              ancho={220}
            />
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={datos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--linea)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--tinta-3)' }} tickLine={false} axisLine={{ stroke: 'var(--linea)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--tinta-3)' }} tickLine={false} axisLine={false} tickFormatter={(v) => n0(v)} width={52} />
                <Tooltip {...tooltip} formatter={(v: number | number[]) => (Array.isArray(v) ? `${n0(v[0])} a ${n0(v[1])}` : n0(v))} />
                <Area dataKey="banda" name="Banda P10–P90" stroke="none" fill="var(--acento)" fillOpacity={0.16} isAnimationActive={false} />
                <Line dataKey="sq" name="Statu quo" stroke="var(--tinta-3)" strokeDasharray="5 4" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                <Line dataKey="esc" name={esc.nombre} stroke="var(--acento)" strokeWidth={2.4} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="leyenda">
            <span><i style={{ background: 'var(--acento)' }} />{esc.nombre}</span>
            <span><i className="punteada" style={{ color: 'var(--tinta-3)' }} />Statu quo</span>
            <span><i style={{ background: 'var(--acento)', opacity: 0.25, height: 8 }} />Banda P10–P90</span>
          </div>
        </section>

        <section className="panel" aria-labelledby="mm-t">
          <div className="panel-cabeza">
            <h2 id="mm-t">Multimorbilidad</h2>
            <p>Intersecciones exclusivas entre cohortes. Se resaltan las que incluyen {co.nombre.toLowerCase()}.</p>
          </div>
          <Multimorbilidad perfiles={perfiles} cohortes={cat.cohortes} seleccion={co.id} />
        </section>
      </div>

      <section className="panel" aria-labelledby="estr-t">
        <div className="panel-cabeza">
          <h2 id="estr-t">Criterios de estratificación</h2>
          <p>{co.ruta}. Tasas de uso relativas al estrato no controlado.</p>
        </div>
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                <th>Estrato</th>
                <th>Criterio clínico</th>
                <th className="d">Hoy</th>
                <th className="d">Dic., statu quo</th>
                <th className="d">Dic., escenario</th>
                <th className="d">Hospitalización relativa</th>
              </tr>
            </thead>
            <tbody>
              {co.estratos.map((e, i) => (
                <tr key={e.nombre}>
                  <td>
                    <span className="punto" style={{ background: COLOR_ESTRATO[i] }} />
                    {e.nombre}
                  </td>
                  <td>{e.criterio}</td>
                  <td className="d">{pct(co.distInicial[i])}</td>
                  <td className="d">{pct(proy.central.dinSQ.inicio[12][i])}</td>
                  <td className="d">{pct(proy.central.dinEsc.inicio[12][i])}</td>
                  <td className="d">{n1(cat.multEstrato.hospitalizaciones[i])}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
