// Orquesta la ejecución Gherkin: Cucumber (+ Serenity/JS) → informe Serenity BDD → resumen y evidencias.
// Uso: npm run gherkin [-- opciones de cucumber-js, p. ej. --tags @autenticacion]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';

const extra = process.argv.slice(2);
const ejecutar = (comando, args) => spawnSync(comando, args, { stdio: 'inherit', shell: true });

// Limpieza de la ejecución anterior (solo lo de Gherkin; no toca la suite Playwright)
rmSync('reportes/gherkin', { recursive: true, force: true });
rmSync('target/site/serenity-gherkin', { recursive: true, force: true });
mkdirSync('reportes/gherkin', { recursive: true });

const inicio = Date.now();
const pruebas = ejecutar('npx', ['cucumber-js', ...extra]);
process.env.DURACION_TOTAL_MS = String(Date.now() - inicio);

if (existsSync('target/site/serenity-gherkin')) {
    const informe = ejecutar('npx', [
        'serenity-bdd', 'run',
        '--features', './features',
        '--source', './target/site/serenity-gherkin',
        '--destination', './target/site/serenity-gherkin',
        '--project', '"TaskFlow E2E Gherkin + Screenplay"',
    ]);
    if (informe.status !== 0) console.warn('[aviso] No se pudo generar el informe Serenity BDD (¿Java instalado? ¿`npx serenity-bdd update` ejecutado?)');
} else {
    console.warn('[aviso] No hay resultados de Serenity/JS en target/site/serenity-gherkin');
}

const resumen = ejecutar('node', ['scripts/generar-resumen-gherkin.mjs']);
process.exit(pruebas.status ?? resumen.status ?? 1);
