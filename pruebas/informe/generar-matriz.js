// Genera la Matriz de Trazabilidad actualizada a partir de las evidencias REALES
// (pruebas/evidencias/*/resumen.json) y del mapa requisitos ↔ funcionalidades (funcionalidades.json).
//   node pruebas/informe/generar-matriz.js
// Salidas (pruebas/evidencias/matriz/):
//   Matriz-Trazabilidad-TaskFlow.xlsx  (hojas: Matriz, Requisitos, Funcionalidades, Suites, Defectos)
//   matriz.json  (la consume generar-informe.js)
//   matriz.md    (versión compacta)
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const RAIZ = path.resolve(__dirname, '..', '..');
const EVID = path.join(RAIZ, 'pruebas', 'evidencias');
const SALIDA = path.join(EVID, 'matriz');
fs.mkdirSync(SALIDA, { recursive: true });

const mapa = JSON.parse(fs.readFileSync(path.join(__dirname, 'funcionalidades.json'), 'utf8'));
const extra = JSON.parse(fs.readFileSync(path.join(__dirname, 'datos-extra.json'), 'utf8'));
const leer = (area) => {
  const archivo = path.join(EVID, area, 'resumen.json');
  return fs.existsSync(archivo) ? JSON.parse(fs.readFileSync(archivo, 'utf8')) : null;
};

// ---------- 1. Recolectar todos los casos ----------
const SUITES = [
  { area: 'backend-jest', nombre: 'Regresión backend (Jest)', nivel: 'Unitario / integración' },
  { area: 'cypress', nombre: 'Cypress (API, regresión UI, componentes, seguridad, accesibilidad)', nivel: 'Integración / sistema' },
  { area: 'seguridad', nombre: 'Seguridad OWASP (node --test)', nivel: 'Sistema' },
  { area: 'rendimiento', nombre: 'Rendimiento (autocannon)', nivel: 'Sistema' },
  { area: 'ux-accesibilidad', nombre: 'UX, accesibilidad e interfaz (axe, Lighthouse, Puppeteer)', nivel: 'Sistema' },
  { area: 'screenplay', nombre: 'E2E Screenplay (Serenity/JS + Playwright)', nivel: 'Aceptación' },
  { area: 'gherkin', nombre: 'E2E Gherkin + Screenplay (Cucumber)', nivel: 'Aceptación' },
  { area: 'stagehand', nombre: 'Stagehand + IA (Ollama)', nivel: 'Aceptación (IA)' },
  { area: 'ia-herramientas/playwright-agents', nombre: 'IA: Playwright Test Agents', nivel: 'Aceptación (IA)' },
  { area: 'ia-herramientas/browser-use', nombre: 'IA: Browser Use + Ollama', nivel: 'Aceptación (IA)' },
  { area: 'ia-herramientas/playwright-mcp', nombre: 'IA: Playwright MCP + Ollama', nivel: 'Aceptación (IA)' },
  { area: 'katalon', nombre: 'E2E Katalon', nivel: 'Aceptación' },
  { area: 'despliegue', nombre: 'Despliegue (SonarQube + Jenkins) y regresión posterior', nivel: 'Sistema' },
];

const idDeJest = (c) => c.id; // JU-001…
const casos = [];
for (const s of SUITES) {
  const r = leer(s.area);
  if (!r) continue;
  const lista = r.casos ?? [];
  for (const c of lista) {
    casos.push({
      id: c.id,
      nombre: c.nombre || c.escenario || '',
      suite: s.nombre,
      area: s.area,
      nivel: s.nivel,
      subSuite: c.suite || c.feature || c.categoria || c.herramienta || '',
      tipo: c.tipo || '',
      estado: c.estado || (c.aprobado ? 'Aprobado' : 'Pendiente'),
      obtenido: c.obtenido || '',
      evidencia: (c.evidencia || []).map((e) => `pruebas/evidencias/${s.area}/${e}`.replace(/\/pruebas\/evidencias\/[^/]+\/(pruebas\/)/, '/$1')),
      textoParaDefectos: `${c.id} ${c.nombre || ''} ${c.obtenido || ''}`,
    });
  }
  // Hallazgos de UX (Nielsen) también son trazables
  for (const n of r.nielsen ?? []) {
    casos.push({ id: n.id, nombre: `${n.heuristica}: ${n.hallazgo}`.slice(0, 180), suite: s.nombre, area: s.area, nivel: 'Evaluación heurística', subSuite: 'Nielsen', tipo: 'heurística', estado: n.estado === 'Corregido' ? 'Aprobado' : n.estado, obtenido: n.hallazgo, evidencia: n.evidencia ? [`pruebas/evidencias/${s.area}/${n.evidencia}`] : [], textoParaDefectos: `${n.id} ${n.hallazgo}` });
  }
}

// ---------- 2. Funcionalidad y requisitos de cada caso ----------
const funcionalidadDe = (caso) => {
  for (const f of mapa.funcionalidades) {
    if (f.prefijos.some((p) => new RegExp(p).test(caso.id))) return f;
  }
  if (caso.area === 'backend-jest') {
    for (const f of mapa.funcionalidades) if (f.jest.some((j) => (caso.subSuite || '').includes(j))) return f;
  }
  return null;
};
const requisitosDe = (caso, f) => {
  const extras = Object.entries(mapa.requisitosPorPrefijo).filter(([p]) => new RegExp(p).test(caso.id)).flatMap(([, reqs]) => reqs);
  if (extras.length) return [...new Set(extras)];
  if (!f) return [];
  // Por defecto, los requisitos funcionales de la funcionalidad (los RNF solo cuando el prefijo lo indica)
  const funcionales = f.requisitos.filter((r) => r.startsWith('RF'));
  return funcionales.length ? funcionales : f.requisitos;
};

// Defectos: correcciones C-xx cuya "verificacion" cita el id o el prefijo del caso
const defectosDe = (caso) =>
  (extra.correcciones || [])
    .filter((c) => {
      const v = c.verificacion || '';
      if (v.includes(caso.id)) return true;
      const prefijo = caso.id.replace(/-?\d+$/, '');
      return prefijo.length >= 3 && new RegExp(`\\b${prefijo.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}[-\\s]`).test(v);
    })
    .map((c) => c.id);

for (const caso of casos) {
  const f = funcionalidadDe(caso);
  caso.funcionalidad = f ? `${f.id} ${f.nombre}` : 'Transversal';
  caso.funcionalidadId = f ? f.id : 'T';
  caso.requisitos = requisitosDe(caso, f);
  caso.defectos = defectosDe(caso);
}

// Integrante responsable de cada funcionalidad
const integranteDe = (fid) => (mapa.integrantes.find((i) => i.funcionalidades.includes(fid)) || {}).nombre || '';

// ---------- 3. Agregados ----------
const porRequisito = mapa.requisitos.map((r) => {
  const c = casos.filter((x) => x.requisitos.includes(r.id));
  const f = mapa.funcionalidades.find((x) => x.id === r.funcionalidad);
  return {
    ...r,
    funcionalidadNombre: f ? f.nombre : '',
    casos: c.length,
    aprobados: c.filter((x) => x.estado === 'Aprobado').length,
    fallidos: c.filter((x) => x.estado === 'Fallido').length,
    pendientes: c.filter((x) => !['Aprobado', 'Fallido'].includes(x.estado)).length,
    suites: [...new Set(c.map((x) => x.area))],
    ids: c.map((x) => x.id),
    defectos: [...new Set(c.flatMap((x) => x.defectos))],
    cobertura: c.length ? 'Cubierto' : 'Sin cobertura',
  };
});
const porFuncionalidad = mapa.funcionalidades.map((f) => {
  const c = casos.filter((x) => x.funcionalidadId === f.id);
  const porArea = {};
  for (const x of c) porArea[x.area] = (porArea[x.area] || 0) + 1;
  const tipos = { exitosos: c.filter((x) => /positivo|exitoso|accesibilidad|rendimiento|heur/i.test(x.tipo)).length, alternativos: c.filter((x) => /alternativo/i.test(x.tipo)).length, error: c.filter((x) => /negativo|error/i.test(x.tipo)).length };
  return { ...f, integrante: integranteDe(f.id), casos: c.length, aprobados: c.filter((x) => x.estado === 'Aprobado').length, fallidos: c.filter((x) => x.estado === 'Fallido').length, porArea, tipos, defectos: [...new Set(c.flatMap((x) => x.defectos))] };
});
const porSuite = SUITES.filter((s) => leer(s.area)).map((s) => {
  const r = leer(s.area);
  const c = casos.filter((x) => x.area === s.area && x.subSuite !== 'Nielsen');
  return { ...s, herramienta: r.herramienta, fecha: r.fecha, total: c.length, aprobados: c.filter((x) => x.estado === 'Aprobado').length, fallidos: c.filter((x) => x.estado === 'Fallido').length, pendientes: c.filter((x) => !['Aprobado', 'Fallido'].includes(x.estado)).length };
});
const defectos = (extra.correcciones || []).map((c) => ({ ...c, casos: casos.filter((x) => x.defectos.includes(c.id)).map((x) => x.id) }));

const matriz = {
  generado: new Date().toISOString(),
  totales: { casos: casos.length, aprobados: casos.filter((x) => x.estado === 'Aprobado').length, fallidos: casos.filter((x) => x.estado === 'Fallido').length, pendientes: casos.filter((x) => !['Aprobado', 'Fallido'].includes(x.estado)).length, requisitos: mapa.requisitos.length, requisitosCubiertos: porRequisito.filter((r) => r.casos > 0).length, defectos: defectos.length, defectosCorregidos: defectos.filter((d) => !/pendiente/i.test(d.correccion)).length },
  integrantes: mapa.integrantes,
  porRequisito,
  porFuncionalidad,
  porSuite,
  defectos,
  casos,
};
fs.writeFileSync(path.join(SALIDA, 'matriz.json'), JSON.stringify(matriz, null, 2), 'utf8');

// ---------- 4. Excel ----------
(async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Equipo TaskFlow';
  const cabecera = (hoja, columnas) => {
    hoja.columns = columnas;
    hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B4F71' } };
    hoja.views = [{ state: 'frozen', ySplit: 1 }];
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
  };
  const colorearEstado = (hoja, col) => {
    hoja.eachRow((fila, n) => {
      if (n === 1) return;
      const v = String(fila.getCell(col).value || '');
      const color = /aprob|corregido|cubierto/i.test(v) ? 'FFE2F0D9' : /fall|sin cobertura/i.test(v) ? 'FFF8D7DA' : /pend/i.test(v) ? 'FFFFF3CD' : null;
      if (color) fila.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    });
  };

  const h1 = wb.addWorksheet('Matriz');
  cabecera(h1, [
    { header: 'Requisito(s)', key: 'req', width: 14 },
    { header: 'Funcionalidad', key: 'fun', width: 36 },
    { header: 'Integrante', key: 'int', width: 18 },
    { header: 'Caso', key: 'id', width: 14 },
    { header: 'Nombre del caso', key: 'nombre', width: 60 },
    { header: 'Suite / herramienta', key: 'suite', width: 34 },
    { header: 'Nivel', key: 'nivel', width: 20 },
    { header: 'Tipo', key: 'tipo', width: 14 },
    { header: 'Resultado', key: 'estado', width: 12 },
    { header: 'Resultado obtenido', key: 'obtenido', width: 70 },
    { header: 'Evidencia', key: 'evidencia', width: 60 },
    { header: 'Defecto(s)', key: 'defectos', width: 14 },
  ]);
  for (const c of casos) {
    h1.addRow({ req: c.requisitos.join(', ') || '—', fun: c.funcionalidad, int: integranteDe(c.funcionalidadId), id: c.id, nombre: c.nombre, suite: c.suite, nivel: c.nivel, tipo: c.tipo, estado: c.estado, obtenido: c.obtenido.slice(0, 600), evidencia: c.evidencia.join('\n'), defectos: c.defectos.join(', ') });
  }
  h1.eachRow((f) => { f.alignment = { vertical: 'top', wrapText: true }; });
  colorearEstado(h1, 9);

  const h2 = wb.addWorksheet('Requisitos');
  cabecera(h2, [
    { header: 'Requisito', key: 'id', width: 10 }, { header: 'Tipo', key: 'tipo', width: 14 }, { header: 'Descripción', key: 'texto', width: 70 }, { header: 'Funcionalidad', key: 'fun', width: 36 },
    { header: 'Casos', key: 'casos', width: 8 }, { header: 'Aprobados', key: 'ap', width: 10 }, { header: 'Fallidos', key: 'fa', width: 9 }, { header: 'Pendientes', key: 'pe', width: 10 }, { header: 'Suites', key: 'suites', width: 40 }, { header: 'Defectos', key: 'def', width: 20 }, { header: 'Cobertura', key: 'cob', width: 14 }, { header: 'Casos (ids)', key: 'ids', width: 80 },
  ]);
  for (const r of porRequisito) h2.addRow({ id: r.id, tipo: r.tipo, texto: r.texto, fun: `${r.funcionalidad} ${r.funcionalidadNombre}`, casos: r.casos, ap: r.aprobados, fa: r.fallidos, pe: r.pendientes, suites: r.suites.join(', '), def: r.defectos.join(', '), cob: r.cobertura, ids: r.ids.join(', ') });
  h2.eachRow((f) => { f.alignment = { vertical: 'top', wrapText: true }; });
  colorearEstado(h2, 11);

  const h3 = wb.addWorksheet('Funcionalidades');
  cabecera(h3, [
    { header: 'Id', key: 'id', width: 6 }, { header: 'Funcionalidad', key: 'nombre', width: 44 }, { header: 'Módulo', key: 'modulo', width: 44 }, { header: 'Integrante', key: 'int', width: 18 }, { header: 'Requisitos', key: 'req', width: 34 },
    { header: 'Casos', key: 'casos', width: 8 }, { header: 'Aprobados', key: 'ap', width: 10 }, { header: 'Fallidos', key: 'fa', width: 9 }, { header: 'Exitosos', key: 'ex', width: 9 }, { header: 'Alternativos', key: 'al', width: 11 }, { header: 'De error', key: 'er', width: 9 }, { header: 'Casos por suite', key: 'area', width: 70 }, { header: 'Defectos', key: 'def', width: 24 },
  ]);
  for (const f of porFuncionalidad) h3.addRow({ id: f.id, nombre: f.nombre, modulo: f.modulo, int: f.integrante, req: f.requisitos.join(', '), casos: f.casos, ap: f.aprobados, fa: f.fallidos, ex: f.tipos.exitosos, al: f.tipos.alternativos, er: f.tipos.error, area: Object.entries(f.porArea).map(([a, n]) => `${a}: ${n}`).join('; '), def: f.defectos.join(', ') });
  h3.eachRow((f) => { f.alignment = { vertical: 'top', wrapText: true }; });

  const h4 = wb.addWorksheet('Suites');
  cabecera(h4, [{ header: 'Suite', key: 'nombre', width: 60 }, { header: 'Herramienta', key: 'herr', width: 60 }, { header: 'Nivel', key: 'nivel', width: 22 }, { header: 'Casos', key: 'total', width: 8 }, { header: 'Aprobados', key: 'ap', width: 10 }, { header: 'Fallidos', key: 'fa', width: 9 }, { header: 'Pendientes', key: 'pe', width: 10 }, { header: 'Fecha de ejecución', key: 'fecha', width: 22 }, { header: 'Evidencias', key: 'ev', width: 40 }]);
  for (const s of porSuite) h4.addRow({ nombre: s.nombre, herr: s.herramienta, nivel: s.nivel, total: s.total, ap: s.aprobados, fa: s.fallidos, pe: s.pendientes, fecha: s.fecha ? new Date(s.fecha).toLocaleString('es-CO') : '', ev: `pruebas/evidencias/${s.area}/` });

  const h5 = wb.addWorksheet('Defectos');
  cabecera(h5, [{ header: 'Id', key: 'id', width: 7 }, { header: 'Hallazgo', key: 'hallazgo', width: 70 }, { header: 'Origen (prueba que lo detectó)', key: 'origen', width: 36 }, { header: 'Corrección aplicada', key: 'correccion', width: 70 }, { header: 'Verificación', key: 'verificacion', width: 40 }, { header: 'Casos que lo verifican', key: 'casos', width: 40 }, { header: 'Estado', key: 'estado', width: 12 }]);
  for (const d of defectos) h5.addRow({ id: d.id, hallazgo: d.hallazgo, origen: d.origen, correccion: d.correccion, verificacion: d.verificacion, casos: d.casos.join(', '), estado: /pendiente/i.test(d.correccion) ? 'Parcial' : 'Corregido' });
  h5.eachRow((f) => { f.alignment = { vertical: 'top', wrapText: true }; });
  colorearEstado(h5, 7);

  const xlsx = path.join(SALIDA, 'Matriz-Trazabilidad-TaskFlow.xlsx');
  await wb.xlsx.writeFile(xlsx);

  // ---------- 5. Markdown compacto ----------
  const md = ['# Matriz de trazabilidad — TaskFlow', '', `Generada: ${new Date().toLocaleString('es-CO')}. ${matriz.totales.casos} casos trazados (${matriz.totales.aprobados} aprobados, ${matriz.totales.fallidos} fallidos, ${matriz.totales.pendientes} pendientes); ${matriz.totales.requisitosCubiertos}/${matriz.totales.requisitos} requisitos cubiertos; ${matriz.totales.defectos} defectos registrados.`, '', '## Requisitos', '', '| Requisito | Tipo | Descripción | Funcionalidad | Casos | Aprobados | Fallidos | Suites | Defectos | Cobertura |', '|---|---|---|---|---:|---:|---:|---|---|---|'];
  for (const r of porRequisito) md.push(`| ${r.id} | ${r.tipo} | ${r.texto} | ${r.funcionalidad} | ${r.casos} | ${r.aprobados} | ${r.fallidos} | ${r.suites.join(', ')} | ${r.defectos.join(', ') || '—'} | ${r.cobertura} |`);
  md.push('', '## Funcionalidades', '', '| Id | Funcionalidad | Integrante | Casos | Aprobados | Exitosos / alternativos / error | Suites | Defectos |', '|---|---|---|---:|---:|---|---|---|');
  for (const f of porFuncionalidad) md.push(`| ${f.id} | ${f.nombre} | ${f.integrante} | ${f.casos} | ${f.aprobados} | ${f.tipos.exitosos} / ${f.tipos.alternativos} / ${f.tipos.error} | ${Object.entries(f.porArea).map(([a, n]) => `${a} (${n})`).join(', ')} | ${f.defectos.join(', ') || '—'} |`);
  md.push('', '## Defectos', '', '| Id | Hallazgo | Origen | Corrección | Casos que lo verifican |', '|---|---|---|---|---|');
  for (const d of defectos) md.push(`| ${d.id} | ${d.hallazgo} | ${d.origen} | ${d.correccion} | ${d.casos.join(', ') || d.verificacion} |`);
  md.push('', `Detalle completo caso por caso: \`Matriz-Trazabilidad-TaskFlow.xlsx\` (hoja «Matriz») y \`matriz.json\`.`);
  fs.writeFileSync(path.join(SALIDA, 'matriz.md'), md.join('\n'), 'utf8');

  const sinFuncionalidad = casos.filter((c) => c.funcionalidadId === 'T').map((c) => c.id);
  console.log(`Matriz: ${matriz.totales.casos} casos, ${matriz.totales.requisitosCubiertos}/${matriz.totales.requisitos} requisitos cubiertos → ${path.relative(RAIZ, xlsx)}`);
  if (sinFuncionalidad.length) console.log(`Casos sin funcionalidad asignada (${sinFuncionalidad.length}): ${sinFuncionalidad.slice(0, 30).join(', ')}${sinFuncionalidad.length > 30 ? '…' : ''}`);
  const sinCobertura = porRequisito.filter((r) => !r.casos).map((r) => r.id);
  if (sinCobertura.length) console.log(`Requisitos sin cobertura: ${sinCobertura.join(', ')}`);
})();
