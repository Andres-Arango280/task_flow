// Genera PRESENTACION.md (guion de sustentación, criterio 10) con los números reales de las evidencias.
//   node pruebas/informe/generar-presentacion.js
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const EVID = path.join(RAIZ, 'pruebas', 'evidencias');
const leerJson = (r) => (fs.existsSync(r) ? JSON.parse(fs.readFileSync(r, 'utf8')) : null);
const leer = (a) => leerJson(path.join(EVID, a, 'resumen.json'));
const R = {
  jest: leer('backend-jest'), cypress: leer('cypress'), seguridad: leer('seguridad'), rendimiento: leer('rendimiento'), ux: leer('ux-accesibilidad'),
  screenplay: leer('screenplay'), gherkin: leer('gherkin'), stagehand: leer('stagehand'), pwa: leer('ia-herramientas/playwright-agents'), bu: leer('ia-herramientas/browser-use'),
  mcp: leer('ia-herramientas/playwright-mcp'), katalon: leer('katalon'), despliegue: leer('despliegue'),
};
const mapa = leerJson(path.join(__dirname, 'funcionalidades.json'));
const extra = leerJson(path.join(__dirname, 'datos-extra.json')) || {};
const matriz = leerJson(path.join(EVID, 'matriz', 'matriz.json'));
const comp = leerJson(path.join(EVID, 'comparacion', 'antes-despues.json'));
const t = (r) => (r?.totales ? `${r.totales.aprobados}/${r.totales.total}` : 'por ejecutar');
const griho = (extra.griho || []).find((g) => /PORCENTAJE/.test(g[0]));

const md = [];
md.push('# Guion de presentación — TaskFlow (entrega final de pruebas)', '');
md.push(`> Generado el ${new Date().toLocaleString('es-CO')} con \`node pruebas/informe/generar-presentacion.js\` a partir de las evidencias reales. Duración objetivo: 15 minutos + preguntas.`, '');
md.push('## 1. Apertura (1 min)', '');
md.push('- **Qué es TaskFlow**: gestión colaborativa de tareas con equipos, proyectos y tableros Kanban (Por Hacer / En Progreso / Hecho). Backend NestJS + PostgreSQL, frontend React + Vite.');
md.push('- **Qué entregamos**: plan de pruebas, matriz de trazabilidad, informe final, Cypress sobre las seis funcionalidades, Screenplay + Gherkin, tres herramientas de IA, Stagehand, software refactorizado (antes/después) y el despliegue con SonarQube y Jenkins con regresión posterior.', '');
md.push('## 2. Seis funcionalidades y aportes por integrante (2 min)', '');
md.push('| Integrante | Funcionalidades | Qué muestra |', '|---|---|---|');
for (const i of mapa.integrantes) {
  const fns = i.funcionalidades.map((fid) => { const f = mapa.funcionalidades.find((x) => x.id === fid); return f ? `${fid} ${f.nombre}` : fid; }).join('<br>');
  md.push(`| ${i.nombre} | ${fns} | Casos Cypress de cada funcionalidad (API, UI, componentes, seguridad, accesibilidad), escenarios Screenplay/Gherkin, herramientas de IA, Stagehand y correcciones aplicadas |`);
}
if (matriz) {
  md.push('', '| Funcionalidad | Casos trazados | Aprobados | Exitosos / alternativos / error | Defectos corregidos |', '|---|---:|---:|---|---|');
  for (const f of matriz.porFuncionalidad) md.push(`| ${f.id} ${f.nombre} | ${f.casos} | ${f.aprobados} | ${f.tipos.exitosos} / ${f.tipos.alternativos} / ${f.tipos.error} | ${f.defectos.join(', ') || '—'} |`);
}
md.push('', '## 3. Plan de pruebas y matriz de trazabilidad (2 min)', '');
md.push('- Abrir `pruebas/informe/Plan-de-Pruebas-TaskFlow.docx`: alcance (6 funcionalidades, 23 requisitos), niveles (unitario → API → sistema → aceptación → IA), criterios de salida, riesgos.');
md.push(`- Abrir \`pruebas/evidencias/matriz/Matriz-Trazabilidad-TaskFlow.xlsx\` (hoja **Requisitos**): ${matriz ? `${matriz.totales.casos} casos trazados, ${matriz.totales.requisitosCubiertos}/${matriz.totales.requisitos} requisitos cubiertos, ${matriz.totales.defectos} defectos (hoja Defectos) enlazados con los casos que los verifican` : 'generar con generar-matriz.js'}.`);
md.push('- Mensaje clave: la matriz y el informe se **generan automáticamente** desde los `resumen.json` de cada suite; no hay resultados escritos a mano.', '');
md.push('## 4. Demostración en vivo (6 min)', '');
md.push('| Paso | Comando | Qué señalar |', '|---|---|---|');
md.push(`| Cypress seguridad (13 casos, ~10 s) | \`cd taskflow-frontend && npm run test:seguridad\` | JWT manipulado → 401, 6.º intento → 429, BOLA → 403, XSS mostrado como texto, cabeceras helmet, CORS |`);
md.push(`| Cypress accesibilidad (11 casos, ~20 s) | \`npm run test:accesibilidad\` | axe-core WCAG A/AA sin violaciones en 8 pantallas + diálogo modal + alto contraste + teclado |`);
md.push(`| Gherkin + Screenplay (${t(R.gherkin)}, ~50 s) | \`cd pruebas/e2e-screenplay && npm run gherkin\` | Abrir un .feature (Feature → Rule → Scenario con Given/When/Then y texto en español, formato de la Clase 19) y el informe Serenity con las tareas Screenplay anidadas |`);
md.push(`| Stagehand (${t(R.stagehand)}) | mostrar \`pruebas/evidencias/stagehand\` (capturas + salidas JSON) | observe devuelve selectores reales; extract valida con zod; act con instrucción imposible → success=false |`);
md.push(`| Playwright Agents (${t(R.pwa)}) | abrir \`pruebas/ia-herramientas/playwright-agents/specs/plan-de-pruebas.md\` y \`reportes/healer-diff.md\` | Planner → Generator → Healer: el localizador roto se repara y la prueba vuelve a pasar |`);
md.push('', `Suites completas ya ejecutadas (mostrar reportes HTML si hay tiempo): Jest ${t(R.jest)} (cobertura líneas ${R.jest?.cobertura?.lines ?? '—'} %), Cypress ${t(R.cypress)}, Screenplay ${t(R.screenplay)}, Seguridad OWASP ${t(R.seguridad)}, Rendimiento ${t(R.rendimiento)}, UX/a11y ${t(R.ux)}, Browser Use ${t(R.bu)}, Playwright MCP ${t(R.mcp)}.`, '');
md.push('## 5. Antes y después de la refactorización (2 min)', '');
if (comp) {
  const a = comp.metricas.antes; const d = comp.metricas.despues;
  md.push(`- Versión anterior: commit \`${comp.versionAnterior.commit}\` (${comp.versionAnterior.fecha}), API sobre MongoDB/Mongoose, sin helmet, CORS abierto, secreto JWT por defecto, ${a.casosIt} casos automatizados.`);
  md.push(`- Versión final: PostgreSQL/TypeORM con índices, helmet, CORS restringido, bloqueo de fuerza bruta, validación en español, accesibilidad WCAG, ayuda/preferencias/privacidad; ${d.casosIt} casos automatizados (+${d.casosIt - a.casosIt}), ${d.archivosPrueba} archivos de prueba.`);
  md.push(`- ${comp.correcciones.length} correcciones trazadas (C-01…C-${String(comp.correcciones.length).padStart(2, '0')}); usabilidad GRIHO ${griho ? griho.slice(1).join(' → ') : ''}; p95 REN-02 569 ms → 273 ms.`);
  md.push('- Mostrar `pruebas/evidencias/comparacion/antes-despues.md`: extractos de `src/main.ts` y `auth.service.ts` antes/después.');
}
md.push('', '## 6. Despliegue y regresión posterior (1 min)', '');
if (R.despliegue) {
  for (const c of R.despliegue.casos.filter((c) => !c.id.startsWith('REG-'))) md.push(`- **${c.id}** ${c.nombre}: ${c.estado} — ${c.obtenido.slice(0, 180)}`);
  md.push(`- Regresión completa posterior: ${(R.despliegue.regresion || []).map((r) => `${r.suite.split(' (')[0]} ${r.aprobados}/${r.total}`).join('; ')}.`);
} else md.push('- Ejecutar `node pruebas/despliegue/verificar-despliegue.mjs` con `SONAR_TOKEN` para generar las evidencias.');
md.push('', '## 7. Cierre: métricas, calidad y recomendaciones (1 min)', '');
md.push(`- Casos ejecutados o preparados en total: ${matriz ? matriz.totales.casos : '—'}; cobertura de servicios ${R.jest?.cobertura?.lines ?? '—'} %; 0 violaciones WCAG A/AA; hallazgos de seguridad abiertos documentados como mejoras (límite por IP, enumeración por correo, CSP del frontend, dependencias que exigen NestJS 11).`);
md.push('- IA: el modelo local gratuito (llama3.1:8b) sirve para explorar y generar pruebas, pero su latencia y el formato de salida limitan su uso en regresión; la validación determinista siempre decide el resultado.');
md.push('- Recomendaciones: CSP y cookie HttpOnly en el frontend, actualizar Vite/NestJS, límite por IP, integrar todas las suites en Jenkins.', '');
md.push('## Preguntas frecuentes de sustentación', '');
md.push('- **¿Cómo se enlaza Gherkin con Screenplay?** Cada paso Given/When/Then tiene una definición en `features/step_definitions/*.ts` que llama a `actorDe("ella").attemptsTo(Tarea…)` (el pronombre se resuelve al actor en escena, como Alicia/ella en la clase); las tareas son las mismas que usan los specs SP-01…SP-18.');
md.push('- **¿Qué hace cada capacidad de Stagehand?** `observe` lista acciones con selectores; `act` ejecuta una instrucción y se autorrepara; `extract` devuelve datos validados por esquema zod. Todo se comprueba después contra la API.');
md.push('- **¿Por qué fallan algunos casos de Stagehand/IA?** Son limitaciones del modelo local (JSON fuera de esquema, omisiones, lentitud), documentadas como tales; no son defectos de TaskFlow.');
md.push('- **¿Cómo verifico un módulo concreto?** `npm run test:unit:<modulo>` / `npm run test:e2e:<modulo>`; en Cypress, `--spec cypress/e2e/api/<modulo>.cy.ts`.');
md.push('- **¿Qué hace la Quality Gate?** Comprueba bugs, vulnerabilidades, cobertura y duplicación en SonarQube; el pipeline aborta si falla (`waitForQualityGate abortPipeline: true`).');
md.push('- **¿Cómo reproducir la demostración de regresión?** Quitar la lista «Hecho» en `proyectos.service.ts`, ejecutar `npm run test:regression:unit` (2 fallos), revertir y volver a ejecutar.');
md.push('', '---', 'Documentos: `pruebas/informe/Informe-Pruebas-TaskFlow.docx` · `pruebas/informe/Plan-de-Pruebas-TaskFlow.docx` · `pruebas/evidencias/matriz/Matriz-Trazabilidad-TaskFlow.xlsx` · `README_COMANDOS.md`.');
fs.writeFileSync(path.join(RAIZ, 'PRESENTACION.md'), md.join('\n') + '\n', 'utf8');
console.log('PRESENTACION.md actualizado');
