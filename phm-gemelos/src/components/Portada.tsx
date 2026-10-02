import { MESES, ZONAS } from '../data/supuestos.ts';
import { serieConsulta } from '../model/modelo.ts';
import { useProyeccion, useSim } from '../store/simulacion.ts';
import { n0 } from './ui/formato.ts';

const W = 560;
const H = 270;
const M = { l: 40, r: 16, t: 18, b: 30 };

export default function Portada() {
  const p = useProyeccion();
  const saludEnCasa = useSim((s) => s.saludEnCasa);
  const sin = serieConsulta(p, 'sinGestion', false);
  const con = serieConsulta(p, 'conGestion', saludEnCasa);
  const cap = ZONAS.find((z) => z.id === 'consulta')!.capacidadDia;

  const yMin = 150;
  const yMax = Math.max(280, Math.ceil(Math.max(...sin) / 10) * 10 + 10);
  const x = (i: number) => M.l + (i * (W - M.l - M.r)) / 11;
  const y = (v: number) => M.t + ((yMax - v) * (H - M.t - M.b)) / (yMax - yMin);
  const linea = (s: number[]) => s.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = `${linea(sin)}L${x(11)},${y(yMin)}L${x(0)},${y(yMin)}Z`;
  const ticks = [];
  for (let v = Math.ceil(yMin / 50) * 50; v <= yMax; v += 50) ticks.push(v);
  const excedidos = sin.filter((v) => v > cap).length;

  return (
    <header className="portada" id="inicio">
      <div className="contenedor">
        <div>
          <h1>Planear la capacidad de la red con la demanda proyectada de las cohortes de riesgo</h1>
          <p className="bajada">
            Integración del gemelo poblacional de AlejandrIA con el gemelo operacional de una sede CIS. La demanda que la
            gestión del riesgo ya proyecta se convierte en carga por zona y por mes, y permite dimensionar Salud en Casa antes
            del pico.
          </p>
          <p className="creditos">
            Propuesta para el equipo de Population Health Management de SURA Salud y EPS SURA. NTT DATA Colombia, octubre de
            2026.
          </p>
        </div>
        <figure className="lamina" style={{ margin: 0 }} aria-labelledby="lamina-t">
          <div className="lamina-titulo" id="lamina-t">
            Consulta externa de la sede, consultas por día hábil en 2027
          </div>
          <div className="lamina-sub">
            {p.cohorte.nombre}, {n0(p.tamano)} personas. {excedidos} de 12 meses por encima de la capacidad sin gestión del
            riesgo.
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Demanda diaria de consulta externa frente a la capacidad de la sede" style={{ display: 'block', marginTop: 10 }}>
            <defs>
              <clipPath id="sobre-cap">
                <rect x={0} y={0} width={W} height={y(cap)} />
              </clipPath>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="#26365f" strokeWidth={1} />
                <text x={M.l - 8} y={y(t) + 4} fill="#97a6c1" fontSize={11} textAnchor="end">
                  {t}
                </text>
              </g>
            ))}
            <path d={area} fill="#d1495b" fillOpacity={0.35} clipPath="url(#sobre-cap)" />
            <line x1={M.l} x2={W - M.r} y1={y(cap)} y2={y(cap)} stroke="#e6edf7" strokeWidth={1.5} />
            <text x={W - M.r} y={y(cap) - 6} fill="#e6edf7" fontSize={11} textAnchor="end">
              Capacidad, {cap} consultas/día
            </text>
            <path d={linea(sin)} fill="none" stroke="#d1495b" strokeWidth={2.4} />
            <path d={linea(con)} fill="none" stroke="#00dfed" strokeWidth={2.4} strokeDasharray="6 4" />
            {MESES.map((m, i) => (
              <text key={m} x={x(i)} y={H - 10} fill="#97a6c1" fontSize={11} textAnchor="middle">
                {m}
              </text>
            ))}
          </svg>
          <div className="leyenda">
            <span>
              <i style={{ background: '#d1495b' }} />
              Con la cohorte, sin gestión del riesgo
            </span>
            <span style={{ color: '#00dfed' }}>
              <i className="punteada" style={{ background: '#00dfed' }} />
              <span style={{ color: '#97a6c1' }}>Con gestión del riesgo{saludEnCasa ? ' y Salud en Casa' : ''}</span>
            </span>
          </div>
        </figure>
      </div>
    </header>
  );
}
