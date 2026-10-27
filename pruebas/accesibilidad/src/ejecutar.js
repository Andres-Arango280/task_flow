// Punto de entrada: node src/ejecutar.js [todo|axe|lighthouse|teclado|visual|recorrido|informe]
import path from 'node:path';
import { CONFIG, DIRS, leerJSON, obtenerEscenario } from './comun.js';

const modo = process.argv[2] ?? 'todo';

async function comprobarServidores() {
  for (const [nombre, url] of [['frontend', CONFIG.web], ['backend', `${CONFIG.api}/auth/login`]]) {
    try {
      await fetch(url, { method: 'GET' });
    } catch {
      console.error(`No se puede conectar con el ${nombre} en ${url}. Arranca la aplicación antes de las pruebas.`);
      process.exit(2);
    }
  }
}

async function main() {
  await comprobarServidores();
  const inicio = Date.now();
  if (modo === 'todo') await obtenerEscenario(true);

  const pasos = {
    axe: async () => (await import('./axe.js')).correrAxe(),
    lighthouse: async () => (await import('./lighthouse.js')).correrLighthouse(),
    teclado: async () => (await import('./teclado.js')).correrTeclado(),
    visual: async () => (await import('./visual.js')).correrVisual(),
    recorrido: async () => (await import('./recorrido.js')).correrRecorrido(),
  };
  const aEjecutar = modo === 'todo' ? Object.keys(pasos) : modo === 'informe' ? [] : [modo];
  for (const p of aEjecutar) {
    if (!pasos[p]) throw new Error(`Modo desconocido: ${p}`);
    await pasos[p]();
  }
  const { generarInforme } = await import('./informe.js');
  // "npm run informe" solo regenera el informe: conserva el comando de la última ejecución de pruebas
  const previo = modo === 'informe' ? leerJSON(path.join(DIRS.raiz, 'resumen.json'))?.comando : null;
  const resumen = await generarInforme({ comando: previo ?? (modo === 'todo' ? 'npm test' : `npm run ${modo}`) });
  console.log(`\nTotal: ${resumen.totales.total} casos · ${resumen.totales.aprobados} aprobados · ${resumen.totales.fallidos} fallidos`);
  console.log(`Tiempo: ${Math.round((Date.now() - inicio) / 1000)} s · Evidencias en ${CONFIG.evidencias}`);
  // El proceso termina con 0 aunque haya fallos de accesibilidad: son hallazgos documentados, no errores de ejecución
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
