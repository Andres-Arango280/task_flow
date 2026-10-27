// Compara la versión ANTERIOR del software (último commit en git, HEAD) con la versión FINAL
// refactorizada (árbol de trabajo) y genera evidencias objetivas para el criterio
// «Software refactorizado y comparación antes y después».
//   node pruebas/comparacion/comparar.mjs
// Salidas: pruebas/evidencias/comparacion/antes-despues.json y antes-despues.md
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SALIDA = join(RAIZ, 'pruebas', 'evidencias', 'comparacion');
mkdirSync(SALIDA, { recursive: true });

const git = (...args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const REF = process.env.REF_ANTES ?? 'HEAD';
const commit = git('log', '-1', '--format=%h|%ad|%s', '--date=short', REF).trim().split('|');

// ---------- utilidades ----------
const esCodigo = (ruta) => /\.(ts|tsx|js|mjs)$/.test(ruta) && !/\.d\.ts$/.test(ruta);
const esPrueba = (ruta) => /\.(spec|cy|test)\.(ts|tsx|js|mjs)$/.test(ruta) || /\.feature$/.test(ruta);
const contarLineas = (texto) => (texto.match(/\n/g) ?? []).length + (texto.endsWith('\n') ? 0 : 1);
const contarIts = (texto) => (texto.match(/^\s*(it|test)\s*\(/gm) ?? []).length;
const contarEscenarios = (texto) => (texto.match(/^\s*(Escenario|Esquema del escenario|Scenario|Scenario Outline):/gm) ?? []).length;

// Archivos de la versión anterior (git) y de la final (disco), limitados a las carpetas de código y pruebas
const CARPETAS = ['src', 'taskflow-frontend/src', 'taskflow-frontend/cypress', 'pruebas'];
const IGNORAR = /(^|\/)(node_modules|dist|coverage|evidencias|reportes|reports|target|test-results|playwright-report|results|screenshots|videos|\.venv|browser-data|informe\/node_modules)(\/|$)/;

const archivosAntes = git('ls-tree', '-r', REF, '--name-only')
  .split('\n')
  .filter((r) => r && CARPETAS.some((c) => r.startsWith(c + '/')) && !IGNORAR.test(r));

const listar = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    const rel = relative(RAIZ, ruta).split('\\').join('/');
    if (IGNORAR.test(rel)) return [];
    return statSync(ruta).isDirectory() ? listar(ruta) : [rel];
  });
};
const archivosDespues = CARPETAS.flatMap((c) => listar(join(RAIZ, c)));

const leerAntes = (ruta) => {
  try {
    return git('show', `${REF}:${ruta}`);
  } catch {
    return '';
  }
};
const leerDespues = (ruta) => readFileSync(join(RAIZ, ruta), 'utf8');

function metricas(archivos, leer) {
  const m = { archivos: archivos.length, archivosCodigo: 0, archivosPrueba: 0, lineasCodigo: 0, lineasPrueba: 0, casosIt: 0, escenariosGherkin: 0, porCarpeta: {} };
  for (const ruta of archivos) {
    const texto = leer(ruta);
    const carpeta = ruta.split('/').slice(0, ruta.startsWith('pruebas/') || ruta.startsWith('taskflow-frontend/') ? 2 : 1).join('/');
    m.porCarpeta[carpeta] ??= { archivos: 0, lineas: 0 };
    m.porCarpeta[carpeta].archivos += 1;
    m.porCarpeta[carpeta].lineas += contarLineas(texto);
    if (esPrueba(ruta)) {
      m.archivosPrueba += 1;
      m.lineasPrueba += contarLineas(texto);
      m.casosIt += contarIts(texto);
      m.escenariosGherkin += contarEscenarios(texto);
    } else if (esCodigo(ruta)) {
      m.archivosCodigo += 1;
      m.lineasCodigo += contarLineas(texto);
    }
  }
  return m;
}

const antes = metricas(archivosAntes, leerAntes);
const despues = metricas(archivosDespues, leerDespues);

// ---------- dependencias, módulos y características ----------
const pkgAntes = JSON.parse(leerAntes('package.json'));
const pkgDespues = JSON.parse(leerDespues('package.json'));
const pkgFrontAntes = JSON.parse(leerAntes('taskflow-frontend/package.json') || '{}');
const pkgFrontDespues = JSON.parse(leerDespues('taskflow-frontend/package.json'));
const difDeps = (a = {}, b = {}) => ({
  anadidas: Object.keys(b).filter((k) => !(k in a)),
  eliminadas: Object.keys(a).filter((k) => !(k in b)),
  actualizadas: Object.keys(b).filter((k) => k in a && a[k] !== b[k]).map((k) => `${k}: ${a[k]} → ${b[k]}`),
});

const textoDe = (archivos, leer) => archivos.filter(esCodigo).map((r) => `// ${r}\n${leer(r)}`).join('\n');
const codigoAntes = textoDe(archivosAntes.filter((r) => r.startsWith('src/') || r.startsWith('taskflow-frontend/src/')), leerAntes);
const codigoDespues = textoDe(archivosDespues.filter((r) => r.startsWith('src/') || r.startsWith('taskflow-frontend/src/')), leerDespues);

const CARACTERISTICAS = [
  ['Base de datos', /mongoose|MongooseModule/, /typeorm|TypeOrmModule/, 'MongoDB + Mongoose', 'PostgreSQL + TypeORM (entidades, índices en claves foráneas)'],
  ['Cabeceras de seguridad (helmet)', /helmet\(\)/, /helmet\(\)/, 'Sin helmet', 'helmet(): CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy'],
  ['X-Powered-By', /disable\('x-powered-by'\)/, /disable\('x-powered-by'\)/, 'Expuesto', 'Desactivado'],
  ['CORS', /origin:\s*true/, /FRONTEND_URL/, 'Abierto a cualquier origen (origin: true)', 'Limitado a FRONTEND_URL'],
  ['Protección fuerza bruta', /LimitadorIntentos/, /LimitadorIntentos/, 'Sin límite de intentos', 'Bloqueo 15 min tras 5 fallos por cuenta (HTTP 429)'],
  ['Secreto JWT', /JWT_SECRET.*\|\|\s*['"]/, /getOrThrow(<[^>]*>)?\(\s*['"]JWT_SECRET/, 'Valor por defecto en el código (\'coco258\')', 'getOrThrow sin valor por defecto; secreto de 64 caracteres en .env'],
  ['Política de contraseñas', /MinLength\(\s*[6-7]\s*\)/, /MinLength\(\s*8\s*\)|Matches\(.*\\d|al menos un número/i, 'Mínimo 6 caracteres', 'Mínimo 8 caracteres con letra y número (backend y formulario)'],
  ['Login resistente a enumeración por tiempo', /bcrypt\.compare/, /hash ficticio|HASH_FICTICIO|compare\([^)]*ficticio/i, 'bcrypt.compare solo si existe el correo', 'bcrypt.compare siempre (hash ficticio si el correo no existe)'],
  ['Validación de entrada en español', /ValidationPipe\(\{ whitelist: true \}\)/, /crearValidationPipe|traducir/i, 'Mensajes genéricos en inglés', 'Pipe propio con mensajes en español y traducción de reglas (isUuid, etc.)'],
  ['Avisos (toasts) y manejo de errores en la interfaz', /console\.error\(/, /Toast|useToast|aviso/i, 'Errores solo en consola', 'Avisos en español con código de referencia, Deshacer y confirmaciones'],
  ['Ayuda, preferencias y privacidad', /pages\/Ayuda|pages\/Preferencias|pages\/Privacidad/, /pages\/Ayuda|pages\/Preferencias|pages\/Privacidad/, 'No existían', 'Páginas de Ayuda (FAQ), Preferencias de accesibilidad y Privacidad'],
  ['Búsqueda tolerante a errores', /lib\/busqueda/, /lib\/busqueda/, 'Sin búsqueda', 'Búsqueda de tareas/equipos tolerante a tildes y erratas'],
  ['Accesibilidad (WCAG 2.5.3, landmarks, dnd accesible)', /aria-label=\{`Tarea/, /data-testid="abrir-tarea"|dragHandleUsageInstructions/, 'aria-label distinto del texto visible', 'Nombre accesible = texto visible; anuncios de arrastre en español; landmark main'],
  ['Edición y eliminación (tareas, proyectos, equipos, cuenta)', /@Delete\('me'\)|@Patch\(':id'\)\s*\n\s*(actualizar|editar)/, /@Delete\('me'\)/, 'Solo creación y movimiento', 'PATCH/DELETE de tareas, proyectos, equipos y cuenta propia'],
  ['Índices en claves foráneas', /@Index\(/, /@Index\(/, 'Sin índices (p95 569 ms en REN-02)', '@Index en listaId, proyectoId, equipoId, liderId, tareaId (p95 273 ms)'],
];
const caracteristicas = CARACTERISTICAS.map(([nombre, reAntes, reDespues, textoAntes, textoDespues]) => ({
  caracteristica: nombre,
  antes: textoAntes,
  despues: textoDespues,
  detectadoAntes: reAntes.test(codigoAntes),
  detectadoDespues: reDespues.test(codigoDespues),
}));

// ---------- extractos de código clave (diff real) ----------
const EXTRACTOS = [
  { titulo: 'Arranque de la API (seguridad HTTP y CORS)', archivo: 'src/main.ts' },
  { titulo: 'Servicio de autenticación (login)', archivo: 'src/auth/auth.service.ts' },
  { titulo: 'Validación del inicio de sesión (DTO)', archivo: 'src/auth/dto/auth.dto.ts' },
  { titulo: 'Entidad/esquema de tarea', archivo: 'src/tareas/entities/tarea.entity.ts', archivoAntes: 'src/tareas/schemas/tarea.schema.ts' },
  { titulo: 'Estado de sesión del frontend (restauración al recargar)', archivo: 'taskflow-frontend/src/store/useAuthStore.ts' },
];
const recortar = (t, n = 70) => t.split('\n').slice(0, n).join('\n');
const extractos = EXTRACTOS.map((e) => ({
  titulo: e.titulo,
  archivoAntes: e.archivoAntes ?? e.archivo,
  archivoDespues: e.archivo,
  antes: recortar(leerAntes(e.archivoAntes ?? e.archivo) || '(no existía)'),
  despues: recortar(existsSync(join(RAIZ, e.archivo)) ? leerDespues(e.archivo) : '(no existe)'),
}));

// ---------- diff global ----------
const diffStat = git('diff', '--stat', REF, '--', 'src', 'taskflow-frontend/src', 'package.json', 'taskflow-frontend/package.json').trim().split('\n').pop() ?? '';
const nuevosSinSeguimiento = git('ls-files', '--others', '--exclude-standard', '--', 'src', 'taskflow-frontend/src', 'taskflow-frontend/cypress', 'pruebas')
  .split('\n')
  .filter((r) => r && !IGNORAR.test(r)).length;

// ---------- suites de prueba y resultados (evidencias reales) ----------
const EVID = join(RAIZ, 'pruebas', 'evidencias');
const leerResumen = (area) => {
  const r = join(EVID, area, 'resumen.json');
  return existsSync(r) ? JSON.parse(readFileSync(r, 'utf8')) : null;
};
const suites = ['backend-jest', 'cypress', 'seguridad', 'rendimiento', 'ux-accesibilidad', 'screenplay', 'gherkin', 'stagehand', 'ia-herramientas', 'katalon']
  .map((area) => ({ area, r: leerResumen(area) }))
  .filter((s) => s.r)
  .map(({ area, r }) => ({ area, herramienta: r.herramienta, total: r.totales?.total ?? 0, aprobados: r.totales?.aprobados ?? 0, fallidos: r.totales?.fallidos ?? 0, fecha: r.fecha }));

const extra = JSON.parse(readFileSync(join(RAIZ, 'pruebas', 'informe', 'datos-extra.json'), 'utf8'));

// ---------- SonarQube (si está disponible) ----------
async function sonar(projectKey) {
  try {
    const metricas = 'bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc,security_hotspots,reliability_rating,security_rating,sqale_rating,alert_status';
    const r = await fetch(`http://localhost:9000/api/measures/component?component=${encodeURIComponent(projectKey)}&metricKeys=${metricas}`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const d = await r.json();
    return Object.fromEntries((d.component?.measures ?? []).map((m) => [m.metric, m.value]));
  } catch {
    return null;
  }
}
const sonarBackend = await sonar('taskflow:backend');
const sonarFrontend = await sonar('taskflow:frontend');

const resultado = {
  generado: new Date().toISOString(),
  versionAnterior: { ref: REF, commit: commit[0], fecha: commit[1], mensaje: commit[2], descripcion: 'Último commit del repositorio antes de la refactorización (API NestJS sobre MongoDB/Mongoose, sin pruebas de interfaz).' },
  versionFinal: { descripcion: 'Árbol de trabajo actual: backend NestJS + PostgreSQL/TypeORM, frontend React refactorizado según los hallazgos de las pruebas, y todas las suites de prueba.', diffStat, archivosNuevos: nuevosSinSeguimiento },
  metricas: { antes, despues },
  dependencias: {
    backend: difDeps(pkgAntes.dependencies, pkgDespues.dependencies),
    backendDev: difDeps(pkgAntes.devDependencies, pkgDespues.devDependencies),
    frontend: difDeps(pkgFrontAntes.dependencies, pkgFrontDespues.dependencies),
    frontendDev: difDeps(pkgFrontAntes.devDependencies, pkgFrontDespues.devDependencies),
    scriptsNpm: { antes: Object.keys(pkgAntes.scripts ?? {}).length, despues: Object.keys(pkgDespues.scripts ?? {}).length },
  },
  caracteristicas,
  correcciones: extra.correcciones ?? [],
  evolucionSuites: extra.evolucion ?? [],
  griho: extra.griho ?? [],
  suitesFinales: suites,
  sonar: { backend: sonarBackend, frontend: sonarFrontend, nota: sonarBackend ? 'Métricas leídas del servidor SonarQube local en el momento de la comparación.' : 'SonarQube no estaba disponible al generar la comparación; ver evidencias de despliegue.' },
  extractos,
};

writeFileSync(join(SALIDA, 'antes-despues.json'), JSON.stringify(resultado, null, 2), 'utf8');

// ---------- Markdown ----------
const f = (n) => Number(n).toLocaleString('es-CO');
const md = [];
md.push('# TaskFlow: comparación antes y después de la refactorización', '');
md.push(`Generado: ${new Date().toLocaleString('es-CO')}. Versión anterior: commit \`${commit[0]}\` (${commit[1]}, «${commit[2]}»). Versión final: árbol de trabajo actual.`, '');
md.push('## 1. Métricas de código y pruebas', '');
md.push('| Métrica | Antes | Después | Variación |', '|---|---:|---:|---:|');
const fila = (n, a, b) => md.push(`| ${n} | ${f(a)} | ${f(b)} | ${b - a >= 0 ? '+' : ''}${f(b - a)} |`);
fila('Archivos de código (backend + frontend + pruebas)', antes.archivosCodigo, despues.archivosCodigo);
fila('Líneas de código de la aplicación', antes.lineasCodigo, despues.lineasCodigo);
fila('Archivos de prueba', antes.archivosPrueba, despues.archivosPrueba);
fila('Líneas de código de prueba', antes.lineasPrueba, despues.lineasPrueba);
fila('Casos it()/test() automatizados', antes.casosIt, despues.casosIt);
fila('Escenarios Gherkin', antes.escenariosGherkin, despues.escenariosGherkin);
fila('Scripts npm (backend)', resultado.dependencias.scriptsNpm.antes, resultado.dependencias.scriptsNpm.despues);
md.push('', `Diff de \`src/\`, \`taskflow-frontend/src/\` y los package.json frente a ${REF}: ${diffStat}. Archivos nuevos sin seguimiento en git (código, Cypress y pruebas/): ${nuevosSinSeguimiento}.`, '');
md.push('### Líneas por carpeta', '', '| Carpeta | Antes (archivos / líneas) | Después (archivos / líneas) |', '|---|---:|---:|');
for (const c of [...new Set([...Object.keys(antes.porCarpeta), ...Object.keys(despues.porCarpeta)])].sort()) {
  const a = antes.porCarpeta[c] ?? { archivos: 0, lineas: 0 };
  const b = despues.porCarpeta[c] ?? { archivos: 0, lineas: 0 };
  md.push(`| ${c} | ${a.archivos} / ${f(a.lineas)} | ${b.archivos} / ${f(b.lineas)} |`);
}
md.push('', '## 2. Dependencias', '');
for (const [nombre, d] of Object.entries(resultado.dependencias).filter(([k]) => k !== 'scriptsNpm')) {
  md.push(`- **${nombre}**: añadidas ${d.anadidas.length ? d.anadidas.join(', ') : '—'}; eliminadas ${d.eliminadas.length ? d.eliminadas.join(', ') : '—'}; actualizadas ${d.actualizadas.length ? d.actualizadas.join(', ') : '—'}.`);
}
md.push('', '## 3. Características y controles (detectados en el código)', '', '| Característica | Antes | Después |', '|---|---|---|');
for (const c of caracteristicas) md.push(`| ${c.caracteristica} | ${c.antes}${c.detectadoAntes ? '' : ''} | ${c.despues}${c.detectadoDespues ? ' ✔' : ' (no detectado automáticamente)'} |`);
md.push('', '## 4. Correcciones derivadas de las pruebas', '', '| Id | Hallazgo | Origen | Corrección | Verificación |', '|---|---|---|---|---|');
for (const c of resultado.correcciones) md.push(`| ${c.id} | ${c.hallazgo} | ${c.origen} | ${c.correccion} | ${c.verificacion} |`);
md.push('', '## 5. Evolución de las suites (primera ejecución → ejecución final)', '', '| Suite | Antes | Después | Comentario |', '|---|---|---|---|');
for (const e of resultado.evolucionSuites) md.push(`| ${e.suite} | ${e.antes} | ${e.despues} | ${e.comentario} |`);
md.push('', '## 6. Resultados finales por suite (evidencias reales)', '', '| Suite | Herramienta | Casos | Aprobados | Fallidos | Fecha |', '|---|---|---:|---:|---:|---|');
for (const s of suites) md.push(`| ${s.area} | ${s.herramienta} | ${s.total} | ${s.aprobados} | ${s.fallidos} | ${s.fecha?.slice(0, 10) ?? ''} |`);
if (sonarBackend) {
  md.push('', '## 7. SonarQube (versión final)', '', '| Métrica | Backend | Frontend |', '|---|---|---|');
  for (const k of Object.keys(sonarBackend)) md.push(`| ${k} | ${sonarBackend[k]} | ${sonarFrontend?.[k] ?? '—'} |`);
}
md.push('', '## 8. Extractos de código: antes y después', '');
for (const e of extractos) {
  md.push(`### ${e.titulo}`, '', `**Antes** (\`${e.archivoAntes}\`):`, '', '```ts', e.antes, '```', '', `**Después** (\`${e.archivoDespues}\`):`, '', '```ts', e.despues, '```', '');
}
writeFileSync(join(SALIDA, 'antes-despues.md'), md.join('\n'), 'utf8');
console.log(`Comparación generada en ${relative(RAIZ, SALIDA)}: ${antes.casosIt} → ${despues.casosIt} casos automatizados; ${antes.lineasCodigo} → ${despues.lineasCodigo} líneas de código.`);
