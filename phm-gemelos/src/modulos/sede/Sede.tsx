import { useEffect, useRef, useState } from 'react';
import { DIAS_OPERATIVOS, MESES_LARGOS } from '../../model/calendario.ts';
import type { ZonaMes } from '../../model/red.ts';
import { usePortal } from '../../store/portal.ts';
import { useEscenario, useMesActivo, useResultadoSede } from '../../store/selectores.ts';
import { COLOR_ESTADO, NOMBRE_ESTADO, Pastilla, n0, n1, pct } from '../../ui/formato.tsx';

const mesLargo = (m: number) => `${MESES_LARGOS[m][0].toUpperCase()}${MESES_LARGOS[m].slice(1)}`;
import Selector from '../../ui/Selector.tsx';
import Escena3D from './Escena3D.tsx';
import { ATENCIONES_POR_PUNTO } from './layout.ts';

function useVisible<T extends Element>() {
  const ref = useRef<T>(null);
  const [v, setV] = useState(true);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting && document.visibilityState === 'visible'));
    io.observe(ref.current);
    const vis = () => setV(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', vis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);
  return [ref, v] as const;
}

function PanelZona({ z, mes }: { z: ZonaMes; mes: number }) {
  const color = COLOR_ESTADO[z.estado];
  return (
    <aside className="panel panel-zona" aria-live="polite">
      <div>
        <div className="sub">Zona seleccionada, {MESES_LARGOS[mes]}</div>
        <h2>{z.zona.nombre}</h2>
      </div>
      <div className="fila-estado">
        <Pastilla estado={z.estado} />
        <span className="cifra">{pct(z.utilizacion)}</span>
      </div>
      <div className="medidor" role="img" aria-label={`Utilización ${pct(z.utilizacion)}`}>
        <span style={{ width: `${z.utilizacion * 100}%`, background: color }} />
        <i style={{ left: '80%' }} />
        <i style={{ left: '95%' }} />
      </div>
      <dl className="pares">
        <div><dt>{z.indicador.etiqueta}</dt><dd>{z.indicador.valor}</dd></div>
        {z.oportunidad && <div><dt>Oportunidad de cita P50</dt><dd>{n1(z.oportunidad.p50)} días</dd></div>}
        {z.cola && z.cola.estable && <div><dt>Espera media en hora pico</dt><dd>{n0(z.cola.esperaMediaMin)} min</dd></div>}
        {z.cola && z.cola.estable && <div><dt>Personas en espera en hora pico</dt><dd>{n1(z.cola.enColaMedia)}</dd></div>}
        <div><dt>Demanda por día</dt><dd>{n0(z.demandaDia)}</dd></div>
        <div><dt>Capacidad por día</dt><dd>{n0(z.capacidadDia)}</dd></div>
        <div><dt>De la cohorte crónica</dt><dd>{n0(z.aporteCronicoDia)} por día</dd></div>
        {z.diferidaDia > 0.5 && <div><dt>Demanda diferida</dt><dd>{n0(z.diferidaDia)} por día</dd></div>}
      </dl>
      {z.zona.id === 'consulta' && <p className="nota">Oportunidad para medicina general de primera vez. Referencia de 3 días hábiles, Resolución 1552 de 2013.</p>}
      {z.zona.equipos.length > 0 && (
        <div className="equipos">
          <div className="sub fuerte">Equipos (estado simulado)</div>
          {z.zona.equipos.map((e) => {
            const visibles = Math.min(e.total, 14);
            const uso = Math.round(z.utilizacion * visibles);
            const alerta = e.nombre === 'Ecógrafo';
            return (
              <div className="equipo" key={e.nombre}>
                <span>{e.nombre} ({e.total})</span>
                <span className="puntos">
                  {Array.from({ length: visibles }, (_, k) => (
                    <i key={k} style={{ background: alerta ? '#e0a32e' : k < uso ? '#19a3fc' : '#8593b3' }} />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {z.zona.id === 'laboratorio' && (
        <p className="alerta-caja">Evento simulado. El ecógrafo reporta degradación del transductor; la revisión antes del pico evita reprogramar estudios.</p>
      )}
    </aside>
  );
}

export default function Sede() {
  const s = usePortal();
  const r = useResultadoSede();
  const esc = useEscenario();
  const mes = useMesActivo(r);
  const mm = r.meses[mes];
  const z = mm.zonas[s.zonaId] ?? mm.zonas.consulta;
  const [lienzo, visible] = useVisible<HTMLDivElement>();
  const [reproduciendo, setReproduciendo] = useState(false);

  useEffect(() => {
    if (!reproduciendo) return;
    const id = window.setInterval(() => {
      const st = usePortal.getState();
      const actual = st.mes ?? 0;
      if (actual >= 11) {
        setReproduciendo(false);
        return;
      }
      st.set({ mes: actual + 1 });
    }, 1400);
    return () => window.clearInterval(id);
  }, [reproduciendo]);

  const espontaneas = Object.values(mm.zonas).filter((x) => x.horario);
  const horas = Array.from(new Set(espontaneas.flatMap((x) => x.horario!.map((h) => h.hora)))).sort((a, b) => a - b);
  const colorRho = (rho: number) => (rho >= 1 ? '#d1495b' : `color-mix(in srgb, var(--acento) ${Math.round(Math.min(1, rho) * 85 + 8)}%, var(--superficie))`);

  return (
    <div className="modulo">
      <div className="barra-modulo">
        <Selector
          etiqueta="Zona"
          valor={z.zona.id}
          opciones={Object.values(mm.zonas).map((x) => ({ valor: x.zona.id, etiqueta: x.zona.nombre, marca: COLOR_ESTADO[x.estado], detalle: `${NOMBRE_ESTADO[x.estado]}, ${x.indicador.valor}` }))}
          onCambio={(v) => s.set({ zonaId: v })}
          ancho={270}
        />
        <div className="grupo-botones">
          <button type="button" className={`boton${s.flujo ? '' : ' sec'}`} aria-pressed={s.flujo} onClick={() => s.set({ flujo: !s.flujo })}>
            {s.flujo ? 'Detener flujo' : 'Reproducir flujo'}
          </button>
          <button
            type="button"
            className="boton sec"
            onClick={() => {
              if (reproduciendo) return setReproduciendo(false);
              s.set({ mes: 0 });
              setReproduciendo(true);
            }}
          >
            {reproduciendo ? 'Pausar año' : 'Recorrer 2027'}
          </button>
        </div>
        <p className="barra-nota">
          Escenario {esc.nombre.toLowerCase()}. {mesLargo(mes)} con {String(DIAS_OPERATIVOS[mes]).replace('.', ',')} días operativos. Cada punto representa {ATENCIONES_POR_PUNTO} atenciones por día.
        </p>
      </div>

      <div className="rejilla-sede">
        <div className="lienzo" ref={lienzo}>
          <Escena3D mes={mm} zonaSel={z.zona.id} onZona={(id) => s.set({ zonaId: id })} animar={s.flujo} visible={visible} />
          <div className="semaforo" aria-hidden="true">
            {(['holgada', 'tensionada', 'saturada'] as const).map((e) => (
              <span key={e}>
                <i style={{ background: COLOR_ESTADO[e] }} />
                {NOMBRE_ESTADO[e]}
              </span>
            ))}
          </div>
          <div className="lienzo-ayuda">Arrastre para rotar y use la rueda para acercar. Seleccione una zona para ver su detalle.</div>
        </div>
        <PanelZona z={z} mes={mes} />
      </div>

      <div className="rejilla-2">
        <section className="panel" aria-labelledby="hora-t">
          <div className="panel-cabeza">
            <h2 id="hora-t">Utilización por hora en zonas sin cita</h2>
            <p>Día típico de {MESES_LARGOS[mes]}. Un tono más oscuro indica mayor utilización; el rojo, cola inestable en esa franja.</p>
          </div>
          <div className="tabla-scroll">
            <table className="calor horas">
              <thead>
                <tr>
                  <th />
                  {horas.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {espontaneas.map((x) => (
                  <tr key={x.zona.id}>
                    <th scope="row">{x.zona.nombre}</th>
                    {horas.map((h) => {
                      const v = x.horario!.find((y) => y.hora === h);
                      return (
                        <td key={h}>
                          {v ? (
                            <span className="celda" title={`${h}:00, utilización ${pct(Math.min(1, v.rho))}${Number.isFinite(v.esperaMin) ? `, espera media ${n0(v.esperaMin)} min` : ', cola inestable'}`} style={{ background: colorRho(v.rho) }} />
                          ) : (
                            <span className="celda vacia" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel" aria-labelledby="zonas-t">
          <div className="panel-cabeza">
            <h2 id="zonas-t">Zonas de la sede en {MESES_LARGOS[mes]}</h2>
            <p>Indicador de servicio de cada zona según su tipo de demanda.</p>
          </div>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Zona</th>
                  <th className="d">Demanda/día</th>
                  <th className="d">Utilización</th>
                  <th className="d">Indicador</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(mm.zonas).map((x) => (
                  <tr key={x.zona.id} className={x.zona.id === z.zona.id ? 'fila-sel' : ''} onClick={() => s.set({ zonaId: x.zona.id })}>
                    <td>
                      <span className="punto" style={{ background: COLOR_ESTADO[x.estado] }} />
                      {x.zona.nombre}
                    </td>
                    <td className="d">{n0(x.demandaDia)}</td>
                    <td className="d">{pct(x.utilizacion)}</td>
                    <td className="d">{x.indicador.valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
