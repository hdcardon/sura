import { create } from 'zustand';
import { CATALOGO_BASE } from '../data/catalogoBase.ts';
import { escenariosBase } from '../data/escenariosBase.ts';
import type { Catalogo, Cohorte, Escenario, Zona } from '../data/tipos.ts';

export type ModuloId = 'panorama' | 'cohortes' | 'territorio' | 'sede' | 'escenarios' | 'configuracion';
export const MODULOS: { id: ModuloId; nombre: string; descripcion: string }[] = [
  { id: 'panorama', nombre: 'Vista general', descripcion: 'Estado de la red por sede y mes' },
  { id: 'cohortes', nombre: 'Cohortes', descripcion: 'Modelo poblacional de demanda' },
  { id: 'territorio', nombre: 'Territorio', descripcion: 'Demanda y acceso por celda' },
  { id: 'sede', nombre: 'Sede', descripcion: 'Modelo de capacidad de la sede' },
  { id: 'escenarios', nombre: 'Escenarios', descripcion: 'Configuración y comparación' },
  { id: 'configuracion', nombre: 'Configuración', descripcion: 'Catálogos, fuentes y estado del modelo' },
];

const CLAVE = 'portal-capacidad-cohortes-v2';

interface Persistido {
  catalogo: Catalogo;
  escenarios: Escenario[];
}

function leer(): Persistido | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const v = JSON.parse(raw) as Persistido;
    if (v.catalogo?.version !== CATALOGO_BASE.version) return null;
    return v;
  } catch {
    return null;
  }
}

function guardar(p: Persistido) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    /* almacenamiento no disponible */
  }
}

const moduloDeHash = (): ModuloId => {
  try {
    const h = window.location.hash.replace('#', '') as ModuloId;
    return MODULOS.some((m) => m.id === h) ? h : 'panorama';
  } catch {
    return 'panorama';
  }
};

const clonar = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const inicial = leer();

interface EstadoPortal {
  modulo: ModuloId;
  catalogo: Catalogo;
  revision: number;
  escenarios: Escenario[];
  escenarioId: string;
  comparar: string[];
  mes: number | null; // null sigue el mes crítico de la sede seleccionada
  sedeId: string;
  ambito: string; // 'red' o id de sede, para Cohortes
  cohorteId: string;
  zonaId: string;
  flujo: boolean;
  metricaMapa: string;
  coberturaDomiciliaria: boolean;
  irA: (m: ModuloId) => void;
  set: (p: Partial<EstadoPortal>) => void;
  actualizarEscenario: (id: string, p: Partial<Escenario>) => void;
  duplicarEscenario: (id: string) => void;
  nuevoEscenario: () => void;
  eliminarEscenario: (id: string) => void;
  actualizarCohorte: (id: string, p: Partial<Cohorte>) => void;
  agregarCohorte: (c: Cohorte, pctAdultos: number) => void;
  eliminarCohorte: (id: string) => void;
  actualizarZona: (sedeId: string, zonaId: string, p: Partial<Zona>) => void;
  restablecer: () => void;
}

export const usePortal = create<EstadoPortal>((set, get) => {
  const persistir = (cambios: Partial<EstadoPortal>) => {
    const s = { ...get(), ...cambios };
    guardar({ catalogo: s.catalogo, escenarios: s.escenarios });
  };
  const catalogo = inicial?.catalogo ?? clonar(CATALOGO_BASE);
  const escenarios = inicial?.escenarios ?? escenariosBase(catalogo);
  return {
    modulo: moduloDeHash(),
    catalogo,
    revision: 1,
    escenarios,
    escenarioId: 'sq',
    comparar: ['sq', 'ampliada', 'canales', 'caida'],
    mes: null,
    sedeId: 'norte',
    ambito: 'red',
    cohorteId: 'hta',
    zonaId: 'consulta',
    flujo: false,
    metricaMapa: 'prevalencia',
    coberturaDomiciliaria: false,
    irA: (modulo) => {
      try {
        window.location.hash = modulo;
      } catch {
        /* sin hash */
      }
      set({ modulo });
    },
    set: (p) => set(p),
    actualizarEscenario: (id, p) => {
      const escenarios = get().escenarios.map((e) => (e.id === id ? { ...e, ...p } : e));
      set({ escenarios });
      persistir({ escenarios });
    },
    duplicarEscenario: (id) => {
      const base = get().escenarios.find((e) => e.id === id)!;
      const nuevo: Escenario = { ...clonar(base), id: `e${Date.now().toString(36)}`, nombre: `${base.nombre} (copia)`, bloqueado: false };
      const escenarios = [...get().escenarios, nuevo];
      set({ escenarios, escenarioId: nuevo.id, comparar: [...get().comparar, nuevo.id].slice(-5) });
      persistir({ escenarios });
    },
    nuevoEscenario: () => {
      const sq = get().escenarios.find((e) => e.id === 'sq')!;
      const nuevo: Escenario = { ...clonar(sq), id: `e${Date.now().toString(36)}`, nombre: 'Escenario nuevo', bloqueado: false };
      const escenarios = [...get().escenarios, nuevo];
      set({ escenarios, escenarioId: nuevo.id, comparar: [...get().comparar, nuevo.id].slice(-5) });
      persistir({ escenarios });
    },
    eliminarEscenario: (id) => {
      const escenarios = get().escenarios.filter((e) => e.id !== id || e.bloqueado);
      const escenarioId = get().escenarioId === id ? 'sq' : get().escenarioId;
      set({ escenarios, escenarioId, comparar: get().comparar.filter((c) => c !== id) });
      persistir({ escenarios });
    },
    actualizarCohorte: (id, p) => {
      const catalogo = { ...get().catalogo, cohortes: get().catalogo.cohortes.map((c) => (c.id === id ? { ...c, ...p } : c)) };
      set({ catalogo, revision: get().revision + 1 });
      persistir({ catalogo });
    },
    agregarCohorte: (c, pctAdultos) => {
      const catalogo: Catalogo = {
        ...get().catalogo,
        cohortes: [...get().catalogo.cohortes, c],
        perfiles: [...get().catalogo.perfiles, { cohortes: [c.id], pctAdultos }],
      };
      const escenarios = get().escenarios.map((e) => ({
        ...e,
        cobertura: { ...e.cobertura, [c.id]: e.id === 'sq' ? c.coberturaActual : Math.min(0.9, Math.max(0.05, c.coberturaActual + (e.cobertura.hta ?? 0.45) - 0.45)) },
      }));
      set({ catalogo, escenarios, revision: get().revision + 1, cohorteId: c.id });
      persistir({ catalogo, escenarios });
    },
    eliminarCohorte: (id) => {
      const cat = get().catalogo;
      const catalogo: Catalogo = {
        ...cat,
        cohortes: cat.cohortes.filter((c) => c.id !== id),
        perfiles: cat.perfiles.filter((p) => !p.cohortes.includes(id)),
      };
      set({ catalogo, revision: get().revision + 1, cohorteId: get().cohorteId === id ? catalogo.cohortes[0].id : get().cohorteId });
      persistir({ catalogo });
    },
    actualizarZona: (sedeId, zonaId, p) => {
      const cat = get().catalogo;
      const catalogo: Catalogo = {
        ...cat,
        sedes: cat.sedes.map((s) => (s.id !== sedeId ? s : { ...s, zonas: s.zonas.map((z) => (z.id === zonaId ? { ...z, ...p } : z)) })),
      };
      set({ catalogo, revision: get().revision + 1 });
      persistir({ catalogo });
    },
    restablecer: () => {
      const catalogo = clonar(CATALOGO_BASE);
      const escenarios = escenariosBase(catalogo);
      try {
        localStorage.removeItem(CLAVE);
      } catch {
        /* sin almacenamiento */
      }
      set({ catalogo, escenarios, revision: get().revision + 1, escenarioId: 'sq', comparar: ['sq', 'ampliada', 'canales', 'caida'], cohorteId: 'hta', mes: null });
    },
  };
});
