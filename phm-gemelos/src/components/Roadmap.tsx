const FASES = [
  {
    cuando: '0 a 3 meses',
    titulo: 'Línea base de la sede ancla',
    items: [
      'Inventario y segmentación de los equipos conectados',
      'Capacidad por zona, agendas y tiempos por momento del journey',
      'Selección de la cohorte y de su serie de demanda en AlejandrIA',
    ],
    salida: 'Línea base validada y riesgos IoMT priorizados',
  },
  {
    cuando: '3 a 9 meses',
    titulo: 'Gemelo operacional de la sede',
    items: [
      'Espacio de nombres unificado para el estado operativo de la sede',
      'Gemelo de capacidad por zona conectado a la demanda proyectada',
      'Dimensionamiento mensual de Salud en Casa',
    ],
    salida: 'Release 1.0 del gemelo de la sede ancla con seguimiento de ocupación y oportunidad',
  },
  {
    cuando: '6 a 18 meses',
    titulo: 'Extensión a la red',
    items: [
      'Réplica en sedes CIS e IPS básicas de la regional',
      'Mantenimiento predictivo de equipos de imagen y laboratorio',
      'Localización en tiempo real de equipos móviles',
    ],
    salida: 'Planeación mensual de capacidad por regional con demanda por cohorte',
  },
  {
    cuando: '12 a 24 meses',
    titulo: 'Simulación de red y physical AI',
    items: [
      'Escenarios de red para ubicar capacidad',
      'Visión en el borde para seguridad del paciente',
      'Logística interna con robots, validada antes en el gemelo de la instalación',
    ],
    salida: 'Decisiones de capacidad evaluadas en simulación antes de ejecutarse',
  },
];

export default function Roadmap() {
  return (
    <section className="seccion seccion-paso" id="hoja-de-ruta" aria-labelledby="ruta-t">
      <div className="contenedor">
        <div className="intro lectura">
          <h2 id="ruta-t">Hoja de ruta por fases</h2>
          <p>
            Las fases iniciales usan sistemas y equipos que la sede ya tiene, con inversión baja en infraestructura. Cada fase
            se habilita con la línea base y los resultados de la anterior.
          </p>
        </div>
        <ol className="fases" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {FASES.map((f, i) => (
            <li className={`fase${i === 0 ? ' primera' : ''}`} key={f.titulo}>
              <span className="cuando">{f.cuando}</span>
              <h3>{f.titulo}</h3>
              <ul>
                {f.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
              <p className="salida">{f.salida}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
