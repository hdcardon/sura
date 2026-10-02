// Convierte dist/index.html (documento completo) en el contenido de página que espera el publicador de artifacts:
// <title>, enlaces de fuentes, <style> y <script> en línea, sin doctype/html/head/body.
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync('dist/index.html', 'utf8');
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const links = [...html.matchAll(/<link[^>]+fonts\.(googleapis|gstatic)[^>]*>/g)].map((m) => m[0]).join('\n');
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join('\n');
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]).join('\n');
const out = `${title}\n${links}\n${styles}\n<div id="root"></div>\n${scripts}\n`;
writeFileSync('dist/gemelos-phm-sura.html', out);
console.log('inline ok', (out.length / 1024 / 1024).toFixed(2), 'MB');
