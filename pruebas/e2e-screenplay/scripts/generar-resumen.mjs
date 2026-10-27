// Genera pruebas/evidencias/screenplay/resumen.json a partir de los resultados REALES de la ejecución
// (reporter JSON de Playwright) y del catálogo de casos (objetivo/esperado por id), y copia las evidencias.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(raiz, '..', 'evidencias', 'screenplay');
const ficheroResultados = join(raiz, 'reportes', 'resultados-playwright.json');
const catalogo = JSON.parse(readFileSync(join(raiz, 'catalogo', 'casos.json'), 'utf8'));
const paquete = (nombre) => JSON.parse(readFileSync(join(raiz, 'node_modules', ...nombre.split('/'), 'package.json'), 'utf8')).version;

// Casos cuyo vídeo y traza se guardan siempre como evidencia (además de todos los fallidos)
const CASOS_CON_TRAZA = new Set(['SP-11', 'SP-16']);

if (!existsSync(ficheroResultados)) {
    console.error(`No existe ${ficheroResultados}. Ejecuta antes «npm test».`);
    process.exit(1);
}
const resultados = JSON.parse(readFileSync(ficheroResultados, 'utf8'));

rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });

const copiar = (origen, rutaRelativa) => {
    if (!origen || !existsSync(origen)) return null;
    const final = join(destino, rutaRelativa);
    mkdirSync(dirname(final), { recursive: true });
    cpSync(origen, final, { recursive: true });
    return rutaRelativa.replace(/\\/g, '/');
};

const recorrerSuites = (suite, ruta = []) => {
    const especificaciones = [];
    for (const spec of suite.specs ?? []) especificaciones.push({ spec, ruta: [...ruta, suite.title].filter(Boolean) });
    for (const hija of suite.suites ?? []) especificaciones.push(...recorrerSuites(hija, [...ruta, suite.title]));
    return especificaciones;
};

const pasosDeAsercion = (pasos = [], acumulado = []) => {
    for (const paso of pasos) {
        // Las comprobaciones internas de las tareas de preparación por API (arrange) no se cuentan como resultado del caso
        if (/ por API( |$)/.test(paso.title)) continue;
        if (/ ensures (that|eventually) /.test(paso.title)) acumulado.push(paso.title.replace(/^\S+ ensures (that|eventually) /, ''));
        pasosDeAsercion(paso.steps, acumulado);
    }
    return acumulado;
};

const pasoFallido = (pasos = []) => {
    for (const paso of pasos) {
        const interno = pasoFallido(paso.steps);
        if (interno) return interno;
        if (paso.error) return paso.title;
    }
    return null;
};

const limpiarAnsi = (texto = '') => texto.replace(/\u001b\[[0-9;]*m/g, '');

const casos = [];
for (const { spec } of (resultados.suites ?? []).flatMap(s => recorrerSuites(s))) {
    const id = (spec.title.match(/^(SP-\d+)/) ?? [])[1];
    if (!id) continue;
    const prueba = spec.tests[0];
    const resultado = prueba.results[prueba.results.length - 1] ?? {};
    const aprobado = prueba.status === 'expected' || prueba.status === 'flaky';
    const info = catalogo[id] ?? {};
    const segundos = ((resultado.duration ?? 0) / 1000).toFixed(1);

    // Evidencias
    const evidencia = [];
    const adjuntos = resultado.attachments ?? [];
    const captura = [...adjuntos].reverse().find(a => a.contentType === 'image/png' && a.path);
    const c = copiar(captura?.path, join('capturas', `${id}.png`));
    if (c) evidencia.push(c);

    const guardarTodo = !aprobado || CASOS_CON_TRAZA.has(id);
    const video = adjuntos.find(a => a.name === 'video' && a.path);
    const v = copiar(video?.path, join('videos', `${id}-Ana.webm`));
    if (v) evidencia.push(v);
    if (video?.path) {
        const otros = join(dirname(video.path), 'videos-otros-actores');
        if (existsSync(otros)) {
            readdirSync(otros).filter(f => f.endsWith('.webm')).forEach((f, i) => {
                const r = copiar(join(otros, f), join('videos', `${id}-otro-actor-${i + 1}.webm`));
                if (r) evidencia.push(r);
            });
        }
    }
    if (guardarTodo) {
        const traza = adjuntos.find(a => a.name === 'trace' && a.path);
        const t = copiar(traza?.path, join('trazas', `${id}-trace.zip`));
        if (t) evidencia.push(t);
    }
    evidencia.push('reporte-serenity/index.html', 'reporte-playwright/index.html');

    const aserciones = pasosDeAsercion(resultado.steps);
    const error = limpiarAnsi(resultado.errors?.[0]?.message ?? resultado.error?.message ?? '').split('\n').filter(Boolean).slice(0, 2).join(' ');
    const reintentos = prueba.results.length - 1;
    const errorPrevio = reintentos > 0
        ? limpiarAnsi(prueba.results[0].errors?.[0]?.message ?? '').split('\n').filter(Boolean)[0] ?? ''
        : '';
    const notaReintento = prueba.status === 'flaky'
        ? ` (aprobado en el reintento ${reintentos}; el primer intento falló por: ${errorPrevio})`
        : '';
    const obtenido = aprobado
        ? `Conforme a lo esperado${notaReintento}. Se verificaron ${aserciones.length} aserciones en ${segundos} s: ${aserciones.join('; ')}.`
        : `No conforme. Falló el paso «${pasoFallido(resultado.steps) ?? 'desconocido'}»: ${error}`;

    casos.push({
        id,
        nombre: spec.title.replace(/^SP-\d+\s*/, ''),
        tipo: info.tipo ?? 'exitoso',
        actores: info.actores ?? [],
        objetivo: info.objetivo ?? '',
        esperado: info.esperado ?? '',
        obtenido,
        estado: aprobado ? 'Aprobado' : 'Fallido',
        duracionSeg: Number(segundos),
        reintentos,
        inestable: prueba.status === 'flaky',
        evidencia,
    });
}
casos.sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }));

// Informes HTML
const serenity = join(raiz, 'target', 'site', 'serenity');
if (existsSync(join(serenity, 'index.html'))) copiar(serenity, 'reporte-serenity');
copiar(join(raiz, 'reportes', 'playwright-html'), 'reporte-playwright');
// Copia ligera del JSON de Playwright (sin stdout/stderr ni adjuntos en línea)
const ligero = JSON.parse(JSON.stringify(resultados, (clave, valor) => {
    if (clave === 'stdout' || clave === 'stderr') return undefined;
    if (clave === 'attachments') return (valor ?? []).filter(a => a.path).map(a => ({ name: a.name, contentType: a.contentType, path: relative(raiz, a.path).split('\\').join('/') }));
    return valor;
}));
writeFileSync(join(destino, 'resultados-playwright.json'), JSON.stringify(ligero, null, 1), 'utf8');

// Inventario del patrón (leído del código fuente para que no se desactualice)
const exportados = (carpeta) => readdirSync(join(raiz, 'src', 'screenplay', carpeta))
    .filter(f => f.endsWith('.ts') && f !== 'index.ts')
    .flatMap(f => [...readFileSync(join(raiz, 'src', 'screenplay', carpeta, f), 'utf8').matchAll(/^export const (\w+)/gm)].map(m => m[1]));

const stats = resultados.stats ?? {};
const resumen = {
    area: 'E2E Screenplay',
    herramienta: `Serenity/JS ${paquete('@serenity-js/core')} + Playwright ${paquete('@playwright/test')}`,
    comando: 'npm test',
    fecha: new Date().toISOString(),
    totales: {
        total: casos.length,
        aprobados: casos.filter(c => c.estado === 'Aprobado').length,
        fallidos: casos.filter(c => c.estado === 'Fallido').length,
        inestables: casos.filter(c => c.inestable).map(c => c.id),
        duracionSeg: Number(((Number(process.env.DURACION_TOTAL_MS) || stats.duration || 0) / 1000).toFixed(1)),
    },
    patron: {
        actores: ['Ana (líder del equipo)', 'Beto (miembro del equipo)', 'Carla (usuaria ajena al equipo)'],
        habilidades: ['BrowseTheWebWithPlaywright', 'CallAnApi', 'TakeNotes'],
        tareas: exportados('tareas'),
        interacciones: [...exportados('interacciones'), 'Navigate', 'Click', 'Enter', 'Clear', 'Select', 'Send (REST)', 'Wait'],
        preguntas: [...exportados('preguntas'), 'Text', 'Attribute', 'Value', 'Page', 'LastResponse'],
    },
    navegador: 'Google Chrome (channel: chrome)',
    entorno: { frontend: 'http://localhost:5173', backend: 'http://localhost:3000' },
    casos,
};

writeFileSync(join(destino, 'resumen.json'), JSON.stringify(resumen, null, 2) + '\n', 'utf8');
const tam = (ruta) => { let t = 0; const r = (p) => { const s = statSync(p); if (s.isDirectory()) readdirSync(p).forEach(f => r(join(p, f))); else t += s.size; }; r(ruta); return t; };
console.log(`\nResumen: ${resumen.totales.aprobados}/${resumen.totales.total} aprobados → ${relative(process.cwd(), join(destino, 'resumen.json'))} (evidencias: ${(tam(destino) / 1048576).toFixed(1)} MB)`);
