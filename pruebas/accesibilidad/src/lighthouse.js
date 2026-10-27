// Lighthouse (Accesibilidad, Buenas prácticas, Rendimiento, SEO) en páginas clave, escritorio y móvil.
// Se usa la integración con Puppeteer para auditar páginas privadas con la sesión ya iniciada.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { CONFIG, DIRS, rel, lanzarNavegador, iniciarSesion, Registro, obtenerEscenario } from './comun.js';

const require = createRequire(import.meta.url);
export const LH_VERSION = require('lighthouse/package.json').version;

const CATEGORIAS = ['accessibility', 'best-practices', 'performance', 'seo'];
const UMBRAL_A11Y = 90;

const mobileConfig = { extends: 'lighthouse:default', settings: { onlyCategories: CATEGORIAS } };
const escritorioConfig = { ...desktopConfig, settings: { ...desktopConfig.settings, onlyCategories: CATEGORIAS } };

export async function correrLighthouse() {
  console.log(`\n== Lighthouse ${LH_VERSION} ==`);
  const escenario = await obtenerEscenario();
  const registro = new Registro('lighthouse');
  const paginas = [
    { id: 'login', nombre: 'Login', ruta: '/login', privada: false },
    { id: 'inicio', nombre: 'Inicio (Mis equipos)', ruta: '/', privada: true },
    { id: 'tablero', nombre: 'Tablero Kanban', ruta: `/proyectos/${escenario.proyecto.id}`, privada: true },
  ];
  const dispositivos = [
    { id: 'escritorio', nombre: 'Escritorio', config: escritorioConfig },
    { id: 'movil', nombre: 'Móvil', config: mobileConfig },
  ];

  const tabla = [];
  let n = 0;
  for (const pagina of paginas) {
    for (const disp of dispositivos) {
      n += 1;
      // Un navegador por auditoría para que no se mezclen cachés ni emulaciones
      const navegador = await lanzarNavegador({ defaultViewport: null });
      const id = `LH-${String(n).padStart(2, '0')}`;
      try {
        const page = await navegador.newPage();
        if (pagina.privada) await iniciarSesion(page, escenario.lider, { tamanoTexto: 'normal', altoContraste: false, reducirAnimaciones: false, atajosTeclado: true });
        else {
          await page.goto(`${CONFIG.web}/login`, { waitUntil: 'networkidle0' });
          await page.evaluate(() => localStorage.clear());
        }
        const resultado = await lighthouse(
          `${CONFIG.web}${pagina.ruta}`,
          { output: ['html', 'json'], logLevel: 'error', disableStorageReset: true, locale: 'es' },
          disp.config,
          page,
        );
        const base = path.join(DIRS.lighthouse, `${pagina.id}-${disp.id}`);
        fs.writeFileSync(`${base}.html`, resultado.report[0], 'utf8');
        fs.writeFileSync(`${base}.json`, resultado.report[1], 'utf8');
        const cat = resultado.lhr.categories;
        const punt = (k) => (cat[k]?.score == null ? null : Math.round(cat[k].score * 100));
        const fila = {
          pagina: pagina.nombre,
          dispositivo: disp.nombre,
          accesibilidad: punt('accessibility'),
          buenasPracticas: punt('best-practices'),
          rendimiento: punt('performance'),
          seo: punt('seo'),
        };
        // Auditorías fallidas de accesibilidad / SEO / buenas prácticas, para el informe
        const fallidas = [];
        for (const k of ['accessibility', 'best-practices', 'seo']) {
          for (const ref of cat[k].auditRefs) {
            const a = resultado.lhr.audits[ref.id];
            if (a && a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable' && ref.weight > 0) {
              fallidas.push({ categoria: k, id: ref.id, titulo: a.title });
            }
          }
        }
        const metricas = {
          FCP: resultado.lhr.audits['first-contentful-paint']?.displayValue,
          LCP: resultado.lhr.audits['largest-contentful-paint']?.displayValue,
          TBT: resultado.lhr.audits['total-blocking-time']?.displayValue,
          CLS: resultado.lhr.audits['cumulative-layout-shift']?.displayValue,
        };
        tabla.push({ ...fila, auditoriasFallidas: fallidas, metricas, informe: rel(`${base}.html`), urlFinal: resultado.lhr.finalDisplayedUrl });
        const finalOk = !pagina.privada || !resultado.lhr.finalDisplayedUrl.includes('/login');
        registro.agregar({
          id,
          tipo: 'accesibilidad',
          nombre: `Lighthouse ${pagina.nombre} – ${disp.nombre}`,
          objetivo: `Medir accesibilidad, buenas prácticas, rendimiento y SEO de ${pagina.nombre} en ${disp.nombre.toLowerCase()}.`,
          esperado: `Accesibilidad ≥ ${UMBRAL_A11Y} y la página auditada es la solicitada (sesión válida).`,
          obtenido:
            `A11y ${fila.accesibilidad} · BP ${fila.buenasPracticas} · Rend. ${fila.rendimiento} · SEO ${fila.seo}` +
            ` (LCP ${metricas.LCP ?? '-'}, CLS ${metricas.CLS ?? '-'})` +
            (fallidas.length ? ` · auditorías no superadas: ${fallidas.map((f) => f.id).join(', ')}` : '') +
            (finalOk ? '' : ' · ¡redirigió al login!'),
          aprobado: fila.accesibilidad >= UMBRAL_A11Y && finalOk,
          evidencia: [rel(`${base}.html`), rel(`${base}.json`)],
        });
      } catch (err) {
        registro.agregar({
          id, tipo: 'accesibilidad', nombre: `Lighthouse ${pagina.nombre} – ${disp.nombre}`,
          objetivo: `Auditar ${pagina.nombre} con Lighthouse.`, esperado: `Accesibilidad ≥ ${UMBRAL_A11Y}.`,
          obtenido: `Error al ejecutar Lighthouse: ${err.message}`, aprobado: false,
        });
      } finally {
        await navegador.close();
      }
    }
  }
  registro.extra = { lighthouseVersion: LH_VERSION, tabla };
  registro.guardar();
  return registro;
}
