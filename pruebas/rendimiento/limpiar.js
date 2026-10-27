'use strict';
// Elimina los datos sembrados: equipo (cascada a proyectos, listas y tareas) y usuarios de carga.
const fs = require('node:fs');
const { api, ARCHIVO_SEED } = require('./lib/comun');

async function limpiar() {
  if (!fs.existsSync(ARCHIVO_SEED)) return console.log('Nada que limpiar.');
  const s = JSON.parse(fs.readFileSync(ARCHIVO_SEED, 'utf8'));
  const tok = async (u) => (await api('POST', '/auth/login', { body: { email: u.email, password: s.password } })).access_token;
  try {
    await api('DELETE', `/equipos/${s.equipoId}`, { token: await tok(s.principal) });
  } catch (e) { console.warn('equipo:', e.message); }
  for (const u of [s.principal, ...s.miembros]) {
    try { await api('DELETE', '/usuarios/me', { token: await tok(u) }); } catch (e) { console.warn(u.email, e.message); }
  }
  fs.rmSync(ARCHIVO_SEED);
  console.log(`Limpieza OK: equipo ${s.equipoId} y ${1 + s.miembros.length} usuarios eliminados.`);
}

module.exports = { limpiar };
if (require.main === module) limpiar().catch((e) => { console.error(e.message); process.exit(1); });
