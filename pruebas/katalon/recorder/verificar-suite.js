// Reproduce la suite de Katalon Recorder fuera de la extensión para comprobar que es correcta.
// Lee TaskFlow-KatalonRecorder.html y ejecuta cada comando como lo hace la extensión: los comandos
// "type"/"click" usan los mismos atoms de Selenium que trae Katalon Recorder (copiados de la extensión
// instalada) y se ejecutan en un mundo aislado, como un content script.
// Uso (con backend :3000 y frontend :5173 en marcha): node pruebas/katalon/recorder/verificar-suite.js
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require(path.join(__dirname, '..', '..', 'accesibilidad', 'node_modules', 'puppeteer-core'));

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ATOMS = process.env.KR_ATOMS
  || path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data/Profile 1/Extensions/ljdobmomdgdljniojadhoplhkpialdid/7.1.0_0/content/atoms.js');
const SALIDA = path.join(__dirname, '..', '..', 'evidencias', 'katalon', 'recorder');
const ESPERA_MS = 30000;

const desescapar = (s) => s.replace(/<datalist>[\s\S]*?<\/datalist>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

function leerSuite(archivo) {
  const html = fs.readFileSync(archivo, 'utf8');
  return [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map(([t]) => ({
    nombre: desescapar(t.match(/colspan="3"[^>]*>([\s\S]*?)<\/td>/)[1]),
    comandos: [...t.matchAll(/<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)]
      .map((m) => [desescapar(m[1]), desescapar(m[2]), desescapar(m[3])]),
  }));
}

const glob = (patron, texto) => {
  const re = new RegExp('^' + patron.replace(/^glob:/, '').split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\S]*') + '$');
  return re.test(texto);
};

async function main() {
  const atoms = fs.readFileSync(ATOMS, 'utf8');
  const casos = leerSuite(path.join(__dirname, 'TaskFlow-KatalonRecorder.html'));
  fs.mkdirSync(SALIDA, { recursive: true });
  const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, defaultViewport: { width: 1366, height: 900 } });
  const pagina = await navegador.newPage();
  const cdp = await pagina.target().createCDPSession();
  await cdp.send('Page.enable');

  // Mundo aislado con los atoms cargados (se recrea tras cada navegación)
  const mundo = async () => {
    const { frameTree } = await cdp.send('Page.getFrameTree');
    const { executionContextId } = await cdp.send('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'katalon-recorder' });
    const evaluar = async (expr) => {
      const r = await cdp.send('Runtime.evaluate', { expression: expr, contextId: executionContextId, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    await evaluar(atoms + ';0');
    return evaluar;
  };
  const buscar = (loc) => `(() => {
    const loc = ${JSON.stringify(loc)};
    if (loc.startsWith('css=')) return document.querySelector(loc.slice(4));
    const xp = loc.startsWith('xpath=') ? loc.slice(6) : loc;
    return document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  })()`;
  const presente = async (loc) => (await mundo())(`!!${buscar(loc)}`);
  const esperar = async (cond, desc) => {
    const fin = Date.now() + ESPERA_MS;
    while (Date.now() < fin) {
      try { if (await cond()) return; } catch { /* la página está navegando */ }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`Tiempo agotado (${ESPERA_MS / 1000} s) esperando ${desc}`);
  };

  const resultados = [];
  for (const [i, caso] of casos.entries()) {
    const vars = {};
    const expandir = (s) => s.replace(/\$\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `\${${k}}`));
    const inicio = Date.now();
    let fallo = null;
    let paso = 0;
    for (const [cmd, objetivoBruto, valorBruto] of caso.comandos) {
      paso += 1;
      const objetivo = expandir(objetivoBruto);
      const valor = expandir(valorBruto);
      try {
        switch (cmd) {
          case 'open':
            await pagina.goto(objetivo, { waitUntil: 'load' });
            break;
          case 'runScript': {
            const r = await pagina.evaluate(`(function(){${objetivo};})()`);
            if (valor) vars[valor] = String(r);
            break;
          }
          case 'store':
            vars[valor] = objetivo;
            break;
          case 'click':
          case 'type':
            await esperar(() => presente(objetivo), objetivo);
            await (await mundo())(cmd === 'click'
              ? `bot.action.click(${buscar(objetivo)}); true`
              : `(() => { const e = ${buscar(objetivo)}; e.value = ''; bot.action.type(e, ${JSON.stringify(valor)}); return true; })()`);
            break;
          case 'waitForElementPresent':
            await esperar(() => presente(objetivo), objetivo);
            break;
          case 'waitForElementNotPresent':
            await esperar(async () => !(await presente(objetivo)), `que desaparezca ${objetivo}`);
            break;
          case 'assertElementPresent':
            if (!(await presente(objetivo))) throw new Error(`No existe ${objetivo}`);
            break;
          case 'assertElementNotPresent':
            if (await presente(objetivo)) throw new Error(`Existe ${objetivo} y no debería`);
            break;
          case 'assertText': {
            const t = await (await mundo())(`(${buscar(objetivo)}).innerText.replace(/\\s+/g,' ').trim()`);
            if (!glob(valor, t)) throw new Error(`Texto "${t}" no coincide con "${valor}"`);
            break;
          }
          case 'assertTitle': {
            const t = await pagina.title();
            if (!glob(objetivo, t)) throw new Error(`Título "${t}" ≠ "${objetivo}"`);
            break;
          }
          case 'assertAttribute': {
            const at = objetivo.lastIndexOf('@');
            const v = await (await mundo())(`(${buscar(objetivo.slice(0, at))}).getAttribute(${JSON.stringify(objetivo.slice(at + 1))})`);
            if (!glob(valor, String(v))) throw new Error(`Atributo = "${v}", se esperaba "${valor}"`);
            break;
          }
          default:
            throw new Error(`Comando no soportado por el verificador: ${cmd}`);
        }
        await new Promise((r) => setTimeout(r, 120));
      } catch (e) {
        fallo = `Paso ${paso} (${cmd} ${objetivoBruto}): ${e.message}`;
        break;
      }
    }
    const captura = `${caso.nombre}.png`;
    await pagina.screenshot({ path: path.join(SALIDA, captura), fullPage: true }).catch(() => {});
    const r = { caso: caso.nombre, estado: fallo ? 'Fallido' : 'Aprobado', pasos: `${fallo ? paso - 1 : paso}/${caso.comandos.length}`, duracionSeg: Math.round((Date.now() - inicio) / 100) / 10, error: fallo, captura };
    resultados.push(r);
    console.log(`${i + 1}. ${r.estado.padEnd(8)} ${caso.nombre} (${r.pasos} pasos, ${r.duracionSeg} s)${fallo ? '\n   ' + fallo : ''}`);
  }
  await navegador.close();
  fs.writeFileSync(path.join(SALIDA, 'verificacion.json'), JSON.stringify({ fecha: new Date().toISOString(), resultados }, null, 2));
  const ok = resultados.filter((r) => r.estado === 'Aprobado').length;
  console.log(`\n${ok}/${resultados.length} casos aprobados. Evidencias en ${SALIDA}`);
  process.exitCode = ok === resultados.length ? 0 : 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
