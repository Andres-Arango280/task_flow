// Borra los resultados de ejecuciones anteriores para que el resumen refleje solo la actual
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const carpeta of ['results', 'reports', 'screenshots', 'videos']) {
  rmSync(join(raiz, carpeta), { recursive: true, force: true });
}
console.log('Resultados anteriores de Cypress eliminados.');
