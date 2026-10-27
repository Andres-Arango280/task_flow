'use strict';
/**
 * Ejecuta los escenarios de rendimiento con autocannon.
 *   node run-all.js                 → todos
 *   node run-all.js carga-base ...  → solo los indicados
 * Flujo: siembra → calentamiento → escenarios (con monitor de CPU/memoria) → limpieza → informe.
 * Salida cruda por escenario: pruebas/evidencias/rendimiento/raw/<id>.json
 */
const fs = require('node:fs');
const path = require('node:path');
const { DIR_RAW, r2, infoMaquina } = require('./lib/comun');
const { ejecutarCarga, monitorRecursos, resumenRecursos } = require('./lib/carga');
const ESCENARIOS = require('./escenarios');
const { sembrar } = require('./seed');
const { limpiar } = require('./limpiar');
const { generar } = require('./informe');

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const linea = (m) => `${m.peticionesTotales} pet. | ${m.peticionesPorSeg} req/s | p50 ${m.latenciaMs.p50} ms | p95 ${m.latenciaMs.p95} ms | p99 ${m.latenciaMs.p99} ms | máx ${m.latenciaMs.max} ms | errores ${m.tasaErrorPct}%`;

function evaluar(esc, m) {
  const motivos = [];
  if (m.latenciaMs.p95 > esc.criterios.p95Ms) motivos.push(`p95 ${m.latenciaMs.p95} ms > ${esc.criterios.p95Ms} ms`);
  if (m.tasaErrorPct > esc.criterios.tasaErrorPctMax) motivos.push(`errores ${m.tasaErrorPct}% > ${esc.criterios.tasaErrorPctMax}%`);
  return motivos;
}

async function correrEscenario(esc, s) {
  console.log(`\n▶ ${esc.codigo} ${esc.nombre}\n  ${esc.condiciones}`);
  const monitor = monitorRecursos();
  const salida = { id: esc.id, codigo: esc.codigo, nombre: esc.nombre, objetivo: esc.objetivo, condiciones: esc.condiciones, criterios: esc.criterios, pidBackend: monitor.pid };

  if (esc.escalones) {
    salida.escalones = [];
    for (const c of esc.escalones) {
      const m = await ejecutarCarga({ titulo: `${esc.id}-${c}`, ...esc.opciones(s, c) });
      m.motivosFallo = c <= 200 ? evaluar(esc, m) : [];
      salida.escalones.push(m);
      console.log(`  ${String(c).padStart(3)} conex.: ${linea(m)}`);
    }
    const E = salida.escalones;
        const deg = E.find((e) => e.latenciaMs.p95 > esc.criterios.p95Ms || e.tasaErrorPct > esc.criterios.tasaErrorPctMax);
    const base = E[0];
    const max = E.reduce((a, e) => (e.peticionesPorSeg > a.peticionesPorSeg ? e : a));
    salida.analisis = {
      throughputMaximo: { conexiones: max.conexiones, reqPorSeg: max.peticionesPorSeg },
      puntoSaturacion: { conexiones: E[0].conexiones, detalle: `meseta de throughput ${Math.min(...E.map((e) => e.peticionesPorSeg))}-${max.peticionesPorSeg} req/s en todos los escalones: CPU del backend saturada desde el primer escalón` },
      puntoDegradacion: deg ? { conexiones: deg.conexiones, p95: deg.latenciaMs.p95, tasaErrorPct: deg.tasaErrorPct } : null,
      factorP95vsBase: E.map((e) => ({ conexiones: e.conexiones, factor: r2(e.latenciaMs.p95 / base.latenciaMs.p95) })),
    };
    const motivos = E.flatMap((e) => e.motivosFallo.map((x) => `${e.conexiones} conex.: ${x}`));
    salida.evaluacion = { estado: motivos.length ? 'Fallido' : 'Aprobado', motivos };
  } else {
    const m = await ejecutarCarga({ titulo: esc.id, ventanaSeg: esc.ventanaSeg || 1, ...esc.opciones(s) });
    salida.resultado = m;
    console.log(`  ${linea(m)}`);
    const motivos = evaluar(esc, m);
    if (esc.criterios.derivaP95PctMax != null) {
      const v = m.serie.filter((x) => x.reqs > 0);
      const med = (a) => a.map((x) => x.p95).sort((x, y) => x - y)[Math.floor(a.length / 2)];
      const ini = med(v.slice(0, 3));
      const fin = med(v.slice(-3));
      const deriva = r2(((fin - ini) / ini) * 100);
      salida.analisis = { p95InicialMs: ini, p95FinalMs: fin, derivaP95Pct: deriva, rpsInicial: v[0]?.rps, rpsFinal: v[v.length - 1]?.rps };
      if (deriva > esc.criterios.derivaP95PctMax) motivos.push(`deriva p95 ${deriva}% > ${esc.criterios.derivaP95PctMax}%`);
    }
    salida.evaluacion = { estado: motivos.length ? 'Fallido' : 'Aprobado', motivos };
  }
  salida.recursos = await monitor.detener();
  const pidFinal = require('./lib/carga').pidBackend();
  if (monitor.pid && pidFinal !== monitor.pid) {
    salida.reinicioBackendDetectado = { pidInicial: monitor.pid, pidFinal };
    salida.evaluacion.motivos.push(`el backend se reinició durante la prueba (PID ${monitor.pid} → ${pidFinal}); resultado no válido, repetir`);
    salida.evaluacion.estado = 'Fallido';
    console.warn(`  ⚠ Reinicio del backend detectado (PID ${monitor.pid} → ${pidFinal})`);
  }
  salida.recursosResumen = resumenRecursos(salida.recursos);
  if (esc.id === 'escritura') salida.tareasCreadas = salida.resultado.respuestas2xx;
  console.log(`  → ${salida.evaluacion.estado}${salida.evaluacion.motivos.length ? ': ' + salida.evaluacion.motivos.join('; ') : ''}`);
  if (salida.recursosResumen) console.log(`  recursos backend: CPU media ${salida.recursosResumen.backendCpuNucleoMedioPct}% de 1 núcleo, memoria ${salida.recursosResumen.backendMemInicialMB}→${salida.recursosResumen.backendMemFinalMB} MB`);
  fs.writeFileSync(path.join(DIR_RAW, `${esc.id}.json`), JSON.stringify({ fecha: new Date().toISOString(), maquina: infoMaquina(), ...salida }, null, 2));
  return salida;
}

// Duplica la salida de consola en evidencias/rendimiento/salida-autocannon.txt (modo append)
const LOG = path.join(DIR_RAW, '..', 'salida-autocannon.txt');
for (const k of ['log', 'warn']) {
  const orig = console[k].bind(console);
  console[k] = (...a) => { orig(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
}

async function main() {
  const pedidos = process.argv.slice(2);
  const lista = pedidos.length ? ESCENARIOS.filter((e) => pedidos.includes(e.id)) : ESCENARIOS;
  if (!lista.length) throw new Error(`Escenario desconocido. Disponibles: ${ESCENARIOS.map((e) => e.id).join(', ')}`);
  const comando = `npm ${pedidos.length === 1 ? 'run ' + pedidos[0] : 'test'}  (node run-all.js ${pedidos.join(' ')})`.trim();
  console.log(`
===== ${new Date().toISOString()} · ${comando} =====`);
  const s = await sembrar();
  try {
    // Calentamiento (no medido): JIT de V8, pool de conexiones de pg y cachés de TypeORM
    await ejecutarCarga({ titulo: 'calentamiento', connections: 5, duration: 5, path: '/equipos', headers: { authorization: `Bearer ${s.principal.token}` } });
    for (const esc of lista) {
      for (let intento = 1; intento <= 3; intento++) {
        const res = await correrEscenario(esc, s);
        if (!res.reinicioBackendDetectado || intento === 3) break;
        console.warn(`  ↻ Repetición ${intento}/2 por reinicio del backend (esperando 15 s a que vuelva a estar disponible)`);
        await pausa(15000);
      }
      await pausa(3000);
    }
  } finally {
    await limpiar().catch((e) => console.warn('Limpieza:', e.message));
  }
  const ultimo = path.join(DIR_RAW, '..', 'ultima-ejecucion.json');
  fs.writeFileSync(ultimo, JSON.stringify({ fecha: new Date().toISOString(), comando, escenarios: lista.map((e) => e.id) }, null, 2));
  generar();
}

main().catch((e) => { console.error(e); process.exit(1); });
