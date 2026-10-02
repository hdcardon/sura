import { useCallback, useEffect, useState } from 'react';
import { useSim } from '../store/simulacion.ts';

export const PASOS = [
  { id: 'inicio', nombre: 'Inicio' },
  { id: 'problema', nombre: 'Problema' },
  { id: 'gemelo-poblacional', nombre: 'Gemelo poblacional' },
  { id: 'conexion', nombre: 'Conexión' },
  { id: 'sede-cis', nombre: 'Sede CIS' },
  { id: 'capas', nombre: 'Capas' },
  { id: 'hoja-de-ruta', nombre: 'Hoja de ruta' },
  { id: 'proximo-paso', nombre: 'Próximo paso' },
];

// Guion del modo presentación: cada paso puede fijar el escenario de la simulación.
const GUION: Record<string, () => void> = {
  conexion: () => useSim.setState({ escenario: 'sinGestion', mes: null, reproduciendo: false }),
  'sede-cis': () => useSim.setState({ escenario: 'sinGestion', zona: 'consulta', mes: null, reproduciendo: false }),
};

function irA(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

export function usePresentacion() {
  const [activo, setActivo] = useState(false);
  const [paso, setPaso] = useState(0);

  const mover = useCallback((n: number) => {
    setPaso((p) => {
      const q = Math.max(0, Math.min(PASOS.length - 1, p + n));
      GUION[PASOS[q].id]?.();
      irA(PASOS[q].id);
      return q;
    });
  }, []);

  const iniciar = useCallback(() => {
    setActivo(true);
    setPaso(0);
    irA(PASOS[0].id);
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  const salir = useCallback(() => {
    setActivo(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!activo) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        mover(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        mover(-1);
      } else if (e.key === 'Escape') salir();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activo, mover, salir]);

  useEffect(() => {
    document.querySelectorAll('.foco').forEach((el) => el.classList.remove('foco'));
    document.body.classList.toggle('presentando', activo);
    if (activo) document.getElementById(PASOS[paso].id)?.classList.add('foco');
  }, [activo, paso]);

  return { activo, paso, iniciar, salir, mover };
}

export function Presentador({ paso, mover, salir }: { paso: number; mover: (n: number) => void; salir: () => void }) {
  const reiniciar = useSim((s) => s.reiniciar);
  return (
    <div className="presentador" role="toolbar" aria-label="Modo presentación">
      <button type="button" onClick={() => mover(-1)} disabled={paso === 0} aria-label="Paso anterior">
        Anterior
      </button>
      <span className="paso">
        {paso + 1} de {PASOS.length}, {PASOS[paso].nombre}
      </span>
      <button type="button" onClick={() => mover(1)} disabled={paso === PASOS.length - 1} aria-label="Paso siguiente">
        Siguiente
      </button>
      <button type="button" onClick={reiniciar}>Reiniciar simulación</button>
      <button type="button" onClick={salir}>Salir</button>
    </div>
  );
}
