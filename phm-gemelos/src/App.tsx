import { useEffect } from 'react';
import { MESES_LARGOS } from './model/calendario.ts';
import { mesCritico } from './model/red.ts';
import Cohortes from './modulos/cohortes/Cohortes.tsx';
import Configuracion from './modulos/Configuracion.tsx';
import Escenarios from './modulos/Escenarios.tsx';
import Panorama from './modulos/Panorama.tsx';
import Sede from './modulos/sede/Sede.tsx';
import Territorio from './modulos/Territorio.tsx';
import { MODULOS, usePortal } from './store/portal.ts';
import type { ModuloId } from './store/portal.ts';
import { useResultadoSede } from './store/selectores.ts';
import { COLOR_ESTADO } from './ui/formato.tsx';
import Selector from './ui/Selector.tsx';

const ICONOS: Record<ModuloId, string> = {
  panorama: 'M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z',
  cohortes: 'M7 7a3 3 0 1 0 0-.01M17 7a3 3 0 1 0 0-.01M2 20c0-3 2.2-5 5-5s5 2 5 5M12 20c0-3 2.2-5 5-5s5 2 5 5',
  territorio: 'M12 2 20.7 7v10L12 22l-8.7-5V7zM12 2v20M3.3 7 20.7 17M20.7 7 3.3 17',
  sede: 'M3 21V9l9-6 9 6v12M9 21v-6h6v6M3 21h18',
  escenarios: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
  configuracion: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1-2 2-.1-.1a1.6 1.6 0 0 0-2.7 1.1V20h-2.8v-.2A1.6 1.6 0 0 0 9.5 18.7l-.1.1-2-2 .1-.1A1.6 1.6 0 0 0 6.4 14H4v-2.8h.2a1.6 1.6 0 0 0 1.1-2.7l-.1-.1 2-2 .1.1A1.6 1.6 0 0 0 10 5.4V5h2.8v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1 2 2-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2V14h-.2a1.6 1.6 0 0 0-1.2 1z',
};

function BarraContexto() {
  const s = usePortal();
  const r = useResultadoSede();
  const critico = mesCritico(r);
  const mostrarSede = s.modulo !== 'cohortes';
  return (
    <div className="contexto" role="region" aria-label="Contexto de análisis">
      <Selector
        etiqueta="Escenario"
        valor={s.escenarioId}
        opciones={s.escenarios.map((e) => ({ valor: e.id, etiqueta: e.nombre, grupo: e.bloqueado ? 'Base' : 'Escenarios' }))}
        onCambio={(v) => s.set({ escenarioId: v })}
        ancho={250}
      />
      {mostrarSede && (
        <Selector
          etiqueta="Sede"
          valor={s.sedeId}
          opciones={s.catalogo.sedes.map((x) => ({ valor: x.id, etiqueta: x.nombre }))}
          onCambio={(v) => s.set({ sedeId: v, mes: null })}
          ancho={180}
        />
      )}
      <Selector
        etiqueta="Mes"
        valor={s.mes === null ? 'auto' : String(s.mes)}
        opciones={[
          { valor: 'auto', etiqueta: `Mes crítico (${MESES_LARGOS[critico]})`, grupo: 'Automático' },
          ...MESES_LARGOS.map((m, i) => ({
            valor: String(i),
            etiqueta: `${m[0].toUpperCase()}${m.slice(1)} 2027`,
            grupo: 'Mes',
            marca: COLOR_ESTADO[r.meses[i].peorEstado],
          })),
        ]}
        onCambio={(v) => s.set({ mes: v === 'auto' ? null : +v })}
        ancho={210}
      />
      <span className="entorno">Entorno de demostración con datos sintéticos</span>
    </div>
  );
}

export default function App() {
  const modulo = usePortal((s) => s.modulo);
  const irA = usePortal((s) => s.irA);
  const set = usePortal((s) => s.set);

  useEffect(() => {
    const f = () => {
      const h = window.location.hash.replace('#', '') as ModuloId;
      if (MODULOS.some((m) => m.id === h)) set({ modulo: h });
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, [set]);

  const actual = MODULOS.find((m) => m.id === modulo)!;

  return (
    <div className="app">
      <nav className="riel" aria-label="Módulos">
        <div className="riel-titulo">
          Planeación de red
          <small>por cohortes de riesgo</small>
        </div>
        <ul>
          {MODULOS.map((m) => (
            <li key={m.id}>
              <a
                href={`#${m.id}`}
                className={m.id === modulo ? 'activo' : ''}
                aria-current={m.id === modulo ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  irA(m.id);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={ICONOS[m.id]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{m.nombre}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <main className="principal">
        <header className="cabecera">
          <div>
            <h1>{actual.nombre}</h1>
            <p>{actual.descripcion}</p>
          </div>
          <BarraContexto />
        </header>
        <div className="contenido">
          {modulo === 'panorama' && <Panorama />}
          {modulo === 'cohortes' && <Cohortes />}
          {modulo === 'territorio' && <Territorio />}
          {modulo === 'sede' && <Sede />}
          {modulo === 'escenarios' && <Escenarios />}
          {modulo === 'configuracion' && <Configuracion />}
        </div>
      </main>
    </div>
  );
}
