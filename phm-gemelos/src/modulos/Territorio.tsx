import { useMemo, useState } from 'react';
import { VECINOS } from '../data/territorio.ts';
import { MESES_LARGOS } from '../model/calendario.ts';
import { mesCritico } from '../model/red.ts';
import { usePortal } from '../store/portal.ts';
import { useEscenario, useResultadosRed, useTerritorio } from '../store/selectores.ts';
import { n0, n1 } from '../ui/formato.tsx';
import Selector from '../ui/Selector.tsx';
import { tasasCacheadas } from '../model/red.ts';

const METRICAS = [
  { valor: 'prevalencia', etiqueta: 'Prevalencia de la cohorte', grupo: 'Cohorte seleccionada', unidad: '% adultos' },
  { valor: 'personas', etiqueta: 'Personas en la cohorte', grupo: 'Cohorte seleccionada', unidad: 'personas' },
  { valor: 'altoRiesgo', etiqueta: 'Personas en alto riesgo en diciembre', grupo: 'Cohorte seleccionada', unidad: 'personas' },
  { valor: 'demanda', etiqueta: 'Atenciones presenciales de cohortes por día', grupo: 'Red y escenario', unidad: 'atenciones/día' },
  { valor: 'tiempo', etiqueta: 'Tiempo de viaje a la sede asignada', grupo: 'Acceso', unidad: 'minutos' },
  { valor: 'adultos', etiqueta: 'Adultos adscritos', grupo: 'Acceso', unidad: 'adultos' },
];

const RAMPA = ['var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)', 'var(--seq-6)'];
const MIN_COBERTURA = 30;

export default function Territorio() {
  const s = usePortal();
  const cat = s.catalogo;
  const celdas = useTerritorio();
  const esc = useEscenario();
  const red = useResultadosRed();
  const co = cat.cohortes.find((c) => c.id === s.cohorteId) ?? cat.cohortes[0];
  const [sel, setSel] = useState<string | null>(null);
  const metrica = METRICAS.find((m) => m.valor === s.metricaMapa) ?? METRICAS[0];

  const pctCohorte = cat.perfiles.filter((p) => p.cohortes.includes(co.id)).reduce((a, p) => a + p.pctAdultos, 0);
  const altoRiesgo = tasasCacheadas(cat, s.revision, co.id, esc.cobertura[co.id] ?? co.coberturaActual).dinEsc.inicio[12][3];

  const valores = useMemo(() => {
    return celdas.map((c) => {
      const r = red.find((x) => x.sede.id === c.sedeId)!;
      const m = s.mes ?? mesCritico(r);
      const personas = (c.adultos * c.factorPrevalencia * pctCohorte) / 100;
      let v = 0;
      switch (metrica.valor) {
        case 'prevalencia': v = c.factorPrevalencia * pctCohorte; break;
        case 'personas': v = personas; break;
        case 'altoRiesgo': v = personas * altoRiesgo; break;
        case 'demanda': {
          const pesoCelda = (c.adultos * c.factorPrevalencia) / celdas.filter((x) => x.sedeId === c.sedeId).reduce((a, x) => a + x.adultos * x.factorPrevalencia, 0);
          const cron = ['consulta', 'prioritaria', 'laboratorio', 'procedimientos'].reduce((a, z) => a + (r.meses[m].zonas[z]?.aporteCronicoDia ?? 0), 0);
          v = cron * pesoCelda;
          break;
        }
        case 'tiempo': v = c.minutosASede; break;
        default: v = c.adultos;
      }
      return v;
    });
  }, [celdas, red, metrica.valor, pctCohorte, altoRiesgo, s.mes]);

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const clase = (v: number) => Math.min(5, Math.floor(((v - min) / (max - min || 1)) * 6));
  const cortes = Array.from({ length: 7 }, (_, i) => min + ((max - min) * i) / 6);

  const R = 22;
  const px = (q: number, r: number) => [R * Math.sqrt(3) * (q + r / 2), R * 1.5 * r] as const;
  const pos = celdas.map((c) => px(c.q, c.r));
  const xs = pos.map((p) => p[0]);
  const ys = pos.map((p) => p[1]);
  const x0 = Math.min(...xs) - R * 1.2;
  const y0 = Math.min(...ys) - R * 1.4;
  const W = Math.max(...xs) - x0 + R * 1.2;
  const H = Math.max(...ys) - y0 + R * 1.4;
  const hexPath = (cx: number, cy: number, rr = R) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
    }).join('') + 'Z';

  // Bordes entre territorios de sedes distintas.
  const indice = new Map(celdas.map((c, i) => [`${c.q},${c.r}`, i]));
  const bordes: string[] = [];
  const ladoPorVecino = [0, 5, 4, 3, 2, 1]; // vecino axial k comparte el lado opuesto en el hexágono puntiagudo
  celdas.forEach((c, i) => {
    VECINOS.forEach(([dq, dr], k) => {
      const j = indice.get(`${c.q + dq},${c.r + dr}`);
      if (j === undefined || celdas[j].sedeId === c.sedeId || j < i) return;
      const [cx, cy] = pos[i];
      const lado = ladoPorVecino[k];
      const a1 = (Math.PI / 180) * (60 * lado - 30);
      const a2 = (Math.PI / 180) * (60 * (lado + 1) - 30);
      bordes.push(`M${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)}L${cx + R * Math.cos(a2)},${cy + R * Math.sin(a2)}`);
    });
  });

  const celdaSel = sel ? celdas.find((c) => c.id === sel) : null;
  const iSel = celdaSel ? celdas.indexOf(celdaSel) : -1;
  const fmt = (v: number) => (metrica.valor === 'prevalencia' ? `${n1(v)} %` : n0(v));

  const resumen = cat.sedes.map((sd) => {
    const propias = celdas.filter((c) => c.sedeId === sd.id);
    const adultos = propias.reduce((a, c) => a + c.adultos, 0);
    const personas = propias.reduce((a, c) => a + (c.adultos * c.factorPrevalencia * pctCohorte) / 100, 0);
    const fuera = propias.filter((c) => c.minutosASede > MIN_COBERTURA).reduce((a, c) => a + c.adultos, 0);
    return { sd, adultos, personas, fuera, celdas: propias.length };
  });

  return (
    <div className="modulo">
      <div className="barra-modulo">
        <Selector etiqueta="Indicador" valor={metrica.valor} opciones={METRICAS} onCambio={(v) => s.set({ metricaMapa: v })} ancho={330} />
        <Selector
          etiqueta="Cohorte"
          valor={co.id}
          opciones={cat.cohortes.map((c) => ({ valor: c.id, etiqueta: c.nombre, grupo: c.ruta }))}
          onCambio={(v) => s.set({ cohorteId: v })}
          ancho={280}
        />
        <label className="interruptor" htmlFor="cob-dom">
          <input id="cob-dom" type="checkbox" checked={s.coberturaDomiciliaria} onChange={(e) => s.set({ coberturaDomiciliaria: e.target.checked })} />
          <span>Marcar celdas a más de {MIN_COBERTURA} min de su sede</span>
        </label>
      </div>

      <div className="rejilla-mapa">
        <section className="panel" aria-labelledby="mapa-t">
          <div className="panel-cabeza">
            <h2 id="mapa-t">{metrica.etiqueta}</h2>
            <p>
              {metrica.valor === 'demanda' ? `Escenario ${esc.nombre.toLowerCase()}, mes ${s.mes === null ? 'crítico de cada sede' : MESES_LARGOS[s.mes]}. ` : ''}
              {celdas.length} celdas. Las líneas gruesas separan los territorios de cada sede.
            </p>
          </div>
          <svg viewBox={`${x0} ${y0} ${W} ${H}`} width="100%" role="img" aria-label={`Mapa de ${metrica.etiqueta}`} className="mapa-hex">
            <defs>
              <pattern id="rayado" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: 'var(--tinta)', strokeWidth: 1.4, opacity: 0.55 }} />
              </pattern>
            </defs>
            {celdas.map((c, i) => (
              <g key={c.id} onClick={() => setSel(c.id)} style={{ cursor: 'pointer' }}>
                <path d={hexPath(pos[i][0], pos[i][1])} style={{ fill: RAMPA[clase(valores[i])], stroke: 'var(--superficie)', strokeWidth: 1.5 }}>
                  <title>{`${c.id}, ${cat.sedes.find((x) => x.id === c.sedeId)?.nombre}: ${fmt(valores[i])}`}</title>
                </path>
                {s.coberturaDomiciliaria && c.minutosASede > MIN_COBERTURA && <path d={hexPath(pos[i][0], pos[i][1], R - 2)} style={{ fill: 'url(#rayado)', pointerEvents: 'none' }} />}
              </g>
            ))}
            <path d={bordes.join('')} style={{ stroke: 'var(--tinta)', strokeWidth: 2.6, fill: 'none', strokeLinecap: 'round', pointerEvents: 'none' }} />
            {iSel >= 0 && <path d={hexPath(pos[iSel][0], pos[iSel][1], R - 1)} style={{ fill: 'none', stroke: 'var(--acento)', strokeWidth: 3, pointerEvents: 'none' }} />}
            {cat.sedes.map((sd) => {
              const [cx, cy] = px(sd.hex[0], sd.hex[1]);
              return (
                <g key={sd.id} style={{ pointerEvents: 'none' }}>
                  <circle cx={cx} cy={cy} r={8} style={{ fill: 'var(--superficie)', stroke: 'var(--tinta)', strokeWidth: 2.5 }} />
                  <circle cx={cx} cy={cy} r={3} style={{ fill: 'var(--tinta)' }} />
                  <text x={cx} y={cy - 13} textAnchor="middle" className="mapa-etiqueta">{sd.nombre}</text>
                </g>
              );
            })}
          </svg>
          <div className="leyenda-rampa" aria-label="Escala de colores">
            {RAMPA.map((c, i) => (
              <span key={i}>
                <i style={{ background: c }} />
                {fmt(cortes[i])}
              </span>
            ))}
            <span className="unidad">{metrica.unidad}</span>
          </div>
        </section>

        <aside className="panel panel-lateral" aria-live="polite">
          {celdaSel ? (
            <>
              <div className="panel-cabeza">
                <h2>Celda {celdaSel.id}</h2>
                <p>{cat.sedes.find((x) => x.id === celdaSel.sedeId)?.nombre}</p>
              </div>
              <dl className="pares">
                <div><dt>{metrica.etiqueta}</dt><dd>{fmt(valores[iSel])}</dd></div>
                <div><dt>Adultos adscritos</dt><dd>{n0(celdaSel.adultos)}</dd></div>
                <div><dt>Índice de prevalencia</dt><dd>{n1(celdaSel.factorPrevalencia)}</dd></div>
                <div><dt>Personas en {co.nombre.toLowerCase()}</dt><dd>{n0((celdaSel.adultos * celdaSel.factorPrevalencia * pctCohorte) / 100)}</dd></div>
                <div><dt>Tiempo a la sede</dt><dd>{celdaSel.minutosASede} min</dd></div>
              </dl>
              <button type="button" className="enlace" onClick={() => setSel(null)}>Quitar selección</button>
            </>
          ) : (
            <div className="panel-cabeza">
              <h2>Detalle de celda</h2>
              <p>Seleccione una celda del mapa para ver su población, prevalencia y acceso.</p>
            </div>
          )}
          <div className="tabla-scroll" style={{ marginTop: 16 }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Sede</th>
                  <th className="d">Adultos</th>
                  <th className="d">En la cohorte</th>
                  <th className="d">A más de {MIN_COBERTURA} min</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((x) => (
                  <tr key={x.sd.id}>
                    <td>{x.sd.nombre}</td>
                    <td className="d">{n0(x.adultos)}</td>
                    <td className="d">{n0(x.personas)}</td>
                    <td className="d">{n0((x.fuera / x.adultos) * 100)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>
      </div>
    </div>
  );
}
