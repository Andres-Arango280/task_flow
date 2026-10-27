// Genera el informe combinado y el resumen de evidencias a partir de la ejecución REAL.
//  - Lee los JSON de mochawesome (cypress/reports/e2e/index.json y cypress/reports/component/index.json).
//  - "estado" y "obtenido" salen de esos resultados y de los registros que escribe cada prueba
//    con cy.registrarCaso (cypress/results/registros/<ID>.json). "objetivo" y "esperado" salen
//    del catálogo cypress/casos/catalogo.json (clave = id al inicio del título del it()).
//  - Copia informes, capturas, vídeos y evidencias de API a ../pruebas/evidencias/cypress/
//    y escribe allí resumen.json.
// Uso: node cypress/scripts/generar-resumen.mjs [duraciónTotalMs]
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const FRONT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CY = join(FRONT, 'cypress');
const DESTINO = join(FRONT, '..', 'pruebas', 'evidencias', 'cypress');
const ID = /^([A-Z]{3}-[A-Z]{3,4}-\d{2})\b/;

const leerJson = (ruta) => (existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : null);
const posix = (ruta) => ruta.split(sep).join('/');
const copiar = (origen, destino) => {
  mkdirSync(dirname(destino), { recursive: true });
  copyFileSync(origen, destino);
};
function archivos(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

// ---------- 1. Resultados de mochawesome ----------
const informes = [
  { tipo: 'e2e', json: join(CY, 'reports', 'e2e', 'index.json'), html: join(CY, 'reports', 'e2e', 'index.html') },
  { tipo: 'componentes', json: join(CY, 'reports', 'component', 'index.json'), html: join(CY, 'reports', 'component', 'index.html') },
].map((i) => ({ ...i, datos: leerJson(i.json) }));

if (!informes.some((i) => i.datos)) {
  console.error('No hay resultados de mochawesome. Ejecuta antes "npm run test:e2e" y/o "npm run test:component".');
  process.exit(1);
}

const pruebas = [];
for (const informe of informes.filter((i) => i.datos)) {
  for (const resultado of informe.datos.results) {
    const recorrer = (suite) => {
      for (const prueba of suite.tests ?? []) pruebas.push({ ...prueba, archivo: resultado.file ?? suite.file, tipoInforme: informe.tipo });
      (suite.suites ?? []).forEach(recorrer);
    };
    recorrer(resultado);
  }
}

// ---------- 2. Preparar la carpeta de evidencias ----------
rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO, { recursive: true });

for (const informe of informes.filter((i) => i.datos)) {
  if (existsSync(informe.html)) copiar(informe.html, join(DESTINO, 'informe', `informe-${informe.tipo}.html`));
  copiar(informe.json, join(DESTINO, 'resultados', `mochawesome-${informe.tipo}.json`));
}

// Informe combinado (e2e + componentes) con mochawesome-merge + mochawesome-report-generator
try {
  const { merge } = require('mochawesome-merge');
  const marge = require('mochawesome-report-generator');
  const combinado = await merge({ files: informes.filter((i) => i.datos).map((i) => posix(i.json)) });
  writeFileSync(join(DESTINO, 'resultados', 'mochawesome-combinado.json'), JSON.stringify(combinado, null, 2));
  await marge.create(combinado, {
    reportDir: join(DESTINO, 'informe'),
    reportFilename: 'informe-cypress',
    reportTitle: 'TaskFlow - Regresión, API y componentes (Cypress)',
    reportPageTitle: 'TaskFlow - Informe Cypress',
    inline: true,
    charts: true,
    code: true,
    saveJson: false,
  });
} catch (error) {
  console.warn('No se pudo generar el informe combinado:', error.message);
}

// Capturas: se copian todas, conservando la carpeta del spec
const capturas = archivos(join(CY, 'screenshots')).filter((r) => r.endsWith('.png'));
const capturasCopiadas = capturas.map((origen) => {
  const rel = posix(join('capturas', relative(join(CY, 'screenshots'), origen)));
  copiar(origen, join(DESTINO, rel));
  return rel;
});

// Vídeos: solo los de regresión UI (los de API no muestran interfaz)
const videosCopiados = new Map();
for (const origen of archivos(join(CY, 'videos')).filter((r) => r.endsWith('.mp4'))) {
  const spec = basename(origen, '.mp4');
  const esApi = posix(origen).includes('/api/') || posix(origen).includes('/seguridad/') || /^(auth|usuarios|equipos|proyectos-listas|tareas|validacion)\.cy\.ts$/.test(spec);
  if (esApi) continue;
  const rel = `videos/${basename(origen)}`;
  copiar(origen, join(DESTINO, rel));
  videosCopiados.set(spec, rel);
}

// ---------- 3. Casos documentados ----------
const catalogo = leerJson(join(CY, 'casos', 'catalogo.json')) ?? {};
const dirRegistros = join(CY, 'results', 'registros');
const primeraLinea = (texto = '') => texto.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 2).join(' ').slice(0, 450);

const casos = [];
const sinCatalogo = [];
for (const prueba of pruebas) {
  const id = prueba.title.match(ID)?.[1];
  if (!id) {
    sinCatalogo.push(prueba.title);
    continue;
  }
  const meta = catalogo[id];
  if (!meta) sinCatalogo.push(id);
  const registro = leerJson(join(dirRegistros, `${id}.json`));
  const aprobado = prueba.state === 'passed';

  let obtenido;
  if (aprobado) {
    obtenido = registro?.obtenido ?? `Se cumplieron todas las aserciones: ${meta?.esperado ?? ''}`.trim();
  } else if (prueba.state === 'failed') {
    const error = primeraLinea(prueba.err?.message);
    obtenido = registro?.obtenido ? `${registro.obtenido} Error de aserción: ${error}` : `Falló: ${error}`;
  } else {
    obtenido = 'No se ejecutó (omitida o falló un hook previo).';
  }

  const evidencia = [];
  // Evidencia de API: petición + respuesta reales
  if (registro?.respuesta) {
    const rel = `api/${id}.json`;
    copiar(join(dirRegistros, `${id}.json`), join(DESTINO, rel));
    evidencia.push(rel);
  }
  // Capturas del caso (cy.screenshot con prefijo ID o captura automática del fallo)
  evidencia.push(...capturasCopiadas.filter((rel) => basename(rel).startsWith(`${id}-`) || basename(rel).includes(` ${id} `)));
  const spec = basename(String(prueba.archivo ?? '').replace(/\\/g, '/'));
  if (videosCopiados.has(spec)) evidencia.push(videosCopiados.get(spec));
  evidencia.push(`informe/informe-${prueba.tipoInforme}.html`);

  casos.push({
    id,
    suite: meta?.suite ?? 'Sin catalogar',
    nombre: prueba.title.replace(ID, '').trim(),
    tipo: meta?.tipo ?? 'positivo',
    objetivo: meta?.objetivo ?? '',
    esperado: meta?.esperado ?? '',
    obtenido,
    estado: aprobado ? 'Aprobado' : 'Fallido',
    ...(meta?.observacion ? { observacion: meta.observacion } : {}),
    duracionMs: prueba.duration,
    archivo: posix(String(prueba.archivo ?? '')),
    evidencia,
  });
}

// Orden del catálogo
const orden = Object.keys(catalogo);
casos.sort((a, b) => (orden.indexOf(a.id) + 1 || 1e6) - (orden.indexOf(b.id) + 1 || 1e6));
const noEjecutados = orden.filter((id) => !casos.some((c) => c.id === id));

// ---------- 4. resumen.json ----------
const version = require('cypress/package.json').version;
// Duración de las pruebas según mochawesome; la duración total del comando (arranque de
// Cypress, compilación y vídeos incluidos) se añade aparte si ejecutar-todo.mjs la pasa
const duracionMs = informes.filter((i) => i.datos).reduce((total, i) => total + (i.datos.stats?.duration ?? 0), 0);
const duracionComandoMs = Number(process.argv[2]) || null;
const aprobados = casos.filter((c) => c.estado === 'Aprobado').length;

const resumen = {
  area: 'Regresión, API y componentes',
  herramienta: `Cypress ${version}`,
  comando: 'npm run test:cypress',
  fecha: new Date().toISOString(),
  totales: {
    total: casos.length,
    aprobados,
    fallidos: casos.length - aprobados,
    duracionSeg: Math.round(duracionMs / 100) / 10,
  },
  ...(duracionComandoMs ? { duracionComandoSeg: Math.round(duracionComandoMs / 1000) } : {}),
  baseEvidencias: 'Las rutas de "evidencia" son relativas a esta carpeta (pruebas/evidencias/cypress).',
  desglose: Object.fromEntries(
    [...new Set(casos.map((c) => c.suite))].map((suite) => {
      const deLaSuite = casos.filter((c) => c.suite === suite);
      return [suite, { total: deLaSuite.length, aprobados: deLaSuite.filter((c) => c.estado === 'Aprobado').length }];
    }),
  ),
  casos,
};
writeFileSync(join(DESTINO, 'resumen.json'), JSON.stringify(resumen, null, 2), 'utf8');

console.log(`\nResumen: ${resumen.totales.total} casos, ${aprobados} aprobados, ${resumen.totales.fallidos} fallidos (${resumen.totales.duracionSeg} s).`);
console.log(`Evidencias en: ${DESTINO}`);
if (sinCatalogo.length) console.warn('Pruebas sin entrada en el catálogo:', sinCatalogo.join(', '));
if (noEjecutados.length) console.warn('Casos del catálogo no ejecutados en esta corrida:', noEjecutados.join(', '));
