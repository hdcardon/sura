import type { Cohorte } from '../../data/tipos.ts';
import { COLOR_ESTRATO, COLOR_SALIDA, n0 } from '../../ui/formato.tsx';

// Diagrama de flujo (Sankey) de 4 estratos iniciales a 4 estratos finales más salida.
export default function Transiciones({ cohorte, flujo, n }: { cohorte: Cohorte; flujo: number[][]; n: number }) {
  const W = 620;
  const H = 360;
  const arriba = 22;
  const xIzq = 160;
  const xDer = W - 190;
  const anchoNodo = 12;
  const hueco = 10;
  const total = flujo.reduce((a, f) => a + f.reduce((x, y) => x + y, 0), 0);
  const destinos = [0, 1, 2, 3, 4].map((j) => flujo.reduce((a, f) => a + f[j], 0));
  const origenes = flujo.map((f) => f.reduce((a, b) => a + b, 0));
  const escala = (H - arriba - hueco * 4) / total;

  const posiciones = (vals: number[]) => {
    let y = arriba;
    return vals.map((v) => {
      const p = { y, h: Math.max(1, v * escala) };
      y += p.h + hueco;
      return p;
    });
  };
  const pi = posiciones(origenes);
  const pd = posiciones(destinos);
  // Separación mínima entre etiquetas para nodos pequeños.
  const etiquetas = (ps: { y: number; h: number }[]) => {
    const ys = ps.map((p) => p.y + p.h / 2);
    for (let k = 1; k < ys.length; k++) ys[k] = Math.max(ys[k], ys[k - 1] + 26);
    const exceso = ys[ys.length - 1] - (H - 14);
    return exceso > 0 ? ys.map((y) => y - exceso) : ys;
  };
  const yi = etiquetas(pi);
  const yd = etiquetas(pd);
  const offI = pi.map((p) => p.y);
  const offD = pd.map((p) => p.y);
  const nombresD = [...cohorte.estratos.map((e) => e.nombre), 'Salida'];
  const coloresD = [...COLOR_ESTRATO, COLOR_SALIDA];

  const enlaces: { d: string; color: string; titulo: string }[] = [];
  flujo.forEach((fila, i) => {
    fila.forEach((v, j) => {
      if (v * escala < 0.4) return;
      const h = v * escala;
      const y0 = offI[i] + h / 2;
      const y1 = offD[j] + h / 2;
      offI[i] += h;
      offD[j] += h;
      const x0 = xIzq + anchoNodo;
      const x1 = xDer;
      const cx = (x0 + x1) / 2;
      enlaces.push({
        d: `M${x0},${y0 - h / 2} C${cx},${y0 - h / 2} ${cx},${y1 - h / 2} ${x1},${y1 - h / 2} L${x1},${y1 + h / 2} C${cx},${y1 + h / 2} ${cx},${y0 + h / 2} ${x0},${y0 + h / 2} Z`,
        color: COLOR_ESTRATO[i],
        titulo: `${cohorte.estratos[i].nombre} a ${nombresD[j]}: ${n0((v / total) * n)} personas`,
      });
    });
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Transiciones entre estratos en 12 meses" className="sankey">
      {enlaces.map((e, k) => (
        <path key={k} d={e.d} style={{ fill: e.color, fillOpacity: 0.28 }}>
          <title>{e.titulo}</title>
        </path>
      ))}
      {pi.map((p, i) => (
        <g key={`i${i}`}>
          <rect x={xIzq} y={p.y} width={anchoNodo} height={p.h} style={{ fill: COLOR_ESTRATO[i] }} />
          <text x={xIzq - 8} y={yi[i] - 6} textAnchor="end" dominantBaseline="middle" className="sankey-texto">
            {cohorte.estratos[i].nombre}
            <tspan className="sankey-num" x={xIzq - 8} dy="1.2em">{n0((origenes[i] / total) * n)}</tspan>
          </text>
        </g>
      ))}
      {pd.map((p, j) => (
        <g key={`d${j}`}>
          <rect x={xDer} y={p.y} width={anchoNodo} height={p.h} style={{ fill: coloresD[j] }} />
          <text x={xDer + anchoNodo + 8} y={yd[j] - 6} dominantBaseline="middle" className="sankey-texto">
            {nombresD[j]}
            <tspan className="sankey-num" x={xDer + anchoNodo + 8} dy="1.2em">{n0((destinos[j] / total) * n)}</tspan>
          </text>
        </g>
      ))}
      <text x={xIzq + anchoNodo / 2} y={12} textAnchor="middle" className="sankey-eje">Enero</text>
      <text x={xDer + anchoNodo / 2} y={12} textAnchor="middle" className="sankey-eje">Diciembre</text>
    </svg>
  );
}
