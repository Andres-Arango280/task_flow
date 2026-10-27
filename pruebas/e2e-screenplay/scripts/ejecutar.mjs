// Orquesta la ejecución completa: Playwright Test (+ Serenity/JS) → informe Serenity BDD → resumen y evidencias.
// Se usa un script de Node para que funcione igual en Windows (cmd/PowerShell) y en Linux/macOS.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const extra = process.argv.slice(2);
const ejecutar = (comando, args) => spawnSync(comando, args, { stdio: 'inherit', shell: true });

const inicio = Date.now();
const pruebas = ejecutar('npx', ['playwright', 'test', ...extra]);
process.env.DURACION_TOTAL_MS = String(Date.now() - inicio);

if (existsSync('target/site/serenity')) {
    const informe = ejecutar('npx', ['serenity-bdd', 'run', '--features', './specs', '--project', '"TaskFlow E2E Screenplay"']);
    if (informe.status !== 0) console.warn('[aviso] No se pudo generar el informe Serenity BDD (¿Java instalado?)');
}

ejecutar('node', ['scripts/generar-resumen.mjs']);
process.exit(pruebas.status ?? 1);
