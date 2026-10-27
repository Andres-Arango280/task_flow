// Genera la Matriz de Trazabilidad en el formato RTM de la asignatura (plantilla
// "Matriz de Trazabilidad - RTM_Avanzado_Industria_Ejemplos.xlsx": hojas Lookups, RTM, Dashboard y
// Cómo usar) a partir de pruebas/evidencias/matriz/matriz.json (salida de generar-matriz.js).
//
//   node pruebas/informe/generar-matriz.js && node pruebas/informe/generar-rtm.js
//
// Salida: pruebas/evidencias/matriz/Matriz-Trazabilidad-RTM-TaskFlow.xlsx
// Una fila por par (caso de prueba, requisito); las fórmulas de cobertura y del Dashboard son las de la
// plantilla y se recalculan al abrir el libro en Excel.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ExcelJS = require('exceljs');

const RAIZ = path.resolve(__dirname, '..', '..');
const EVID = path.join(RAIZ, 'pruebas', 'evidencias');
const SALIDA = process.argv[2] || path.join(EVID, 'matriz', 'Matriz-Trazabilidad-RTM-TaskFlow.xlsx');
const matriz = JSON.parse(fs.readFileSync(path.join(EVID, 'matriz', 'matriz.json'), 'utf8'));
const mapa = JSON.parse(fs.readFileSync(path.join(__dirname, 'funcionalidades.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
let commit = '';
try { commit = execSync('git rev-parse --short HEAD', { cwd: RAIZ, encoding: 'utf8' }).trim(); } catch { /* sin git */ }
const VERSION = `v${pkg.version}${commit ? ` (${commit})` : ''}`;

// ---------- Listas (hoja Lookups) ----------
const LISTAS = {
  nivel: ['Unitario', 'Integración', 'Sistema', 'Aceptación'],
  tipo: ['Funcional', 'Seguridad', 'Rendimiento', 'Usabilidad', 'Accesibilidad', 'Compatibilidad', 'Regresión', 'Estática'],
  estado: ['Pass', 'Fail', 'Blocked', 'Not Run'],
  severidad: ['Crítica', 'Alta', 'Media', 'Baja', 'N/A'],
  prioridad: ['Alta', 'Media', 'Baja'],
  riesgo: ['Alto', 'Medio', 'Bajo'],
  sprint: ['Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4'],
};

// ---------- Requisitos: prioridad y riesgo ----------
const PRIORIDAD_RIESGO = {
  RF01: ['Alta', 'Alto'], RF02: ['Alta', 'Alto'], RF03: ['Alta', 'Alto'], RF04: ['Alta', 'Alto'],
  RF05: ['Media', 'Medio'], RF06: ['Media', 'Bajo'], RF07: ['Alta', 'Alto'], RF08: ['Alta', 'Medio'],
  RF09: ['Alta', 'Medio'], RF10: ['Alta', 'Medio'], RF11: ['Media', 'Medio'], RF12: ['Alta', 'Alto'], RF13: ['Alta', 'Medio'],
  RNF01: ['Alta', 'Alto'], RNF02: ['Alta', 'Alto'], RNF03: ['Alta', 'Alto'], RNF04: ['Alta', 'Alto'], RNF05: ['Alta', 'Medio'],
  RNF06: ['Media', 'Medio'], RNF07: ['Media', 'Medio'], RNF08: ['Alta', 'Medio'], RNF09: ['Media', 'Bajo'], RNF10: ['Media', 'Medio'],
};
const requisitos = matriz.porRequisito.map((r, i) => ({ ...r, hu: `HU${String(i + 1).padStart(2, '0')}`, prioridad: PRIORIDAD_RIESGO[r.id]?.[0] ?? 'Media', riesgo: PRIORIDAD_RIESGO[r.id]?.[1] ?? 'Medio' }));
const porId = Object.fromEntries(requisitos.map((r) => [r.id, r]));
const ordenReq = Object.fromEntries(requisitos.map((r, i) => [r.id, i]));

// ---------- Hallazgos abiertos (casos Fallido que sí son hallazgos del software) ----------
const HALLAZGOS = {
  'SEG-AUTH-13': { id: 'HAL-01', severidad: 'Media', nota: 'No existe límite de intentos por IP (password spraying); el bloqueo es por cuenta. Mejora recomendada.' },
  'SEG-DATA-03': { id: 'HAL-02', severidad: 'Media', nota: 'La búsqueda de usuarios por correo permite confirmar cuentas ajenas (enumeración). Mejora recomendada.' },
  'SEG-CONF-06': { id: 'HAL-03', severidad: 'Media', nota: 'El frontend no define Content-Security-Policy y guarda el token en localStorage. Mejora recomendada (CSP + cookie HttpOnly).' },
  'SEG-DEP-01': { id: 'HAL-04', severidad: 'Alta', nota: 'npm audit del backend: 4 altas y 7 moderadas en dependencias transitivas; la corrección exige migrar a NestJS 11.' },
  'SEG-DEP-03': { id: 'HAL-05', severidad: 'Media', nota: 'npm audit del frontend: vite y follow-redirects; pendiente npm audit fix y reinicio de Vite.' },
};

// ---------- Clasificación de cada caso ----------
const SUITE_CORTA = {
  'backend-jest': 'Jest (unitarias + e2e API)', cypress: 'Cypress', seguridad: 'Seguridad OWASP (node:test)', rendimiento: 'Rendimiento (autocannon)',
  'ux-accesibilidad': 'UX y accesibilidad (axe, Lighthouse, Puppeteer)', screenplay: 'Screenplay (Serenity/JS + Playwright)', gherkin: 'Gherkin + Screenplay (Cucumber)',
  stagehand: 'Stagehand + Ollama', 'ia-herramientas/playwright-agents': 'IA: Playwright Test Agents', 'ia-herramientas/browser-use': 'IA: Browser Use + Ollama',
  'ia-herramientas/playwright-mcp': 'IA: Playwright MCP + Ollama', katalon: 'Katalon Studio', despliegue: 'Despliegue (SonarQube + Jenkins)',
};
const SPRINT = {
  'backend-jest': 'Sprint 1', cypress: 'Sprint 1', seguridad: 'Sprint 2', rendimiento: 'Sprint 2', 'ux-accesibilidad': 'Sprint 2', screenplay: 'Sprint 2', katalon: 'Sprint 2',
  gherkin: 'Sprint 3', stagehand: 'Sprint 3', 'ia-herramientas/playwright-agents': 'Sprint 3', 'ia-herramientas/browser-use': 'Sprint 3', 'ia-herramientas/playwright-mcp': 'Sprint 3', despliegue: 'Sprint 4',
};
const fechaSuite = Object.fromEntries(matriz.porSuite.map((s) => [s.area, s.fecha ? new Date(s.fecha).toISOString().slice(0, 10) : '']));
const empieza = (id, ...p) => p.some((x) => id.startsWith(x));

const nivelDe = (c) => {
  const a = c.area; const id = c.id;
  if (a === 'backend-jest') return id.startsWith('JU') ? 'Unitario' : 'Integración';
  if (a === 'cypress') return empieza(id, 'API-') ? 'Integración' : empieza(id, 'CMP-', 'UNI-') ? 'Unitario' : 'Sistema';
  if (a === 'despliegue') return 'Integración';
  if (['seguridad', 'rendimiento', 'ux-accesibilidad'].includes(a)) return 'Sistema';
  return 'Aceptación';
};
const tipoDe = (c) => {
  const a = c.area; const id = c.id;
  if (a === 'seguridad' || empieza(id, 'CYS-')) return 'Seguridad';
  if (a === 'rendimiento') return 'Rendimiento';
  if (a === 'ux-accesibilidad') return empieza(id, 'N-', 'UX-', 'REC-', 'VIS-', 'RUT-') ? 'Usabilidad' : 'Accesibilidad';
  if (empieza(id, 'CYA-')) return 'Accesibilidad';
  if (a === 'cypress' && empieza(id, 'REG-')) return 'Regresión';
  if (a === 'despliegue') return empieza(id, 'SON-') ? 'Estática' : 'Regresión';
  return 'Funcional';
};
const escenarioDe = (c) => {
  const t = (c.tipo || '').toLowerCase();
  if (c.area === 'despliegue') return 'Despliegue y regresión';
  if (['positivo', 'exitoso'].includes(t)) return 'Flujo exitoso';
  if (t === 'alternativo') return 'Flujo alternativo';
  if (['negativo', 'error', 'alternativo/error'].includes(t)) return 'Flujo de error';
  if (['accesibilidad', 'teclado', 'visual'].includes(t)) return 'Accesibilidad';
  if (['heurística', 'recorrido'].includes(t)) return 'Usabilidad';
  if (t === 'regresión') return 'Regresión';
  if (['planificación', 'mantenimiento', 'exploratorio'].includes(t)) return 'Exploratorio (IA)';
  return 'Flujo exitoso';
};
const estadoDe = (c) => (c.estado === 'Aprobado' ? 'Pass' : c.estado === 'Fallido' ? 'Fail' : c.area === 'katalon' ? 'Blocked' : 'Not Run');
const entornoDe = (c) => (empieza(c.id, 'JEN-') ? 'CI Jenkins (Docker)' : empieza(c.id, 'SON-') ? 'SonarQube 9.9 (Docker)' : 'QA local (Windows 11, Node 20, PostgreSQL 18)');
const automatizableDe = (c) => (c.area === 'ux-accesibilidad' && empieza(c.id, 'N-') ? 'No' : 'Sí');
const limpiar = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

const notasDe = (c, estado) => {
  const partes = [];
  if (c.defectos?.length) partes.push(`Verifica la corrección ${c.defectos.join(', ')}.`);
  if (estado === 'Fail' && HALLAZGOS[c.id]) partes.push(HALLAZGOS[c.id].nota);
  else if (estado === 'Fail') partes.push('Limitación del modelo de IA local (llama3.1:8b), no un defecto de TaskFlow; la validación determinista final decide el resultado.');
  else if (estado === 'Blocked') partes.push('Katalon Studio no está instalado en el entorno; caso preparado y validado (XPath) pendiente de ejecución.');
  else if (estado === 'Not Run') partes.push('Heurística con mejora pendiente; no se ha vuelto a evaluar.');
  partes.push(`Resultado: ${limpiar(c.obtenido, 220)}`);
  return partes.join(' ');
};

// ---------- Filas RTM: un par (caso, requisito) por fila ----------
const filas = [];
for (const c of matriz.casos) {
  const reqs = c.requisitos?.length ? c.requisitos : ['RNF10']; // REG-0x (regresión posterior al despliegue) → RNF10
  for (const rid of reqs) {
    const r = porId[rid]; if (!r) continue;
    const estado = estadoDe(c);
    const hallazgo = estado === 'Fail' ? HALLAZGOS[c.id] : null;
    filas.push({
      hu: r.hu, req: r.id, descripcion: r.texto, escenario: escenarioDe(c), condicion: limpiar(c.nombre, 180), caso: c.id,
      nivel: nivelDe(c), tipo: tipoDe(c), prioridad: r.prioridad, riesgo: r.riesgo, sprint: SPRINT[c.area] ?? 'Sprint 3', automatizable: automatizableDe(c),
      estado, defecto: hallazgo ? hallazgo.id : '', severidad: hallazgo ? hallazgo.severidad : 'N/A', version: VERSION, entorno: entornoDe(c),
      fecha: fechaSuite[c.area] ?? '', notas: notasDe(c, estado), suite: SUITE_CORTA[c.area] ?? c.suite, funcionalidad: c.funcionalidadId ?? '',
      evidencia: (c.evidencia ?? []).slice(0, 2).join(' ; '),
    });
  }
}
filas.sort((a, b) => ordenReq[a.req] - ordenReq[b.req] || a.caso.localeCompare(b.caso, 'es', { numeric: true }));

// Cobertura por requisito (mismo cálculo que la fórmula de la plantilla, para dejar el valor en caché)
const cobertura = {};
for (const r of requisitos) {
  const f = filas.filter((x) => x.req === r.id);
  const ejecutados = f.filter((x) => x.estado !== 'Not Run').length;
  const pass = f.filter((x) => x.estado === 'Pass').length;
  cobertura[r.id] = { ejecutados, pass, valor: Math.round((pass / Math.max(1, ejecutados)) * 100) / 100 };
}

// ---------- Libro ----------
const wb = new ExcelJS.Workbook();
wb.creator = 'TaskFlow · pruebas/informe/generar-rtm.js';
wb.created = new Date();
wb.calcProperties.fullCalcOnLoad = true;
const FUENTE = 'Calibri';
const borde = { top: { style: 'thin', color: { argb: 'FFBFBFBF' } }, left: { style: 'thin', color: { argb: 'FFBFBFBF' } }, bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } }, right: { style: 'thin', color: { argb: 'FFBFBFBF' } } };
const estiloCabecera = (celda) => {
  celda.font = { name: FUENTE, bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
  celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  celda.border = borde;
};

// Lookups
const L = wb.addWorksheet('Lookups');
L.getCell('A1').value = 'Listas (para validación de datos)';
L.getCell('A1').font = { name: FUENTE, bold: true, size: 12 };
const columnasLista = [['A', 'Nivel de Prueba', LISTAS.nivel], ['C', 'Tipo de Prueba', LISTAS.tipo], ['E', 'Estado Caso', LISTAS.estado], ['G', 'Severidad Defecto', LISTAS.severidad], ['I', 'Prioridad', LISTAS.prioridad], ['K', 'Riesgo', LISTAS.riesgo], ['M', 'Sprint', LISTAS.sprint]];
for (const [col, titulo, valores] of columnasLista) {
  L.getCell(`${col}3`).value = titulo; L.getCell(`${col}3`).font = { name: FUENTE, bold: true };
  L.getCell(`${col}3`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  valores.forEach((v, i) => { L.getCell(`${col}${4 + i}`).value = v; L.getCell(`${col}${4 + i}`).font = { name: FUENTE }; });
  L.getColumn(col).width = 20;
}
L.getCell('A10').value = 'Sprints del proyecto'; L.getCell('A10').font = { name: FUENTE, bold: true };
[['Sprint 1', 'Pruebas unitarias/e2e de API (Jest) y Cypress (API, regresión UI, componentes) — primera entrega'],
  ['Sprint 2', 'Seguridad OWASP, rendimiento, UX/accesibilidad, Screenplay y Katalon — segunda entrega (2026-10-09)'],
  ['Sprint 3', 'Cypress seguridad/accesibilidad, Gherkin + Screenplay, herramientas de IA y Stagehand — entrega final'],
  ['Sprint 4', 'Despliegue: SonarQube, Jenkins y regresión posterior — entrega final (2026-10-27)']].forEach(([s, d], i) => { L.getCell(`A${11 + i}`).value = s; L.getCell(`B${11 + i}`).value = d; L.getCell(`A${11 + i}`).font = { name: FUENTE }; L.getCell(`B${11 + i}`).font = { name: FUENTE }; });
const rangoLista = (col, n) => `Lookups!$${col}$4:$${col}$${3 + n}`;

// RTM
const R = wb.addWorksheet('RTM', { views: [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2' }] });
const CABECERAS = ['HU', 'RF/RNF', 'Descripción Requerimiento', 'Escenario', 'Condición de Prueba', 'Caso de Prueba', 'Nivel', 'Tipo', 'Prioridad', 'Riesgo', 'Sprint', 'Automatizable', 'Estado', 'Defecto', 'Severidad', 'Versión Probada', 'Entorno', 'Fecha Ejecución', 'Notas', 'Cobertura Req (%)', 'Suite / Herramienta', 'Funcionalidad', 'Evidencia'];
const ANCHOS = [8, 9, 40, 18, 48, 14, 12, 13, 10, 9, 10, 12, 10, 9, 10, 16, 26, 12, 70, 12, 30, 12, 60];
R.getRow(1).values = CABECERAS;
R.getRow(1).height = 38.4;
CABECERAS.forEach((_, i) => { estiloCabecera(R.getRow(1).getCell(i + 1)); R.getColumn(i + 1).width = ANCHOS[i]; });
filas.forEach((f, i) => {
  const n = i + 2;
  const row = R.getRow(n);
  row.values = [f.hu, f.req, f.descripcion, f.escenario, f.condicion, f.caso, f.nivel, f.tipo, f.prioridad, f.riesgo, f.sprint, f.automatizable, f.estado, f.defecto, f.severidad, f.version, f.entorno, f.fecha, f.notas, null, f.suite, f.funcionalidad, f.evidencia];
  row.getCell(20).value = { formula: `IFERROR(ROUND(COUNTIFS($B:$B,$B${n},$M:$M,"Pass")/MAX(1,COUNTIFS($B:$B,$B${n},$M:$M,"<>Not Run",$M:$M,"<>")),2),0)`, result: cobertura[f.req].valor };
  row.getCell(20).numFmt = '0%';
  row.eachCell({ includeEmpty: true }, (c) => { c.font = { name: FUENTE, size: 10 }; c.border = borde; c.alignment = { vertical: 'top', wrapText: [3, 5, 19, 23].includes(c.col) }; });
});
const ULT = filas.length + 1;
R.autoFilter = { from: 'A1', to: `W${ULT}` };
const dv = (col, formula) => { R.dataValidations.add(`${col}2:${col}${ULT}`, { type: 'list', allowBlank: true, formulae: [formula], showErrorMessage: true, errorTitle: 'Valor no permitido', error: 'Elija un valor de la lista (hoja Lookups).' }); };
dv('G', rangoLista('A', LISTAS.nivel.length)); dv('H', rangoLista('C', LISTAS.tipo.length)); dv('I', rangoLista('I', LISTAS.prioridad.length)); dv('J', rangoLista('K', LISTAS.riesgo.length));
dv('K', rangoLista('M', LISTAS.sprint.length)); dv('L', '"Sí,No"'); dv('M', rangoLista('E', LISTAS.estado.length)); dv('O', rangoLista('G', LISTAS.severidad.length));
const relleno = (argb) => ({ fill: { type: 'pattern', pattern: 'solid', bgColor: { argb } } });
R.addConditionalFormatting({ ref: `J2:J${ULT}`, rules: [
  { type: 'expression', formulae: ['J2="Alto"'], style: relleno('FFFFC7CE') }, { type: 'expression', formulae: ['J2="Medio"'], style: relleno('FFFFEB9C') }, { type: 'expression', formulae: ['J2="Bajo"'], style: relleno('FFC6EFCE') }] });
R.addConditionalFormatting({ ref: `M2:M${ULT}`, rules: [
  { type: 'expression', formulae: ['M2="Pass"'], style: relleno('FFC6EFCE') }, { type: 'expression', formulae: ['M2="Fail"'], style: relleno('FFFFC7CE') },
  { type: 'expression', formulae: ['M2="Blocked"'], style: relleno('FFFFEB9C') }, { type: 'expression', formulae: ['M2="Not Run"'], style: relleno('FFD9D9D9') }] });

// Dashboard
const D = wb.addWorksheet('Dashboard', { views: [{ state: 'frozen', ySplit: 3, topLeftCell: 'A4' }] });
D.getCell('A1').value = 'Dashboard de Pruebas (RTM) — TaskFlow'; D.getCell('A1').font = { name: FUENTE, bold: true, size: 16 };
D.getCell('A2').value = `Generado el ${new Date().toLocaleString('es-CO')} desde pruebas/evidencias/*/resumen.json · ${VERSION}. Las fórmulas se recalculan al abrir el libro.`; D.getCell('A2').font = { name: FUENTE, italic: true, size: 9, color: { argb: 'FF595959' } };
[['A3', 'Resumen de Ejecución'], ['D3', 'Cobertura por Requerimiento (Pass/Ejecutado)'], ['I3', 'Por Suite / Herramienta']].forEach(([c, t]) => { D.getCell(c).value = t; D.getCell(c).font = { name: FUENTE, bold: true, size: 12 }; });
const total = filas.length; const ejec = filas.filter((f) => f.estado !== 'Not Run').length;
const nPass = filas.filter((f) => f.estado === 'Pass').length; const nFail = filas.filter((f) => f.estado === 'Fail').length; const nBlk = filas.filter((f) => f.estado === 'Blocked').length;
const casosUnicos = new Set(filas.map((f) => f.caso)).size;
const nDef = filas.filter((f) => f.defecto).length; const sev = (s) => filas.filter((f) => f.severidad === s).length;
const nAuto = filas.filter((f) => f.automatizable === 'Sí').length;
const resumen = [
  ['Total filas (caso × requisito)', 'COUNTA(RTM!F:F)-1', total],
  ['Casos de prueba únicos', `SUMPRODUCT((RTM!F2:F${ULT}<>"")/COUNTIF(RTM!F2:F${ULT},RTM!F2:F${ULT}&""))`, casosUnicos],
  ['Ejecutados (≠ Not Run)', 'COUNTIFS(RTM!M:M,"<>Not Run",RTM!M:M,"<>")', ejec],
  ['Pass', 'COUNTIF(RTM!M:M,"Pass")', nPass],
  ['Fail', 'COUNTIF(RTM!M:M,"Fail")', nFail],
  ['Blocked', 'COUNTIF(RTM!M:M,"Blocked")', nBlk],
  ['% Aprobación', 'IFERROR(COUNTIF(RTM!M:M,"Pass")/MAX(1,COUNTIFS(RTM!M:M,"<>Not Run",RTM!M:M,"<>")),0)', nPass / Math.max(1, ejec), '0%'],
  ['Hallazgos abiertos (con ID)', 'COUNTIF(RTM!N:N,"<>")-1', nDef],
  ['Crítica', 'COUNTIF(RTM!O:O,"Crítica")', sev('Crítica')],
  ['Alta', 'COUNTIF(RTM!O:O,"Alta")', sev('Alta')],
  ['Media', 'COUNTIF(RTM!O:O,"Media")', sev('Media')],
  ['Baja', 'COUNTIF(RTM!O:O,"Baja")', sev('Baja')],
  ['% Automatización', 'IFERROR(COUNTIF(RTM!L:L,"Sí")/MAX(1,COUNTA(RTM!L:L)-1),0)', nAuto / Math.max(1, total), '0%'],
  ['Requisitos cubiertos', `COUNTIF(G5:G${4 + requisitos.length},">0")&" / "&COUNTA(D5:D${4 + requisitos.length})`, `${requisitos.filter((r) => cobertura[r.id].valor > 0).length} / ${requisitos.length}`],
];
resumen.forEach(([etq, formula, valor, fmt], i) => {
  const n = 4 + i;
  D.getCell(`A${n}`).value = etq; D.getCell(`A${n}`).font = { name: FUENTE };
  D.getCell(`B${n}`).value = { formula, result: valor }; D.getCell(`B${n}`).font = { name: FUENTE, bold: true }; if (fmt) D.getCell(`B${n}`).numFmt = fmt;
  D.getCell(`A${n}`).border = borde; D.getCell(`B${n}`).border = borde;
});
['D4', 'E4', 'F4', 'G4'].forEach((c, i) => { D.getCell(c).value = ['Requerimiento', 'Ejecutados', 'Pass', 'Cobertura'][i]; estiloCabecera(D.getCell(c)); });
requisitos.forEach((r, i) => {
  const n = 5 + i;
  D.getCell(`D${n}`).value = r.id;
  D.getCell(`E${n}`).value = { formula: `COUNTIFS(RTM!$B:$B,D${n},RTM!$M:$M,"<>Not Run",RTM!$M:$M,"<>")`, result: cobertura[r.id].ejecutados };
  D.getCell(`F${n}`).value = { formula: `COUNTIFS(RTM!$B:$B,D${n},RTM!$M:$M,"Pass")`, result: cobertura[r.id].pass };
  D.getCell(`G${n}`).value = { formula: `IFERROR(F${n}/MAX(1,E${n}),0)`, result: cobertura[r.id].valor }; D.getCell(`G${n}`).numFmt = '0%';
  ['D', 'E', 'F', 'G'].forEach((c) => { D.getCell(`${c}${n}`).font = { name: FUENTE }; D.getCell(`${c}${n}`).border = borde; });
});
const ultReq = 4 + requisitos.length;
D.addConditionalFormatting({ ref: `G5:G${ultReq}`, rules: [
  { type: 'cellIs', operator: 'lessThan', formulae: ['0.7'], style: relleno('FFFFC7CE') }, { type: 'cellIs', operator: 'between', formulae: ['0.7', '0.9'], style: relleno('FFFFEB9C') },
  { type: 'cellIs', operator: 'greaterThanOrEqual', formulae: ['0.9'], style: relleno('FFC6EFCE') }] });
['I4', 'J4', 'K4', 'L4', 'M4'].forEach((c, i) => { D.getCell(c).value = ['Suite / Herramienta', 'Filas', 'Pass', 'Fail', '% Pass'][i]; estiloCabecera(D.getCell(c)); });
const suites = [...new Set(filas.map((f) => f.suite))];
suites.forEach((s, i) => {
  const n = 5 + i; const fs_ = filas.filter((f) => f.suite === s); const p = fs_.filter((f) => f.estado === 'Pass').length; const fl = fs_.filter((f) => f.estado === 'Fail').length;
  D.getCell(`I${n}`).value = s;
  D.getCell(`J${n}`).value = { formula: `COUNTIF(RTM!$U:$U,I${n})`, result: fs_.length };
  D.getCell(`K${n}`).value = { formula: `COUNTIFS(RTM!$U:$U,I${n},RTM!$M:$M,"Pass")`, result: p };
  D.getCell(`L${n}`).value = { formula: `COUNTIFS(RTM!$U:$U,I${n},RTM!$M:$M,"Fail")`, result: fl };
  D.getCell(`M${n}`).value = { formula: `IFERROR(K${n}/MAX(1,J${n}),0)`, result: p / Math.max(1, fs_.length) }; D.getCell(`M${n}`).numFmt = '0%';
  ['I', 'J', 'K', 'L', 'M'].forEach((c) => { D.getCell(`${c}${n}`).font = { name: FUENTE }; D.getCell(`${c}${n}`).border = borde; });
});
[['A', 34], ['B', 18], ['C', 3], ['D', 16], ['E', 12], ['F', 10], ['G', 12], ['H', 3], ['I', 44], ['J', 9], ['K', 9], ['L', 9], ['M', 9]].forEach(([c, w]) => { D.getColumn(c).width = w; });

// Defectos (correcciones trazadas + hallazgos abiertos)
const F = wb.addWorksheet('Defectos', { views: [{ state: 'frozen', ySplit: 1 }] });
const CAB_DEF = ['ID', 'Estado', 'Severidad', 'Origen (cómo se detectó)', 'Hallazgo', 'Corrección aplicada', 'Casos que lo verifican', 'Nº casos'];
F.getRow(1).values = CAB_DEF; F.getRow(1).height = 30; CAB_DEF.forEach((_, i) => estiloCabecera(F.getRow(1).getCell(i + 1)));
[14, 12, 11, 30, 60, 60, 50, 9].forEach((w, i) => { F.getColumn(i + 1).width = w; });
let fila = 2;
for (const d of matriz.defectos) {
  const casos = d.casos ?? [];
  F.getRow(fila).values = [d.id, 'Corregido', 'N/A', d.origen, d.hallazgo, d.correccion, casos.join(', '), casos.length];
  fila += 1;
}
for (const [caso, h] of Object.entries(HALLAZGOS)) {
  const c = matriz.casos.find((x) => x.id === caso);
  F.getRow(fila).values = [h.id, 'Abierto (aceptado)', h.severidad, `Suite de seguridad (${caso})`, c ? c.nombre : caso, h.nota, caso, 1];
  fila += 1;
}
for (let n = 2; n < fila; n += 1) F.getRow(n).eachCell({ includeEmpty: true }, (c) => { c.font = { name: FUENTE, size: 10 }; c.border = borde; c.alignment = { vertical: 'top', wrapText: true }; });
F.addConditionalFormatting({ ref: `B2:B${fila - 1}`, rules: [{ type: 'expression', formulae: ['B2="Corregido"'], style: relleno('FFC6EFCE') }, { type: 'expression', formulae: ['LEFT(B2,7)="Abierto"'], style: relleno('FFFFEB9C') }] });

// Cómo usar
const U = wb.addWorksheet('Cómo usar');
U.getColumn('A').width = 140;
const guia = [
  'Guía rápida (RTM avanzado) — TaskFlow',
  '',
  '1) La hoja RTM tiene una fila por cada par caso de prueba × requisito (RF/RNF). Un caso que verifica dos requisitos aparece dos veces; por eso el Dashboard distingue «filas» de «casos únicos».',
  '2) HU01…HU23 son las historias de usuario asociadas a cada requisito (RF01…RF13 funcionales, RNF01…RNF10 no funcionales), definidas en pruebas/informe/funcionalidades.json. La columna Funcionalidad (F1…F6) indica a cuál de las seis funcionalidades pertenece el caso.',
  '3) Escenario clasifica el caso como flujo exitoso, alternativo o de error (criterio de la rúbrica), o como accesibilidad, usabilidad, regresión, exploratorio (IA) o despliegue.',
  '4) Nivel, Tipo, Prioridad, Riesgo, Sprint, Estado y Severidad usan los desplegables de la hoja Lookups. Estado: Pass = aprobado, Fail = fallido, Blocked = no ejecutable en este entorno (Katalon Studio no instalado), Not Run = pendiente.',
  '5) Defecto/Severidad solo se rellenan en los casos fallidos que son hallazgos reales del software (HAL-01…HAL-05, hoja Defectos). Los fallos de Stagehand, Browser Use y Playwright MCP son limitaciones del modelo de IA local y se explican en Notas.',
  '6) La hoja Defectos recoge las 20 correcciones aplicadas durante el proyecto (C-01…C-20) con los casos que verifican cada una, más los hallazgos abiertos aceptados.',
  '7) Notas incluye el resultado obtenido real de la ejecución; Evidencia apunta a los archivos en pruebas/evidencias/ (capturas, JSON, informes HTML).',
  "8) La columna 'Cobertura Req (%)' y el Dashboard calculan con las mismas fórmulas de la plantilla (COUNTIFS sobre la hoja RTM) y se recalculan al abrir el libro en Excel.",
  '9) Regenerar: node pruebas/informe/generar-matriz.js && node pruebas/informe/generar-rtm.js (lee pruebas/evidencias/matriz/matriz.json, generado desde los resumen.json de cada suite).',
];
guia.forEach((t, i) => { U.getCell(`A${i + 1}`).value = t; U.getCell(`A${i + 1}`).font = { name: FUENTE, bold: i === 0, size: i === 0 ? 14 : 11 }; U.getCell(`A${i + 1}`).alignment = { wrapText: true, vertical: 'top' }; });

wb.xlsx.writeFile(SALIDA).then(() => {
  console.log(`RTM generada: ${path.relative(RAIZ, SALIDA)} — ${filas.length} filas (${casosUnicos} casos únicos), ${requisitos.length} requisitos, ${matriz.defectos.length} correcciones + ${Object.keys(HALLAZGOS).length} hallazgos abiertos`);
  console.log(`Estados: Pass ${nPass} · Fail ${nFail} · Blocked ${nBlk} · Not Run ${total - ejec}`);
}).catch((e) => { console.error(e); process.exit(1); });
