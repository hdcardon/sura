import { MESES, MESES_LARGOS } from '../model/calendario.ts';
import { mesCritico } from '../model/red.ts';
import type { ResultadoSede } from '../model/red.ts';
import { usePortal } from '../store/portal.ts';
import { useEscenario, useResultadosRed } from '../store/selectores.ts';
import { COLOR_ESTADO, NOMBRE_ESTADO, Pastilla, conSigno, millones, n0, n1 } from '../ui/formato.tsx';

interface Alerta {
  nivel: 'saturada' | 'tensionada' | 'evento';
  sede: string;
  texto: string;
  accion?: () => void;
}

export default function Panorama() {
  const s = usePortal();
  const red = useResultadosRed();
  const esc = useEscenario();
  const mesSel = s.mes;
  const mesDe = (r: ResultadoSede) => mesSel ?? mesCritico(r);

  const abrirSede = (sedeId: string, mes?: number) => {
    s.set({ sedeId, ...(mes !== undefined ? { mes } : {}) });
    s.irA('sede');
  };

  const alertas: Alerta[] = [];
  for (const r of red) {
    const m = mesDe(r);
    for (const z of Object.values(r.meses[m].zonas)) {
      if (z.estado === 'holgada') continue;
      const detalle =
        z.zona.tipo === 'agendada'
          ? `oportunidad de cita P90 de ${z.indicador.valor}`
          : z.zona.tipo === 'espontanea'
            ? z.cola?.estable
              ? `${z.indicador.valor} de los pacientes espera más de ${z.zona.meta.esperaMin} min en hora pico`
              : 'cola inestable en hora pico'
            : `utilización de ${z.indicador.valor}`;
      alertas.push({
        nivel: z.estado,
        sede: r.sede.nombre,
        texto: `${z.zona.nombre}, ${detalle} en ${MESES_LARGOS[m]}.`,
        accion: () => {
          s.set({ zonaId: z.zona.id });
          abrirSede(r.sede.id, m);
        },
      });
    }
  }
  alertas.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'saturada' ? -1 : 1));
  alertas.unshift({
    nivel: 'evento',
    sede: 'Sede Norte',
    texto: 'Evento simulado: el ecógrafo reporta degradación del transductor. Revisión sugerida antes del pico de septiembre.',
    accion: () => {
      s.set({ zonaId: 'laboratorio' });
      abrirSede('norte');
    },
  });

  const suma = (f: (r: ResultadoSede) => number) => red.reduce((a, r) => a + f(r), 0);
  const personas = suma((r) => Object.values(r.personasPorCohorte).reduce((a, b) => a + b, 0));
  const hosp = suma((r) => r.hospEvitadas);
  const urg = suma((r) => r.urgEvitadas);
  const costo = suma((r) => r.costoSQ - r.costoEsc);
  const mesesSaturados = suma((r) => r.meses.filter((mm) => mm.peorEstado === 'saturada').length);
  const equipos = suma((r) => r.equiposDomiciliariosExtra);
  const tele = suma((r) => r.virtualMes.reduce((a, b) => a + b, 0));

  return (
    <div className="modulo">
      <section className="tarjetas-sede" aria-label="Sedes">
        {red.map((r) => {
          const m = mesDe(r);
          const mm = r.meses[m];
          const c = mm.zonas.consulta;
          return (
            <button type="button" className="tarjeta-sede" key={r.sede.id} onClick={() => abrirSede(r.sede.id, mesSel ?? undefined)}>
              <div className="ts-cabeza">
                <strong>{r.sede.nombre}</strong>
                <Pastilla estado={mm.peorEstado} />
              </div>
              <div className="ts-mes">{mesSel === null ? `Mes crítico: ${MESES_LARGOS[m]}` : MESES_LARGOS[m]}</div>
              <dl className="ts-datos">
                <div>
                  <dt>Oportunidad P90</dt>
                  <dd>{n1(c.oportunidad!.p90)} días</dd>
                </div>
                <div>
                  <dt>Consulta externa</dt>
                  <dd>{n0(c.utilizacion * 100)} %</dd>
                </div>
                <div>
                  <dt>Zonas saturadas</dt>
                  <dd>{mm.saturadas}</dd>
                </div>
              </dl>
              <div className="ts-zonas" aria-label="Estado por zona">
                {Object.values(mm.zonas).map((z) => (
                  <span key={z.zona.id} title={`${z.zona.nombre}: ${NOMBRE_ESTADO[z.estado]}`} style={{ background: COLOR_ESTADO[z.estado] }} />
                ))}
              </div>
            </button>
          );
        })}
      </section>

      <div className="rejilla-2">
        <section className="panel" aria-labelledby="calor-t">
          <div className="panel-cabeza">
            <h2 id="calor-t">Estado de la red por mes</h2>
            <p>Peor zona de cada sede en el escenario {esc.nombre.toLowerCase()}. Seleccione una celda para abrir la sede.</p>
          </div>
          <div className="tabla-scroll">
            <table className="calor">
              <thead>
                <tr>
                  <th />
                  {MESES.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {red.map((r) => (
                  <tr key={r.sede.id}>
                    <th scope="row">{r.sede.nombre}</th>
                    {r.meses.map((mm, i) => (
                      <td key={i}>
                        <button
                          type="button"
                          className={`celda${mesSel === i ? ' sel' : ''}`}
                          style={{ background: COLOR_ESTADO[mm.peorEstado] }}
                          onClick={() => abrirSede(r.sede.id, i)}
                          aria-label={`${r.sede.nombre}, ${MESES_LARGOS[i]}: ${NOMBRE_ESTADO[mm.peorEstado]}, ${mm.saturadas} zonas saturadas`}
                        >
                          {mm.saturadas || ''}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="leyenda">
            {(['holgada', 'tensionada', 'saturada'] as const).map((e) => (
              <span key={e}>
                <i style={{ background: COLOR_ESTADO[e] }} />
                {NOMBRE_ESTADO[e]}
              </span>
            ))}
            <span>El número indica zonas saturadas</span>
          </div>
        </section>

        <section className="panel" aria-labelledby="resumen-t">
          <div className="panel-cabeza">
            <h2 id="resumen-t">{esc.id === 'sq' ? 'Cohortes crónicas en el statu quo' : 'Escenario frente al statu quo'}</h2>
            <p>Red completa durante 2027.{esc.id === 'sq' ? ' Seleccione otro escenario para ver diferencias.' : ''}</p>
          </div>
          <dl className="pares">
            <div><dt>Personas en cohortes</dt><dd>{n0(personas)}</dd></div>
            {esc.id === 'sq' ? (
              <>
                <div><dt>Hospitalizaciones de las cohortes</dt><dd>{n0(suma((r) => r.volumenSQ.hospitalizaciones.reduce((a, b) => a + b, 0)))}</dd></div>
                <div><dt>Urgencias de las cohortes</dt><dd>{n0(suma((r) => r.volumenSQ.urgencias.reduce((a, b) => a + b, 0)))}</dd></div>
                <div><dt>Costo médico de las cohortes</dt><dd>{millones(suma((r) => r.costoSQ))}</dd></div>
              </>
            ) : (
              <>
                <div><dt>Hospitalizaciones CSCA evitadas</dt><dd>{conSigno(hosp, n0)}</dd></div>
                <div><dt>Urgencias evitadas</dt><dd>{conSigno(urg, n0)}</dd></div>
                <div><dt>Variación del costo médico de las cohortes</dt><dd>{conSigno(-costo, millones)}</dd></div>
              </>
            )}
            <div><dt>Meses-sede con saturación</dt><dd>{mesesSaturados} de {red.length * 12}</dd></div>
            <div><dt>Equipos domiciliarios adicionales</dt><dd>{equipos}</dd></div>
            <div><dt>Atenciones virtuales de cohortes</dt><dd>{n0(tele)}</dd></div>
          </dl>
          <p className="nota">CSCA: condiciones sensibles al cuidado ambulatorio. Costos unitarios sintéticos.</p>
        </section>
      </div>

      <section className="panel" aria-labelledby="alertas-t">
        <div className="panel-cabeza">
          <h2 id="alertas-t">Alertas</h2>
          <p>{alertas.length} alertas en el mes {mesSel === null ? 'crítico de cada sede' : MESES_LARGOS[mesSel]}.</p>
        </div>
        <ul className="alertas">
          {alertas.slice(0, 12).map((a, i) => (
            <li key={i} className={`alerta-${a.nivel}`}>
              <i aria-hidden="true" style={{ background: a.nivel === 'evento' ? '#5b7fa6' : COLOR_ESTADO[a.nivel] }} />
              <span className="alerta-sede">{a.sede}</span>
              <span className="alerta-texto">{a.texto}</span>
              {a.accion && (
                <button type="button" className="enlace" onClick={a.accion}>
                  Ver en la sede
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
