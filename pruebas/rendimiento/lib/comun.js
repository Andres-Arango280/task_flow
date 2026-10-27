'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const API = process.env.API_URL || 'http://localhost:3000';
const DIR_EVID = path.resolve(__dirname, '..', '..', 'evidencias', 'rendimiento');
const DIR_RAW = path.join(DIR_EVID, 'raw');
const ARCHIVO_SEED = path.join(__dirname, '..', '.estado-seed.json'); // contiene token: no es evidencia
fs.mkdirSync(DIR_RAW, { recursive: true });

async function api(metodo, ruta, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const r = await fetch(API + ruta, { method: metodo, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let b = null;
  try { b = t ? JSON.parse(t) : null; } catch { b = t; }
  if (r.status >= 400) throw new Error(`${metodo} ${ruta} → ${r.status} ${t}`);
  return b;
}

function percentil(ordenado, p) {
  if (!ordenado.length) return null;
  const i = Math.min(ordenado.length - 1, Math.max(0, Math.ceil((p / 100) * ordenado.length) - 1));
  return ordenado[i];
}
const r2 = (n) => (n == null ? null : Math.round(n * 100) / 100);

function infoMaquina() {
  const cpus = os.cpus();
  let pg = 'PostgreSQL 18';
  const psql = process.env.PSQL_PATH || 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
  try {
    const r = spawnSync(psql, ['-U', 'postgres', '-h', 'localhost', '-d', 'taskflow', '-At', '-c', 'SHOW server_version; SHOW max_connections;'], {
      env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'coco258' }, encoding: 'utf8', timeout: 10000,
    });
    if (r.status === 0) {
      const [v, mc] = r.stdout.trim().split(/\r?\n/);
      pg = `PostgreSQL ${v} (max_connections=${mc}; pool TypeORM/pg por defecto = 10 conexiones)`;
    }
  } catch { /* opcional */ }
  return {
    so: `${os.type()} ${os.release()} (${os.version?.() ?? ''}) ${os.arch()}`,
    cpu: `${cpus[0].model.trim()} — ${cpus.length} hilos lógicos`,
    ramGB: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
    node: process.version,
    autocannon: require('autocannon/package.json').version,
    baseDatos: pg,
    backend: `NestJS 10 en modo desarrollo (npm run start:dev, proceso único) en ${API}`,
    nota: 'Generador de carga (autocannon) y servidor en la misma máquina: compiten por CPU, por lo que los valores absolutos son conservadores.',
  };
}

module.exports = { API, DIR_EVID, DIR_RAW, ARCHIVO_SEED, api, percentil, r2, infoMaquina };
