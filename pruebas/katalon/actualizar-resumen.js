#!/usr/bin/env node
// Actualiza pruebas/evidencias/katalon/resumen.json con los resultados REALES de una ejecución de Katalon Studio.
//
// Uso (desde la raíz del repositorio):
//   node pruebas/katalon/actualizar-resumen.js                      -> usa la ejecución más reciente de TaskFlow-Katalon/Reports
//   node pruebas/katalon/actualizar-resumen.js "<ruta>/JUnit_Report.xml"
//   node pruebas/katalon/actualizar-resumen.js "<carpeta de Reports/<fecha>>"   (suite o colección: lee todos sus JUnit_Report.xml)
//   node pruebas/katalon/actualizar-resumen.js --reiniciar          -> vuelve a dejar todos los casos como "Pendiente"
//
// Qué hace:
//   1. Lee los <testcase> del JUnit de Katalon (status PASSED / FAILED / ERROR / SKIPPED; las iteraciones
//      data-driven de TC05 aparecen como varios <testcase> con el mismo nombre).
//   2. Rellena "obtenido", "estado" y "evidencia" de cada caso (TC01..TC16) y recalcula los totales.
//   3. Copia las capturas (TaskFlow-Katalon/Reports/evidencias/TCxx_*.png y FALLO_*.png) a
//      pruebas/evidencias/katalon/capturas/ y el reporte (JUnit, HTML, CSV) a pruebas/evidencias/katalon/reporte/.
// No inventa resultados: si un caso no aparece en el JUnit, se queda como "Pendiente".
'use strict';
const fs = require('fs');
const path = require('path');

const DIR_KATALON = __dirname;
const PROYECTO = path.join(DIR_KATALON, 'TaskFlow-Katalon');
const DIR_EVIDENCIAS = path.join(DIR_KATALON, '..', 'evidencias', 'katalon');
const RESUMEN = path.join(DIR_EVIDENCIAS, 'resumen.json');
const DIR_CAPTURAS = path.join(DIR_EVIDENCIAS, 'capturas');
const DIR_REPORTE = path.join(DIR_EVIDENCIAS, 'reporte');
const PENDIENTE = 'Pendiente de ejecución en Katalon Studio';

const rel = (p) => path.relative(DIR_EVIDENCIAS, p).split(path.sep).join('/');

function desescapar(texto) {
  return String(texto)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function atributos(etiqueta) {
  const resultado = {};
  for (const [, nombre, valor] of etiqueta.matchAll(/([\w:-]+)="([^"]*)"/g)) resultado[nombre] = desescapar(valor);
  return resultado;
}

function buscarArchivos(dir, nombre, encontrados = []) {
  if (!fs.existsSync(dir)) return encontrados;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) buscarArchivos(ruta, nombre, encontrados);
    else if (entrada.name === nombre) encontrados.push(ruta);
  }
  return encontrados;
}

// Carpeta de ejecución más reciente: Reports/<yyyyMMdd_HHmmss>/...
function ejecucionMasReciente() {
  const reports = path.join(PROYECTO, 'Reports');
  if (!fs.existsSync(reports)) return null;
  const carpetas = fs
    .readdirSync(reports, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{8}_\d{6}$/.test(e.name))
    .map((e) => e.name)
    .sort();
  return carpetas.length ? path.join(reports, carpetas[carpetas.length - 1]) : null;
}

function leerJUnit(archivo) {
  const xml = fs.readFileSync(archivo, 'utf8');
  const suites = [...xml.matchAll(/<testsuite\s[^>]*>/g)].map((m) => atributos(m[0]));
  const casos = [];
  for (const m of xml.matchAll(/<testcase\s([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
    const a = atributos(m[1]);
    const cuerpo = m[3] || '';
    const fallo = cuerpo.match(/<(failure|error)\s([^>]*)>/);
    let estado = (a.status || '').toUpperCase();
    if (!estado) estado = fallo ? (fallo[1] === 'error' ? 'ERROR' : 'FAILED') : /<skipped/.test(cuerpo) ? 'SKIPPED' : 'PASSED';
    let mensaje = '';
    if (fallo) {
      const lineas = (atributos(fallo[0]).message || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      // La primera línea suele ser "<caso> FAILED."; la causa útil viene después
      mensaje = (lineas.find((l) => !/ FAILED\.$/.test(l) && !/^Reason:?$/i.test(l)) || lineas[0] || '').slice(0, 400);
    }
    casos.push({ nombre: a.name || '', segundos: Number(a.time || 0), estado, mensaje, archivo });
  }
  return { suites, casos };
}

function fechaInicio(suites, archivos) {
  const ts = suites.map((s) => s.timestamp).find(Boolean);
  if (ts) {
    const fecha = new Date(ts.replace(' ', 'T'));
    if (!Number.isNaN(fecha.getTime())) return fecha;
  }
  const m = archivos.map((a) => a.match(/(\d{8})_(\d{6})/)).find(Boolean);
  if (m) {
    const [, d, h] = m;
    return new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T${h.slice(0, 2)}:${h.slice(2, 4)}:${h.slice(4)}`);
  }
  return null;
}

function copiarCapturas(inicio) {
  const origen = path.join(PROYECTO, 'Reports', 'evidencias');
  const copiadas = [];
  if (!fs.existsSync(origen)) return copiadas;
  fs.mkdirSync(DIR_CAPTURAS, { recursive: true });
  const limite = inicio ? inicio.getTime() - 60 * 1000 : 0;
  for (const nombre of fs.readdirSync(origen)) {
    if (!/\.png$/i.test(nombre)) continue;
    const ruta = path.join(origen, nombre);
    if (fs.statSync(ruta).mtimeMs < limite) continue; // capturas de ejecuciones anteriores
    const destino = path.join(DIR_CAPTURAS, nombre);
    fs.copyFileSync(ruta, destino);
    copiadas.push(destino);
  }
  return copiadas;
}

function copiarReporte(archivosJUnit) {
  const copiados = [];
  fs.mkdirSync(DIR_REPORTE, { recursive: true });
  for (const junit of archivosJUnit) {
    const carpeta = path.dirname(junit);
    const suite = path.basename(path.dirname(carpeta)).replace(/[^\w.-]+/g, '_');
    for (const nombre of fs.readdirSync(carpeta)) {
      if (!/^(JUnit_Report\.xml|.*\.html|.*\.csv|.*\.pdf|execution0\.log)$/i.test(nombre)) continue;
      const destino = path.join(DIR_REPORTE, `${suite}__${nombre}`);
      fs.copyFileSync(path.join(carpeta, nombre), destino);
      copiados.push(destino);
    }
  }
  return copiados;
}

function reiniciar(resumen) {
  for (const caso of resumen.casos) Object.assign(caso, { obtenido: PENDIENTE, estado: 'Pendiente', evidencia: [] });
  delete resumen.ejecucion;
  resumen.fecha = new Date().toISOString();
  resumen.totales = { total: resumen.casos.length, aprobados: 0, fallidos: 0, pendientes: resumen.casos.length };
}

function main() {
  const resumen = JSON.parse(fs.readFileSync(RESUMEN, 'utf8'));
  const argumento = process.argv[2];

  if (argumento === '--reiniciar') {
    reiniciar(resumen);
    fs.writeFileSync(RESUMEN, JSON.stringify(resumen, null, 2) + '\n');
    console.log('resumen.json reiniciado: todos los casos quedan Pendientes.');
    return;
  }

  let objetivo = argumento ? path.resolve(argumento) : ejecucionMasReciente();
  if (!objetivo || !fs.existsSync(objetivo)) {
    console.error('No se encontró ningún reporte. Ejecuta antes una Test Suite en Katalon o indica la ruta de JUnit_Report.xml.');
    process.exit(1);
  }
  const archivosJUnit = fs.statSync(objetivo).isDirectory() ? buscarArchivos(objetivo, 'JUnit_Report.xml') : [objetivo];
  if (!archivosJUnit.length) {
    console.error(`No hay JUnit_Report.xml dentro de ${objetivo}`);
    process.exit(1);
  }

  const suites = [];
  const ejecutados = [];
  for (const archivo of archivosJUnit) {
    const leido = leerJUnit(archivo);
    suites.push(...leido.suites);
    ejecutados.push(...leido.casos);
  }
  const inicio = fechaInicio(suites, archivosJUnit);
  const capturas = copiarCapturas(inicio);
  const reporte = copiarReporte(archivosJUnit);

  reiniciar(resumen);
  for (const caso of resumen.casos) {
    const ejecuciones = ejecutados.filter((e) => new RegExp(`(^|/)${caso.id}_`).test(e.nombre));
    if (!ejecuciones.length) continue;
    const fallidas = ejecuciones.filter((e) => e.estado !== 'PASSED' && e.estado !== 'SKIPPED');
    const omitidas = ejecuciones.filter((e) => e.estado === 'SKIPPED');
    const segundos = ejecuciones.reduce((s, e) => s + e.segundos, 0).toFixed(1);
    const n = ejecuciones.length;
    const iter = n > 1 ? `${n} iteraciones (data-driven)` : '1 ejecución';
    if (fallidas.length) {
      caso.estado = 'Fallido';
      caso.obtenido = `Falló en ${fallidas.length} de ${n} ${n > 1 ? 'iteraciones' : 'ejecución'} (${segundos} s). Motivo: ${fallidas[0].mensaje || fallidas[0].estado}`;
    } else if (omitidas.length === n) {
      caso.estado = 'Pendiente';
      caso.obtenido = 'Omitido en la ejecución de Katalon (SKIPPED).';
    } else {
      caso.estado = 'Aprobado';
      caso.obtenido = `Correcto: se cumplió el resultado esperado; todas las esperas y verificaciones pasaron en ${iter} (${segundos} s en Katalon Studio).`;
    }
    const propias = capturas
      .filter((c) => path.basename(c).startsWith(caso.id + '_') || path.basename(c).startsWith('FALLO_' + caso.id + '_'))
      .sort();
    caso.evidencia = [...propias.map(rel), ...reporte.filter((r) => /JUnit_Report\.xml$|\.html$/i.test(r)).map(rel)];
  }

  const aprobados = resumen.casos.filter((c) => c.estado === 'Aprobado').length;
  const fallidos = resumen.casos.filter((c) => c.estado === 'Fallido').length;
  resumen.fecha = new Date().toISOString();
  resumen.totales = { total: resumen.casos.length, aprobados, fallidos, pendientes: resumen.casos.length - aprobados - fallidos };
  resumen.ejecucion = {
    reportes: archivosJUnit.map((a) => path.relative(path.join(DIR_KATALON, '..', '..'), a).split(path.sep).join('/')),
    suites: [...new Set(suites.map((s) => s.name).filter(Boolean))],
    inicio: inicio ? inicio.toISOString() : null,
    ejecucionesJUnit: ejecutados.length,
    capturasCopiadas: capturas.length,
  };
  fs.writeFileSync(RESUMEN, JSON.stringify(resumen, null, 2) + '\n');
  console.log(`resumen.json actualizado: ${aprobados} aprobados, ${fallidos} fallidos, ${resumen.totales.pendientes} pendientes.`);
  console.log(`Capturas copiadas: ${capturas.length} -> ${rel(DIR_CAPTURAS)}/ ; reporte -> ${rel(DIR_REPORTE)}/`);
}

main();
