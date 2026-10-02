import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface Opcion {
  valor: string;
  etiqueta: string;
  grupo?: string;
  detalle?: string;
  marca?: string; // color de acento opcional (estado)
}

interface BaseProps {
  etiqueta: string;
  opciones: Opcion[];
  ancho?: number | string;
  compacto?: boolean;
  buscar?: boolean; // por defecto se activa con más de 7 opciones
}

interface Simple extends BaseProps {
  multiple?: false;
  valor: string;
  onCambio: (v: string) => void;
}

interface Multiple extends BaseProps {
  multiple: true;
  valor: string[];
  onCambio: (v: string[]) => void;
  maximo?: number;
}

export default function Selector(props: Simple | Multiple) {
  const { etiqueta, opciones, ancho, compacto } = props;
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [activo, setActivo] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const id = useId();
  const conBusqueda = props.buscar ?? opciones.length > 7;

  const visibles = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    return f ? opciones.filter((o) => `${o.etiqueta} ${o.grupo ?? ''} ${o.detalle ?? ''}`.toLowerCase().includes(f)) : opciones;
  }, [opciones, filtro]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  useEffect(() => {
    if (abierto) {
      const i = props.multiple ? 0 : Math.max(0, visibles.findIndex((o) => o.valor === props.valor));
      setActivo(i);
    } else setFiltro('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  useEffect(() => {
    lista.current?.querySelector<HTMLElement>(`[data-i="${activo}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activo]);

  const elegido = (v: string) => (props.multiple ? props.valor.includes(v) : props.valor === v);

  const elegir = (o: Opcion) => {
    if (props.multiple) {
      const ya = props.valor.includes(o.valor);
      let sig = ya ? props.valor.filter((v) => v !== o.valor) : [...props.valor, o.valor];
      if (props.maximo && sig.length > props.maximo) sig = sig.slice(sig.length - props.maximo);
      if (sig.length) props.onCambio(sig);
    } else {
      props.onCambio(o.valor);
      setAbierto(false);
    }
  };

  const texto = props.multiple
    ? props.valor.length === 1
      ? opciones.find((o) => o.valor === props.valor[0])?.etiqueta
      : `${props.valor.length} seleccionados`
    : opciones.find((o) => o.valor === props.valor)?.etiqueta ?? 'Seleccionar';
  const marca = !props.multiple ? opciones.find((o) => o.valor === props.valor)?.marca : undefined;

  const onKey = (e: React.KeyboardEvent) => {
    if (!abierto && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setAbierto(true);
      return;
    }
    if (!abierto) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivo((a) => Math.min(visibles.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (visibles[activo]) elegir(visibles[activo]);
    } else if (e.key === 'Escape') setAbierto(false);
  };

  let grupoPrevio: string | undefined;

  return (
    <div className={`selector${compacto ? ' compacto' : ''}`} ref={raiz} style={{ width: ancho }} onKeyDown={onKey}>
      <span className="selector-etiqueta" id={`${id}-l`}>
        {etiqueta}
      </span>
      <button
        type="button"
        className="selector-boton"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-labelledby={`${id}-l ${id}-v`}
        onClick={() => setAbierto((a) => !a)}
      >
        {marca && <i className="selector-marca" style={{ background: marca }} />}
        <span id={`${id}-v`} className="selector-valor">
          {texto}
        </span>
        <svg viewBox="0 0 12 12" aria-hidden="true" className="selector-flecha">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      {abierto && (
        <div className="selector-panel">
          {conBusqueda && (
            <input
              autoFocus
              className="selector-buscar"
              placeholder="Buscar"
              value={filtro}
              onChange={(e) => {
                setFiltro(e.target.value);
                setActivo(0);
              }}
              aria-label={`Buscar en ${etiqueta}`}
            />
          )}
          <ul role="listbox" aria-multiselectable={props.multiple || undefined} ref={lista} tabIndex={-1}>
            {visibles.length === 0 && <li className="selector-vacio">Sin coincidencias. Ajuste el texto de búsqueda.</li>}
            {visibles.map((o, i) => {
              const cabecera = o.grupo && o.grupo !== grupoPrevio ? o.grupo : null;
              grupoPrevio = o.grupo;
              return (
                <li key={o.valor} role="presentation">
                  {cabecera && <div className="selector-grupo">{cabecera}</div>}
                  <div
                    role="option"
                    data-i={i}
                    aria-selected={elegido(o.valor)}
                    className={`selector-opcion${i === activo ? ' activa' : ''}`}
                    onMouseEnter={() => setActivo(i)}
                    onClick={() => elegir(o)}
                  >
                    {props.multiple && <span className={`casilla${elegido(o.valor) ? ' marcada' : ''}`} aria-hidden="true" />}
                    {o.marca && <i className="selector-marca" style={{ background: o.marca }} />}
                    <span className="selector-texto">
                      {o.etiqueta}
                      {o.detalle && <small>{o.detalle}</small>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
