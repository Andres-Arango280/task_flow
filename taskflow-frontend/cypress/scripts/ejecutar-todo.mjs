// npm run test:cypress
// 1) limpia resultados, 2) ejecuta E2E (API + regresión UI), 3) ejecuta pruebas de componentes,
// 4) genera el informe combinado, copia las evidencias y escribe resumen.json.
// Las pruebas que fallan no detienen el proceso: siempre se generan informe y resumen.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scripts = dirname(fileURLToPath(import.meta.url));
const node = (archivo, ...args) =>
  spawnSync(process.execPath, [join(scripts, archivo), ...args], { stdio: 'inherit', cwd: join(scripts, '..', '..') }).status ?? 1;

const inicio = Date.now();
node('limpiar.mjs');
const e2e = node('cypress.mjs', 'run', '--e2e', '--browser', process.env.CY_BROWSER ?? 'electron');
const componentes = node('cypress.mjs', 'run', '--component', '--browser', process.env.CY_BROWSER ?? 'electron');
const resumen = node('generar-resumen.mjs', String(Date.now() - inicio));

console.log(`\nCódigos de salida -> e2e: ${e2e}, componentes: ${componentes}, resumen: ${resumen}`);
process.exit(e2e !== 0 || componentes !== 0 || resumen !== 0 ? 1 : 0);
