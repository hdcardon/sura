import { useState } from 'react';
import type { Cohorte, Estratos4 } from '../../data/tipos.ts';
import { COLOR_ESTRATO, n0, pct } from '../../ui/formato.tsx';

const PASOS = [1, 2, 5, 10, 20, 25, 50, 100];

export default function MatrizUnidades({ cohorte, n, hoy, sq, esc, nombreEsc }: { cohorte: Cohorte; n: number; hoy: Estratos4; sq: Estratos4; esc: Estratos4; nombreEsc: string }) {
  const [vista, setVista] = useState<'hoy' | 'sq' | 'esc'>('esc');
  const porPunto = PASOS.find((p) => n / p <= 400) ?? 200;
  const dist = vista === 'hoy' ? hoy : vista === 'sq' ? sq : esc;
  const total = Math.round(n / porPunto);
  // Asignación de puntos por estrato con redondeo de mayor resto.
  const crudos = dist.map((p) => p * total);
  const base = crudos.map(Math.floor);
  let resto = total - base.reduce((a, b) => a + b, 0);
  crudos
    .map((x, i) => ({ i, r: x - Math.floor(x) }))
    .sort((a, b) => b.r - a.r)
    .forEach(({ i }) => {
      if (resto > 0) {
        base[i]++;
        resto--;
      }
    });
  const colores: string[] = [];
  base.forEach((k, i) => {
    for (let j = 0; j < k; j++) colores.push(COLOR_ESTRATO[i]);
  });
  const columnas = 25;
  const filas = Math.ceil(total / columnas);
  const paso = 14;

  return (
    <div className="unidades">
      <div className="conmutador" role="group" aria-label="Momento de la cohorte">
        <button type="button" aria-pressed={vista === 'hoy'} onClick={() => setVista('hoy')}>Enero</button>
        <button type="button" aria-pressed={vista === 'sq'} onClick={() => setVista('sq')}>Diciembre, regular</button>
        <button type="button" aria-pressed={vista === 'esc'} onClick={() => setVista('esc')}>Diciembre, {nombreEsc.toLowerCase()}</button>
      </div>
      <svg viewBox={`0 0 ${columnas * paso} ${filas * paso}`} width="100%" role="img" aria-label={`Matriz de ${total} puntos, ${porPunto} personas por punto`}>
        {colores.map((c, i) => (
          <circle key={i} cx={(i % columnas) * paso + paso / 2} cy={Math.floor(i / columnas) * paso + paso / 2} r={5.2} style={{ fill: c, transition: 'fill 0.7s ease' }} />
        ))}
      </svg>
      <div className="leyenda">
        <span>1 punto = {porPunto} personas</span>
        {cohorte.estratos.map((e, i) => (
          <span key={e.nombre}>
            <i style={{ background: COLOR_ESTRATO[i], height: 8, width: 8, borderRadius: 4 }} />
            {e.nombre} {pct(dist[i])} ({n0(dist[i] * n)})
          </span>
        ))}
      </div>
    </div>
  );
}
