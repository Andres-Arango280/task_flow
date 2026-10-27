// Prueba de humo: comprueba que Stagehand habla con Ollama y puede observar el formulario de /login.
import { Stagehand } from '@browserbasehq/stagehand';
import { configuracionModelo, correcciones } from './modelo.mjs';

const MODELO = process.env.STAGEHAND_MODELO ?? 'ollama/llama3.1:8b';
const inicio = Date.now();
const stagehand = new Stagehand({
  env: 'LOCAL',
  model: configuracionModelo(),
  localBrowserLaunchOptions: { headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', viewport: { width: 1280, height: 720 }, locale: 'es-ES' },
  verbose: 1,
  disablePino: true,
});
await stagehand.init();
const page = stagehand.context.pages()[0] ?? (await stagehand.context.newPage());
await page.goto('http://localhost:5173/login', { waitUntil: 'load' });
await page.waitForSelector('h1');
console.log('título:', await page.title());
const t = Date.now();
const acciones = await stagehand.observe('Find the email input, the password input and the sign-in button of the login form', { timeout: 300_000 });
console.log(`observe en ${((Date.now() - t) / 1000).toFixed(1)} s`);
console.log(JSON.stringify(acciones, null, 2));
await stagehand.close();
console.log('correcciones', correcciones);
console.log(`total ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
