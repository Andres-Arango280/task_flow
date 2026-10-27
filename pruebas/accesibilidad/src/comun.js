// Utilidades compartidas: configuración, navegador, datos de prueba vía API y registro de casos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const aqui = path.dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  api: process.env.API_URL || 'http://localhost:3000',
  web: process.env.WEB_URL || 'http://localhost:5173',
  chrome: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  evidencias: path.resolve(aqui, '../../evidencias/ux-accesibilidad'),
  password: 'Secreta123',
};

export const DIRS = {
  raiz: CONFIG.evidencias,
  capturas: path.join(CONFIG.evidencias, 'capturas'),
  axe: path.join(CONFIG.evidencias, 'axe'),
  lighthouse: path.join(CONFIG.evidencias, 'lighthouse'),
  teclado: path.join(CONFIG.evidencias, 'teclado'),
  visual: path.join(CONFIG.evidencias, 'visual'),
  recorrido: path.join(CONFIG.evidencias, 'recorrido'),
  resultados: path.join(CONFIG.evidencias, 'resultados'),
};

for (const d of Object.values(DIRS)) fs.mkdirSync(d, { recursive: true });

/** Ruta relativa a la carpeta de evidencias (con barras /), para usar en informes. */
export const rel = (p) => path.relative(CONFIG.evidencias, p).split(path.sep).join('/');

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function leerJSON(p, porDefecto = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return porDefecto;
  }
}

export function guardarJSON(p, datos) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(datos, null, 2), 'utf8');
}

export async function lanzarNavegador(opciones = {}) {
  return puppeteer.launch({
    executablePath: CONFIG.chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=es-ES', '--force-color-profile=srgb', '--hide-scrollbars'],
    defaultViewport: { width: 1366, height: 900 },
    protocolTimeout: 120000,
    ...opciones,
  });
}

// ---------------------------------------------------------------- API
async function peticion(metodo, ruta, cuerpo, token) {
  let res;
  // Reintenta si el backend compartido no responde momentáneamente (p. ej. reinicio en modo watch)
  for (let intento = 1; ; intento++) {
    try {
      res = await fetch(CONFIG.api + ruta, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
      break;
    } catch (err) {
      if (intento >= 8) throw err;
      console.log(`    (aviso) backend no disponible (${err.cause?.code ?? err.message}); reintento ${intento}/7 en 5 s`);
      incidenciasCarga.push({ ruta: `API ${metodo} ${ruta}`, intento, fecha: new Date().toISOString() });
      await esperar(5000);
    }
  }
  const texto = await res.text();
  let datos;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  if (!res.ok) throw new Error(`${metodo} ${ruta} -> ${res.status}: ${texto.slice(0, 200)}`);
  return datos;
}

export const api = {
  get: (r, t) => peticion('GET', r, null, t),
  post: (r, c, t) => peticion('POST', r, c, t),
  patch: (r, c, t) => peticion('PATCH', r, c, t),
};

export async function crearUsuario(prefijo, nombre) {
  const email = `${prefijo}.${Date.now()}${Math.floor(Math.random() * 1000)}@taskflow-qa.test`;
  const usuario = await api.post('/auth/register', { nombre, email, password: CONFIG.password });
  const { access_token } = await api.post('/auth/login', { email, password: CONFIG.password });
  return { id: usuario.id, nombre: usuario.nombre, email, token: access_token };
}

/**
 * Crea un escenario completo: líder + miembro, equipo, proyecto con tareas repartidas en las 3 listas.
 * También un usuario "vacío" sin equipos para el estado inicial del inicio.
 */
export async function sembrarDatos() {
  const lider = await crearUsuario('a11y.lider', 'Laura Líder');
  const miembro = await crearUsuario('a11y.miembro', 'Mario Miembro');
  const vacio = await crearUsuario('a11y.vacio', 'Vera Vacía');
  const equipo = await api.post('/equipos', { nombre: 'Equipo Accesibilidad QA' }, lider.token);
  await api.post(`/equipos/${equipo.id}/miembros`, { userId: miembro.id }, lider.token);
  const proyecto = await api.post('/proyectos', { nombre: 'Proyecto Tablero QA', equipoId: equipo.id }, lider.token);
  const listas = await api.get(`/listas/proyecto/${proyecto.id}`, lider.token);
  const titulos = [
    ['Diseñar pantalla de inicio', 'Boceto y prototipo de la pantalla principal.'],
    ['Revisar contraste de colores', 'Comprobar WCAG AA en botones y textos.'],
    ['Escribir pruebas de teclado', 'Navegación con Tab, Esc y arrastre con teclado.'],
    ['Publicar versión 1.0', 'Despliegue en el servidor de pruebas.'],
  ];
  const tareas = [];
  for (const [titulo, descripcion] of titulos) {
    tareas.push(await api.post('/tareas', { titulo, descripcion, proyectoId: proyecto.id }, lider.token));
  }
  // Repartir: 2 en primera lista, 1 en la segunda, 1 en la última
  const ordenadas = [...listas].sort((a, b) => (a.orden ?? a.posicion ?? 0) - (b.orden ?? b.posicion ?? 0));
  if (ordenadas.length >= 3) {
    await api.patch(`/tareas/${tareas[2].id}/mover`, { nuevaListaId: ordenadas[1].id }, lider.token);
    await api.patch(`/tareas/${tareas[3].id}/mover`, { nuevaListaId: ordenadas[ordenadas.length - 1].id }, lider.token);
  }
  return { lider, miembro, vacio, equipo, proyecto, listas: ordenadas, tareas };
}

/** Inyecta la sesión en localStorage igual que hace useAuthStore.login(). */
export async function iniciarSesion(page, usuario, preferencias) {
  await page.goto(`${CONFIG.web}/login`, { waitUntil: 'networkidle0' });
  await page.evaluate(
    (u, prefs) => {
      localStorage.clear();
      localStorage.setItem('access_token', u.token);
      localStorage.setItem('user', JSON.stringify({ id: u.id, nombre: u.nombre, email: u.email }));
      // Oculta la guía flotante solo si se pide; por defecto se deja todo como un usuario nuevo
      if (prefs) localStorage.setItem('taskflow:preferencias', JSON.stringify(prefs));
    },
    usuario,
    preferencias ?? null,
  );
}

/** Incidencias transitorias de carga observadas (p. ej. TF-RED con el backend compartido ocupado). */
export const incidenciasCarga = [];

export async function irA(page, ruta, esperarSelector = 'h1') {
  for (let intento = 1; intento <= 3; intento++) {
    await page.goto(`${CONFIG.web}${ruta}`, { waitUntil: 'networkidle0' });
    if (esperarSelector) await page.waitForSelector(esperarSelector, { timeout: 15000 }).catch(() => {});
    // Deja terminar animaciones de entrada
    await esperar(600);
    const fallo = await page.evaluate(() => /No se pudo cargar|No se pudieron cargar/.test(document.body.innerText));
    if (!fallo) return;
    incidenciasCarga.push({ ruta, intento, fecha: new Date().toISOString() });
    console.log(`    (aviso) la ruta ${ruta} mostró un error de carga en el intento ${intento}; se reintenta`);
    await esperar(1500);
  }
}

export async function captura(page, nombre, dir = DIRS.capturas, completa = true) {
  const archivo = path.join(dir, `${nombre}.png`);
  await page.screenshot({ path: archivo, fullPage: completa });
  return rel(archivo);
}

/** Pulsa un botón por su texto visible (o aria-label). */
export async function pulsarBoton(page, texto, ambito = 'body') {
  const intentar = () => page.evaluate((t, amb) => {
    const raiz = [...document.querySelectorAll(amb)].pop() ?? document.body;
    const candidatos = [...raiz.querySelectorAll('button, a, [role="button"]')].filter((b) => !b.disabled);
    const nombre = (b) => [(b.innerText || '').trim(), b.getAttribute('aria-label') || ''];
    const el =
      candidatos.find((b) => nombre(b).some((x) => x === t)) ??
      candidatos.find((b) => nombre(b).some((x) => x.includes(t)));
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    }
    return false;
  }, texto, ambito);
  let ok = false;
  // Reintenta hasta 6 s: algunas secciones (miembros, tareas) se cargan después del título
  for (let i = 0; i < 12 && !ok; i++) {
    ok = await intentar();
    if (!ok) await esperar(500);
  }
  if (!ok) throw new Error(`No se encontró el botón "${texto}"`);
  await esperar(500);
}

// ---------------------------------------------------------------- Registro de casos
export class Registro {
  constructor(modulo) {
    this.modulo = modulo;
    this.casos = [];
    this.extra = {};
  }
  agregar({ id, tipo, nombre, objetivo, esperado, obtenido, aprobado, evidencia = [], detalle }) {
    const caso = {
      id,
      tipo,
      nombre,
      objetivo,
      esperado,
      obtenido,
      estado: aprobado ? 'Aprobado' : 'Fallido',
      evidencia: evidencia.filter(Boolean),
    };
    if (detalle !== undefined) caso.detalle = detalle;
    this.casos.push(caso);
    console.log(`  [${caso.estado === 'Aprobado' ? 'OK ' : 'FAL'}] ${id} ${nombre} -> ${obtenido}`);
    return caso;
  }
  guardar() {
    guardarJSON(path.join(DIRS.resultados, `${this.modulo}.json`), {
      modulo: this.modulo,
      fecha: new Date().toISOString(),
      casos: this.casos,
      incidenciasCarga: [...incidenciasCarga],
      ...this.extra,
    });
  }
}

/** Crea los datos una sola vez por ejecución completa y los reutiliza entre módulos. */
export async function obtenerEscenario(nuevo = false) {
  const archivo = path.join(DIRS.resultados, '_escenario.json');
  const previo = leerJSON(archivo);
  // Los tokens duran 1 día: se reutiliza si es reciente (< 6 h) y no se pide uno nuevo
  if (!nuevo && previo && Date.now() - previo.creado < 6 * 3600 * 1000) {
    try {
      await api.get('/usuarios/me', previo.lider.token);
      return previo;
    } catch {
      // token no válido: se crea otro escenario
    }
  }
  const escenario = { creado: Date.now(), ...(await sembrarDatos()) };
  guardarJSON(archivo, escenario);
  return escenario;
}
