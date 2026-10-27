// Lanza Cypress con un entorno limpio.
// - Quita ELECTRON_RUN_AS_NODE: si está definida (p. ej. al ejecutar desde VS Code o desde
//   otra herramienta basada en Electron), Cypress falla con "bad option: --smoke-test".
// - Elige la carpeta del informe según el tipo de prueba (e2e o component).
// Uso: node cypress/scripts/cypress.mjs run --e2e [más argumentos de Cypress]
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
if (!env.CY_REPORT_DIR) {
  env.CY_REPORT_DIR = args.includes('--component') ? 'cypress/reports/component' : 'cypress/reports/e2e';
}

const binario = join(dirname(require.resolve('cypress/package.json')), 'bin', 'cypress');
const resultado = spawnSync(process.execPath, [binario, ...args], { stdio: 'inherit', env });
process.exit(resultado.status ?? 1);
