'use strict';
/**
 * Ejecuta la suite de seguridad (node --test) y genera la evidencia:
 *   pruebas/evidencias/seguridad/salida-node-test.txt   (salida del runner)
 *   pruebas/evidencias/seguridad/junit.xml              (reporte JUnit)
 *   pruebas/evidencias/seguridad/resumen.json           (resumen estructurado)
 *   pruebas/evidencias/seguridad/informe.md             (informe con interpretación)
 * Los campos "obtenido" y "estado" provienen de la ejecución real.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const DIR = path.resolve(__dirname, '..', 'evidencias', 'seguridad');
fs.mkdirSync(DIR, { recursive: true });
fs.rmSync(path.join(DIR, 'http'), { recursive: true, force: true });
fs.rmSync(path.join(DIR, 'casos-ejecutados.json'), { force: true });

const args = [
  '--test',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=junit', `--test-reporter-destination=${path.join(DIR, 'junit.xml')}`,
  'seguridad.test.js',
];
const comando = `node ${args.join(' ').replace(DIR + path.sep, '../evidencias/seguridad/')}`;
const inicio = new Date();
console.log(`> ${comando}\n`);
const r = spawnSync(process.execPath, args, { cwd: __dirname, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const salida = (r.stdout || '') + (r.stderr || '');
process.stdout.write(salida);
fs.writeFileSync(path.join(DIR, 'salida-node-test.txt'), `$ ${comando}\n# ${inicio.toISOString()}\n\n${salida}`);

const archivoCasos = path.join(DIR, 'casos-ejecutados.json');
if (!fs.existsSync(archivoCasos)) {
  console.error('No se generó casos-ejecutados.json: la suite no llegó a ejecutarse (¿backend levantado?).');
  process.exit(1);
}
const casos = JSON.parse(fs.readFileSync(archivoCasos, 'utf8'));

// ---------------------------------------------------------------- Hallazgos
const ORDEN = { Crítica: 0, Alta: 1, Media: 2, Baja: 3, Informativa: 4 };
const hallazgos = [];
for (const c of casos) {
  if (c.hallazgo) hallazgos.push({ ...c.hallazgo, origen: c.id });
  else if (c.estado === 'Fallido') {
    hallazgos.push({ descripcion: `${c.nombre}: ${c.obtenido}`, severidad: c.severidad, recomendacion: 'Revisar el control asociado al caso.', origen: c.id });
  }
}
// Hallazgos de revisión de código (no detectables por caja negra)
const revision = [
  {
    descripcion: 'No existe revocación de tokens ni refresh tokens: el JWT vale 24 h y "cerrar sesión" solo lo borra del navegador; un token robado sigue siendo válido hasta su expiración.',
    severidad: 'Media',
    recomendacion: 'Access token corto (10-15 min) + refresh token rotativo en cookie HttpOnly; lista de revocación (jti) en Redis al hacer logout o cambiar contraseña.',
  },
  {
    descripcion: 'El limitador de intentos es en memoria (Map): se reinicia al reiniciar el proceso y no se comparte entre instancias; no avisa al usuario de bloqueos.',
    severidad: 'Baja',
    recomendacion: 'Persistir contadores en Redis, notificar por correo los bloqueos y registrar el evento.',
  },
  {
    descripcion: 'No hay registro (logging/auditoría) de eventos de seguridad: logins fallidos, bloqueos, 403 o borrados no quedan trazados (OWASP A09:2021).',
    severidad: 'Baja',
    recomendacion: 'Logger estructurado (pino/winston) con eventos de seguridad, correlación por request-id y alertas sobre picos de 401/403/429.',
  },
  {
    descripcion: 'La API se sirve por HTTP en local; la cabecera HSTS solo tiene efecto sobre HTTPS y el JWT viaja en claro.',
    severidad: 'Informativa',
    recomendacion: 'En producción terminar TLS en un proxy (nginx/Traefik) o en NestJS (httpsOptions) y redirigir HTTP→HTTPS.',
  },
  {
    descripcion: 'TypeORM usa synchronize:true salvo que NODE_ENV=production: un despliegue con NODE_ENV mal configurado podría alterar el esquema de la BD automáticamente.',
    severidad: 'Baja',
    recomendacion: 'Usar migraciones versionadas y synchronize:false por defecto.',
  },
];
for (const h of revision) hallazgos.push({ ...h, origen: 'Revisión de código' });
hallazgos.sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad]);
hallazgos.forEach((h, i) => (h.id = `H-${String(i + 1).padStart(2, '0')}`));

// Hallazgo → casos (referencia cruzada)
for (const c of casos) {
  const h = hallazgos.find((x) => x.origen === c.id);
  if (h) c.hallazgoId = h.id;
  if (h && c.estado === 'Aprobado') c.severidad = h.severidad; // control OK pero con observación
  delete c.hallazgo;
}

const aprobados = casos.filter((c) => c.estado === 'Aprobado').length;
const resumen = {
  area: 'Seguridad',
  herramienta: `Node.js ${process.version} test runner (node:test) + fetch nativo; npm ${spawnSync('npm', ['-v'], { encoding: 'utf8', shell: true }).stdout.trim()} audit; psql (PostgreSQL 18) para verificación de solo lectura`,
  comando: 'cd pruebas/seguridad && npm test   (equivale a: node run.js → node --test seguridad.test.js)',
  fecha: inicio.toISOString(),
  condiciones: `API ${process.env.API_URL || 'http://localhost:3000'} (NestJS en modo desarrollo, PostgreSQL 18 local), frontend http://localhost:5173; ${os.type()} ${os.release()} ${os.arch()}, ${os.cpus()[0].model.trim()} (${os.cpus().length} hilos), ${(os.totalmem() / 1024 ** 3).toFixed(1)} GB RAM; pruebas de caja negra con usuarios y datos únicos por ejecución (eliminados al finalizar).`,
  totales: { total: casos.length, aprobados, fallidos: casos.length - aprobados },
  porCategoria: Object.entries(
    casos.reduce((acc, c) => {
      const k = c.id.split('-')[1];
      acc[k] = acc[k] || { total: 0, aprobados: 0, fallidos: 0 };
      acc[k].total++;
      acc[k][c.estado === 'Aprobado' ? 'aprobados' : 'fallidos']++;
      return acc;
    }, {}),
  ).reduce((o, [k, v]) => ({ ...o, [k]: v }), {}),
  casos,
  hallazgos,
};
fs.writeFileSync(path.join(DIR, 'resumen.json'), JSON.stringify(resumen, null, 2));
fs.writeFileSync(path.join(DIR, 'informe.md'), require('./informe')(resumen));
console.log(`\nResumen: ${aprobados}/${casos.length} casos aprobados, ${hallazgos.length} hallazgos → ${path.relative(process.cwd(), DIR)}`);
// La ejecución termina con código 0 aunque haya casos fallidos que representan hallazgos documentados;
// usar STRICT=1 para que el pipeline falle ante cualquier caso fallido.
process.exit(process.env.STRICT === '1' && aprobados !== casos.length ? 1 : 0);
