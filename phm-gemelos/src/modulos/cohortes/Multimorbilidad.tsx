import type { Cohorte, PerfilMultimorbilidad } from '../../data/tipos.ts';
import { n0 } from '../../ui/formato.tsx';

// Diagrama UpSet: barras por intersección exclusiva, matriz de pertenencia y tamaño de cada conjunto.
export default function Multimorbilidad({ perfiles, cohortes, seleccion }: { perfiles: (PerfilMultimorbilidad & { n: number })[]; cohortes: Cohorte[]; seleccion: string }) {
  const top = [...perfiles].sort((a, b) => b.n - a.n).slice(0, 12);
  const corto = (c: Cohorte) => (c.id.length <= 4 ? c.id.toUpperCase() : c.nombre.split(' ')[0]);
  const conjuntos = cohortes.map((c) => ({ c, n: perfiles.filter((p) => p.cohortes.includes(c.id)).reduce((a, p) => a + p.n, 0) }));
  const izq = 150;
  const colW = 30;
  const altoBarras = 150;
  const fila = 22;
  const W = izq + top.length * colW + 10;
  const H = altoBarras + 16 + cohortes.length * fila + 6;
  const maxN = Math.max(...top.map((p) => p.n));
  const maxC = Math.max(...conjuntos.map((x) => x.n));
  const yFila = (i: number) => altoBarras + 16 + i * fila + fila / 2;

  return (
    <div className="tabla-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 420 }} role="img" aria-label="Intersecciones de multimorbilidad" className="upset">
        {top.map((p, k) => {
          const x = izq + k * colW + colW / 2;
          const h = (p.n / maxN) * (altoBarras - 18);
          const incluye = p.cohortes.includes(seleccion);
          const filas = cohortes.map((c, i) => (p.cohortes.includes(c.id) ? i : -1)).filter((i) => i >= 0);
          return (
            <g key={p.cohortes.join('+')}>
              <rect x={x - 9} y={altoBarras - h} width={18} height={h} style={{ fill: incluye ? 'var(--acento)' : 'var(--tinta-3)', opacity: incluye ? 1 : 0.45 }}>
                <title>{`${p.cohortes.map((id) => cohortes.find((c) => c.id === id)?.nombre).join(' + ')}: ${n0(p.n)} personas`}</title>
              </rect>
              <text x={x} y={altoBarras - h - 4} textAnchor="middle" className="upset-num">{n0(p.n)}</text>
              {filas.length > 1 && <line x1={x} x2={x} y1={yFila(filas[0])} y2={yFila(filas[filas.length - 1])} style={{ stroke: incluye ? 'var(--acento)' : 'var(--tinta-3)' }} strokeWidth={2} />}
              {cohortes.map((c, i) => (
                <circle key={c.id} cx={x} cy={yFila(i)} r={5} style={{ fill: p.cohortes.includes(c.id) ? (incluye ? 'var(--acento)' : 'var(--tinta-2)') : 'var(--linea)' }} />
              ))}
            </g>
          );
        })}
        {conjuntos.map(({ c, n }, i) => (
          <g key={c.id}>
            <rect x={izq - 62 - (n / maxC) * 50} y={yFila(i) - 6} width={(n / maxC) * 50} height={12} style={{ fill: c.id === seleccion ? 'var(--acento)' : 'var(--tinta-3)', opacity: c.id === seleccion ? 1 : 0.45 }} />
            <text x={izq - 56} y={yFila(i)} dominantBaseline="middle" className="upset-texto">{corto(c)}</text>
            <text x={izq - 66 - (n / maxC) * 50} y={yFila(i)} dominantBaseline="middle" textAnchor="end" className="upset-num">{n0(n)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
