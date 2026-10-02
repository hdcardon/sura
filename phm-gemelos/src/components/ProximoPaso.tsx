export default function ProximoPaso() {
  return (
    <>
      <section className="seccion seccion-paso" id="proximo-paso" aria-labelledby="paso-t">
        <div className="contenedor">
          <div className="intro lectura">
            <h2 id="paso-t">Para iniciar el piloto en una sede ancla se requieren tres insumos</h2>
            <p>Con estos insumos, la primera fase entrega la línea base y la calibración del modelo en 12 semanas.</p>
          </div>
          <div className="pedidos">
            <div className="pedido">
              <h3>Una cohorte priorizada</h3>
              <p>
                La serie de demanda agregada de la cohorte, obtenida por consulta federada en AlejandrIA, con su estratificación
                y la cobertura actual del programa.
              </p>
            </div>
            <div className="pedido">
              <h3>Una sede ancla</h3>
              <p>
                Capacidad por zona, agendas, inventario de equipos conectados y operación de Salud en Casa de una sede CIS o IPS
                básica con demanda estacional marcada.
              </p>
            </div>
            <div className="pedido">
              <h3>Contrapartes de PHM y de operación</h3>
              <p>
                Un responsable de la cohorte y un coordinador de la sede para validar supuestos y umbrales en ciclos
                quincenales.
              </p>
            </div>
          </div>
        </div>
      </section>
      <footer className="pie">
        <div className="contenedor">
          <span>
            Simulación con datos sintéticos. Las tasas, capacidades y efectos de la gestión del riesgo son supuestos
            ilustrativos, documentados en la Demo A, y no representan resultados de SURA. Las cifras de SURA y de precedentes
            externos indican su fuente.
          </span>
          <span>NTT DATA Colombia, Arquitectura Digital. Octubre de 2026.</span>
        </div>
      </footer>
    </>
  );
}
