import { MESES, SEDE, ZONAS } from '../data/supuestos.ts';
import { cargaSede } from '../model/modelo.ts';
import { useMesActivo, useProyeccion, useSim } from '../store/simulacion.ts';
import ControlEscenario from './ControlEscenario.tsx';
import { n0 } from './ui/formato.ts';

export default function Puente() {
  const p = useProyeccion();
  const mes = useMesActivo();
  const escenario = useSim((s) => s.escenario);
  const sec = useSim((s) => s.saludEnCasa);
  const carga = cargaSede(p, escenario, sec, mes);
  const aporte = carga.zonas.admision.aporteCohorteDia;
  const saturadas = ZONAS.filter((z) => carga.zonas[z.id].estado === 'saturada');
  const tensionadas = ZONAS.filter((z) => carga.zonas[z.id].estado === 'tensionada');

  return (
    <section className="seccion puente seccion-paso" id="conexion" aria-labelledby="puente-t">
      <div className="contenedor">
        <div className="intro lectura">
          <h2 id="puente-t">La demanda proyectada entra al gemelo de la sede</h2>
          <p>
            La serie mensual de la cohorte se distribuye por momento del journey: controles y consultas no programadas a
            consulta externa, descompensaciones a atención prioritaria, tomas de muestra a laboratorio y aplicaciones a
            procedimientos. Con la gestión del riesgo activa, la demanda elegible se asigna a Salud en Casa con los equipos que
            dimensionó el gemelo poblacional.
          </p>
        </div>
        <div className="puente-cuerpo">
          <div className="puente-esquema" aria-label="Flujo de datos entre gemelos">
            <div className="nodo">
              <b>Gemelo poblacional</b>
              <span>{p.cohorte.nombre}</span>
              <span className="dato">{escenario === 'general' ? 0 : n0(aporte)}</span>
              <span>atenciones presenciales por día que llegan a la sede en {MESES[mes]}</span>
            </div>
            <div className="flecha">
              <svg viewBox="0 0 64 18" aria-hidden="true">
                <path d="M2 9h54M50 3l8 6-8 6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              demanda por zona y por mes
            </div>
            <div className="nodo">
              <b>Gemelo operacional</b>
              <span>{SEDE.nombre}</span>
              <span className="dato" style={{ color: saturadas.length ? '#d1495b' : tensionadas.length ? '#b97f10' : '#2e9e6b' }}>
                {saturadas.length} saturadas
              </span>
              <span>
                {tensionadas.length} tensionadas de {ZONAS.length} zonas en {MESES[mes]}
              </span>
            </div>
          </div>
          <div className="puente-control">
            <ControlEscenario id="puente" />
          </div>
        </div>
      </div>
    </section>
  );
}
