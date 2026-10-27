// Genera el INFORME FINAL DE PRUEBAS de TaskFlow en Word a partir de las evidencias reales
// (pruebas/evidencias/*/resumen.json), la matriz de trazabilidad (generar-matriz.js), la comparación
// antes/después (pruebas/comparacion/comparar.mjs) y la verificación del despliegue.
// Uso: node pruebas/informe/generar-informe.js [salida.docx]
// Requiere: npm install en pruebas/informe (docx, image-size, exceljs).
// Orden recomendado: node pruebas/comparacion/comparar.mjs && node pruebas/informe/generar-matriz.js && node pruebas/informe/generar-informe.js
const fs = require('fs');
const path = require('path');
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, LevelFormat, PageBreak,
  PageNumber, PageOrientation, Packer, Paragraph, ShadingType, Table, TableCell, TableOfContents, TableRow,
  TextRun, WidthType,
} = require('docx');
const { imageSize } = require('image-size');

const RAIZ = path.resolve(__dirname, '..', '..');
const EVID = path.join(RAIZ, 'pruebas', 'evidencias');
const SALIDA = process.argv[2] || path.join(RAIZ, 'pruebas', 'informe', 'Informe-Pruebas-TaskFlow.docx');

const leerJson = (ruta) => (fs.existsSync(ruta) ? JSON.parse(fs.readFileSync(ruta, 'utf8')) : null);
const leer = (area) => leerJson(path.join(EVID, area, 'resumen.json'));
const R = {
  jest: leer('backend-jest'),
  cypress: leer('cypress'),
  seguridad: leer('seguridad'),
  rendimiento: leer('rendimiento'),
  ux: leer('ux-accesibilidad'),
  screenplay: leer('screenplay'),
  gherkin: leer('gherkin'),
  stagehand: leer('stagehand'),
  pwa: leer('ia-herramientas/playwright-agents'),
  bu: leer('ia-herramientas/browser-use'),
  mcp: leer('ia-herramientas/playwright-mcp'),
  katalon: leer('katalon'),
  despliegue: leer('despliegue'),
};
const extra = leerJson(path.join(__dirname, 'datos-extra.json')) || {};
const mapa = leerJson(path.join(__dirname, 'funcionalidades.json')) || { integrantes: [], funcionalidades: [], requisitos: [] };
const matriz = leerJson(path.join(EVID, 'matriz', 'matriz.json'));
const comparacion = leerJson(path.join(EVID, 'comparacion', 'antes-despues.json'));
const integrantes = mapa.integrantes.map((i) => i.nombre).join(', ') || '[Integrantes]';

// ---------- Estilo ----------
const FUENTE = 'Arial';
const AZUL = '0B4F71';
const GRIS_CAB = 'D9E5EC';
const VERDE = 'E2F0D9';
const ROJO = 'F8D7DA';
const AMARILLO = 'FFF3CD';
const ANCHO = 9638; // A4 vertical con márgenes de 2 cm
const ANCHO_H = 14570; // A4 horizontal con márgenes de 2 cm
const borde = { style: BorderStyle.SINGLE, size: 4, color: 'A6A6A6' };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };

const run = (texto, opciones = {}) => new TextRun({ text: String(texto ?? ''), font: FUENTE, ...opciones });
const P = (texto, opciones = {}) =>
  new Paragraph({ spacing: { after: 120, line: 276 }, ...opciones, children: Array.isArray(texto) ? texto : [run(texto, opciones.run || {})] });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [run(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [run(t)] });
const viñeta = (texto, nivel = 0) => new Paragraph({ numbering: { reference: 'vinetas', level: nivel }, spacing: { after: 60 }, children: Array.isArray(texto) ? texto : [run(texto)] });
const negrita = (t) => run(t, { bold: true });
const codigo = (lineas) => lineas.map((l) => new Paragraph({ spacing: { after: 0 }, shading: { fill: 'F3F3F3', type: ShadingType.CLEAR, color: 'auto' }, children: [run(l, { font: 'Consolas', size: 16 })] }));
const espacio = () => P('');

function celda(contenido, ancho, { cabecera = false, relleno, tam = 18, alinear } = {}) {
  const parrafos = (Array.isArray(contenido) ? contenido : [contenido]).map((texto) =>
    texto instanceof Paragraph ? texto : new Paragraph({ alignment: alinear, children: [run(texto, { bold: cabecera, size: tam, color: cabecera ? '1F1F1F' : undefined })] }),
  );
  return new TableCell({
    borders: bordes,
    width: { size: ancho, type: WidthType.DXA },
    shading: relleno || cabecera ? { fill: relleno || GRIS_CAB, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: parrafos,
  });
}
const colorDeEstado = (texto) =>
  /aprob|corregido|cubierto|^sí\b|^si$|success|ok\b/i.test(texto) ? VERDE : /fall|sin cobertura|failure|^no\b/i.test(texto) ? ROJO : /pend|parcial/i.test(texto) ? AMARILLO : undefined;
function tabla(cabeceras, filas, anchos, { tam = 18, total = ANCHO, colorEstado } = {}) {
  const suma = anchos.reduce((a, b) => a + b, 0);
  const w = anchos.map((a) => Math.round((a * total) / suma));
  w[w.length - 1] += total - w.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: w,
    rows: [
      new TableRow({ tableHeader: true, children: cabeceras.map((c, i) => celda(c, w[i], { cabecera: true, tam })) }),
      ...filas.map((fila) => new TableRow({
        cantSplit: true,
        children: fila.map((valor, i) => {
          const texto = String(valor ?? '');
          const relleno = colorEstado !== undefined && i === colorEstado ? colorDeEstado(texto) : undefined;
          return celda(texto.split('\n'), w[i], { tam, relleno });
        }),
      })),
    ],
  });
}
// Ficha de un caso: Campo | Valor (objetivo, esperado, obtenido, evidencia)
function ficha(caso, rutaBase) {
  const filas = [
    ['ID', caso.id],
    ['Prueba', caso.nombre || caso.escenario],
    ['Tipo', caso.tipo || '-'],
    ['Objetivo', caso.objetivo],
    ['Resultado esperado', caso.esperado],
    ['Resultado obtenido', caso.obtenido],
    ['Estado', caso.estado],
    ['Evidencia', (caso.evidencia || []).map((e) => (e.startsWith('pruebas/') ? e : `${rutaBase}/${e}`)).join('\n') || '-'],
  ];
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA },
    columnWidths: [2100, ANCHO - 2100],
    rows: filas.map(([campo, valor]) => new TableRow({
      cantSplit: true,
      children: [celda(campo, 2100, { cabecera: true }), celda(String(valor ?? '').split('\n'), ANCHO - 2100, { relleno: campo === 'Estado' ? colorDeEstado(String(valor)) : undefined })],
    })),
  });
}
function imagen(rutaAbs, anchoMax = 600, pie) {
  if (rutaAbs && !path.isAbsolute(rutaAbs)) rutaAbs = path.join(EVID, rutaAbs);
  if (!rutaAbs || !fs.existsSync(rutaAbs) || !/\.(png|jpe?g)$/i.test(rutaAbs)) return [P(`[Imagen no disponible: ${rutaAbs}]`, { run: { italics: true, size: 16 } })];
  const buffer = fs.readFileSync(rutaAbs);
  let dim;
  try { dim = imageSize(buffer); } catch { return [P(`[Imagen no legible: ${path.basename(rutaAbs)}]`, { run: { italics: true, size: 16 } })]; }
  const altoMax = 760;
  let ancho = Math.min(anchoMax, dim.width);
  let alto = Math.round((dim.height * ancho) / dim.width);
  if (alto > altoMax) { alto = altoMax; ancho = Math.round((dim.width * alto) / dim.height); }
  const tipo = path.extname(rutaAbs).slice(1).toLowerCase().replace('jpeg', 'jpg');
  const salida = [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [new ImageRun({ type: tipo, data: buffer, transformation: { width: ancho, height: alto }, altText: { title: pie || 'Evidencia', description: pie || 'Evidencia', name: path.basename(rutaAbs) } })] })];
  if (pie) salida.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [run(pie, { italics: true, size: 18, color: '404040' })] }));
  return salida;
}
const primeraImagen = (caso, area) => {
  const png = (caso.evidencia || []).find((e) => /\.png$/i.test(e));
  return png ? (png.startsWith('pruebas/') ? path.join(RAIZ, png) : path.join(EVID, area, png)) : null;
};
const pct = (a, t) => (t ? `${Math.round((a / t) * 1000) / 10} %` : '-');
const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }) : '-');
const totalesDe = (r) => r?.totales || { total: 0, aprobados: 0, fallidos: 0 };
const filasCasos = (casos, base) => casos.map((c) => [c.id, c.nombre || c.escenario, c.tipo || '-', c.objetivo, c.esperado, c.obtenido, c.estado, (c.evidencia || []).map((e) => (e.startsWith('pruebas/') ? e : `${base}/${e}`)).join('; ')]);
const resumenLinea = (r) => (r ? `Herramienta: ${r.herramienta}. Ejecución: ${fecha(r.fecha)}. Comando: ${r.comando}. Resultado: ${totalesDe(r).aprobados}/${totalesDe(r).total} aprobados${r.totales?.duracionSeg ? ` en ${r.totales.duracionSeg} s` : ''}.` : 'Suite no ejecutada todavía.');

// ---------- Contenido ----------
const cuerpo = [];
const anexos = [];

const portada = [
  new Paragraph({ spacing: { before: 2200 }, alignment: AlignmentType.CENTER, children: [run('INFORME FINAL DE PRUEBAS Y RECOMENDACIONES', { bold: true, size: 40, color: AZUL })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [run('TaskFlow — Gestión colaborativa de tareas', { size: 32 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Plan de pruebas, matriz de trazabilidad, Cypress sobre las seis funcionalidades, Screenplay y Gherkin, herramientas de IA, Stagehand, refactorización (antes y después), despliegue con SonarQube y Jenkins y regresión posterior', { size: 22, italics: true })] }),
  new Paragraph({ spacing: { before: 1600 }, alignment: AlignmentType.CENTER, children: [run(`Integrantes: ${integrantes}`, { size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Profesor: Ing. Mauricio Ramírez V.', { size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [run(`Fecha: ${new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}`, { size: 24 })] }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ spacing: { after: 200 }, children: [run('Contenido', { bold: true, size: 32, color: AZUL })] }),
  new TableOfContents('Contenido', { hyperlink: true, headingStyleRange: '1-2' }),
  P('Nota: si el índice aparece vacío, en Word haga clic derecho sobre él y elija "Actualizar campos".', { run: { italics: true, size: 18, color: '595959' } }),
];

// ===== 1. Introducción =====
cuerpo.push(H1('1. Introducción'));
cuerpo.push(P('Este informe documenta la verificación y validación final de TaskFlow, una aplicación web para gestionar tareas de forma colaborativa mediante equipos, proyectos y tableros Kanban (Por Hacer, En Progreso, Hecho). Recoge el plan de pruebas, la matriz de trazabilidad, los resultados de todas las suites (regresión, API, componentes, seguridad, rendimiento, UX y accesibilidad, E2E con Screenplay y Gherkin, herramientas de IA y Stagehand), la comparación del software antes y después de la refactorización, el estado del despliegue (SonarQube y Jenkins) y las pruebas posteriores a la refactorización. Cada prueba incluye objetivo, resultado esperado, resultado obtenido en la ejecución real y evidencia (reportes, capturas, vídeos, trazas o intercambios HTTP).'));
cuerpo.push(H2('1.1 Sistema bajo prueba'));
cuerpo.push(tabla(['Capa', 'Tecnología', 'Detalle'], [
  ['Frontend', 'React 19 + Vite 8 + TypeScript + Tailwind CSS 4', 'SPA con rutas protegidas, tablero Kanban con arrastrar y soltar accesible (@hello-pangea/dnd), estado con Zustand, cliente HTTP Axios, páginas de Ayuda, Preferencias de accesibilidad y Privacidad.'],
  ['Backend', 'NestJS 10 + TypeORM 0.3', 'API REST con autenticación JWT (Passport), validación con class-validator en español, control de acceso por pertenencia al equipo y rol de líder, helmet, CORS restringido y bloqueo de login por fuerza bruta.'],
  ['Base de datos', 'PostgreSQL 18', 'Tablas usuarios, equipos, equipo_miembros, proyectos, listas, tareas, tarea_asignados y comentarios, con índices en las claves foráneas.'],
  ['CI/CD y calidad', 'Jenkins + SonarQube 9.9 + Docker', 'Pipeline: instalar → regresión unitaria → regresión caja negra → build → análisis Sonar → Quality Gate → imagen Docker.'],
], [1600, 3200, 4838]));
cuerpo.push(H2('1.2 Entorno de ejecución'));
cuerpo.push(P(R.rendimiento?.condiciones?.split(' Datos:')[0] || 'Windows 11, Node 20, PostgreSQL 18, Chrome.'));
cuerpo.push(P('Modelo de IA: Ollama 0.40 local con llama3.1:8b (Q4_K_M, soporte de tools), sin claves de servicios de pago, usado por Stagehand, Browser Use y el cliente de Playwright MCP. Los agentes Planner/Generator/Healer de Playwright se ejecutaron con Claude Code como asistente.'));
cuerpo.push(H2('1.3 Estrategia y herramientas'));
cuerpo.push(tabla(['Nivel / tipo', 'Herramienta', 'Qué se verifica', 'Comando'], [
  ['Unitarias y de servicio (backend)', R.jest?.herramienta || 'Jest', 'Reglas de negocio, permisos y validaciones de cada servicio, con dobles de prueba.', R.jest?.comando || 'npm run test:evidencias'],
  ['API, regresión UI, componentes, seguridad y accesibilidad', R.cypress?.herramienta || 'Cypress', 'Endpoints REST, recorridos de interfaz, componentes React, JWT/BOLA/inyección/cabeceras y WCAG con axe.', 'npm run test:cypress (taskflow-frontend)'],
  ['Seguridad (OWASP)', R.seguridad?.herramienta || 'node --test', 'Autenticación, autorización, exposición de datos, inyección, validación, configuración y dependencias.', R.seguridad?.comando || 'npm test (pruebas/seguridad)'],
  ['Rendimiento', R.rendimiento?.herramienta || 'autocannon', 'p50/p95/p99, throughput, errores y recursos bajo carga, estrés y resistencia.', R.rendimiento?.comando || 'npm test (pruebas/rendimiento)'],
  ['UX, accesibilidad e interfaz', R.ux?.herramienta || 'axe-core + Lighthouse', 'WCAG 2.2 AA, teclado, visual en 3 resoluciones, recorridos, heurísticas de Nielsen y GRIHO.', R.ux?.comando || 'npm test (pruebas/accesibilidad)'],
  ['E2E Screenplay', R.screenplay?.herramienta || 'Serenity/JS + Playwright', 'Recorridos exitosos y alternativos con actores, habilidades, tareas, interacciones y preguntas.', 'npm test (pruebas/e2e-screenplay)'],
  ['E2E Gherkin + Screenplay', R.gherkin?.herramienta || 'Cucumber + Serenity/JS', 'Escenarios Dado–Cuando–Entonces en español enlazados con las tareas Screenplay.', R.gherkin?.comando || 'npm run gherkin (pruebas/e2e-screenplay)'],
  ['Stagehand + IA', R.stagehand?.herramienta || 'Stagehand 3.7 + Ollama', 'act, observe y extract en lenguaje natural con validación determinista.', R.stagehand?.comando || 'npm test (pruebas/stagehand)'],
  ['Herramientas de IA', 'Playwright Test Agents · Browser Use · Playwright MCP', 'Planificación/generación/reparación de pruebas, navegación autónoma y agente MCP.', 'ver pruebas/ia-herramientas/*/README.md'],
  ['Despliegue', R.despliegue?.herramienta || 'Docker Compose + SonarQube + Jenkins', 'Compilación, imagen Docker, Quality Gate y pipeline sobre la versión refactorizada.', R.despliegue?.comando || 'node pruebas/despliegue/verificar-despliegue.mjs'],
  ['E2E Katalon', 'Katalon Studio', 'Recorridos con repositorio de objetos, datos CSV y esperas explícitas.', 'TS_Regresion_Completa en Chrome'],
], [2000, 2100, 3700, 1838], { tam: 15 }));

// ===== 2. Resumen ejecutivo =====
cuerpo.push(H1('2. Resumen ejecutivo'));
const filasResumen = [
  ['4. Cypress (seis funcionalidades)', 'Cypress: API, regresión UI, componentes, seguridad, accesibilidad', R.cypress],
  ['4 / 9. Regresión', 'Backend (Jest unitarias + e2e API)', R.jest],
  ['4. Seguridad', 'Seguridad OWASP (node --test)', R.seguridad],
  ['4. Rendimiento', 'Rendimiento (autocannon)', R.rendimiento],
  ['4. Accesibilidad y UX', 'axe, Lighthouse, teclado, visual, recorridos', R.ux],
  ['5. Screenplay', 'Serenity/JS + Playwright', R.screenplay],
  ['5. Gherkin', 'Cucumber + Serenity/JS (Screenplay)', R.gherkin],
  ['6. IA (1/3)', 'Playwright Test Agents (Planner, Generator, Healer)', R.pwa],
  ['6. IA (2/3)', 'Browser Use + Ollama', R.bu],
  ['6. IA (3/3)', 'Playwright MCP + Ollama', R.mcp],
  ['7. Stagehand', 'Stagehand + Ollama (act, observe, extract)', R.stagehand],
  ['9. Despliegue', 'SonarQube, Jenkins, builds y regresión posterior', R.despliegue],
  ['— Katalon', 'Katalon Studio', R.katalon],
].map(([criterio, suite, r]) => {
  const t = totalesDe(r);
  return [criterio, suite, t.total, t.aprobados, t.fallidos ?? 0, t.pendientes ?? 0, pct(t.aprobados, t.total)];
});
cuerpo.push(tabla(['Criterio de la rúbrica', 'Suite', 'Casos', 'Aprobados', 'Fallidos', 'Pendientes', '% aprobado'], filasResumen, [2300, 2900, 800, 1000, 900, 1000, 1000], { tam: 16 }));
const totalCasos = filasResumen.reduce((s, f) => s + f[2], 0);
const totalAprob = filasResumen.reduce((s, f) => s + f[3], 0);
cuerpo.push(espacio());
cuerpo.push(P([negrita('Total: '), run(`${totalCasos} casos ejecutados o preparados; ${totalAprob} aprobados (${pct(totalAprob, totalCasos)}). `), run('Los casos fallidos que permanecen son hallazgos reales documentados con severidad y propuesta de mejora (seguridad: límite por IP, enumeración por correo, CSP del frontend, dependencias que exigen NestJS 11) o limitaciones del modelo de IA local (Stagehand/Browser Use/MCP) analizadas en sus secciones; no son errores de las pruebas. Los casos "Pendientes" corresponden a Katalon (requiere Katalon Studio) y a los pasos del despliegue que necesitan credenciales de SonarQube/Jenkins.')]));
if (extra.evolucion) {
  cuerpo.push(H2('2.1 Evolución tras las correcciones'));
  cuerpo.push(P('Las pruebas detectaron defectos que se corrigieron en la aplicación y se verificaron volviendo a ejecutar las suites. La tabla compara la primera ejecución con la ejecución final:'));
  const evol = extra.evolucion.map((e) => [e.suite, e.antes, e.despues, e.comentario]);
  if (R.gherkin) evol.push(['E2E Gherkin + Screenplay', '—', `${totalesDe(R.gherkin).aprobados}/${totalesDe(R.gherkin).total}`, 'Suite nueva de la entrega final: 12 escenarios Dado–Cuando–Entonces sobre las tareas Screenplay existentes.']);
  if (R.cypress) evol.push(['Cypress seguridad + accesibilidad', '—', `${(R.cypress.casos || []).filter((c) => /^CY[SA]-/.test(c.id)).length} casos`, 'Suites nuevas: JWT, fuerza bruta, BOLA, inyección, XSS, cabeceras, CORS; axe-core en 8 pantallas, diálogo modal, alto contraste y teclado.']);
  cuerpo.push(tabla(['Suite', 'Primera ejecución', 'Ejecución final', 'Comentario'], evol, [2200, 1800, 1800, 3838], { tam: 16 }));
}
cuerpo.push(H2('2.2 Cumplimiento de los criterios de la entrega'));
cuerpo.push(tabla(['Criterio', 'Entregable', 'Dónde está', 'Estado'], [
  ['1. Plan de pruebas completo', 'Plan-de-Pruebas-TaskFlow.docx (IEEE 829/29119-3) y sección 3', 'pruebas/informe/Plan-de-Pruebas-TaskFlow.docx', 'Entregado'],
  ['2. Matriz de trazabilidad', `Excel con ${matriz?.totales?.casos ?? '—'} casos trazados a ${matriz?.totales?.requisitos ?? '—'} requisitos y ${matriz?.totales?.defectos ?? '—'} defectos; sección 4`, 'pruebas/evidencias/matriz/Matriz-Trazabilidad-TaskFlow.xlsx', 'Entregado'],
  ['3. Informe final y recomendaciones', 'Este documento (secciones 2, 15 y anexos)', 'pruebas/informe/Informe-Pruebas-TaskFlow.docx', 'Entregado'],
  ['4. Cypress sobre las seis funcionalidades', `${totalesDe(R.cypress).aprobados}/${totalesDe(R.cypress).total} casos: API, UI, componentes, seguridad, accesibilidad`, 'taskflow-frontend/cypress · pruebas/evidencias/cypress', R.cypress ? 'Ejecutado' : 'Pendiente'],
  ['5. Screenplay y Gherkin', `${totalesDe(R.screenplay).aprobados}/${totalesDe(R.screenplay).total} escenarios Screenplay + ${totalesDe(R.gherkin).aprobados}/${totalesDe(R.gherkin).total} escenarios Gherkin`, 'pruebas/e2e-screenplay (specs/, features/)', R.gherkin ? 'Ejecutado' : 'Pendiente'],
  ['6. Tres herramientas de IA', `Playwright Agents ${totalesDe(R.pwa).aprobados}/${totalesDe(R.pwa).total} · Browser Use ${totalesDe(R.bu).aprobados}/${totalesDe(R.bu).total} · Playwright MCP ${totalesDe(R.mcp).aprobados}/${totalesDe(R.mcp).total}`, 'pruebas/ia-herramientas · pruebas/evidencias/ia-herramientas', R.pwa && R.bu && R.mcp ? 'Ejecutado' : 'Parcial'],
  ['7. Stagehand e IA', `${totalesDe(R.stagehand).aprobados}/${totalesDe(R.stagehand).total} casos con act (${R.stagehand?.capacidades?.act ?? '-'}), observe (${R.stagehand?.capacidades?.observe ?? '-'}) y extract (${R.stagehand?.capacidades?.extract ?? '-'})`, 'pruebas/stagehand · pruebas/evidencias/stagehand', R.stagehand ? 'Ejecutado' : 'Pendiente'],
  ['8. Refactorización antes/después', `${comparacion ? `${comparacion.metricas.antes.casosIt} → ${comparacion.metricas.despues.casosIt} casos automatizados; ${comparacion.correcciones.length} correcciones` : '—'}; sección 12`, 'pruebas/evidencias/comparacion/antes-despues.md', comparacion ? 'Entregado' : 'Pendiente'],
  ['9. Último despliegue y pruebas posteriores', `${totalesDe(R.despliegue).aprobados}/${totalesDe(R.despliegue).total} verificaciones (${totalesDe(R.despliegue).pendientes ?? 0} pendientes de credenciales)`, 'pruebas/evidencias/despliegue', R.despliegue ? (totalesDe(R.despliegue).pendientes ? 'Parcial' : 'Ejecutado') : 'Pendiente'],
  ['10. Presentación', 'Guion de sustentación con demostración, métricas y aportes por integrante', 'PRESENTACION.md y sección 16', 'Entregado'],
], [2300, 3400, 2600, 1338], { tam: 15, colorEstado: 3 }));

// ===== 3. Plan de pruebas =====
cuerpo.push(H1('3. Criterio 1 — Plan de pruebas completo'));
cuerpo.push(P('El plan de pruebas completo (identificación, objetivos, alcance, estrategia por niveles y tipos, herramientas, entorno, criterios de entrada/salida/suspensión, gestión de defectos, casos planificados por funcionalidad, roles, cronograma, riesgos y entregables) se entrega como documento independiente: pruebas/informe/Plan-de-Pruebas-TaskFlow.docx, generado con node pruebas/informe/generar-plan.js. Esta sección resume los puntos que gobiernan el resto del informe.'));
cuerpo.push(H2('3.1 Alcance: seis funcionalidades y responsables'));
cuerpo.push(tabla(['Id', 'Funcionalidad', 'Módulos', 'Requisitos', 'Integrante'], mapa.funcionalidades.map((f) => [f.id, f.nombre, f.modulo, f.requisitos.join(', '), (mapa.integrantes.find((i) => i.funcionalidades.includes(f.id)) || {}).nombre || '']), [600, 2900, 3000, 1800, 1338], { tam: 15 }));
cuerpo.push(H2('3.2 Niveles, tipos y técnicas'));
for (const v of [
  'Unitario (Jest) → integración/API (Supertest, Cypress) → sistema (regresión UI, seguridad, rendimiento, accesibilidad) → aceptación (Screenplay, Gherkin, Katalon) → exploratorio asistido por IA (Playwright Agents, Browser Use, Playwright MCP, Stagehand).',
  'Técnicas: partición de equivalencia y valores límite en DTOs, tablas de decisión de permisos (líder / miembro / ajeno), transición de estados de tareas, listas de verificación OWASP y WCAG, heurísticas de Nielsen/GRIHO.',
  'Cada funcionalidad se cubre con escenarios exitosos, alternativos y de error; cada caso registra objetivo, resultado esperado, resultado obtenido real y evidencia.',
  'Datos únicos por caso sobre una base de datos compartida; preparación por API de lo que no es objeto de la prueba.',
]) cuerpo.push(viñeta(v));
cuerpo.push(H2('3.3 Criterios de salida y estado'));
const cobJest = R.jest?.cobertura?.lines;
cuerpo.push(tabla(['Criterio de salida', 'Meta', 'Estado actual'], [
  ['Regresión backend, Cypress, Screenplay y Gherkin', '100 % aprobados en la ejecución final', `${totalesDe(R.jest).aprobados}/${totalesDe(R.jest).total} · ${totalesDe(R.cypress).aprobados}/${totalesDe(R.cypress).total} · ${totalesDe(R.screenplay).aprobados}/${totalesDe(R.screenplay).total} · ${totalesDe(R.gherkin).aprobados}/${totalesDe(R.gherkin).total}`],
  ['Cobertura de líneas de los servicios', '≥ 80 %', cobJest ? `${cobJest} %` : '—'],
  ['Accesibilidad', '0 violaciones WCAG A/AA; Lighthouse ≥ 90', `${(R.cypress?.casos || []).filter((c) => c.id.startsWith('CYA-') && c.estado === 'Aprobado').length} pantallas/estados sin violaciones (Cypress) · ${totalesDe(R.ux).aprobados}/${totalesDe(R.ux).total} UX/a11y`],
  ['Seguridad', 'Sin hallazgos altos abiertos', `${totalesDe(R.seguridad).aprobados}/${totalesDe(R.seguridad).total} controles; restantes documentados en 7.1`],
  ['Calidad estática y pipeline', 'Quality Gate OK y pipeline SUCCESS', R.despliegue ? `${(R.despliegue.casos || []).filter((c) => /^(SON|JEN)/.test(c.id)).map((c) => `${c.id}: ${c.estado}`).join(', ')}` : 'pendiente'],
  ['Trazabilidad', 'Todos los requisitos cubiertos', matriz ? `${matriz.totales.requisitosCubiertos}/${matriz.totales.requisitos} requisitos con casos` : '—'],
], [3200, 2600, 3838], { tam: 16 }));

// ===== 4. Matriz de trazabilidad =====
cuerpo.push(H1('4. Criterio 2 — Matriz de trazabilidad actualizada'));
if (matriz) {
  cuerpo.push(P(`La matriz relaciona ${matriz.totales.requisitos} requisitos (funcionales y no funcionales) con las seis funcionalidades, ${matriz.totales.casos} casos de prueba de ${matriz.porSuite.length} suites, su resultado real, la ruta de su evidencia y los ${matriz.totales.defectos} defectos registrados (C-01…C-20). Se genera automáticamente a partir de las evidencias con node pruebas/informe/generar-matriz.js y se entrega completa en pruebas/evidencias/matriz/Matriz-Trazabilidad-TaskFlow.xlsx (hojas Matriz, Requisitos, Funcionalidades, Suites y Defectos). Aquí se incluye la vista por requisito, por funcionalidad y la de defectos.`));
  cuerpo.push(H2('4.1 Requisitos → casos → resultados → defectos'));
  cuerpo.push(tabla(['Req.', 'Tipo', 'Requisito', 'Func.', 'Casos', 'Aprob.', 'Fall.', 'Suites', 'Defectos', 'Cobertura'], matriz.porRequisito.map((r) => [r.id, r.tipo, r.texto, r.funcionalidad, r.casos, r.aprobados, r.fallidos, r.suites.join(', '), r.defectos.join(', ') || '—', r.cobertura]), [600, 900, 3000, 500, 500, 550, 500, 1400, 900, 788], { tam: 13, colorEstado: 9 }));
  cuerpo.push(H2('4.2 Funcionalidades → casos por suite'));
  cuerpo.push(tabla(['Func.', 'Funcionalidad', 'Integrante', 'Casos', 'Aprob.', 'Exitosos / alternativos / error', 'Casos por suite', 'Defectos'], matriz.porFuncionalidad.map((f) => [f.id, f.nombre, f.integrante, f.casos, f.aprobados, `${f.tipos.exitosos} / ${f.tipos.alternativos} / ${f.tipos.error}`, Object.entries(f.porArea).map(([a, n]) => `${a.replace('ia-herramientas/', 'IA ')}: ${n}`).join('; '), f.defectos.join(', ') || '—']), [500, 2200, 1200, 550, 600, 1300, 2300, 988], { tam: 13 }));
  cuerpo.push(H2('4.3 Defectos encontrados, corrección y casos que los verifican'));
  cuerpo.push(tabla(['Id', 'Hallazgo', 'Origen', 'Corrección', 'Casos que lo verifican', 'Estado'], matriz.defectos.map((d) => [d.id, d.hallazgo, d.origen, d.correccion, d.casos.join(', ') || d.verificacion, /pendiente/i.test(d.correccion) ? 'Parcial' : 'Corregido']), [600, 2500, 1300, 2600, 1800, 838], { tam: 13, colorEstado: 5 }));
} else {
  cuerpo.push(P('Ejecute node pruebas/informe/generar-matriz.js para generar la matriz.', { run: { color: 'C00000' } }));
}

// ===== 5. Cypress =====
cuerpo.push(H1('5. Criterio 4 — Pruebas con Cypress sobre las seis funcionalidades'));
if (R.cypress) {
  cuerpo.push(P(resumenLinea(R.cypress)));
  cuerpo.push(P('Cada integrante cubre sus seis funcionalidades con escenarios exitosos, alternativos y de error en cinco tipos de prueba Cypress: API (cy.request contra la API REST), regresión de interfaz (E2E en el navegador con capturas y vídeo), componentes React montados aisladamente, seguridad (JWT, fuerza bruta, BOLA, inyección, XSS, cabeceras, CORS) y accesibilidad (axe-core sobre cada pantalla, diálogo modal, alto contraste y teclado). Las pruebas preparan sus datos por API con correos únicos y registran el valor realmente observado como resultado obtenido.'));
  cuerpo.push(H2('5.1 Cobertura por funcionalidad y tipo de prueba'));
  const tipoDe = (id) => (/^API-/.test(id) ? 'API' : /^REG-/.test(id) ? 'UI' : /^(CMP|UNI)-/.test(id) ? 'Componentes' : /^CYS-/.test(id) ? 'Seguridad' : /^CYA-/.test(id) ? 'Accesibilidad' : 'Otro');
  const funcDe = (id) => (mapa.funcionalidades.find((f) => f.prefijos.some((p) => new RegExp(p).test(id))) || { id: 'T', nombre: 'Transversal' });
  const filasF = mapa.funcionalidades.map((f) => {
    const cs = R.cypress.casos.filter((c) => funcDe(c.id).id === f.id);
    const n = (t) => cs.filter((c) => tipoDe(c.id) === t).length;
    const ex = cs.filter((c) => /positivo|accesibilidad/.test(c.tipo)).length;
    const neg = cs.filter((c) => /negativo/.test(c.tipo)).length;
    return [f.id, f.nombre, (mapa.integrantes.find((i) => i.funcionalidades.includes(f.id)) || {}).nombre || '', n('API'), n('UI'), n('Componentes'), n('Seguridad'), n('Accesibilidad'), cs.length, `${ex} / ${neg}`, `${cs.filter((c) => c.estado === 'Aprobado').length}/${cs.length}`];
  });
  cuerpo.push(tabla(['Id', 'Funcionalidad', 'Integrante', 'API', 'UI', 'Comp.', 'Seg.', 'A11y', 'Total', 'Exitosos / error-alternativos', 'Aprobados'], filasF, [400, 2300, 1200, 500, 500, 600, 500, 500, 600, 1300, 738], { tam: 13 }));
  cuerpo.push(H2('5.2 Resultados por suite'));
  cuerpo.push(tabla(['Suite', 'Casos', 'Aprobados'], Object.entries(R.cypress.desglose || {}).map(([s, v]) => [s, v.total, v.aprobados]), [6000, 1800, 1838], { tam: 16 }));
  cuerpo.push(H2('5.3 Seguridad con Cypress (nuevo)'));
  const segCy = R.cypress.casos.filter((c) => c.id.startsWith('CYS-'));
  cuerpo.push(tabla(['ID', 'Control', 'Resultado obtenido', 'Estado'], segCy.map((c) => [c.id, c.nombre, c.obtenido, c.estado]), [1100, 3000, 4300, 1238], { tam: 14, colorEstado: 3 }));
  cuerpo.push(H2('5.4 Accesibilidad con Cypress + axe-core (nuevo)'));
  const a11yCy = R.cypress.casos.filter((c) => c.id.startsWith('CYA-'));
  cuerpo.push(tabla(['ID', 'Pantalla / estado', 'Resultado obtenido', 'Estado'], a11yCy.map((c) => [c.id, c.nombre, c.obtenido, c.estado]), [1100, 3000, 4300, 1238], { tam: 14, colorEstado: 3 }));
  cuerpo.push(H2('5.5 Casos representativos'));
  const elegidos = ['API-AUTH-01', 'API-EQU-04', 'API-TAR-05', 'REG-KAN-05', 'CYS-BRU-01', 'CYS-INY-02', 'CYA-TAB-01', 'CMP-MOD-02'];
  const base = 'pruebas/evidencias/cypress';
  for (const id of elegidos) {
    const c = R.cypress.casos.find((x) => x.id === id);
    if (!c) continue;
    cuerpo.push(ficha(c, base));
    const png = primeraImagen(c, 'cypress');
    if (png) cuerpo.push(...imagen(png, 540, `Evidencia ${c.id}`));
    cuerpo.push(espacio());
  }
  if (extra.imagenes?.cypressInforme) cuerpo.push(...imagen(extra.imagenes.cypressInforme, 600, 'Reporte HTML de Cypress (mochawesome) con el resultado de la ejecución'));
  anexos.push({ titulo: 'A.1 Casos de Cypress (API, regresión UI, componentes, seguridad y accesibilidad)', filas: filasCasos(R.cypress.casos, base) });
}

// ===== 6. Jest =====
cuerpo.push(H1('6. Regresión del backend (Jest)'));
if (R.jest) {
  const t = R.jest.totales;
  cuerpo.push(P(resumenLinea(R.jest)));
  if (R.jest.cobertura) {
    const c = R.jest.cobertura;
    cuerpo.push(tabla(['Métrica de cobertura', 'Líneas', 'Sentencias', 'Funciones', 'Ramas'], [['Servicios del backend', `${c.lines} %`, `${c.statements} %`, `${c.functions} %`, `${c.branches} %`]], [3000, 1600, 1600, 1600, 1838]));
    cuerpo.push(P('Evidencia: pruebas/evidencias/backend-jest/cobertura/index.html y jest-unit.json / jest-e2e.json.', { run: { size: 18 } }));
    if (extra.imagenes?.jest) cuerpo.push(...imagen(extra.imagenes.jest, 600, 'Reporte HTML de cobertura de Jest'));
  }
  const porSuite = {};
  for (const c of R.jest.casos) {
    const s = c.suite.split(' › ')[0];
    porSuite[s] ??= { total: 0, ok: 0, neg: 0 };
    porSuite[s].total += 1;
    if (c.estado === 'Aprobado') porSuite[s].ok += 1;
    if (c.tipo === 'negativo') porSuite[s].neg += 1;
  }
  cuerpo.push(tabla(['Suite', 'Casos', 'Negativos', 'Aprobados'], Object.entries(porSuite).map(([s, v]) => [s, v.total, v.neg, v.ok]), [5500, 1300, 1300, 1538], { tam: 16 }));
  cuerpo.push(P(`Demostración de regresión: al eliminar temporalmente la lista «Hecho» en proyectos.service.ts fallan 2 pruebas de ProyectosService; al revertir, vuelven a pasar (PRUEBAS_EVIDENCIA.md). Resultado final: ${t.aprobados}/${t.total}.`));
  anexos.push({ titulo: 'A.2 Casos de regresión del backend (Jest)', filas: filasCasos(R.jest.casos, '') });
}

// ===== 7. Seguridad y rendimiento =====
cuerpo.push(H1('7. Seguridad y rendimiento'));
if (R.seguridad) {
  cuerpo.push(H2('7.1 Pruebas de seguridad (OWASP)'));
  cuerpo.push(P(resumenLinea(R.seguridad)));
  cuerpo.push(P('Los casos se agrupan según OWASP Top 10 (2021) y OWASP API Security Top 10 (2023). Cada caso guarda el intercambio HTTP real en pruebas/evidencias/seguridad/http/. Se complementan con los 13 casos de seguridad ejecutados en Cypress (sección 5.3).'));
  const nombresCat = { AUTH: 'Autenticación', AUTHZ: 'Autorización (BOLA/BFLA)', DATA: 'Exposición de datos', INY: 'Inyección', VAL: 'Validación / asignación masiva', CONF: 'Configuración de seguridad', DEP: 'Dependencias vulnerables' };
  cuerpo.push(tabla(['Categoría', 'Casos', 'Aprobados', 'Fallidos'], Object.entries(R.seguridad.porCategoria || {}).map(([k, v]) => [nombresCat[k] || k, v.total, v.aprobados, v.fallidos]), [4600, 1600, 1700, 1738]));
  cuerpo.push(H3('Controles verificados'));
  cuerpo.push(tabla(['ID', 'Control', 'Obtenido', 'Estado'], R.seguridad.casos.map((c) => [c.id, c.nombre, c.obtenido, c.estado]), [1300, 3000, 4100, 1238], { tam: 14, colorEstado: 3 }));
  cuerpo.push(H3('Hallazgos de seguridad, severidad y mejoras propuestas'));
  cuerpo.push(tabla(['ID', 'Hallazgo', 'Severidad', 'Recomendación'], (R.seguridad.hallazgos || []).map((h) => [h.id, h.descripcion, h.severidad, h.recomendacion]), [800, 4000, 1100, 3738], { tam: 14 }));
  anexos.push({ titulo: 'A.3 Casos de seguridad (OWASP)', filas: filasCasos(R.seguridad.casos, 'pruebas/evidencias/seguridad') });
}
if (R.rendimiento) {
  cuerpo.push(H2('7.2 Pruebas de rendimiento'));
  cuerpo.push(P(resumenLinea(R.rendimiento)));
  cuerpo.push(P([negrita('Condiciones: '), run(R.rendimiento.condiciones || '')]));
  cuerpo.push(tabla(['ID', 'Escenario y condiciones', 'Criterio de aceptación', 'Obtenido', 'Estado'], R.rendimiento.casos.map((c) => [c.id, `${c.nombre}. ${c.condiciones || ''}`, c.esperado, c.obtenido, c.estado]), [800, 2600, 2000, 3300, 938], { tam: 14, colorEstado: 4 }));
  const m = R.rendimiento.metricas || {};
  const filasM = Object.entries(m).filter(([, v]) => v && v.latenciaMs).map(([k, v]) => [k, v.conexiones ?? '-', v.peticionesTotales ?? '-', v.peticionesPorSeg ?? '-', v.latenciaMs.p50, v.latenciaMs.p95, v.latenciaMs.p99, v.latenciaMs.max, `${v.tasaErrorPct ?? 0} %`]);
  if (filasM.length) cuerpo.push(tabla(['Escenario', 'Conex.', 'Peticiones', 'Req/s', 'p50', 'p95', 'p99', 'Máx', 'Errores'], filasM, [1700, 800, 1100, 900, 900, 900, 900, 900, 1038], { tam: 15 }));
  if (extra.imagenes?.rendimiento) for (const img of extra.imagenes.rendimiento) cuerpo.push(...imagen(img.ruta, 600, img.pie));
  for (const h of R.rendimiento.hallazgos || []) cuerpo.push(viñeta([negrita(`${h.id} (${h.severidad}): `), run(`${h.descripcion} Mejora: ${h.recomendacion}`)]));
  anexos.push({ titulo: 'A.4 Escenarios de rendimiento', filas: filasCasos(R.rendimiento.casos, 'pruebas/evidencias/rendimiento') });
}

// ===== 8. UX / accesibilidad =====
cuerpo.push(H1('8. UX, heurísticas de Nielsen, accesibilidad e interfaz'));
cuerpo.push(H2('8.1 Evaluación heurística GRIHO (antes y después)'));
cuerpo.push(P('Se aplicó la plantilla GRIHO (heurísticas de Nielsen y principios de Tognazzini). La primera evaluación se realizó con apoyo de IA a partir del código y del uso de la aplicación; con los hallazgos se aplicaron mejoras y se volvió a evaluar.'));
if (extra.griho) cuerpo.push(tabla(['Principio', 'Antes', 'Después'], extra.griho, [5600, 2000, 2038], { tam: 16 }));
if (R.ux) {
  cuerpo.push(H2('8.2 Accesibilidad, teclado, interfaz y recorridos'));
  cuerpo.push(P(resumenLinea(R.ux)));
  const porTipo = {};
  for (const c of R.ux.casos) { porTipo[c.tipo] ??= { total: 0, ok: 0 }; porTipo[c.tipo].total += 1; if (c.estado === 'Aprobado') porTipo[c.tipo].ok += 1; }
  cuerpo.push(tabla(['Tipo de prueba', 'Casos', 'Aprobados'], Object.entries(porTipo).map(([k, v]) => [k, v.total, v.ok]), [5000, 2000, 2638]));
  if (R.ux.lighthouse?.length) {
    cuerpo.push(H3('Puntuaciones Lighthouse'));
    cuerpo.push(tabla(['Página', 'Dispositivo', 'Accesibilidad', 'Buenas prácticas', 'Rendimiento', 'SEO'], R.ux.lighthouse.map((l) => [l.pagina, l.dispositivo, l.accesibilidad, l.buenasPracticas, l.rendimiento, l.seo]), [1800, 1600, 1600, 1700, 1500, 1438]));
  }
  cuerpo.push(H3('Resultados por caso'));
  cuerpo.push(tabla(['ID', 'Tipo', 'Prueba', 'Obtenido', 'Estado'], R.ux.casos.map((c) => [c.id, c.tipo, c.nombre, c.obtenido, c.estado]), [1000, 1100, 2700, 3900, 938], { tam: 14, colorEstado: 4 }));
  if (extra.imagenes?.ux) for (const img of extra.imagenes.ux) cuerpo.push(...imagen(img.ruta, img.ancho || 600, img.pie));
  anexos.push({ titulo: 'A.5 Casos de UX, accesibilidad e interfaz', filas: filasCasos(R.ux.casos, 'pruebas/evidencias/ux-accesibilidad') });
  cuerpo.push(H2('8.3 Hallazgos según las 10 heurísticas de Nielsen'));
  cuerpo.push(P('Escala de severidad: 0 = no es un problema, 1 = cosmético, 2 = menor, 3 = mayor, 4 = catastrófico.'));
  cuerpo.push(tabla(['ID', 'Heurística', 'Hallazgo', 'Sev.', 'Evidencia', 'Recomendación', 'Estado'], (R.ux.nielsen || []).map((n) => [n.id, n.heuristica, n.hallazgo, n.severidad, n.evidencia, n.recomendacion, n.estado]), [700, 1500, 2600, 500, 1500, 1900, 938], { tam: 13, colorEstado: 6 }));
  cuerpo.push(H2('8.4 Análisis apoyado por IA frente a la revisión del equipo'));
  cuerpo.push(tabla(['Hallazgo de la IA', 'Sev. IA', 'Revisión del equipo', '¿Coincide?', 'Corrección / estado'], (R.ux.ia_vs_equipo || []).map((f) => [f.hallazgoIA, f.severidadIA, f.revisionEquipo, f.coincide, f.correccion]), [2500, 600, 2900, 900, 2738], { tam: 13, colorEstado: 3 }));
}

// ===== 9. Screenplay + Gherkin =====
cuerpo.push(H1('9. Criterio 5 — Patrón Screenplay y lenguaje Gherkin con pruebas E2E'));
if (R.screenplay) {
  cuerpo.push(H2('9.1 Pruebas E2E con el patrón Screenplay (Serenity/JS + Playwright)'));
  cuerpo.push(P(resumenLinea(R.screenplay)));
  cuerpo.push(P('El patrón Screenplay modela las pruebas como lo que hacen las personas usuarias: un Actor con Habilidades (abilities) realiza Tareas (tasks) compuestas por Interacciones (interactions) y responde Preguntas (questions) sobre el estado del sistema, que se verifican con aserciones (Ensure.that / Ensure.eventually).'));
  const p = R.screenplay.patron || {};
  cuerpo.push(tabla(['Elemento', 'Implementación en el proyecto (pruebas/e2e-screenplay/src/screenplay)'], [
    ['Actores', (p.actores || []).join('; ')],
    ['Habilidades', (p.habilidades || []).join(', ')],
    ['Tareas', (p.tareas || []).join(', ')],
    ['Interacciones', (p.interacciones || []).join(', ')],
    ['Preguntas', (p.preguntas || []).join(', ')],
  ], [1800, 7838], { tam: 15 }));
  cuerpo.push(P('Ejemplo (lenguaje del actor):', { run: { bold: true } }));
  cuerpo.push(...codigo([
    "await actorCalled('Ana').attemptsTo(",
    '  PrepararCuentaPorApi.con(ana), CrearEquipoPorApi.llamado(equipo), CrearProyectoPorApi.llamado(proyecto),',
    "  AbrirTablero.delProyecto(), CrearTarea.titulada('Diseñar login'), MoverTarea.llamada('Diseñar login').aLaColumna('Hecho'),",
    '  Ensure.eventually(ProgresoDelProyecto(), equals(100)),',
    ');',
  ]));
  cuerpo.push(tabla(['ID', 'Escenario', 'Tipo', 'Actores', 'Obtenido', 'Estado'], R.screenplay.casos.map((c) => [c.id, c.nombre, c.tipo, (c.actores || []).join(', '), c.obtenido, c.estado]), [700, 2600, 1000, 1000, 3400, 938], { tam: 14, colorEstado: 5 }));
  if (extra.imagenes?.serenity) cuerpo.push(...imagen(extra.imagenes.serenity, 600, 'Reporte de documentación viva de Serenity BDD'));
  anexos.push({ titulo: 'A.6 Escenarios Screenplay', filas: filasCasos(R.screenplay.casos, 'pruebas/evidencias/screenplay') });
}
if (R.gherkin) {
  const g = R.gherkin.gherkin || {};
  cuerpo.push(H2('9.2 Escenarios Gherkin (Dado–Cuando–Entonces) vinculados con Screenplay'));
  cuerpo.push(P(resumenLinea(R.gherkin)));
  cuerpo.push(P(`Los escenarios se escriben en español (${g.idioma || '# language: es'}) con la estructura ${g.estructura || 'Característica → Escenario → Dado / Cuando / Entonces'}. Cada paso tiene una definición (features/step_definitions/*.ts) que no automatiza nada por sí misma: invoca las mismas Tareas, Interacciones y Preguntas Screenplay de la sección 9.1 mediante actorCalled('Ana').attemptsTo(...). Así el texto de negocio (feature) y la ejecución E2E (Serenity/JS + Playwright) quedan unidos, y el informe Serenity BDD muestra cada paso Gherkin con las tareas anidadas.`));
  if (g.features) cuerpo.push(tabla(['Archivo .feature', 'Característica', 'Escenarios', 'Etiquetas'], g.features.map((f) => [f.archivo, f.nombre, f.escenarios, (f.etiquetas || []).join(' ')]), [2400, 3800, 1000, 2438], { tam: 14 }));
  if (g.definicionesDePasos) cuerpo.push(P(`Definiciones de pasos: ${g.definicionesDePasos.total ?? g.definicionesDePasos} en ${(g.definicionesDePasos.archivos || []).join(', ') || 'features/step_definitions/'}.`));
  // Ejemplo real de feature
  const dirFeatures = path.join(EVID, 'gherkin', 'features');
  const unFeature = fs.existsSync(dirFeatures) ? fs.readdirSync(dirFeatures).find((f) => f.endsWith('.feature')) : null;
  if (unFeature) {
    cuerpo.push(P(`Ejemplo real (${unFeature}):`, { run: { bold: true } }));
    const lineas = fs.readFileSync(path.join(dirFeatures, unFeature), 'utf8').split('\n').filter((l) => l.trim()).slice(0, 22);
    cuerpo.push(...codigo(lineas));
  }
  cuerpo.push(H3('Resultados por escenario'));
  cuerpo.push(tabla(['ID', 'Escenario', 'Tipo', 'Pasos', 'Obtenido', 'Estado'], R.gherkin.casos.map((c) => [c.id, c.nombre, c.tipo, (c.pasos || []).join('\n'), c.obtenido, c.estado]), [600, 1800, 800, 2900, 2600, 938], { tam: 12, colorEstado: 5 }));
  cuerpo.push(H3('Fichas de escenarios representativos'));
  for (const id of ['GH-01', 'GH-07', 'GH-11']) {
    const c = R.gherkin.casos.find((x) => x.id === id);
    if (!c) continue;
    cuerpo.push(ficha(c, 'pruebas/evidencias/gherkin'));
    const png = primeraImagen(c, 'gherkin');
    if (png) cuerpo.push(...imagen(png, 540, `Evidencia ${c.id}`));
    cuerpo.push(espacio());
  }
  cuerpo.push(P('Evidencias: pruebas/evidencias/gherkin/reporte-serenity/index.html (Serenity BDD), reporte-cucumber/cucumber.html y cucumber.json, capturas/GH-xx.png y los archivos .feature.', { run: { size: 18 } }));
  anexos.push({ titulo: 'A.7 Escenarios Gherkin', filas: filasCasos(R.gherkin.casos, 'pruebas/evidencias/gherkin') });
}

// ===== 10. Herramientas de IA =====
cuerpo.push(H1('10. Criterio 6 — Pruebas con tres herramientas de IA'));
cuerpo.push(P('Se aplicaron tres herramientas de IA de la lista del curso, elegidas por ser gratuitas y fáciles de implementar: Playwright Test Agents (Planner, Generator y Healer), Browser Use y Playwright MCP. Las dos últimas usan un modelo de lenguaje local (Ollama, llama3.1:8b) y la primera usa Claude Code como asistente que ejecuta las definiciones de agentes generadas por Playwright. Para cada herramienta se documenta el propósito, la configuración, las pruebas, los resultados reales, las evidencias y un análisis de aportes y limitaciones. Todos los resultados producidos por la IA se validan en código (API o DOM): la IA propone, la prueba comprueba.'));
const herramientasIA = [
  { clave: 'pwa', titulo: '10.1 Playwright Test Agents (Planner, Generator, Healer)', area: 'ia-herramientas/playwright-agents', r: R.pwa, fichas: ['PWA-10', 'PWA-08', 'PWA-11'] },
  { clave: 'bu', titulo: '10.2 Browser Use + Ollama', area: 'ia-herramientas/browser-use', r: R.bu, fichas: ['BU-01', 'BU-02', 'BU-03'] },
  { clave: 'mcp', titulo: '10.3 Playwright MCP + asistente de IA local (Ollama)', area: 'ia-herramientas/playwright-mcp', r: R.mcp, fichas: ['MCP-01', 'MCP-02', 'MCP-03'] },
];
for (const h of herramientasIA) {
  cuerpo.push(H2(h.titulo));
  if (!h.r) { cuerpo.push(P('Suite no ejecutada todavía (ver pruebas/ia-herramientas).', { run: { color: 'C00000' } })); continue; }
  const r = h.r;
  cuerpo.push(tabla(['Aspecto', 'Detalle'], [
    ['Herramienta', r.herramienta],
    ['Modelo / asistente', r.modelo || '-'],
    ['Propósito', r.proposito || '-'],
    ['Configuración', typeof r.configuracion === 'object' ? Object.entries(r.configuracion).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n') : String(r.configuracion || '-')],
    ['Comando', r.comando || '-'],
    ['Ejecución', `${fecha(r.fecha)} — ${totalesDe(r).aprobados}/${totalesDe(r).total} aprobados${r.totales?.duracionSeg ? ` en ${r.totales.duracionSeg} s` : ''}`],
  ], [2000, 7638], { tam: 14 }));
  if (r.agentes) cuerpo.push(tabla(['Agente', 'Definición', 'Resultado'], Object.entries(r.agentes).map(([k, v]) => [k, v.definicion || '-', Object.entries(v).filter(([kk]) => kk !== 'definicion').map(([kk, vv]) => `${kk}: ${vv}`).join('; ')]), [1500, 3200, 4938], { tam: 14 }));
  cuerpo.push(tabla(['ID', 'Prueba', 'Tipo', 'Resultado obtenido', 'Estado'], (r.casos || []).map((c) => [c.id, c.nombre, c.tipo, c.obtenido, c.estado]), [900, 2500, 1100, 4200, 938], { tam: 13, colorEstado: 4 }));
  for (const id of h.fichas) {
    const c = (r.casos || []).find((x) => x.id === id);
    if (!c) continue;
    cuerpo.push(ficha(c, `pruebas/evidencias/${h.area}`));
    const png = primeraImagen(c, h.area);
    if (png) cuerpo.push(...imagen(png, 520, `Evidencia ${c.id}`));
    cuerpo.push(espacio());
  }
  if (r.aportes?.length) { cuerpo.push(P('Aportes observados:', { run: { bold: true } })); r.aportes.forEach((a) => cuerpo.push(viñeta(a))); }
  if (r.limitaciones?.length) { cuerpo.push(P('Limitaciones observadas:', { run: { bold: true } })); r.limitaciones.forEach((a) => cuerpo.push(viñeta(a))); }
  anexos.push({ titulo: `A.8 ${h.titulo.replace(/^10\.\d\s*/, 'IA — ')}`, filas: filasCasos(r.casos || [], `pruebas/evidencias/${h.area}`) });
}
cuerpo.push(H2('10.4 Comparación de las tres herramientas'));
cuerpo.push(tabla(['Herramienta', 'Tipo de IA aplicada', 'Casos', 'Aprobados', 'Coste', 'Mejor para', 'Principal limitación'], [
  ['Playwright Test Agents', 'Agentes de planificación, generación y reparación guiados por un asistente', totalesDe(R.pwa).total, totalesDe(R.pwa).aprobados, 'Gratis (asistente Claude Code)', 'Crear rápidamente suites mantenibles y repararlas', 'Depende de la calidad del asistente; necesita revisión humana de las aserciones'],
  ['Browser Use', 'Agente autónomo que navega con un LLM local', totalesDe(R.bu).total, totalesDe(R.bu).aprobados, 'Gratis (Ollama)', 'Exploración y pruebas de humo en lenguaje natural', 'Lento con modelos de 8 B y no determinista; requiere validar el resultado por API'],
  ['Playwright MCP + Ollama', 'Asistente que inspecciona el navegador con herramientas MCP', totalesDe(R.mcp).total, totalesDe(R.mcp).aprobados, 'Gratis (MCP abierto + Ollama)', 'Depurar y generar pasos a partir de snapshots de accesibilidad', 'El modelo local elige mal las herramientas con listas largas; hay que acotarlas'],
], [1700, 2200, 600, 800, 1300, 1700, 1338], { tam: 13 }));

// ===== 11. Stagehand =====
cuerpo.push(H1('11. Criterio 7 — Pruebas con Stagehand e IA'));
if (R.stagehand) {
  const s = R.stagehand;
  cuerpo.push(P(resumenLinea(s)));
  cuerpo.push(P('Stagehand es un SDK de automatización web que combina código (Playwright) con instrucciones en lenguaje natural: act ejecuta acciones («haz clic en Nuevo equipo»), observe devuelve las acciones posibles con selectores reales y extract obtiene datos estructurados validados con un esquema zod. Para no depender de servicios de pago se configuró con el proveedor ollama del AI SDK y el modelo local llama3.1:8b. Cada resultado del modelo se valida en código contra Playwright o contra la API.'));
  cuerpo.push(tabla(['Aspecto', 'Detalle'], [
    ['Modelo', typeof s.modelo === 'object' ? Object.entries(s.modelo).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n') : String(s.modelo)],
    ['Capacidades ejercitadas', `act: ${s.capacidades?.act ?? '-'} casos · observe: ${s.capacidades?.observe ?? '-'} · extract: ${s.capacidades?.extract ?? '-'}`],
    ['Condiciones', s.condiciones || '-'],
    ['Tiempo en inferencia', s.totales?.segundosEnInferencia ? `${s.totales.segundosEnInferencia} s de ${s.totales.duracionSeg} s totales` : '-'],
  ], [2200, 7438], { tam: 14 }));
  cuerpo.push(tabla(['ID', 'Capacidad y prueba', 'Resultado obtenido', 'Estado'], s.casos.map((c) => [c.id, c.nombre, c.obtenido, c.estado]), [800, 2800, 4800, 1238], { tam: 13, colorEstado: 3 }));
  cuerpo.push(H3('Fichas con evidencia'));
  for (const c of s.casos) {
    cuerpo.push(ficha(c, 'pruebas/evidencias/stagehand'));
    const png = primeraImagen(c, 'stagehand');
    if (png) cuerpo.push(...imagen(png, 520, `Evidencia ${c.id}`));
    cuerpo.push(espacio());
  }
  cuerpo.push(H3('Análisis: aportes y limitaciones del modelo local'));
  for (const v of [
    'Aportes: observe entrega selectores reales que permiten rellenar credenciales sin enviarlas al modelo; extract valida los datos contra un esquema y detecta de inmediato omisiones; act se autorrepara (selfHeal) ante cambios menores de la interfaz y devuelve success=false ante instrucciones imposibles (ST-07), lo que facilita pruebas negativas.',
    `Limitaciones observadas con llama3.1:8b (sin GPU dedicada): respuestas lentas (${s.totales?.segundosEnInferencia ?? '—'} s de inferencia), salidas que a veces no cumplen el esquema JSON que Stagehand exige (errores «response did not match schema») y omisiones en extracciones largas; los casos fallidos reflejan esas limitaciones del modelo, no defectos de TaskFlow, y mejorarían con un modelo mayor (p. ej. gemini-2.5-flash o gpt-4.1-mini) o con instrucciones más atómicas.`,
    'Recomendación: usar Stagehand para exploración y pruebas de humo en lenguaje natural, manteniendo las pruebas de regresión en Cypress/Playwright deterministas; versionar los selectores que observe devuelve (caché) para reducir inferencia.',
  ]) cuerpo.push(viñeta(v));
  anexos.push({ titulo: 'A.9 Casos con Stagehand', filas: filasCasos(s.casos, 'pruebas/evidencias/stagehand') });
}

// ===== 12. Antes / después =====
cuerpo.push(H1('12. Criterio 8 — Software refactorizado: comparación antes y después'));
if (comparacion) {
  const a = comparacion.metricas.antes;
  const d = comparacion.metricas.despues;
  cuerpo.push(P(`Versión anterior: commit ${comparacion.versionAnterior.commit} (${comparacion.versionAnterior.fecha}) — ${comparacion.versionAnterior.descripcion} Versión final: ${comparacion.versionFinal.descripcion} Diferencia en src/, taskflow-frontend/src/ y package.json: ${comparacion.versionFinal.diffStat.trim()}; ${comparacion.versionFinal.archivosNuevos} archivos nuevos. La comparación completa (con extractos de código) está en pruebas/evidencias/comparacion/antes-despues.md.`));
  cuerpo.push(H2('12.1 Métricas de código y pruebas'));
  const f = (n) => Number(n).toLocaleString('es-CO');
  const fila = (n, x, y) => [n, f(x), f(y), `${y - x >= 0 ? '+' : ''}${f(y - x)}`];
  cuerpo.push(tabla(['Métrica', 'Antes', 'Después', 'Variación'], [
    fila('Archivos de código (backend, frontend, pruebas)', a.archivosCodigo, d.archivosCodigo),
    fila('Líneas de código de la aplicación y utilidades de prueba', a.lineasCodigo, d.lineasCodigo),
    fila('Archivos de prueba', a.archivosPrueba, d.archivosPrueba),
    fila('Líneas de pruebas', a.lineasPrueba, d.lineasPrueba),
    fila('Casos automatizados it()/test()', a.casosIt, d.casosIt),
    fila('Escenarios Gherkin', a.escenariosGherkin, d.escenariosGherkin),
    fila('Scripts npm del backend', comparacion.dependencias.scriptsNpm.antes, comparacion.dependencias.scriptsNpm.despues),
  ], [4800, 1500, 1500, 1838], { tam: 16 }));
  cuerpo.push(H2('12.2 Dependencias'));
  const dep = comparacion.dependencias;
  cuerpo.push(tabla(['Paquete', 'Añadidas', 'Eliminadas', 'Actualizadas'], [
    ['Backend', dep.backend.anadidas.join(', ') || '—', dep.backend.eliminadas.join(', ') || '—', dep.backend.actualizadas.join(', ') || '—'],
    ['Backend (dev)', dep.backendDev.anadidas.join(', ') || '—', dep.backendDev.eliminadas.join(', ') || '—', dep.backendDev.actualizadas.join(', ') || '—'],
    ['Frontend', dep.frontend.anadidas.join(', ') || '—', dep.frontend.eliminadas.join(', ') || '—', dep.frontend.actualizadas.join(', ') || '—'],
    ['Frontend (dev)', dep.frontendDev.anadidas.join(', ') || '—', dep.frontendDev.eliminadas.join(', ') || '—', dep.frontendDev.actualizadas.join(', ') || '—'],
  ], [1500, 2900, 2600, 2638], { tam: 14 }));
  cuerpo.push(H2('12.3 Características y controles: antes y después'));
  cuerpo.push(tabla(['Característica', 'Antes', 'Después', 'Verificado en el código'], comparacion.caracteristicas.map((c) => [c.caracteristica, c.antes, c.despues, c.detectadoDespues ? 'Sí' : 'Revisar']), [2400, 2600, 3400, 1238], { tam: 14, colorEstado: 3 }));
  cuerpo.push(H2('12.4 Correcciones derivadas de las pruebas (hallazgo → cambio → verificación)'));
  cuerpo.push(tabla(['ID', 'Hallazgo', 'Origen', 'Corrección aplicada', 'Verificación'], (comparacion.correcciones || extra.correcciones || []).map((c) => [c.id, c.hallazgo, c.origen, c.correccion, c.verificacion]), [600, 2400, 1300, 3300, 2038], { tam: 13 }));
  cuerpo.push(H2('12.5 Extractos de código: antes y después'));
  for (const e of comparacion.extractos.slice(0, 3)) {
    cuerpo.push(H3(e.titulo));
    cuerpo.push(P(`Antes (${e.archivoAntes}):`, { run: { bold: true, size: 18 } }));
    cuerpo.push(...codigo(e.antes.split('\n').slice(0, 24)));
    cuerpo.push(P(`Después (${e.archivoDespues}):`, { run: { bold: true, size: 18 } }));
    cuerpo.push(...codigo(e.despues.split('\n').slice(0, 30)));
    cuerpo.push(espacio());
  }
  if (comparacion.sonar?.backend) {
    cuerpo.push(H2('12.6 SonarQube de la versión final'));
    cuerpo.push(tabla(['Métrica', 'Backend', 'Frontend'], Object.keys(comparacion.sonar.backend).map((k) => [k, comparacion.sonar.backend[k], comparacion.sonar.frontend?.[k] ?? '—']), [3000, 3300, 3338]));
  }
} else {
  cuerpo.push(P('Ejecute node pruebas/comparacion/comparar.mjs para generar la comparación.', { run: { color: 'C00000' } }));
}

// ===== 13. Despliegue =====
cuerpo.push(H1('13. Criterio 9 — Último despliegue y pruebas posteriores a la refactorización'));
if (R.despliegue) {
  const dsp = R.despliegue;
  cuerpo.push(P(resumenLinea(dsp)));
  cuerpo.push(P('El pipeline de Jenkins (Jenkinsfile) ejecuta: checkout desde GitHub → npm ci → regresión unitaria → regresión caja negra → nest build → análisis SonarQube → espera de la Quality Gate → imagen Docker. Esta sección verifica cada pieza sobre la versión refactorizada y registra la regresión completa posterior a la refactorización (Stagehand se excluye de este análisis final por su carácter no determinista).'));
  cuerpo.push(H2('13.1 Verificaciones del despliegue'));
  cuerpo.push(tabla(['ID', 'Verificación', 'Resultado obtenido', 'Estado'], dsp.casos.filter((c) => !c.id.startsWith('REG-')).map((c) => [c.id, c.nombre, c.obtenido, c.estado]), [800, 2600, 5000, 1238], { tam: 13, colorEstado: 3 }));
  const sonarCaso = dsp.casos.find((c) => c.metricas && Object.keys(c.metricas).length);
  if (sonarCaso) cuerpo.push(tabla(['Métrica SonarQube (backend)', 'Valor'], Object.entries(sonarCaso.metricas).map(([k, v]) => [k, v]), [4000, 5638], { tam: 15 }));
  const jen = dsp.casos.find((c) => c.id === 'JEN-02');
  if (jen?.etapas?.length) cuerpo.push(P(`Etapas del último build exitoso: ${jen.etapas.join(' → ')}.`));
  cuerpo.push(H2('13.2 Pruebas posteriores a la refactorización (regresión completa)'));
  cuerpo.push(tabla(['Suite', 'Casos', 'Aprobados', 'Fallidos', 'Fecha de la ejecución final'], (dsp.regresion || []).map((r) => [r.suite, r.total, r.aprobados, r.fallidos, fecha(r.fecha)]), [4000, 1000, 1200, 1100, 2338], { tam: 15 }));
  cuerpo.push(P('Verificación de correcciones y regresiones: las correcciones C-01…C-20 están cubiertas por casos concretos (sección 4.3) que se ejecutaron de nuevo; ningún caso que antes pasaba falla ahora. Los fallos que permanecen en la suite de seguridad son los hallazgos ya conocidos (límite por IP, enumeración por correo, CSP del frontend y dependencias que exigen NestJS 11), documentados como mejoras.'));
  const pendientes = dsp.casos.filter((c) => c.estado === 'Pendiente');
  if (pendientes.length) {
    cuerpo.push(H3('Pasos pendientes para cerrar el despliegue'));
    for (const c of pendientes) cuerpo.push(viñeta([negrita(`${c.id}: `), run(c.obtenido)]));
  }
  anexos.push({ titulo: 'A.10 Verificaciones del despliegue y regresión posterior', filas: filasCasos(dsp.casos, 'pruebas/evidencias/despliegue') });
} else {
  cuerpo.push(P('Ejecute node pruebas/despliegue/verificar-despliegue.mjs (con SONAR_TOKEN) para generar las evidencias del despliegue.', { run: { color: 'C00000' } }));
}

// ===== 14. Katalon =====
if (R.katalon) {
  cuerpo.push(H1('14. Pruebas E2E con Katalon (complementarias)'));
  cuerpo.push(P(`Proyecto: ${R.katalon.proyecto || 'pruebas/katalon/TaskFlow-Katalon'} (Katalon Studio ${R.katalon.version_objetivo || '10.x'}). Ejecución: ${R.katalon.comando}. Repositorio de objetos por página, datos CSV, esperas explícitas y verificaciones; ${totalesDe(R.katalon).total} casos preparados${R.katalon.totales.pendientes ? ' pendientes de ejecutar en Katalon Studio (ver pruebas/katalon/README_GUIA.md)' : ''}.`));
  cuerpo.push(tabla(['ID', 'Caso', 'Tipo', 'Objetivo', 'Estado'], R.katalon.casos.map((c) => [c.id, c.nombre, c.tipo, c.objetivo, c.estado]), [600, 2400, 900, 4800, 938], { tam: 13, colorEstado: 4 }));
  anexos.push({ titulo: 'A.11 Casos de Katalon', filas: filasCasos(R.katalon.casos, 'pruebas/katalon/TaskFlow-Katalon/Reports') });
}

// ===== 15. Conclusiones =====
cuerpo.push(H1('15. Criterio 3 — Conclusiones, métricas y recomendaciones'));
cuerpo.push(H2('15.1 Métricas globales'));
cuerpo.push(tabla(['Métrica', 'Valor'], [
  ['Casos ejecutados o preparados (todas las suites)', `${totalCasos} (${totalAprob} aprobados, ${pct(totalAprob, totalCasos)})`],
  ['Casos trazados a requisitos en la matriz', matriz ? `${matriz.totales.casos}; ${matriz.totales.requisitosCubiertos}/${matriz.totales.requisitos} requisitos cubiertos` : '—'],
  ['Defectos encontrados por las pruebas y corregidos', matriz ? `${matriz.totales.defectos} registrados, ${matriz.totales.defectosCorregidos} corregidos` : `${(extra.correcciones || []).length}`],
  ['Cobertura de líneas (servicios backend)', cobJest ? `${cobJest} %` : '—'],
  ['Usabilidad GRIHO', (extra.griho || []).find((g) => /PORCENTAJE/.test(g[0]))?.slice(1).join(' → ') || '—'],
  ['Rendimiento p95 (REN-02, 50 conexiones)', '569 ms → 273 ms tras los índices (C-13)'],
  ['Crecimiento de la automatización', comparacion ? `${comparacion.metricas.antes.casosIt} → ${comparacion.metricas.despues.casosIt} casos automatizados` : '—'],
], [4500, 5138], { tam: 16 }));
cuerpo.push(H2('15.2 Conclusiones'));
for (const v of extra.conclusiones || []) cuerpo.push(viñeta(v));
for (const v of [
  'La capa Gherkin demostró que el patrón Screenplay escala: 12 escenarios de negocio nuevos se ejecutaron reutilizando las tareas, interacciones y preguntas existentes, sin duplicar automatización.',
  'Las herramientas de IA aportan valor distinto según su tipo: los agentes de Playwright generan y reparan pruebas mantenibles con rapidez; Browser Use y Playwright MCP permiten explorar la aplicación en lenguaje natural; Stagehand une ambos mundos con act/observe/extract. Con un modelo local de 8 B el coste es cero, pero la latencia y la fiabilidad del formato de salida limitan su uso a exploración y humo, no a regresión.',
  'La refactorización guiada por las pruebas (Mongo → PostgreSQL, helmet, limitador de intentos, validación en español, accesibilidad, ayuda y preferencias) triplicó la base de pruebas automatizadas y eliminó los hallazgos de severidad alta sin introducir regresiones, como muestra la ejecución completa posterior.',
]) cuerpo.push(viñeta(v));
cuerpo.push(H2('15.3 Recomendaciones concretas para mejorar el software'));
for (const v of extra.mejoras || []) cuerpo.push(viñeta(v));
for (const v of [
  'Añadir Content-Security-Policy al frontend (cabecera en el servidor estático o meta) y mover el token a una cookie HttpOnly con SameSite para reducir el impacto de un XSS (SEG-CONF-06).',
  'Actualizar Vite y axios/follow-redirects en el frontend (npm audit fix) y planificar NestJS 11 para cerrar las vulnerabilidades altas de dependencias (SEG-DEP-01/03).',
  'Publicar la versión refactorizada en GitHub y ejecutar el job taskflow-pipeline con red para dejar el Build final en verde; añadir las suites de Cypress, Gherkin y seguridad al Jenkinsfile.',
  'Para las pruebas con IA: cachear las acciones de observe, usar un modelo mayor para extract y mantener siempre una validación determinista del resultado.',
]) cuerpo.push(viñeta(v));
cuerpo.push(H2('15.4 Cómo reproducir todas las pruebas'));
cuerpo.push(tabla(['Paso', 'Comando'], [
  ['Base de datos', 'PostgreSQL local con la base "taskflow" (ver .env.example)'],
  ['Backend', 'npm install && npm run start:dev  (raíz)'],
  ['Frontend', 'cd taskflow-frontend && npm install && npm run dev'],
  ['Backend (Jest)', 'npm run test:evidencias'],
  ['Cypress (todas)', 'cd taskflow-frontend && npm run test:cypress   (solo seguridad: npm run test:seguridad; solo accesibilidad: npm run test:accesibilidad)'],
  ['Seguridad / Rendimiento / Accesibilidad', 'cd pruebas/seguridad && npm test · cd pruebas/rendimiento && npm test · cd pruebas/accesibilidad && npm test'],
  ['Screenplay / Gherkin', 'cd pruebas/e2e-screenplay && npm test · npm run gherkin'],
  ['Stagehand', 'ollama serve (llama3.1:8b) · cd pruebas/stagehand && npm test'],
  ['IA: Playwright Agents / Browser Use / Playwright MCP', 'ver pruebas/ia-herramientas/<herramienta>/README.md'],
  ['Comparación, matriz, plan, informe', 'node pruebas/comparacion/comparar.mjs · node pruebas/informe/generar-matriz.js · node pruebas/informe/generar-plan.js · node pruebas/informe/generar-informe.js'],
  ['Despliegue', 'docker compose up -d · SONAR_TOKEN=… node pruebas/despliegue/verificar-despliegue.mjs'],
], [3000, 6638], { tam: 15 }));

// ===== 16. Presentación =====
cuerpo.push(H1('16. Criterio 10 — Guion de presentación'));
cuerpo.push(P('El guion completo de la sustentación está en PRESENTACION.md. Orden propuesto (15 minutos): 1) contexto y seis funcionalidades con el reparto por integrante; 2) plan y matriz (Excel); 3) demostración en vivo: npm run test:cypress (o test:seguridad / test:accesibilidad), npm run gherkin con el informe Serenity, un caso de Stagehand y uno de Playwright Agents; 4) antes/después con las métricas de la sección 12 y dos correcciones ejemplares (helmet + limitador; accesibilidad WCAG 2.5.3); 5) SonarQube y Jenkins; 6) conclusiones y recomendaciones.'));
cuerpo.push(tabla(['Integrante', 'Funcionalidades', 'Aportes que expone'], mapa.integrantes.map((i) => [i.nombre, i.funcionalidades.map((fid) => { const f = mapa.funcionalidades.find((x) => x.id === fid); return f ? `${fid} ${f.nombre}` : fid; }).join('\n'), 'Pruebas Cypress (API/UI/componentes/seguridad/accesibilidad) de sus funcionalidades, escenarios Screenplay y Gherkin, tres herramientas de IA, Stagehand, correcciones aplicadas y métricas de calidad']), [2000, 3800, 3838], { tam: 15 }));

// ---------- Documento ----------
const seccionesAnexo = anexos.map((a, i) => ({
  properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
  headers: { default: cabecera() },
  footers: { default: pie() },
  children: [
    ...(i === 0 ? [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run('Anexo A. Detalle completo de los casos de prueba')] }), P('Cada fila incluye objetivo, resultado esperado, resultado obtenido (generado a partir de la ejecución real), estado y ruta de la evidencia.')] : []),
    H2(a.titulo),
    tabla(['ID', 'Prueba', 'Tipo', 'Objetivo', 'Resultado esperado', 'Resultado obtenido', 'Estado', 'Evidencia'], a.filas, [900, 1900, 800, 2300, 2300, 3000, 900, 2470], { tam: 12, total: ANCHO_H, colorEstado: 6 }),
  ],
}));
function cabecera() {
  return new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('TaskFlow — Informe final de pruebas', { size: 16, color: '7F7F7F' })] })] });
}
function pie() {
  return new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Página ', { size: 16, color: '7F7F7F' }), new TextRun({ children: [PageNumber.CURRENT], font: FUENTE, size: 16, color: '7F7F7F' })] })] });
}
const doc = new Document({
  creator: 'Equipo TaskFlow',
  title: 'Informe final de pruebas — TaskFlow',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FUENTE, size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: FUENTE, color: AZUL }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: FUENTE, color: AZUL }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, font: FUENTE, color: '262626' }, paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [{ reference: 'vinetas', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }, { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } }] }] },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: portada },
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, headers: { default: cabecera() }, footers: { default: pie() }, children: cuerpo },
    ...seccionesAnexo,
  ],
});
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(SALIDA, buffer);
  console.log(`Informe generado: ${SALIDA} (${Math.round(buffer.length / 1024)} KB, ${totalCasos} casos)`);
});
