import type { Catalogo, Escenario } from './tipos.ts';

const cob = (cat: Catalogo, f: (c: number) => number) =>
  Object.fromEntries(cat.cohortes.map((co) => [co.id, +Math.min(0.9, Math.max(0.05, f(co.coberturaActual))).toFixed(2)]));

export function escenariosBase(cat: Catalogo): Escenario[] {
  return [
    { id: 'sq', nombre: 'Statu quo', bloqueado: true, cobertura: cob(cat, (c) => c), domicilio: false, virtual: false, medicosVirtuales: 0, recordatorios: false },
    { id: 'ampliada', nombre: 'Gestión del riesgo ampliada', cobertura: cob(cat, (c) => c + 0.25), domicilio: false, virtual: false, medicosVirtuales: 0, recordatorios: false },
    { id: 'canales', nombre: 'Gestión ampliada con canales', cobertura: cob(cat, (c) => c + 0.25), domicilio: true, virtual: true, medicosVirtuales: 2, recordatorios: true },
    { id: 'caida', nombre: 'Caída de la gestión', cobertura: cob(cat, (c) => c - 0.2), domicilio: false, virtual: false, medicosVirtuales: 0, recordatorios: false },
  ];
}
