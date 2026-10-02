// Genera el deck que acompaña al portal de planeación de red por cohortes.
// Uso: node deck/generar.cjs  (desde la raíz del proyecto)
const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');
const React = require('/opt/npm-tools/node_modules/react');
const ReactDOMServer = require('/opt/npm-tools/node_modules/react-dom/server');
const sharp = require('sharp');
const Fi = require('react-icons/fi');
const { applyTheme } = require('/mnt/skills/public/pptx/scripts/apply_theme.js');

const DIR = __dirname;
const SALIDA = path.join(DIR, 'Planeacion_red_cohortes_PHM.pptx');
const D = JSON.parse(fs.readFileSync(path.join(DIR, 'datos.json'), 'utf8'));
const TAM = JSON.parse(fs.readFileSync(path.join(DIR, 'capturas/tamanos.json'), 'utf8'));
const img = (n) => path.join(DIR, 'capturas', n);

// ---------- Tema ----------
const THEME = {
  name: 'NTT DATA PHM',
  headFontFace: 'Arial',
  bodyFontFace: 'Arial',
  colors: {
    dk1: '070F26', // Smart Navy: texto y plataforma
    lt1: 'FFFFFF',
    dk2: '4A5568', // texto secundario
    lt2: 'F2F5F9', // fondo de tarjetas
    accent1: '005B96', // azul oscuro: plataforma
    accent2: '009AA4', // turquesa: resultados
    accent3: '0072BC', // azul medio: estructura
    accent4: '6E4BB8', // morado: inteligencia
    accent5: 'E07B39', // naranja: acción
    accent6: 'C7354A', // rojo: riesgo
    hlink: '0072BC',
    folHlink: '6E4BB8',
  },
};
const HEX = { linea: 'D5DCE5', gris: '949494', navy: '070F26', azul: '005B96', medio: '0072BC', claro: '19A3FC', teal: '009AA4', cian: '00DFED', morado: '6E4BB8', naranja: 'E07B39', rojo: 'C7354A', verde: '2E9E6B', ambar: 'D99A22' };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13,333 × 7,5 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.author = 'NTT DATA';
pres.company = 'NTT DATA';
pres.title = 'Planeación de la red de atención por cohortes de riesgo';
pres.subject = 'Propuesta para Population Health Management';
const C = pres.SchemeColor;

const W = 13.333;
const M = 0.5;
const ANCHO = W - 2 * M;
const Y0 = 1.78; // inicio del área de contenido
const YF = 6.85; // fin del área de contenido

// ---------- Layouts ----------
pres.defineSlideMaster({
  title: 'PORTADA',
  background: { color: HEX.navy },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: M, y: 1.6, w: 5.3, h: 2.3, fontSize: 30, bold: true, color: C.background1, valign: 'bottom', margin: 0, align: 'left' }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: M, y: 4.1, w: 5.2, h: 1.3, fontSize: 14, color: 'C9D3E3', valign: 'top', margin: 0 }, text: '' } },
    { text: { text: 'NTT DATA', options: { x: M, y: 0.5, w: 3, h: 0.4, fontSize: 16, bold: true, color: C.background1, margin: 0 } } },
  ],
});
pres.defineSlideMaster({
  title: 'CONTENIDO',
  background: { color: 'FFFFFF' },
  margin: [0.5, 0.5, 0.75, 0.5],
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.32, w: ANCHO, h: 0.92, fontSize: 23, bold: true, color: C.text1, valign: 'top', margin: 0, lineSpacingMultiple: 0.95, align: 'left' }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: M, y: 1.24, w: ANCHO, h: 0.42, fontSize: 12.5, color: C.text2, valign: 'top', margin: 0, align: 'left' }, text: '' } },
    { text: { text: 'NTT DATA  ·  Planeación de la red por cohortes de riesgo', options: { x: M, y: 7.08, w: 8, h: 0.25, fontSize: 8, color: HEX.gris, margin: 0 } } },
  ],
  slideNumber: { x: W - M - 0.6, y: 7.08, w: 0.6, h: 0.25, fontSize: 8, color: HEX.gris, align: 'right', margin: 0 },
});
pres.defineSlideMaster({
  title: 'CIERRE',
  background: { color: HEX.navy },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.45, w: ANCHO, h: 1.1, fontSize: 26, bold: true, color: C.background1, valign: 'top', margin: 0, align: 'left' }, text: '' } },
    { text: { text: 'NTT DATA  ·  Planeación de la red por cohortes de riesgo', options: { x: M, y: 7.08, w: 8, h: 0.25, fontSize: 8, color: '8F9BB3', margin: 0 } } },
  ],
  slideNumber: { x: W - M - 0.6, y: 7.08, w: 0.6, h: 0.25, fontSize: 8, color: '8F9BB3', align: 'right', margin: 0 },
});

// ---------- Utilidades ----------
const iconos = {};
async function prepararIcono(clave, Comp, color) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: `#${color}`, size: 256 }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  iconos[clave] = 'image/png;base64,' + buf.toString('base64');
}

let n = 0;
const nombre = (p) => `${p}-${++n}`;

function texto(s, t, o) {
  s.addText(t, { isTextBox: true, margin: 0, valign: 'top', fontSize: 10, color: C.text1, objectName: nombre(o.nombre || 'texto'), ...o });
}
function tarjeta(s, o) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: o.x, y: o.y, w: o.w, h: o.h, rectRadius: 0.07,
    fill: o.fill || { color: C.background2 },
    line: o.line === undefined ? { color: HEX.linea, width: 0.75 } : o.line,
    objectName: nombre(o.nombre || 'tarjeta'),
  });
}
function insignia(s, txt, x, y, color, d = 0.34) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { type: 'none' }, objectName: nombre('insignia') });
  s.addText(String(txt), { isTextBox: true, x, y, w: d, h: d, margin: 0, align: 'center', valign: 'middle', fontSize: d > 0.3 ? 11 : 9, bold: true, color: C.background1, objectName: nombre('insignia-texto') });
}
function icono(s, clave, x, y, d, fondo) {
  if (fondo) s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: fondo, line: { type: 'none' }, objectName: nombre('icono-fondo') });
  const p = d * 0.56;
  s.addImage({ data: iconos[clave], x: x + (d - p) / 2, y: y + (d - p) / 2, w: p, h: p, objectName: nombre('icono') });
}
function imagen(s, archivo, tam, x, y, wMax, hMax, nombreObj) {
  const [iw, ih] = tam;
  let w = wMax;
  let h = (w * ih) / iw;
  if (h > hMax) { h = hMax; w = (h * iw) / ih; }
  s.addShape(pres.shapes.RECTANGLE, { x: x - 0.01, y: y - 0.01, w: w + 0.02, h: h + 0.02, fill: { color: 'FFFFFF' }, line: { color: HEX.linea, width: 0.75 }, shadow: { type: 'outer', color: '000000', opacity: 0.12, blur: 6, offset: 2, angle: 90 }, objectName: nombre('marco') });
  s.addImage({ path: img(archivo), x, y, w, h, objectName: nombreObj || nombre('captura') });
  return { w, h };
}
// Bloque etiqueta + texto para las columnas de lectura de cada módulo.
function bloque(s, x, y, w, etiqueta, cuerpo, color, hCuerpo) {
  texto(s, etiqueta.toUpperCase(), { x, y, w, h: 0.22, fontSize: 8.5, bold: true, color, charSpacing: 0.5, nombre: 'etiqueta' });
  texto(s, cuerpo, { x, y: y + 0.24, w, h: hCuerpo, fontSize: 10, color: C.text1, nombre: 'cuerpo', paraSpaceAfter: 2 });
  return y + 0.24 + hCuerpo + 0.14;
}
function nuevaDiapositiva(seccion, layout = 'CONTENIDO') {
  return pres.addSlide({ masterName: layout, sectionTitle: seccion });
}
const fmt = (v, d = 0) => v.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v) => `${fmt(v * 100)} %`;

// ---------- Contenido ----------
async function construir() {
  await prepararIcono('panorama', Fi.FiGrid, HEX.azul);
  await prepararIcono('cohortes', Fi.FiUsers, HEX.morado);
  await prepararIcono('territorio', Fi.FiMap, HEX.teal);
  await prepararIcono('sede', Fi.FiHome, HEX.medio);
  await prepararIcono('escenarios', Fi.FiSliders, HEX.naranja);
  await prepararIcono('config', Fi.FiSettings, HEX.navy);
  await prepararIcono('alerta', Fi.FiAlertTriangle, HEX.rojo);
  await prepararIcono('reloj', Fi.FiClock, HEX.rojo);
  await prepararIcono('capas', Fi.FiLayers, HEX.rojo);
  await prepararIcono('flecha', Fi.FiArrowRight, HEX.gris);
  await prepararIcono('base', Fi.FiDatabase, 'FFFFFF');
  await prepararIcono('cpu', Fi.FiCpu, 'FFFFFF');
  await prepararIcono('actividad', Fi.FiActivity, 'FFFFFF');
  await prepararIcono('objetivo', Fi.FiTarget, 'FFFFFF');
  await prepararIcono('usuarios', Fi.FiUsers, 'FFFFFF');
  await prepararIcono('check', Fi.FiCheckCircle, HEX.teal);

  const E = Object.fromEntries(D.escenarios.map((e) => [e.id, e]));
  const CO = Object.fromEntries(D.cohortes.map((c) => [c.id, c]));

  // ===== 1. Portada =====
  pres.addSection({ title: 'Contexto' });
  {
    const s = nuevaDiapositiva('Contexto', 'PORTADA');
    s.addText('Planeación de la red de atención a partir del riesgo de cada cohorte', { placeholder: 'title' });
    s.addText('Un modelo poblacional y un modelo de capacidad conectados para anticipar la demanda crónica por sede, zona y mes', { placeholder: 'body' });
    texto(s, 'Propuesta para la dirección de Population Health Management  ·  Octubre de 2026', { x: M, y: 6.55, w: 7, h: 0.3, fontSize: 10, color: '8F9BB3', nombre: 'pie-portada' });
    const [iw, ih] = TAM.portada3d;
    const w = 7.0;
    const h = (w * ih) / iw;
    s.addImage({ path: img('r-portada3d.png'), x: W - w - 0.35, y: 1.35, w, h, objectName: 'render-sede-3d' });
    texto(s, 'Modelo de capacidad de una sede con datos sintéticos', { x: W - 4.55, y: 1.35 + (7.0 * TAM.portada3d[1]) / TAM.portada3d[0] + 0.1, w: 4.2, h: 0.25, fontSize: 9, color: '8F9BB3', align: 'right', nombre: 'nota-render' });
    s.addNotes('Abrir con el propósito de la sesión. La propuesta conecta dos piezas que hoy se gestionan por separado: la gestión del riesgo de las cohortes crónicas y la planeación de la capacidad de la red. El portal de demostración funciona con datos sintéticos de una red de cuatro sedes y 107.503 adultos; las cifras ilustran el mecanismo y no describen la operación real de SURA.');
  }

  // ===== 2. Problema =====
  {
    const s = nuevaDiapositiva('Contexto');
    s.addText('Ampliar la gestión del riesgo sin ajustar la red traslada la presión a la consulta y alarga la oportunidad de cita', { placeholder: 'title' });
    s.addText('La demanda de las cohortes crónicas responde a la cobertura del programa con efectos que la planeación anual por sede no alcanza a ver.', { placeholder: 'body' });
    const tensiones = [
      ['reloj', 'Los efectos llegan con tiempos distintos', 'Al aumentar la cobertura, los controles programados crecen en semanas; las hospitalizaciones evitables bajan de forma gradual y solo en la fracción sensible al cuidado ambulatorio (CSCA).'],
      ['capas', 'La tensión ocurre por zona y por mes', 'La capacidad se planea por sede y por año, pero la saturación aparece en zonas concretas (consulta externa, admisión) y en meses de pico estacional.'],
      ['alerta', 'Los canales alternos se dimensionan aparte', 'La atención domiciliaria y la virtual liberan capacidad presencial solo si se dimensionan con el estrato clínico de cada cohorte y con su retorno a consulta presencial.'],
    ];
    let y = Y0 + 0.05;
    for (const [ic, t, d] of tensiones) {
      tarjeta(s, { x: M, y, w: 6.55, h: 1.32, nombre: 'tension' });
      icono(s, ic, M + 0.2, y + 0.22, 0.5, { color: C.accent6, transparency: 88 });
      texto(s, t, { x: M + 0.9, y: y + 0.2, w: 5.45, h: 0.3, fontSize: 12, bold: true, nombre: 'tension-titulo' });
      texto(s, d, { x: M + 0.9, y: y + 0.53, w: 5.45, h: 0.72, fontSize: 10.5, color: C.text2, nombre: 'tension-texto' });
      y += 1.5;
    }
    // Evidencia del modelo
    const x2 = 7.35;
    const w2 = W - M - x2;
    texto(s, 'LO QUE MUESTRA EL MODELO EN UNA RED SINTÉTICA DE CUATRO SEDES', { x: x2, y: Y0 + 0.05, w: w2, h: 0.25, fontSize: 8.5, bold: true, color: C.accent1, charSpacing: 0.5, nombre: 'evidencia-etiqueta' });
    const cifras = [
      [`${fmt(E.sq.opMax, 1)} días`, 'Oportunidad de cita P90 máxima con la cobertura vigente', C.text1],
      [`${fmt(E.ampliada.opMax, 1)} días`, 'Con 25 puntos más de cobertura y la misma red', C.accent6],
      [`${fmt(E.canales.opMax, 1)} días`, 'Con la misma cobertura más atención domiciliaria, virtual y recordatorios', C.accent2],
    ];
    let yc = Y0 + 0.42;
    for (const [v, l, col] of cifras) {
      tarjeta(s, { x: x2, y: yc, w: w2, h: 1.02, fill: { color: 'FFFFFF' }, nombre: 'cifra' });
      texto(s, v, { x: x2 + 0.25, y: yc + 0.16, w: 2.1, h: 0.7, fontSize: 30, bold: true, color: col, valign: 'middle', nombre: 'cifra-valor' });
      texto(s, l, { x: x2 + 2.45, y: yc + 0.18, w: w2 - 2.65, h: 0.66, fontSize: 10.5, color: C.text1, valign: 'middle', nombre: 'cifra-texto' });
      yc += 1.14;
    }
    texto(s, `Meses-sede con alguna zona saturada en 2027: ${E.sq.mesesSat} de 48 con la cobertura vigente, ${E.ampliada.mesesSat} de 48 con cobertura ampliada y ${E.canales.mesesSat} de 48 con canales. Referencia de oportunidad para medicina general: 3 días hábiles (Resolución 1552 de 2013).`, { x: x2, y: yc + 0.05, w: w2, h: 0.75, fontSize: 9, color: C.text2, nombre: 'evidencia-nota' });
    s.addNotes('La tensión central es temporal y espacial. Una ampliación de cobertura genera primero más controles programados y, solo después, menos hospitalizaciones evitables. Si la red no se ajusta, la consulta externa absorbe ese aumento y la oportunidad empeora. En la red sintética, pasar de la cobertura vigente a 25 puntos adicionales lleva la oportunidad P90 de 3,6 a 4,1 días; con canales domiciliario y virtual baja a 2,2 días. Las cifras provienen del modelo con datos sintéticos.');
  }

  // ===== 3. Mecanismo =====
  {
    const s = nuevaDiapositiva('Contexto');
    s.addText('Un modelo poblacional y un modelo de capacidad conectados traducen el riesgo de cada cohorte en demanda por sede, zona y mes', { placeholder: 'title' });
    s.addText('Cada etapa produce una salida que consume la siguiente; la decisión vuelve al modelo como cambio de cobertura, canal o capacidad.', { placeholder: 'body' });
    const etapas = [
      ['base', 'Agregados federados', C.accent1, 'Personas por celda territorial, cohorte y perfil de multimorbilidad desde OMOP CDM en cada fuente, con supresión de conteos menores a 11.', 'Población en riesgo por celda'],
      ['usuarios', 'Estratos y transiciones', C.accent4, 'Cadena de Markov mensual con cuatro estratos clínicos por cohorte; la cobertura cambia las transiciones. 200 simulaciones con semilla fija.', 'Composición por estrato y mes, con banda P10–P90'],
      ['actividad', 'Demanda por zona y canal', C.accent4, 'Tasas de uso por estrato y tipo de atención; enrutamiento a zonas de la sede, a la red hospitalaria y a los canales domiciliario y virtual.', 'Atenciones por sede, zona, mes y canal'],
      ['cpu', 'Colas y backlog', C.accent3, 'Zonas sin cita con Erlang C y ajuste de Allen-Cunneen por hora; zonas con cita con recursión diaria de backlog e inasistencia.', 'Utilización, espera y oportunidad P50 y P90'],
      ['objetivo', 'Decisiones', C.accent5, 'Cobertura por cohorte, equipos domiciliarios, médicos virtuales, recordatorios y ajustes de agenda, comparados en escenarios.', 'Escenario recomendado y su costo'],
    ];
    const wE = 2.27;
    const gap = 0.245;
    const yE = Y0 + 0.1;
    etapas.forEach(([ic, t, col, d, sal], i) => {
      const x = M + i * (wE + gap);
      tarjeta(s, { x, y: yE, w: wE, h: 3.55, fill: { color: 'FFFFFF' }, nombre: 'etapa' });
      icono(s, ic, x + 0.18, yE + 0.2, 0.52, { color: col });
      texto(s, String(i + 1).padStart(2, '0'), { x: x + wE - 0.6, y: yE + 0.24, w: 0.42, h: 0.4, fontSize: 16, bold: true, color: HEX.linea, align: 'right', nombre: 'etapa-num' });
      texto(s, t, { x: x + 0.18, y: yE + 0.85, w: wE - 0.36, h: 0.5, fontSize: 12, bold: true, valign: 'bottom', nombre: 'etapa-titulo' });
      texto(s, d, { x: x + 0.18, y: yE + 1.45, w: wE - 0.36, h: 1.2, fontSize: 9.5, color: C.text2, nombre: 'etapa-texto' });
      s.addShape(pres.shapes.LINE, { x: x + 0.18, y: yE + 2.72, w: wE - 0.36, h: 0, line: { color: HEX.linea, width: 0.75 }, objectName: nombre('separador') });
      texto(s, 'PRODUCE', { x: x + 0.18, y: yE + 2.8, w: 1.5, h: 0.2, fontSize: 7.5, bold: true, color: col, nombre: 'produce' });
      texto(s, sal, { x: x + 0.18, y: yE + 3.0, w: wE - 0.36, h: 0.5, fontSize: 9.5, bold: true, nombre: 'salida' });
      if (i < etapas.length - 1) s.addImage({ data: iconos.flecha, x: x + wE + 0.02, y: yE + 1.65, w: 0.2, h: 0.2, objectName: nombre('flecha') });
    });
    // Barra de madurez
    const yB = yE + 3.8;
    tarjeta(s, { x: M, y: yB, w: ANCHO, h: 1.1, fill: { color: C.text1 }, line: { type: 'none' }, nombre: 'barra-madurez' });
    texto(s, 'NIVEL DE MADUREZ', { x: M + 0.3, y: yB + 0.2, w: 2.2, h: 0.22, fontSize: 8.5, bold: true, color: HEX.cian, nombre: 'madurez-etiqueta' });
    texto(s, 'La demostración opera como modelo digital: parámetros sintéticos, sin flujo automático desde la operación.', { x: M + 0.3, y: yB + 0.45, w: 4.6, h: 0.55, fontSize: 10, color: C.background1, nombre: 'madurez-actual' });
    const niveles = [['Modelo digital', 'Parámetros e históricos'], ['Sombra digital', 'Ingesta automática de agenda, zonas y equipos'], ['Gemelo digital', 'Calibración continua y cierre de ciclo trazable']];
    niveles.forEach(([t, d], i) => {
      const x = M + 5.25 + i * 2.4;
      const activo = i === 0;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: yB + 0.2, w: 2.25, h: 0.72, rectRadius: 0.06, fill: activo ? { color: C.accent2 } : { color: 'FFFFFF', transparency: 90 }, line: { color: activo ? HEX.teal : '3A4560', width: 0.75 }, objectName: nombre('nivel') });
      texto(s, `${i + 1}. ${t}`, { x: x + 0.14, y: yB + 0.27, w: 2.0, h: 0.25, fontSize: 10, bold: true, color: C.background1, nombre: 'nivel-titulo' });
      texto(s, d, { x: x + 0.14, y: yB + 0.52, w: 2.0, h: 0.36, fontSize: 8.5, color: activo ? 'FFFFFF' : 'B8C2D6', nombre: 'nivel-texto' });
    });
    s.addNotes('El mecanismo tiene cinco etapas. La primera respeta la frontera federada: AlejandrIA no ingiere datos; cada Data Partner ejecuta la consulta sobre su OMOP CDM y entrega agregados con supresión de celdas menores a 11. La segunda proyecta la composición clínica de cada cohorte mes a mes. La tercera convierte estratos en atenciones y las enruta a zonas y canales. La cuarta aplica modelos de colas y de backlog según el tipo de zona. La quinta compara escenarios. Usamos la escala de madurez de NASEM: hoy es un modelo digital; llamarlo gemelo exige ingesta automática, calibración continua y cierre de ciclo.');
  }

  // ===== 4. Mapa del portal =====
  pres.addSection({ title: 'Portal' });
  {
    const s = nuevaDiapositiva('Portal');
    s.addText('El portal organiza el trabajo en seis módulos, desde el estado de la red hasta la configuración del modelo', { placeholder: 'title' });
    s.addText('Cada módulo responde una pregunta de planeación y comparte el mismo contexto de escenario, sede y mes.', { placeholder: 'body' });
    const mods = [
      ['panorama', 'Panorama', '¿Qué sedes y meses llegan a saturación en 2027?', 'Tarjetas por sede, mapa de calor sede por mes y alertas priorizadas.', 'Dirección de red y PHM'],
      ['cohortes', 'Cohortes', '¿Cómo cambia la composición clínica con la cobertura y cuánta demanda genera?', 'Matriz de unidades, transiciones entre estratos, proyección con banda y multimorbilidad.', 'Gestión del riesgo en salud'],
      ['territorio', 'Territorio', '¿Dónde se concentra la carga crónica y quién vive lejos de su sede?', 'Mapa hexagonal de 111 celdas con prevalencia, alto riesgo, demanda y tiempo a sede.', 'Planeación territorial y atención domiciliaria'],
      ['sede', 'Sede', '¿Qué zona se satura, en qué mes y con qué indicador de servicio?', 'Modelo 3D de la sede, panel de zona, utilización por hora y equipos.', 'Coordinación de sede'],
      ['escenarios', 'Escenarios', '¿Qué combinación de cobertura y canales mejora el acceso y a qué costo?', 'Editor de escenarios y comparación de hasta cinco variantes.', 'Dirección de PHM y finanzas'],
      ['config', 'Configuración', '¿Con qué parámetros y fuentes trabaja el modelo y qué tan maduro es?', 'Catálogo de cohortes y zonas, contrato de datos y salud del modelo.', 'Analítica y arquitectura'],
    ];
    const wc = (ANCHO - 2 * 0.3) / 3;
    const hc = 2.38;
    mods.forEach(([ic, t, q, v, u], i) => {
      const x = M + (i % 3) * (wc + 0.3);
      const y = Y0 + 0.05 + Math.floor(i / 3) * (hc + 0.25);
      tarjeta(s, { x, y, w: wc, h: hc, nombre: 'modulo' });
      icono(s, ic, x + 0.22, y + 0.22, 0.5, { color: 'FFFFFF' });
      texto(s, t, { x: x + 0.85, y: y + 0.3, w: wc - 1.1, h: 0.34, fontSize: 14, bold: true, nombre: 'modulo-nombre' });
      texto(s, q, { x: x + 0.22, y: y + 0.86, w: wc - 0.44, h: 0.55, fontSize: 10.5, bold: true, color: C.accent1, nombre: 'modulo-pregunta' });
      texto(s, v, { x: x + 0.22, y: y + 1.44, w: wc - 0.44, h: 0.5, fontSize: 9.5, color: C.text2, nombre: 'modulo-vista' });
      texto(s, [{ text: 'Usuario: ', options: { bold: true } }, { text: u }], { x: x + 0.22, y: y + 1.98, w: wc - 0.44, h: 0.25, fontSize: 9, color: C.text1, nombre: 'modulo-usuario' });
    });
    s.addNotes('El portal se presenta como producto: navegación lateral, barra de contexto con escenario, sede y mes, y selectores que crecen con el catálogo. Los seis módulos siguen el orden de una conversación de planeación: dónde está la tensión, qué la explica en la población, dónde ocurre en el territorio, cómo se comporta dentro de la sede, qué escenario la resuelve y con qué supuestos trabaja el modelo.');
  }

  // Plantilla de módulo: captura a la izquierda y lectura a la derecha.
  function modulo(seccion, titulo, lead, captura, tam, filas, notas, opciones = {}) {
    const s = nuevaDiapositiva(seccion);
    s.addText(titulo, { placeholder: 'title' });
    s.addText(lead, { placeholder: 'body' });
    const wImg = opciones.wImg || 7.9;
    const { w } = imagen(s, captura, tam, M, Y0 + 0.08, wImg, YF - Y0 - 0.15);
    const x2 = M + w + 0.4;
    const w2 = W - M - x2;
    let y = Y0 + 0.05;
    for (const [et, cuerpo, col, h] of filas) y = bloque(s, x2, y, w2, et, cuerpo, col, h);
    s.addNotes(notas);
    return s;
  }

  // ===== 5. Panorama =====
  modulo(
    'Portal',
    'Panorama identifica qué sedes y meses llegan a saturación antes de que ocurran',
    'Vista de entrada del portal. En el statu quo, Sede Norte satura consulta externa o admisión en ocho meses de 2027.',
    'r-panorama.png', TAM.panorama,
    [
      ['Propósito', 'Dar a la dirección de red una lectura anual del estado de cada sede y priorizar dónde intervenir primero.', C.accent1, 0.62],
      ['Información', 'Estado de la peor zona por sede y mes, oportunidad de cita P90, utilización de consulta externa y resumen de las cohortes crónicas: personas, multimorbilidad, hospitalizaciones, urgencias y costo.', C.accent1, 1.08],
      ['Cómo se lee', 'Verde, ámbar y rojo indican utilización holgada, tensionada o saturada según el indicador de cada zona. El número en la celda cuenta las zonas saturadas.', C.accent1, 0.85],
      ['Decisión que habilita', 'Qué sedes y meses requieren capacidad adicional, redistribución de agenda o desvío a canales alternos.', C.accent5, 0.62],
    ],
    'Panorama abre el portal en el escenario seleccionado. Cada celda del mapa de calor lleva a la sede y al mes correspondientes. Con otro escenario activo, el resumen muestra diferencias frente al statu quo. Las alertas mezclan saturación de zonas con eventos simulados de equipos, para mostrar cómo convivirían la planeación y la operación.',
    { wImg: 7.9 },
  );

  // ===== 6. Cohortes =====
  {
    const s = nuevaDiapositiva('Portal');
    s.addText('Cohortes proyecta cómo cambian los estratos clínicos con la cobertura y cuántas atenciones genera ese cambio', { placeholder: 'title' });
    s.addText(`Hipertensión arterial en la red completa: ${fmt(CO.hta.n)} personas; cobertura vigente ${pct(CO.hta.cobVig)} frente a ${pct(CO.hta.cobAmp)} en la gestión ampliada.`, { placeholder: 'body' });
    const wImg = 6.55;
    const a = imagen(s, 'cohortes-composicion.png', TAM.comp, M, Y0 + 0.08, wImg, 3.2);
    imagen(s, 'cohortes-proyeccion.png', TAM.proy, M, Y0 + 0.08 + a.h + 0.15, wImg, YF - (Y0 + 0.08 + a.h + 0.15));
    const x2 = M + wImg + 0.4;
    const w2 = W - M - x2;
    let y = Y0 + 0.05;
    y = bloque(s, x2, y, w2, 'Propósito', 'Conectar la gestión del riesgo con la demanda: cuántas personas cambian de estrato y qué atenciones generan.', C.accent4, 0.62);
    y = bloque(s, x2, y, w2, 'Representaciones', 'Matriz de unidades para la composición; diagrama de flujo para las transiciones entre enero y diciembre; proyección mensual con banda P10–P90; diagrama UpSet para la multimorbilidad.', C.accent4, 1.05);
    // Tabla de resultados por cohorte
    texto(s, 'RESULTADO 2027 CON GESTIÓN AMPLIADA (P50)', { x: x2, y, w: w2, h: 0.22, fontSize: 8.5, bold: true, color: C.accent2, charSpacing: 0.5, nombre: 'etiqueta' });
    const filas = [[
      { text: 'Cohorte', options: { bold: true, color: C.text2 } },
      { text: 'Controlada dic.', options: { bold: true, color: C.text2, align: 'right' } },
      { text: 'Hosp. CSCA evitadas', options: { bold: true, color: C.text2, align: 'right' } },
    ]];
    const corto = { hta: 'HTA', dm2: 'DM2', erc: 'ERC G3a–G4', epoc: 'EPOC', ic: 'IC' };
    for (const c of D.cohortes) filas.push([
      { text: corto[c.id] },
      { text: `${pct(c.ctrlSQ)} → ${pct(c.ctrlAmp)}`, options: { align: 'right' } },
      { text: `${fmt(c.hosp.p50, 1)} (${fmt(c.hosp.p10, 1)}–${fmt(c.hosp.p90, 1)})`, options: { align: 'right' } },
    ]);
    s.addTable(filas, { x: x2, y: y + 0.26, w: w2, colW: [1.05, 1.15, w2 - 2.2], fontSize: 8.5, fontFace: 'Arial', color: C.text1, border: { type: 'solid', pt: 0.5, color: HEX.linea }, rowH: 0.24, margin: [2, 4, 2, 4], objectName: 'tabla-cohortes' });
    texto(s, 'Statu quo frente a gestión ampliada en diciembre. Los efectos son moderados en 12 meses porque el control mejora de forma gradual y solo la fracción CSCA responde.', { x: x2, y: y + 0.26 + 6 * 0.24 + 0.12, w: w2, h: 0.62, fontSize: 8.5, color: C.text2, nombre: 'nota-cohortes' });
    s.addNotes('El selector de cohorte se agrupa por ruta de atención y admite búsqueda, de modo que el catálogo puede crecer sin cambiar la interfaz. La comparación siempre se hace contra el statu quo. Las hospitalizaciones evitadas son modestas en un año y la banda P10–P90 lo hace visible; esta lectura es coherente con la evidencia de programas de gestión de enfermedad crónica, cuyo efecto sobre hospitalización se acumula en horizontes más largos. El valor del módulo está en anticipar la demanda de controles que la ampliación genera.');
  }

  // ===== 7. Territorio =====
  modulo(
    'Portal',
    'Territorio ubica la carga crónica y las barreras de acceso para decidir dónde llevar atención domiciliaria',
    'Prevalencia de hipertensión por celda. Sede Sur tiene 15 % de su población en la cohorte a más de 30 minutos de la sede.',
    'territorio-mapa.png', TAM.mapa,
    [
      ['Propósito', 'Llevar la demanda de las cohortes a una unidad territorial estable y comparable entre sedes.', C.accent2, 0.62],
      ['Información', 'Malla hexagonal de 111 celdas asignadas a la sede más cercana. Métricas seleccionables: prevalencia, personas en la cohorte, alto riesgo, demanda proyectada, tiempo a la sede y adultos.', C.accent2, 1.05],
      ['Por qué hexágonos', 'Cada celda tiene la misma área y seis vecinas equidistantes, lo que evita el sesgo visual de los límites administrativos y permite agregar sin exponer personas.', C.accent2, 0.85],
      ['Decisión que habilita', 'Qué celdas priorizar para equipos domiciliarios y dónde reforzar la atención virtual por distancia.', C.accent5, 0.62],
    ],
    'El mapa usa una rampa secuencial de seis tonos y marca con línea gruesa los límites entre territorios de sede. La opción de sombrear celdas a más de 30 minutos permite discutir acceso y equidad. En producción, las celdas se construyen con un índice geoespacial jerárquico, como H3, y los conteos llegan agregados desde cada fuente con supresión de celdas pequeñas.',
    { wImg: 7.2 },
  );

  // ===== 8. Sede =====
  {
    const s = nuevaDiapositiva('Portal');
    s.addText('Sede muestra en qué zona y en qué mes se satura la capacidad, con el indicador de servicio propio de cada zona', { placeholder: 'title' });
    s.addText('Sede Norte en septiembre, statu quo: consulta externa al 100 % y oportunidad de cita P90 de 2,9 días.', { placeholder: 'body' });
    const wImg = 8.0;
    const r = imagen(s, 'sede-3d.png', TAM.sede3d, M, Y0 + 0.08, wImg, 3.4);
    // Lectura del ejemplo bajo la captura
    const yL = Y0 + 0.08 + r.h + 0.25;
    tarjeta(s, { x: M, y: yL, w: r.w, h: YF - yL, fill: { color: C.accent3, transparency: 90 }, line: { type: 'none' }, nombre: 'lectura-sede' });
    texto(s, 'LECTURA DEL EJEMPLO', { x: M + 0.22, y: yL + 0.15, w: 3, h: 0.2, fontSize: 8.5, bold: true, color: C.accent3, charSpacing: 0.5, nombre: 'etiqueta' });
    texto(s, 'Consulta externa recibe 371 atenciones por día frente a una capacidad de 370; 84 provienen de las cohortes crónicas. Admisión opera al 99 % y laboratorio al 94 %. La presión se concentra en consulta externa y admisión; procedimientos y atención domiciliaria conservan holgura.', { x: M + 0.22, y: yL + 0.4, w: r.w - 0.44, h: YF - yL - 0.5, fontSize: 10, nombre: 'lectura-sede-texto' });
    const x2 = M + r.w + 0.35;
    const w2 = W - M - x2;
    const hC = (YF - Y0 - 0.05 - 3 * 0.15) / 4;
    const cards = [
      ['Zonas con cita', 'Consulta externa y procedimientos. Recursión diaria de backlog con llegadas sobredispersas, inasistencia y sobreagenda; indicador: oportunidad de cita P50 y P90.', C.accent3],
      ['Zonas sin cita', 'Admisión, prioritaria y laboratorio. Colas G/G/c por hora con Erlang C y ajuste de Allen-Cunneen; indicador: probabilidad de esperar más que la meta.', C.accent3],
      ['Canales fuera de la sede', 'Equipos domiciliarios y médicos virtuales con umbrales de 80 % y 95 % de utilización; el render ubica la base domiciliaria y el nodo virtual.', C.accent3],
      ['Interacción', 'El flujo de pacientes y el recorrido del año se activan solo a solicitud. Cada punto equivale a cuatro atenciones por día; la telemetría de equipos es simulada.', C.accent5],
    ];
    cards.forEach(([t, d, col], i) => {
      const y = Y0 + 0.08 + i * (hC + 0.15);
      tarjeta(s, { x: x2, y, w: w2, h: hC, nombre: 'tarjeta-sede' });
      texto(s, t, { x: x2 + 0.18, y: y + 0.12, w: w2 - 0.36, h: 0.26, fontSize: 11, bold: true, color: col, nombre: 'tarjeta-sede-titulo' });
      texto(s, d, { x: x2 + 0.18, y: y + 0.4, w: w2 - 0.36, h: hC - 0.48, fontSize: 9.5, color: C.text1, nombre: 'tarjeta-sede-texto' });
    });
    s.addNotes('El render 3D es una representación esquemática de la sede: cada zona se colorea según su estado y al seleccionarla se abre el panel con su indicador. La animación de pacientes está detenida por defecto para no distraer y se activa con "Reproducir flujo". El recorrido de 2027 permite ver la estacionalidad mes a mes. La meta de oportunidad de consulta externa toma como referencia la Resolución 1552 de 2013; las metas de espera de las zonas sin cita son supuestos que SURA debe fijar.');
  }

  // ===== 9. Escenarios =====
  {
    const s = nuevaDiapositiva('Portal');
    s.addText('La cobertura ampliada mejora el acceso cuando se acompaña de canales domiciliario y virtual, y ese efecto tiene un costo visible', { placeholder: 'title' });
    s.addText('Escenarios crea variantes de cobertura y canales y las compara contra el statu quo en toda la red.', { placeholder: 'body' });
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const series = ['sq', 'ampliada', 'canales', 'caida'].map((id) => ({ name: E[id].nombre, labels: meses, values: E[id].norteConsulta.map((v) => Math.min(v, 100) / 100) }));
    const wG = 6.0;
    texto(s, 'Utilización de consulta externa en Sede Norte, 2027', { x: M, y: Y0 + 0.05, w: wG, h: 0.28, fontSize: 11, bold: true, nombre: 'grafico-titulo' });
    s.addChart(pres.charts.LINE, series, {
      x: M, y: Y0 + 0.35, w: wG, h: 4.0,
      chartColors: [HEX.gris, HEX.azul, HEX.teal, HEX.rojo],
      lineSize: 2, lineDataSymbol: 'none',
      valAxisMinVal: 0.7, valAxisMaxVal: 1.0, valAxisMajorUnit: 0.05, valAxisLabelFormatCode: '0%',
      valAxisLabelColor: '4A5568', catAxisLabelColor: '4A5568', valAxisLabelFontSize: 9, catAxisLabelFontSize: 9,
      valAxisLabelFontFace: '+mn-lt', catAxisLabelFontFace: '+mn-lt',
      valGridLine: { color: 'E3E8EF', size: 0.5 }, catGridLine: { style: 'none' },
      showLegend: true, legendPos: 'b', legendFontSize: 9, legendFontFace: '+mn-lt', legendColor: '4A5568',
      objectName: 'grafico-utilizacion-norte',
    });
    texto(s, 'Statu quo, gestión ampliada y caída de la gestión se superponen cerca del 100 %; con canales la utilización baja entre 10 y 12 puntos.', { x: M, y: Y0 + 4.45, w: wG, h: 0.5, fontSize: 9, color: C.text2, nombre: 'grafico-nota' });

    const x2 = M + wG + 0.4;
    const w2 = W - M - x2;
    texto(s, 'COMPARACIÓN EN LA RED, 2027', { x: x2, y: Y0 + 0.05, w: w2, h: 0.22, fontSize: 8.5, bold: true, color: C.accent1, charSpacing: 0.5, nombre: 'etiqueta' });
    const cab = (t) => ({ text: t, options: { bold: true, color: C.text2, align: 'right', valign: 'bottom' } });
    const sg = (v, d = 0) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), d);
    const filasT = [
      [{ text: 'Indicador', options: { bold: true, color: C.text2, valign: 'bottom' } }, cab('Statu quo'), cab('Gestión ampliada'), cab('Ampliada con canales'), cab('Caída de la gestión')],
      ['Hospitalizaciones CSCA evitadas', ...['sq', 'ampliada', 'canales', 'caida'].map((id) => sg(E[id].hosp))],
      ['Urgencias evitadas', ...['sq', 'ampliada', 'canales', 'caida'].map((id) => sg(E[id].urg))],
      ['Costo frente al statu quo (M COP)', ...['sq', 'ampliada', 'canales', 'caida'].map((id) => sg(E[id].costo / 1e6))],
      ['Meses-sede con saturación', ...['sq', 'ampliada', 'canales', 'caida'].map((id) => `${E[id].mesesSat} de 48`)],
      ['Oportunidad P90 máxima', ...['sq', 'ampliada', 'canales', 'caida'].map((id) => `${fmt(E[id].opMax, 1)} d`)],
      ['Visitas domiciliarias', ...['sq', 'ampliada', 'canales', 'caida'].map((id) => fmt(E[id].dom))],
      ['Atenciones virtuales', ...['sq', 'ampliada', 'canales', 'caida'].map((id) => fmt(E[id].vir))],
      ['Equipos domiciliarios adicionales', ...['sq', 'ampliada', 'canales', 'caida'].map((id) => fmt(E[id].equipos))],
    ].map((f, i) => (i === 0 ? f : f.map((c, j) => (j === 0 ? { text: c } : { text: c, options: { align: 'right', bold: j === 3, color: j === 3 ? C.accent2 : C.text1 } }))));
    s.addTable(filasT, { x: x2, y: Y0 + 0.32, w: w2, colW: [2.05, 0.93, 0.98, 1.06, w2 - 5.02], fontSize: 9, fontFace: 'Arial', color: C.text1, border: { type: 'solid', pt: 0.5, color: HEX.linea }, rowH: [0.46, 0.33, 0.33, 0.33, 0.33, 0.33, 0.33, 0.33, 0.33], margin: [2, 5, 2, 5], valign: 'middle', objectName: 'tabla-escenarios' });
    const yN = Y0 + 0.32 + 0.46 + 8 * 0.33 + 0.25;
    tarjeta(s, { x: x2, y: yN, w: w2, h: YF - yN, fill: { color: C.accent2, transparency: 90 }, line: { type: 'none' }, nombre: 'lectura-escenarios' });
    texto(s, [
      { text: 'Lectura. ', options: { bold: true } },
      { text: `La ampliación de 25 puntos de cobertura sin canales eleva la oportunidad P90 de ${fmt(E.sq.opMax, 1)} a ${fmt(E.ampliada.opMax, 1)} días. Con atención domiciliaria, virtual y recordatorios no quedan meses-sede saturados, a cambio de ${E.canales.equipos} equipos domiciliarios y de un mayor costo de atención que debe compararse con el valor del acceso oportuno.` },
    ], { x: x2 + 0.2, y: yN + 0.14, w: w2 - 0.4, h: YF - yN - 0.24, fontSize: 10, nombre: 'lectura-texto', valign: 'middle' });
    s.addNotes('Los cuatro escenarios base son ilustrativos. El statu quo está bloqueado; los demás se pueden duplicar y editar, y la cobertura de cada cohorte se ajusta con controles generados desde el catálogo. La comparación admite hasta cinco escenarios. El costo de la variante con canales incluye visitas domiciliarias y teleconsultas a costos unitarios sintéticos; la discusión con SURA debe incluir el costo frente a la UPC y el valor de la oportunidad de cita.');
  }

  // ===== 10. Configuración y madurez =====
  {
    const s = nuevaDiapositiva('Portal');
    s.addText('Configuración hace explícitos los parámetros, el contrato de datos y el nivel de madurez del modelo', { placeholder: 'title' });
    s.addText('El catálogo de cohortes y zonas es editable; las fuentes y los indicadores de salud del modelo definen cuándo avanzar de nivel.', { placeholder: 'body' });
    const wImg = 6.9;
    const r = imagen(s, 'r-fuentes.png', TAM.fuentes, M, Y0 + 0.08, wImg, 2.4);
    let y = Y0 + 0.08 + r.h + 0.3;
    y = bloque(s, M, y, wImg, 'Catálogo', 'Cohortes con estratos, matrices de transición, tasas por estrato, estacionalidad y fracción CSCA; sedes con zonas, servidores, horarios, tiempos de servicio y metas. Agregar una cohorte la incorpora a todos los selectores y escenarios.', C.accent3, 0.85);
    bloque(s, M, y, wImg, 'Por qué importa', 'Los supuestos dejan de estar ocultos en el modelo: cada parámetro tiene responsable, fuente y versión, lo que permite auditar y recalibrar.', C.accent5, 0.6);

    const x2 = M + wImg + 0.4;
    const w2 = W - M - x2;
    texto(s, 'INDICADORES DE SALUD DEL MODELO', { x: x2, y: Y0 + 0.05, w: w2, h: 0.22, fontSize: 8.5, bold: true, color: C.accent4, charSpacing: 0.5, nombre: 'etiqueta' });
    const ind = [
      ['Fuentes dentro del SLA', '≥ 95 %'],
      ['Cobertura de sensores', '≥ 90 % de equipos inventariados'],
      ['Error de calibración (WAPE mensual por zona)', '≤ 10–15 % en backtest de 12 meses'],
      ['Cobertura de intervalos P10–P90', '75–85 % de observados dentro de la banda'],
      ['Deriva de entradas (PSI)', '< 0,2'],
      ['Latencia de extremo a extremo', 'Estado < 5 s; agenda < 15 min'],
      ['Cierre de ciclo', 'Recomendaciones aceptadas, ejecutadas y con efecto observado'],
    ];
    const filas = [[{ text: 'Indicador', options: { bold: true, color: C.text2 } }, { text: 'Meta', options: { bold: true, color: C.text2 } }], ...ind.map(([a, b]) => [{ text: a }, { text: b }])];
    s.addTable(filas, { x: x2, y: Y0 + 0.32, w: w2, colW: [2.6, w2 - 2.6], fontSize: 9, fontFace: 'Arial', color: C.text1, border: { type: 'solid', pt: 0.5, color: HEX.linea }, rowH: 0.36, margin: [2, 5, 2, 5], objectName: 'tabla-salud' });
    const yL = Y0 + 0.32 + 8 * 0.36 + 0.25;
    texto(s, 'CRITERIO DE AVANCE ENTRE NIVELES', { x: x2, y: yL, w: w2, h: 0.22, fontSize: 8.5, bold: true, color: C.accent4, charSpacing: 0.5, nombre: 'etiqueta' });
    texto(s, [
      { text: 'Modelo → sombra: ', options: { bold: true } }, { text: 'ingesta automática de agenda y estado de zonas dentro del SLA.', options: { breakLine: true } },
      { text: 'Sombra → gemelo: ', options: { bold: true } }, { text: 'WAPE y cobertura de intervalos en meta durante tres meses, y recomendaciones con registro de aceptación y efecto.' },
    ], { x: x2, y: yL + 0.26, w: w2, h: YF - yL - 0.26, fontSize: 9.5, paraSpaceAfter: 4, nombre: 'criterio-avance' });
    s.addNotes('Configuración es el módulo que diferencia una demostración de un producto operable. El contrato de datos fija mecanismo, granularidad, frescura y responsable de cada fuente; todas son sintéticas en este entorno. Los indicadores de salud del modelo permiten afirmar en qué nivel de madurez está la solución con evidencia, en lugar de declararlo.');
  }

  // ===== 11. Arquitectura =====
  pres.addSection({ title: 'Fundamentos' });
  {
    const s = nuevaDiapositiva('Fundamentos');
    s.addText('La arquitectura separa los datos clínicos federados de la telemetría operativa y respeta la frontera de AlejandrIA', { placeholder: 'title' });
    s.addText('Los datos de pacientes permanecen en cada Data Partner; el portal consume agregados y estados operativos sin información personal.', { placeholder: 'body' });
    const capas = [
      ['Experiencia', 'Portal de planeación por cohortes: seis módulos, escenarios versionados y control de acceso por rol.', C.accent1],
      ['Cierre de ciclo', 'Recomendaciones con responsable, registro de aceptación, ejecución y efecto observado; alimenta la calibración.', C.accent5],
      ['Modelos', 'Modelo poblacional (Markov mensual y Monte Carlo) y modelo de capacidad (colas y backlog), con versión de parámetros e indicadores de salud.', C.accent4],
      ['Datos y contratos', 'Agregados federados con supresión de celdas menores a 11, contratos de datos por fuente, catálogo de cohortes y zonas.', C.accent3],
      ['Integración', 'Consulta federada sobre OMOP CDM; eventos de agenda por FHIR R4 Subscriptions; estado de zonas y equipos en un espacio de nombres unificado sobre MQTT, sin datos de pacientes.', C.accent3],
      ['Fuentes en cada Data Partner', 'Historia clínica, agenda y citas, admisión, laboratorio, despacho domiciliario, telemedicina y equipos biomédicos. Cada Data Partner es responsable de su ingesta y de la transformación FHIR → OMOP.', C.text1],
    ];
    const wL = 7.75;
    const hL = 0.72;
    const yCapa = (i) => Y0 + 0.05 + i * (hL + 0.08) + (i >= 4 ? 0.3 : 0);
    capas.forEach(([t, d, col], i) => {
      const y = yCapa(i);
      tarjeta(s, { x: M, y, w: wL, h: hL, fill: { color: col, transparency: i === 5 ? 92 : 88 }, line: { type: 'none' }, nombre: 'capa' });
      texto(s, t, { x: M + 0.2, y, w: 1.85, h: hL, fontSize: 10.5, bold: true, color: col, valign: 'middle', nombre: 'capa-nombre' });
      texto(s, d, { x: M + 2.1, y, w: wL - 2.3, h: hL, fontSize: 9.5, color: C.text1, valign: 'middle', nombre: 'capa-texto' });
    });
    // Frontera federada
    const yF = yCapa(4) - 0.19;
    s.addShape(pres.shapes.LINE, { x: M, y: yF, w: wL, h: 0, line: { color: HEX.rojo, width: 1.25, dashType: 'dash' }, objectName: 'frontera-federada' });
    s.addShape(pres.shapes.RECTANGLE, { x: M + 1.6, y: yF - 0.12, w: 4.55, h: 0.24, fill: { color: 'FFFFFF' }, line: { type: 'none' }, objectName: 'frontera-fondo' });
    texto(s, 'Frontera federada: hacia arriba solo circulan agregados y estados operativos', { x: M + 1.6, y: yF - 0.12, w: 4.55, h: 0.24, fontSize: 8.5, bold: true, color: C.accent6, align: 'center', valign: 'middle', nombre: 'frontera-texto' });

    const x2 = M + wL + 0.4;
    const w2 = W - M - x2;
    texto(s, 'REFERENTES POR CAPACIDAD', { x: x2, y: Y0 + 0.05, w: w2, h: 0.22, fontSize: 8.5, bold: true, color: C.accent2, charSpacing: 0.5, nombre: 'etiqueta' });
    const refs = [
      ['Centro de comando de capacidad', 'Johns Hopkins Hospital con GE HealthCare (2016): visión unificada de camas, flujo y alertas para decidir en tiempo real.'],
      ['Gemelo operativo hospitalario', 'Tampa General Hospital, CareComm: centro de comando que integra datos operativos y modelos predictivos de demanda.'],
      ['Red federada OMOP', 'EHDEN y OHDSI: 187 Data Partners en 29 países ejecutan análisis sin mover datos de pacientes.'],
      ['Seguridad de equipos conectados', 'Hospital Sírio-Libanês con NTT DATA y Claroty: inventario y monitoreo de dispositivos médicos y OT.'],
      ['Física de la operación (fase posterior)', 'Robots de logística clínica, como Moxi de Diligent Robotics, para tareas de transporte dentro de la sede.'],
    ];
    let y = Y0 + 0.36;
    for (const [t, d] of refs) {
      icono(s, 'check', x2, y + 0.02, 0.26);
      texto(s, t, { x: x2 + 0.36, y, w: w2 - 0.36, h: 0.24, fontSize: 10, bold: true, nombre: 'referente-titulo' });
      texto(s, d, { x: x2 + 0.36, y: y + 0.25, w: w2 - 0.36, h: 0.62, fontSize: 9, color: C.text2, nombre: 'referente-texto' });
      y += 0.97;
    }
    s.addNotes('La línea roja marca la frontera federada. AlejandrIA no ingiere datos: cada Data Partner es responsable de su ingesta y de la transformación de FHIR a OMOP, y solo publica agregados con supresión. La telemetría operativa viaja por un espacio de nombres unificado sobre MQTT y no contiene datos de pacientes. Los referentes muestran que cada capacidad tiene precedentes en operación; la robótica de logística clínica se plantea para una fase posterior.');
  }

  // ===== 12. Supuestos y fuentes =====
  {
    const s = nuevaDiapositiva('Fundamentos');
    s.addText('Los parámetros sintéticos se apoyan en evidencia publicada y cada uno tiene una fuente de calibración definida en SURA', { placeholder: 'title' });
    s.addText('La demostración usa valores plausibles; la fase de calibración los reemplaza por datos agregados de la población de SURA.', { placeholder: 'body' });
    const cab = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text1 }, valign: 'middle' } });
    const filas = [
      [cab('Parámetro'), cab('Valor en la demostración'), cab('Base de evidencia'), cab('Calibración en SURA')],
      ['Prevalencia por cohorte', `HTA ${fmt((CO.hta.n / D.adultos) * 100, 1)} %, DM2 ${fmt((CO.dm2.n / D.adultos) * 100, 1)} %, ERC G3a–G4 y EPOC ${fmt((CO.erc.n / D.adultos) * 100, 1)} %, IC ${fmt((CO.ic.n / D.adultos) * 100, 1)} % de adultos; 18 perfiles de multimorbilidad`, 'Cuenta de Alto Costo, Encuesta Nacional de Salud, PREPOCOL', 'Cohortes y registros CAC de EPS SURA'],
      ['Estratos y transiciones', 'Cuatro estratos por cohorte con criterios KDIGO, GOLD y NYHA; matrices anuales con y sin gestión', 'Historia natural publicada y juicio clínico experto', 'Trayectorias observadas en OMOP, 12 a 24 meses'],
      ['Efecto de la gestión del riesgo', 'Efecto residual por estrato con distribución PERT', 'Kruis 2013, Lenferink 2017, McAlister 2004, Tricco 2012', 'Cohortes con y sin programa, ajustadas por riesgo'],
      ['Fracción CSCA de hospitalizaciones', '25 % a 55 % según cohorte', 'AHRQ Prevention Quality Indicators', 'Egresos por diagnóstico principal'],
      ['Desvío a canal virtual y retorno', 'Proporción por tipo de atención con fuga a consulta presencial', 'Inglis 2015, Tucker 2017, Janjua 2021', 'Registros de teleconsulta y desenlace'],
      ['Colas y backlog', 'Erlang C con ajuste de Allen-Cunneen; backlog diario con 120 réplicas', 'Teoría de colas para servicios de salud', 'Agenda, admisión y tiempos de servicio'],
      ['Inasistencia y sobreagenda', '14 % a 18 % por sede; recordatorios restan 4 puntos', 'Supuesto sintético', 'Agenda por sede y franja'],
      ['Metas de servicio', 'Oportunidad de 3 días para consulta externa; esperas por zona', 'Resolución 1552 de 2013; metas de zona supuestas', 'Definición de SURA por zona'],
      ['Calendario y costos', '2027 con 18 festivos y sábado de media jornada; costos unitarios sintéticos', 'Calendario oficial de Colombia', 'Tarifas, UPC y costos por canal'],
    ].map((f, i) => (i === 0 ? f : f.map((c, j) => ({ text: c, options: { bold: j === 0, color: j === 2 ? C.accent4 : C.text1 } }))));
    s.addTable(filas, { x: M, y: Y0 + 0.05, w: ANCHO, colW: [2.35, 3.85, 3.15, ANCHO - 9.35], fontSize: 9, fontFace: 'Arial', color: C.text1, border: { type: 'solid', pt: 0.5, color: HEX.linea }, rowH: [0.34, 0.5, 0.5, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42], margin: [3, 6, 3, 6], valign: 'middle', objectName: 'tabla-supuestos' });
    texto(s, 'Kruis et al., Cochrane 2013 (EPOC); Lenferink et al., Cochrane 2017 (autogestión en EPOC); McAlister et al., JACC 2004 (IC); Tricco et al., Lancet 2012 (DM2); Inglis et al., Cochrane 2015 (telemonitoreo en IC); Tucker et al., PLoS Med 2017 (automonitoreo de presión arterial); Janjua et al., Cochrane 2021 (telemonitoreo en EPOC).', { x: M, y: 6.42, w: ANCHO, h: 0.42, fontSize: 8, color: C.text2, nombre: 'referencias' });
    s.addNotes('Esta tabla responde a la pregunta de dónde salen los números. Ningún parámetro de la demostración proviene de datos de SURA. La columna de calibración define qué datos se solicitarían en la primera fase, siempre como agregados federados. Las metas de espera por zona y la inasistencia por sede son decisiones o datos de SURA y deben fijarse antes de interpretar resultados.');
  }

  // ===== 13. Hoja de ruta =====
  pres.addSection({ title: 'Ruta' });
  {
    const s = nuevaDiapositiva('Ruta');
    s.addText('La hoja de ruta lleva el modelo a sombra digital en dos sedes y a gemelo con cierre de ciclo en el Release 1.0', { placeholder: 'title' });
    s.addText('Cada fase termina con un criterio de avance medible; las duraciones son estimadas y se ajustan con el acceso a datos.', { placeholder: 'body' });
    const fases = [
      ['Fase 0', 'Calibración', '6 a 8 semanas', C.accent1, ['Dos sedes y cinco cohortes priorizadas', 'Agregados federados por celda y mes', 'Parámetros de transición, tasas y zonas', 'Backtest de 12 meses por zona'], 'WAPE mensual por zona ≤ 15 %'],
      ['Fase 1', 'Sombra digital', '3 meses', C.accent3, ['Eventos de agenda por FHIR Subscriptions', 'Estado de zonas en el espacio de nombres unificado', 'Actualización diaria del portal', 'Indicadores de salud del modelo'], 'Fuentes dentro del SLA ≥ 95 %'],
      ['Fase 2 · Release 1.0', 'Gemelo de capacidad', '3 a 4 meses', C.accent2, ['Recomendaciones de equipos, agenda y canal', 'Registro de aceptación, ejecución y efecto', 'Cuatro sedes y escenarios versionados', 'Gobierno de parámetros por rol'], 'Cierre de ciclo trazable en tres meses consecutivos'],
      ['Fase 3 · Extensión', 'Escala y operación física', 'Posterior', C.accent4, ['Nuevas cohortes y rutas de atención', 'Equipos biomédicos conectados', 'Robótica de logística clínica', 'Otras regionales y prestadores'], 'Decisión según valor demostrado'],
    ];
    const wf = (ANCHO - 3 * 0.25) / 4;
    const yF = Y0 + 0.1;
    // Línea de tiempo
    s.addShape(pres.shapes.LINE, { x: M + 0.2, y: yF + 0.2, w: ANCHO - 0.4, h: 0, line: { color: HEX.linea, width: 1.5 }, objectName: 'linea-tiempo' });
    fases.forEach(([f, t, dur, col, items, crit], i) => {
      const x = M + i * (wf + 0.25);
      insignia(s, String(i), x + 0.05, yF + 0.03, col, 0.36);
      texto(s, dur, { x: x + 0.5, y: yF + 0.08, w: wf - 0.5, h: 0.25, fontSize: 9, color: C.text2, nombre: 'duracion' });
      tarjeta(s, { x, y: yF + 0.55, w: wf, h: 3.55, fill: { color: 'FFFFFF' }, nombre: 'fase' });
      texto(s, f.toUpperCase(), { x: x + 0.2, y: yF + 0.72, w: wf - 0.4, h: 0.22, fontSize: 8.5, bold: true, color: col, charSpacing: 0.5, nombre: 'fase-etiqueta' });
      texto(s, t, { x: x + 0.2, y: yF + 0.95, w: wf - 0.4, h: 0.32, fontSize: 13, bold: true, nombre: 'fase-titulo' });
      texto(s, items.map((it, k) => ({ text: it, options: { bullet: { indent: 12 }, breakLine: k < items.length - 1 } })), { x: x + 0.2, y: yF + 1.38, w: wf - 0.4, h: 1.4, fontSize: 9.5, paraSpaceAfter: 5, nombre: 'fase-entregables' });
      tarjeta(s, { x: x + 0.15, y: yF + 2.92, w: wf - 0.3, h: 1.03, fill: { color: col, transparency: 88 }, line: { type: 'none' }, nombre: 'criterio' });
      texto(s, 'CRITERIO DE AVANCE', { x: x + 0.3, y: yF + 3.04, w: wf - 0.6, h: 0.2, fontSize: 7.5, bold: true, color: col, nombre: 'criterio-etiqueta' });
      texto(s, crit, { x: x + 0.3, y: yF + 3.27, w: wf - 0.6, h: 0.6, fontSize: 10, bold: true, nombre: 'criterio-texto' });
    });
    // Dependencias de SURA
    const yD = yF + 4.3;
    tarjeta(s, { x: M, y: yD, w: ANCHO, h: YF - yD, fill: { color: C.background2 }, line: { type: 'none' }, nombre: 'dependencias' });
    texto(s, 'DEPENDENCIAS DE SURA', { x: M + 0.25, y: yD + (YF - yD - 0.22) / 2, w: 2.4, h: 0.22, fontSize: 8.5, bold: true, color: C.accent5, charSpacing: 0.5, nombre: 'etiqueta' });
    const deps = ['Acuerdo con los Data Partners para consultas federadas y agregados por celda', 'Acceso a agenda y admisión por FHIR o extractos agregados por zona', 'Metas de servicio por zona y responsables del cierre de ciclo'];
    const wd = (ANCHO - 2.9) / 3;
    deps.forEach((d, i) => texto(s, d, { x: M + 2.7 + i * wd, y: yD + 0.13, w: wd - 0.25, h: YF - yD - 0.2, fontSize: 9.5, valign: 'middle', nombre: 'dependencia' }));
    s.addNotes('La ruta avanza por niveles de madurez. La fase 0 reemplaza los parámetros sintéticos y mide el error de calibración; la fase 1 conecta agenda y estado de zonas para que el modelo refleje la operación casi en tiempo real; el Release 1.0 agrega recomendaciones con registro de aceptación y efecto, que es lo que permite llamar gemelo a la solución. La extensión incorpora equipos conectados y robótica de logística clínica cuando el valor esté demostrado.');
  }

  // ===== 14. Próximo paso =====
  {
    const s = nuevaDiapositiva('Ruta', 'CIERRE');
    s.addText('Proponemos calibrar el modelo con dos sedes y cinco cohortes para decidir con evidencia propia la expansión de canales', { placeholder: 'title' });
    const pasos = [
      ['1', 'Priorizar el alcance', 'Seleccionar dos sedes con perfiles de demanda distintos y confirmar las cinco cohortes o sustituirlas por las rutas priorizadas por PHM.'],
      ['2', 'Habilitar los datos', 'Acordar con los Data Partners la consulta federada sobre OMOP con supresión de celdas menores a 11 y extractos agregados de agenda por sede y zona.'],
      ['3', 'Fijar metas y responsables', 'Definir metas de servicio por zona, valores de inasistencia por sede y los responsables de aceptar y ejecutar recomendaciones.'],
    ];
    const wc = (ANCHO - 2 * 0.3) / 3;
    pasos.forEach(([nm, t, d], i) => {
      const x = M + i * (wc + 0.3);
      const y = 1.85;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: wc, h: 2.1, rectRadius: 0.07, fill: { color: 'FFFFFF', transparency: 92 }, line: { color: '3A4560', width: 0.75 }, objectName: nombre('paso') });
      insignia(s, nm, x + 0.25, y + 0.25, HEX.teal, 0.46);
      texto(s, t, { x: x + 0.25, y: y + 0.88, w: wc - 0.5, h: 0.35, fontSize: 14, bold: true, color: C.background1, nombre: 'paso-titulo' });
      texto(s, d, { x: x + 0.25, y: y + 1.26, w: wc - 0.5, h: 0.75, fontSize: 10.5, color: 'C9D3E3', nombre: 'paso-texto' });
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 4.2, w: ANCHO, h: 1.3, rectRadius: 0.07, fill: { color: HEX.teal }, line: { type: 'none' }, objectName: 'resultado-fase0' });
    texto(s, 'AL CIERRE DE LA FASE 0', { x: M + 0.3, y: 4.36, w: 4, h: 0.22, fontSize: 9, bold: true, color: C.text1, charSpacing: 0.5, nombre: 'resultado-etiqueta' });
    texto(s, [
      { text: 'El portal funciona con parámetros de SURA para dos sedes, con error de calibración medido por zona, ', options: {} },
      { text: 'y la dirección de PHM puede comparar la ampliación de cobertura con y sin canales alternos antes de comprometer capacidad para 2027.', options: { bold: true } },
    ], { x: M + 0.3, y: 4.62, w: ANCHO - 0.6, h: 0.8, fontSize: 14, color: C.background1, nombre: 'resultado-texto' });
    texto(s, 'CÓMO TRABAJAMOS LA FASE 0', { x: M, y: 5.8, w: 4, h: 0.22, fontSize: 8.5, bold: true, color: HEX.cian, charSpacing: 0.5, nombre: 'aporte-etiqueta' });
    const aportes = [
      ['Modelación', 'Equipo de ciencia de datos y operaciones que calibra el modelo poblacional y el de capacidad con los agregados de SURA.'],
      ['Arquitectura federada', 'Consultas sobre OMOP diseñadas con los Data Partners dentro de AlejandrIA, sin mover datos de pacientes.'],
      ['Producto', 'Portal configurado con las sedes, zonas y cohortes de SURA, con los indicadores de salud del modelo activos.'],
    ];
    aportes.forEach(([t, d], i) => texto(s, [{ text: `${t}. `, options: { bold: true, color: 'FFFFFF' } }, { text: d, options: { color: 'C9D3E3' } }], { x: M + i * (wc + 0.3), y: 6.08, w: wc, h: 0.75, fontSize: 9.5, nombre: 'aporte' }));
    s.addNotes('Cierre con la decisión concreta: aprobar la fase 0 con alcance acotado. Las tres condiciones dependen de SURA: priorizar sedes y cohortes, habilitar los agregados federados y fijar metas y responsables. Con eso, la conversación de planeación de 2027 se apoya en parámetros propios en lugar de supuestos.');
  }

  await pres.writeFile({ fileName: SALIDA });
  await applyTheme(SALIDA, THEME);
  console.log('Escrito', SALIDA);
}

construir().catch((e) => {
  console.error(e);
  process.exit(1);
});
