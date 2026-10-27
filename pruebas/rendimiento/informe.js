'use strict';
/**
 * Genera, a partir de los JSON crudos de raw/*.json (resultados reales):
 *   resumen.json  — esquema común de evidencias
 *   informe.md    — tablas + interpretación + mejoras
 *   reporte.html  — gráficas SVG inline (sin dependencias)
 *   npm run informe  → regenerar sin volver a ejecutar la carga
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DIR_EVID, DIR_RAW, r2, infoMaquina } = require('./lib/comun');
const ESCENARIOS = require('./escenarios');

function leer() {
  return ESCENARIOS.map((e) => {
    const f = path.join(DIR_RAW, `${e.id}.json`);
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
  }).filter(Boolean);
}

// Consulta de solo lectura de índices existentes (para justificar la mejora de índices FK)
function indices() {
  const psql = process.env.PSQL_PATH || 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
  const sql = "SELECT tablename || '.' || indexname || ' (' || regexp_replace(indexdef, '.*\\((.*)\\)', '\\1') || ')' FROM pg_indexes WHERE schemaname='public' ORDER BY 1;";
  const r = spawnSync(psql, ['-U', 'postgres', '-h', 'localhost', '-d', 'taskflow', '-At', '-c', sql], { env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'coco258' }, encoding: 'utf8', timeout: 10000 });
  if (r.status !== 0) return null;
  const lista = r.stdout.trim().split(/\r?\n/);
  fs.writeFileSync(path.join(DIR_EVID, 'indices-postgresql.txt'), `$ psql -At -c "SELECT ... FROM pg_indexes WHERE schemaname='public'"\n${lista.join('\n')}\n`);
  return lista;
}

const fmtM = (m) => `${m.peticionesTotales} peticiones, ${m.peticionesPorSeg} req/s, latencia media ${m.latenciaMs.media} ms, p50 ${m.latenciaMs.p50} ms, p90 ${m.latenciaMs.p90} ms, p95 ${m.latenciaMs.p95} ms, p99 ${m.latenciaMs.p99} ms, máx ${m.latenciaMs.max} ms; non-2xx ${m.non2xx}, errores ${m.erroresConexion}, timeouts ${m.timeouts} (tasa de error ${m.tasaErrorPct}%)`;
const metricas = (m) => ({
  peticionesTotales: m.peticionesTotales, peticionesPorSeg: m.peticionesPorSeg, bytesPorSeg: m.bytesPorSeg,
  bytesPorRespuesta: m.peticionesPorSeg ? Math.round(m.bytesPorSeg / m.peticionesPorSeg) : null,
  latenciaMs: m.latenciaMs, non2xx: m.non2xx, errores: m.erroresConexion, timeouts: m.timeouts, tasaErrorPct: m.tasaErrorPct, codigos: m.codigos,
});

function construirResumen(datos) {
  const ult = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIR_EVID, 'ultima-ejecucion.json'), 'utf8')); } catch { return {}; } })();
  const maq = datos[0]?.maquina || infoMaquina();
  const por = Object.fromEntries(datos.map((d) => [d.id, d]));
  const casos = datos.map((d) => {
    const c = d.criterios;
    const esperado = `p95 < ${c.p95Ms} ms y tasa de error ≤ ${c.tasaErrorPctMax}%${c.derivaP95PctMax != null ? `; deriva del p95 ≤ ${c.derivaP95PctMax}%` : ''}${c.nota ? ` (${c.nota})` : ''}`;
    let obtenido;
    if (d.escalones) {
      obtenido = d.escalones.map((e) => `${e.conexiones} conex.: ${e.peticionesPorSeg} req/s, p95 ${e.latenciaMs.p95} ms, p99 ${e.latenciaMs.p99} ms, errores ${e.tasaErrorPct}%`).join(' | ') +
        `. Throughput máximo ${d.analisis.throughputMaximo.reqPorSeg} req/s con ${d.analisis.throughputMaximo.conexiones} conexiones; saturación desde ${d.analisis.puntoSaturacion?.conexiones ?? 'no alcanzada'} conexiones; degradación fuera de umbral: ${d.analisis.puntoDegradacion ? d.analisis.puntoDegradacion.conexiones + ' conexiones' : 'no alcanzada'}.`;
    } else {
      obtenido = fmtM(d.resultado) + (d.analisis ? `; p95 inicial ${d.analisis.p95InicialMs} ms → final ${d.analisis.p95FinalMs} ms (deriva ${d.analisis.derivaP95Pct}%)` : '');
    }
    if (d.recursosResumen) obtenido += `. Backend: CPU media ${d.recursosResumen.backendCpuNucleoMedioPct}% de un núcleo (máx ${d.recursosResumen.backendCpuNucleoMaxPct}%), memoria ${d.recursosResumen.backendMemInicialMB}→${d.recursosResumen.backendMemFinalMB} MB (máx ${d.recursosResumen.backendMemMaxMB} MB).`;
    return {
      id: d.codigo, escenario: d.id,
      categoria: d.id === 'estres' ? 'Rendimiento — prueba de estrés/pico' : d.id === 'resistencia' ? 'Rendimiento — prueba de resistencia (soak)' : 'Rendimiento — prueba de carga',
      nombre: d.nombre, tipo: d.id === 'estres' ? 'negativo' : 'positivo', objetivo: d.objetivo, condiciones: d.condiciones,
      esperado, obtenido, estado: d.evaluacion.estado, motivosFallo: d.evaluacion.motivos,
      ...(d.evaluacion.estado === 'Fallido' ? { severidad: 'Media' } : {}),
      evidencia: [`raw/${d.id}.json`, 'salida-autocannon.txt', 'reporte.html'],
    };
  });

  // ---- Hallazgos derivados de los números medidos
  const H = [];
  const base = por['carga-base']?.resultado;
  const est = por.estres;
  const log = por.login?.resultado;
  const esc = por.escritura?.resultado;
  const med = por['carga-media']?.resultado;
  const soak = por.resistencia;
  const cpuEst = est?.recursosResumen?.backendCpuNucleoMedioPct;
  if (est) {
    H.push({
      descripcion: `El backend es un único proceso Node (modo desarrollo) limitado por CPU: el throughput de GET /equipos se estanca en ~${est.analisis.throughputMaximo.reqPorSeg} req/s (${est.analisis.throughputMaximo.conexiones} conexiones) con el proceso al ~${cpuEst}% de un núcleo de media durante toda la prueba (ya saturado desde el primer escalón de ${est.escalones[0].conexiones} conexiones: el throughput se mueve en una meseta de ${Math.min(...est.escalones.map((e) => e.peticionesPorSeg))}-${est.analisis.throughputMaximo.reqPorSeg} req/s); a partir de ahí más concurrencia solo añade cola (p95 ×${est.analisis.factorP95vsBase.at(-1).factor} con ${est.escalones.at(-1).conexiones} conexiones respecto a ${est.escalones[0].conexiones}).`,
      severidad: est.analisis.puntoDegradacion && est.analisis.puntoDegradacion.conexiones <= 200 ? 'Alta' : 'Media',
      recomendacion: 'Ejecutar el build de producción (node dist/main, sin --watch), usar cluster/PM2 con un proceso por núcleo o varias réplicas tras un balanceador, y establecer límites de concurrencia/rate limiting para proteger la latencia.',
    });
  }
  if (log) {
    H.push({
      descripcion: `El login está limitado por bcrypt (coste 10): solo ${log.peticionesPorSeg} req/s con p95 ${log.latenciaMs.p95} ms frente a ${base?.peticionesPorSeg ?? '?'} req/s de una lectura; un pico de inicios de sesión (o un ataque de credenciales) consume el pool de hilos de libuv (4 hilos por defecto) y la CPU.`,
      severidad: 'Informativa',
      recomendacion: 'Mantener coste 10-12 (es una defensa deliberada); limitar /auth/login por IP, ajustar UV_THREADPOOL_SIZE al número de núcleos, y escalar horizontalmente si el volumen de logins lo requiere. No reducir el coste por rendimiento.',
    });
  }
  const idx = indices();
  if (idx) {
    const tiene = (t, col) => idx.some((l) => l.startsWith(`${t}.`) && l.includes(`"${col}"`));
    const faltan = [['tareas', 'listaId'], ['listas', 'proyectoId'], ['proyectos', 'equipoId'], ['equipos', 'liderId'], ['comentarios', 'tareaId']].filter(([t, c]) => !tiene(t, c)).map(([t, c]) => `${t}.${c}`);
    if (faltan.length) H.push({
      descripcion: `PostgreSQL no indexa automáticamente las claves foráneas y TypeORM no crea índices para ManyToOne: faltan índices en ${faltan.join(', ')}. Además, la búsqueda por correo usa LOWER(email), que no puede aprovechar el índice UNIQUE de email. Con ${med ? 'el volumen actual el impacto es bajo' : 'poco volumen el impacto es bajo'}, pero las consultas de tareas/listas/proyectos harán recorridos secuenciales a medida que crezcan las tablas.`,
      severidad: 'Baja',
      recomendacion: 'Añadir @Index() en listaId, proyectoId, equipoId y liderId (o una migración CREATE INDEX) y un índice funcional sobre LOWER(email); verificar con EXPLAIN ANALYZE.',
    });
  }
  if (med) H.push({
    descripcion: `GET /tareas?proyectoId devuelve todas las tareas con lista y asignados sin paginación (~${Math.round(med.bytesPorSeg / med.peticionesPorSeg / 1024)} KB por respuesta con 50 tareas) y sin compresión HTTP; el coste crece linealmente con el tamaño del proyecto. Con 50 conexiones: ${med.peticionesPorSeg} req/s y p95 ${med.latenciaMs.p95} ms.`,
    severidad: 'Baja',
    recomendacion: 'Paginación o carga por lista (limit/offset o cursor), seleccionar solo los campos necesarios de los asignados, habilitar compression() (gzip/brotli) y cabeceras ETag/Cache-Control para lecturas repetidas.',
  });
  H.push({
    descripcion: 'Cada petición autenticada ejecuta una consulta adicional (JwtStrategy.validate → findById del usuario) y GET /equipos carga líder y miembros de todos los equipos en dos consultas más; esto multiplica las consultas por petición y satura antes el pool de conexiones (10 por defecto en pg).',
    severidad: 'Baja',
    recomendacion: 'Cachear el usuario autenticado (p. ej. caché en memoria/Redis de 30-60 s o confiar en los claims del token), ajustar extra.max del pool de TypeORM según la carga y usar consultas con select explícito.',
  });
  if (esc) H.push({
    descripcion: `La escritura (POST /tareas) alcanza ${esc.peticionesPorSeg} req/s con p95 ${esc.latenciaMs.p95} ms: cada creación hace 4-5 consultas (lista, proyecto+equipo+miembros, INSERT, relectura con relaciones).`,
    severidad: esc.latenciaMs.p95 > por.escritura.criterios.p95Ms ? 'Media' : 'Informativa',
    recomendacion: 'Devolver la entidad guardada sin releerla, cargar solo los ids de miembros para la comprobación de acceso y agrupar las consultas en una transacción.',
  });
  if (soak?.recursosResumen) {
    const r = soak.recursosResumen;
    const crec = r2(((r.backendMemFinalMB - r.backendMemInicialMB) / r.backendMemInicialMB) * 100);
    H.push({
      descripcion: `En la prueba de resistencia (2 min) el p95 pasó de ${soak.analisis.p95InicialMs} ms a ${soak.analisis.p95FinalMs} ms (deriva ${soak.analisis.derivaP95Pct}%) con ${soak.resultado.tasaErrorPct}% de errores; la memoria del backend fue de ${r.backendMemInicialMB} a ${r.backendMemFinalMB} MB (${crec >= 0 ? '+' : ''}${crec}%, máx ${r.backendMemMaxMB} MB). ${Math.abs(soak.analisis.derivaP95Pct) <= 50 && crec < 50 ? 'No se observan síntomas de fuga de memoria ni degradación progresiva en esta ventana corta.' : 'Se observa crecimiento que conviene vigilar en una prueba más larga.'}`,
      severidad: 'Informativa',
      recomendacion: 'Repetir la prueba de resistencia durante 30-60 min en un entorno de staging con el build de producción y monitorización (Prometheus/Grafana o clinic.js) para confirmar la estabilidad.',
    });
  }
  const ORD = { Crítica: 0, Alta: 1, Media: 2, Baja: 3, Informativa: 4 };
  for (const c of casos.filter((x) => x.estado === 'Fallido')) H.push({ descripcion: `${c.id} ${c.nombre} no cumple el criterio: ${c.motivosFallo.join('; ')}.`, severidad: 'Media', recomendacion: 'Ver mejoras de escalado, consultas e índices.', origen: c.id });
  H.sort((a, b) => ORD[a.severidad] - ORD[b.severidad]).forEach((h, i) => { h.id = `H-${String(i + 1).padStart(2, '0')}`; h.origen = h.origen || 'Análisis de métricas'; });

  const aprob = casos.filter((c) => c.estado === 'Aprobado').length;
  const metricasObj = {};
  for (const d of datos) {
    metricasObj[d.id] = d.escalones
      ? { conexionesPorEscalon: d.escalones.map((e) => e.conexiones), escalones: d.escalones.map((e) => ({ conexiones: e.conexiones, ...metricas(e) })), analisis: d.analisis, recursos: d.recursosResumen }
      : { conexiones: d.resultado.conexiones, duracionSeg: d.resultado.duracionSeg, ...metricas(d.resultado), ...(d.analisis ? { analisis: d.analisis } : {}), recursos: d.recursosResumen };
  }
  return {
    area: 'Rendimiento',
    herramienta: `autocannon ${maq.autocannon} (API programática) sobre Node.js ${maq.node}; monitor de CPU/memoria con PowerShell Get-Process`,
    comando: 'cd pruebas/rendimiento && npm test   (todos; por escenario: npm run carga-base | carga-media | escritura | login | estres | resistencia; regenerar informe: npm run informe)',
    fecha: ult.fecha || datos[0]?.fecha,
    condiciones: `${maq.so}; ${maq.cpu}; ${maq.ramGB} GB RAM; Node ${maq.node}; ${maq.baseDatos}; ${maq.backend}. ${maq.nota} Datos: equipo dedicado con 5 usuarios, proyecto de lectura con 50 tareas (2 asignados c/u), proyecto de escritura; eliminados al terminar. Calentamiento de 5 s no medido. Escenarios: ${datos.map((d) => `${d.codigo} ${d.condiciones}`).join(' ')}`,
    totales: { total: casos.length, aprobados: aprob, fallidos: casos.length - aprob },
    casos,
    hallazgos: H,
    metricas: metricasObj,
  };
}

// ------------------------------------------------------------------ Markdown
function markdown(R, datos) {
  const L = [];
  const M = R.metricas;
  L.push('# Informe de pruebas de rendimiento — TaskFlow API', '');
  L.push(`- **Fecha:** ${R.fecha}`, `- **Herramienta:** ${R.herramienta}`, `- **Comando:** \`${R.comando}\``);
  L.push(`- **Resultado:** ${R.totales.aprobados}/${R.totales.total} escenarios cumplen sus criterios de aceptación`, '');
  const m = datos[0].maquina;
  L.push('## 1. Condiciones del entorno', '', '| Elemento | Valor |', '|---|---|');
  for (const [k, v] of [['Sistema operativo', m.so], ['CPU', m.cpu], ['RAM', `${m.ramGB} GB`], ['Node.js', m.node], ['Base de datos', m.baseDatos], ['Backend', m.backend], ['Generador de carga', `autocannon ${m.autocannon}, misma máquina`], ['Observación', m.nota]]) L.push(`| ${k} | ${v} |`);
  L.push('', 'Datos sembrados vía API antes de cada ejecución (equipo dedicado, 5 usuarios, 50 tareas con 2 asignados en el proyecto de lectura) y eliminados al finalizar (borrado en cascada del equipo y de los usuarios).', '');

  L.push('## 2. Escenarios, criterios y resultados', '');
  L.push('| ID | Escenario | Condiciones | Criterio de aceptación | Req totales | Req/s | Media | p50 | p90 | p95 | p99 | Máx | Non-2xx | Errores/timeouts | Estado |', '|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const c of R.casos) {
    const x = M[c.escenario];
    if (x.escalones) {
      for (const e of x.escalones) L.push(`| ${c.id} | ${c.nombre} | ${e.conexiones} conexiones, 15 s | ${c.esperado} | ${e.peticionesTotales} | ${e.peticionesPorSeg} | ${e.latenciaMs.media} | ${e.latenciaMs.p50} | ${e.latenciaMs.p90} | ${e.latenciaMs.p95} | ${e.latenciaMs.p99} | ${e.latenciaMs.max} | ${e.non2xx} | ${e.errores}/${e.timeouts} | ${c.estado} |`);
    } else {
      L.push(`| ${c.id} | ${c.nombre} | ${c.condiciones} | ${c.esperado} | ${x.peticionesTotales} | ${x.peticionesPorSeg} | ${x.latenciaMs.media} | ${x.latenciaMs.p50} | ${x.latenciaMs.p90} | ${x.latenciaMs.p95} | ${x.latenciaMs.p99} | ${x.latenciaMs.max} | ${x.non2xx} | ${x.errores}/${x.timeouts} | ${c.estado} |`);
    }
  }
  L.push('', 'Latencias en milisegundos. Percentiles calculados con todas las respuestas individuales (autocannon no reporta p95).', '');

  L.push('## 3. Ficha de cada caso', '');
  for (const c of R.casos) {
    L.push(`### ${c.id} — ${c.nombre}`, '', `- **Objetivo:** ${c.objetivo}`, `- **Condiciones:** ${c.condiciones}`, `- **Resultado esperado:** ${c.esperado}`, `- **Resultado obtenido:** ${c.obtenido}`, `- **Estado:** ${c.estado}${c.motivosFallo.length ? ' — ' + c.motivosFallo.join('; ') : ''}`, `- **Evidencia:** ${c.evidencia.map((e) => '`' + e + '`').join(', ')}`, '');
  }

  L.push('## 4. Uso de recursos durante la carga', '', '| Escenario | CPU backend media (% de 1 núcleo) | CPU backend máx | Memoria backend inicio → fin (MB) | Memoria máx (MB) | CPU PostgreSQL media (% total) |', '|---|---:|---:|---:|---:|---:|');
  for (const d of datos) if (d.recursosResumen) { const r = d.recursosResumen; L.push(`| ${d.codigo} ${d.id} | ${r.backendCpuNucleoMedioPct} | ${r.backendCpuNucleoMaxPct} | ${r.backendMemInicialMB} → ${r.backendMemFinalMB} | ${r.backendMemMaxMB} | ${r.postgresCpuTotalMedioPct} |`); }
  L.push('');

  const b = M['carga-base'], md = M['carga-media'], e = M.escritura, lg = M.login, st = M.estres, sk = M.resistencia;
  L.push('## 5. Interpretación', '');
  if (b) L.push(`- **Carga base:** con 10 conexiones GET /equipos sirve ${b.peticionesPorSeg} req/s con p95 de ${b.latenciaMs.p95} ms y ${b.tasaErrorPct}% de errores — ${b.latenciaMs.p95 < 200 ? 'holgadamente dentro del objetivo de 200 ms' : 'por encima del objetivo'}. El proceso del backend ya trabaja cerca del 100% de un núcleo: el límite es la CPU de Node (serialización JSON, hidratación de entidades de TypeORM, verificación JWT), no PostgreSQL, cuyo consumo de CPU es bajo.`);
  if (md) L.push(`- **Carga media:** con 50 conexiones y 50 tareas por proyecto el throughput es ${md.peticionesPorSeg} req/s (respuestas de ~${Math.round((md.bytesPorRespuesta || 0) / 1024)} KB) y el p95 ${md.latenciaMs.p95} ms. ${md.latenciaMs.p95 < 500 ? 'Cumple' : 'No cumple'} el umbral de 500 ms. Al quintuplicar la concurrencia la latencia crece casi proporcionalmente porque las peticiones esperan en la cola del único hilo de eventos (ley de Little: latencia ≈ concurrencia / throughput = ${md.conexiones}/${md.peticionesPorSeg} ≈ ${r2((md.conexiones / md.peticionesPorSeg) * 1000)} ms).`);
  if (e) L.push(`- **Escritura:** ${e.peticionesPorSeg} req/s con p95 ${e.latenciaMs.p95} ms y ${e.tasaErrorPct}% de errores (${datos.find((d) => d.id === 'escritura')?.tareasCreadas} tareas creadas). Las escrituras son más caras que las lecturas porque cada creación hace varias consultas (comprobación de acceso con relaciones + INSERT + relectura).`);
  if (lg) L.push(`- **Login:** ${lg.peticionesPorSeg} req/s y p95 ${lg.latenciaMs.p95} ms. bcrypt con coste 10 es intencionadamente costoso (~decenas de ms por hash en este equipo) y se ejecuta en el pool de libuv (4 hilos), por lo que es el endpoint con menor capacidad; es un compromiso seguridad/rendimiento aceptable y el bloqueo por fuerza bruta reduce el abuso.`);
  if (st) L.push(`- **Estrés:** el throughput máximo fue ${st.analisis.throughputMaximo.reqPorSeg} req/s (${st.analisis.throughputMaximo.conexiones} conexiones). El throughput forma una meseta (${Math.min(...st.escalones.map((e) => e.peticionesPorSeg))}-${st.analisis.throughputMaximo.reqPorSeg} req/s) en todos los escalones y la CPU del backend ya está al ~${st.recursos?.backendCpuNucleoMedioPct}% de un núcleo desde 10 conexiones: el sistema está saturado por CPU desde el inicio, de modo que más concurrencia solo se traduce en cola y latencia (latencia ≈ conexiones / throughput). Con 300 conexiones el throughput incluso baja (${st.escalones.at(-1).peticionesPorSeg} req/s) por la sobrecarga de gestionar más sockets. ${st.analisis.puntoDegradacion ? `El p95 o los errores superan el umbral con ${st.analisis.puntoDegradacion.conexiones} conexiones (p95 ${st.analisis.puntoDegradacion.p95} ms, errores ${st.analisis.puntoDegradacion.tasaErrorPct}%).` : 'En ningún escalón se superó el umbral de p95/errores.'} Factor p95 respecto al primer escalón: ${st.analisis.factorP95vsBase.map((f) => `${f.conexiones}→×${f.factor}`).join(', ')}. ${st.escalones.every((x) => x.tasaErrorPct === 0) ? 'No hubo errores ni timeouts: el sistema se degrada de forma ordenada (más latencia) sin rechazar peticiones.' : 'Aparecieron errores/timeouts en los escalones altos.'}`);
  if (sk) L.push(`- **Resistencia:** durante 2 minutos a 25 conexiones con mezcla de lecturas se mantuvieron ${sk.peticionesPorSeg} req/s, p95 ${sk.latenciaMs.p95} ms y ${sk.tasaErrorPct}% de errores; deriva del p95 ${sk.analisis.derivaP95Pct}% entre el inicio y el final. Memoria del backend ${sk.recursos?.backendMemInicialMB} → ${sk.recursos?.backendMemFinalMB} MB.`);
  L.push('');

  L.push('## 6. Hallazgos y propuestas de mejora', '', '| ID | Severidad | Descripción | Mejora propuesta |', '|---|---|---|---|');
  for (const h of R.hallazgos) L.push(`| ${h.id} | ${h.severidad} | ${h.descripcion.replace(/\|/g, '\\|')} | ${h.recomendacion.replace(/\|/g, '\\|')} |`);
  L.push('', 'Mejoras adicionales: compresión HTTP, caché (Redis) de lecturas frecuentes con invalidación al escribir, índices en claves foráneas, paginación, pool de conexiones dimensionado, build de producción en cluster y escalado horizontal tras un balanceador; incorporar estas pruebas al pipeline (Jenkins) con umbrales para detectar regresiones.', '');
  L.push('## 7. Evidencias', '', '- `resumen.json` — resumen estructurado generado automáticamente.', '- `raw/<escenario>.json` — resultado completo de autocannon, serie temporal por segundo/ventana y muestras de CPU/memoria.', '- `salida-autocannon.txt` — salida de consola de la ejecución.', '- `reporte.html` — gráficas (percentiles por escenario, curva de estrés, evolución en resistencia).', '- `indices-postgresql.txt` — índices existentes (consulta de solo lectura).', '');
  return L.join('\n') + '\n';
}

// ---------------------------------------------------------------------- HTML
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function ejeY(max) {
  const paso = [1, 2, 2.5, 5, 10].map((k) => k * 10 ** Math.floor(Math.log10(max / 4 || 1))).find((p) => max / p <= 5) || max / 4;
  const ticks = [];
  for (let v = 0; v <= max * 1.0001 + paso; v += paso) { ticks.push(r2(v)); if (v >= max) break; }
  return ticks;
}
function barras({ grupos, series, unidad, umbrales }) {
  const W = 760, H = 310, ml = 56, mr = 12, mt = 30, mb = 48;
  const maxV = Math.max(...grupos.flatMap((g) => series.map((s) => g.valores[s.clave])), ...(umbrales || []).filter(Boolean));
  const ticks = ejeY(maxV);
  const top = ticks[ticks.length - 1];
  const y = (v) => mt + (H - mt - mb) * (1 - v / top);
  const gw = (W - ml - mr) / grupos.length;
  const bw = Math.min(28, (gw - 24) / series.length - 2);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" class="chart">`;
  for (const t of ticks) s += `<line x1="${ml}" x2="${W - mr}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${ml - 6}" y="${y(t) + 4}" class="tick" text-anchor="end">${t}</text>`;
  grupos.forEach((g, gi) => {
    const x0 = ml + gi * gw + (gw - series.length * (bw + 2)) / 2;
    series.forEach((se, si) => {
      const v = g.valores[se.clave];
      const x = x0 + si * (bw + 2);
      const h = Math.max(1, y(0) - y(v));
      s += `<path d="M${x},${y(0)} v${-h + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${h - 4} z" fill="var(${se.color})" class="mark"><title>${esc(g.etiqueta)} — ${se.nombre}: ${v} ${unidad}</title></path>`;
    });
    if (umbrales?.[gi]) s += `<line x1="${x0 - 6}" x2="${x0 + series.length * (bw + 2) + 4}" y1="${y(umbrales[gi])}" y2="${y(umbrales[gi])}" class="umbral"><title>Criterio p95 &lt; ${umbrales[gi]} ${unidad}</title></line>`;
    s += `<text x="${ml + gi * gw + gw / 2}" y="${H - mb + 18}" class="tick" text-anchor="middle">${esc(g.etiqueta)}</text>`;
  });
  s += `<line x1="${ml}" x2="${W - mr}" y1="${y(0)}" y2="${y(0)}" class="axis"/><text x="${ml - 6}" y="12" class="tick" text-anchor="end">${unidad}</text></svg>`;
  return s;
}
function linea({ puntos, ejeX, unidad, color = '--series-1', umbral, xCategorico }) {
  const W = 760, H = 250, ml = 56, mr = 16, mt = 30, mb = 40;
  const maxY = Math.max(...puntos.map((p) => p.y), umbral || 0);
  const ticks = ejeY(maxY);
  const top = ticks[ticks.length - 1];
  const xs = puntos.map((p) => p.x);
  const minX = xCategorico ? 0 : Math.min(...xs), maxX = xCategorico ? puntos.length - 1 : Math.max(...xs);
  const X = (p, i) => ml + (W - ml - mr) * (((xCategorico ? i : p.x) - minX) / Math.max(1, maxX - minX));
  const Y = (v) => mt + (H - mt - mb) * (1 - v / top);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" class="chart">`;
  for (const t of ticks) s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/><text x="${ml - 6}" y="${Y(t) + 4}" class="tick" text-anchor="end">${t}</text>`;
  if (umbral) s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(umbral)}" y2="${Y(umbral)}" class="umbral"/><text x="${W - mr}" y="${Y(umbral) - 5}" class="tick" text-anchor="end">criterio ${umbral} ${unidad}</text>`;
  s += `<polyline fill="none" stroke="var(${color})" stroke-width="2" stroke-linejoin="round" points="${puntos.map((p, i) => `${X(p, i)},${Y(p.y)}`).join(' ')}"/>`;
  const etiquetar = puntos.length <= 12;
  puntos.forEach((p, i) => {
    s += `<circle cx="${X(p, i)}" cy="${Y(p.y)}" r="${etiquetar ? 4.5 : 3}" fill="var(${color})" stroke="var(--surface-1)" stroke-width="2"><title>${esc(p.etiqueta ?? p.x)}: ${p.y} ${unidad}</title></circle>`;
    if (etiquetar || i % Math.ceil(puntos.length / 12) === 0) s += `<text x="${X(p, i)}" y="${H - mb + 18}" class="tick" text-anchor="middle">${esc(p.etiquetaX ?? p.x)}</text>`;
  });
  s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(0)}" y2="${Y(0)}" class="axis"/><text x="${ml - 6}" y="12" class="tick" text-anchor="end">${unidad}</text><text x="${W - mr}" y="${H - 6}" class="tick" text-anchor="end">${esc(ejeX)}</text></svg>`;
  return s;
}

function html(R, datos) {
  const M = R.metricas;
  const simples = R.casos.filter((c) => !M[c.escenario].escalones);
  const series = [
    { clave: 'p50', nombre: 'p50', color: '--series-1' },
    { clave: 'p95', nombre: 'p95', color: '--series-2' },
    { clave: 'p99', nombre: 'p99', color: '--series-3' },
  ];
  const grupos = simples.map((c) => ({ etiqueta: `${c.id} ${c.escenario}`, valores: M[c.escenario].latenciaMs }));
  const st = datos.find((d) => d.id === 'estres');
  const sk = datos.find((d) => d.id === 'resistencia');
  const tarjetas = R.casos.map((c) => {
    const x = M[c.escenario];
    const p95 = x.escalones ? Math.max(...x.escalones.filter((e) => e.conexiones <= 200).map((e) => e.latenciaMs.p95)) : x.latenciaMs.p95;
    const rps = x.escalones ? x.analisis.throughputMaximo.reqPorSeg : x.peticionesPorSeg;
    return `<div class="tile"><div class="tile-h">${esc(c.id)} · ${esc(c.escenario)}</div><div class="tile-v">${rps}<span> req/s</span></div><div class="tile-s">p95 ${p95} ms${x.escalones ? ' (peor ≤200 conex.)' : ''}</div><div class="badge ${c.estado === 'Aprobado' ? 'ok' : 'ko'}">${c.estado === 'Aprobado' ? '✓ Aprobado' : '✕ Fallido'}</div></div>`;
  }).join('');
  const filas = R.casos.flatMap((c) => {
    const x = M[c.escenario];
    const fila = (n, e) => `<tr><td>${esc(c.id)}</td><td>${esc(n)}</td><td>${e.peticionesTotales}</td><td>${e.peticionesPorSeg}</td><td>${e.latenciaMs.media}</td><td>${e.latenciaMs.p50}</td><td>${e.latenciaMs.p90}</td><td>${e.latenciaMs.p95}</td><td>${e.latenciaMs.p99}</td><td>${e.latenciaMs.max}</td><td>${e.non2xx}</td><td>${e.errores}/${e.timeouts}</td><td>${e.tasaErrorPct}%</td></tr>`;
    return x.escalones ? x.escalones.map((e) => fila(`${c.escenario} ${e.conexiones} conex.`, e)) : [fila(`${c.escenario} (${x.conexiones} conex.)`, x)];
  }).join('');
  const leyenda = series.map((s) => `<span class="lg"><i style="background:var(${s.color})"></i>${s.nombre}</span>`).join('') + '<span class="lg"><i class="dash"></i>criterio p95</span>';
  let graf = `<section><h2>Latencia por escenario</h2><p class="sub">Percentiles en ms; la marca discontinua es el criterio de p95 de cada escenario.</p><div class="legend">${leyenda}</div>${barras({ grupos, series, unidad: 'ms', umbrales: simples.map((c) => R.casos.find((x) => x.id === c.id) && datos.find((d) => d.id === c.escenario).criterios.p95Ms) })}</section>`;
  if (st) {
    graf += `<section><h2>Estrés: throughput según concurrencia</h2><p class="sub">Peticiones por segundo en cada escalón de 15 s (GET /equipos).</p>${linea({ puntos: st.escalones.map((e) => ({ x: e.conexiones, y: e.peticionesPorSeg, etiqueta: `${e.conexiones} conexiones`, etiquetaX: e.conexiones })), ejeX: 'conexiones concurrentes', unidad: 'req/s', xCategorico: true })}</section>`;
    graf += `<section><h2>Estrés: p95 según concurrencia</h2><p class="sub">La latencia crece con la cola una vez saturada la CPU del backend.</p>${linea({ puntos: st.escalones.map((e) => ({ x: e.conexiones, y: e.latenciaMs.p95, etiqueta: `${e.conexiones} conexiones`, etiquetaX: e.conexiones })), ejeX: 'conexiones concurrentes', unidad: 'ms', color: '--series-2', umbral: st.criterios.p95Ms, xCategorico: true })}</section>`;
  }
  if (sk) {
    const v = sk.resultado.serie.filter((x) => x.reqs > 0 && x.t <= sk.resultado.duracionSeg);
    graf += `<section><h2>Resistencia: p95 por ventana de 10 s</h2><p class="sub">Deriva entre inicio y final: ${sk.analisis.derivaP95Pct}%.</p>${linea({ puntos: v.map((p) => ({ x: p.t, y: p.p95, etiqueta: `t=${p.t}s`, etiquetaX: `${p.t}s` })), ejeX: 'tiempo', unidad: 'ms', color: '--series-2', umbral: sk.criterios.p95Ms })}</section>`;
    graf += `<section><h2>Resistencia: throughput por ventana de 10 s</h2>${linea({ puntos: v.map((p) => ({ x: p.t, y: p.rps, etiqueta: `t=${p.t}s`, etiquetaX: `${p.t}s` })), ejeX: 'tiempo', unidad: 'req/s' })}</section>`;
    if (sk.recursos?.length) graf += `<section><h2>Resistencia: memoria del backend</h2><p class="sub">Working set del proceso Node que atiende el puerto 3000 (muestras cada 2 s).</p>${linea({ puntos: sk.recursos.map((p) => ({ x: p.t, y: p.backendMemMB, etiqueta: `t=${p.t}s`, etiquetaX: `${Math.round(p.t)}s` })), ejeX: 'tiempo', unidad: 'MB', color: '--series-3' })}</section>`;
  }
  const hall = R.hallazgos.map((h) => `<tr><td>${h.id}</td><td>${h.severidad}</td><td>${esc(h.descripcion)}</td><td>${esc(h.recomendacion)}</td></tr>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rendimiento TaskFlow</title>
<style>
:root{color-scheme:light;--surface-0:#f4f4f2;--surface-1:#fcfcfb;--text-primary:#0b0b0b;--text-secondary:#52514e;--text-muted:#7a7974;--grid:#e6e5e1;--axis:#bdbcb6;--series-1:#2a78d6;--series-2:#eb6834;--series-3:#1baf7a;--ok:#008300;--ko:#d03b3a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--surface-0:#111110;--surface-1:#1a1a19;--text-primary:#fff;--text-secondary:#c3c2b7;--text-muted:#94938b;--grid:#2c2c2a;--axis:#4a4a46;--series-1:#3987e5;--series-2:#d95926;--series-3:#199e70;--ok:#3fae3f;--ko:#e66767}}
:root[data-theme="dark"]{color-scheme:dark;--surface-0:#111110;--surface-1:#1a1a19;--text-primary:#fff;--text-secondary:#c3c2b7;--text-muted:#94938b;--grid:#2c2c2a;--axis:#4a4a46;--series-1:#3987e5;--series-2:#d95926;--series-3:#199e70;--ok:#3fae3f;--ko:#e66767}
body{margin:0;background:var(--surface-0);color:var(--text-primary);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:980px;margin:0 auto;padding:24px 16px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:0 0 2px}.sub,.meta{color:var(--text-secondary);font-size:13px;margin:0 0 10px}
section{background:var(--surface-1);border:1px solid var(--grid);border-radius:10px;padding:16px;margin:16px 0}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.tile{background:var(--surface-1);border:1px solid var(--grid);border-radius:10px;padding:12px}.tile-h{font-size:12px;color:var(--text-secondary)}.tile-v{font-size:24px;font-weight:600}.tile-v span{font-size:13px;font-weight:400;color:var(--text-secondary)}.tile-s{font-size:13px;color:var(--text-secondary)}
.badge{display:inline-block;margin-top:6px;font-size:12px;font-weight:600}.badge.ok{color:var(--ok)}.badge.ko{color:var(--ko)}
.chart{width:100%;height:auto;display:block}.grid{stroke:var(--grid);stroke-width:1}.axis{stroke:var(--axis);stroke-width:1}.tick{fill:var(--text-muted);font-size:11px}
.umbral{stroke:var(--text-secondary);stroke-width:1.5;stroke-dasharray:5 4}.mark:hover{opacity:.8}circle:hover{r:7}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--text-secondary);margin-bottom:6px}.lg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}.lg i.dash{height:0;border-top:2px dashed var(--text-secondary);border-radius:0;vertical-align:3px}
.tabla{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:6px 8px;border-bottom:1px solid var(--grid);text-align:right;vertical-align:top}th{color:var(--text-secondary);font-weight:600}td:nth-child(-n+2),th:nth-child(-n+2){text-align:left}.hall td{text-align:left}
</style></head><body><main>
<h1>Pruebas de rendimiento — TaskFlow API</h1>
<p class="meta">${esc(R.fecha)} · ${esc(R.herramienta)} · ${R.totales.aprobados}/${R.totales.total} escenarios cumplen sus criterios</p>
<p class="meta">${esc(datos[0].maquina.so)} · ${esc(datos[0].maquina.cpu)} · ${datos[0].maquina.ramGB} GB RAM · Node ${esc(datos[0].maquina.node)} · ${esc(datos[0].maquina.baseDatos)}</p>
<div class="tiles">${tarjetas}</div>
${graf}
<section><h2>Tabla de métricas</h2><p class="sub">Latencias en ms.</p><div class="tabla"><table><thead><tr><th>ID</th><th>Escenario</th><th>Peticiones</th><th>Req/s</th><th>Media</th><th>p50</th><th>p90</th><th>p95</th><th>p99</th><th>Máx</th><th>Non-2xx</th><th>Err/timeouts</th><th>Tasa error</th></tr></thead><tbody>${filas}</tbody></table></div></section>
<section><h2>Hallazgos y mejoras</h2><div class="tabla"><table class="hall"><thead><tr><th>ID</th><th>Severidad</th><th>Descripción</th><th>Mejora</th></tr></thead><tbody>${hall}</tbody></table></div></section>
</main></body></html>`;
}

function generar() {
  const datos = leer();
  if (!datos.length) { console.log('No hay resultados en raw/. Ejecuta npm test primero.'); return; }
  const R = construirResumen(datos);
  fs.writeFileSync(path.join(DIR_EVID, 'resumen.json'), JSON.stringify(R, null, 2));
  fs.writeFileSync(path.join(DIR_EVID, 'informe.md'), markdown(R, datos));
  fs.writeFileSync(path.join(DIR_EVID, 'reporte.html'), html(R, datos));
  console.log(`\nInforme generado: ${R.totales.aprobados}/${R.totales.total} escenarios aprobados, ${R.hallazgos.length} hallazgos → ${DIR_EVID}`);
}

module.exports = { generar };
if (require.main === module) generar();
