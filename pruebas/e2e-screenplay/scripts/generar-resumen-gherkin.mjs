// Genera pruebas/evidencias/gherkin/resumen.json a partir de los resultados REALES de Cucumber
// (reportes/gherkin/cucumber.json) y del catálogo catalogo/gherkin.json (objetivo/esperado por id),
// y copia las evidencias (informe Serenity BDD, informe Cucumber, capturas, archivos .feature).
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(raiz, '..', 'evidencias', 'gherkin');
const ficheroResultados = join(raiz, 'reportes', 'gherkin', 'cucumber.json');
const catalogo = JSON.parse(readFileSync(join(raiz, 'catalogo', 'gherkin.json'), 'utf8'));
const paquete = (nombre) => JSON.parse(readFileSync(join(raiz, 'node_modules', ...nombre.split('/'), 'package.json'), 'utf8')).version;

if (!existsSync(ficheroResultados)) {
    console.error(`No existe ${ficheroResultados}. Ejecuta antes «npm run gherkin».`);
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

const limpiarAnsi = (texto = '') => texto.replace(/\u001b\[[0-9;]*m/g, '');
const ns = (duracion = 0) => duracion / 1e9;

// ---------- Casos (un escenario de Cucumber = un caso) ----------
const casos = [];
const features = [];
for (const feature of resultados) {
    const escenarios = (feature.elements ?? []).filter(e => e.type === 'scenario');
    features.push({
        archivo: feature.uri.replace(/\\/g, '/'),
        nombre: feature.name,
        etiquetas: (feature.tags ?? []).map(t => t.name),
        escenarios: escenarios.length,
    });

    for (const escenario of escenarios) {
        const id = (escenario.name.match(/^(GH-\d+)/) ?? [])[1];
        if (!id) continue;

        const pasos = (escenario.steps ?? []).filter(p => !p.hidden && p.keyword);
        const pasosTexto = pasos.map(p => `${p.keyword.trim()} ${p.name}`);
        // Pasos de verificación: los «Entonces» y los «Y» que los continúan
        let ultimaPalabra = '';
        const verificaciones = pasos.filter(p => {
            const palabra = p.keyword.trim();
            if (!/^(Y|E|Pero)$/.test(palabra)) ultimaPalabra = palabra;
            return ultimaPalabra === 'Entonces';
        }).length;
        const fallido = pasos.find(p => p.result?.status === 'failed');
        const noEjecutados = pasos.filter(p => ['skipped', 'undefined', 'pending', 'ambiguous'].includes(p.result?.status));
        const aprobado = !fallido && noEjecutados.length === 0 && pasos.every(p => p.result?.status === 'passed');
        const duracionSeg = Number(pasos.reduce((s, p) => s + ns(p.result?.duration), 0).toFixed(1));
        const info = catalogo[id] ?? {};
        const etiquetas = (escenario.tags ?? []).map(t => t.name);
        const tipo = info.tipo ?? (etiquetas.includes('@error') ? 'error' : etiquetas.includes('@alternativo') ? 'alternativo' : 'exitoso');

        const error = limpiarAnsi(fallido?.result?.error_message ?? noEjecutados[0]?.result?.error_message ?? '')
            .split('\n').filter(Boolean).slice(0, 2).join(' ');
        const obtenido = aprobado
            ? `Conforme a lo esperado. Se ejecutaron y superaron los ${pasos.length} pasos (${verificaciones} de ellos de verificación «Entonces») en ${duracionSeg} s.`
            : fallido
                ? `No conforme. Falló el paso «${fallido.keyword.trim()} ${fallido.name}»: ${error}`
                : `No conforme. ${noEjecutados.length} paso(s) sin ejecutar (${noEjecutados[0]?.result?.status}): «${noEjecutados[0]?.keyword.trim()} ${noEjecutados[0]?.name}» ${error}`;

        const evidencia = [];
        const captura = copiar(join(raiz, 'reportes', 'gherkin', 'capturas', `${id}.png`), join('capturas', `${id}.png`));
        if (captura) evidencia.push(captura);
        evidencia.push(`features/${feature.uri.replace(/\\/g, '/').replace(/^features\//, '')}`, 'reporte-serenity/index.html', 'reporte-cucumber/cucumber.html');

        casos.push({
            id,
            nombre: escenario.name.replace(/^GH-\d+\s*/, ''),
            feature: feature.name,
            archivo: feature.uri.replace(/\\/g, '/'),
            esquema: /esquema/i.test(escenario.keyword ?? ''),
            tipo,
            funcionalidad: info.funcionalidad ?? '',
            etiquetas,
            actores: info.actores ?? [],
            pasos: pasosTexto,
            objetivo: info.objetivo ?? '',
            esperado: info.esperado ?? '',
            obtenido,
            estado: aprobado ? 'Aprobado' : 'Fallido',
            duracionSeg,
            evidencia,
        });
    }
}
casos.sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }));

// ---------- Evidencias: informes y archivos .feature ----------
const serenity = join(raiz, 'target', 'site', 'serenity-gherkin');
if (existsSync(join(serenity, 'index.html'))) copiar(serenity, 'reporte-serenity');
copiar(join(raiz, 'reportes', 'gherkin', 'cucumber.html'), join('reporte-cucumber', 'cucumber.html'));
copiar(join(raiz, 'reportes', 'gherkin', 'cucumber.json'), join('reporte-cucumber', 'cucumber.json'));
for (const archivo of readdirSync(join(raiz, 'features')).filter(f => f.endsWith('.feature'))) {
    copiar(join(raiz, 'features', archivo), join('features', archivo));
}
if (existsSync(join(raiz, 'reportes', 'gherkin', 'videos'))) copiar(join(raiz, 'reportes', 'gherkin', 'videos'), 'videos');

// ---------- Inventario del patrón Screenplay (leído del código fuente) ----------
const exportados = (carpeta) => readdirSync(join(raiz, 'src', 'screenplay', carpeta))
    .filter(f => f.endsWith('.ts') && f !== 'index.ts')
    .flatMap(f => [...readFileSync(join(raiz, 'src', 'screenplay', carpeta, f), 'utf8').matchAll(/^export const (\w+)/gm)].map(m => m[1]));

const definicionesDePasos = readdirSync(join(raiz, 'features', 'step_definitions'))
    .filter(f => f.endsWith('.ts'))
    .map(f => ({
        archivo: `features/step_definitions/${f}`,
        pasos: [...readFileSync(join(raiz, 'features', 'step_definitions', f), 'utf8').matchAll(/^(?:Dado|Cuando|Entonces|Given|When|Then)\('([^']+)'/gm)].map(m => m[1]),
    }));

const totalPasos = casos.reduce((s, c) => s + c.pasos.length, 0);
const resumen = {
    area: 'E2E Gherkin + Screenplay',
    herramienta: `Cucumber ${paquete('@cucumber/cucumber')} + Serenity/JS ${paquete('@serenity-js/core')} (@serenity-js/cucumber) + Playwright ${paquete('playwright')}`,
    comando: 'npm run gherkin',
    fecha: new Date().toISOString(),
    totales: {
        total: casos.length,
        aprobados: casos.filter(c => c.estado === 'Aprobado').length,
        fallidos: casos.filter(c => c.estado === 'Fallido').length,
        pasos: totalPasos,
        duracionSeg: Number(((Number(process.env.DURACION_TOTAL_MS) || casos.reduce((s, c) => s + c.duracionSeg * 1000, 0)) / 1000).toFixed(1)),
    },
    gherkin: {
        idioma: 'es (# language: es)',
        estructura: 'Característica → Antecedentes → Escenario / Esquema del escenario (Ejemplos) → Dado / Cuando / Entonces / Y',
        features,
        definicionesDePasos,
        enlaceConScreenplay: 'Cada paso Gherkin (features/step_definitions/*.ts) llama a actorCalled(«Actor»).attemptsTo(...) con las tareas, interacciones y preguntas de src/screenplay/, las mismas que usa la suite Playwright Test (SP-01…SP-18).',
    },
    patron: {
        actores: ['Ana (líder del equipo)', 'Beto (miembro del equipo)', 'Carla (usuaria ajena al equipo)'],
        habilidades: ['BrowseTheWebWithPlaywright', 'CallAnApi', 'TakeNotes'],
        tareas: exportados('tareas'),
        interacciones: [...exportados('interacciones'), 'ComprobarQueTaskFlowResponde (propia, en los pasos)', 'Navigate', 'Click', 'Enter', 'Clear', 'Select', 'Send (REST)', 'Wait'],
        preguntas: [...exportados('preguntas'), 'Text', 'Attribute', 'Value', 'Page', 'LastResponse'],
    },
    navegador: 'Google Chrome (channel: chrome, headless)',
    entorno: { frontend: process.env.TASKFLOW_URL ?? 'http://localhost:5173', backend: process.env.TASKFLOW_API_URL ?? 'http://localhost:3000' },
    casos,
};

writeFileSync(join(destino, 'resumen.json'), JSON.stringify(resumen, null, 2) + '\n', 'utf8');
const tam = (ruta) => { let t = 0; const r = (p) => { const s = statSync(p); if (s.isDirectory()) readdirSync(p).forEach(f => r(join(p, f))); else t += s.size; }; r(ruta); return t; };
console.log(`\nResumen Gherkin: ${resumen.totales.aprobados}/${resumen.totales.total} escenarios aprobados (${totalPasos} pasos) → ${relative(process.cwd(), join(destino, 'resumen.json'))} (evidencias: ${(tam(destino) / 1048576).toFixed(1)} MB)`);
