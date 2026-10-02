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
// Altura estimada de un texto en Arial: ancho medio de carácter ≈ 0,5 del cuerpo.
function alto(t, w, fs, interlineado = 1.2) {
  const cpl = Math.max(10, Math.floor((w * 72) / (fs * 0.5)));
  const lineas = String(t).split('\n').reduce((a, p) => a + Math.max(1, Math.ceil(p.length / cpl)), 0);
  return (lineas * fs * interlineado) / 72 + 0.04;
}
// Etiqueta + párrafo con altura automática; devuelve la nueva coordenada y.
function parrafo(s, x, y, w, etiqueta, cuerpo, color, fs = 9.5) {
  texto(s, etiqueta.toUpperCase(), { x, y, w, h: 0.2, fontSize: 8, bold: true, color, charSpacing: 0.5, nombre: 'etiqueta' });
  const h = alto(cuerpo, w, fs);
  texto(s, cuerpo, { x, y: y + 0.22, w, h, fontSize: fs, color: C.text1, nombre: 'cuerpo' });
  return y + 0.22 + h + 0.13;
}
function columnaLectura(s, x, y, w, filas, fs = 9.5) {
  for (const [et, cuerpo, col] of filas) y = parrafo(s, x, y, w, et, cuerpo, col, fs);
  if (y > YF + 0.05) console.warn('Desborde estimado en columna de lectura:', filas[0][0], y.toFixed(2));
  return y;
}

async function construir() {
  await prepararIcono('panorama', Fi.FiGrid, HEX.azul);
  await prepararIcono('cohortes', Fi.FiUsers, HEX.morado);
  await prepararIcono('territorio', Fi.FiMap, HEX.teal);
  await prepararIcono('sede', Fi.FiHome, HEX.medio);
  await prepararIcono('escenarios', Fi.FiSliders, HEX.naranja);
  await prepararIcono('config', Fi.FiSettings, HEX.navy);
  await prepararIcono('reloj', Fi.FiClock, HEX.azul);
  await prepararIcono('capas', Fi.FiLayers, HEX.azul);
  await prepararIcono('canales', Fi.FiShare2, HEX.azul);
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
    texto(s, 'Modelo de capacidad de una sede con datos sintéticos', { x: W - 4.55, y: 1.35 + h + 0.1, w: 4.2, h: 0.25, fontSize: 9, color: '8F9BB3', align: 'right', nombre: 'nota-render' });
    s.addNotes('Abrir con el propósito de la sesión. La propuesta conecta dos piezas que hoy se gestionan por separado: la gestión del riesgo de las cohortes crónicas y la planeación de la capacidad de la red. El portal de demostración funciona con datos sintéticos de una red de cuatro sedes y 107.503 adultos; las cifras ilustran el mecanismo y no describen la operación real de SURA.');
  }

  // ===== 2. Problema y hallazgos =====
  {
    const s = nuevaDiapositiva('Contexto');
    s.addText('La gestión del riesgo cambia la demanda de la red, y hoy la capacidad se planea sin ver ese cambio a tiempo', { placeholder: 'title' });
    s.addText('El portal conecta ambas decisiones y muestra dónde, cuándo y por qué se tensiona la red cuando cambia la cobertura del programa.', { placeholder: 'body' });
    const tensiones = [
      ['reloj', 'Los efectos llegan en tiempos distintos', 'Cuando el programa incorpora más personas, la primera consecuencia es operativa: más controles programados, más laboratorios y más seguimiento. La reducción de descompensaciones y hospitalizaciones evitables llega después, a medida que las personas pasan a estratos controlados, y solo en la fracción de hospitalizaciones sensibles al cuidado ambulatorio.'],
      ['capas', 'La tensión ocurre en zonas y meses concretos', 'La capacidad suele planearse por sede y por año. La saturación aparece en una zona específica, como consulta externa o admisión, y en los meses de mayor demanda estacional; un promedio anual por sede la oculta.'],
      ['canales', 'Los canales alternos se dimensionan aparte', 'La atención domiciliaria y la virtual pueden absorber parte de los controles. Su efecto depende del estrato clínico de cada persona y de cuántas atenciones virtuales terminan regresando a consulta presencial, por lo que deben dimensionarse con la cohorte y no con promedios de la sede.'],
    ];
    const wL = 6.0;
    texto(s, 'POR QUÉ OCURRE', { x: M, y: Y0 + 0.02, w: wL, h: 0.22, fontSize: 8.5, bold: true, color: C.accent1, charSpacing: 0.5, nombre: 'etiqueta' });
    let y = Y0 + 0.32;
    for (const [ic, t, d] of tensiones) {
      const hD = alto(d, wL - 1.1, 9.5);
      const hT = 0.5 + hD + 0.15;
      tarjeta(s, { x: M, y, w: wL, h: hT, nombre: 'tension' });
      icono(s, ic, M + 0.18, y + 0.18, 0.48, { color: C.accent1, transparency: 88 });
      texto(s, t, { x: M + 0.85, y: y + 0.15, w: wL - 1.05, h: 0.28, fontSize: 11, bold: true, nombre: 'tension-titulo' });
      texto(s, d, { x: M + 0.85, y: y + 0.46, w: wL - 1.05, h: hD, fontSize: 9.5, color: C.text2, nombre: 'tension-texto' });
      y += hT + 0.15;
    }
    const x2 = M + wL + 0.4;
    const w2 = W - M - x2;
    texto(s, 'HALLAZGOS PRINCIPALES EN LA RED DE DEMOSTRACIÓN', { x: x2, y: Y0 + 0.02, w: w2, h: 0.22, fontSize: 8.5, bold: true, color: C.accent2, charSpacing: 0.5, nombre: 'etiqueta' });
    const hallazgos = [
      ['Ampliar la cobertura sin ajustar la red empeora el acceso', 'El aumento de controles llega antes que cualquier alivio clínico y se concentra en consulta externa, por lo que las sedes más cargadas tardan más en asignar citas.'],
      ['El beneficio clínico es real y gradual', 'Las personas avanzan hacia estratos controlados mes a mes; en un año, las hospitalizaciones evitadas son pocas frente al aumento de controles, y el efecto crece en horizontes más largos.'],
      ['La saturación se concentra y permite actuar de forma focalizada', 'Pocas zonas en pocos meses explican casi toda la tensión de la red; una sede concentra la mayor parte del problema.'],
      ['Los canales alternos devuelven el acceso', 'La atención domiciliaria y la virtual, dimensionadas por estrato y acompañadas de recordatorios, liberan suficiente capacidad presencial para eliminar la saturación en toda la red.'],
      ['Ese alivio tiene un costo que debe decidirse', 'Los canales requieren equipos domiciliarios y médicos virtuales adicionales; su costo debe compararse con el valor del acceso oportuno y con la UPC.'],
    ];
    let yh = Y0 + 0.32;
    hallazgos.forEach(([t, d], i) => {
      const hD = alto(d, w2 - 0.6, 9.5);
      insignia(s, i + 1, x2, yh + 0.02, HEX.teal, 0.32);
      texto(s, t, { x: x2 + 0.5, y: yh, w: w2 - 0.5, h: 0.26, fontSize: 11, bold: true, nombre: 'hallazgo-titulo' });
      texto(s, d, { x: x2 + 0.5, y: yh + 0.28, w: w2 - 0.5, h: hD, fontSize: 9.5, color: C.text2, nombre: 'hallazgo-texto' });
      yh += 0.28 + hD + 0.16;
    });
    texto(s, 'Hallazgos obtenidos con datos sintéticos de una red de cuatro sedes. Describen el mecanismo; su magnitud se confirma en la fase de calibración con datos de SURA.', { x: x2, y: Math.min(yh + 0.02, YF - 0.35), w: w2, h: 0.35, fontSize: 8.5, italic: true, color: C.text2, nombre: 'nota-hallazgos' });
    s.addNotes('La tensión central es temporal y espacial. Una ampliación de cobertura genera primero más controles programados y, solo después, menos hospitalizaciones evitables. Si la red no se ajusta, la consulta externa absorbe ese aumento y la oportunidad de cita empeora. Las cifras de respaldo están en la lámina de Escenarios: en la red sintética, la ampliación sin canales empeora la oportunidad de cita en el peor caso del año, y con canales desaparece la saturación a cambio de seis equipos domiciliarios y un mayor costo de atención.');
  }

  // ===== 3. Mecanismo =====
  {
    const s = nuevaDiapositiva('Contexto');
    s.addText('Un modelo poblacional y un modelo de capacidad conectados traducen el riesgo de cada cohorte en demanda por sede, zona y mes', { placeholder: 'title' });
    s.addText('Cada etapa produce una salida que consume la siguiente; la decisión vuelve al modelo como cambio de cobertura, canal o capacidad.', { placeholder: 'body' });
    const etapas = [
      ['base', 'Agregados federados', C.accent1, 'Cada Data Partner ejecuta la consulta sobre su propio OMOP CDM y devuelve conteos de personas por celda territorial, cohorte y combinación de condiciones. Los conteos menores a 11 se suprimen, de modo que ningún dato individual sale de la fuente.', 'Población en riesgo por celda'],
      ['usuarios', 'Estratos y transiciones', C.accent4, 'Cada cohorte se divide en cuatro estratos clínicos. Una cadena de Markov mensual mueve a las personas entre estratos y la cobertura del programa cambia esas probabilidades. Se repite 200 veces con parámetros inciertos para obtener rangos.', 'Composición por estrato y mes, con banda P10–P90'],
      ['actividad', 'Demanda por zona y canal', C.accent4, 'Cada estrato tiene tasas de uso por tipo de atención: controles, consultas no programadas, urgencias, hospitalizaciones, laboratorio y procedimientos. Las atenciones se asignan a zonas de la sede, a la red hospitalaria o a los canales domiciliario y virtual.', 'Atenciones por sede, zona, mes y canal'],
      ['cpu', 'Colas y backlog', C.accent3, 'En zonas sin cita se calcula la espera hora a hora con modelos de colas. En zonas con cita se simula día a día la acumulación de solicitudes pendientes, con inasistencia y sobreagenda, para estimar en cuántos días se asigna la cita.', 'Utilización, espera y oportunidad de cita'],
      ['objetivo', 'Decisiones', C.accent5, 'El usuario compara escenarios que combinan cobertura por cohorte, equipos domiciliarios, médicos virtuales y recordatorios, y observa su efecto en saturación, oportunidad de cita, hospitalizaciones evitables y costo.', 'Escenario recomendado y su costo'],
    ];
    const wE = 2.27;
    const gap = 0.245;
    const yE = Y0 + 0.05;
    const hE = 3.75;
    etapas.forEach(([ic, t, col, d, sal], i) => {
      const x = M + i * (wE + gap);
      tarjeta(s, { x, y: yE, w: wE, h: hE, fill: { color: 'FFFFFF' }, nombre: 'etapa' });
      icono(s, ic, x + 0.18, yE + 0.18, 0.48, { color: col });
      texto(s, String(i + 1).padStart(2, '0'), { x: x + wE - 0.6, y: yE + 0.2, w: 0.42, h: 0.4, fontSize: 16, bold: true, color: HEX.linea, align: 'right', nombre: 'etapa-num' });
      texto(s, t, { x: x + 0.18, y: yE + 0.72, w: wE - 0.36, h: 0.46, fontSize: 11.5, bold: true, valign: 'bottom', nombre: 'etapa-titulo' });
      texto(s, d, { x: x + 0.18, y: yE + 1.25, w: wE - 0.36, h: 1.75, fontSize: 9, color: C.text2, nombre: 'etapa-texto' });
      s.addShape(pres.shapes.LINE, { x: x + 0.18, y: yE + 3.0, w: wE - 0.36, h: 0, line: { color: HEX.linea, width: 0.75 }, objectName: nombre('separador') });
      texto(s, 'PRODUCE', { x: x + 0.18, y: yE + 3.07, w: 1.5, h: 0.18, fontSize: 7.5, bold: true, color: col, nombre: 'produce' });
      texto(s, sal, { x: x + 0.18, y: yE + 3.25, w: wE - 0.36, h: 0.45, fontSize: 9.5, bold: true, nombre: 'salida' });
      if (i < etapas.length - 1) s.addImage({ data: iconos.flecha, x: x + wE + 0.02, y: yE + 1.75, w: 0.2, h: 0.2, objectName: nombre('flecha') });
    });
    const yB = yE + hE + 0.2;
    const hB = YF - yB;
    tarjeta(s, { x: M, y: yB, w: ANCHO, h: hB, fill: { color: C.text1 }, line: { type: 'none' }, nombre: 'barra-madurez' });
    texto(s, 'NIVEL DE MADUREZ', { x: M + 0.3, y: yB + 0.15, w: 2.2, h: 0.2, fontSize: 8.5, bold: true, color: HEX.cian, nombre: 'madurez-etiqueta' });
    texto(s, 'La demostración opera como modelo digital: los parámetros son sintéticos y no hay flujo automático desde la operación. Llamarlo gemelo exige ingesta automática y cierre de ciclo.', { x: M + 0.3, y: yB + 0.38, w: 4.6, h: hB - 0.45, fontSize: 9.5, color: C.background1, nombre: 'madurez-actual' });
    const niveles = [['Modelo digital', 'Parámetros e históricos, sin conexión con la operación'], ['Sombra digital', 'Ingesta automática de agenda, zonas y equipos'], ['Gemelo digital', 'Calibración continua y cierre de ciclo trazable']];
    niveles.forEach(([t, d], i) => {
      const x = M + 5.25 + i * 2.4;
      const activo = i === 0;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: yB + 0.15, w: 2.25, h: hB - 0.3, rectRadius: 0.06, fill: activo ? { color: C.accent2 } : { color: 'FFFFFF', transparency: 90 }, line: { color: activo ? HEX.teal : '3A4560', width: 0.75 }, objectName: nombre('nivel') });
      texto(s, `${i + 1}. ${t}`, { x: x + 0.14, y: yB + 0.22, w: 2.0, h: 0.24, fontSize: 10, bold: true, color: C.background1, nombre: 'nivel-titulo' });
      texto(s, d, { x: x + 0.14, y: yB + 0.47, w: 2.0, h: hB - 0.65, fontSize: 8.5, color: activo ? 'FFFFFF' : 'B8C2D6', nombre: 'nivel-texto' });
    });
    s.addNotes('El mecanismo tiene cinco etapas. La primera respeta la frontera federada: AlejandrIA no ingiere datos; cada Data Partner ejecuta la consulta sobre su OMOP CDM y entrega agregados con supresión de celdas menores a 11. La segunda proyecta la composición clínica de cada cohorte mes a mes. La tercera convierte estratos en atenciones y las enruta a zonas y canales. La cuarta aplica modelos de colas y de backlog según el tipo de zona. La quinta compara escenarios. Usamos la escala de madurez de NASEM: hoy es un modelo digital.');
  }

  // ===== 4. Cómo leer los indicadores =====
  {
    const s = nuevaDiapositiva('Contexto');
    s.addText('Los indicadores del portal combinan medidas clínicas de cada cohorte y medidas de servicio de cada zona de la sede', { placeholder: 'title' });
    s.addText('Definiciones que se usan en todos los módulos y en el resto de esta presentación.', { placeholder: 'body' });
    const defs = [
      ['Escenario regular', 'Proyección de 2027 con la cobertura vigente del programa y sin canales alternos. Es la referencia contra la que se comparan los demás escenarios y no se puede editar.', C.accent1],
      ['Cobertura de gestión del riesgo', 'Proporción de personas de la cohorte inscritas en el programa con seguimiento activo. Al aumentar, más personas pasan a estratos controlados y se programan más controles.', C.accent1],
      ['Estrato clínico', 'Nivel de control y daño dentro de la cohorte; en hipertensión: controlada, no controlada, con daño de órgano blanco y alto riesgo. Cada estrato usa los servicios con distinta intensidad.', C.accent4],
      ['Hospitalizaciones CSCA', 'Hospitalizaciones por condiciones sensibles al cuidado ambulatorio, las que un buen control en atención primaria puede evitar. Son las únicas sobre las que el modelo aplica el efecto del programa.', C.accent4],
      ['Banda P10–P90', 'Rango que contiene el 80 % central de las 200 simulaciones. Expresa la incertidumbre de los parámetros; una banda ancha indica que el resultado depende de supuestos por calibrar.', C.accent4],
      ['Utilización', 'Demanda de la zona dividida por su capacidad en el día. Por encima de 100 % la demanda supera lo que la zona puede atender y las solicitudes se acumulan para días siguientes.', C.accent3],
      ['Oportunidad de cita P50 y P90', 'Días entre la solicitud y la cita asignada. P50 es el valor que no supera la mitad de los pacientes; P90, el que no supera el 90 %, y por eso refleja a quienes más esperan. La referencia para medicina general es de 3 días hábiles.', C.accent3],
      ['Espera mayor que la meta', 'En zonas sin cita (admisión, prioritaria y laboratorio), proporción de pacientes que espera más que la meta de la zona en la hora de mayor demanda.', C.accent3],
      ['Estado de la zona', 'Holgada, tensionada o saturada. Con cita: saturada si el P90 supera 1,5 veces la meta o la utilización llega a 100 %. Sin cita: saturada si la cola es inestable o la espera excede el doble del máximo. Domicilio y virtual: tensionada desde 80 % y saturada desde 95 %.', C.accent6],
      ['Mes crítico y meses-sede', 'El mes crítico es el de peor estado de la sede en el año. Con cuatro sedes y doce meses hay 48 combinaciones; los meses-sede saturados cuentan en cuántas de ellas alguna zona queda saturada.', C.accent6],
    ];
    const wc = (ANCHO - 0.3) / 2;
    const filas = 5;
    const hc = (YF - Y0 - 0.02 - (filas - 1) * 0.12) / filas;
    defs.forEach(([t, d, col], i) => {
      const x = M + Math.floor(i / filas) * (wc + 0.3);
      const y = Y0 + 0.02 + (i % filas) * (hc + 0.12);
      tarjeta(s, { x, y, w: wc, h: hc, nombre: 'definicion' });
      s.addShape(pres.shapes.OVAL, { x: x + 0.18, y: y + 0.19, w: 0.14, h: 0.14, fill: { color: col }, line: { type: 'none' }, objectName: nombre('marca') });
      texto(s, t, { x: x + 0.42, y: y + 0.12, w: 2.0, h: hc - 0.2, fontSize: 10.5, bold: true, nombre: 'definicion-termino' });
      texto(s, d, { x: x + 2.5, y: y + 0.12, w: wc - 2.68, h: hc - 0.2, fontSize: 9, color: C.text1, nombre: 'definicion-texto' });
    });
    s.addNotes('Esta lámina responde a la pregunta de qué significa cada número del portal. El indicador más importante para la conversación con PHM es la oportunidad de cita P90: cuántos días espera el 10 % de pacientes que más espera para obtener una cita de medicina general. El estado de cada zona combina ese indicador con la utilización, y los colores verde, ámbar y rojo del portal corresponden a holgada, tensionada y saturada.');
  }

  // ===== 5. Mapa del portal =====
  pres.addSection({ title: 'Portal' });
  {
    const s = nuevaDiapositiva('Portal');
    s.addText('El portal organiza el trabajo en seis módulos, desde el estado de la red hasta la configuración del modelo', { placeholder: 'title' });
    s.addText('Todos los módulos comparten la barra superior de escenario, sede y mes; un cambio allí se refleja en todas las vistas.', { placeholder: 'body' });
    const mods = [
      ['panorama', 'Vista general', '¿Qué sedes y meses llegan a saturación en 2027?', 'Tarjetas por sede con su mes crítico, mapa de calor de sedes por meses y alertas priorizadas. Desde cualquier celda se abre la sede en ese mes.', 'Dirección de red y PHM'],
      ['cohortes', 'Cohortes', '¿Cómo cambia la composición clínica con la cobertura y cuánta demanda genera?', 'Composición por estrato, transiciones de enero a diciembre, proyección mensual de atenciones con banda de incertidumbre y combinaciones de condiciones.', 'Gestión del riesgo en salud'],
      ['territorio', 'Territorio', '¿Dónde se concentra la carga crónica y quién vive lejos de su sede?', 'Mapa de 111 hexágonos coloreado por prevalencia, alto riesgo, demanda o tiempo a la sede, con el detalle de cada celda y un resumen por sede.', 'Planeación territorial y atención domiciliaria'],
      ['sede', 'Sede', '¿Qué zona se satura, en qué mes y con qué indicador de servicio?', 'Modelo 3D de la sede con siete zonas, panel con el indicador de la zona elegida, utilización hora a hora y estado simulado de equipos.', 'Coordinación de sede'],
      ['escenarios', 'Escenarios', '¿Qué combinación de cobertura y canales mejora el acceso y a qué costo?', 'Editor para crear variantes de cobertura por cohorte y activar canales, y tabla para comparar hasta cinco escenarios en toda la red.', 'Dirección de PHM y finanzas'],
      ['config', 'Configuración', '¿Con qué parámetros y fuentes trabaja el modelo y qué tan maduro es?', 'Catálogo editable de cohortes, sedes y zonas, contrato de datos de cada fuente y los indicadores que miden la salud del modelo.', 'Analítica y arquitectura'],
    ];
    const wc = (ANCHO - 2 * 0.3) / 3;
    const hc = 2.42;
    mods.forEach(([ic, t, q, v, u], i) => {
      const x = M + (i % 3) * (wc + 0.3);
      const y = Y0 + 0.02 + Math.floor(i / 3) * (hc + 0.2);
      tarjeta(s, { x, y, w: wc, h: hc, nombre: 'modulo' });
      icono(s, ic, x + 0.2, y + 0.18, 0.46, { color: 'FFFFFF' });
      texto(s, t, { x: x + 0.8, y: y + 0.26, w: wc - 1.0, h: 0.32, fontSize: 13.5, bold: true, nombre: 'modulo-nombre' });
      texto(s, q, { x: x + 0.2, y: y + 0.76, w: wc - 0.4, h: 0.5, fontSize: 10, bold: true, color: C.accent1, nombre: 'modulo-pregunta' });
      texto(s, v, { x: x + 0.2, y: y + 1.28, w: wc - 0.4, h: 0.72, fontSize: 9, color: C.text2, nombre: 'modulo-vista' });
      texto(s, [{ text: 'Usuario: ', options: { bold: true } }, { text: u }], { x: x + 0.2, y: y + 2.06, w: wc - 0.4, h: 0.24, fontSize: 9, color: C.text1, nombre: 'modulo-usuario' });
    });
    s.addNotes('El portal se presenta como producto: navegación lateral, barra de contexto con escenario, sede y mes, y selectores que crecen con el catálogo. Los seis módulos siguen el orden de una conversación de planeación: dónde está la tensión, qué la explica en la población, dónde ocurre en el territorio, cómo se comporta dentro de la sede, qué escenario la resuelve y con qué supuestos trabaja el modelo.');
  }

  // Plantilla de módulo: captura a la izquierda y lectura a la derecha.
  function modulo(seccion, titulo, lead, captura, tam, filas, notas, wImg) {
    const s = nuevaDiapositiva(seccion);
    s.addText(titulo, { placeholder: 'title' });
    s.addText(lead, { placeholder: 'body' });
    const { w } = imagen(s, captura, tam, M, Y0 + 0.06, wImg, YF - Y0 - 0.1);
    const x2 = M + w + 0.35;
    columnaLectura(s, x2, Y0 + 0.02, W - M - x2, filas);
    s.addNotes(notas);
    return s;
  }

  // ===== 6. Vista general =====
  modulo(
    'Portal',
    'Vista general identifica qué sedes y meses llegan a saturación y prioriza dónde intervenir',
    'Vista de entrada del portal, en el escenario regular y con Sede Norte seleccionada en la barra superior.',
    'r-panorama.png', TAM.panorama,
    [
      ['Propósito', 'Es la entrada del portal. Resume en una pantalla el estado de las cuatro sedes durante 2027 para el escenario elegido, de modo que la dirección de red sepa dónde mirar primero y en qué orden.', C.accent1],
      ['Qué muestra la captura', 'Sede Norte y Sede Sur aparecen saturadas en su mes crítico, septiembre. En Norte se saturan consulta externa y admisión; Centro y Occidente quedan tensionadas, con mayo como mes crítico. El mapa de calor muestra que Norte acumula siete meses con alguna zona saturada y Sur uno.', C.accent1],
      ['Componentes', 'Las tarjetas muestran, por sede, el mes crítico, la oportunidad de cita P90, la utilización de consulta externa y el número de zonas saturadas; la franja de colores representa sus siete zonas. El resumen de cohortes presenta personas, multimorbilidad, hospitalizaciones, urgencias y costo, y con otro escenario muestra la diferencia frente al regular. Las alertas priorizan zonas saturadas y eventos de equipos.', C.accent1],
      ['Cómo se lee', 'Cada celda del mapa de calor toma el estado de la zona más exigida de la sede en ese mes, y el número indica cuántas zonas están saturadas. Al seleccionar una celda, el portal abre el módulo Sede en ese mes.', C.accent1],
      ['Decisión que habilita', 'Qué sedes y meses requieren capacidad adicional, redistribución de agenda o desvío a canales alternos, y en qué orden atenderlos.', C.accent5],
    ],
    'Vista general abre el portal en el escenario seleccionado. Cada celda del mapa de calor lleva a la sede y al mes correspondientes. Con otro escenario activo, el resumen muestra diferencias frente al escenario regular. Las alertas mezclan saturación de zonas con eventos simulados de equipos, para mostrar cómo convivirían la planeación y la operación.',
    6.6,
  );

  // ===== 7. Cohortes =====
  {
    const s = nuevaDiapositiva('Portal');
    s.addText('Cohortes proyecta cómo cambian los estratos clínicos con la cobertura y cuántas atenciones genera ese cambio', { placeholder: 'title' });
    s.addText(`Hipertensión arterial en la red completa: ${fmt(CO.hta.n)} personas; cobertura vigente de ${pct(CO.hta.cobVig)} frente a ${pct(CO.hta.cobAmp)} en la gestión ampliada.`, { placeholder: 'body' });
    const wImg = 5.5;
    const a = imagen(s, 'cohortes-composicion.png', TAM.comp, M, Y0 + 0.06, wImg, 3);
    const yP = Y0 + 0.06 + a.h + 0.12;
    const b = imagen(s, 'cohortes-proyeccion.png', TAM.proy, M, yP, wImg, 2);
    const yNota = yP + b.h + 0.15;
    texto(s, [
      { text: 'Por qué los efectos son moderados en un año. ', options: { bold: true } },
      { text: 'El control mejora de forma gradual y el programa solo actúa sobre la fracción de hospitalizaciones sensibles al cuidado ambulatorio; el resto depende de factores que la gestión del riesgo no modifica en 12 meses.' },
    ], { x: M, y: yNota, w: wImg, h: YF - yNota, fontSize: 9, color: C.text2, nombre: 'nota-cohortes' });

    const x2 = M + wImg + 0.35;
    const w2 = W - M - x2;
    let y = columnaLectura(s, x2, Y0 + 0.02, w2, [
      ['Propósito', 'Conecta la gestión del riesgo con la demanda de servicios: cuántas personas de cada cohorte cambian de estrato clínico durante 2027 y cuántas atenciones genera ese cambio, comparando el escenario regular con el elegido.', C.accent4],
      ['Qué muestra la captura', `Con la cobertura ampliada, la proporción controlada de hipertensión en diciembre pasa de ${pct(CO.hta.ctrlSQ)} en el escenario regular a ${pct(CO.hta.ctrlAmp)}. Los controles programados aumentan desde el primer mes, mientras las hospitalizaciones evitadas son pocas en el año.`, C.accent4],
      ['Las cuatro representaciones', 'La matriz de puntos muestra la composición por estrato; cada punto es un grupo de personas. El diagrama de flujo muestra de qué estrato parte cada grupo en enero y dónde termina en diciembre, incluida la salida de la cohorte. La proyección mensual compara atenciones con el escenario regular dentro de su banda de incertidumbre. El diagrama de intersecciones cuenta las personas con combinaciones de condiciones, como hipertensión con diabetes.', C.accent4],
    ], 9.5);
    texto(s, 'RESULTADO 2027 CON GESTIÓN AMPLIADA, POR COHORTE', { x: x2, y, w: w2, h: 0.2, fontSize: 8, bold: true, color: C.accent2, charSpacing: 0.5, nombre: 'etiqueta' });
    const filas = [[
      { text: 'Cohorte', options: { bold: true, color: C.text2 } },
      { text: 'Personas', options: { bold: true, color: C.text2, align: 'right' } },
      { text: 'Controlada en dic. (regular → ampliada)', options: { bold: true, color: C.text2, align: 'right' } },
      { text: 'Hosp. CSCA evitadas, P50 (P10–P90)', options: { bold: true, color: C.text2, align: 'right' } },
    ]];
    const corto = { hta: 'HTA', dm2: 'DM2', erc: 'ERC G3a–G4', epoc: 'EPOC', ic: 'IC' };
    for (const c of D.cohortes) filas.push([
      { text: corto[c.id] },
      { text: fmt(c.n), options: { align: 'right' } },
      { text: `${pct(c.ctrlSQ)} → ${pct(c.ctrlAmp)}`, options: { align: 'right' } },
      { text: `${fmt(c.hosp.p50, 1)} (${fmt(c.hosp.p10, 1)}–${fmt(c.hosp.p90, 1)})`, options: { align: 'right' } },
    ]);
    s.addTable(filas, { x: x2, y: y + 0.24, w: w2, colW: [1.05, 0.85, 2.1, w2 - 4.0], fontSize: 8.5, fontFace: 'Arial', color: C.text1, border: { type: 'solid', pt: 0.5, color: HEX.linea }, rowH: [0.38, 0.22, 0.22, 0.22, 0.22, 0.22], margin: [2, 4, 2, 4], valign: 'middle', objectName: 'tabla-cohortes' });
    if (y + 0.24 + 1.5 > YF + 0.05) console.warn('Desborde estimado en tabla de cohortes', (y + 1.74).toFixed(2));
    s.addNotes('El selector de cohorte se agrupa por ruta de atención y admite búsqueda, de modo que el catálogo puede crecer sin cambiar la interfaz. La comparación siempre se hace contra el escenario regular. Las hospitalizaciones evitadas son modestas en un año y la banda P10–P90 lo hace visible; esta lectura es coherente con la evidencia de programas de gestión de enfermedad crónica, cuyo efecto sobre hospitalización se acumula en horizontes más largos. El valor del módulo está en anticipar la demanda de controles que la ampliación genera.');
  }

  // ===== 8. Territorio =====
  modulo(
    'Portal',
    'Territorio ubica la carga crónica y las barreras de acceso para decidir dónde llevar atención domiciliaria',
    'Prevalencia de hipertensión arterial por celda, con los límites entre los territorios de las cuatro sedes.',
    'territorio-mapa.png', TAM.mapa,
    [
      ['Propósito', 'Lleva la demanda de las cohortes a una unidad territorial estable y comparable entre sedes, para decidir dónde llevar atención domiciliaria y dónde la distancia a la sede es una barrera de acceso.', C.accent2],
      ['Qué muestra la captura', 'Los tonos más oscuros, al norte y al oriente, concentran mayor proporción de adultos con hipertensión. Las líneas gruesas separan los territorios de cada sede. La tabla indica que Sede Sur tiene 15 % de su población en la cohorte a más de 30 minutos de la sede, mientras en Occidente ninguna celda supera ese tiempo.', C.accent2],
      ['Cómo se construye', 'La red se divide en 111 hexágonos y cada uno se asigna a la sede más cercana. Para cada celda se calculan adultos, personas por cohorte, proporción en alto riesgo, demanda proyectada y tiempo de viaje a la sede. El usuario elige qué métrica colorea el mapa y puede sombrear las celdas a más de 30 minutos.', C.accent2],
      ['Por qué hexágonos', 'Todas las celdas tienen la misma área y seis vecinas a igual distancia, lo que evita el sesgo visual de los límites administrativos y permite agregar sin exponer personas.', C.accent2],
      ['Decisión que habilita', 'Qué celdas priorizar para equipos domiciliarios, dónde reforzar la atención virtual por distancia y cómo ajustar los límites de responsabilidad entre sedes.', C.accent5],
    ],
    'El mapa usa una rampa secuencial de seis tonos y marca con línea gruesa los límites entre territorios de sede. La opción de sombrear celdas a más de 30 minutos permite discutir acceso y equidad. En producción, las celdas se construyen con un índice geoespacial jerárquico, como H3, y los conteos llegan agregados desde cada fuente con supresión de celdas pequeñas.',
    6.3,
  );

  // ===== 9. Sede =====
  {
    const s = nuevaDiapositiva('Portal');
    s.addText('Sede muestra en qué zona y en qué mes se satura la capacidad, con el indicador de servicio propio de cada zona', { placeholder: 'title' });
    s.addText('Sede Norte en septiembre, escenario regular, con consulta externa seleccionada en el modelo 3D.', { placeholder: 'body' });
    const wImg = 7.9;
    const r = imagen(s, 'sede-3d.png', TAM.sede3d, M, Y0 + 0.06, wImg, 3.3);
    const yL = Y0 + 0.06 + r.h + 0.2;
    tarjeta(s, { x: M, y: yL, w: r.w, h: YF - yL, fill: { color: C.accent3, transparency: 90 }, line: { type: 'none' }, nombre: 'lectura-sede' });
    texto(s, 'QUÉ MUESTRA LA CAPTURA', { x: M + 0.2, y: yL + 0.12, w: 3, h: 0.2, fontSize: 8, bold: true, color: C.accent3, charSpacing: 0.5, nombre: 'etiqueta' });
    texto(s, 'El render representa la sede con sus siete zonas; el color del piso indica el estado de cada zona en el mes y las etiquetas, su utilización. Fuera del edificio aparecen la red hospitalaria, la base de atención domiciliaria con sus vehículos, los hogares atendidos y el nodo de atención virtual. En septiembre, consulta externa recibe 371 atenciones por día frente a una capacidad de 370, y 84 de ellas provienen de las cohortes crónicas. Admisión opera al 99 % y laboratorio al 94 %; procedimientos y atención domiciliaria conservan holgura.', { x: M + 0.2, y: yL + 0.35, w: r.w - 0.4, h: YF - yL - 0.42, fontSize: 9.5, nombre: 'lectura-sede-texto' });
    const x2 = M + r.w + 0.35;
    const w2 = W - M - x2;
    const cards = [
      ['Zonas con cita', 'Consulta externa y procedimientos. El modelo simula día a día las solicitudes pendientes, con llegadas variables, inasistencia y sobreagenda. El indicador es la oportunidad de cita P50 y P90.', C.accent3],
      ['Zonas sin cita', 'Admisión, prioritaria y laboratorio. La espera se calcula hora a hora con un modelo de colas de varios servidores. El indicador es la proporción de pacientes que espera más que la meta en la hora pico.', C.accent3],
      ['Canales fuera de la sede', 'Equipos domiciliarios y médicos virtuales, evaluados por utilización con umbrales de 80 % y 95 %. Si la demanda supera la capacidad, el modelo calcula los equipos adicionales necesarios.', C.accent3],
      ['Interacción', 'El flujo de pacientes y el recorrido del año se activan solo a solicitud. Cada punto equivale a cuatro atenciones por día. El estado de los equipos es simulado y anticipa la integración con ingeniería biomédica.', C.accent5],
    ];
    const hC = (YF - Y0 - 0.02 - 3 * 0.12) / 4;
    cards.forEach(([t, d, col], i) => {
      const y = Y0 + 0.02 + i * (hC + 0.12);
      tarjeta(s, { x: x2, y, w: w2, h: hC, nombre: 'tarjeta-sede' });
      texto(s, t, { x: x2 + 0.18, y: y + 0.1, w: w2 - 0.36, h: 0.24, fontSize: 10.5, bold: true, color: col, nombre: 'tarjeta-sede-titulo' });
      texto(s, d, { x: x2 + 0.18, y: y + 0.36, w: w2 - 0.36, h: hC - 0.42, fontSize: 9, color: C.text1, nombre: 'tarjeta-sede-texto' });
    });
    s.addNotes('El render 3D es una representación esquemática de la sede: cada zona se colorea según su estado y al seleccionarla se abre el panel con su indicador. La animación de pacientes está detenida por defecto y se activa con "Reproducir flujo". El recorrido de 2027 permite ver la estacionalidad mes a mes. La meta de oportunidad de consulta externa toma como referencia la Resolución 1552 de 2013; las metas de espera de las zonas sin cita son supuestos que SURA debe fijar.');
  }

  // ===== 10. Escenarios =====
  {
    const s = nuevaDiapositiva('Portal');
    s.addText('La cobertura ampliada mejora el acceso cuando se acompaña de canales domiciliario y virtual, y ese efecto tiene un costo visible', { placeholder: 'title' });
    s.addText('Escenarios crea variantes de cobertura y canales y las compara contra el escenario regular en toda la red.', { placeholder: 'body' });
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const series = ['sq', 'ampliada', 'canales', 'caida'].map((id) => ({ name: E[id].nombre, labels: meses, values: E[id].norteConsulta.map((v) => Math.min(v, 100) / 100) }));
    const wG = 5.7;
    texto(s, 'Utilización de consulta externa en Sede Norte, 2027', { x: M, y: Y0 + 0.02, w: wG, h: 0.26, fontSize: 10.5, bold: true, nombre: 'grafico-titulo' });
    s.addChart(pres.charts.LINE, series, {
      x: M, y: Y0 + 0.28, w: wG, h: 2.7,
      chartColors: [HEX.gris, HEX.azul, HEX.teal, HEX.rojo],
      lineSize: 2, lineDataSymbol: 'none',
      valAxisMinVal: 0.7, valAxisMaxVal: 1.0, valAxisMajorUnit: 0.1, valAxisLabelFormatCode: '0%',
      valAxisLabelColor: '4A5568', catAxisLabelColor: '4A5568', valAxisLabelFontSize: 8, catAxisLabelFontSize: 8,
      valAxisLabelFontFace: '+mn-lt', catAxisLabelFontFace: '+mn-lt',
      valGridLine: { color: 'E3E8EF', size: 0.5 }, catGridLine: { style: 'none' },
      showLegend: true, legendPos: 'b', legendFontSize: 8, legendFontFace: '+mn-lt', legendColor: '4A5568',
      objectName: 'grafico-utilizacion-norte',
    });
    texto(s, 'LOS CUATRO ESCENARIOS DE REFERENCIA', { x: M, y: Y0 + 3.08, w: wG, h: 0.2, fontSize: 8, bold: true, color: C.accent1, charSpacing: 0.5, nombre: 'etiqueta' });
    const defsE = [
      ['Regular. ', 'Cobertura vigente de cada cohorte, sin canales alternos. Es la referencia y no se edita.'],
      ['Gestión del riesgo ampliada. ', '25 puntos más de cobertura en cada cohorte, con la misma red.'],
      ['Gestión ampliada con canales. ', 'La misma cobertura más atención domiciliaria por estrato, dos médicos virtuales adicionales por sede y recordatorios de cita.'],
      ['Caída de la gestión. ', '20 puntos menos de cobertura, para medir el riesgo de debilitar el programa.'],
    ];
    texto(s, defsE.flatMap(([a, b], k) => [{ text: a, options: { bold: true } }, { text: b, options: { breakLine: k < defsE.length - 1 } }]), { x: M, y: Y0 + 3.32, w: wG, h: YF - Y0 - 3.32, fontSize: 9, paraSpaceAfter: 4, nombre: 'definicion-escenarios' });

    const x2 = M + wG + 0.4;
    const w2 = W - M - x2;
    texto(s, 'COMPARACIÓN EN LA RED, 2027', { x: x2, y: Y0 + 0.02, w: w2, h: 0.2, fontSize: 8, bold: true, color: C.accent1, charSpacing: 0.5, nombre: 'etiqueta' });
    const cab = (t) => ({ text: t, options: { bold: true, color: C.text2, align: 'right', valign: 'bottom' } });
    const sg = (v, d = 0) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), d);
    const ids = ['sq', 'ampliada', 'canales', 'caida'];
    const filasT = [
      [{ text: 'Indicador', options: { bold: true, color: C.text2, valign: 'bottom' } }, cab('Regular'), cab('Gestión ampliada'), cab('Ampliada con canales'), cab('Caída de la gestión')],
      ['Hospitalizaciones CSCA evitadas', ...ids.map((id) => sg(E[id].hosp))],
      ['Urgencias evitadas', ...ids.map((id) => sg(E[id].urg))],
      ['Costo frente al regular (M COP)', ...ids.map((id) => sg(E[id].costo / 1e6))],
      ['Meses-sede con saturación', ...ids.map((id) => `${E[id].mesesSat} de 48`)],
      ['Oportunidad de cita P90, peor mes', ...ids.map((id) => `${fmt(E[id].opMax, 1)} días`)],
      ['Visitas domiciliarias', ...ids.map((id) => fmt(E[id].dom))],
      ['Atenciones virtuales', ...ids.map((id) => fmt(E[id].vir))],
      ['Equipos domiciliarios adicionales', ...ids.map((id) => fmt(E[id].equipos))],
    ].map((f, i) => (i === 0 ? f : f.map((c, j) => (j === 0 ? { text: c } : { text: c, options: { align: 'right', bold: j === 3, color: j === 3 ? C.accent2 : C.text1 } }))));
    s.addTable(filasT, { x: x2, y: Y0 + 0.26, w: w2, colW: [2.05, 0.9, 0.98, 1.06, w2 - 4.99], fontSize: 8.5, fontFace: 'Arial', color: C.text1, border: { type: 'solid', pt: 0.5, color: HEX.linea }, rowH: [0.42, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27, 0.27], margin: [2, 5, 2, 5], valign: 'middle', objectName: 'tabla-escenarios' });
    const yN = Y0 + 0.26 + 0.42 + 8 * 0.27 + 0.2;
    const hN = Math.min(YF - yN, 1.75);
    tarjeta(s, { x: x2, y: yN, w: w2, h: hN, fill: { color: C.accent2, transparency: 90 }, line: { type: 'none' }, nombre: 'lectura-escenarios' });
    texto(s, [
      { text: 'Cómo leer la comparación. ', options: { bold: true, breakLine: false } },
      { text: `Ampliar 25 puntos la cobertura sin canales produce los mismos beneficios clínicos que la variante con canales, pero eleva la oportunidad de cita en el peor mes de ${fmt(E.sq.opMax, 1)} a ${fmt(E.ampliada.opMax, 1)} días y mantiene la saturación. Con atención domiciliaria, virtual y recordatorios, la utilización de consulta externa en Sede Norte baja entre 10 y 12 puntos y no queda ningún mes-sede saturado. El costo adicional corresponde a visitas domiciliarias y teleconsultas a tarifas sintéticas, y debe compararse con el valor del acceso oportuno.` },
    ], { x: x2 + 0.2, y: yN + 0.12, w: w2 - 0.4, h: hN - 0.2, fontSize: 9.5, valign: 'middle', nombre: 'lectura-texto' });
    s.addNotes('Los cuatro escenarios base son ilustrativos. El escenario regular está bloqueado; los demás se pueden duplicar y editar, y la cobertura de cada cohorte se ajusta con controles generados desde el catálogo. La comparación admite hasta cinco escenarios. La discusión con SURA debe incluir el costo frente a la UPC y el valor de la oportunidad de cita.');
  }

  // ===== 11. Configuración y madurez =====
  {
    const s = nuevaDiapositiva('Portal');
    s.addText('Configuración hace explícitos los parámetros, el contrato de datos y el nivel de madurez del modelo', { placeholder: 'title' });
    s.addText('El catálogo es editable; las fuentes y los indicadores de salud del modelo definen cuándo avanzar de nivel.', { placeholder: 'body' });
    const wImg = 6.7;
    const r = imagen(s, 'r-fuentes.png', TAM.fuentes, M, Y0 + 0.06, wImg, 2.2);
    columnaLectura(s, M, Y0 + 0.06 + r.h + 0.22, wImg, [
      ['Qué muestra la captura', 'El contrato de datos de cada fuente: mecanismo de integración, granularidad, frescura esperada y área responsable. En este entorno todas las fuentes son sintéticas; la tabla describe cómo se integrarían en producción.', C.accent3],
      ['Catálogo', 'Cohortes con sus estratos, matrices de transición, tasas de uso por estrato, estacionalidad y fracción CSCA; sedes con zonas, servidores, horarios, tiempos de servicio y metas. Agregar una cohorte la incorpora de inmediato a todos los selectores y escenarios.', C.accent3],
      ['Por qué importa', 'Los supuestos dejan de estar ocultos dentro del modelo: cada parámetro tiene responsable, fuente y versión, lo que permite auditarlos y recalibrarlos.', C.accent5],
    ], 9.5);
    const x2 = M + wImg + 0.4;
    const w2 = W - M - x2;
    texto(s, 'INDICADORES DE SALUD DEL MODELO', { x: x2, y: Y0 + 0.02, w: w2, h: 0.2, fontSize: 8, bold: true, color: C.accent4, charSpacing: 0.5, nombre: 'etiqueta' });
    const ind = [
      ['Fuentes dentro del SLA', '≥ 95 %', 'Los datos llegan a tiempo'],
      ['Cobertura de sensores', '≥ 90 % de equipos', 'El estado operativo es completo'],
      ['Error de calibración (WAPE mensual por zona)', '≤ 10–15 %', 'El modelo reproduce la demanda observada'],
      ['Cobertura de intervalos P10–P90', '75–85 %', 'La incertidumbre está bien estimada'],
      ['Deriva de entradas (PSI)', '< 0,2', 'La población no cambió respecto de la calibración'],
      ['Latencia de extremo a extremo', 'Estado < 5 s; agenda < 15 min', 'El portal refleja la operación actual'],
      ['Cierre de ciclo', 'Recomendaciones con efecto observado', 'Las decisiones se ejecutan y se miden'],
    ];
    const filas = [[{ text: 'Indicador', options: { bold: true, color: C.text2 } }, { text: 'Meta', options: { bold: true, color: C.text2 } }, { text: 'Qué asegura', options: { bold: true, color: C.text2 } }], ...ind.map(([a, b, c]) => [{ text: a }, { text: b }, { text: c, options: { color: C.text2 } }])];
    s.addTable(filas, { x: x2, y: Y0 + 0.26, w: w2, colW: [1.85, 1.35, w2 - 3.2], fontSize: 8.5, fontFace: 'Arial', color: C.text1, border: { type: 'solid', pt: 0.5, color: HEX.linea }, rowH: 0.38, margin: [2, 4, 2, 4], valign: 'middle', objectName: 'tabla-salud' });
    const yL = Y0 + 0.26 + 8 * 0.38 + 0.22;
    columnaLectura(s, x2, yL, w2, [
      ['Criterio de avance entre niveles', 'De modelo a sombra digital: ingesta automática de agenda y estado de zonas dentro del SLA. De sombra a gemelo: error de calibración y cobertura de intervalos en meta durante tres meses, y recomendaciones con registro de aceptación y efecto.', C.accent4],
    ], 9.5);
    s.addNotes('Configuración es el módulo que diferencia una demostración de un producto operable. El contrato de datos fija mecanismo, granularidad, frescura y responsable de cada fuente; todas son sintéticas en este entorno. Los indicadores de salud del modelo permiten afirmar en qué nivel de madurez está la solución con evidencia, en lugar de declararlo.');
  }

  // ===== 12. Arquitectura =====
  pres.addSection({ title: 'Fundamentos' });
  {
    const s = nuevaDiapositiva('Fundamentos');
    s.addText('La arquitectura separa los datos clínicos federados de la telemetría operativa y respeta la frontera de AlejandrIA', { placeholder: 'title' });
    s.addText('Los datos de pacientes permanecen en cada Data Partner; el portal consume agregados y estados operativos sin información personal.', { placeholder: 'body' });
    const capas = [
      ['Experiencia', 'Portal de planeación con seis módulos, escenarios versionados y control de acceso por rol. Es la única capa que ven los usuarios de PHM, red y sedes.', C.accent1],
      ['Cierre de ciclo', 'Cada recomendación tiene responsable, registro de aceptación, ejecución y efecto observado. Ese registro alimenta la calibración y permite medir si el modelo ayuda a decidir.', C.accent5],
      ['Modelos', 'Modelo poblacional (cadena de Markov mensual con simulación Monte Carlo) y modelo de capacidad (colas y backlog), con versión de parámetros e indicadores de salud.', C.accent4],
      ['Datos y contratos', 'Agregados federados con supresión de celdas menores a 11, contratos de datos por fuente y catálogo de cohortes y zonas con versión y responsable.', C.accent3],
      ['Integración', 'Consulta federada sobre OMOP CDM; eventos de agenda por FHIR R4 Subscriptions; estado de zonas y equipos en un espacio de nombres unificado sobre MQTT, sin datos de pacientes.', C.accent3],
      ['Fuentes en cada Data Partner', 'Historia clínica, agenda, admisión, laboratorio, despacho domiciliario, telemedicina y equipos biomédicos. Cada Data Partner es responsable de su ingesta y de la transformación FHIR → OMOP.', C.text1],
    ];
    const wL = 7.75;
    const hL = 0.72;
    const yCapa = (i) => Y0 + 0.02 + i * (hL + 0.08) + (i >= 4 ? 0.3 : 0);
    capas.forEach(([t, d, col], i) => {
      const y = yCapa(i);
      tarjeta(s, { x: M, y, w: wL, h: hL, fill: { color: col, transparency: i === 5 ? 92 : 88 }, line: { type: 'none' }, nombre: 'capa' });
      texto(s, t, { x: M + 0.2, y, w: 1.85, h: hL, fontSize: 10.5, bold: true, color: col, valign: 'middle', nombre: 'capa-nombre' });
      texto(s, d, { x: M + 2.1, y, w: wL - 2.3, h: hL, fontSize: 9, color: C.text1, valign: 'middle', nombre: 'capa-texto' });
    });
    const yF = yCapa(4) - 0.19;
    s.addShape(pres.shapes.LINE, { x: M, y: yF, w: wL, h: 0, line: { color: HEX.rojo, width: 1.25, dashType: 'dash' }, objectName: 'frontera-federada' });
    s.addShape(pres.shapes.RECTANGLE, { x: M + 1.6, y: yF - 0.12, w: 4.55, h: 0.24, fill: { color: 'FFFFFF' }, line: { type: 'none' }, objectName: 'frontera-fondo' });
    texto(s, 'Frontera federada: hacia arriba solo circulan agregados y estados operativos', { x: M + 1.6, y: yF - 0.12, w: 4.55, h: 0.24, fontSize: 8.5, bold: true, color: C.accent6, align: 'center', valign: 'middle', nombre: 'frontera-texto' });

    const x2 = M + wL + 0.4;
    const w2 = W - M - x2;
    texto(s, 'REFERENTES POR CAPACIDAD', { x: x2, y: Y0 + 0.02, w: w2, h: 0.2, fontSize: 8, bold: true, color: C.accent2, charSpacing: 0.5, nombre: 'etiqueta' });
    const refs = [
      ['Centro de comando de capacidad', 'Johns Hopkins Hospital con GE HealthCare (2016): visión unificada de camas, flujo y alertas para decidir en tiempo real.'],
      ['Gemelo operativo hospitalario', 'Tampa General Hospital, CareComm: centro de comando que integra datos operativos y modelos predictivos de demanda.'],
      ['Red federada OMOP', 'EHDEN y OHDSI: 187 Data Partners en 29 países ejecutan análisis sin mover datos de pacientes.'],
      ['Seguridad de equipos conectados', 'Hospital Sírio-Libanês con NTT DATA y Claroty: inventario y monitoreo de dispositivos médicos y OT.'],
      ['Operación física (fase posterior)', 'Robots de logística clínica, como Moxi de Diligent Robotics, para tareas de transporte dentro de la sede.'],
    ];
    let y = Y0 + 0.32;
    for (const [t, d] of refs) {
      icono(s, 'check', x2, y + 0.02, 0.26);
      texto(s, t, { x: x2 + 0.36, y, w: w2 - 0.36, h: 0.24, fontSize: 10, bold: true, nombre: 'referente-titulo' });
      texto(s, d, { x: x2 + 0.36, y: y + 0.25, w: w2 - 0.36, h: 0.62, fontSize: 9, color: C.text2, nombre: 'referente-texto' });
      y += 0.98;
    }
    s.addNotes('La línea roja marca la frontera federada. AlejandrIA no ingiere datos: cada Data Partner es responsable de su ingesta y de la transformación de FHIR a OMOP, y solo publica agregados con supresión. La telemetría operativa viaja por un espacio de nombres unificado sobre MQTT y no contiene datos de pacientes. Los referentes muestran que cada capacidad tiene precedentes en operación; la robótica de logística clínica se plantea para una fase posterior.');
  }

  // ===== 13. Supuestos y fuentes =====
  {
    const s = nuevaDiapositiva('Fundamentos');
    s.addText('Los parámetros sintéticos se apoyan en evidencia publicada y cada uno tiene una fuente de calibración definida en SURA', { placeholder: 'title' });
    s.addText('La demostración usa valores plausibles; la fase de calibración los reemplaza por datos agregados de la población de SURA.', { placeholder: 'body' });
    const cab = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text1 }, valign: 'middle' } });
    const filas = [
      [cab('Parámetro'), cab('Para qué sirve en el modelo'), cab('Valor en la demostración'), cab('Base de evidencia'), cab('Calibración en SURA')],
      ['Prevalencia por cohorte', 'Define cuántas personas tiene cada cohorte en cada celda', `HTA ${fmt((CO.hta.n / D.adultos) * 100, 1)} %, DM2 ${fmt((CO.dm2.n / D.adultos) * 100, 1)} %, ERC G3a–G4 y EPOC ${fmt((CO.erc.n / D.adultos) * 100, 1)} %, IC ${fmt((CO.ic.n / D.adultos) * 100, 1)} % de adultos; 18 perfiles de multimorbilidad`, 'Cuenta de Alto Costo, Encuesta Nacional de Salud, PREPOCOL', 'Cohortes y registros CAC de EPS SURA'],
      ['Estratos y transiciones', 'Mueve a las personas entre niveles de control mes a mes', 'Cuatro estratos por cohorte con criterios KDIGO, GOLD y NYHA; matrices anuales con y sin gestión', 'Historia natural publicada y juicio clínico experto', 'Trayectorias observadas en OMOP, 12 a 24 meses'],
      ['Efecto de la gestión del riesgo', 'Reduce el uso de servicios dentro de cada estrato', 'Efecto residual por estrato con distribución PERT', 'Kruis 2013, Lenferink 2017, McAlister 2004, Tricco 2012', 'Cohortes con y sin programa, ajustadas por riesgo'],
      ['Fracción CSCA', 'Limita qué hospitalizaciones puede evitar el programa', '25 % a 55 % según cohorte', 'AHRQ Prevention Quality Indicators', 'Egresos por diagnóstico principal'],
      ['Desvío a canal virtual y retorno', 'Decide qué atenciones salen de la sede y cuántas regresan', 'Proporción por tipo de atención con retorno a consulta presencial', 'Inglis 2015, Tucker 2017, Janjua 2021', 'Registros de teleconsulta y desenlace'],
      ['Colas y backlog', 'Convierte demanda en espera y oportunidad de cita', 'Erlang C con ajuste de Allen-Cunneen; backlog diario con 120 réplicas', 'Teoría de colas para servicios de salud', 'Agenda, admisión y tiempos de servicio'],
      ['Inasistencia y sobreagenda', 'Ajusta la capacidad efectiva de las zonas con cita', '14 % a 18 % por sede; recordatorios restan 4 puntos', 'Supuesto sintético', 'Agenda por sede y franja'],
      ['Metas de servicio', 'Definen cuándo una zona está tensionada o saturada', 'Oportunidad de 3 días para consulta externa; esperas por zona', 'Resolución 1552 de 2013; metas de zona supuestas', 'Definición de SURA por zona'],
      ['Calendario y costos', 'Fijan días operativos y valor de cada atención', '2027 con 18 festivos y sábado de media jornada; costos unitarios sintéticos', 'Calendario oficial de Colombia', 'Tarifas, UPC y costos por canal'],
    ].map((f, i) => (i === 0 ? f : f.map((c, j) => ({ text: c, options: { bold: j === 0, color: j === 3 ? C.accent4 : j === 1 ? C.text2 : C.text1 } }))));
    s.addTable(filas, { x: M, y: Y0 + 0.02, w: ANCHO, colW: [1.95, 2.45, 3.15, 2.45, ANCHO - 10.0], fontSize: 8.5, fontFace: 'Arial', color: C.text1, border: { type: 'solid', pt: 0.5, color: HEX.linea }, rowH: [0.32, 0.5, 0.48, 0.42, 0.36, 0.42, 0.42, 0.36, 0.42, 0.42], margin: [3, 5, 3, 5], valign: 'middle', objectName: 'tabla-supuestos' });
    texto(s, 'Kruis et al., Cochrane 2013 (EPOC); Lenferink et al., Cochrane 2017 (autogestión en EPOC); McAlister et al., JACC 2004 (IC); Tricco et al., Lancet 2012 (DM2); Inglis et al., Cochrane 2015 (telemonitoreo en IC); Tucker et al., PLoS Med 2017 (automonitoreo de presión arterial); Janjua et al., Cochrane 2021 (telemonitoreo en EPOC).', { x: M, y: 6.5, w: ANCHO, h: 0.35, fontSize: 7.5, color: C.text2, nombre: 'referencias' });
    s.addNotes('Esta tabla responde a la pregunta de dónde salen los números. Ningún parámetro de la demostración proviene de datos de SURA. La columna de calibración define qué datos se solicitarían en la primera fase, siempre como agregados federados. Las metas de espera por zona y la inasistencia por sede son decisiones o datos de SURA y deben fijarse antes de interpretar resultados.');
  }

  // ===== 14. Hoja de ruta =====
  pres.addSection({ title: 'Ruta' });
  {
    const s = nuevaDiapositiva('Ruta');
    s.addText('La hoja de ruta lleva el modelo a sombra digital en dos sedes y a gemelo con cierre de ciclo en el Release 1.0', { placeholder: 'title' });
    s.addText('Cada fase termina con un criterio de avance medible; las duraciones son estimadas y se ajustan con el acceso a datos.', { placeholder: 'body' });
    const fases = [
      ['Fase 0 · 6 a 8 semanas', 'Calibración', C.accent1, ['Dos sedes y cinco cohortes priorizadas', 'Agregados federados por celda y mes', 'Parámetros de transición, tasas y zonas', 'Backtest de 12 meses por zona'], 'Los resultados del portal dejan de ser ilustrativos y reflejan la población y las sedes de SURA.', 'WAPE mensual por zona ≤ 15 %'],
      ['Fase 1 · 3 meses', 'Sombra digital', C.accent3, ['Eventos de agenda por FHIR Subscriptions', 'Estado de zonas en el espacio de nombres unificado', 'Actualización diaria del portal', 'Indicadores de salud del modelo'], 'El portal muestra cada día el estado real de las sedes y compara lo observado con lo proyectado.', 'Fuentes dentro del SLA ≥ 95 %'],
      ['Fase 2 · Release 1.0 · 3 a 4 meses', 'Gemelo de capacidad', C.accent2, ['Recomendaciones de equipos, agenda y canal', 'Registro de aceptación, ejecución y efecto', 'Cuatro sedes y escenarios versionados', 'Gobierno de parámetros por rol'], 'PHM y la red reciben recomendaciones con responsable y pueden medir el efecto de cada decisión.', 'Cierre de ciclo trazable en tres meses consecutivos'],
      ['Fase 3 · Posterior', 'Escala y operación física', C.accent4, ['Nuevas cohortes y rutas de atención', 'Equipos biomédicos conectados', 'Robótica de logística clínica', 'Otras regionales y prestadores'], 'El modelo se extiende a más rutas, sedes y prestadores, y a la operación física dentro de la sede.', 'Decisión según valor demostrado'],
    ];
    const wf = (ANCHO - 3 * 0.25) / 4;
    const yF = Y0 + 0.02;
    const hF = 4.1;
    fases.forEach(([f, t, col, items, cambio, crit], i) => {
      const x = M + i * (wf + 0.25);
      tarjeta(s, { x, y: yF, w: wf, h: hF, fill: { color: 'FFFFFF' }, nombre: 'fase' });
      insignia(s, String(i), x + 0.18, yF + 0.16, col, 0.34);
      texto(s, f.toUpperCase(), { x: x + 0.62, y: yF + 0.17, w: wf - 0.75, h: 0.32, fontSize: 7.5, bold: true, color: col, charSpacing: 0.3, valign: 'middle', nombre: 'fase-etiqueta' });
      texto(s, t, { x: x + 0.18, y: yF + 0.6, w: wf - 0.36, h: 0.3, fontSize: 12.5, bold: true, nombre: 'fase-titulo' });
      texto(s, items.map((it, k) => ({ text: it, options: { bullet: { indent: 11 }, breakLine: k < items.length - 1 } })), { x: x + 0.18, y: yF + 0.98, w: wf - 0.36, h: 1.25, fontSize: 9, paraSpaceAfter: 3, nombre: 'fase-entregables' });
      texto(s, 'QUÉ CAMBIA PARA PHM', { x: x + 0.18, y: yF + 2.3, w: wf - 0.36, h: 0.18, fontSize: 7.5, bold: true, color: col, nombre: 'cambio-etiqueta' });
      texto(s, cambio, { x: x + 0.18, y: yF + 2.5, w: wf - 0.36, h: 0.65, fontSize: 9, color: C.text2, nombre: 'cambio-texto' });
      tarjeta(s, { x: x + 0.12, y: yF + 3.2, w: wf - 0.24, h: 0.78, fill: { color: col, transparency: 88 }, line: { type: 'none' }, nombre: 'criterio' });
      texto(s, 'CRITERIO DE AVANCE', { x: x + 0.26, y: yF + 3.28, w: wf - 0.52, h: 0.18, fontSize: 7.5, bold: true, color: col, nombre: 'criterio-etiqueta' });
      texto(s, crit, { x: x + 0.26, y: yF + 3.48, w: wf - 0.52, h: 0.45, fontSize: 9.5, bold: true, nombre: 'criterio-texto' });
    });
    const yD = yF + hF + 0.18;
    tarjeta(s, { x: M, y: yD, w: ANCHO, h: YF - yD, fill: { color: C.background2 }, line: { type: 'none' }, nombre: 'dependencias' });
    texto(s, 'DEPENDENCIAS DE SURA', { x: M + 0.25, y: yD, w: 2.4, h: YF - yD, fontSize: 8.5, bold: true, color: C.accent5, charSpacing: 0.5, valign: 'middle', nombre: 'etiqueta' });
    const deps = ['Acuerdo con los Data Partners para consultas federadas y agregados por celda', 'Acceso a agenda y admisión por FHIR o extractos agregados por zona', 'Metas de servicio por zona y responsables del cierre de ciclo'];
    const wd = (ANCHO - 2.9) / 3;
    deps.forEach((d, i) => texto(s, d, { x: M + 2.7 + i * wd, y: yD, w: wd - 0.25, h: YF - yD, fontSize: 9.5, valign: 'middle', nombre: 'dependencia' }));
    s.addNotes('La ruta avanza por niveles de madurez. La fase 0 reemplaza los parámetros sintéticos y mide el error de calibración; la fase 1 conecta agenda y estado de zonas para que el modelo refleje la operación casi en tiempo real; el Release 1.0 agrega recomendaciones con registro de aceptación y efecto, que es lo que permite llamar gemelo a la solución. La extensión incorpora equipos conectados y robótica de logística clínica cuando el valor esté demostrado.');
  }

  // ===== 15. Próximo paso =====
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
      { text: 'El portal funciona con parámetros de SURA para dos sedes, con error de calibración medido por zona, ' },
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
