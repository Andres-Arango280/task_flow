// Genera el PLAN DE PRUEBAS COMPLETO de TaskFlow (estructura IEEE 829 / ISO 29119-3) en Word,
// con los datos reales de funcionalidades.json, datos-extra.json y las evidencias ejecutadas.
//   node pruebas/informe/generar-plan.js [salida.docx]
const fs = require('fs');
const path = require('path');
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, LevelFormat, PageBreak, PageNumber, Packer, Paragraph,
  ShadingType, Table, TableCell, TableOfContents, TableRow, TextRun, WidthType,
} = require('docx');

const RAIZ = path.resolve(__dirname, '..', '..');
const EVID = path.join(RAIZ, 'pruebas', 'evidencias');
const SALIDA = process.argv[2] || path.join(__dirname, 'Plan-de-Pruebas-TaskFlow.docx');
const mapa = JSON.parse(fs.readFileSync(path.join(__dirname, 'funcionalidades.json'), 'utf8'));
const extra = JSON.parse(fs.readFileSync(path.join(__dirname, 'datos-extra.json'), 'utf8'));
const leer = (area) => {
  const a = path.join(EVID, area, 'resumen.json');
  return fs.existsSync(a) ? JSON.parse(fs.readFileSync(a, 'utf8')) : null;
};
const matriz = fs.existsSync(path.join(EVID, 'matriz', 'matriz.json')) ? JSON.parse(fs.readFileSync(path.join(EVID, 'matriz', 'matriz.json'), 'utf8')) : null;
const R = {
  jest: leer('backend-jest'), cypress: leer('cypress'), seguridad: leer('seguridad'), rendimiento: leer('rendimiento'), ux: leer('ux-accesibilidad'),
  screenplay: leer('screenplay'), gherkin: leer('gherkin'), stagehand: leer('stagehand'), ia: leer('ia-herramientas'), katalon: leer('katalon'), despliegue: leer('despliegue'),
};
const integrantes = mapa.integrantes.map((i) => i.nombre).join(', ');

// ---------- estilo ----------
const FUENTE = 'Arial';
const AZUL = '0B4F71';
const GRIS = 'D9E5EC';
const ANCHO = 9638;
const borde = { style: BorderStyle.SINGLE, size: 4, color: 'A6A6A6' };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };
const run = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: FUENTE, ...o });
const P = (t, o = {}) => new Paragraph({ spacing: { after: 120, line: 276 }, ...o, children: Array.isArray(t) ? t : [run(t, o.run || {})] });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [run(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [run(t)] });
const V = (t, nivel = 0) => new Paragraph({ numbering: { reference: 'vinetas', level: nivel }, spacing: { after: 60 }, children: Array.isArray(t) ? t : [run(t)] });
const N = (t) => run(t, { bold: true });
function celda(contenido, ancho, { cabecera = false, tam = 18 } = {}) {
  const parrafos = (Array.isArray(contenido) ? contenido : [contenido]).map((texto) => new Paragraph({ children: [run(texto, { bold: cabecera, size: tam })] }));
  return new TableCell({ borders: bordes, width: { size: ancho, type: WidthType.DXA }, shading: cabecera ? { fill: GRIS, type: ShadingType.CLEAR, color: 'auto' } : undefined, margins: { top: 60, bottom: 60, left: 90, right: 90 }, children: parrafos });
}
function tabla(cabeceras, filas, anchos, { tam = 18 } = {}) {
  const suma = anchos.reduce((a, b) => a + b, 0);
  const w = anchos.map((a) => Math.round((a * ANCHO) / suma));
  w[w.length - 1] += ANCHO - w.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA }, columnWidths: w,
    rows: [new TableRow({ tableHeader: true, children: cabeceras.map((c, i) => celda(c, w[i], { cabecera: true, tam })) }), ...filas.map((f) => new TableRow({ cantSplit: true, children: f.map((v, i) => celda(String(v ?? '').split('\n'), w[i], { tam })) }))],
  });
}
const total = (r) => (r?.totales ? `${r.totales.aprobados}/${r.totales.total}` : 'por ejecutar');

// ---------- contenido ----------
const c = [];
const portada = [
  new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER, children: [run('PLAN DE PRUEBAS COMPLETO', { bold: true, size: 40, color: AZUL })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [run('TaskFlow — Gestión colaborativa de tareas (Kanban)', { size: 32 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Versión 2.0 — Entrega final: regresión, API, componentes, seguridad, rendimiento, accesibilidad, UX, E2E con Screenplay y Gherkin, herramientas de IA, Stagehand, refactorización y despliegue continuo', { size: 22, italics: true })] }),
  new Paragraph({ spacing: { before: 1800 }, alignment: AlignmentType.CENTER, children: [run(`Integrantes: ${integrantes}`, { size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Profesor: Ing. Mauricio Ramírez V.', { size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [run(`Fecha: ${new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}`, { size: 24 })] }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ spacing: { after: 200 }, children: [run('Contenido', { bold: true, size: 32, color: AZUL })] }),
  new TableOfContents('Contenido', { hyperlink: true, headingStyleRange: '1-2' }),
  P('Nota: si el índice aparece vacío, en Word haga clic derecho sobre él y elija "Actualizar campos".', { run: { italics: true, size: 18, color: '595959' } }),
];

c.push(H1('1. Identificación del plan'));
c.push(tabla(['Campo', 'Valor'], [
  ['Identificador', 'PP-TASKFLOW-2.0'],
  ['Producto', 'TaskFlow: API REST (NestJS 10 + TypeORM + PostgreSQL 18) y aplicación web (React 19 + Vite + Tailwind)'],
  ['Versión bajo prueba', 'Versión refactorizada (árbol de trabajo actual); versión anterior de referencia: commit 8b46dc0 (MongoDB/Mongoose)'],
  ['Repositorio', 'https://github.com/Andres-Arango280/TercerExamen (origen) · https://github.com/Claudia280-girl/validacion (entrega)'],
  ['Autores', integrantes],
  ['Normas de referencia', 'IEEE 829-2008 / ISO/IEC/IEEE 29119-3 (plan de pruebas), ISTQB (niveles y tipos), OWASP Top 10 2021 y OWASP API Top 10 2023, WCAG 2.2 AA, heurísticas de Nielsen y plantilla GRIHO'],
  ['Documentos relacionados', 'Informe final de pruebas (Informe-Pruebas-TaskFlow.docx), Matriz de trazabilidad (Matriz-Trazabilidad-TaskFlow.xlsx), README_COMANDOS.md, PRESENTACION.md, comparación antes/después (pruebas/evidencias/comparacion)'],
], [2400, 7238]));

c.push(H1('2. Introducción y objetivos'));
c.push(P('TaskFlow permite a equipos organizar su trabajo en proyectos con tableros Kanban («Por Hacer», «En Progreso», «Hecho»). Este plan define qué se prueba, cómo, con qué herramientas, quién lo hace, en qué entorno, con qué criterios se considera terminado y qué evidencias se producen. Es la versión final del plan: incorpora los hallazgos de la primera ronda de pruebas (20 correcciones C-01…C-20), la refactorización resultante y las nuevas técnicas exigidas en la entrega final (Gherkin con Screenplay, herramientas de IA, Stagehand y verificación del despliegue).'));
c.push(H2('2.1 Objetivos'));
['Verificar que las seis funcionalidades (autenticación, usuarios, equipos, proyectos, listas/tablero y tareas) cumplen sus requisitos funcionales con escenarios exitosos, alternativos y de error.',
  'Comprobar los requisitos no funcionales: seguridad (OWASP), rendimiento (p95, throughput, estrés), accesibilidad (WCAG 2.2 AA), usabilidad (Nielsen/GRIHO) y mantenibilidad (SonarQube).',
  'Detectar defectos antes de la entrega, corregirlos y verificar las correcciones sin regresiones (ejecución completa de todas las suites tras la refactorización).',
  'Evaluar el aporte y las limitaciones de herramientas de IA para pruebas (Playwright Test Agents, Browser Use, Playwright MCP y Stagehand) con un modelo local sin coste.',
  'Dejar todas las pruebas reproducibles con un comando y con evidencias (reportes HTML, capturas, vídeos, JSON) trazables a requisitos y defectos.'].forEach((t) => c.push(V(t)));

c.push(H1('3. Alcance'));
c.push(H2('3.1 Elementos y funcionalidades a probar'));
c.push(tabla(['Id', 'Funcionalidad', 'Módulos (backend · frontend)', 'Requisitos', 'Responsable'], mapa.funcionalidades.map((f) => [f.id, f.nombre, f.modulo, f.requisitos.join(', '), (mapa.integrantes.find((i) => i.funcionalidades.includes(f.id)) || {}).nombre || '']), [600, 2900, 3000, 1800, 1338], { tam: 16 }));
c.push(H2('3.2 Requisitos'));
c.push(tabla(['Requisito', 'Tipo', 'Descripción', 'Funcionalidad'], mapa.requisitos.map((r) => [r.id, r.tipo, r.texto, r.funcionalidad]), [1000, 1400, 6000, 1238], { tam: 16 }));
c.push(H2('3.3 Fuera del alcance'));
['Módulo de comentarios (sin endpoints expuestos en esta versión).', 'Pruebas en dispositivos móviles reales y navegadores distintos de Chrome/Chromium/Electron (solo se emulan resoluciones).', 'Pruebas de penetración manual profunda y auditoría de infraestructura de producción (no existe entorno de producción).', 'Pruebas de localización a otros idiomas (la aplicación es solo en español).'].forEach((t) => c.push(V(t)));

c.push(H1('4. Estrategia de pruebas'));
c.push(H2('4.1 Niveles'));
c.push(tabla(['Nivel', 'Qué se verifica', 'Herramienta', 'Suite / comando', 'Estado actual'], [
  ['Unitario', 'Reglas de negocio de cada servicio con dobles de prueba (stubs, spies, fakes); limitador de intentos; utilidades del frontend (búsqueda, errores).', 'Jest 29 + ts-jest · Cypress component testing', 'npm run test:evidencias · npm run test:component', `${total(R.jest)} Jest`],
  ['Integración / API', 'Endpoints REST con Supertest y con Cypress: códigos HTTP, esquema, mensajes en español, permisos, validación.', 'Supertest · Cypress 15', 'npm run test:e2e (raíz) · npm run test:api', `${total(R.cypress)} Cypress (todas las suites)`],
  ['Sistema', 'Regresión de interfaz, seguridad OWASP, rendimiento, accesibilidad, visual y recorridos de usuario sobre la aplicación completa.', 'Cypress · node --test · autocannon · axe-core · Lighthouse · Puppeteer', 'npm run test:regresion · npm test (seguridad, rendimiento, accesibilidad)', `Seguridad ${total(R.seguridad)} · Rendimiento ${total(R.rendimiento)} · UX/a11y ${total(R.ux)}`],
  ['Aceptación (E2E)', 'Recorridos de negocio en lenguaje del usuario: Screenplay (Serenity/JS) y escenarios Gherkin Dado–Cuando–Entonces enlazados con las mismas tareas Screenplay; Katalon.', 'Serenity/JS 3.48 + Playwright 1.63 · Cucumber 11 · Katalon Studio', 'npm test · npm run gherkin (pruebas/e2e-screenplay)', `Screenplay ${total(R.screenplay)} · Gherkin ${total(R.gherkin)} · Katalon ${total(R.katalon)}`],
  ['Exploratorio asistido por IA', 'Pruebas generadas o ejecutadas por agentes: Planner/Generator/Healer, navegación autónoma, MCP y Stagehand (act/observe/extract) con validaciones deterministas.', 'Playwright Test Agents · Browser Use · Playwright MCP · Stagehand 3.7 · Ollama llama3.1:8b', 'npm test (pruebas/stagehand) · scripts en pruebas/ia-herramientas', `Stagehand ${total(R.stagehand)} · IA ${total(R.ia)}`],
  ['Calidad estática y despliegue', 'Quality Gate de SonarQube (bugs, vulnerabilidades, cobertura, duplicación) y pipeline Jenkins (pruebas → build → Sonar → Docker).', 'SonarQube 9.9 · Jenkins · Docker', 'docker compose up -d · npx sonar-scanner · job taskflow-pipeline', total(R.despliegue)],
], [1500, 3000, 1900, 1900, 1338], { tam: 15 }));
c.push(H2('4.2 Tipos de prueba y técnicas de diseño'));
['Funcionales: partición de equivalencia y valores límite en DTOs (longitud de contraseña, campos obligatorios, UUID), tablas de decisión para permisos (líder / miembro / ajeno), transición de estados de las tareas (Por Hacer → En Progreso → Hecho) y casos de uso por funcionalidad.',
  'Regresión: toda la suite se vuelve a ejecutar tras cada corrección; demostración controlada (eliminar la lista «Hecho» rompe 2 pruebas) documentada en PRUEBAS_EVIDENCIA.md.',
  'Seguridad: lista de verificación OWASP Top 10 / API Top 10 (autenticación, BOLA/BFLA, exposición de datos, inyección, validación, configuración, dependencias), fuerza bruta, manipulación de JWT, XSS almacenado, cabeceras y CORS.',
  'Rendimiento: carga base, carga media, escritura, login, estrés por escalones de concurrencia y resistencia (autocannon) con umbral p95 < 500 ms y 0 errores.',
  'Accesibilidad: axe-core (WCAG 2.0/2.1/2.2 A y AA) en todas las pantallas y en el diálogo modal, Lighthouse ≥ 90, teclado, alto contraste y texto grande; regresión visual con pixelmatch.',
  'Usabilidad: evaluación heurística de Nielsen con severidad 0–4, plantilla GRIHO (antes 52,3 % → después 93,4 %) y contraste del análisis de IA frente a la revisión del equipo.',
  'Aceptación: patrón Screenplay (actores Ana/Beto/Carla, habilidades, tareas, interacciones, preguntas) y Gherkin en español con escenarios exitosos, alternativos y de error.',
  'IA: generación y reparación de pruebas (Playwright Agents), navegación autónoma (Browser Use), agente MCP (Playwright MCP) y act/observe/extract (Stagehand); cada resultado del modelo se valida en código contra la API o el DOM.'].forEach((t) => c.push(V(t)));
c.push(H2('4.3 Datos de prueba'));
c.push(P('La base de datos PostgreSQL es compartida por todas las suites, por lo que cada caso crea sus propios usuarios, equipos, proyectos y tareas con un sufijo único (marca de tiempo) y prepara por API lo que no es objeto de la prueba. Los inicios de sesión fallidos usan correos únicos para no activar el bloqueo de 5 intentos. Las pruebas de rendimiento siembran y eliminan sus datos. Nunca se usan datos personales reales.'));
c.push(H2('4.4 Automatización y evidencias'));
c.push(P('Todas las suites se ejecutan con un comando (ver README_COMANDOS.md) y escriben en pruebas/evidencias/<suite>/ un resumen.json con el mismo esquema (id, nombre, tipo, objetivo, resultado esperado, resultado obtenido real, estado y rutas de evidencia) más los reportes HTML, capturas, vídeos, trazas e intercambios HTTP. El informe final, la matriz de trazabilidad y la comparación antes/después se generan a partir de esos archivos, de modo que no hay resultados escritos a mano.'));

c.push(H1('5. Herramientas'));
c.push(tabla(['Herramienta', 'Versión', 'Uso en el plan', 'Coste'], [
  ['Jest + ts-jest + Supertest', '29.7', 'Unitarias y e2e de la API del backend, cobertura (lcov para Sonar)', 'Gratuita'],
  ['Cypress + Testing Library + cypress-axe', '15.21 · 10.1 · 1.7', 'API, regresión UI, componentes React, seguridad y accesibilidad; informes mochawesome', 'Gratuita'],
  ['node --test + fetch + npm audit', 'Node 20', 'Suite de seguridad OWASP (53 controles)', 'Gratuita'],
  ['autocannon', '7.15', 'Carga, estrés y resistencia de la API', 'Gratuita'],
  ['axe-core, Lighthouse, Puppeteer, pixelmatch', '4.14 · 12.8 · 24', 'Accesibilidad, rendimiento web, teclado, visual, recorridos', 'Gratuita'],
  ['Serenity/JS + Playwright Test', '3.48.2 · 1.63', 'E2E con patrón Screenplay e informe Serenity BDD', 'Gratuita'],
  ['Cucumber + @serenity-js/cucumber', '11.3 · 3.48.2', 'Escenarios Gherkin en español enlazados con las tareas Screenplay', 'Gratuita'],
  ['Stagehand', '3.7.3', 'act / observe / extract con lenguaje natural sobre TaskFlow', 'SDK abierto; inferencia local con Ollama (sin coste)'],
  ['Playwright Test Agents (Planner, Generator, Healer)', 'Playwright 1.63', 'Planificación, generación y reparación de pruebas E2E con un asistente de IA (Claude Code)', 'Herramientas abiertas'],
  ['Browser Use', '0.13', 'Agente de navegación autónoma con validación posterior por API', 'Biblioteca abierta; modelo local'],
  ['Playwright MCP + cliente MCP propio', '0.0.83', 'Agente que inspecciona el navegador y actúa mediante herramientas MCP', 'MCP abierto; modelo local'],
  ['Ollama + llama3.1:8b', '0.40', 'Modelo de lenguaje local para Stagehand, Browser Use y Playwright MCP', 'Gratuito'],
  ['Katalon Studio', '10.x', 'E2E con repositorio de objetos y datos CSV (16 casos preparados)', 'Edición gratuita'],
  ['SonarQube Community + sonar-scanner', '9.9', 'Análisis estático, cobertura y Quality Gate (backend y frontend)', 'Gratuita (Docker)'],
  ['Jenkins + Docker', 'LTS', 'Pipeline: instalar → pruebas → build → Sonar → Quality Gate → imagen Docker', 'Gratuita'],
], [2600, 1200, 4300, 1538], { tam: 15 }));

c.push(H1('6. Entorno de pruebas'));
c.push(P(R.rendimiento?.condiciones?.split('. Datos:')[0] || 'Windows 11, Node 20, PostgreSQL 18, Chrome.'));
c.push(tabla(['Componente', 'Configuración'], [
  ['Sistema operativo y hardware', 'Windows 11 Home x64; AMD Ryzen AI 7 350 (16 hilos); 23 GB RAM'],
  ['Backend', 'NestJS en http://localhost:3000 (npm run start:dev), variables en .env (.env.example), JWT de 1 día, bloqueo de login 5 intentos / 15 min'],
  ['Frontend', 'Vite en http://localhost:5173 (npm run dev), VITE_API_URL=http://localhost:3000'],
  ['Base de datos', 'PostgreSQL 18 local, base de datos taskflow, tablas creadas por TypeORM en desarrollo'],
  ['Navegadores', 'Google Chrome estable (channel chrome), Chromium 1223 de Playwright, Electron de Cypress'],
  ['Modelo de IA', 'Ollama 0.40 en http://localhost:11434 con llama3.1:8b (Q4_K_M, 8 B parámetros, soporte de tools); sin claves de servicios de pago'],
  ['Calidad y CI', 'Docker Desktop: SonarQube 9.9 (puerto 9000, PostgreSQL 15) y Jenkins (puerto 8081) definidos en docker-compose.yml'],
], [2600, 7038]));

c.push(H1('7. Criterios'));
c.push(H2('7.1 Criterios de entrada'));
['Backend y frontend compilan sin errores y arrancan con la configuración de .env.example.', 'PostgreSQL disponible con la base de datos taskflow.', 'Dependencias instaladas en cada paquete de pruebas (README_COMANDOS.md, sección 0).', 'Para las suites de IA: Ollama en ejecución con el modelo descargado.'].forEach((t) => c.push(V(t)));
c.push(H2('7.2 Criterios de salida (aceptación de la entrega)'));
['100 % de los casos de regresión del backend, Cypress, Screenplay y Gherkin aprobados en la ejecución final.', 'Cobertura de líneas de los servicios del backend ≥ 80 % (actual: ' + (R.jest?.cobertura?.lines ?? '—') + ' %).', 'Sin violaciones WCAG A/AA en las pantallas auditadas; Lighthouse accesibilidad ≥ 90.', 'Sin defectos de severidad alta abiertos; los hallazgos de seguridad restantes documentados con severidad, riesgo y plan de mejora.', 'Quality Gate de SonarQube aprobada y pipeline de Jenkins en verde para la versión entregada.', 'Todos los requisitos cubiertos por al menos un caso en la matriz de trazabilidad.'].forEach((t) => c.push(V(t)));
c.push(H2('7.3 Criterios de suspensión y reanudación'));
c.push(P('Se suspende una ejecución cuando el backend o la base de datos no responden (esperarBackend en Cypress, comprobación inicial en Gherkin), cuando SonarQube no está disponible para el análisis o cuando más del 20 % de los casos fallan por el entorno y no por el producto. Se reanuda tras restablecer el servicio y repetir la suite completa, no solo los casos fallidos.'));
c.push(H2('7.4 Gestión de defectos'));
c.push(P('Cada hallazgo recibe un identificador C-nn con hallazgo, origen (la prueba que lo detectó), corrección aplicada y verificación (los casos que lo comprueban). La severidad usa la escala de Nielsen (0 a 4) para UX y Baja/Media/Alta/Crítica para seguridad. La matriz de trazabilidad enlaza cada defecto con los casos que lo verifican; el informe final los lista en la sección «Correcciones realizadas».'));

c.push(H1('8. Casos de prueba planificados por funcionalidad'));
c.push(P('Cada funcionalidad se cubre con escenarios exitosos, alternativos y de error en varias técnicas. La tabla resume el número de casos ejecutados por suite (según las evidencias actuales); el detalle caso por caso, con objetivo, resultado esperado, resultado obtenido y evidencia, está en la matriz de trazabilidad y en el informe final.'));
if (matriz) {
  const areas = [...new Set(matriz.porFuncionalidad.flatMap((f) => Object.keys(f.porArea)))];
  const corto = (a) => a.replace('ia-herramientas/', 'IA ').replace('backend-jest', 'Jest').replace('ux-accesibilidad', 'UX/a11y');
  c.push(tabla(['Funcionalidad', 'Casos', 'Exitosos', 'Alternativos', 'Error', 'Por suite'], matriz.porFuncionalidad.map((f) => [`${f.id} ${f.nombre}`, f.casos, f.tipos.exitosos, f.tipos.alternativos, f.tipos.error, areas.filter((a) => f.porArea[a]).map((a) => `${corto(a)}: ${f.porArea[a]}`).join('; ')]), [2600, 700, 900, 1100, 700, 3638], { tam: 15 }));
}
c.push(H2('8.1 Escenarios mínimos por funcionalidad'));
const escenarios = {
  F1: ['Registro válido (201, sin contraseña) · correo duplicado (409) · contraseña débil (400) · campos vacíos (400)', 'Login válido (JWT) · contraseña incorrecta (401) · usuario inexistente (401) · 6.º intento bloqueado (429) · inyección (400/401)', 'Rutas privadas sin sesión redirigen a /login; cerrar sesión con confirmación; token manipulado (401)'],
  F2: ['Perfil propio (200, sin password) · editar nombre · eliminar cuenta y token inválido después (401) · búsqueda por correo', 'Preferencias: alto contraste, tamaño de texto, animaciones, restablecer con confirmación; persistencia al recargar', 'Ayuda y Privacidad accesibles (axe 0 violaciones, landmark main)'],
  F3: ['Crear equipo (UI y API) · listar · eliminar (solo líder)', 'Invitar miembro registrado · correo no registrado · duplicado (409) · miembro no líder invita (403) · quitar con deshacer', 'Ajeno no ve equipo/miembros (403) ni el tablero (mensaje de acceso denegado)'],
  F4: ['Crear proyecto genera 3 listas · equipo inexistente (404) · ajeno (403) · eliminar proyecto', 'Listar proyectos por equipo · identificadores malformados (400) sin 500', 'Quality Gate y pipeline sobre el módulo (SonarQube/Jenkins)'],
  F5: ['Listas por proyecto (200/403/404) · columnas en el tablero · progreso 0 % → 50 % → 100 %', 'Búsqueda tolerante a tildes y erratas · contador de resultados · filtro por miembro', 'Errores de red con aviso y reintento; tablero vacío con guía'],
  F6: ['Crear tarea (UI/API) · título vacío rechazado · XSS almacenado se muestra como texto', 'Mover entre listas (ratón, teclado, selector) · asignar miembros · editar · eliminar con deshacer', 'Rendimiento: 50 tareas con 50 conexiones p95 < 500 ms; escritura concurrente sin errores'],
};
for (const f of mapa.funcionalidades) {
  c.push(H3(`${f.id} ${f.nombre}`));
  (escenarios[f.id] || []).forEach((t) => c.push(V(t)));
}

c.push(H1('9. Roles y responsabilidades'));
c.push(tabla(['Integrante', 'Rol', 'Funcionalidades', 'Suites a su cargo'], mapa.integrantes.map((i) => [i.nombre, i.rol || 'Desarrollo y pruebas', i.funcionalidades.join(', '), 'Todas las suites de las funcionalidades asignadas; además, las tres herramientas de IA (Playwright Agents, Browser Use, Playwright MCP) y Stagehand']), [2400, 2000, 1600, 3638], { tam: 16 }));
c.push(P('Nota: si el equipo tiene más integrantes, edite pruebas/informe/funcionalidades.json («integrantes») y vuelva a generar el plan, la matriz y el informe.', { run: { italics: true, size: 18 } }));

c.push(H1('10. Cronograma'));
const fecha = (r) => (r?.fecha ? new Date(r.fecha).toLocaleDateString('es-CO') : 'pendiente');
c.push(tabla(['Fase', 'Actividades', 'Fecha / evidencia'], [
  ['1. Base del proyecto y CI', 'API con MongoDB, pruebas unitarias/e2e iniciales (81), Jenkins + SonarQube (Build #10, Quality Gate PASSED)', 'septiembre de 2026 (commit 8b46dc0)'],
  ['2. Primera ronda de pruebas', 'Migración a PostgreSQL, Cypress, seguridad, rendimiento, UX/accesibilidad, Screenplay, Katalon; detección de 20 defectos', `octubre de 2026 (informe v1: ${fecha(R.seguridad)})`],
  ['3. Refactorización', 'Correcciones C-01…C-20 (seguridad, accesibilidad, UX, rendimiento, estabilidad) en backend y frontend', 'octubre de 2026'],
  ['4. Entrega final: nuevas técnicas', 'Gherkin + Screenplay, Cypress seguridad/accesibilidad, Stagehand, Playwright Agents, Browser Use, Playwright MCP', `${fecha(R.gherkin)} · ${fecha(R.stagehand)}`],
  ['5. Regresión posterior y despliegue', 'Re-ejecución de todas las suites sobre la versión refactorizada, SonarQube, Jenkins, comparación antes/después, matriz, informe', `${fecha(R.cypress)} · ${fecha(R.jest)}`],
  ['6. Sustentación', 'Presentación del informe, demostración del software y de las pruebas', 'según calendario del curso'],
], [2200, 5000, 2438], { tam: 16 }));

c.push(H1('11. Riesgos y mitigaciones'));
c.push(tabla(['Riesgo', 'Probabilidad', 'Impacto', 'Mitigación'], [
  ['Reinicios del backend (nest --watch) o de Vite durante las suites producen fallos intermitentes', 'Media', 'Medio', 'tsconfig excluye pruebas/, Vite ignora las carpetas de resultados (C-20); 1 reintento en Cypress/Playwright marcado como inestable'],
  ['Modelo de IA local lento o impreciso (alucinaciones en act/extract)', 'Alta', 'Medio', 'Páginas pequeñas con datos preparados por API, instrucciones cortas, timeouts largos, validación determinista de cada resultado; los fallos se documentan como limitaciones'],
  ['Base de datos compartida entre suites', 'Media', 'Alto', 'Datos únicos por caso (sufijo de tiempo), limpieza en rendimiento, correos únicos en los logins fallidos'],
  ['Bloqueo del login (429) por pruebas repetidas', 'Media', 'Bajo', 'Correos únicos; la propia prueba CYS-BRU-01 valida el bloqueo de forma aislada'],
  ['SonarQube/Jenkins (Docker) apagados en el momento de la entrega', 'Media', 'Alto', 'docker compose up -d con volúmenes persistentes; evidencias (JSON de la API de Sonar, consola de Jenkins) guardadas en pruebas/evidencias/despliegue'],
  ['Dependencias con vulnerabilidades que exigen NestJS 11+', 'Alta', 'Medio', 'Documentado como mejora; npm audit en la suite de seguridad; sin vulnerabilidades críticas en producción'],
  ['Katalon requiere ejecución manual en Katalon Studio', 'Alta', 'Bajo', 'Casos y localizadores preparados y verificados contra la app; se marcan como pendientes hasta ejecutarlos'],
], [3200, 1100, 900, 4438], { tam: 15 }));

c.push(H1('12. Entregables'));
['Plan de pruebas (este documento).', 'Matriz de trazabilidad actualizada: pruebas/evidencias/matriz/Matriz-Trazabilidad-TaskFlow.xlsx (requisitos, funcionalidades, casos, resultados, evidencias y defectos).', 'Informe final de pruebas y recomendaciones: pruebas/informe/Informe-Pruebas-TaskFlow.docx.', 'Código de todas las suites: src/**/*.spec.ts, taskflow-frontend/cypress, pruebas/e2e-screenplay (specs y features), pruebas/stagehand, pruebas/ia-herramientas, pruebas/seguridad, pruebas/rendimiento, pruebas/accesibilidad, pruebas/katalon.', 'Evidencias de ejecución por suite en pruebas/evidencias (resumen.json, HTML, capturas, vídeos, trazas, HTTP).', 'Comparación antes/después: pruebas/evidencias/comparacion/antes-despues.md y .json.', 'Evidencias de despliegue: pruebas/evidencias/despliegue (SonarQube, Jenkins, regresión posterior).', 'Guion de presentación: PRESENTACION.md.'].forEach((t) => c.push(V(t)));

c.push(H1('13. Aprobaciones'));
c.push(tabla(['Rol', 'Nombre', 'Fecha', 'Firma'], [['Autor(es)', integrantes, new Date().toLocaleDateString('es-CO'), ''], ['Revisor', 'Ing. Mauricio Ramírez V.', '', '']], [2000, 3800, 1800, 2038]));

const cabecera = () => new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('TaskFlow — Plan de pruebas v2.0', { size: 16, color: '7F7F7F' })] })] });
const pie = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Página ', { size: 16, color: '7F7F7F' }), new TextRun({ children: [PageNumber.CURRENT], font: FUENTE, size: 16, color: '7F7F7F' })] })] });
const doc = new Document({
  creator: 'Equipo TaskFlow', title: 'Plan de pruebas — TaskFlow', features: { updateFields: true },
  styles: { default: { document: { run: { font: FUENTE, size: 21 } } }, paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: FUENTE, color: AZUL }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: FUENTE, color: AZUL }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, font: FUENTE, color: '262626' }, paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
  ] },
  numbering: { config: [{ reference: 'vinetas', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: portada },
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, headers: { default: cabecera() }, footers: { default: pie() }, children: c },
  ],
});
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(SALIDA, b);
  console.log(`Plan de pruebas generado: ${SALIDA} (${Math.round(b.length / 1024)} KB)`);
});
