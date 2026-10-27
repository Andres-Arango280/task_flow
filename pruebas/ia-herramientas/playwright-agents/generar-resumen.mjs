// Genera ../../evidencias/ia-herramientas/playwright-agents/resumen.json a partir de los resultados REALES
// (reportes/resultados-generados.json, healer-antes.json, healer-despues.json) y copia las evidencias:
// plan del Planner, exploración (snapshots ARIA y capturas), pruebas generadas, informes y definiciones de agentes.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const EVID = resolve(RAIZ, '..', '..', 'evidencias', 'ia-herramientas', 'playwright-agents');
const require = createRequire(import.meta.url);
const leer = (r) => (existsSync(r) ? JSON.parse(readFileSync(r, 'utf8')) : null);
const generados = leer(join(RAIZ, 'reportes', 'resultados-generados.json'));
const antes = leer(join(RAIZ, 'reportes', 'healer-antes.json'));
const despues = leer(join(RAIZ, 'reportes', 'healer-despues.json'));
if (!generados) { console.error('Falta reportes/resultados-generados.json: ejecuta antes las pruebas generadas.'); process.exit(1); }

rmSync(EVID, { recursive: true, force: true });
mkdirSync(EVID, { recursive: true });
const copiar = (origen, destino) => { if (!existsSync(origen)) return null; mkdirSync(dirname(join(EVID, destino)), { recursive: true }); cpSync(origen, join(EVID, destino), { recursive: true }); return destino; };

const archivos = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? archivos(join(dir, n)) : [join(dir, n)])) : []);

// Casos a partir del JSON de Playwright (una prueba por archivo generado)
const casos = [];
const recorrer = (suite, archivo) => {
  for (const spec of suite.specs ?? []) {
    const prueba = spec.tests[0];
    const res = prueba.results[prueba.results.length - 1];
    const ok = prueba.status === 'expected' || prueba.status === 'flaky';
    const n = casos.length + 1;
    const id = `PWA-${String(n).padStart(2, '0')}`;
    const capturas = (res.attachments ?? []).filter((a) => a.contentType === 'image/png' && a.path).map((a, i) => copiar(a.path, `capturas/${id}-${i + 1}.png`)).filter(Boolean);
    const relSpec = (archivo ?? spec.file).replace(/\\/g, '/');
    casos.push({
      id, nombre: spec.title, suite: suite.title, tipo: /incorrecta|sin título|no registrado|sin sesión/i.test(spec.title) ? 'alternativo/error' : 'exitoso',
      agente: 'Generator',
      objetivo: `Prueba generada por el agente Generator a partir del escenario «${spec.title}» del plan (specs/plan-de-pruebas.md).`,
      esperado: 'Todas las verificaciones (expect) del escenario se cumplen tal como las define el plan.',
      obtenido: ok ? `Conforme: la prueba pasó en ${(res.duration / 1000).toFixed(1)} s (${prueba.status}).` : `No conforme: ${prueba.status}. ${(res.errors?.[0]?.message ?? '').replace(/\u001b\[[0-9;]*m/g, '').split('\n')[0]}`,
      estado: ok ? 'Aprobado' : 'Fallido', duracionSeg: Number((res.duration / 1000).toFixed(1)),
      evidencia: [`tests/${relSpec}`, 'reportes/html-generados/index.html', 'reportes/resultados-generados.json', ...capturas],
    });
  }
  for (const s of suite.suites ?? []) recorrer(s, archivo ?? suite.file);
};
for (const s of generados.suites ?? []) recorrer(s, s.file);

// Caso del Planner
const plan = readFileSync(join(RAIZ, 'specs', 'plan-de-pruebas.md'), 'utf8');
const escenarios = (plan.match(/^#### \d+\.\d+ /gm) ?? []).length;
const paginasExploradas = readdirSync(join(RAIZ, 'specs', 'exploracion')).filter((f) => f.endsWith('.txt')).length;
casos.push({
  id: `PWA-${String(casos.length + 1).padStart(2, '0')}`, nombre: 'Planner: exploración de la aplicación y plan de pruebas', suite: 'Agentes', tipo: 'planificación', agente: 'Planner',
  objetivo: 'Explorar la interfaz (snapshots de accesibilidad de cada página) y producir un plan de pruebas estructurado con pasos y resultados esperados.',
  esperado: 'Un plan en specs/plan-de-pruebas.md con escenarios para autenticación, equipos, proyectos y tablero, independiente del orden de ejecución.',
  obtenido: `Conforme: se exploraron ${paginasExploradas} vistas (login, registro, mis equipos, equipo, tablero, 3 ventanas modales y preferencias) y el plan contiene ${escenarios} escenarios en 4 funcionalidades.`,
  estado: escenarios >= 8 ? 'Aprobado' : 'Fallido', duracionSeg: null,
  evidencia: ['specs/plan-de-pruebas.md', 'specs/exploracion/', '.claude/agents/playwright-test-planner.md'],
});

// Caso del Healer
const resultadoDe = (j) => { const t = j?.suites?.[0]?.suites?.[0]?.specs?.[0]?.tests?.[0]; return t ? t.results[t.results.length - 1] : null; };
const rAntes = resultadoDe(antes); const rDespues = resultadoDe(despues);
const sanado = rAntes && rDespues && rAntes.status !== 'passed' && rDespues.status === 'passed';
casos.push({
  id: `PWA-${String(casos.length + 1).padStart(2, '0')}`, nombre: 'Healer: diagnóstico y reparación de una prueba con localizadores rotos', suite: 'Agentes', tipo: 'mantenimiento', agente: 'Healer',
  objetivo: 'Partiendo de una prueba que falla por localizadores inexistentes (#email, #password, button.btn-login), diagnosticar la causa con el snapshot y corregirla sin tocar la aplicación.',
  esperado: 'La ejecución inicial falla; tras la corrección (localizadores por etiqueta y rol) la prueba pasa.',
  obtenido: `${sanado ? 'Conforme' : 'No conforme'}: antes → ${rAntes?.status ?? 'sin datos'} (${rAntes ? (rAntes.duration / 1000).toFixed(1) : '?'} s); después → ${rDespues?.status ?? 'sin datos'} (${rDespues ? (rDespues.duration / 1000).toFixed(1) : '?'} s). Diff en reportes/healer-diff.md.`,
  estado: sanado ? 'Aprobado' : 'Fallido', duracionSeg: rDespues ? Number((rDespues.duration / 1000).toFixed(1)) : null,
  evidencia: ['reportes/healer-antes.json', 'reportes/healer-despues.json', 'reportes/healer-diff.md', 'tests/healer-demo.spec.ts', '.claude/agents/playwright-test-healer.md'],
});

// Copia de evidencias
copiar(join(RAIZ, 'specs'), 'specs');
copiar(join(RAIZ, '.claude'), '.claude');
copiar(join(RAIZ, '.mcp.json'), '.mcp.json');
copiar(join(RAIZ, 'reportes', 'html-generados'), 'reportes/html-generados');
for (const f of ['resultados-generados.json', 'healer-antes.json', 'healer-despues.json', 'healer-diff.md']) copiar(join(RAIZ, 'reportes', f), `reportes/${f}`);
for (const f of archivos(join(RAIZ, 'tests'))) copiar(f, `tests/${relative(join(RAIZ, 'tests'), f).replace(/\\/g, '/')}`);
copiar(join(RAIZ, 'explorar.mjs'), 'explorar.mjs');

const resumen = {
  area: 'Pruebas con IA — Playwright Test Agents',
  herramienta: `Playwright Test Agents (Planner, Generator, Healer) — @playwright/test ${require('@playwright/test/package.json').version}, inicializados con «npx playwright init-agents --loop=claude»`,
  modelo: 'Claude Code (asistente de IA, sin coste adicional) ejecutando las definiciones de agentes generadas; exploración del navegador con snapshots de accesibilidad de Playwright',
  proposito: 'Planificar (Planner), generar (Generator) y mantener/reparar (Healer) pruebas E2E de Playwright a partir de la exploración real de la aplicación, con un asistente de IA que sigue definiciones de agente estándar.',
  configuracion: {
    inicializacion: 'npx playwright init-agents --loop=claude --prompts → .claude/agents/*.md, .claude/prompts/*.md, .mcp.json (servidor «playwright run-test-mcp-server»), tests/seed.spec.ts',
    exploracion: 'node explorar.mjs → specs/exploracion/*.txt (ariaSnapshot) y *.png de /login, /register, /, /equipos/:id, /proyectos/:id, modales y /preferencias',
    ejecucion: 'npx playwright test (Chrome, headless, 1 worker, reporter html+json en reportes/)',
    nota: 'Sin clave de API para Copilot/Claude en el IDE, el bucle agéntico lo ejecutó Claude Code siguiendo literalmente cada definición; el servidor MCP «playwright-test» queda configurado en .mcp.json para usarlo desde un IDE compatible.',
  },
  comando: 'cd pruebas/ia-herramientas/playwright-agents && node explorar.mjs && npx playwright test --grep-invert "healer|seed" && node generar-resumen.mjs',
  fecha: new Date().toISOString(),
  totales: { total: casos.length, aprobados: casos.filter((c) => c.estado === 'Aprobado').length, fallidos: casos.filter((c) => c.estado !== 'Aprobado').length, duracionSeg: Number(((generados.stats?.duration ?? 0) / 1000).toFixed(1)) },
  agentes: {
    planner: { definicion: '.claude/agents/playwright-test-planner.md', salida: 'specs/plan-de-pruebas.md', escenarios, paginasExploradas },
    generator: { definicion: '.claude/agents/playwright-test-generator.md', pruebasGeneradas: casos.filter((c) => c.agente === 'Generator').length, carpeta: 'tests/' },
    healer: { definicion: '.claude/agents/playwright-test-healer.md', antes: rAntes?.status, despues: rDespues?.status, diff: 'reportes/healer-diff.md' },
  },
  casos,
  aportes: [
    'El Planner convierte la exploración real de la interfaz (árbol de accesibilidad) en un plan legible con pasos y resultados esperados, útil también como documentación para el equipo.',
    'El Generator produce pruebas con localizadores por rol/etiqueta (getByRole, getByLabel) y un comentario por paso, consistentes con el plan y fáciles de revisar.',
    'El Healer diagnostica fallos de localizadores comparando el error con el snapshot y propone localizadores estables, reduciendo el coste de mantenimiento cuando cambia la interfaz.',
    'Todo es código abierto y gratuito; las definiciones de agentes son archivos Markdown versionables y reutilizables con cualquier asistente compatible (Claude, Copilot, Codex, VS Code).',
  ],
  limitaciones: [
    'La calidad del plan y de las pruebas depende del asistente que ejecuta los agentes; un modelo pequeño o sin acceso al navegador produce planes genéricos.',
    'El flujo oficial requiere un IDE con MCP (Copilot/Claude); aquí el asistente fue Claude Code sin MCP, por lo que la exploración se hizo con un script de Playwright equivalente a browser_snapshot.',
    'El Healer solo corrige lo que puede inferir del DOM: no distingue por sí mismo entre un cambio legítimo de la interfaz y un defecto real (riesgo de "sanar" una prueba que debía fallar).',
    'Las pruebas generadas siguen necesitando revisión humana: datos únicos, independencia entre casos y aserciones significativas no las garantiza el agente.',
  ],
};
writeFileSync(join(EVID, 'resumen.json'), JSON.stringify(resumen, null, 2), 'utf8');
console.log(`Resumen: ${resumen.totales.aprobados}/${resumen.totales.total} aprobados → ${join(EVID, 'resumen.json')}`);
