import { useMemo } from 'react';
import { generarTerritorio } from '../data/territorio.ts';
import { calcularSede, mesCritico } from '../model/red.ts';
import type { ResultadoSede } from '../model/red.ts';
import { usePortal } from './portal.ts';

export function useEscenario(id?: string) {
  const escenarios = usePortal((s) => s.escenarios);
  const activo = usePortal((s) => s.escenarioId);
  return escenarios.find((e) => e.id === (id ?? activo)) ?? escenarios[0];
}

export function useStatuQuo() {
  return usePortal((s) => s.escenarios.find((e) => e.id === 'sq')!);
}

export function useResultadoSede(sedeId?: string, escenarioId?: string): ResultadoSede {
  const cat = usePortal((s) => s.catalogo);
  const revision = usePortal((s) => s.revision);
  const sedeSel = usePortal((s) => s.sedeId);
  const esc = useEscenario(escenarioId);
  const sq = useStatuQuo();
  const sede = cat.sedes.find((s) => s.id === (sedeId ?? sedeSel)) ?? cat.sedes[0];
  return useMemo(() => calcularSede(cat, revision, sede, esc, sq), [cat, revision, sede, esc, sq]);
}

export function useResultadosRed(escenarioId?: string): ResultadoSede[] {
  const cat = usePortal((s) => s.catalogo);
  const revision = usePortal((s) => s.revision);
  const esc = useEscenario(escenarioId);
  const sq = useStatuQuo();
  return useMemo(() => cat.sedes.map((s) => calcularSede(cat, revision, s, esc, sq)), [cat, revision, esc, sq]);
}

export function useMesActivo(r: ResultadoSede): number {
  const mes = usePortal((s) => s.mes);
  return mes ?? mesCritico(r);
}

export function useTerritorio() {
  const cat = usePortal((s) => s.catalogo);
  return useMemo(() => generarTerritorio(cat.sedes, cat.semillaTerritorio), [cat.sedes, cat.semillaTerritorio]);
}
