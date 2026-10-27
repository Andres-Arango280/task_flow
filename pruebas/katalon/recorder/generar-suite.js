// Genera la suite HTML para Katalon Recorder (mismo formato que "Save Test Suite As…" de la extensión)
// y una tabla Markdown con objetivo y resultado esperado de cada caso.
// Uso: node pruebas/katalon/recorder/generar-suite.js
'use strict';
const fs = require('fs');
const path = require('path');
const { nombreSuite, casos } = require('./casos');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const tabla = (caso) => `<table cellpadding="1" cellspacing="1" border="1">
<thead>
<tr><td rowspan="1" colspan="3" data-tags="">${esc(caso.nombre)}</td></tr>
</thead>
<tbody>
${caso.comandos.map(([c, o, v]) => `<tr><td>${esc(c)}</td><td>${esc(o)}<datalist><option>${esc(o)}</option></datalist></td><td>${esc(v)}</td></tr>`).join('\n')}
</tbody></table>`;

const html = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
<meta content="text/html; charset=UTF-8" http-equiv="content-type" />
<title>${esc(nombreSuite)}</title>
</head>
<body>
${casos.map(tabla).join('\n')}
</body>
</html>`;

const destino = path.join(__dirname, 'TaskFlow-KatalonRecorder.html');
fs.writeFileSync(destino, html);

const md = [
  '| Caso | Camino | Tipo | Objetivo | Resultado esperado | Pasos |',
  '|---|---|---|---|---|---|',
  ...casos.map((c) => `| ${c.nombre} | ${c.camino} | ${c.tipo} | ${c.objetivo} | ${c.esperado} | ${c.comandos.length} |`),
].join('\n');
fs.writeFileSync(path.join(__dirname, 'casos.md'), md + '\n');
console.log(`Suite generada: ${destino} (${casos.length} casos, ${casos.reduce((s, c) => s + c.comandos.length, 0)} comandos)`);
