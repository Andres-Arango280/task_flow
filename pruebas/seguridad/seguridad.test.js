'use strict';
/**
 * Suite de pruebas de SEGURIDAD de la API TaskFlow (caja negra contra el
 * backend en ejecución). Ejecutar con:  npm test  (desde pruebas/seguridad)
 *
 * Cada caso documenta objetivo, resultado esperado, resultado obtenido (calculado
 * a partir de la ejecución real) y evidencia (intercambio HTTP guardado en
 * pruebas/evidencias/seguridad/http/<ID>.json).
 */
const { before, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { peticion, estado, BASE_URL } = require('./lib/http');
const { caso, RAIZ_EVIDENCIAS } = require('./lib/caso');
const jwt = require('./lib/jwt');

const RAIZ_REPO = path.resolve(__dirname, '..', '..');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PSQL = process.env.PSQL_PATH || 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const PASSWORD = 'ClaveSegura#2026';
const SUFIJO = Date.now();
let contador = 0;
const nuevoEmail = (prefijo) => `seg_${prefijo}_${SUFIJO}_${++contador}@taskflow.test`;

const uuidInexistente = '00000000-0000-4000-8000-000000000000';
const statusList = (rs) => rs.map((r) => r.status).join(', ');
const fmt = (pares) => pares.map(([n, r]) => `${n} → ${r.status}`).join('; ');

async function registrarYLoguear(prefijo) {
  const email = nuevoEmail(prefijo);
  const reg = await peticion('POST', '/auth/register', { body: { nombre: `Usuario ${prefijo}`, email, password: PASSWORD } });
  const log = await peticion('POST', '/auth/login', { body: { email, password: PASSWORD } });
  const u = { email, id: reg.body?.id, token: log.body?.access_token, reg, log };
  if (u.token) creados.push(u);
  return u;
}

const creados = []; // usuarios creados por la suite (se eliminan al final)
const pendientes = []; // usuarios registrados sin login: { email, password }

// ---------------------------------------------------------------- Datos base
const F = {}; // fixture
before(async () => {
  F.A = await registrarYLoguear('lider');
  F.B = await registrarYLoguear('ajeno');
  F.C = await registrarYLoguear('miembro');
  F.D = await registrarYLoguear('miembro2');
  F.equipoA = (await peticion('POST', '/equipos', { token: F.A.token, body: { nombre: `Equipo seguridad ${SUFIJO}` } })).body;
  await peticion('POST', `/equipos/${F.equipoA.id}/miembros`, { token: F.A.token, body: { userId: F.C.id } });
  await peticion('POST', `/equipos/${F.equipoA.id}/miembros`, { token: F.A.token, body: { userId: F.D.id } });
  F.proyA1 = (await peticion('POST', '/proyectos', { token: F.A.token, body: { nombre: 'Proyecto A1', equipoId: F.equipoA.id } })).body;
  F.proyA2 = (await peticion('POST', '/proyectos', { token: F.A.token, body: { nombre: 'Proyecto A2', equipoId: F.equipoA.id } })).body;
  F.listasA1 = (await peticion('GET', `/listas/proyecto/${F.proyA1.id}`, { token: F.A.token })).body;
  F.listasA2 = (await peticion('GET', `/listas/proyecto/${F.proyA2.id}`, { token: F.A.token })).body;
  F.tareaA = (
    await peticion('POST', '/tareas', {
      token: F.A.token,
      body: { titulo: 'Tarea confidencial A', descripcion: 'dato interno', listaId: F.listasA1[0].id, asignados: [F.A.id, F.C.id] },
    })
  ).body;
  F.equipoB = (await peticion('POST', '/equipos', { token: F.B.token, body: { nombre: `Equipo B ${SUFIJO}` } })).body;
  if (!F.A.token || !F.B.token || !F.tareaA?.id) {
    throw new Error('No se pudieron crear los datos base: ¿está el backend en ' + BASE_URL + '?');
  }
});

after(async () => {
  const registro = [];
  // Limpieza: se eliminan los equipos creados (cascada a proyectos/listas/tareas)
  for (const [eq, tk] of [[F.equipoA, F.A?.token], [F.equipoB, F.B?.token]]) {
    if (eq?.id && tk) {
      const r = await peticion('DELETE', `/equipos/${eq.id}`, { token: tk }).catch((e) => ({ status: e.message }));
      registro.push(`DELETE /equipos/${eq.id} → ${r.status}`);
    }
  }
  for (const p of pendientes) {
    const l = await peticion('POST', '/auth/login', { body: p }).catch(() => null);
    if (l?.body?.access_token) creados.push({ token: l.body.access_token });
  }
  for (const u of creados) {
    const r = await peticion('DELETE', '/usuarios/me', { token: u.token }).catch((e) => ({ status: e.message }));
    registro.push(`DELETE /usuarios/me (${u.email || 'registrado sin login'}) → ${r.status}`);
  }
  fs.writeFileSync(path.join(RAIZ_EVIDENCIAS, 'limpieza.txt'), registro.join('\n') + '\n');
});

// =========================================================== AUTENTICACIÓN
const CAT_AUTH = 'OWASP A07:2021 Identification and Authentication Failures / API2:2023 Broken Authentication';

caso(
  {
    id: 'SEG-AUTH-01', categoria: CAT_AUTH, nombre: 'Rutas protegidas sin token devuelven 401', tipo: 'negativo',
    objetivo: 'Verificar que el JwtAuthGuard protege todas las rutas salvo /auth/*',
    esperado: 'HTTP 401 en todas las rutas protegidas cuando no se envía Authorization',
    severidadSiFalla: 'Crítica',
  },
  async () => {
    const id = F.equipoA.id;
    const rutas = [
      ['GET', '/usuarios/me'], ['PATCH', '/usuarios/me'], ['DELETE', '/usuarios/me'], ['GET', '/usuarios?email=a@b.com'],
      ['GET', '/equipos'], ['POST', '/equipos'], ['GET', `/equipos/${id}`], ['DELETE', `/equipos/${id}`],
      ['GET', `/equipos/${id}/miembros`], ['POST', `/equipos/${id}/miembros`], ['DELETE', `/equipos/${id}/miembros/${F.C.id}`],
      ['GET', `/proyectos?equipoId=${id}`], ['POST', '/proyectos'], ['GET', `/proyectos/${F.proyA1.id}`], ['DELETE', `/proyectos/${F.proyA1.id}`],
      ['GET', `/listas/proyecto/${F.proyA1.id}`], ['GET', `/tareas?proyectoId=${F.proyA1.id}`], ['POST', '/tareas'],
      ['PATCH', `/tareas/${F.tareaA.id}`], ['DELETE', `/tareas/${F.tareaA.id}`], ['PATCH', `/tareas/${F.tareaA.id}/mover`], ['PATCH', `/tareas/${F.tareaA.id}/asignar`],
    ];
    const res = [];
    for (const [m, r] of rutas) res.push([`${m} ${r}`, await peticion(m, r, { body: m === 'GET' || m === 'DELETE' ? undefined : {} })]);
    const malas = res.filter(([, r]) => r.status !== 401);
    return {
      ok: malas.length === 0,
      obtenido: malas.length === 0 ? `${res.length}/${res.length} rutas respondieron 401` : `Rutas sin 401: ${fmt(malas)}`,
    };
  },
);

caso(
  {
    id: 'SEG-AUTH-02', categoria: CAT_AUTH, nombre: 'Login válido emite JWT HS256 con expiración de 1 día', tipo: 'positivo',
    objetivo: 'Comprobar que el token emitido tiene algoritmo seguro, expiración y no incluye datos sensibles',
    esperado: 'HTTP 201 con access_token; header alg=HS256; exp - iat = 86400 s; payload sin password',
    severidadSiFalla: 'Alta',
  },
  async () => {
    const r = await peticion('POST', '/auth/login', { body: { email: F.A.email, password: PASSWORD } });
    const { header, payload } = jwt.decodificar(r.body.access_token);
    const vida = payload.exp - payload.iat;
    const ok = r.status === 201 && header.alg === 'HS256' && vida === 86400 && !('password' in payload);
    return { ok, obtenido: `HTTP ${r.status}; alg=${header.alg}; vida=${vida}s; claims=[${Object.keys(payload).join(', ')}]`, extra: { header, payload } };
  },
);

caso(
  {
    id: 'SEG-AUTH-03', categoria: CAT_AUTH, nombre: 'Token con firma alterada es rechazado', tipo: 'negativo',
    objetivo: 'Verificar que se valida la firma HMAC del JWT',
    esperado: 'HTTP 401 en GET /usuarios/me con un token cuya firma fue modificada', severidadSiFalla: 'Crítica',
  },
  async () => {
    const r = await peticion('GET', '/usuarios/me', { token: jwt.alterarFirma(F.A.token) });
    return { ok: r.status === 401, obtenido: `HTTP ${r.status}` };
  },
);

caso(
  {
    id: 'SEG-AUTH-04', categoria: CAT_AUTH, nombre: 'Token con payload manipulado (suplantación de sub) es rechazado', tipo: 'negativo',
    objetivo: 'Impedir que un usuario cambie el "sub" del token para suplantar a otro',
    esperado: 'HTTP 401 al usar el token de B con sub/id de A y la firma original', severidadSiFalla: 'Crítica',
  },
  async () => {
    const falso = jwt.cambiarPayloadConservandoFirma(F.B.token, { sub: F.A.id, id: F.A.id, email: F.A.email });
    const r = await peticion('GET', '/usuarios/me', { token: falso });
    return { ok: r.status === 401, obtenido: `HTTP ${r.status}${r.body?.email ? ' — devolvió perfil de ' + r.body.email : ''}` };
  },
);

caso(
  {
    id: 'SEG-AUTH-05', categoria: CAT_AUTH, nombre: 'Token con algoritmo "none" es rechazado', tipo: 'negativo',
    objetivo: 'Evitar el ataque alg=none (token sin firma)', esperado: 'HTTP 401', severidadSiFalla: 'Crítica',
  },
  async () => {
    const ahora = Math.floor(Date.now() / 1000);
    const t = jwt.firmar({ sub: F.A.id, id: F.A.id, email: F.A.email, iat: ahora, exp: ahora + 3600 }, null, { alg: 'none', typ: 'JWT' });
    const r = await peticion('GET', '/usuarios/me', { token: t });
    return { ok: r.status === 401, obtenido: `HTTP ${r.status}` };
  },
);

caso(
  {
    id: 'SEG-AUTH-06', categoria: CAT_AUTH, nombre: 'Token firmado con un secreto incorrecto es rechazado', tipo: 'negativo',
    objetivo: 'Verificar que un atacante no puede fabricar tokens con secretos débiles/adivinados (p. ej. "secret")',
    esperado: 'HTTP 401 para tokens firmados con "secret", "changeme" y "taskflow"', severidadSiFalla: 'Crítica',
  },
  async () => {
    const ahora = Math.floor(Date.now() / 1000);
    const res = [];
    for (const s of ['secret', 'changeme', 'taskflow']) {
      const t = jwt.firmar({ sub: F.A.id, id: F.A.id, email: F.A.email, iat: ahora, exp: ahora + 3600 }, s);
      res.push(await peticion('GET', '/usuarios/me', { token: t }));
    }
    return { ok: res.every((r) => r.status === 401), obtenido: `HTTP ${statusList(res)}` };
  },
);

caso(
  {
    id: 'SEG-AUTH-07', categoria: CAT_AUTH, nombre: 'Token caducado (exp en el pasado) es rechazado', tipo: 'negativo',
    objetivo: 'Verificar que se valida la expiración del JWT (ignoreExpiration=false)',
    esperado: 'HTTP 401 con un token correctamente firmado pero expirado hace 1 hora', severidadSiFalla: 'Alta',
  },
  async () => {
    const secreto = jwt.leerSecretoLocal();
    if (!secreto) return { ok: false, obtenido: 'No se pudo leer JWT_SECRET del .env local para fabricar el token' };
    const ahora = Math.floor(Date.now() / 1000);
    const t = jwt.firmar({ sub: F.A.id, id: F.A.id, email: F.A.email, iat: ahora - 90000, exp: ahora - 3600 }, secreto);
    const control = jwt.firmar({ sub: F.A.id, id: F.A.id, email: F.A.email, iat: ahora, exp: ahora + 3600 }, secreto);
    const r = await peticion('GET', '/usuarios/me', { token: t });
    const rc = await peticion('GET', '/usuarios/me', { token: control });
    return {
      ok: r.status === 401 && rc.status === 200,
      obtenido: `Token caducado → HTTP ${r.status}; control (mismo secreto, vigente) → HTTP ${rc.status}`,
    };
  },
);

caso(
  {
    id: 'SEG-AUTH-08', categoria: CAT_AUTH, nombre: 'El token solo se acepta en la cabecera Authorization: Bearer', tipo: 'negativo',
    objetivo: 'Evitar fugas de token por URL (logs, Referer) y formatos ambiguos',
    esperado: 'HTTP 401 si el token va en query string, sin prefijo Bearer o como cookie', severidadSiFalla: 'Media',
  },
  async () => {
    const r1 = await peticion('GET', `/equipos?access_token=${F.A.token}`);
    const r2 = await peticion('GET', '/equipos', { headers: { authorization: F.A.token } });
    const r3 = await peticion('GET', '/equipos', { headers: { cookie: `access_token=${F.A.token}` } });
    return { ok: [r1, r2, r3].every((r) => r.status === 401), obtenido: `query → ${r1.status}; sin Bearer → ${r2.status}; cookie → ${r3.status}` };
  },
);

caso(
  {
    id: 'SEG-AUTH-09', categoria: CAT_AUTH, nombre: 'Bloqueo por fuerza bruta: 6º intento → 429', tipo: 'negativo',
    objetivo: 'Verificar el limitador de intentos: tras 5 fallos sobre el mismo correo se bloquea 15 min',
    esperado: 'Intentos 1-5 → 401; intento 6 → 429 (incluso con la contraseña correcta) con mensaje en español',
    severidadSiFalla: 'Alta',
  },
  async () => {
    const v = await registrarYLoguear('fuerzabruta');
    const res = [];
    for (let i = 0; i < 5; i++) res.push(await peticion('POST', '/auth/login', { body: { email: v.email, password: `incorrecta${i}` } }));
    const sexto = await peticion('POST', '/auth/login', { body: { email: v.email, password: 'incorrecta6' } });
    const correcta = await peticion('POST', '/auth/login', { body: { email: v.email, password: PASSWORD } });
    F.emailBloqueado = v.email;
    const ok = res.every((r) => r.status === 401) && sexto.status === 429 && correcta.status === 429;
    return {
      ok,
      obtenido: `Intentos 1-5 → [${statusList(res)}]; 6º → ${sexto.status} ("${[].concat(sexto.body?.message)[0]}"); contraseña correcta durante bloqueo → ${correcta.status}`,
    };
  },
);

caso(
  {
    id: 'SEG-AUTH-10', categoria: CAT_AUTH, nombre: 'El bloqueo afecta solo a la cuenta atacada (y no se evade con mayúsculas)', tipo: 'positivo',
    objetivo: 'Comprobar que otros usuarios pueden autenticarse y que la clave del bloqueo normaliza el correo',
    esperado: 'Otro usuario → 201; mismo correo en MAYÚSCULAS → 429', severidadSiFalla: 'Media',
  },
  async () => {
    const otro = await peticion('POST', '/auth/login', { body: { email: F.C.email, password: PASSWORD } });
    const mayus = await peticion('POST', '/auth/login', { body: { email: F.emailBloqueado.toUpperCase(), password: PASSWORD } });
    return { ok: otro.status === 201 && mayus.status === 429, obtenido: `Otro usuario → ${otro.status}; correo bloqueado en mayúsculas → ${mayus.status}` };
  },
);

caso(
  {
    id: 'SEG-AUTH-11', categoria: CAT_AUTH, nombre: 'Login no permite enumerar usuarios por el mensaje', tipo: 'negativo',
    objetivo: 'El mensaje y código de error deben ser idénticos para usuario inexistente y contraseña incorrecta',
    esperado: 'Ambos → HTTP 401 con el mismo cuerpo {"message":"Credenciales inválidas",...}', severidadSiFalla: 'Media',
  },
  async () => {
    const v = await registrarYLoguear('enum');
    const a = await peticion('POST', '/auth/login', { body: { email: nuevoEmail('noexiste'), password: 'loquesea123' } });
    const b = await peticion('POST', '/auth/login', { body: { email: v.email, password: 'incorrecta123' } });
    const ok = a.status === 401 && b.status === 401 && a.texto === b.texto;
    return { ok, obtenido: `Inexistente → ${a.status} ${a.texto}; contraseña incorrecta → ${b.status} ${b.texto}` };
  },
);

caso(
  {
    id: 'SEG-AUTH-12', categoria: CAT_AUTH, nombre: 'Tiempo de respuesta del login no permite enumerar usuarios', tipo: 'negativo',
    objetivo: 'Detectar enumeración por canal lateral de tiempo (bcrypt solo se ejecuta si el usuario existe)',
    esperado: 'Diferencia de medianas entre usuario inexistente y contraseña incorrecta < 30 ms', severidadSiFalla: 'Baja',
  },
  async () => {
    const v = await registrarYLoguear('timing');
    const tExiste = [];
    const tNoExiste = [];
    for (let i = 0; i < 4; i++) {
      tExiste.push((await peticion('POST', '/auth/login', { body: { email: v.email, password: `mala${i}xx` } })).ms);
      tNoExiste.push((await peticion('POST', '/auth/login', { body: { email: nuevoEmail('fantasma'), password: `mala${i}xx` } })).ms);
    }
    await peticion('POST', '/auth/login', { body: { email: v.email, password: PASSWORD } }); // resetea contador
    const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const dif = Math.round((med(tExiste) - med(tNoExiste)) * 10) / 10;
    return {
      ok: Math.abs(dif) < 30,
      obtenido: `Mediana usuario existente=${med(tExiste)} ms; inexistente=${med(tNoExiste)} ms; diferencia=${dif} ms`,
      extra: { tExiste, tNoExiste },
      hallazgo: Math.abs(dif) >= 30
        ? { descripcion: `El login tarda ~${dif} ms más cuando el correo existe (bcrypt.compare solo se ejecuta para usuarios reales), lo que permite enumerar cuentas por tiempo.`, severidad: 'Baja', recomendacion: 'Ejecutar bcrypt.compare contra un hash ficticio cuando el usuario no existe para igualar tiempos.' }
        : undefined,
    };
  },
);

caso(
  {
    id: 'SEG-AUTH-13', categoria: CAT_AUTH, nombre: 'Limitación por cliente/IP frente a password spraying', tipo: 'negativo',
    objetivo: 'Comprobar si un mismo cliente puede probar contraseñas contra muchas cuentas distintas sin ser frenado',
    esperado: 'Tras un umbral razonable (≤ 20 intentos fallidos desde la misma IP) la API responde 429', severidadSiFalla: 'Media',
  },
  async () => {
    const res = [];
    for (let i = 0; i < 20; i++) res.push(await peticion('POST', '/auth/login', { body: { email: nuevoEmail('spray'), password: 'Verano2026!' } }));
    const n429 = res.filter((r) => r.status === 429).length;
    return {
      ok: n429 > 0,
      obtenido: `20 intentos contra 20 cuentas distintas: ${res.filter((r) => r.status === 401).length}×401, ${n429}×429 (no existe límite por IP)`,
      hallazgo: n429 === 0
        ? { descripcion: 'El limitador es solo por correo y en memoria: un atacante puede hacer password spraying (una contraseña contra muchas cuentas) o registrar cuentas masivamente sin límite por IP.', severidad: 'Media', recomendacion: 'Añadir @nestjs/throttler (límite global y por IP) con almacenamiento compartido (Redis) para que funcione con varias instancias y sobreviva a reinicios.' }
        : undefined,
    };
  },
);

caso(
  {
    id: 'SEG-AUTH-14', categoria: CAT_AUTH, nombre: 'El token de una cuenta eliminada deja de dar acceso', tipo: 'negativo',
    objetivo: 'Verificar que la estrategia JWT comprueba que el usuario sigue existiendo',
    esperado: 'Tras DELETE /usuarios/me, el mismo token → 401 (acceso denegado, sin datos)', severidadSiFalla: 'Alta',
  },
  async () => {
    const v = await registrarYLoguear('borrado');
    const del = await peticion('DELETE', '/usuarios/me', { token: v.token });
    const r = await peticion('GET', '/equipos', { token: v.token });
    return {
      ok: del.status === 200 && r.status === 401,
      obtenido: `DELETE /usuarios/me → ${del.status}; token reutilizado → ${r.status} ${r.texto}`,
      hallazgo: r.status === 404
        ? { descripcion: 'Un token válido de un usuario eliminado devuelve 404 "Usuario no encontrado" en lugar de 401; el frontend solo cierra sesión ante 401, por lo que la sesión queda en un estado inconsistente.', severidad: 'Baja', recomendacion: 'En JwtStrategy.validate lanzar UnauthorizedException cuando el usuario no existe.' }
        : undefined,
    };
  },
);

caso(
  {
    id: 'SEG-AUTH-15', categoria: CAT_AUTH, nombre: 'Política de contraseñas rechaza contraseñas triviales', tipo: 'negativo',
    objetivo: 'Comprobar la robustez de la política de contraseñas (OWASP ASVS 2.1)',
    esperado: 'HTTP 400 al registrar con "123456", "password" o "aaaaaa" (y con "12345"); política: ≥ 8 caracteres con al menos una letra y un número', severidadSiFalla: 'Media',
  },
  async () => {
    const res = [];
    for (const p of ['123456', 'password', 'aaaaaa']) {
      const email = nuevoEmail('debil');
      pendientes.push({ email, password: p });
      res.push([p, await peticion('POST', '/auth/register', { body: { nombre: 'Débil', email, password: p } })]);
    }
    const corta = await peticion('POST', '/auth/register', { body: { nombre: 'Corta', email: nuevoEmail('corta'), password: '12345' } });
    const aceptadas = res.filter(([, r]) => r.status === 201);
    const mensajes = (r) => (Array.isArray(r.body?.message) ? r.body.message : [r.body?.message]).filter(Boolean).join(' / ');
    return {
      ok: res.every(([, r]) => r.status === 400) && corta.status === 400,
      obtenido: `${res.map(([p, r]) => `"${p}" → ${r.status}${r.status === 400 ? ` (${mensajes(r)})` : ''}`).join('; ')}; "12345" (5 car.) → ${corta.status}`,
      hallazgo: aceptadas.length
        ? { descripcion: 'La política de contraseñas admite contraseñas triviales como "123456" o "password".', severidad: 'Media', recomendacion: 'Exigir mínimo 8-12 caracteres con letras y números, rechazar contraseñas comunes/filtradas (lista tipo Have I Been Pwned) y mostrar un medidor de fortaleza en el frontend.' }
        : undefined,
    };
  },
);

// ============================================================= AUTORIZACIÓN
const CAT_BOLA = 'OWASP A01:2021 Broken Access Control / API1:2023 Broken Object Level Authorization';
const CAT_BFLA = 'OWASP A01:2021 Broken Access Control / API5:2023 Broken Function Level Authorization';
const denegado = (r) => r.status === 403 || r.status === 404;

caso(
  {
    id: 'SEG-AUTHZ-01', categoria: CAT_BOLA, nombre: 'Usuario ajeno no puede leer el equipo ni sus miembros', tipo: 'negativo',
    objetivo: 'Evitar IDOR sobre /equipos/:id conociendo el UUID', esperado: 'HTTP 403/404 y sin datos del equipo', severidadSiFalla: 'Alta',
  },
  async () => {
    const r1 = await peticion('GET', `/equipos/${F.equipoA.id}`, { token: F.B.token });
    const r2 = await peticion('GET', `/equipos/${F.equipoA.id}/miembros`, { token: F.B.token });
    const fuga = r1.texto.includes(F.A.email) || r2.texto.includes(F.A.email);
    return { ok: denegado(r1) && denegado(r2) && !fuga, obtenido: `GET equipo → ${r1.status}; GET miembros → ${r2.status}; fuga de datos: ${fuga ? 'sí' : 'no'}` };
  },
);

caso(
  {
    id: 'SEG-AUTHZ-02', categoria: CAT_BOLA, nombre: 'Usuario ajeno no puede leer proyectos ni listas de otro equipo', tipo: 'negativo',
    objetivo: 'Evitar IDOR sobre /proyectos y /listas', esperado: 'HTTP 403/404 en las 3 rutas', severidadSiFalla: 'Alta',
  },
  async () => {
    const pares = [
      ['GET /proyectos?equipoId', await peticion('GET', `/proyectos?equipoId=${F.equipoA.id}`, { token: F.B.token })],
      ['GET /proyectos/:id', await peticion('GET', `/proyectos/${F.proyA1.id}`, { token: F.B.token })],
      ['GET /listas/proyecto/:id', await peticion('GET', `/listas/proyecto/${F.proyA1.id}`, { token: F.B.token })],
    ];
    return { ok: pares.every(([, r]) => denegado(r)), obtenido: fmt(pares) };
  },
);

caso(
  {
    id: 'SEG-AUTHZ-03', categoria: CAT_BOLA, nombre: 'Usuario ajeno no puede leer las tareas de otro proyecto', tipo: 'negativo',
    objetivo: 'Evitar IDOR sobre GET /tareas?proyectoId', esperado: 'HTTP 403/404 sin el título de la tarea', severidadSiFalla: 'Alta',
  },
  async () => {
    const r = await peticion('GET', `/tareas?proyectoId=${F.proyA1.id}`, { token: F.B.token });
    return { ok: denegado(r) && !r.texto.includes('Tarea confidencial'), obtenido: `HTTP ${r.status} ${r.texto}` };
  },
);

caso(
  {
    id: 'SEG-AUTHZ-04', categoria: CAT_BOLA, nombre: 'Usuario ajeno no puede crear, editar, mover, asignar ni borrar tareas ajenas', tipo: 'negativo',
    objetivo: 'Evitar modificación de objetos ajenos (BOLA en escritura)',
    esperado: 'HTTP 403/404 en las 5 operaciones y la tarea de A queda intacta', severidadSiFalla: 'Crítica',
  },
  async () => {
    const t = F.tareaA.id;
    const pares = [
      ['POST /tareas (lista ajena)', await peticion('POST', '/tareas', { token: F.B.token, body: { titulo: 'intrusa', listaId: F.listasA1[0].id } })],
      ['PATCH /tareas/:id', await peticion('PATCH', `/tareas/${t}`, { token: F.B.token, body: { titulo: 'HACKEADA' } })],
      ['PATCH /tareas/:id/mover', await peticion('PATCH', `/tareas/${t}/mover`, { token: F.B.token, body: { nuevaListaId: F.listasA1[1].id } })],
      ['PATCH /tareas/:id/asignar', await peticion('PATCH', `/tareas/${t}/asignar`, { token: F.B.token, body: { miembros: [] } })],
      ['DELETE /tareas/:id', await peticion('DELETE', `/tareas/${t}`, { token: F.B.token })],
    ];
    const tareas = (await peticion('GET', `/tareas?proyectoId=${F.proyA1.id}`, { token: F.A.token })).body;
    const actual = tareas.find((x) => x.id === t);
    const intacta = actual && actual.titulo === 'Tarea confidencial A' && actual.listaId === F.listasA1[0].id && actual.asignados.length === 2;
    const intrusa = tareas.some((x) => x.titulo === 'intrusa');
    return {
      ok: pares.every(([, r]) => denegado(r)) && intacta && !intrusa,
      obtenido: `${fmt(pares)}; tarea de A intacta: ${intacta ? 'sí' : 'NO'}; tarea intrusa creada: ${intrusa ? 'SÍ' : 'no'}`,
    };
  },
);

caso(
  {
    id: 'SEG-AUTHZ-05', categoria: CAT_BOLA, nombre: 'Usuario ajeno no puede borrar equipo/proyecto ajeno ni auto-añadirse', tipo: 'negativo',
    objetivo: 'Evitar destrucción de datos y escalada mediante IDs conocidos',
    esperado: 'HTTP 403/404 en las 4 operaciones; el equipo sigue existiendo', severidadSiFalla: 'Crítica',
  },
  async () => {
    const pares = [
      ['DELETE /proyectos/:id', await peticion('DELETE', `/proyectos/${F.proyA2.id}`, { token: F.B.token })],
      ['DELETE /equipos/:id', await peticion('DELETE', `/equipos/${F.equipoA.id}`, { token: F.B.token })],
      ['POST /equipos/:id/miembros (a sí mismo)', await peticion('POST', `/equipos/${F.equipoA.id}/miembros`, { token: F.B.token, body: { userId: F.B.id } })],
      ['DELETE /equipos/:id/miembros/:C', await peticion('DELETE', `/equipos/${F.equipoA.id}/miembros/${F.C.id}`, { token: F.B.token })],
    ];
    const sigue = await peticion('GET', `/equipos/${F.equipoA.id}`, { token: F.A.token });
    const sinB = !sigue.body.miembros.some((m) => m.id === F.B.id) && sigue.body.miembros.some((m) => m.id === F.C.id);
    return { ok: pares.every(([, r]) => denegado(r)) && sigue.status === 200 && sinB, obtenido: `${fmt(pares)}; equipo intacto: ${sigue.status === 200 && sinB ? 'sí' : 'NO'}` };
  },
);

caso(
  {
    id: 'SEG-AUTHZ-06', categoria: CAT_BFLA, nombre: 'Miembro no líder no puede ejecutar acciones de líder', tipo: 'negativo',
    objetivo: 'Verificar la autorización a nivel de función (solo el líder gestiona miembros y elimina equipo/proyecto)',
    esperado: 'HTTP 403 al añadir/quitar miembros y al eliminar equipo o proyecto', severidadSiFalla: 'Alta',
  },
  async () => {
    const pares = [
      ['añadir miembro', await peticion('POST', `/equipos/${F.equipoA.id}/miembros`, { token: F.C.token, body: { userId: F.B.id } })],
      ['quitar miembro', await peticion('DELETE', `/equipos/${F.equipoA.id}/miembros/${F.D.id}`, { token: F.C.token })],
      ['quitar al líder', await peticion('DELETE', `/equipos/${F.equipoA.id}/miembros/${F.A.id}`, { token: F.C.token })],
      ['eliminar proyecto', await peticion('DELETE', `/proyectos/${F.proyA2.id}`, { token: F.C.token })],
      ['eliminar equipo', await peticion('DELETE', `/equipos/${F.equipoA.id}`, { token: F.C.token })],
    ];
    return { ok: pares.every(([, r]) => r.status === 403), obtenido: fmt(pares) };
  },
);

caso(
  {
    id: 'SEG-AUTHZ-07', categoria: CAT_BOLA, nombre: 'Miembro del equipo sí puede leer y crear tareas (control positivo)', tipo: 'positivo',
    objetivo: 'Confirmar que los controles no bloquean el uso legítimo',
    esperado: 'GET equipo/proyecto/tareas → 200; POST /tareas → 201', severidadSiFalla: 'Media',
  },
  async () => {
    const pares = [
      ['GET equipo', await peticion('GET', `/equipos/${F.equipoA.id}`, { token: F.C.token })],
      ['GET proyecto', await peticion('GET', `/proyectos/${F.proyA1.id}`, { token: F.C.token })],
      ['GET tareas', await peticion('GET', `/tareas?proyectoId=${F.proyA1.id}`, { token: F.C.token })],
      ['POST tarea', await peticion('POST', '/tareas', { token: F.C.token, body: { titulo: 'Tarea de C', proyectoId: F.proyA1.id } })],
    ];
    const ok = pares.slice(0, 3).every(([, r]) => r.status === 200) && pares[3][1].status === 201;
    return { ok, obtenido: fmt(pares) };
  },
);

caso(
  {
    id: 'SEG-AUTHZ-08', categoria: CAT_BOLA, nombre: 'No se pueden asignar usuarios ajenos al equipo a una tarea', tipo: 'negativo',
    objetivo: 'Impedir asignar (y exponer la tarea a) usuarios que no son miembros',
    esperado: 'HTTP 400 "Solo se pueden asignar miembros del equipo" (al asignar y al crear)', severidadSiFalla: 'Media',
  },
  async () => {
    const r1 = await peticion('PATCH', `/tareas/${F.tareaA.id}/asignar`, { token: F.A.token, body: { miembros: [F.B.id] } });
    const r2 = await peticion('POST', '/tareas', { token: F.A.token, body: { titulo: 'x', listaId: F.listasA1[0].id, asignados: [F.B.id] } });
    return { ok: r1.status === 400 && r2.status === 400, obtenido: `asignar → ${r1.status} ${JSON.stringify(r1.body?.message)}; crear con asignado ajeno → ${r2.status}` };
  },
);

caso(
  {
    id: 'SEG-AUTHZ-09', categoria: CAT_BOLA, nombre: 'No se puede mover una tarea a la lista de otro proyecto', tipo: 'negativo',
    objetivo: 'Mantener la integridad entre proyectos (y evitar mover tareas a proyectos ajenos)',
    esperado: 'HTTP 400 al mover a una lista de otro proyecto (propio o ajeno)', severidadSiFalla: 'Media',
  },
  async () => {
    const r1 = await peticion('PATCH', `/tareas/${F.tareaA.id}/mover`, { token: F.A.token, body: { nuevaListaId: F.listasA2[0].id } });
    const pB = (await peticion('POST', '/proyectos', { token: F.B.token, body: { nombre: 'Proyecto B', equipoId: F.equipoB.id } })).body;
    const lB = (await peticion('GET', `/listas/proyecto/${pB.id}`, { token: F.B.token })).body;
    const r2 = await peticion('PATCH', `/tareas/${F.tareaA.id}/mover`, { token: F.A.token, body: { nuevaListaId: lB[0].id } });
    return { ok: r1.status === 400 && r2.status === 400, obtenido: `a otro proyecto propio → ${r1.status}; a proyecto de otro equipo → ${r2.status}` };
  },
);

caso(
  {
    id: 'SEG-AUTHZ-10', categoria: CAT_BOLA, nombre: 'Un miembro expulsado pierde el acceso inmediatamente', tipo: 'negativo',
    objetivo: 'Verificar que la autorización se evalúa en cada petición (no cacheada en el token)',
    esperado: 'Antes de expulsar → 200; después → 403', severidadSiFalla: 'Alta',
  },
  async () => {
    const antes = await peticion('GET', `/proyectos/${F.proyA1.id}`, { token: F.D.token });
    const exp = await peticion('DELETE', `/equipos/${F.equipoA.id}/miembros/${F.D.id}`, { token: F.A.token });
    const despues = await peticion('GET', `/proyectos/${F.proyA1.id}`, { token: F.D.token });
    return { ok: antes.status === 200 && exp.status === 200 && despues.status === 403, obtenido: `antes → ${antes.status}; expulsión → ${exp.status}; después → ${despues.status}` };
  },
);

caso(
  {
    id: 'SEG-AUTHZ-11', categoria: CAT_BOLA, nombre: 'GET /equipos solo lista los equipos del usuario', tipo: 'positivo',
    objetivo: 'Evitar fuga de equipos ajenos en listados', esperado: 'B ve su equipo y no ve el de A', severidadSiFalla: 'Alta',
  },
  async () => {
    const r = await peticion('GET', '/equipos', { token: F.B.token });
    const ids = r.body.map((e) => e.id);
    return { ok: r.status === 200 && ids.includes(F.equipoB.id) && !ids.includes(F.equipoA.id), obtenido: `HTTP ${r.status}; ${ids.length} equipo(s); contiene equipo de A: ${ids.includes(F.equipoA.id) ? 'SÍ' : 'no'}` };
  },
);

// ======================================================= EXPOSICIÓN DE DATOS
const CAT_DATA = 'OWASP A02:2021 Cryptographic Failures / API3:2023 Broken Object Property Level Authorization';

caso(
  {
    id: 'SEG-DATA-01', categoria: CAT_DATA, nombre: 'Ninguna respuesta de la API expone la contraseña ni su hash', tipo: 'negativo',
    objetivo: 'Verificar select:false en la columna password y respuestas sanitizadas',
    esperado: 'Ni "password" ni "$2b$" aparecen en register, login, /usuarios/me, /usuarios?email, equipos, miembros ni tareas (ni en ninguna respuesta de la suite)',
    severidadSiFalla: 'Crítica',
  },
  async () => {
    const v = await registrarYLoguear('datos');
    await peticion('GET', '/usuarios/me', { token: F.A.token });
    await peticion('GET', `/usuarios?email=${encodeURIComponent(F.C.email)}`, { token: F.A.token });
    await peticion('PATCH', '/usuarios/me', { token: v.token, body: { nombre: 'Nuevo nombre' } });
    await peticion('GET', '/equipos', { token: F.A.token });
    await peticion('GET', `/equipos/${F.equipoA.id}/miembros`, { token: F.A.token });
    await peticion('GET', `/proyectos/${F.proyA1.id}`, { token: F.A.token });
    await peticion('GET', `/tareas?proyectoId=${F.proyA1.id}`, { token: F.A.token });
    const todas = estado.todasLasRespuestas;
    const conFuga = todas.filter((r) => /"password"\s*:/i.test(r.texto) || r.texto.includes('$2b$'));
    return {
      ok: conFuga.length === 0,
      obtenido: conFuga.length === 0
        ? `0 de ${todas.length} respuestas analizadas contienen "password" o un hash bcrypt`
        : `Fuga en: ${conFuga.map((r) => `${r.metodo} ${r.ruta}`).join(', ')}`,
    };
  },
);

caso(
  {
    id: 'SEG-DATA-02', categoria: CAT_DATA, nombre: 'Las contraseñas se almacenan con bcrypt (coste 10)', tipo: 'positivo',
    objetivo: 'Verificar el hashing en la base de datos (consulta SQL de solo lectura con psql)',
    esperado: 'La columna password empieza por "$2b$10$", tiene 60 caracteres y no contiene la contraseña en claro', severidadSiFalla: 'Crítica',
  },
  async () => {
    const sql = `SELECT left(password,7) || '|' || length(password) || '|' || (password = '${PASSWORD}') FROM usuarios WHERE email = '${F.A.email}';`;
    const r = spawnSync(PSQL, ['-U', 'postgres', '-h', 'localhost', '-d', 'taskflow', '-At', '-c', sql], {
      env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'coco258' }, encoding: 'utf8',
    });
    if (r.error || r.status !== 0) return { ok: false, obtenido: `No se pudo ejecutar psql: ${r.error?.message || r.stderr}` };
    const [prefijo, largo, enClaro] = r.stdout.trim().split('|');
    fs.writeFileSync(path.join(RAIZ_EVIDENCIAS, 'psql-hash.txt'), `$ psql -At -c "SELECT left(password,7), length(password), password = '<clave>' FROM usuarios WHERE email='${F.A.email}'"\n${prefijo} | ${largo} | ${enClaro}\n`);
    return { ok: prefijo === '$2b$10$' && largo === '60' && (enClaro === 'f' || enClaro === 'false'), obtenido: `prefijo=${prefijo}; longitud=${largo}; igual al texto plano=${enClaro}` };
  },
);

caso(
  {
    id: 'SEG-DATA-03', categoria: 'OWASP A01:2021 / API3:2023 Broken Object Property Level Authorization', nombre: 'Búsqueda de usuarios por email no permite enumerar cuentas ajenas', tipo: 'negativo',
    objetivo: 'Comprobar si cualquier usuario autenticado puede consultar si un correo está registrado y obtener sus datos',
    esperado: 'La búsqueda no revela datos de usuarios sin relación con el solicitante (o está limitada en frecuencia)', severidadSiFalla: 'Baja',
  },
  async () => {
    const r = await peticion('GET', `/usuarios?email=${encodeURIComponent(F.A.email)}`, { token: F.B.token });
    const reg = await peticion('POST', '/auth/register', { body: { nombre: 'x', email: F.A.email, password: PASSWORD } });
    const expone = r.status === 200 && r.body?.email === F.A.email;
    return {
      ok: !expone,
      obtenido: `B consulta el correo de A → ${r.status} con campos [${Object.keys(r.body || {}).join(', ')}]; registro con correo existente → ${reg.status} "${reg.body?.message}"`,
      hallazgo: expone
        ? { descripcion: 'GET /usuarios?email= devuelve id, nombre, email y fechas de cualquier usuario a cualquier usuario autenticado, y /auth/register responde 409 "El email ya está registrado": ambos permiten enumerar cuentas.', severidad: 'Baja', recomendacion: 'Limitar la búsqueda (rate limit, devolver solo id/nombre, o invitar por correo sin confirmar existencia) y responder de forma genérica en el registro.' }
        : undefined,
    };
  },
);

caso(
  {
    id: 'SEG-DATA-04', categoria: CAT_DATA, nombre: 'La respuesta de login y el JWT no contienen datos sensibles', tipo: 'positivo',
    objetivo: 'Minimizar los datos expuestos en el token (que es legible en base64)',
    esperado: 'Respuesta = {access_token}; claims solo sub, email, id, iat, exp', severidadSiFalla: 'Media',
  },
  async () => {
    const r = await peticion('POST', '/auth/login', { body: { email: F.A.email, password: PASSWORD } });
    const claves = Object.keys(r.body || {});
    const claims = Object.keys(jwt.decodificar(r.body.access_token).payload).sort();
    const ok = claves.length === 1 && claves[0] === 'access_token' && claims.join() === ['email', 'exp', 'iat', 'id', 'sub'].join();
    return { ok, obtenido: `cuerpo=[${claves}]; claims=[${claims}]` };
  },
);

// ================================================================ INYECCIÓN
const CAT_INY = 'OWASP A03:2021 Injection';

caso(
  {
    id: 'SEG-INY-01', categoria: CAT_INY, nombre: 'Inyección SQL en el login no permite saltar la autenticación', tipo: 'negativo',
    objetivo: 'Comprobar el uso de consultas parametrizadas y validación de entrada en /auth/login',
    esperado: 'HTTP 400/401 (nunca 201 ni 500) para payloads SQLi en email y password', severidadSiFalla: 'Crítica',
  },
  async () => {
    const payloads = [
      { email: "' OR '1'='1' --", password: 'x' },
      { email: "admin'--@taskflow.test", password: 'x' },
      { email: `${F.C.email}' OR 1=1 --`, password: 'x' },
      { email: F.C.email.replace('@', "'||'@"), password: 'x' },
      { email: nuevoEmail('sqli'), password: "' OR '1'='1" },
      { email: nuevoEmail('sqli'), password: "x'; DROP TABLE usuarios; --" },
    ];
    const res = [];
    for (const p of payloads) res.push(await peticion('POST', '/auth/login', { body: p }));
    const ok = res.every((r) => r.status === 400 || r.status === 401);
    return { ok, obtenido: `Códigos: [${statusList(res)}]; tokens emitidos: ${res.filter((r) => r.body?.access_token).length}` };
  },
);

caso(
  {
    id: 'SEG-INY-02', categoria: CAT_INY, nombre: 'Inyección SQL en parámetros de consulta', tipo: 'negativo',
    objetivo: 'Comprobar que los parámetros de búsqueda y filtros no son interpretados como SQL',
    esperado: 'GET /usuarios?email=<sqli> → 404 sin datos; ?proyectoId/?equipoId=<sqli> → 400 (ParseUUIDPipe); nunca 500', severidadSiFalla: 'Crítica',
  },
  async () => {
    const enc = encodeURIComponent;
    const pares = [
      ["usuarios?email=' OR '1'='1", await peticion('GET', `/usuarios?email=${enc("' OR '1'='1")}`, { token: F.A.token })],
      ['usuarios?email=%', await peticion('GET', `/usuarios?email=${enc('%')}`, { token: F.A.token })],
      ["usuarios?email=x' UNION SELECT ...", await peticion('GET', `/usuarios?email=${enc("x' UNION SELECT id,nombre,password,email,now(),now() FROM usuarios--")}`, { token: F.A.token })],
      ["tareas?proyectoId=1 OR 1=1", await peticion('GET', `/tareas?proyectoId=${enc('1 OR 1=1')}`, { token: F.A.token })],
      ["proyectos?equipoId=' OR ''='", await peticion('GET', `/proyectos?equipoId=${enc("' OR ''='")}`, { token: F.A.token })],
    ];
    const ok = pares[0][1].status === 404 && pares[1][1].status === 404 && pares[2][1].status === 404 && pares[3][1].status === 400 && pares[4][1].status === 400;
    return { ok, obtenido: fmt(pares) };
  },
);

caso(
  {
    id: 'SEG-INY-03', categoria: CAT_INY, nombre: 'Payload SQL almacenado se guarda como texto literal', tipo: 'negativo',
    objetivo: "Verificar que un nombre como \"'); DROP TABLE usuarios; --\" no se ejecuta",
    esperado: 'HTTP 201, el nombre se devuelve literal y la tabla usuarios sigue operativa (login posterior 201)', severidadSiFalla: 'Crítica',
  },
  async () => {
    const nombre = "Eq'); DROP TABLE usuarios; --";
    const r = await peticion('POST', '/proyectos', { token: F.A.token, body: { nombre, equipoId: F.equipoA.id } });
    const login = await peticion('POST', '/auth/login', { body: { email: F.C.email, password: PASSWORD } });
    return { ok: r.status === 201 && r.body?.nombre === nombre && login.status === 201, obtenido: `crear → ${r.status}, nombre literal: ${r.body?.nombre === nombre ? 'sí' : 'no'}; login posterior → ${login.status}` };
  },
);

caso(
  {
    id: 'SEG-INY-04', categoria: CAT_INY, nombre: 'Operadores tipo NoSQL en el email son rechazados', tipo: 'negativo',
    objetivo: 'Comprobar que objetos JSON ({"$ne":null}, {"$gt":""}) no se aceptan donde se espera texto',
    esperado: 'HTTP 400 por validación (IsEmail) en login y registro', severidadSiFalla: 'Alta',
  },
  async () => {
    const res = [
      await peticion('POST', '/auth/login', { body: { email: { $ne: null }, password: 'x' } }),
      await peticion('POST', '/auth/login', { body: { email: { $gt: '' }, password: { $gt: '' } } }),
      await peticion('POST', '/auth/register', { body: { nombre: { $ne: 1 }, email: nuevoEmail('nosql'), password: PASSWORD } }),
      await peticion('POST', '/equipos', { token: F.A.token, body: { nombre: { $where: 'sleep(1000)' } } }),
    ];
    return { ok: res.every((r) => r.status === 400), obtenido: `Códigos: [${statusList(res)}]` };
  },
);

caso(
  {
    id: 'SEG-INY-05', categoria: `${CAT_INY} / A04:2021 Insecure Design`, nombre: 'Objeto en el campo password del login es rechazado con 400', tipo: 'negativo',
    objetivo: 'Comprobar la validación de tipo del campo password en LoginDto',
    esperado: 'HTTP 400 (validación) — no 500 — y el intento cuenta para el bloqueo', severidadSiFalla: 'Media',
  },
  async () => {
    const v = await registrarYLoguear('nosqlpwd');
    const r = await peticion('POST', '/auth/login', { body: { email: v.email, password: { $ne: null } } });
    const r2 = await peticion('POST', '/auth/login', { body: { email: v.email, password: ['a', 'b'] } });
    const r3 = await peticion('POST', '/auth/login', { body: { email: v.email, password: 12345678 } });
    const ok = [r, r2, r3].every((x) => x.status === 400);
    return {
      ok,
      obtenido: `{"$ne":null} → ${r.status} ${r.texto}; array → ${r2.status}; número → ${r3.status}`,
      hallazgo: !ok
        ? { descripcion: 'LoginDto.password solo tiene @IsNotEmpty (sin @IsString): un objeto/array/número llega a bcrypt.compare, que lanza una excepción no controlada → HTTP 500. No hay bypass de autenticación, pero es un error no controlado y estos intentos no cuentan para el bloqueo por fuerza bruta.', severidad: 'Media', recomendacion: 'Añadir @IsString() y @MaxLength(72) a LoginDto.password (y forbidNonWhitelisted en el ValidationPipe).' }
        : undefined,
    };
  },
);

caso(
  {
    id: 'SEG-INY-06', categoria: `${CAT_INY} (XSS)`, nombre: 'XSS almacenado en el título de una tarea se devuelve como texto', tipo: 'negativo',
    objetivo: 'Verificar que el payload se trata como dato: JSON con Content-Type application/json + nosniff, y que el frontend no usa sinks HTML peligrosos',
    esperado: 'Título devuelto literal en JSON; Content-Type application/json; X-Content-Type-Options: nosniff; 0 usos de dangerouslySetInnerHTML/innerHTML en taskflow-frontend/src',
    severidadSiFalla: 'Alta',
  },
  async () => {
    const payload = '<script>alert(document.cookie)</script><img src=x onerror=alert(1)>';
    const r = await peticion('POST', '/tareas', { token: F.A.token, body: { titulo: payload, listaId: F.listasA1[0].id } });
    const g = await peticion('GET', `/tareas?proyectoId=${F.proyA1.id}`, { token: F.A.token });
    const literal = g.body.some((t) => t.titulo === payload);
    const sinks = buscarEnFrontend(/dangerouslySetInnerHTML|\.innerHTML\s*=|document\.write\(|eval\(/);
    const ok = r.status === 201 && literal && g.headers['content-type'].startsWith('application/json') && g.headers['x-content-type-options'] === 'nosniff' && sinks.length === 0;
    return {
      ok,
      obtenido: `crear → ${r.status}; título literal: ${literal ? 'sí' : 'no'}; content-type=${g.headers['content-type']}; nosniff=${g.headers['x-content-type-options']}; sinks peligrosos en frontend: ${sinks.length} (React escapa el texto al renderizar {tarea.titulo})`,
      extra: { sinks },
    };
  },
);

function buscarEnFrontend(regex) {
  const res = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.spec\./.test(e.name)) {
        fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (regex.test(l)) res.push(`${path.relative(RAIZ_REPO, p)}:${i + 1}`); });
      }
    }
  };
  try { recorrer(path.join(RAIZ_REPO, 'taskflow-frontend', 'src')); } catch { /* sin frontend */ }
  return res;
}

caso(
  {
    id: 'SEG-INY-07', categoria: `${CAT_INY} / Prototype pollution`, nombre: 'Payload __proto__ no contamina objetos del servidor', tipo: 'negativo',
    objetivo: 'Comprobar que claves __proto__/constructor en el JSON no alteran el comportamiento',
    esperado: 'Sin 500; las respuestas posteriores no contienen la propiedad inyectada', severidadSiFalla: 'Alta',
  },
  async () => {
    const r = await peticion('POST', '/equipos', { token: F.A.token, cuerpoCrudo: '{"nombre":"Proto","__proto__":{"isAdmin":true,"polucion":"si"},"constructor":{"prototype":{"polucion2":"si"}}}' });
    const g = await peticion('GET', '/equipos', { token: F.B.token });
    if (r.body?.id) await peticion('DELETE', `/equipos/${r.body.id}`, { token: F.A.token });
    const contaminado = /polucion|isAdmin/.test(g.texto) || /polucion|isAdmin/.test(r.texto);
    return { ok: r.status < 500 && !contaminado, obtenido: `crear → ${r.status}; propiedades inyectadas presentes: ${contaminado ? 'SÍ' : 'no'}` };
  },
);

// ========================================== VALIDACIÓN / MASS ASSIGNMENT
const CAT_VAL = 'OWASP A04:2021 Insecure Design / API3:2023 BOPLA (Mass Assignment)';

caso(
  {
    id: 'SEG-VAL-01', categoria: CAT_VAL, nombre: 'Mass assignment en el registro (id, isAdmin, rol)', tipo: 'negativo',
    objetivo: 'Comprobar que no se pueden fijar campos internos al registrarse',
    esperado: 'Campos extra rechazados (400) o ignorados: el id no es el enviado y no aparece isAdmin/rol', severidadSiFalla: 'Alta',
  },
  async () => {
    const idFalso = '11111111-1111-4111-8111-111111111111';
    const email = nuevoEmail('mass');
    pendientes.push({ email, password: PASSWORD });
    const r = await peticion('POST', '/auth/register', { body: { nombre: 'Mass', email, password: PASSWORD, id: idFalso, isAdmin: true, rol: 'admin' } });
    const ignorado = r.status === 201 && r.body.id !== idFalso && !('isAdmin' in r.body) && !('rol' in r.body);
    const rechazado = r.status === 400;
    return {
      ok: ignorado || rechazado,
      obtenido: rechazado ? `HTTP 400 ${JSON.stringify(r.body.message)}` : `HTTP ${r.status}: campos extra eliminados silenciosamente (whitelist sin forbidNonWhitelisted); id asignado por el servidor=${r.body.id !== idFalso}`,
      hallazgo: ignorado
        ? { descripcion: 'El ValidationPipe usa whitelist:true sin forbidNonWhitelisted: los campos no permitidos se eliminan en silencio (mass assignment mitigado) en vez de rechazarse con 400; el mensaje traducido "El campo X no está permitido" nunca se muestra.', severidad: 'Informativa', recomendacion: 'Activar forbidNonWhitelisted: true para rechazar explícitamente campos desconocidos y detectar clientes maliciosos o desactualizados.' }
        : undefined,
    };
  },
);

caso(
  {
    id: 'SEG-VAL-02', categoria: CAT_VAL, nombre: 'Mass assignment de liderId/miembros al crear equipo', tipo: 'negativo',
    objetivo: 'Impedir crear un equipo asignando otro líder o miembros arbitrarios',
    esperado: 'El líder es siempre el creador y los miembros extra se ignoran (o 400)', severidadSiFalla: 'Alta',
  },
  async () => {
    const r = await peticion('POST', '/equipos', { token: F.B.token, body: { nombre: 'Equipo mass', liderId: F.A.id, miembros: [{ id: F.A.id }] } });
    const ok = r.status === 400 || (r.status === 201 && r.body.liderId === F.B.id && !r.body.miembros.some((m) => m.id === F.A.id));
    if (r.body?.id) await peticion('DELETE', `/equipos/${r.body.id}`, { token: F.B.token });
    return { ok, obtenido: `HTTP ${r.status}; liderId = ${r.body?.liderId === F.B.id ? 'creador (B)' : r.body?.liderId}; A incluido como miembro: ${r.body?.miembros?.some((m) => m.id === F.A.id) ? 'SÍ' : 'no'}` };
  },
);

caso(
  {
    id: 'SEG-VAL-03', categoria: CAT_VAL, nombre: 'Mass assignment en PATCH /tareas/:id (listaId, id, estado)', tipo: 'negativo',
    objetivo: 'Evitar que la edición de título cambie campos no editables (p. ej. mover la tarea a otro proyecto)',
    esperado: 'Solo cambia el título; listaId e id se mantienen', severidadSiFalla: 'Alta',
  },
  async () => {
    const t = (await peticion('POST', '/tareas', { token: F.A.token, body: { titulo: 'Original', listaId: F.listasA1[0].id } })).body;
    const r = await peticion('PATCH', `/tareas/${t.id}`, { token: F.A.token, body: { titulo: 'Editada', listaId: F.listasA2[0].id, id: uuidInexistente, estado: 'hecho' } });
    const ok = (r.status === 200 && r.body.titulo === 'Editada' && r.body.listaId === F.listasA1[0].id && r.body.id === t.id && r.body.estado === 'pendiente') || r.status === 400;
    return { ok, obtenido: `HTTP ${r.status}; titulo=${r.body?.titulo}; listaId sin cambios=${r.body?.listaId === F.listasA1[0].id}; estado=${r.body?.estado}` };
  },
);

caso(
  {
    id: 'SEG-VAL-04', categoria: CAT_VAL, nombre: 'Cadenas que superan la longitud máxima son rechazadas', tipo: 'negativo',
    objetivo: 'Verificar MaxLength en los DTO (evita errores de BD y abuso de almacenamiento)',
    esperado: 'HTTP 400 con mensaje en español para nombre/título de 256, descripción de 5001 y contraseña de 73 caracteres', severidadSiFalla: 'Media',
  },
  async () => {
    const x = (n) => 'x'.repeat(n);
    const pares = [
      ['equipo.nombre 256', await peticion('POST', '/equipos', { token: F.A.token, body: { nombre: x(256) } })],
      ['proyecto.nombre 256', await peticion('POST', '/proyectos', { token: F.A.token, body: { nombre: x(256), equipoId: F.equipoA.id } })],
      ['tarea.titulo 256', await peticion('POST', '/tareas', { token: F.A.token, body: { titulo: x(256), listaId: F.listasA1[0].id } })],
      ['tarea.descripcion 5001', await peticion('POST', '/tareas', { token: F.A.token, body: { titulo: 'ok', descripcion: x(5001), listaId: F.listasA1[0].id } })],
      ['usuario.nombre 256', await peticion('PATCH', '/usuarios/me', { token: F.C.token, body: { nombre: x(256) } })],
      ['register.password 73', await peticion('POST', '/auth/register', { body: { nombre: 'x', email: nuevoEmail('largo'), password: x(73) } })],
    ];
    const limite = await peticion('POST', '/equipos', { token: F.A.token, body: { nombre: x(255) } });
    if (limite.body?.id) await peticion('DELETE', `/equipos/${limite.body.id}`, { token: F.A.token });
    const ok = pares.every(([, r]) => r.status === 400) && limite.status === 201;
    return { ok, obtenido: `${fmt(pares)}; límite exacto (255) → ${limite.status}; ej. mensaje: ${JSON.stringify(pares[0][1].body?.message)}` };
  },
);

caso(
  {
    id: 'SEG-VAL-05', categoria: CAT_VAL, nombre: 'Identificadores con formato inválido son rechazados (ParseUUIDPipe)', tipo: 'negativo',
    objetivo: 'Evitar errores de BD/500 y sondeos con ids arbitrarios',
    esperado: 'HTTP 400 en todas las rutas con :id o ?id no UUID', severidadSiFalla: 'Media',
  },
  async () => {
    const pares = [];
    for (const [m, r, b] of [
      ['GET', '/equipos/123'], ['GET', '/equipos/abc/miembros'], ['DELETE', '/equipos/1;DROP'], ['GET', '/proyectos/1%27%20OR%201=1'],
      ['GET', '/listas/proyecto/not-a-uuid'], ['PATCH', '/tareas/xyz', { titulo: 'a' }], ['PATCH', `/tareas/${F.tareaA.id}/mover`, { nuevaListaId: 'abc' }],
      ['PATCH', `/tareas/${F.tareaA.id}/asignar`, { miembros: ['no-uuid'] }], ['POST', `/equipos/${F.equipoA.id}/miembros`, { userId: '42' }],
    ]) pares.push([`${m} ${r}`, await peticion(m, r, { token: F.A.token, body: b })]);
    const malos = pares.filter(([, r]) => r.status !== 400 && r.status !== 404);
    return { ok: pares.filter(([, r]) => r.status === 400).length >= pares.length - 1 && malos.length === 0, obtenido: fmt(pares) };
  },
);

caso(
  {
    id: 'SEG-VAL-06', categoria: 'OWASP API4:2023 Unrestricted Resource Consumption', nombre: 'Cuerpos de petición muy grandes son rechazados', tipo: 'negativo',
    objetivo: 'Verificar el límite de tamaño del body (por defecto 100 KB en body-parser)',
    esperado: 'HTTP 413 Payload Too Large con un body de ~1 MB', severidadSiFalla: 'Media',
  },
  async () => {
    const r = await peticion('POST', '/tareas', { token: F.A.token, body: { titulo: 'grande', descripcion: 'x'.repeat(1024 * 1024), listaId: F.listasA1[0].id } });
    const r2 = await peticion('POST', '/auth/login', { body: { email: nuevoEmail('grande'), password: 'p'.repeat(200 * 1024) } });
    return { ok: r.status === 413 && r2.status === 413, obtenido: `POST /tareas 1 MB → ${r.status}; POST /auth/login 200 KB → ${r2.status}` };
  },
);

// ============================================================ CONFIGURACIÓN
const CAT_CONF = 'OWASP A05:2021 Security Misconfiguration / API8:2023 Security Misconfiguration';

caso(
  {
    id: 'SEG-CONF-01', categoria: CAT_CONF, nombre: 'Cabeceras de seguridad HTTP (helmet) presentes', tipo: 'positivo',
    objetivo: 'Verificar CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, COOP/CORP',
    esperado: 'Todas las cabeceras presentes en respuestas autenticadas y de error', severidadSiFalla: 'Media',
  },
  async () => {
    const r = await peticion('GET', '/equipos', { token: F.A.token });
    const e = await peticion('GET', '/no-existe');
    const req = ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy'];
    const faltan = req.filter((h) => !r.headers[h] || !e.headers[h]);
    return { ok: faltan.length === 0, obtenido: faltan.length ? `Faltan: ${faltan.join(', ')}` : req.map((h) => `${h}: ${r.headers[h]}`).join(' | ') };
  },
);

caso(
  {
    id: 'SEG-CONF-02', categoria: CAT_CONF, nombre: 'X-Powered-By ausente (no se revela el framework)', tipo: 'positivo',
    objetivo: 'Reducir el fingerprinting del servidor', esperado: 'Sin cabecera X-Powered-By ni Server', severidadSiFalla: 'Baja',
  },
  async () => {
    const r = await peticion('GET', '/equipos', { token: F.A.token });
    return { ok: !r.headers['x-powered-by'] && !r.headers.server, obtenido: `x-powered-by=${r.headers['x-powered-by'] ?? 'ausente'}; server=${r.headers.server ?? 'ausente'}` };
  },
);

caso(
  {
    id: 'SEG-CONF-03', categoria: CAT_CONF, nombre: 'CORS rechaza orígenes no autorizados', tipo: 'negativo',
    objetivo: 'Impedir que webs de terceros lean respuestas de la API desde el navegador',
    esperado: 'Preflight y GET desde http://evil.example sin Access-Control-Allow-Origin', severidadSiFalla: 'Alta',
  },
  async () => {
    const p = await peticion('OPTIONS', '/equipos', { headers: { origin: 'http://evil.example', 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' } });
    const g = await peticion('GET', '/equipos', { token: F.A.token, headers: { origin: 'http://evil.example' } });
    const n = await peticion('GET', '/equipos', { token: F.A.token, headers: { origin: 'null' } });
    const ok = !p.headers['access-control-allow-origin'] && !g.headers['access-control-allow-origin'] && !n.headers['access-control-allow-origin'];
    return { ok, obtenido: `preflight evil → ACAO=${p.headers['access-control-allow-origin'] ?? 'ausente'}; GET evil → ACAO=${g.headers['access-control-allow-origin'] ?? 'ausente'}; Origin null → ACAO=${n.headers['access-control-allow-origin'] ?? 'ausente'}` };
  },
);

caso(
  {
    id: 'SEG-CONF-04', categoria: CAT_CONF, nombre: 'CORS permite el frontend legítimo (http://localhost:5173)', tipo: 'positivo',
    objetivo: 'Confirmar que la restricción CORS no rompe el frontend',
    esperado: 'Preflight 204 con Access-Control-Allow-Origin: http://localhost:5173', severidadSiFalla: 'Media',
  },
  async () => {
    const p = await peticion('OPTIONS', '/equipos', { headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type' } });
    return { ok: p.status === 204 && p.headers['access-control-allow-origin'] === 'http://localhost:5173', obtenido: `HTTP ${p.status}; ACAO=${p.headers['access-control-allow-origin']}; métodos=${p.headers['access-control-allow-methods']}` };
  },
);

caso(
  {
    id: 'SEG-CONF-05', categoria: CAT_CONF, nombre: 'Las respuestas de error no filtran trazas ni detalles internos', tipo: 'negativo',
    objetivo: 'Verificar que 400/404/500 no exponen stack traces, rutas de ficheros, SQL ni versiones',
    esperado: 'Ningún cuerpo de error contiene "stack", "at ", rutas .ts/.js, "QueryFailedError" ni "SELECT"', severidadSiFalla: 'Media',
  },
  async () => {
    const v = await registrarYLoguear('errores');
    const res = [
      await peticion('POST', '/equipos', { token: F.A.token, cuerpoCrudo: '{"nombre": "x",,}' }),
      await peticion('GET', '/ruta/inexistente'),
      await peticion('GET', `/equipos/${uuidInexistente}`, { token: F.A.token }),
      await peticion('POST', '/auth/login', { body: { email: v.email, password: { a: 1 } } }), // provoca 500
    ];
    const patron = /stack|\bat\s+\w+.*\(|[A-Z]:\\|\/src\/|\.ts:\d+|node_modules|QueryFailedError|SELECT\s|typeorm/i;
    const fugas = res.filter((r) => patron.test(r.texto));
    return { ok: fugas.length === 0, obtenido: `${res.map((r) => `${r.status} ${r.texto.slice(0, 90)}`).join(' | ')}` };
  },
);

caso(
  {
    id: 'SEG-CONF-06', categoria: CAT_CONF, nombre: 'El frontend define Content-Security-Policy', tipo: 'negativo',
    objetivo: 'Mitigar XSS en el cliente (el JWT se guarda en localStorage y sería robable ante un XSS)',
    esperado: 'Cabecera Content-Security-Policy o <meta http-equiv="Content-Security-Policy"> en el index.html del frontend', severidadSiFalla: 'Baja',
  },
  async () => {
    let cab = null;
    let meta = false;
    try {
      const r = await fetch(FRONTEND_URL);
      cab = r.headers.get('content-security-policy');
      meta = /http-equiv=["']Content-Security-Policy/i.test(await r.text());
    } catch (e) {
      return { ok: false, obtenido: `Frontend no accesible en ${FRONTEND_URL}: ${e.message}` };
    }
    const almacenamiento = buscarEnFrontend(/localStorage\.setItem\(\s*['"]access_token/);
    return {
      ok: Boolean(cab || meta),
      obtenido: `CSP cabecera=${cab ?? 'ausente'}; meta CSP=${meta ? 'sí' : 'no'}; token guardado en localStorage en: ${almacenamiento.join(', ') || 'no detectado'}`,
      hallazgo: !(cab || meta)
        ? { descripcion: `El frontend no define CSP y guarda el JWT en localStorage (${almacenamiento.join(', ')}); ante cualquier XSS el token (válido 24 h y sin revocación) podría ser exfiltrado.`, severidad: 'Baja', recomendacion: 'Servir el build con CSP estricta (script-src \'self\'; connect-src a la API) desde el servidor web/proxy y valorar cookies HttpOnly+SameSite para el token.' }
        : undefined,
    };
  },
);

caso(
  {
    id: 'SEG-CONF-07', categoria: 'OWASP A05:2021 Security Misconfiguration / A02:2021 (gestión de secretos)', nombre: 'Secretos fuera del control de versiones y JWT_SECRET robusto', tipo: 'negativo',
    objetivo: 'Verificar que .env no está versionado y que el secreto JWT tiene entropía suficiente',
    esperado: '.env ignorado y NO rastreado por git; JWT_SECRET ≥ 32 caracteres', severidadSiFalla: 'Alta',
  },
  async () => {
    const git = (args) => spawnSync('git', ['-C', RAIZ_REPO, ...args], { encoding: 'utf8' });
    const rastreado = git(['ls-files', '--error-unmatch', '.env']).status === 0;
    const enHistoria = git(['log', '--oneline', '--', '.env']).stdout.trim().split('\n').filter(Boolean).length;
    const modificado = git(['status', '--porcelain', '--', '.env']).stdout.trim();
    const secreto = jwt.leerSecretoLocal() || '';
    const ok = !rastreado && secreto.length >= 32;
    const salida = `git ls-files --error-unmatch .env → ${rastreado ? 'rastreado' : 'no rastreado'}\ngit log -- .env → ${enHistoria} commit(s)\ngit status -- .env → "${modificado}"\nlongitud JWT_SECRET local = ${secreto.length}\n`;
    fs.writeFileSync(path.join(RAIZ_EVIDENCIAS, 'git-secretos.txt'), salida);
    return {
      ok,
      obtenido: `.env rastreado por git: ${rastreado ? 'SÍ' : 'no'} (aparece en ${enHistoria} commit(s); estado actual "${modificado || 'sin cambios'}"); longitud JWT_SECRET=${secreto.length}`,
      hallazgo: rastreado
        ? { descripcion: 'El fichero .env sigue rastreado por git aunque ahora figura en .gitignore (añadir a .gitignore no des-rastrea ficheros ya versionados). El historial contiene un .env anterior con secretos, y el próximo commit publicaría el JWT_SECRET actual y la contraseña de PostgreSQL.', severidad: 'Alta', recomendacion: 'Ejecutar "git rm --cached .env", rotar JWT_SECRET y la contraseña de la BD, y purgar el historial (git filter-repo/BFG) si el repositorio es público. Añadir un escáner de secretos (gitleaks) al pipeline de Jenkins.' }
        : undefined,
    };
  },
);

// ============================================================ DEPENDENCIAS
const CAT_DEP = 'OWASP A06:2021 Vulnerable and Outdated Components';

function auditar(dir, nombreArchivo, extra = []) {
  const r = spawnSync('npm', ['audit', '--json', ...extra], { cwd: dir, encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(RAIZ_EVIDENCIAS, nombreArchivo), r.stdout);
  const a = JSON.parse(r.stdout);
  const altas = Object.entries(a.vulnerabilities || {})
    .filter(([, v]) => v.severity === 'high' || v.severity === 'critical')
    .map(([k, v]) => `${k} (${v.severity}${v.isDirect ? ', directa' : ''})`);
  return { meta: a.metadata.vulnerabilities, altas };
}
const fmtVul = (m) => `crítica=${m.critical}, alta=${m.high}, moderada=${m.moderate}, baja=${m.low} (total ${m.total})`;

caso(
  {
    id: 'SEG-DEP-01', categoria: CAT_DEP, nombre: 'Dependencias de producción del backend sin vulnerabilidades críticas/altas', tipo: 'negativo',
    objetivo: 'Analizar con npm audit --omit=dev las dependencias que se despliegan',
    esperado: '0 vulnerabilidades críticas y 0 altas', severidadSiFalla: 'Alta',
  },
  async () => {
    const { meta, altas } = auditar(RAIZ_REPO, 'npm-audit-backend-prod.json', ['--omit=dev']);
    return {
      ok: meta.critical === 0 && meta.high === 0,
      obtenido: `${fmtVul(meta)}. Críticas/altas: ${altas.join(', ')}`,
      extra: meta,
      hallazgo: meta.critical + meta.high > 0
        ? { descripcion: `npm audit (producción) del backend reporta ${fmtVul(meta)}; entre ellas ${altas.slice(0, 6).join(', ')}.`, severidad: meta.critical ? 'Alta' : 'Media', recomendacion: 'Actualizar NestJS 10→11 (@nestjs/platform-express, express 5), bcrypt ≥ 6 (elimina node-pre-gyp/tar), passport-jwt/jws; ejecutar npm audit fix y revisar breaking changes; añadir npm audit / Dependabot al pipeline.' }
        : undefined,
    };
  },
);

caso(
  {
    id: 'SEG-DEP-02', categoria: CAT_DEP, nombre: 'Árbol completo del backend (incl. desarrollo) — npm audit', tipo: 'negativo',
    objetivo: 'Cuantificar el riesgo de la cadena de suministro en el entorno de desarrollo/CI',
    esperado: '0 vulnerabilidades críticas', severidadSiFalla: 'Media',
  },
  async () => {
    const { meta } = auditar(RAIZ_REPO, 'npm-audit-backend.json');
    return {
      ok: meta.critical === 0,
      obtenido: fmtVul(meta),
      extra: meta,
      hallazgo: meta.critical > 0
        ? { descripcion: `El árbol completo del backend (incluidas devDependencies: @nestjs/cli, jest, typeorm CLI…) reporta ${fmtVul(meta)}. Afecta al entorno de desarrollo y al agente de CI (Jenkins), no al runtime desplegado.`, severidad: 'Media', recomendacion: 'Actualizar @nestjs/cli/@nestjs/schematics a la v11, jest/ts-jest a la última versión y ejecutar npm audit en el pipeline con umbral (--audit-level=high).' }
        : undefined,
    };
  },
);

caso(
  {
    id: 'SEG-DEP-03', categoria: CAT_DEP, nombre: 'Dependencias del frontend — npm audit', tipo: 'negativo',
    objetivo: 'Analizar las dependencias de taskflow-frontend', esperado: '0 vulnerabilidades críticas y 0 altas', severidadSiFalla: 'Media',
  },
  async () => {
    const { meta, altas } = auditar(path.join(RAIZ_REPO, 'taskflow-frontend'), 'npm-audit-frontend.json');
    return {
      ok: meta.critical === 0 && meta.high === 0,
      obtenido: `${fmtVul(meta)}${altas.length ? '. Críticas/altas: ' + altas.join(', ') : ''}`,
      extra: meta,
      hallazgo: meta.critical + meta.high > 0
        ? { descripcion: `npm audit del frontend reporta ${fmtVul(meta)} (${altas.join(', ')}).`, severidad: 'Baja', recomendacion: 'Ejecutar npm audit fix en taskflow-frontend y actualizar los paquetes señalados (afectan principalmente a la cadena de build/desarrollo).' }
        : undefined,
    };
  },
);
