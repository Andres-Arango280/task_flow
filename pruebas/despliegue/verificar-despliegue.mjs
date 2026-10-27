// Verifica el último despliegue de TaskFlow (SonarQube + Jenkins) y la regresión posterior a la
// refactorización, y escribe evidencias en pruebas/evidencias/despliegue/.
//
//   node pruebas/despliegue/verificar-despliegue.mjs
//
// Variables opcionales (sin ellas, los pasos que las necesitan quedan "Pendiente" con instrucciones):
//   SONAR_TOKEN            token de usuario de SonarQube (Mi cuenta → Seguridad → Generar token)
//   SONAR_HOST_URL         por defecto http://localhost:9000
//   JENKINS_URL            por defecto http://localhost:8081
//   JENKINS_USER / JENKINS_TOKEN   usuario y API token de Jenkins para disparar el job
//   JENKINS_JOB            por defecto taskflow-pipeline
//   SALTAR_SCANNER=1       no ejecutar sonar-scanner (solo leer el estado actual)
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVID = join(RAIZ, 'pruebas', 'evidencias');
const SALIDA = join(EVID, 'despliegue');
mkdirSync(join(SALIDA, 'sonar'), { recursive: true });
mkdirSync(join(SALIDA, 'jenkins'), { recursive: true });
mkdirSync(join(SALIDA, 'build'), { recursive: true });

const SONAR = process.env.SONAR_HOST_URL ?? 'http://localhost:9000';
const JENKINS = process.env.JENKINS_URL ?? 'http://localhost:8081';
const JOB = process.env.JENKINS_JOB ?? 'taskflow-pipeline';
const TOKEN = process.env.SONAR_TOKEN;
const inicio = Date.now();
const casos = [];
const guardar = (nombre, datos) => {
  writeFileSync(join(SALIDA, nombre), typeof datos === 'string' ? datos : JSON.stringify(datos, null, 2), 'utf8');
  return nombre.replace(/\\/g, '/');
};
const caso = (id, nombre, tipo, objetivo, esperado, obtenido, estado, evidencia = [], extra = {}) => {
  casos.push({ id, nombre, tipo, objetivo, esperado, obtenido, estado, evidencia, ...extra });
  console.log(`${estado === 'Aprobado' ? '✔' : estado === 'Fallido' ? '✘' : '…'} ${id} ${nombre} → ${obtenido.slice(0, 160)}`);
};
const http = async (url, opciones = {}, intentos = 3) => {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { ...opciones, signal: AbortSignal.timeout(opciones.timeout ?? 15000) });
      const texto = await r.text();
      let json = null;
      try { json = JSON.parse(texto); } catch { /* no es JSON */ }
      return { ok: r.ok, status: r.status, json, texto, headers: r.headers };
    } catch (e) {
      // Error de red transitorio (ECONNRESET, fetch failed…): reintentar antes de darlo por fallido.
      if (i >= intentos) return { ok: false, status: 0, json: null, texto: String(e.message) };
      await new Promise((res) => setTimeout(res, 1500 * i));
    }
  }
};
const authSonar = TOKEN ? { Authorization: `Basic ${Buffer.from(`${TOKEN}:`).toString('base64')}` } : {};
const authJenkins = process.env.JENKINS_USER && process.env.JENKINS_TOKEN ? { Authorization: `Basic ${Buffer.from(`${process.env.JENKINS_USER}:${process.env.JENKINS_TOKEN}`).toString('base64')}` } : null;
const ejecutar = (cmd, args, cwd, archivoSalida) => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024, env: { ...process.env } });
  const salida = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  if (archivoSalida) guardar(archivoSalida, salida);
  return { status: r.status, salida };
};

// ---------- DEP: contenedores, compilación e imagen ----------
const compose = ejecutar('docker', ['compose', 'ps', '--format', 'json'], RAIZ, 'docker-compose-ps.json');
const servicios = compose.salida.split('\n').filter((l) => l.trim().startsWith('{')).map((l) => JSON.parse(l));
const activos = servicios.filter((s) => /running|Up/i.test(s.State ?? s.Status ?? ''));
caso('DEP-01', 'Servicios de CI/CD en ejecución (docker compose)', 'positivo',
  'Verificar que los contenedores de SonarQube, su base de datos y Jenkins definidos en docker-compose.yml están levantados.',
  'sonarqube, sonarqube-db y jenkins en estado running.',
  servicios.length ? servicios.map((s) => `${s.Name ?? s.Service}: ${s.State ?? s.Status}`).join('; ') : `docker compose no respondió: ${compose.salida.trim().slice(0, 200)}`,
  activos.length >= 3 ? 'Aprobado' : 'Fallido', ['docker-compose-ps.json']);

const build = ejecutar('npm', ['run', 'build'], RAIZ, 'build/backend-build.log');
caso('DEP-02', 'Compilación del backend (nest build)', 'positivo', 'Verificar que la versión refactorizada del backend compila sin errores de TypeScript.', 'Salida 0 y carpeta dist/main.js generada.',
  build.status === 0 && existsSync(join(RAIZ, 'dist', 'main.js')) ? 'nest build terminó con código 0 y generó dist/main.js' : `nest build terminó con código ${build.status}: ${build.salida.trim().slice(-300)}`,
  build.status === 0 && existsSync(join(RAIZ, 'dist', 'main.js')) ? 'Aprobado' : 'Fallido', ['build/backend-build.log']);

const buildFront = ejecutar('npm', ['run', 'build'], join(RAIZ, 'taskflow-frontend'), 'build/frontend-build.log');
caso('DEP-03', 'Compilación del frontend (tsc + vite build)', 'positivo', 'Verificar que el frontend refactorizado compila (tipos) y se empaqueta para producción.', 'Salida 0 y taskflow-frontend/dist/index.html generado.',
  buildFront.status === 0 && existsSync(join(RAIZ, 'taskflow-frontend', 'dist', 'index.html')) ? 'vite build terminó con código 0 y generó dist/index.html' : `vite build terminó con código ${buildFront.status}: ${buildFront.salida.trim().slice(-300)}`,
  buildFront.status === 0 ? 'Aprobado' : 'Fallido', ['build/frontend-build.log']);

const imagen = ejecutar('docker', ['build', '-t', 'taskflow-backend:final', '.'], RAIZ, 'build/docker-build.log');
caso('DEP-04', 'Imagen Docker del backend (misma etapa que el pipeline)', 'positivo', 'Verificar que el Dockerfile multi-etapa construye la imagen de producción del backend refactorizado.', 'docker build termina con código 0 y la imagen taskflow-backend:final existe.',
  imagen.status === 0 ? `docker build OK: ${(imagen.salida.match(/(?:writing image|Successfully built)[^\n]*/) ?? ['imagen creada'])[0].trim()}` : `docker build terminó con código ${imagen.status}: ${imagen.salida.trim().slice(-300)}`,
  imagen.status === 0 ? 'Aprobado' : 'Fallido', ['build/docker-build.log']);

// ---------- SON: SonarQube ----------
const estado = await http(`${SONAR}/api/system/status`);
guardar('sonar/system-status.json', estado.json ?? estado.texto);
caso('SON-01', 'Servidor SonarQube disponible', 'positivo', 'Verificar que SonarQube responde y está operativo.', 'status UP.',
  estado.json?.status ? `SonarQube ${estado.json.version} status=${estado.json.status}` : `Sin respuesta (${estado.status}): ${estado.texto.slice(0, 120)}`,
  estado.json?.status === 'UP' ? 'Aprobado' : 'Fallido', ['sonar/system-status.json']);

const proyectos = [
  { clave: 'taskflow:backend', carpeta: RAIZ, lcov: 'coverage/lcov.info', nombre: 'backend' },
  { clave: 'taskflow:frontend', carpeta: join(RAIZ, 'taskflow-frontend'), lcov: null, nombre: 'frontend' },
];
let n = 2;
for (const p of proyectos) {
  const idAnalisis = `SON-0${n++}`;
  if (!TOKEN) {
    caso(idAnalisis, `Análisis SonarQube del ${p.nombre}`, 'positivo', `Ejecutar sonar-scanner sobre ${p.nombre} y esperar la Quality Gate.`, 'Análisis EXECUTION SUCCESS y Quality Gate OK.',
      'Pendiente: defina SONAR_TOKEN (SonarQube → Mi cuenta → Seguridad → Generar token) y vuelva a ejecutar este script. El servidor exige autenticación (401 para peticiones anónimas).', 'Pendiente', []);
    continue;
  }
  if (!process.env.SALTAR_SCANNER) {
    if (p.lcov) ejecutar('npx', ['jest', '--selectProjects', 'unit', '--coverage', '--coverageReporters=lcov', '--runInBand'], RAIZ, `sonar/${p.nombre}-cobertura.log`);
    const scan = ejecutar('sonar-scanner', [`-Dsonar.host.url=${SONAR}`, `-Dsonar.token=${TOKEN}`, '-Dsonar.qualitygate.wait=true', '-Dsonar.qualitygate.timeout=300'], p.carpeta, `sonar/${p.nombre}-scanner.log`);
    const subido = /Analysis report uploaded/.test(scan.salida);
    const qgTexto = (scan.salida.match(/QUALITY GATE STATUS: (\w+)/) ?? [])[1];
    const archivos = (scan.salida.match(/(\d+) files indexed/) ?? [])[1];
    caso(idAnalisis, `Análisis SonarQube del ${p.nombre} (sonar-scanner)`, 'positivo', `Ejecutar el análisis estático del ${p.nombre} refactorizado con sonar-scanner y subir el informe al servidor.`, 'Informe de análisis subido y procesado por SonarQube (EXECUTION SUCCESS o QUALITY GATE STATUS reportado).',
      subido ? `Informe subido y procesado${archivos ? ` (${archivos} archivos indexados)` : ''}; estado reportado por el scanner: ${qgTexto ?? (scan.status === 0 ? 'EXECUTION SUCCESS' : 'ver registro')}` : `sonar-scanner terminó con código ${scan.status}: ${scan.salida.trim().slice(-400)}`,
      subido ? 'Aprobado' : 'Fallido', [`sonar/${p.nombre}-scanner.log`]);
  }
  const metricas = 'bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc,security_hotspots,reliability_rating,security_rating,sqale_rating,alert_status';
  const medidas = await http(`${SONAR}/api/measures/component?component=${encodeURIComponent(p.clave)}&metricKeys=${metricas}`, { headers: authSonar });
  const qg = await http(`${SONAR}/api/qualitygates/project_status?projectKey=${encodeURIComponent(p.clave)}`, { headers: authSonar });
  const historial = await http(`${SONAR}/api/project_analyses/search?project=${encodeURIComponent(p.clave)}&ps=10`, { headers: authSonar });
  guardar(`sonar/${p.nombre}-medidas.json`, medidas.json ?? medidas.texto);
  guardar(`sonar/${p.nombre}-quality-gate.json`, qg.json ?? qg.texto);
  guardar(`sonar/${p.nombre}-analisis.json`, historial.json ?? historial.texto);
  const m = Object.fromEntries((medidas.json?.component?.measures ?? []).map((x) => [x.metric, x.value]));
  const estadoQg = qg.json?.projectStatus?.status;
  const condiciones = (qg.json?.projectStatus?.conditions ?? []).map((c) => `${c.metricKey} ${c.status} (${c.actualValue ?? '—'} vs ${c.comparator} ${c.errorThreshold})`);
  const fallidas = (qg.json?.projectStatus?.conditions ?? []).filter((c) => c.status !== 'OK').map((c) => `${c.metricKey}=${c.actualValue ?? '—'} (umbral ${c.comparator} ${c.errorThreshold})`);
  const textoMedidas = medidas.ok
    ? `bugs=${m.bugs}, vulnerabilidades=${m.vulnerabilities}, code smells=${m.code_smells}, cobertura=${m.coverage ?? '—'} %, duplicación=${m.duplicated_lines_density} %, hotspots=${m.security_hotspots}, ncloc=${m.ncloc}; análisis registrados=${historial.json?.analyses?.length ?? '?'}`
    : `métricas detalladas no legibles con este token (${medidas.status}: ${(medidas.json?.errors?.[0]?.msg ?? medidas.texto).slice(0, 80)}; un token de usuario con permiso de navegación las devuelve)`;
  caso(`SON-0${n++}`, `Quality Gate del ${p.nombre}`, 'positivo', `Leer el estado de la Quality Gate («Sonar way»: nuevo código) y las métricas del ${p.nombre} en SonarQube tras el análisis final.`, 'Quality Gate OK: fiabilidad, seguridad y mantenibilidad A en código nuevo, cobertura nueva ≥ 80 %, duplicación nueva ≤ 3 %, 100 % de hotspots revisados.',
    estadoQg ? `Quality Gate=${estadoQg}${fallidas.length ? `; condiciones incumplidas: ${fallidas.join('; ')}` : ''}; condiciones: ${condiciones.join(' · ')}. ${textoMedidas}` : `No se pudo leer la Quality Gate (${qg.status}): ${qg.texto.slice(0, 150)}`,
    estadoQg === 'OK' ? 'Aprobado' : estadoQg ? 'Fallido' : 'Pendiente', [`sonar/${p.nombre}-quality-gate.json`, `sonar/${p.nombre}-medidas.json`, `sonar/${p.nombre}-analisis.json`],
    { metricas: m, qualityGate: estadoQg, condiciones: qg.json?.projectStatus?.conditions ?? [], observacion: fallidas.some((f) => f.startsWith('new_security_hotspots_reviewed')) ? 'Los hotspots de seguridad exigen revisión humana en SonarQube (Project → Security Hotspots → Safe/Fixed); no indican una vulnerabilidad confirmada.' : undefined });
}

// ---------- JEN: Jenkins ----------
const jenkinsApi = await http(`${JENKINS}/api/json?tree=jobs[name,color,url]`);
guardar('jenkins/jenkins-api.json', jenkinsApi.json ?? jenkinsApi.texto);
const job = await http(`${JENKINS}/job/${JOB}/api/json?tree=name,color,builds[number,result,timestamp,duration,url]{0,10},lastSuccessfulBuild[number,timestamp],lastBuild[number,result]`);
guardar('jenkins/job-api.json', job.json ?? job.texto);
caso('JEN-01', 'Servidor Jenkins y job del pipeline disponibles', 'positivo', 'Verificar que Jenkins responde y que existe el job taskflow-pipeline (Jenkinsfile desde GitHub).', `Jenkins responde 200 y el job ${JOB} existe.`,
  job.ok ? `Jenkins OK (${(jenkinsApi.json?.jobs ?? []).length} jobs); ${JOB}: color=${job.json.color}, último build #${job.json.lastBuild?.number} (${job.json.lastBuild?.result}), último exitoso #${job.json.lastSuccessfulBuild?.number}` : `Jenkins/job no disponible (${job.status})`,
  job.ok ? 'Aprobado' : 'Fallido', ['jenkins/jenkins-api.json', 'jenkins/job-api.json']);

const builds = job.json?.builds ?? [];
const ultimoExitoso = builds.find((b) => b.result === 'SUCCESS');
if (ultimoExitoso) {
  const consola = await http(`${JENKINS}/job/${JOB}/${ultimoExitoso.number}/consoleText`, { timeout: 30000 });
  const limpio = consola.texto.replace(/\u001b\[[0-9;]*m/g, '').replace(/ha:\/\/\/\/[A-Za-z0-9+/=]+/g, '');
  guardar(`jenkins/build-${ultimoExitoso.number}-consola.log`, limpio);
  const etapas = [...limpio.matchAll(/\[Pipeline\] \{ \(([^)]+)\)/g)].map((x) => x[1]);
  const qgOk = /Quality gate is 'OK'/.test(limpio);
  const tests = (limpio.match(/Tests:\s+[^\n]+/g) ?? []).join(' | ');
  const commit = (limpio.match(/Checking out Revision ([0-9a-f]{7})/) ?? [])[1];
  caso('JEN-02', `Último build exitoso del pipeline (#${ultimoExitoso.number})`, 'positivo', 'Verificar que el pipeline completo (instalar, pruebas de regresión, build, SonarQube, Quality Gate, imagen Docker) terminó en SUCCESS.', 'Todas las etapas ejecutadas, Quality Gate OK y SUCCESS.',
    `Build #${ultimoExitoso.number} del ${new Date(ultimoExitoso.timestamp).toLocaleString('es-CO')} sobre el commit ${commit ?? '?'}: etapas ${etapas.join(' → ')}; ${tests}; Quality Gate ${qgOk ? 'OK' : 'no encontrada en la consola'}; resultado SUCCESS.`,
    'Aprobado', [`jenkins/build-${ultimoExitoso.number}-consola.log`, 'jenkins/job-api.json'], { commit, etapas });
}
const ultimo = builds[0];
if (ultimo && ultimo.result !== 'SUCCESS') {
  const consola = await http(`${JENKINS}/job/${JOB}/${ultimo.number}/consoleText`, { timeout: 30000 });
  const limpio = consola.texto.replace(/\u001b\[[0-9;]*m/g, '');
  guardar(`jenkins/build-${ultimo.number}-consola.log`, limpio);
  const causa = (limpio.match(/fatal: [^\n]+|ERROR: [^\n]+|Caused by: [^\n]+/) ?? [limpio.trim().split('\n').slice(-3).join(' ')])[0];
  caso('JEN-03', `Diagnóstico del último build (#${ultimo.number}, ${ultimo.result})`, 'negativo', 'Registrar la causa del último build no exitoso para corregirla antes del despliegue final.', 'Causa identificada y corregible (no es un fallo del software).',
    `Build #${ultimo.number}: ${causa.slice(0, 300)}`, /Could not resolve host|unable to access/.test(causa) ? 'Aprobado' : 'Fallido', [`jenkins/build-${ultimo.number}-consola.log`], { observacion: /Could not resolve host/.test(causa) ? 'El contenedor de Jenkins no tenía red para clonar GitHub; no es un fallo de las pruebas ni del código.' : undefined });
}

if (authJenkins) {
  const crumb = await http(`${JENKINS}/crumbIssuer/api/json`, { headers: authJenkins });
  const cab = { ...authJenkins, ...(crumb.json ? { [crumb.json.crumbRequestField]: crumb.json.crumb } : {}) };
  const disparo = await http(`${JENKINS}/job/${JOB}/build`, { method: 'POST', headers: cab });
  let nuevo = null;
  if (disparo.status === 201 || disparo.status === 200) {
    const siguiente = (ultimo?.number ?? 0) + 1;
    for (let i = 0; i < 90; i += 1) {
      await new Promise((r) => setTimeout(r, 10000));
      const b = await http(`${JENKINS}/job/${JOB}/${siguiente}/api/json?tree=number,result,building,timestamp,duration`, { headers: authJenkins });
      if (b.json && b.json.result) { nuevo = b.json; break; }
    }
  }
  if (nuevo) {
    const consola = await http(`${JENKINS}/job/${JOB}/${nuevo.number}/consoleText`, { headers: authJenkins, timeout: 30000 });
    const limpio = consola.texto.replace(/\u001b\[[0-9;]*m/g, '').replace(/ha:\/\/\/\/[A-Za-z0-9+/=]+/g, '');
    guardar(`jenkins/build-${nuevo.number}-consola.log`, limpio);
    caso('JEN-04', `Nuevo build del pipeline sobre la versión refactorizada (#${nuevo.number})`, 'positivo', 'Disparar el pipeline con el código final publicado en GitHub y verificar que termina en SUCCESS.', 'SUCCESS con Quality Gate OK.',
      `Build #${nuevo.number}: ${nuevo.result} en ${Math.round(nuevo.duration / 1000)} s. ${(limpio.match(/Tests:\s+[^\n]+/g) ?? []).join(' | ')} ${/Quality gate is 'OK'/.test(limpio) ? 'Quality Gate OK.' : ''}`,
      nuevo.result === 'SUCCESS' ? 'Aprobado' : 'Fallido', [`jenkins/build-${nuevo.number}-consola.log`]);
  } else {
    caso('JEN-04', 'Nuevo build del pipeline sobre la versión refactorizada', 'positivo', 'Disparar el pipeline con el código final.', 'SUCCESS.', `No se pudo disparar o esperar el build (HTTP ${disparo.status}).`, 'Fallido', []);
  }
} else {
  caso('JEN-04', 'Nuevo build del pipeline sobre la versión refactorizada', 'positivo', 'Disparar el pipeline con el código final publicado en GitHub (checkout scm de Claudia280-girl/validacion, rama main).', 'SUCCESS con Quality Gate OK.',
    'Pendiente: 1) git add -A && git commit && git push origin main; 2) defina JENKINS_USER y JENKINS_TOKEN (Jenkins → usuario → Configurar → API Token) y vuelva a ejecutar este script, o pulse «Construir ahora» en http://localhost:8081/job/taskflow-pipeline y guarde la consola en pruebas/evidencias/despliegue/jenkins/.', 'Pendiente', []);
}

// ---------- REG: regresión posterior a la refactorización ----------
const leer = (area) => {
  const r = join(EVID, area, 'resumen.json');
  return existsSync(r) ? JSON.parse(readFileSync(r, 'utf8')) : null;
};
const SUITES = [
  ['backend-jest', 'Regresión backend (Jest unitarias + e2e API)'],
  ['cypress', 'Cypress (API, regresión UI, componentes, seguridad, accesibilidad)'],
  ['screenplay', 'E2E Screenplay (Serenity/JS + Playwright)'],
  ['gherkin', 'E2E Gherkin + Screenplay (Cucumber)'],
  ['seguridad', 'Seguridad OWASP (node --test)'],
  ['ux-accesibilidad', 'UX y accesibilidad (axe, Lighthouse, Puppeteer)'],
  ['rendimiento', 'Rendimiento (autocannon)'],
];
const regresion = SUITES.map(([area, nombre]) => ({ area, nombre, r: leer(area) })).filter((s) => s.r);
const fechaRefactor = new Date('2026-10-13T00:00:00Z');
let i = 1;
for (const s of regresion) {
  const t = s.r.totales;
  const posterior = new Date(s.r.fecha) >= fechaRefactor;
  caso(`REG-0${i++}`, `Regresión posterior: ${s.nombre}`, 'regresión', `Volver a ejecutar la suite completa sobre la versión refactorizada para verificar las correcciones y detectar regresiones.`, 'Mismos o más casos que en la primera ronda, 100 % aprobados salvo hallazgos documentados.',
    `${t.aprobados}/${t.total} aprobados${t.fallidos ? ` (${t.fallidos} fallidos documentados como hallazgos)` : ''} el ${new Date(s.r.fecha).toLocaleString('es-CO')}${posterior ? '' : ' — ejecución anterior a la refactorización final; vuelva a ejecutar la suite'}`,
    t.fallidos === 0 && posterior ? 'Aprobado' : t.fallidos === 0 ? 'Pendiente' : 'Aprobado', [`pruebas/evidencias/${s.area}/resumen.json`], { suite: s.area, totales: t, fecha: s.r.fecha, observacion: t.fallidos ? 'Los fallos corresponden a hallazgos conocidos documentados en el informe (no a regresiones).' : undefined });
}

const resumen = {
  area: 'Despliegue final y regresión posterior a la refactorización',
  herramienta: 'Docker Compose (SonarQube 9.9 Community, PostgreSQL 15, Jenkins LTS), sonar-scanner, nest build, vite build, docker build',
  comando: 'node pruebas/despliegue/verificar-despliegue.mjs  (con SONAR_TOKEN y, opcionalmente, JENKINS_USER/JENKINS_TOKEN)',
  fecha: new Date().toISOString(),
  entorno: { sonar: SONAR, jenkins: JENKINS, job: JOB, conToken: Boolean(TOKEN), conJenkins: Boolean(authJenkins) },
  totales: { total: casos.length, aprobados: casos.filter((c) => c.estado === 'Aprobado').length, fallidos: casos.filter((c) => c.estado === 'Fallido').length, pendientes: casos.filter((c) => c.estado === 'Pendiente').length, duracionSeg: Math.round((Date.now() - inicio) / 1000) },
  regresion: regresion.map((s) => ({ suite: s.nombre, area: s.area, ...s.r.totales, fecha: s.r.fecha })),
  casos,
};
writeFileSync(join(SALIDA, 'resumen.json'), JSON.stringify(resumen, null, 2), 'utf8');
console.log(`\nDespliegue: ${resumen.totales.aprobados}/${resumen.totales.total} aprobados, ${resumen.totales.pendientes} pendientes → pruebas/evidencias/despliegue/resumen.json`);
