import { useEffect, useRef, useState } from 'react';
import { MESES, SEDE, UMBRALES, ZONAS } from '../../data/supuestos.ts';
import { cargaSede } from '../../model/modelo.ts';
import type { CargaSede, Escenario } from '../../model/modelo.ts';
import { useMesActivo, useProyeccion, useSim } from '../../store/simulacion.ts';
import ControlEscenario from '../ControlEscenario.tsx';
import { COLOR_ESTADO, NOMBRE_ESTADO, n0, n1, pct } from '../ui/formato.ts';

import Escena from './Escena.tsx';

function useReducido() {
  const [r, setR] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const f = () => setR(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return r;
}

function useVisible<T extends Element>() {
  const ref = useRef<T>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      setV(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting), { rootMargin: '200px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, v] as const;
}

function PanelZona({ carga, mes }: { carga: CargaSede; mes: number }) {
  const zonaId = useSim((s) => s.zona);
  const zona = ZONAS.find((z) => z.id === zonaId)!;
  const c = carga.zonas[zonaId];
  const color = COLOR_ESTADO[c.estado];
  const n = Math.min(1, c.ocupacion);
  const enUsoFrac = Math.min(1, c.ocupacion);

  return (
    <aside className="panel panel-zona" aria-live="polite" aria-labelledby="zona-t">
      <div>
        <div className="panel-sub">Zona seleccionada, {MESES[mes]} 2027</div>
        <h3 id="zona-t" style={{ marginTop: 4 }}>{zona.nombre}</h3>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <span className="estado-pill" style={{ background: color }}>{NOMBRE_ESTADO[c.estado]}</span>
        <span className="num" style={{ fontFamily: 'var(--f-display)', fontSize: '1.6rem', fontWeight: 620 }}>{pct(c.ocupacion)}</span>
      </div>
      <div className="medidor" role="img" aria-label={`Ocupación ${pct(c.ocupacion)}`}>
        <span style={{ width: `${n * 100}%`, background: color }} />
        <i className="marca-umbral" style={{ left: `${UMBRALES.tensionada * 100}%` }} />
        <i className="marca-umbral" style={{ left: `${UMBRALES.saturada * 100}%` }} />
      </div>
      <dl className="pares">
        <div>
          <dt>Demanda por día</dt>
          <dd>{n0(c.demandaDia)} {zona.unidad.split('/')[0]}</dd>
        </div>
        <div>
          <dt>Capacidad por día</dt>
          <dd>{n0(c.capacidadDia)}</dd>
        </div>
        <div>
          <dt>Aporte de la cohorte</dt>
          <dd>{n1(c.aporteCohorteDia)} por día</dd>
        </div>
        {zonaId === 'consulta' && (
          <div>
            <dt>Oportunidad estimada de cita</dt>
            <dd style={{ color: carga.oportunidadDias > SEDE.oportunidadNormativaDias ? '#f08a98' : undefined }}>{n1(carga.oportunidadDias)} días</dd>
          </div>
        )}
        {zonaId === 'prioritaria' && (
          <div>
            <dt>Hospitalizaciones de la cohorte en el mes</dt>
            <dd>{n0(carga.hospitalizacionesMes)}</dd>
          </div>
        )}
        {zonaId === 'domiciliaria' && (
          <div>
            <dt>Equipos domiciliarios activos</dt>
            <dd>{carga.equiposDomiciliarios}</dd>
          </div>
        )}
      </dl>
      {zonaId === 'consulta' && (
        <p className="panel-sub" style={{ marginTop: -6 }}>
          Referencia normativa para medicina general de {SEDE.oportunidadNormativaDias} días hábiles, Resolución 1552 de 2013.
        </p>
      )}
      <div className="equipos">
        <div className="panel-sub" style={{ color: 'var(--consola-tinta)', fontWeight: 600 }}>Equipos conectados</div>
        {zona.equipos.map((e) => {
          const visibles = Math.min(e.total, 14);
          const uso = Math.round(enUsoFrac * visibles);
          const alerta = zonaId === 'laboratorio' && e.nombre === 'Ecógrafo';
          return (
            <div className="equipo" key={e.nombre}>
              <span>
                {e.nombre} ({e.total})
              </span>
              <span className="puntos" aria-label={alerta ? 'Un equipo con alerta' : `${uso} de ${visibles} en uso`}>
                {Array.from({ length: visibles }, (_, k) => (
                  <i key={k} style={{ background: alerta ? '#e0a32e' : k < uso ? '#19a3fc' : '#5d6f99' }} />
                ))}
              </span>
            </div>
          );
        })}
        <div className="leyenda" style={{ marginTop: 2 }}>
          <span><i style={{ background: '#19a3fc', height: 8, width: 8 }} />En uso</span>
          <span><i style={{ background: '#5d6f99', height: 8, width: 8 }} />Disponible</span>
          <span><i style={{ background: '#e0a32e', height: 8, width: 8 }} />Alerta</span>
        </div>
      </div>
      {zonaId === 'laboratorio' && (
        <p className="alerta">
          El monitoreo remoto del ecógrafo reporta degradación del transductor. Programar la revisión antes del pico de {MESES[(mes + 1) % 12]} evita
          reprogramar estudios.
        </p>
      )}
      <p className="panel-sub">{zona.recursos}.</p>
    </aside>
  );
}

const FILAS: { nombre: string; valor: (c: CargaSede) => number; formato: (x: number) => string; estado?: (c: CargaSede) => string }[] = [
  { nombre: 'Ocupación de consulta externa', valor: (c) => c.zonas.consulta.ocupacion, formato: pct, estado: (c) => COLOR_ESTADO[c.zonas.consulta.estado] },
  { nombre: 'Ocupación de atención prioritaria', valor: (c) => c.zonas.prioritaria.ocupacion, formato: pct, estado: (c) => COLOR_ESTADO[c.zonas.prioritaria.estado] },
  { nombre: 'Ocupación de laboratorio', valor: (c) => c.zonas.laboratorio.ocupacion, formato: pct, estado: (c) => COLOR_ESTADO[c.zonas.laboratorio.estado] },
  { nombre: 'Ocupación de Salud en Casa', valor: (c) => c.zonas.domiciliaria.ocupacion, formato: pct, estado: (c) => COLOR_ESTADO[c.zonas.domiciliaria.estado] },
  { nombre: 'Oportunidad estimada de cita, días', valor: (c) => c.oportunidadDias, formato: n1 },
  { nombre: 'Hospitalizaciones de la cohorte en el mes', valor: (c) => c.hospitalizacionesMes, formato: n0 },
  { nombre: 'Visitas de Salud en Casa por día', valor: (c) => c.visitasDomiciliariasDia, formato: n0 },
];

function Comparativo({ mes }: { mes: number }) {
  const p = useProyeccion();
  const sec = useSim((s) => s.saludEnCasa);
  const escenario = useSim((s) => s.escenario);
  const intervencion = useSim((s) => s.intervencion);
  const cols: { id: Escenario; nombre: string }[] = [
    { id: 'general', nombre: 'Demanda general' },
    { id: 'sinGestion', nombre: 'Cohorte sin gestión' },
    { id: 'conGestion', nombre: sec ? 'Con gestión y Salud en Casa' : 'Con gestión del riesgo' },
  ];
  const cargas = cols.map((c) => cargaSede(p, c.id, sec, mes));
  return (
    <figure className="panel" style={{ margin: 0 }}>
      <figcaption>
        <div className="panel-titulo">Comparación de escenarios en {MESES[mes]} 2027</div>
        <div className="panel-sub">{p.cohorte.nombre}, {n0(p.tamano)} personas, cobertura de gestión del {pct(intervencion)}</div>
      </figcaption>
      <div className="tabla-scroll">
        <table className="tabla comparativo">
          <thead>
            <tr>
              <th>Indicador</th>
              {cols.map((c) => (
                <th key={c.id} className={`d${c.id === escenario ? ' actual' : ''}`}>{c.nombre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FILAS.map((f) => (
              <tr key={f.nombre}>
                <td>{f.nombre}</td>
                {cargas.map((c, i) => (
                  <td key={i} className={`d${cols[i].id === escenario ? ' actual' : ''}`}>
                    <span className="celda-estado">
                      {f.estado && <i style={{ background: f.estado(c) }} />}
                      {f.formato(f.valor(c))}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="panel-sub" style={{ marginTop: 12, maxWidth: '78ch' }}>
        La gestión del riesgo reduce urgencias y hospitalizaciones, y aumenta los controles programados por mayor adherencia. Sin
        Salud en Casa, esos controles adicionales se suman a la consulta externa de la sede.
      </p>
    </figure>
  );
}

export default function CommandCenter() {
  const p = useProyeccion();
  const mes = useMesActivo();
  const s = useSim();
  const carga = cargaSede(p, s.escenario, s.saludEnCasa, mes);
  const reducido = useReducido();
  const [lienzoRef, visible] = useVisible<HTMLDivElement>();

  useEffect(() => {
    if (!s.reproduciendo) return;
    const id = window.setInterval(() => {
      const st = useSim.getState();
      const actual = st.mes ?? 0;
      if (actual >= 11) {
        st.setReproduciendo(false);
        return;
      }
      st.setMes(actual + 1);
    }, 1300);
    return () => window.clearInterval(id);
  }, [s.reproduciendo]);

  const reproducir = () => {
    if (s.reproduciendo) return s.setReproduciendo(false);
    s.setMes(0);
    s.setReproduciendo(true);
  };

  return (
    <section className="banda seccion-paso" id="sede-cis" aria-labelledby="demo-b-t">
      <div className="contenedor">
        <div className="intro lectura">
          <span className="etiqueta-demo">Demo B, gemelo operacional</span>
          <h2 id="demo-b-t">Command center de una sede CIS</h2>
          <p>
            Cada zona muestra su ocupación diaria en el mes seleccionado, con la demanda general de la sede más la demanda
            inyectada de la cohorte. El flujo de pacientes, los vehículos de Salud en Casa y las referencias a la red
            hospitalaria se escalan con esa carga. Seleccione una zona para ver su detalle.
          </p>
        </div>

        <div className="barra-herramientas">
          <ControlEscenario id="sede" conInterruptor={false} />
          <div className="linea-tiempo">
            <div className="fila">
              <label htmlFor="mes" className="rotulo-mes">
                Mes simulado, {MESES[mes]} 2027
              </label>
              <button type="button" className="chip" onClick={reproducir}>
                {s.reproduciendo ? 'Pausar' : 'Reproducir el año'}
              </button>
              <button type="button" className="chip" onClick={() => { s.setReproduciendo(false); s.setMes(null); }}>
                Ir al mes pico
              </button>
              <button type="button" className="chip" onClick={s.reiniciar}>
                Reiniciar
              </button>
            </div>
            <input id="mes" type="range" min={0} max={11} step={1} value={mes} onChange={(e) => { s.setReproduciendo(false); s.setMes(+e.target.value); }} />
            <div className="meses" aria-hidden="true">
              {MESES.map((m, i) => (
                <span key={m} className={i === p.mesPico ? 'pico' : ''}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="demo-b">
          <div className="lienzo" ref={lienzoRef}>
            <Escena carga={carga} zonaSel={s.zona} onZona={s.setZona} reducido={!!reducido} activo={visible} />
            <div className="semaforo" aria-hidden="true">
              <span><i style={{ background: COLOR_ESTADO.holgada }} />menos de 80 %</span>
              <span><i style={{ background: COLOR_ESTADO.tensionada }} />80 a 95 %</span>
              <span><i style={{ background: COLOR_ESTADO.saturada }} />95 % o más</span>
            </div>
            <div className="lienzo-ayuda">Arrastre para rotar, use la rueda o el gesto de pellizco para acercar</div>
          </div>
          <PanelZona carga={carga} mes={mes} />
        </div>

        <Comparativo mes={mes} />

        <div className="precedentes">
          <article className="precedente">
            <span className="tipo">Precedente externo, command center</span>
            <span className="quien">Tampa General Hospital, Estados Unidos</span>
            <p>
              Centro de comando CareComm con gemelo digital del flujo de pacientes desde 2019. Reporta US$40 millones en
              ineficiencias reducidas, estancia media de 6,0 a 5,5 días y 25 % menos desvío de urgencias.
            </p>
            <span className="fuente">Comunicado conjunto GE HealthCare y TGH, octubre de 2020</span>
          </article>
          <article className="precedente">
            <span className="tipo">Precedente externo, command center</span>
            <span className="quien">Johns Hopkins Hospital, Estados Unidos</span>
            <p>
              Capacity Command Center con ocupación de 85 % a 92 % y menos demoras de pacientes. Posteriormente migró a tableros de
              capacidad integrados a la historia clínica electrónica.
            </p>
            <span className="fuente">Scheulen et al., Joint Commission Journal on Quality and Patient Safety, 2019</span>
          </article>
          <article className="precedente">
            <span className="tipo">Precedente externo, Latinoamérica</span>
            <span className="quien">Hospital Unimed Litoral, Brasil</span>
            <p>
              Command center con 76 % menos tiempo de rotación de cama y 13 % menos tiempo entre el alta médica y la liberación
              de la cama.
            </p>
            <span className="fuente">
              <a href="https://medicinasa.com.br/weknow-medsa27/" target="_blank" rel="noreferrer">Medicina S/A, 2024</a>
            </span>
          </article>
        </div>
      </div>
    </section>
  );
}
