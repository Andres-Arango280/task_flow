'use strict';
/**
 * Siembra de datos para las pruebas de rendimiento (vía API, como un cliente real):
 *  - 1 usuario de carga + 4 miembros; 1 equipo dedicado "Perf <ts>"
 *  - Proyecto "Perf lectura" con 50 tareas repartidas en sus 3 listas (con asignados)
 *  - Proyecto "Perf escritura" (destino de POST /tareas)
 * El estado se guarda en .estado-seed.json; `node limpiar.js` lo elimina todo.
 */
const fs = require('node:fs');
const { api, ARCHIVO_SEED } = require('./lib/comun');

const N_TAREAS = Number(process.env.PERF_TAREAS || 50);

async function sembrar() {
  const ts = Date.now();
  const password = 'CargaPerf#2026';
  const crearUsuario = async (n) => {
    const email = `perf_${n}_${ts}@taskflow.test`;
    const u = await api('POST', '/auth/register', { body: { nombre: `Perf ${n}`, email, password } });
    const { access_token } = await api('POST', '/auth/login', { body: { email, password } });
    return { id: u.id, email, token: access_token };
  };
  const principal = await crearUsuario('carga');
  const miembros = [];
  for (let i = 1; i <= 4; i++) miembros.push(await crearUsuario(`miembro${i}`));

  const equipo = await api('POST', '/equipos', { token: principal.token, body: { nombre: `Perf ${ts}` } });
  for (const m of miembros) await api('POST', `/equipos/${equipo.id}/miembros`, { token: principal.token, body: { userId: m.id } });
  const lectura = await api('POST', '/proyectos', { token: principal.token, body: { nombre: 'Perf lectura', equipoId: equipo.id } });
  const escritura = await api('POST', '/proyectos', { token: principal.token, body: { nombre: 'Perf escritura', equipoId: equipo.id } });
  const listas = await api('GET', `/listas/proyecto/${lectura.id}`, { token: principal.token });
  const listasEsc = await api('GET', `/listas/proyecto/${escritura.id}`, { token: principal.token });

  for (let i = 0; i < N_TAREAS; i++) {
    await api('POST', '/tareas', {
      token: principal.token,
      body: {
        titulo: `Tarea de carga ${i + 1}`,
        descripcion: `Descripción de la tarea ${i + 1} `.repeat(5),
        listaId: listas[i % listas.length].id,
        asignados: [principal.id, miembros[i % miembros.length].id],
      },
    });
  }
  const estado = {
    creado: new Date().toISOString(),
    password,
    principal,
    miembros,
    equipoId: equipo.id,
    proyectoLecturaId: lectura.id,
    proyectoEscrituraId: escritura.id,
    listaLecturaId: listas[0].id,
    listaEscrituraId: listasEsc[0].id,
    tareasSembradas: N_TAREAS,
  };
  fs.writeFileSync(ARCHIVO_SEED, JSON.stringify(estado, null, 2));
  console.log(`Siembra OK: equipo ${equipo.id}, ${N_TAREAS} tareas en "Perf lectura", 5 usuarios.`);
  return estado;
}

module.exports = { sembrar };
if (require.main === module) sembrar().catch((e) => { console.error(e.message); process.exit(1); });
