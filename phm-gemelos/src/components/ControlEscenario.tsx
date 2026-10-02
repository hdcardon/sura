import type { Escenario } from '../model/modelo.ts';
import { useSim } from '../store/simulacion.ts';
import { pct } from './ui/formato.ts';

export default function ControlEscenario({ id, conInterruptor = true }: { id: string; conInterruptor?: boolean }) {
  const escenario = useSim((s) => s.escenario);
  const setEscenario = useSim((s) => s.setEscenario);
  const intervencion = useSim((s) => s.intervencion);
  const sec = useSim((s) => s.saludEnCasa);
  const setSec = useSim((s) => s.setSaludEnCasa);

  const opciones: { id: Escenario; titulo: string; detalle: string }[] = [
    { id: 'general', titulo: 'Demanda general', detalle: 'La sede sin la demanda de la cohorte' },
    { id: 'sinGestion', titulo: 'Cohorte sin gestión', detalle: 'Se inyecta la demanda base proyectada' },
    {
      id: 'conGestion',
      titulo: 'Cohorte con gestión del riesgo',
      detalle: `Cobertura del ${pct(intervencion)}${sec ? ' y Salud en Casa' : ''}`,
    },
  ];

  return (
    <div className="controles" style={{ gap: 12 }}>
      <div className="segmentado" role="group" aria-label="Escenario de demanda inyectada en la sede">
        {opciones.map((o) => (
          <button key={o.id} type="button" aria-pressed={escenario === o.id} onClick={() => setEscenario(o.id)} id={`${id}-${o.id}`}>
            {o.titulo}
            <small>{o.detalle}</small>
          </button>
        ))}
      </div>
      {conInterruptor && (
        <label className="interruptor" htmlFor={`${id}-sec`}>
          <input id={`${id}-sec`} type="checkbox" checked={sec} onChange={(e) => setSec(e.target.checked)} />
          <span>
            Desviar a Salud en Casa la demanda elegible
            <small>Aplica al escenario con gestión del riesgo y suma los equipos domiciliarios sugeridos por el gemelo poblacional.</small>
          </span>
        </label>
      )}
    </div>
  );
}
