// Captura en PNG los reportes HTML de las suites para incluirlos en el informe Word.
// Uso: node pruebas/informe/capturar-reportes.js  (necesita Google Chrome instalado)
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const puppeteer = require(path.join(__dirname, '..', 'accesibilidad', 'node_modules', 'puppeteer-core'));

const EVID = path.join(__dirname, '..', 'evidencias');
const SALIDA = path.join(EVID, 'capturas-reportes');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const REPORTES = [
  { archivo: 'cypress/informe/informe-cypress.html', png: 'cypress-informe.png', alto: 1100 },
  { archivo: 'screenplay/reporte-serenity/index.html', png: 'serenity.png', alto: 1100 },
  { archivo: 'rendimiento/reporte.html', png: 'rendimiento.png', alto: 1400 },
  { archivo: 'ux-accesibilidad/lighthouse/inicio-escritorio.html', png: 'lighthouse-inicio.png', alto: 1000 },
  { archivo: 'backend-jest/cobertura/index.html', png: 'jest-cobertura.png', alto: 900 },
];

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  try {
    for (const r of REPORTES) {
      const ruta = path.join(EVID, r.archivo);
      if (!fs.existsSync(ruta)) {
        console.log(`Omitido (no existe): ${r.archivo}`);
        continue;
      }
      const pagina = await navegador.newPage();
      await pagina.setViewport({ width: 1280, height: r.alto });
      await pagina.goto(pathToFileURL(ruta).href, { waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});
      await new Promise((ok) => setTimeout(ok, 2500));
      await pagina.screenshot({ path: path.join(SALIDA, r.png) });
      await pagina.close();
      console.log(`Capturado: ${r.png}`);
    }
  } finally {
    await navegador.close();
  }
})();
