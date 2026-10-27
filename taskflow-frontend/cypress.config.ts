import { defineConfig } from 'cypress';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import plugin from 'cypress-mochawesome-reporter/plugin.js';

const RAIZ = dirname(fileURLToPath(import.meta.url));
// Registros que escriben las pruebas durante la ejecución: resultado obtenido real y
// petición/respuesta de cada caso de API. Los consume cypress/scripts/generar-resumen.mjs
const DIR_REGISTROS = join(RAIZ, 'cypress', 'results', 'registros');

interface RegistroCaso {
  id: string;
  obtenido: string;
  peticion?: unknown;
  respuesta?: unknown;
}

function registrarTareas(on: Cypress.PluginEvents) {
  on('task', {
    registrarCaso(registro: RegistroCaso) {
      mkdirSync(DIR_REGISTROS, { recursive: true });
      writeFileSync(
        join(DIR_REGISTROS, `${registro.id}.json`),
        JSON.stringify({ ...registro, fecha: new Date().toISOString() }, null, 2),
        'utf8',
      );
      return null;
    },
    async backendDisponible(url: string) {
      try {
        const respuesta = await fetch(url, { signal: AbortSignal.timeout(3000) });
        return respuesta.status > 0;
      } catch {
        return false;
      }
    },
    log(mensaje: string) {
      console.log(mensaje);
      return null;
    },
  });
}

// La carpeta del informe se puede cambiar por variable de entorno (e2e y componentes por separado)
const reportDir = process.env.CY_REPORT_DIR ?? 'cypress/reports/e2e';

export default defineConfig({
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir,
    reportPageTitle: 'TaskFlow - Pruebas Cypress (regresión, API y componentes)',
    reportTitle: 'TaskFlow - Pruebas Cypress',
    charts: true,
    embeddedScreenshots: true,
    inlineAssets: true,
    saveJson: true,
    saveAllAttempts: false,
    videoOnFailOnly: false,
  },
  video: true,
  screenshotOnRunFailure: true,
  screenshotsFolder: 'cypress/screenshots',
  videosFolder: 'cypress/videos',
  // La limpieza la hace cypress/scripts/limpiar.mjs: si Cypress borrara las capturas al
  // iniciar la corrida de componentes, se perderían las de E2E
  trashAssetsBeforeRuns: false,
  viewportWidth: 1280,
  viewportHeight: 800,
  defaultCommandTimeout: 8000,
  requestTimeout: 10000,
  // Un reintento en modo headless: absorbe reinicios del backend (nest --watch) a mitad de
  // una prueba. Los fallos reales se repiten en el reintento y quedan como fallidos.
  retries: { runMode: 1, openMode: 0 },
  env: {
    apiUrl: 'http://localhost:3000',
  },

  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      plugin(on);
      registrarTareas(on);
      return config;
    },
  },

  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'cypress/component/**/*.cy.{ts,tsx}',
    supportFile: 'cypress/support/component.tsx',
    indexHtmlFile: 'cypress/support/component-index.html',
    video: false,
    setupNodeEvents(on, config) {
      plugin(on);
      registrarTareas(on);
      return config;
    },
  },
});
