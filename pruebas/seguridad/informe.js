'use strict';
// Genera informe.md a partir de resumen.json (los datos vienen de la ejecución real).

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const NOMBRES = { AUTH: 'Autenticación', AUTHZ: 'Autorización (BOLA/BFLA)', DATA: 'Exposición de datos', INY: 'Inyección', VAL: 'Validación / mass assignment', CONF: 'Configuración', DEP: 'Dependencias' };

module.exports = function informe(r) {
  const est = (id) => r.casos.find((c) => c.id === id)?.estado;
  const ok = (id) => est(id) === 'Aprobado';
  const sev = r.hallazgos.reduce((a, h) => ((a[h.severidad] = (a[h.severidad] || 0) + 1), a), {});
  const L = [];
  L.push('# Informe de pruebas de seguridad — TaskFlow API', '');
  L.push(`- **Fecha de ejecución:** ${r.fecha}`);
  L.push(`- **Herramienta:** ${r.herramienta}`);
  L.push(`- **Comando:** \`${r.comando}\``);
  L.push(`- **Condiciones:** ${r.condiciones}`);
  L.push(`- **Resultado global:** ${r.totales.aprobados}/${r.totales.total} casos aprobados (${r.totales.fallidos} fallidos) · ${r.hallazgos.length} hallazgos (${Object.entries(sev).map(([k, v]) => `${k}: ${v}`).join(', ')})`, '');

  L.push('## 1. Objetivo y alcance', '');
  L.push('Evaluar los controles de seguridad de la API REST de TaskFlow (NestJS + PostgreSQL) mediante pruebas de caja negra automatizadas contra el backend en ejecución, complementadas con revisión del código fuente, verificación de solo lectura en la base de datos y análisis de dependencias (`npm audit`). Cada caso está mapeado a OWASP Top 10 2021 y OWASP API Security Top 10 2023 e incluye casos positivos (el uso legítimo funciona) y negativos (el ataque es bloqueado).', '');
  L.push('Controles verificados: guard JWT, firma/algoritmo/expiración del token, bloqueo por fuerza bruta (5 intentos → 429 durante 15 min), mensajes genéricos de login, autorización por pertenencia al equipo y por rol de líder, `select:false` + bcrypt para contraseñas, ValidationPipe (whitelist, MaxLength, IsUUID), ParseUUIDPipe, consultas parametrizadas de TypeORM, helmet, CORS restringido y gestión de secretos.', '');

  L.push('## 2. Resumen por categoría', '');
  L.push('| Categoría | Casos | Aprobados | Fallidos |', '|---|---:|---:|---:|');
  for (const [k, v] of Object.entries(r.porCategoria)) L.push(`| ${NOMBRES[k] || k} | ${v.total} | ${v.aprobados} | ${v.fallidos} |`);
  L.push(`| **Total** | **${r.totales.total}** | **${r.totales.aprobados}** | **${r.totales.fallidos}** |`, '');

  L.push('## 3. Casos de prueba', '');
  L.push('Evidencia por caso: `http/<ID>.json` (peticiones y respuestas completas, con tiempos y cabeceras; los tokens aparecen recortados). Salida del runner: `salida-node-test.txt` y `junit.xml`.', '');
  L.push('| ID | Categoría OWASP | Caso | Tipo | Objetivo | Resultado esperado | Resultado obtenido | Estado |', '|---|---|---|---|---|---|---|---|');
  for (const c of r.casos) {
    const estado = c.estado === 'Aprobado' ? '✅ Aprobado' : `❌ Fallido (${c.severidad})`;
    L.push(`| ${c.id} | ${esc(c.categoria)} | ${esc(c.nombre)} | ${c.tipo} | ${esc(c.objetivo)} | ${esc(c.esperado)} | ${esc(c.obtenido)} | ${estado}${c.hallazgoId ? ` → ${c.hallazgoId}` : ''} |`);
  }
  L.push('');

  L.push('## 4. Hallazgos y mejoras propuestas', '');
  L.push('| ID | Severidad | Origen | Descripción | Recomendación |', '|---|---|---|---|---|');
  for (const h of r.hallazgos) L.push(`| ${h.id} | ${h.severidad} | ${h.origen} | ${esc(h.descripcion)} | ${esc(h.recomendacion)} |`);
  L.push('');
  L.push('Escala de severidad: **Crítica** (compromiso directo de cuentas/datos), **Alta** (explotable con impacto relevante), **Media** (debilita un control o provoca errores no controlados), **Baja** (defensa en profundidad), **Informativa** (buena práctica).', '');

  L.push('## 5. Interpretación de resultados', '');
  const auth = ['SEG-AUTH-01', 'SEG-AUTH-03', 'SEG-AUTH-04', 'SEG-AUTH-05', 'SEG-AUTH-06', 'SEG-AUTH-07'].every(ok);
  L.push(`- **Autenticación:** ${auth ? 'el guard JWT es sólido: todas las rutas protegidas exigen token y se rechazan tokens con firma alterada, payload manipulado, `alg: none`, secretos adivinados y tokens caducados.' : 'se detectaron fallos en la validación del token (ver tabla).'} ${ok('SEG-AUTH-09') ? 'El bloqueo por fuerza bruta funciona: el 6.º intento devuelve 429 incluso con la contraseña correcta, sin afectar a otras cuentas.' : 'El bloqueo por fuerza bruta NO se comportó como se esperaba.'} ${ok('SEG-AUTH-11') ? 'El mensaje de error del login es idéntico para usuario inexistente y contraseña incorrecta.' : ''} ${!ok('SEG-AUTH-12') ? 'Sin embargo, el **tiempo** de respuesta sí permite distinguir cuentas existentes (bcrypt solo se ejecuta si el usuario existe).' : 'El tiempo de respuesta tampoco distingue cuentas existentes (bcrypt.compare se ejecuta siempre, con un hash ficticio si el correo no existe).'} ${!ok('SEG-AUTH-13') ? 'El limitador es por correo, no por IP, por lo que no frena el *password spraying*.' : ''} ${!ok('SEG-AUTH-15') ? 'La política de contraseñas admite contraseñas triviales.' : 'La política de contraseñas (mínimo 8 caracteres con al menos una letra y un número) rechaza contraseñas triviales como "123456", "password" o "aaaaaa".'} ${ok('SEG-AUTH-14') ? 'El token de una cuenta eliminada devuelve 401.' : ''}`);
  const authz = r.casos.filter((c) => c.id.startsWith('SEG-AUTHZ')).every((c) => c.estado === 'Aprobado');
  L.push(`- **Autorización:** ${authz ? 'no se encontraron BOLA/IDOR: un usuario ajeno recibe 403 en lectura y escritura sobre equipos, proyectos, listas y tareas de otros, los datos quedan intactos, las acciones de líder están protegidas (403 para miembros) y la expulsión de un miembro revoca el acceso de inmediato porque la autorización se calcula en cada petición.' : 'hay casos de autorización fallidos (ver tabla).'} Un detalle menor: los recursos inexistentes devuelven 404 y los ajenos 403, lo que permite saber si un UUID existe (impacto bajo al ser UUID v4 no adivinables).`);
  L.push(`- **Exposición de datos:** ${ok('SEG-DATA-01') ? 'ninguna de las respuestas analizadas en toda la ejecución contiene la contraseña ni el hash' : 'se detectó exposición de contraseña'}; ${ok('SEG-DATA-02') ? 'en la BD las contraseñas están almacenadas con bcrypt `$2b$10$` (60 caracteres).' : 'no se pudo confirmar el hashing en BD.'} ${!ok('SEG-DATA-03') ? 'La búsqueda `GET /usuarios?email=` y el 409 del registro permiten enumerar correos registrados.' : ''}`);
  L.push(`- **Inyección:** ${['SEG-INY-01', 'SEG-INY-02', 'SEG-INY-03'].every(ok) ? 'los payloads SQLi no alteran las consultas (TypeORM usa parámetros `:email`) y se almacenan como texto literal.' : 'revisar los casos de inyección fallidos.'} ${ok('SEG-INY-06') ? 'El XSS almacenado se devuelve como dato JSON y React lo escapa al renderizar (no hay `dangerouslySetInnerHTML`).' : ''} ${!ok('SEG-INY-05') ? '**Defecto real:** enviar un objeto/array/número como `password` en el login provoca **HTTP 500** porque `LoginDto.password` no tiene `@IsString()` y `bcrypt.compare` lanza una excepción; además esos intentos no cuentan para el bloqueo.' : ''}`);
  L.push(`- **Validación:** ${ok('SEG-VAL-04') && ok('SEG-VAL-05') ? 'los límites de longitud (255/5000/72) y el formato UUID se validan con mensajes en español.' : 'hay validaciones que no se cumplen.'} El ValidationPipe **elimina** silenciosamente los campos no permitidos (whitelist) en lugar de rechazarlos con 400, lo que mitiga el *mass assignment* (no se pudo fijar id, liderId, listaId ni estado) pero oculta peticiones manipuladas. ${ok('SEG-VAL-06') ? 'Los cuerpos > 100 KB se rechazan con 413.' : ''}`);
  L.push(`- **Configuración:** ${ok('SEG-CONF-01') && ok('SEG-CONF-02') ? 'helmet aplica CSP, HSTS, nosniff, X-Frame-Options y Referrer-Policy, y no se envía X-Powered-By.' : ''} ${ok('SEG-CONF-03') && ok('SEG-CONF-04') ? 'CORS solo autoriza a http://localhost:5173.' : ''} ${ok('SEG-CONF-05') ? 'Los errores (incluido el 500) no filtran trazas.' : ''} ${!ok('SEG-CONF-07') ? '**El fichero `.env` sigue versionado en git**, por lo que los secretos acabarían en el repositorio.' : 'El fichero `.env` está ignorado y fuera del índice de git (ver `git-secretos.txt`; si estuvo versionado antes, el historial conserva los secretos y conviene rotarlos).'} ${!ok('SEG-CONF-06') ? 'El frontend (servidor de desarrollo Vite) no define CSP y guarda el JWT en localStorage.' : ''}`);
  L.push(`- **Dependencias:** ${r.casos.filter((c) => c.id.startsWith('SEG-DEP')).map((c) => `${c.id} (${c.estado}) → ${c.obtenido}`).join(' · ')}. Las vulnerabilidades restantes del backend proceden sobre todo de NestJS 10/Express 4 (@nestjs/platform-express, multer, lodash…), cuya corrección requiere actualizar NestJS a una versión mayor; las pruebas no modifican dependencias.`, '');

  L.push('## 6. Conclusión', '');
  L.push(`Los controles centrales (autenticación JWT, autorización por equipo/rol, hashing, validación e inyección) son efectivos frente a los ataques probados. ${(() => { const f = r.casos.filter((c) => c.estado !== 'Aprobado'); return f.length ? `Quedan ${f.length} caso(s) no superado(s), que se documentan como hallazgos/recomendaciones: ${f.map((c) => `${c.id} (${c.nombre})`).join('; ')}.` : 'Todos los casos se superaron en esta ejecución.'; })()} Se recomienda priorizar los hallazgos de severidad Alta y Media de la sección 4.`, '');

  L.push('## 7. Evidencias', '');
  L.push('- `resumen.json` — resumen estructurado (generado automáticamente).');
  L.push('- `salida-node-test.txt`, `junit.xml` — salida del runner `node --test`.');
  L.push('- `http/SEG-*.json` — intercambio HTTP completo de cada caso.');
  L.push('- `npm-audit-backend-prod.json`, `npm-audit-backend.json`, `npm-audit-frontend.json` — salida de `npm audit --json`.');
  L.push('- `psql-hash.txt` — consulta de solo lectura que verifica el hash bcrypt.');
  L.push('- `git-secretos.txt` — verificación de versionado de `.env`.', '');
  L.push('Reproducir: `cd pruebas/seguridad && npm test` (requiere backend en http://localhost:3000 y frontend en http://localhost:5173).');
  return L.join('\n') + '\n';
};
