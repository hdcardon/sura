import { create } from 'zustand';
import { COHORTES } from '../data/supuestos.ts';
import type { ZonaId } from '../data/supuestos.ts';
import { cohortePorId, proyectar } from '../model/modelo.ts';
import type { Escenario, Proyeccion } from '../model/modelo.ts';

const tamanosDefault = () => Object.fromEntries(COHORTES.map((c) => [c.id, c.tamanoDefault])) as Record<string, number>;

interface Estado {
  cohorteId: string;
  tamanos: Record<string, number>;
  intervencion: number;
  escenario: Escenario;
  saludEnCasa: boolean;
  mes: number | null; // null sigue el mes pico de la cohorte
  zona: ZonaId;
  reproduciendo: boolean;
  setCohorte: (id: string) => void;
  setTamano: (n: number) => void;
  setIntervencion: (x: number) => void;
  setEscenario: (e: Escenario) => void;
  setSaludEnCasa: (b: boolean) => void;
  setMes: (m: number | null) => void;
  setZona: (z: ZonaId) => void;
  setReproduciendo: (b: boolean) => void;
  reiniciar: () => void;
}

const inicial = {
  cohorteId: 'rcv',
  tamanos: tamanosDefault(),
  intervencion: 0.7,
  escenario: 'sinGestion' as Escenario,
  saludEnCasa: true,
  mes: null as number | null,
  zona: 'consulta' as ZonaId,
  reproduciendo: false,
};

export const useSim = create<Estado>((set) => ({
  ...inicial,
  setCohorte: (cohorteId) => set({ cohorteId, mes: null }),
  setTamano: (n) => set((s) => ({ tamanos: { ...s.tamanos, [s.cohorteId]: n } })),
  setIntervencion: (intervencion) => set({ intervencion }),
  setEscenario: (escenario) => set({ escenario }),
  setSaludEnCasa: (saludEnCasa) => set({ saludEnCasa }),
  setMes: (mes) => set({ mes }),
  setZona: (zona) => set({ zona }),
  setReproduciendo: (reproduciendo) => set({ reproduciendo }),
  reiniciar: () => set({ ...inicial, tamanos: tamanosDefault() }),
}));

// Proyección memoizada por combinación de entradas.
let cache: { key: string; p: Proyeccion } | null = null;
export function useProyeccion(): Proyeccion {
  const cohorteId = useSim((s) => s.cohorteId);
  const tamano = useSim((s) => s.tamanos[s.cohorteId]);
  const intervencion = useSim((s) => s.intervencion);
  const key = `${cohorteId}|${tamano}|${intervencion}`;
  if (!cache || cache.key !== key) cache = { key, p: proyectar(cohortePorId(cohorteId), tamano, intervencion) };
  return cache.p;
}

export function useMesActivo(): number {
  const p = useProyeccion();
  const mes = useSim((s) => s.mes);
  return mes ?? p.mesPico;
}
