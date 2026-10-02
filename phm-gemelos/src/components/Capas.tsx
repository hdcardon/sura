const ARBOL = `red-salud/
  regional-antioquia/
    sede-cis-ref/
      consulta-externa/
        consultorio-07/<b>ocupacion</b>          <em>1</em>
        agenda/<b>oportunidad-dias</b>          <em>4,2</em>
      atencion-prioritaria/
        cubiculo-02/<b>estado</b>               <em>ocupado</em>
      laboratorio/
        ecografo-01/<b>salud</b>                <em>alerta</em>
      salud-en-casa/
        equipo-domiciliario-03/<b>visitas-hoy</b> <em>6</em>`;

export default function Capas() {
  return (
    <section className="seccion seccion-paso" id="capas" aria-labelledby="capas-t">
      <div className="contenedor">
        <div className="intro lectura">
          <h2 id="capas-t">Capas que habilitan el modelo, del dato a la acción</h2>
          <p>
            Las capas se ordenan por madurez. Las dos primeras tienen base instalada en la red; la tercera corresponde a las
            demos de esta página; las dos últimas se construyen sobre las anteriores.
          </p>
        </div>

        <div className="capas">
          <div className="capa madura">
            <div>
              <h3>
                Sensórica y equipos conectados <span className="madurez">Base instalada</span>
              </h3>
              <p>
                Monitores, tensiómetros, analizadores, equipos de imagen y kits de monitoreo remoto de Salud en Casa. Como
                extensión, localización en tiempo real de equipos móviles y personal. El primer paso es el inventario y la
                segmentación de estos dispositivos, que también controla el riesgo de ciberseguridad de la convergencia IT/OT.
              </p>
            </div>
            <div className="detalle">
              <div className="nota-externa">
                <b>Precedente: Hospital Sírio-Libanês, Brasil, 2025</b>
                <span>
                  NTT DATA implementó la plataforma de seguridad IoMT de Claroty sobre más de 2.500 dispositivos médicos. El
                  hospital eliminó el 31 % de los riesgos críticos, redujo en 50 % el tiempo para localizar equipos y automatizó
                  su inventario.
                </span>
                <span className="fuente">IDC Brasil, estudio de caso BR25001, junio de 2025</span>
              </div>
            </div>
          </div>

          <div className="capa madura">
            <div>
              <h3>
                Capa operacional en tiempo real <span className="madurez">Corto plazo</span>
              </h3>
              <p>
                Un espacio de nombres unificado (Unified Namespace) donde cada sistema publica el estado actual de la operación
                y cada consumidor lee lo que necesita, por publicación y suscripción de eventos sobre MQTT. Conecta agendas,
                equipos y vehículos sin integraciones punto a punto. La historia clínica y FHIR siguen siendo la fuente clínica;
                esta capa transporta estado operativo.
              </p>
            </div>
            <div className="detalle">
              <pre className="arbol" aria-label="Ejemplo de jerarquía de tópicos de la capa operacional" dangerouslySetInnerHTML={{ __html: ARBOL }} />
            </div>
          </div>

          <div className="capa">
            <div>
              <h3>
                Gemelos poblacional y operacional <span className="madurez">Piloto propuesto</span>
              </h3>
              <p>
                El gemelo poblacional proyecta la demanda por cohorte con los datos federados de AlejandrIA. El gemelo
                operacional representa la capacidad de la sede con el estado que publica la capa operacional. La conexión
                entre los dos es la serie de demanda por zona y por mes.
              </p>
            </div>
            <div className="detalle">
              <ul>
                <li>Poblacional: caso de uso Agente de Gestión del Riesgo de AlejandrIA, sobre datos OMOP que permanecen en cada Data Partner.</li>
                <li>Operacional: zonas, recursos y flujos de la sede, calibrados con la línea base de agendas y equipos.</li>
              </ul>
            </div>
          </div>

          <div className="capa">
            <div>
              <h3>
                Simulación de escenarios <span className="madurez">Mediano plazo</span>
              </h3>
              <p>
                Evaluación de decisiones antes de ejecutarlas: cobertura del programa, apertura de agenda, equipos domiciliarios
                adicionales y redistribución de demanda entre sedes. En la red completa, la simulación ubica capacidad donde la
                demanda proyectada la va a requerir.
              </p>
            </div>
            <div className="detalle">
              <ul>
                <li>Escenarios mensuales por regional, con la estacionalidad de cada cohorte.</li>
                <li>Diseño de nuevas sedes y de la operación de Salud en Casa sobre el gemelo de la instalación.</li>
              </ul>
            </div>
          </div>

          <div className="capa" style={{ paddingBottom: 0 }}>
            <div>
              <h3>
                Acción asistida y physical AI <span className="madurez">Fase posterior</span>
              </h3>
              <p>
                Recomendaciones al gestor de la cohorte y al coordinador de la sede. En una fase posterior, acción física asistida:
                visión por computador en el borde para detectar caídas y medir ocupación, y robots de logística interna para
                muestras y medicamentos. En la región no hay despliegues documentados de robótica hospitalaria, por lo que se
                plantean como pilotos validados primero en simulación.
              </p>
            </div>
            <div className="detalle">
              <ul>
                <li>Robots de entrega en hospitales de Estados Unidos con más de 1,25 millones de entregas autónomas (Diligent Robotics, 2026).</li>
                <li>Detección automática de higiene de manos con sensores de profundidad, 96,8 % de concordancia con auditoría humana (JAMIA, 2020).</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
