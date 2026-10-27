'use strict';
const autocannon = require('autocannon');
const { spawn, spawnSync } = require('node:child_process');
const os = require('node:os');
const { API, percentil, r2 } = require('./comun');

/**
 * Ejecuta autocannon y calcula métricas exactas a partir de cada respuesta
 * (autocannon no reporta p95, así que se guardan todos los tiempos).
 */
function ejecutarCarga({ titulo, connections, duration, requests, method = 'GET', path, body, headers, idReplacement, ventanaSeg = 1 }) {
  return new Promise((resolve, reject) => {
    const tiempos = [];
    const porSegundo = new Map(); // seg → { n, lat: [], err }
    const estados = {};
    const t0 = Date.now();
    const inst = autocannon(
      {
        url: path ? API + path : API,
        title: titulo,
        connections,
        duration,
        method,
        body,
        headers,
        requests,
        idReplacement,
        timeout: 10,
      },
      (err, res) => {
        if (err) return reject(err);
        const ord = Float64Array.from(tiempos).sort();
        const total = res.requests.total;
        const fallos = res.non2xx + res.errors + res.timeouts;
        const serie = [...porSegundo.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([s, v]) => {
            const o = v.lat.sort((a, b) => a - b);
            return { t: (s + 1) * ventanaSeg, reqs: v.n, rps: r2(v.n / ventanaSeg), p50: r2(percentil(o, 50)), p95: r2(percentil(o, 95)), errores: v.err };
          });
        resolve({
          titulo,
          conexiones: connections,
          duracionSeg: duration,
          inicio: new Date(t0).toISOString(),
          peticionesTotales: total,
          peticionesPorSeg: r2(res.requests.average),
          peticionesPorSegMax: res.requests.max,
          bytesPorSeg: Math.round(res.throughput.average),
          latenciaMs: {
            media: r2(res.latency.average),
            p50: r2(percentil(ord, 50)),
            p90: r2(percentil(ord, 90)),
            p95: r2(percentil(ord, 95)),
            p99: r2(percentil(ord, 99)),
            max: r2(ord[ord.length - 1] ?? res.latency.max),
            min: r2(ord[0] ?? res.latency.min),
          },
          codigos: estados,
          respuestas2xx: res['2xx'],
          non2xx: res.non2xx,
          erroresConexion: res.errors,
          timeouts: res.timeouts,
          tasaErrorPct: r2((fallos / Math.max(1, total + res.errors + res.timeouts)) * 100),
          serie,
          autocannon: { latency: res.latency, requests: res.requests, throughput: res.throughput, statusCodeStats: res.statusCodeStats, errors: res.errors, timeouts: res.timeouts, non2xx: res.non2xx, duration: res.duration, start: res.start, finish: res.finish },
        });
      },
    );
    const bucket = (ms) => {
      const s = Math.floor((Date.now() - t0) / 1000 / ventanaSeg);
      if (!porSegundo.has(s)) porSegundo.set(s, { n: 0, lat: [], err: 0 });
      return porSegundo.get(s);
    };
    inst.on('response', (_c, status, _b, rt) => {
      tiempos.push(rt);
      estados[status] = (estados[status] || 0) + 1;
      const b = bucket();
      b.n++;
      b.lat.push(rt);
      if (status >= 400) b.err++;
    });
    inst.on('reqError', () => { bucket().err++; });
  });
}

/** Busca el PID del proceso que escucha en el puerto de la API. */
function pidBackend() {
  const puerto = new URL(API).port || '80';
  const r = spawnSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
  const linea = (r.stdout || '').split(/\r?\n/).find((l) => new RegExp(`:${puerto}\\s+\\S+\\s+LISTENING`).test(l));
  return linea ? Number(linea.trim().split(/\s+/).pop()) : null;
}

/**
 * Muestrea cada 2 s memoria (working set) y CPU del backend y de PostgreSQL
 * mediante un único proceso PowerShell (bajo coste). Devuelve { detener() → muestras }.
 */
function monitorRecursos() {
  const pid = pidBackend();
  if (!pid || process.platform !== 'win32') return { pid: null, detener: async () => [] };
  const script = `while($true){ $n=Get-Process -Id ${pid} -ErrorAction SilentlyContinue; $pg=Get-Process postgres -ErrorAction SilentlyContinue; $pgws=($pg|Measure-Object WorkingSet64 -Sum).Sum; $pgms=0; foreach($p in $pg){ $pgms+=$p.TotalProcessorTime.TotalMilliseconds }; "$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()) $($n.WorkingSet64) $($n.TotalProcessorTime.TotalMilliseconds) $pgws $pgms"; Start-Sleep -Seconds 2 }`;
  const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true });
  const crudas = [];
  let buf = '';
  ps.stdout.on('data', (d) => {
    buf += d.toString();
    const lineas = buf.split(/\r?\n/);
    buf = lineas.pop();
    for (const l of lineas) {
      const [t, ws, cpu, pgws, pgcpu] = l.trim().split(/\s+/).map(Number);
      if (t && ws) crudas.push({ t, ws, cpu, pgws, pgcpu });
    }
  });
  const ncpu = os.cpus().length;
  return {
    pid,
    detener: async () => {
      ps.kill();
      const t0 = crudas[0]?.t ?? 0;
      return crudas.slice(1).map((m, i) => {
        const prev = crudas[i];
        const dt = m.t - prev.t;
        const reinicio = m.cpu < prev.cpu; // el proceso cambió (reinicio de nest --watch)
        return {
          t: r2((m.t - t0) / 1000),
          backendMemMB: r2(m.ws / 1024 ** 2),
          backendCpuPctNucleo: reinicio ? null : r2(((m.cpu - prev.cpu) / dt) * 100), // % de 1 núcleo (Node es monohilo para JS)
          backendCpuPctTotal: reinicio ? null : r2(((m.cpu - prev.cpu) / dt / ncpu) * 100),
          postgresMemMB: r2(m.pgws / 1024 ** 2),
          postgresCpuPctTotal: m.pgcpu < prev.pgcpu ? null : r2(((m.pgcpu - prev.pgcpu) / dt / ncpu) * 100),
        };
      });
    },
  };
}

function resumenRecursos(muestras) {
  if (!muestras.length) return null;
  const val = (k) => muestras.map((m) => m[k]).filter((v) => v != null);
  const avg = (k) => r2(val(k).reduce((a, v) => a + v, 0) / Math.max(1, val(k).length));
  const max = (k) => r2(Math.max(0, ...val(k)));
  return {
    muestras: muestras.length,
    backendCpuNucleoMedioPct: avg('backendCpuPctNucleo'),
    backendCpuNucleoMaxPct: max('backendCpuPctNucleo'),
    backendMemInicialMB: muestras[0].backendMemMB,
    backendMemFinalMB: muestras[muestras.length - 1].backendMemMB,
    backendMemMaxMB: max('backendMemMB'),
    postgresCpuTotalMedioPct: avg('postgresCpuPctTotal'),
    postgresCpuTotalMaxPct: max('postgresCpuPctTotal'),
  };
}

module.exports = { ejecutarCarga, monitorRecursos, resumenRecursos, pidBackend };
