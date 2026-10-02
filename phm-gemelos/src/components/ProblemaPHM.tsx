export default function ProblemaPHM() {
  return (
    <section className="seccion seccion-paso" id="problema" aria-labelledby="problema-t">
      <div className="contenedor">
        <div className="intro lectura">
          <h2 id="problema-t">La demanda de las cohortes se puede proyectar, pero la capacidad de las sedes se ajusta cuando ya llegó</h2>
        </div>
        <div className="lectura">
          <p>
            La gestión del riesgo por cohortes identifica quién va a necesitar atención y con qué frecuencia: controles
            programados según la ruta, exacerbaciones estacionales y descompensaciones que terminan en urgencias. Esa
            información orienta la intervención clínica y la demanda inducida, y llega a la operación de las sedes de forma
            indirecta, a través de agendas y reportes mensuales.
          </p>
          <p>
            Cuando la demanda de una cohorte coincide con un pico de la demanda general, la sede responde con sobreagenda,
            con tiempos de espera más largos o con derivación a atención prioritaria. Los controles que se aplazan y los
            eventos evitables que llegan a urgencias trabajan en contra del objetivo de la misma gestión del riesgo.
          </p>
          <p>
            La propuesta conecta dos capacidades que hoy operan por separado: la proyección de demanda por cohorte y la
            gestión de la capacidad de la red prestadora, incluida Salud en Casa.
          </p>
        </div>
        <div className="hechos">
          <div className="hecho">
            <strong className="num">1,5 millones</strong>
            <span>atenciones domiciliarias de Salud en Casa en 2025, con emergencias, rehabilitación y pediatría en casa.</span>
            <span className="fuente">Informe Anual de Gestión IPS SURA 2025</span>
          </div>
          <div className="hecho">
            <strong className="num">$24.840 millones</strong>
            <span>en costos evitados a aseguradores por la gestión del riesgo en cohortes durante 2025.</span>
            <span className="fuente">Informe Anual de Gestión IPS SURA 2025</span>
          </div>
          <div className="hecho">
            <strong className="num">17 %</strong>
            <span>de inasistencia general a citas en 2025. La oportunidad en cirugía general fue de 11,4 días frente a una meta de 10.</span>
            <span className="fuente">EPS SURA, Informe de Rendición de Cuentas 2025</span>
          </div>
        </div>
      </div>
    </section>
  );
}
