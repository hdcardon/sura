import { useState } from 'react';
import type { Cohorte } from '../data/tipos.ts';
import { DIAS_OPERATIVOS, FESTIVOS_2027 } from '../model/calendario.ts';
import { usePortal } from '../store/portal.ts';
import { useTerritorio } from '../store/selectores.ts';
import { n0, n1, pct } from '../ui/formato.tsx';
import Selector from '../ui/Selector.tsx';

type Pestana = 'cohortes' | 'sedes' | 'fuentes' | 'estado';
const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: 'cohortes', nombre: 'Cohortes' },
  { id: 'sedes', nombre: 'Sedes y zonas' },
  { id: 'fuentes', nombre: 'Fuentes de datos' },
  { id: 'estado', nombre: 'Estado del modelo' },
];

const FUENTES = [
  { fuente: 'Agregados de cohortes por celda', mecanismo: 'Consulta federada sobre OMOP CDM en cada fuente; solo agregados con supresión de celdas menores a 11', granularidad: 'Celda, perfil de multimorbilidad y mes', frescura: '≤ 35 días después del cierre', dueno: 'Gestión del riesgo en salud' },
  { fuente: 'Agenda y citas', mecanismo: 'FHIR Schedule, Slot, Appointment y Encounter por suscripción, publicados como agregados', granularidad: 'Sede, zona y franja de 15 min', frescura: '≤ 15 min', dueno: 'Operación de sedes' },
  { fuente: 'Estado de zonas y equipos', mecanismo: 'Espacio de nombres unificado sobre MQTT con mensajes retenidos; sin datos de pacientes', granularidad: 'Recurso y atributo', frescura: '≤ 60 s', dueno: 'Ingeniería biomédica' },
  { fuente: 'Atención domiciliaria', mecanismo: 'Plataforma de despacho y rutas', granularidad: 'Equipo y visita', frescura: '≤ 15 min', dueno: 'Atención domiciliaria' },
  { fuente: 'Atención virtual', mecanismo: 'Plataforma de telemedicina', granularidad: 'Atención y desenlace (resuelta o derivada)', frescura: '≤ 15 min', dueno: 'Atención virtual' },
  { fuente: 'Calendario operativo', mecanismo: 'Festivos nacionales y jornada de cada sede', granularidad: 'Día', frescura: 'Anual', dueno: 'Planeación' },
];

const SALUD = [
  { indicador: 'Frescura por fuente', meta: 'Dentro del SLA de cada fuente', valor: 'Fuentes sintéticas' },
  { indicador: 'Fuentes dentro del SLA', meta: '≥ 95 %', valor: 'No conectado' },
  { indicador: 'Cobertura de sensores', meta: '≥ 90 % de equipos inventariados', valor: 'No conectado' },
  { indicador: 'Error de calibración (WAPE mensual por zona)', meta: '≤ 10–15 % en backtest de 12 meses', valor: 'Pendiente de datos históricos' },
  { indicador: 'Cobertura de intervalos P10–P90', meta: '75–85 % de observados dentro de la banda', valor: 'Pendiente de datos históricos' },
  { indicador: 'Deriva de entradas (PSI)', meta: '< 0,2', valor: 'No aplica' },
  { indicador: 'Latencia de extremo a extremo', meta: 'Estado < 5 s; agenda < 15 min', valor: 'No conectado' },
  { indicador: 'Cierre de ciclo', meta: 'Recomendaciones aceptadas, ejecutadas y con efecto observado', valor: 'Sin registro' },
];

const NIVELES = [
  { nombre: 'Modelo digital', detalle: 'Parámetros y datos sintéticos o históricos, sin flujo automático desde la operación.', actual: true },
  { nombre: 'Sombra digital', detalle: 'Ingesta automática de agenda, zonas y equipos; el modelo refleja la operación en casi tiempo real.', actual: false },
  { nombre: 'Gemelo digital', detalle: 'Calibración continua, incertidumbre validada y recomendaciones con cierre de ciclo trazable.', actual: false },
];

function TablaCohortes() {
  const s = usePortal();
  const cat = s.catalogo;
  const celdas = useTerritorio();
  const base = celdas.reduce((a, c) => a + c.adultos * c.factorPrevalencia, 0);
  const adultos = celdas.reduce((a, c) => a + c.adultos, 0);
  const [nombre, setNombre] = useState('');
  const [ruta, setRuta] = useState(cat.cohortes[0].ruta);
  const [prev, setPrev] = useState(1);
  const [plantilla, setPlantilla] = useState(cat.cohortes[0].id);
  const rutas = Array.from(new Set(cat.cohortes.map((c) => c.ruta)));
  const ids = new Set(['hta', 'dm2', 'erc', 'epoc', 'ic']);

  const agregar = (e: React.FormEvent) => {
    e.preventDefault();
    const t = cat.cohortes.find((c) => c.id === plantilla)!;
    const id = `c${Date.now().toString(36)}`;
    const nueva: Cohorte = { ...JSON.parse(JSON.stringify(t)), id, nombre: nombre.trim(), ruta, nota: `Parámetros tomados de ${t.nombre.toLowerCase()}; ajustar con la serie de la fuente.` };
    s.agregarCohorte(nueva, prev);
    setNombre('');
  };

  return (
    <>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Cohorte</th>
              <th>Ruta</th>
              <th className="d">Personas en la red</th>
              <th className="d">Prevalencia</th>
              <th className="d">Cobertura vigente</th>
              <th className="d">Fracción CSCA</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cat.cohortes.map((c) => {
              const pctA = cat.perfiles.filter((p) => p.cohortes.includes(c.id)).reduce((a, p) => a + p.pctAdultos, 0);
              return (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.ruta}</td>
                  <td className="d">{n0((base * pctA) / 100)}</td>
                  <td className="d">{n1((base * pctA) / adultos)} %</td>
                  <td className="d">
                    <input
                      className="numero"
                      type="number"
                      min={5}
                      max={90}
                      step={5}
                      aria-label={`Cobertura vigente de ${c.nombre}`}
                      value={Math.round(c.coberturaActual * 100)}
                      onChange={(e) => s.actualizarCohorte(c.id, { coberturaActual: Math.max(0.05, Math.min(0.9, +e.target.value / 100)) })}
                    />{' '}
                    %
                  </td>
                  <td className="d">{pct(c.fraccionCSCA)}</td>
                  <td className="d">
                    {!ids.has(c.id) && (
                      <button type="button" className="enlace" onClick={() => s.eliminarCohorte(c.id)}>
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <form className="form-agregar" onSubmit={agregar}>
        <h3>Agregar cohorte</h3>
        <div className="fila-form">
          <label className="campo" htmlFor="nc-nombre">
            <span>Nombre</span>
            <input id="nc-nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo, asma del adulto" />
          </label>
          <Selector etiqueta="Ruta" valor={ruta} opciones={rutas.map((r) => ({ valor: r, etiqueta: r }))} onCambio={setRuta} ancho={280} />
          <label className="campo" htmlFor="nc-prev">
            <span>Prevalencia en adultos (%)</span>
            <input id="nc-prev" type="number" min={0.1} max={20} step={0.1} value={prev} onChange={(e) => setPrev(+e.target.value)} />
          </label>
          <Selector etiqueta="Parámetros base de" valor={plantilla} opciones={cat.cohortes.map((c) => ({ valor: c.id, etiqueta: c.nombre }))} onCambio={setPlantilla} ancho={240} />
          <button type="submit" className="boton">Agregar cohorte</button>
        </div>
        <p className="nota">La cohorte nueva aparece en todos los selectores y modelos. Sin intersecciones definidas, se trata como condición independiente.</p>
      </form>
    </>
  );
}

function TablaSedes() {
  const s = usePortal();
  const sede = s.catalogo.sedes.find((x) => x.id === s.sedeId) ?? s.catalogo.sedes[0];
  return (
    <>
      <div className="barra-modulo" style={{ marginBottom: 12 }}>
        <Selector etiqueta="Sede" valor={sede.id} opciones={s.catalogo.sedes.map((x) => ({ valor: x.id, etiqueta: x.nombre }))} onCambio={(v) => s.set({ sedeId: v })} ancho={200} />
        <p className="barra-nota">
          Inasistencia {pct(sede.inasistencia)}, sobreagenda {pct(sede.sobreagenda)}, {n0(sede.adultosObjetivo)} adultos adscritos. Los cambios recalculan todos los módulos.
        </p>
      </div>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Zona</th>
              <th>Tipo</th>
              <th className="d">Servidores</th>
              <th className="d">Horas al día</th>
              <th className="d">Minutos por atención</th>
              <th className="d">Demanda observada por día</th>
            </tr>
          </thead>
          <tbody>
            {sede.zonas.map((z) => (
              <tr key={z.id}>
                <td>{z.nombre}</td>
                <td>{{ agendada: 'Con cita', espontanea: 'Sin cita', domiciliaria: 'Domiciliaria', virtual: 'Virtual' }[z.tipo]}</td>
                {(['servidores', 'horas', 'servicioMin', 'demandaObservada'] as const).map((campo) => (
                  <td className="d" key={campo}>
                    <input
                      className="numero"
                      type="number"
                      min={1}
                      aria-label={`${campo} de ${z.nombre}`}
                      value={z[campo]}
                      onChange={(e) => {
                        const v = Math.max(1, +e.target.value || 1);
                        s.actualizarZona(sede.id, z.id, { [campo]: v });
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="nota">
        Calendario 2027 con {FESTIVOS_2027.length} festivos nacionales; días operativos por mes de {Math.min(...DIAS_OPERATIVOS)} a {Math.max(...DIAS_OPERATIVOS)}, con medio día los sábados.
      </p>
    </>
  );
}

export default function Configuracion() {
  const [pestana, setPestana] = useState<Pestana>('cohortes');
  const restablecer = usePortal((s) => s.restablecer);
  const cat = usePortal((s) => s.catalogo);
  return (
    <div className="modulo">
      <div className="barra-modulo">
        <div className="pestanas" role="tablist" aria-label="Secciones de configuración">
          {PESTANAS.map((p) => (
            <button key={p.id} role="tab" type="button" aria-selected={pestana === p.id} onClick={() => setPestana(p.id)}>
              {p.nombre}
            </button>
          ))}
        </div>
        <p className="barra-nota">Catálogo versión {cat.version}. Los cambios se guardan en este navegador.</p>
        <button type="button" className="boton sec" onClick={restablecer}>Restablecer catálogo</button>
      </div>

      <section className="panel" role="tabpanel">
        {pestana === 'cohortes' && <TablaCohortes />}
        {pestana === 'sedes' && <TablaSedes />}
        {pestana === 'fuentes' && (
          <>
            <div className="panel-cabeza">
              <h2>Contrato de datos por fuente</h2>
              <p>En este entorno todas las fuentes son sintéticas. La tabla describe la integración prevista.</p>
            </div>
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fuente</th>
                    <th>Mecanismo</th>
                    <th>Granularidad</th>
                    <th>Frescura objetivo</th>
                    <th>Responsable</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {FUENTES.map((f) => (
                    <tr key={f.fuente}>
                      <td>{f.fuente}</td>
                      <td className="ajustar">{f.mecanismo}</td>
                      <td>{f.granularidad}</td>
                      <td>{f.frescura}</td>
                      <td>{f.dueno}</td>
                      <td><span className="etiqueta-estado">Sintética</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {pestana === 'estado' && (
          <>
            <div className="panel-cabeza">
              <h2>Nivel de madurez</h2>
              <p>La plataforma opera hoy como modelo digital. Cada nivel exige las capacidades indicadas.</p>
            </div>
            <ol className="niveles">
              {NIVELES.map((n) => (
                <li key={n.nombre} className={n.actual ? 'actual' : ''}>
                  <strong>{n.nombre}</strong>
                  <span>{n.detalle}</span>
                  {n.actual && <em>Nivel actual</em>}
                </li>
              ))}
            </ol>
            <div className="panel-cabeza" style={{ marginTop: 20 }}>
              <h2>Indicadores de salud del modelo</h2>
              <p>Versión de parámetros {cat.version}. Simulación con semilla fija y 200 réplicas por cohorte.</p>
            </div>
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>Meta</th>
                    <th>Estado en este entorno</th>
                  </tr>
                </thead>
                <tbody>
                  {SALUD.map((x) => (
                    <tr key={x.indicador}>
                      <td>{x.indicador}</td>
                      <td>{x.meta}</td>
                      <td><span className="etiqueta-estado">{x.valor}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
