import { useEffect, useState } from 'react';
import Capas from './components/Capas.tsx';
import CommandCenter from './components/CommandCenter3D/CommandCenter.tsx';
import DemoPoblacional from './components/DemoPoblacional/DemoPoblacional.tsx';
import Portada from './components/Portada.tsx';
import { PASOS, Presentador, usePresentacion } from './components/Presentacion.tsx';
import ProblemaPHM from './components/ProblemaPHM.tsx';
import ProximoPaso from './components/ProximoPaso.tsx';
import Puente from './components/Puente.tsx';
import Roadmap from './components/Roadmap.tsx';

function useSeccionActiva() {
  const [activa, setActiva] = useState('inicio');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entradas) => {
        const vis = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActiva(vis[0].target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    PASOS.forEach((p) => {
      const el = document.getElementById(p.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return activa;
}

export default function App() {
  const pres = usePresentacion();
  const activa = useSeccionActiva();

  return (
    <>
      <div className="encabezado">
        <div className="contenedor">
          <a className="marca" href="#inicio" style={{ color: 'inherit', textDecoration: 'none' }}>
            <span>NTT DATA</span> Gemelos para PHM
          </a>
          <nav className="nav" aria-label="Secciones">
            {PASOS.slice(1).map((p) => (
              <a key={p.id} href={`#${p.id}`} className={activa === p.id ? 'activo' : ''}>
                {p.nombre}
              </a>
            ))}
          </nav>
          <div className="acciones">
            <span className="sello">Datos sintéticos</span>
            {!pres.activo && (
              <button type="button" className="boton" onClick={pres.iniciar}>
                Presentar
              </button>
            )}
          </div>
        </div>
      </div>
      <main>
        <Portada />
        <ProblemaPHM />
        <DemoPoblacional />
        <Puente />
        <CommandCenter />
        <Capas />
        <Roadmap />
        <ProximoPaso />
      </main>
      {pres.activo && <Presentador paso={pres.paso} mover={pres.mover} salir={pres.salir} />}
    </>
  );
}
