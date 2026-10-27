'use strict';
/**
 * Definición de escenarios: condiciones de carga explícitas + criterios de aceptación.
 * Cada escenario recibe el estado de la siembra (s) y devuelve las opciones de autocannon.
 */
const json = (o) => JSON.stringify(o);
const auth = (s) => ({ authorization: `Bearer ${s.principal.token}`, 'content-type': 'application/json' });

module.exports = [
  {
    id: 'carga-base',
    codigo: 'REN-01',
    nombre: 'Carga base — GET /equipos autenticado',
    objetivo: 'Medir el tiempo de respuesta de la consulta más frecuente (dashboard) con carga normal.',
    condiciones: '10 conexiones concurrentes, 30 s, token JWT válido; equipo con 5 miembros y 2 proyectos.',
    criterios: { p95Ms: 200, tasaErrorPctMax: 0 },
    opciones: (s) => ({ connections: 10, duration: 30, method: 'GET', path: '/equipos', headers: auth(s) }),
  },
  {
    id: 'carga-media',
    codigo: 'REN-02',
    nombre: 'Carga media — GET /tareas?proyectoId (50 tareas)',
    objetivo: 'Evaluar la consulta más pesada del tablero Kanban (tareas + lista + asignados) con concurrencia media.',
    condiciones: '50 conexiones concurrentes, 30 s; proyecto con 50 tareas sembradas (2 asignados cada una).',
    criterios: { p95Ms: 500, tasaErrorPctMax: 1 },
    opciones: (s) => ({ connections: 50, duration: 30, method: 'GET', path: `/tareas?proyectoId=${s.proyectoLecturaId}`, headers: auth(s) }),
  },
  {
    id: 'escritura',
    codigo: 'REN-03',
    nombre: 'Escritura — POST /tareas',
    objetivo: 'Medir la creación concurrente de tareas (validación + comprobación de acceso + INSERT + relectura).',
    condiciones: '20 conexiones concurrentes, 20 s; cada petición crea una tarea con título único en el proyecto "Perf escritura".',
    criterios: { p95Ms: 800, tasaErrorPctMax: 1 },
    opciones: (s) => ({
      connections: 20, duration: 20, method: 'POST', path: '/tareas', headers: auth(s), idReplacement: true,
      body: json({ titulo: 'Tarea de carga [<id>]', descripcion: 'Creada por autocannon', listaId: s.listaEscrituraId }),
    }),
  },
  {
    id: 'login',
    codigo: 'REN-04',
    nombre: 'Login — POST /auth/login (bcrypt coste 10)',
    objetivo: 'Medir el coste del inicio de sesión, limitado por CPU por bcrypt.',
    condiciones: '10 conexiones concurrentes, 20 s, credenciales correctas del mismo usuario (cada éxito reinicia el contador de bloqueo, por lo que no aparecen 429).',
    criterios: { p95Ms: 1000, tasaErrorPctMax: 1 },
    opciones: (s) => ({
      connections: 10, duration: 20, method: 'POST', path: '/auth/login', headers: { 'content-type': 'application/json' },
      body: json({ email: s.principal.email, password: s.password }),
    }),
  },
  {
    id: 'estres',
    codigo: 'REN-05',
    nombre: 'Pico / estrés — GET /equipos en escalones 10→50→100→200→300 conexiones',
    objetivo: 'Encontrar el punto de saturación (throughput deja de crecer) y de degradación (p95 o errores fuera de umbral).',
    condiciones: 'Escalones de 15 s con 10, 50, 100, 200 y 300 conexiones concurrentes, sin pausa intermedia relevante.',
    criterios: { p95Ms: 1000, tasaErrorPctMax: 1, nota: 'Criterio aplicado hasta 200 conexiones; 300 se usa para observar el comportamiento fuera de capacidad.' },
    escalones: [10, 50, 100, 200, 300],
    duracionEscalon: 15,
    opciones: (s, conexiones) => ({ connections: conexiones, duration: 15, method: 'GET', path: '/equipos', headers: auth(s) }),
  },
  {
    id: 'resistencia',
    codigo: 'REN-06',
    nombre: 'Resistencia corta (soak) — mezcla de lecturas, 2 min',
    objetivo: 'Observar deriva de latencia, errores y memoria del backend con carga moderada sostenida.',
    condiciones: '25 conexiones, 120 s; cada conexión rota GET /equipos, GET /proyectos?equipoId, GET /listas/proyecto/:id y GET /tareas?proyectoId.',
    criterios: { p95Ms: 500, tasaErrorPctMax: 1, derivaP95PctMax: 50 },
    ventanaSeg: 10,
    opciones: (s) => ({
      connections: 25, duration: 120, headers: auth(s),
      requests: [
        { method: 'GET', path: '/equipos' },
        { method: 'GET', path: `/proyectos?equipoId=${s.equipoId}` },
        { method: 'GET', path: `/listas/proyecto/${s.proyectoLecturaId}` },
        { method: 'GET', path: `/tareas?proyectoId=${s.proyectoLecturaId}` },
      ],
    }),
  },
];
