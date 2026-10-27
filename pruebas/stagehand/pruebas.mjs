// Pruebas E2E de TaskFlow con Stagehand (act, observe, extract) y un modelo local de Ollama.
// Uso: npm test   (requiere backend en :3000, frontend en :5173 y Ollama en :11434 con llama3.1:8b)
// Cada caso se ejecuta de forma independiente: un fallo no detiene los demás. Los resultados
// REALES se escriben en ../evidencias/stagehand/ (resumen.json, capturas/, salidas/, inferencias/).
import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configuracionModelo, correcciones, NOMBRE_MODELO, OLLAMA_URL } from './modelo.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const EVID = resolve(RAIZ, '..', 'evidencias', 'stagehand');
const FRONT = process.env.TASKFLOW_URL ?? 'http://localhost:5173';
const API = process.env.TASKFLOW_API_URL ?? 'http://localhost:3000';
// El modelo local puede tardar más de un minuto por llamada
const TIMEOUT_IA = Number(process.env.STAGEHAND_TIMEOUT_MS ?? 600_000);
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null; // SOLO=ST-01,ST-03 para depurar

// ---------- utilidades ----------
const sufijo = () => `${Date.now()}${Math.floor(Math.random() * 100)}`;
const normalizar = (t) => String(t ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
const seg = (ms) => Number((ms / 1000).toFixed(1));

async function api(metodo, ruta, { token, body } = {}) {
  const respuesta = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await respuesta.text();
  let datos;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }
  if (!respuesta.ok) throw new Error(`${metodo} ${ruta} -> ${respuesta.status}: ${texto.slice(0, 200)}`);
  return datos;
}

/** Crea un usuario nuevo por API y devuelve credenciales, id y token. */
async function nuevoUsuario(alias) {
  const credenciales = {
    nombre: `${alias} Stagehand ${sufijo()}`,
    email: `${alias.toLowerCase()}.stagehand.${sufijo()}@taskflow.test`,
    password: 'Clave-Segura-123',
  };
  const creado = await api('POST', '/auth/register', { body: credenciales });
  const { access_token } = await api('POST', '/auth/login', { body: { email: credenciales.email, password: credenciales.password } });
  return { ...credenciales, id: creado.id, token: access_token };
}

/** Deja la sesión del usuario en el navegador tal como lo hace la aplicación (localStorage). */
async function abrirSesionEnNavegador(page, usuario) {
  await page.goto(`${FRONT}/login`, { waitUntil: 'load' });
  await page.evaluate(({ token, user }) => {
    window.localStorage.setItem('access_token', token);
    window.localStorage.setItem('user', JSON.stringify(user));
  }, { token: usuario.token, user: { id: usuario.id, nombre: usuario.nombre, email: usuario.email } });
}

async function esperarTexto(page, selector, texto, ms = 15_000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    try {
      const n = await page.locator(selector).count();
      for (let i = 0; i < n; i++) {
        const actual = await page.locator(selector).nth(i).textContent();
        if (normalizar(actual).includes(normalizar(texto))) return actual;
      }
    } catch { /* todavía no está */ }
    await page.waitForTimeout(250);
  }
  throw new Error(`No apareció «${texto}» en ${selector}`);
}

/** Espera a que exista un elemento consultando el DOM (el waitForSelector de Stagehand no ve las ventanas modales como visibles). */
async function esperarSelector(page, selector, ms = 15_000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await page.evaluate((s) => Boolean(document.querySelector(s)), selector)) return;
    await page.waitForTimeout(200);
  }
  throw new Error(`No apareció ningún elemento «${selector}» en ${ms} ms`);
}

async function esperarRuta(page, ruta, ms = 15_000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (new URL(page.url()).pathname === ruta) return;
    await page.waitForTimeout(200);
  }
  throw new Error(`La ruta sigue siendo ${new URL(page.url()).pathname} (se esperaba ${ruta})`);
}

/** Información del elemento al que resuelve un selector devuelto por observe (validación determinista). */
async function describirSelector(page, selector) {
  const n = await page.locator(selector).count();
  if (n === 0) return { selector, existe: false };
  const info = await page.evaluate((s) => {
    let el = null;
    if (s.startsWith('xpath=')) {
      el = document.evaluate(s.slice(6), document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    } else {
      try { el = document.querySelector(s); } catch { el = null; }
    }
    if (!el) return null;
    const etiqueta = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : null;
    return {
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type'),
      etiqueta: etiqueta ? etiqueta.replace(/\s+/g, ' ').trim() : null,
      texto: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) || null,
    };
  }, selector);
  return { selector, existe: true, ...(info ?? {}) };
}

const cronometrar = async (etiqueta, fn, tiempos) => {
  const t = Date.now();
  const resultado = await fn();
  tiempos.push({ paso: etiqueta, seg: seg(Date.now() - t) });
  return resultado;
};

// ---------- evidencias ----------
rmSync(EVID, { recursive: true, force: true });
for (const d of ['capturas', 'salidas', 'inferencias']) mkdirSync(join(EVID, d), { recursive: true });
rmSync(join(RAIZ, 'inference_summary'), { recursive: true, force: true });

const guardarSalida = (id, datos) => {
  writeFileSync(join(EVID, 'salidas', `${id}.json`), JSON.stringify(datos, null, 2), 'utf8');
  return `salidas/${id}.json`;
};
const capturar = async (page, id) => {
  const nombre = `capturas/${id}.png`;
  writeFileSync(join(EVID, nombre), await page.screenshot({ fullPage: false }));
  return nombre;
};

// ---------- Stagehand ----------
const inicioTotal = Date.now();
const stagehand = new Stagehand({
  env: 'LOCAL',
  model: configuracionModelo(),
  localBrowserLaunchOptions: { headless: true, executablePath: CHROME, viewport: { width: 1280, height: 720 }, locale: 'es-ES' },
  verbose: Number(process.env.STAGEHAND_VERBOSE ?? 0),
  selfHeal: true,
  logInferenceToFile: true,
  disablePino: true,
});
await stagehand.init();
const page = stagehand.context.pages()[0] ?? (await stagehand.context.newPage());

// ---------- catálogo de casos ----------
const casos = [
  {
    id: 'ST-01', capacidad: 'observe', tipo: 'exitoso', funcionalidad: 'Autenticación',
    nombre: 'observe: identificar los campos y el botón del formulario de inicio de sesión',
    objetivo: 'Verificar que Stagehand.observe interpreta una instrucción en lenguaje natural y devuelve acciones con selectores reales para el correo, la contraseña y el botón «Iniciar sesión».',
    esperado: 'Tres acciones cuyos selectores resuelven, respectivamente, al campo con etiqueta «Correo electrónico» (type=email), al campo «Contraseña» (type=password) y al botón «Iniciar sesión».',
    async ejecutar(ctx) {
      const instruccion = 'Find the email input, the password input and the sign-in button of the login form';
      await page.goto(`${FRONT}/login`, { waitUntil: 'load' });
      await page.waitForSelector('h1');
      const acciones = await cronometrar('observe', () => stagehand.observe(instruccion, { timeout: TIMEOUT_IA }), ctx.tiempos);
      const resueltos = [];
      for (const a of acciones) resueltos.push({ descripcion: a.description, method: a.method, ...(await describirSelector(page, a.selector)) });
      ctx.salida = { instruccion, acciones, selectoresResueltos: resueltos };
      const correo = resueltos.find((r) => r.type === 'email');
      const clave = resueltos.find((r) => r.type === 'password');
      const boton = resueltos.find((r) => r.tag === 'button' && normalizar(r.texto).includes('iniciar sesión'));
      if (!correo || !clave || !boton) throw new Error(`No se identificaron los tres elementos. Resueltos: ${JSON.stringify(resueltos)}`);
      return `observe devolvió ${acciones.length} acciones; sus selectores resolvieron a <input type=email> con etiqueta «${correo.etiqueta}», <input type=password> con etiqueta «${clave.etiqueta}» y <button> «${boton.texto}».`;
    },
  },
  {
    id: 'ST-02', capacidad: 'observe+act', tipo: 'exitoso', funcionalidad: 'Autenticación',
    nombre: 'act: iniciar sesión con un usuario creado por API',
    objetivo: 'Verificar que con observe se localizan los campos (las credenciales se rellenan con la API de página, sin pasar por el modelo) y que act pulsa «Iniciar sesión» completando el inicio de sesión real.',
    esperado: 'Tras act, la URL pasa a «/» y el encabezado principal es «Mis equipos»; el token queda en localStorage.',
    async ejecutar(ctx) {
      const usuario = await nuevoUsuario('Ana');
      ctx.datos = { email: usuario.email };
      await page.goto(`${FRONT}/login`, { waitUntil: 'load' });
      await page.waitForSelector('h1');
      // Cuando el modelo señala la etiqueta (<label>) en lugar del control, se resuelve el <input> asociado (label[for] → #id):
      // es un post-procesado determinista del resultado de observe, documentado como limitación del modelo local.
      const resolverControl = async (accion) => {
        const info = await describirSelector(page, accion.selector);
        if (info.tag === 'input') return { ...accion, ...info, resueltoDesdeEtiqueta: false };
        const idControl = await page.evaluate((s) => {
          const xp = s.replace(/^xpath=/, '');
          const el = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          const etiqueta = el?.closest?.('label');
          return etiqueta?.getAttribute('for') ?? null;
        }, accion.selector);
        if (!idControl) return { ...accion, ...info, resueltoDesdeEtiqueta: false };
        const selector = `xpath=//*[@id="${idControl}"]`;
        return { ...accion, selector, ...(await describirSelector(page, selector)), resueltoDesdeEtiqueta: true };
      };
      let descritos = [];
      const instrucciones = [
        'Find the email input and the password input of the login form',
        'Find the two text input boxes of the login form: the email box and the password box (the input elements, not the labels)',
      ];
      for (const instruccion of instrucciones) {
        const campos = await cronometrar('observe', () => stagehand.observe(instruccion, { timeout: TIMEOUT_IA }), ctx.tiempos);
        descritos = [];
        for (const a of campos) descritos.push(await resolverControl(a));
        ctx.salida = { ...(ctx.salida ?? {}), intentos: [...(ctx.salida?.intentos ?? []), { instruccion, resultado: descritos }] };
        if (descritos.some((d) => d.type === 'email') && descritos.some((d) => d.type === 'password')) break;
      }
      const campoCorreo = descritos.find((d) => d.type === 'email');
      const campoClave = descritos.find((d) => d.type === 'password');
      if (!campoCorreo || !campoClave) throw new Error(`observe no devolvió los dos campos tras ${instrucciones.length} intentos: ${JSON.stringify(descritos)}`);
      await page.locator(campoCorreo.selector).first().fill(usuario.email);
      await page.locator(campoClave.selector).first().fill(usuario.password);
      const resultado = await cronometrar('act', () => stagehand.act('Click the "Iniciar sesión" button', { timeout: TIMEOUT_IA }), ctx.tiempos);
      ctx.salida = { ...ctx.salida, camposObservados: descritos, act: resultado };
      if (!resultado.success) throw new Error(`act no tuvo éxito: ${resultado.message}`);
      await esperarRuta(page, '/');
      const h1 = await esperarTexto(page, 'h1', 'Mis equipos');
      const token = await page.evaluate(() => window.localStorage.getItem('access_token'));
      if (!token) throw new Error('No hay access_token en localStorage');
      return `act ejecutó «${resultado.actionDescription || 'click en Iniciar sesión'}»; la URL pasó a «/», el h1 es «${h1.trim()}» y el token quedó guardado en localStorage.`;
    },
  },
  {
    id: 'ST-03', capacidad: 'extract', tipo: 'exitoso', funcionalidad: 'Equipos',
    nombre: 'extract: leer los nombres de los equipos de «Mis equipos»',
    objetivo: 'Verificar que extract devuelve, validado con un esquema zod, el listado de equipos visibles y que coincide con los equipos creados por API.',
    esperado: 'extract devuelve { equipos: [{ nombre }] } con exactamente los 3 nombres creados por API (sin inventar ni omitir ninguno).',
    async ejecutar(ctx) {
      const usuario = await nuevoUsuario('Ana');
      const marca = sufijo().slice(-5);
      const nombres = ['Equipo Backend', 'Equipo Frontend', 'Equipo Calidad'].map((n) => `${n} ${marca}`);
      for (const nombre of nombres) await api('POST', '/equipos', { token: usuario.token, body: { nombre } });
      ctx.datos = { equiposCreados: nombres };
      await abrirSesionEnNavegador(page, usuario);
      await page.goto(`${FRONT}/`, { waitUntil: 'load' });
      await esperarTexto(page, 'h1', 'Mis equipos');
      await page.waitForSelector('[data-testid="tarjeta-equipo"]');
      const esquema = z.object({
        equipos: z.array(z.object({ nombre: z.string().describe('team name exactly as shown in the card heading') })),
      });
      const datos = await cronometrar('extract', () => stagehand.extract(
        'Extract the name of every team card listed under the "Mis equipos" heading',
        esquema,
        { timeout: TIMEOUT_IA, selector: 'xpath=//section[@aria-labelledby="titulo-equipos"]' },
      ), ctx.tiempos);
      ctx.salida = { extraido: datos };
      const extraidos = [...new Set((datos.equipos ?? []).map((e) => normalizar(e.nombre)))];
      const esperados = nombres.map(normalizar);
      const faltan = esperados.filter((n) => !extraidos.includes(n));
      const sobran = extraidos.filter((n) => !esperados.includes(n));
      if (faltan.length || sobran.length) throw new Error(`Diferencias: faltan ${JSON.stringify(faltan)}, sobran ${JSON.stringify(sobran)}; extraído ${JSON.stringify(datos)}`);
      return `extract devolvió ${datos.equipos.length} equipos: ${datos.equipos.map((e) => `«${e.nombre}»`).join(', ')}; coinciden exactamente con los 3 creados por API.`;
    },
  },
  {
    id: 'ST-04', capacidad: 'act+observe', tipo: 'exitoso', funcionalidad: 'Equipos',
    nombre: 'act + observe: crear un equipo desde la interfaz (act para abrir; observe → act(acción) dentro de la ventana)',
    objetivo: 'Verificar que act abre la ventana «Nuevo equipo» y que, dentro de la ventana, el patrón observe → act(acción) rellena el nombre (sin enviarlo al modelo) y pulsa «Crear equipo», quedando el equipo creado en el backend.',
    esperado: 'La ventana «Nuevo equipo» se abre, el nombre se escribe sin exponerlo al modelo (variables) y GET /equipos devuelve el equipo nuevo; la tarjeta aparece en «Mis equipos».',
    async ejecutar(ctx) {
      const usuario = await nuevoUsuario('Ana');
      const nombre = `Equipo IA ${sufijo().slice(-6)}`;
      ctx.datos = { nombre };
      await abrirSesionEnNavegador(page, usuario);
      await page.goto(`${FRONT}/`, { waitUntil: 'load' });
      await esperarTexto(page, 'h1', 'Mis equipos');
      ctx.salida = { acciones: [], observaciones: [] };
      const r1 = await cronometrar('act abrir', () => stagehand.act('Click the "Nuevo equipo" button', { timeout: TIMEOUT_IA }), ctx.tiempos);
      ctx.salida.acciones.push(r1);
      await esperarSelector(page, '[role="dialog"]');
      // Dentro de la ventana modal se usa el patrón «observe → act(acción)»: observe limita el árbol a la ventana
      // (selector) y act ejecuta la acción devuelta sin una segunda llamada al modelo. El nombre del equipo nunca
      // se envía al modelo: va en los argumentos de la acción.
      const enVentana = { timeout: TIMEOUT_IA, selector: 'xpath=//*[@role="dialog"]' };
      const campos = await cronometrar('observe campo', () => stagehand.observe('Find the "Nombre del equipo" text field', enVentana), ctx.tiempos);
      ctx.salida.observaciones.push({ instruccion: 'Find the "Nombre del equipo" text field', acciones: campos });
      const campo = campos.find((a) => /input|textbox|field|nombre/i.test(`${a.selector} ${a.description}`)) ?? campos[0];
      if (!campo) throw new Error('observe no encontró el campo del nombre en la ventana');
      const r2 = await cronometrar('act escribir', () => stagehand.act({ ...campo, method: 'fill', arguments: [nombre] }, { timeout: TIMEOUT_IA }), ctx.tiempos);
      ctx.salida.acciones.push(r2);
      const botones = await cronometrar('observe botón', () => stagehand.observe('Find the "Crear equipo" submit button', enVentana), ctx.tiempos);
      ctx.salida.observaciones.push({ instruccion: 'Find the "Crear equipo" submit button', acciones: botones });
      const descritos = [];
      for (const b of botones) descritos.push({ ...b, ...(await describirSelector(page, b.selector)) });
      const boton = descritos.find((b) => normalizar(b.texto) === 'crear equipo') ?? descritos.find((b) => /crear/i.test(b.description)) ?? descritos[0];
      if (!boton) throw new Error('observe no encontró el botón «Crear equipo» en la ventana');
      const r3 = await cronometrar('act crear', () => stagehand.act({ selector: boton.selector, description: boton.description, method: 'click', arguments: [] }, { timeout: TIMEOUT_IA }), ctx.tiempos);
      ctx.salida.acciones.push(r3);
      const fallidas = [r1, r2, r3].filter((r) => !r.success);
      if (fallidas.length) throw new Error(`act falló: ${fallidas.map((f) => f.message).join(' | ')}`);
      await esperarTexto(page, '[data-testid="tarjeta-equipo"] h3', nombre, 20_000);
      const equipos = await api('GET', '/equipos', { token: usuario.token });
      const creado = equipos.find((e) => normalizar(e.nombre) === normalizar(nombre));
      if (!creado) throw new Error(`GET /equipos no contiene «${nombre}»: ${JSON.stringify(equipos.map((e) => e.nombre))}`);
      ctx.datos.equipoId = creado.id;
      return `Las 3 llamadas a act tuvieron éxito (${[r1, r2, r3].map((r) => `«${r.actionDescription}»`).join(', ')}); GET /equipos devuelve «${creado.nombre}» (id ${creado.id}) y la tarjeta se muestra en «Mis equipos».`;
    },
  },
  {
    id: 'ST-05', capacidad: 'observe+act', tipo: 'exitoso', funcionalidad: 'Tareas / tablero',
    nombre: 'observe + act: reconocer las columnas del tablero y mover una tarea a «Hecho»',
    objetivo: 'Verificar que observe reconoce las columnas del tablero Kanban y que act abre una tarjeta y cambia su columna mediante el selector «Columna» del detalle, persistiendo el cambio en el backend.',
    esperado: 'observe devuelve acciones que mencionan «Por Hacer», «En Progreso» y «Hecho»; tras act la tarea queda en la lista «Hecho» según GET /tareas?proyectoId y el progreso pasa a 100 %.',
    async ejecutar(ctx) {
      const usuario = await nuevoUsuario('Ana');
      const equipo = await api('POST', '/equipos', { token: usuario.token, body: { nombre: `Equipo Tablero ${sufijo().slice(-5)}` } });
      const proyecto = await api('POST', '/proyectos', { token: usuario.token, body: { nombre: `Proyecto IA ${sufijo().slice(-5)}`, equipoId: equipo.id } });
      const titulo = `Revisar informe ${sufijo().slice(-5)}`;
      const tarea = await api('POST', '/tareas', { token: usuario.token, body: { titulo, proyectoId: proyecto.id } });
      const listas = await api('GET', `/listas/proyecto/${proyecto.id}`, { token: usuario.token });
      ctx.datos = { proyectoId: proyecto.id, tareaId: tarea.id, titulo, listas: listas.map((l) => l.nombre) };
      await abrirSesionEnNavegador(page, usuario);
      await page.goto(`${FRONT}/proyectos/${proyecto.id}`, { waitUntil: 'load' });
      await esperarTexto(page, '[data-testid="abrir-tarea"]', titulo, 20_000);
      const columnas = await cronometrar('observe', () => stagehand.observe('Find the heading of each column of the kanban board', { timeout: TIMEOUT_IA, selector: 'xpath=//*[@aria-label="Columnas del tablero"]' }), ctx.tiempos);
      const descritas = [];
      for (const c of columnas) descritas.push({ ...c, ...(await describirSelector(page, c.selector)) });
      const textoColumnas = normalizar(descritas.map((c) => `${c.description} ${c.texto ?? ''}`).join(' | '));
      const reconocidas = ['Por Hacer', 'En Progreso', 'Hecho'].filter((n) => textoColumnas.includes(normalizar(n)));
      ctx.salida = { columnasObservadas: descritas, columnasReconocidas: reconocidas, acciones: [] };
      const r1 = await cronometrar('act abrir tarjeta', () => stagehand.act(`Click the task card titled "${titulo}" to open its details`, { timeout: TIMEOUT_IA }), ctx.tiempos);
      ctx.salida.acciones.push(r1);
      await esperarSelector(page, '[role="dialog"] select');
      // El modelo local no resuelve bien las instrucciones de «dropdown»; se aplica el patrón «observe → act(acción)»:
      // observe localiza el <select> dentro de la ventana y act ejecuta selectOptionFromDropdown con el valor «Hecho».
      const frases = [
        'Find the "Columna" dropdown (select element) in the task details dialog',
        'Find the combobox labeled "Columna"',
      ];
      let descritosSel = [];
      ctx.salida.intentosSelector = [];
      for (const frase of frases) {
        try {
          const selectores = await cronometrar('observe selector', () => stagehand.observe(frase, { timeout: TIMEOUT_IA, selector: 'xpath=//*[@role="dialog"]' }), ctx.tiempos);
          descritosSel = [];
          for (const s of selectores) descritosSel.push({ ...s, ...(await describirSelector(page, s.selector)) });
          ctx.salida.intentosSelector.push({ frase, resultado: descritosSel });
          if (descritosSel.some((s) => s.tag === 'select')) break;
        } catch (e) {
          // Respuesta del modelo que no cumple el esquema de Stagehand: se registra y se reintenta con otra frase
          ctx.salida.intentosSelector.push({ frase, error: String(e?.message ?? e).slice(0, 200) });
        }
      }
      const desplegable = descritosSel.find((s) => s.tag === 'select') ?? descritosSel[0];
      if (!desplegable) throw new Error(`observe no encontró el desplegable «Columna» tras ${frases.length} intentos: ${JSON.stringify(ctx.salida.intentosSelector)}`);
      const r2 = await cronometrar('act seleccionar', () => stagehand.act({ selector: desplegable.selector, description: desplegable.description, method: 'selectOptionFromDropdown', arguments: ['Hecho'] }, { timeout: TIMEOUT_IA }), ctx.tiempos);
      ctx.salida.acciones.push(r2);
      if (!r1.success || !r2.success) throw new Error(`act falló: ${[r1, r2].filter((r) => !r.success).map((r) => r.message).join(' | ')}`);
      if (reconocidas.length < 3) throw new Error(`observe solo reconoció ${JSON.stringify(reconocidas)}: ${JSON.stringify(descritas.map((d) => d.description))}`);
      const hecho = listas.find((l) => normalizar(l.nombre) === 'hecho');
      let tareaFinal;
      for (let i = 0; i < 20; i++) {
        const tareas = await api('GET', `/tareas?proyectoId=${proyecto.id}`, { token: usuario.token });
        tareaFinal = tareas.find((t) => t.id === tarea.id);
        if (tareaFinal?.listaId === hecho.id) break;
        await page.waitForTimeout(500);
      }
      if (tareaFinal?.listaId !== hecho.id) throw new Error(`La tarea sigue en la lista ${tareaFinal?.listaId} (Hecho = ${hecho.id})`);
      try { await page.locator('[role="dialog"] button:has-text("Cerrar")').first().click(); } catch { /* opcional */ }
      await page.waitForTimeout(600);
      let progreso = null;
      try { progreso = await page.evaluate(() => document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')); } catch { /* opcional */ }
      return `observe describió ${columnas.length} elementos y reconoció las columnas ${reconocidas.map((c) => `«${c}»`).join(', ')}; act abrió la tarjeta («${r1.actionDescription}») y seleccionó «Hecho» («${r2.actionDescription}»); la API confirma listaId = «Hecho»${progreso != null ? ` y la barra de progreso marca ${progreso} %` : ''}.`;
    },
  },
  {
    id: 'ST-06', capacidad: 'extract', tipo: 'exitoso', funcionalidad: 'Listas / proyectos',
    nombre: 'extract con esquema: columnas, tareas por columna y progreso del tablero',
    objetivo: 'Verificar que extract devuelve una estructura anidada validada con zod (columnas con sus tareas y el porcentaje de progreso) y que coincide con el estado real del proyecto en la API.',
    esperado: 'extract devuelve 3 columnas «Por Hacer», «En Progreso» y «Hecho» con los títulos exactos de las tareas de cada una y progreso = 50 (1 de 2 tareas hechas).',
    async ejecutar(ctx) {
      const usuario = await nuevoUsuario('Ana');
      const equipo = await api('POST', '/equipos', { token: usuario.token, body: { nombre: `Equipo Extract ${sufijo().slice(-5)}` } });
      const proyecto = await api('POST', '/proyectos', { token: usuario.token, body: { nombre: `Proyecto Extract ${sufijo().slice(-5)}`, equipoId: equipo.id } });
      const listas = await api('GET', `/listas/proyecto/${proyecto.id}`, { token: usuario.token });
      const porNombre = (n) => listas.find((l) => normalizar(l.nombre) === normalizar(n));
      await api('POST', '/tareas', { token: usuario.token, body: { titulo: 'Diseñar la pantalla de inicio', proyectoId: proyecto.id } });
      const t2 = await api('POST', '/tareas', { token: usuario.token, body: { titulo: 'Escribir las pruebas', proyectoId: proyecto.id } });
      await api('PATCH', `/tareas/${t2.id}/mover`, { token: usuario.token, body: { nuevaListaId: porNombre('Hecho').id } });
      const tareas = await api('GET', `/tareas?proyectoId=${proyecto.id}`, { token: usuario.token });
      const real = {
        columnas: listas.map((l) => ({ nombre: l.nombre, tareas: tareas.filter((t) => t.listaId === l.id).map((t) => t.titulo) })),
        progreso: 50,
      };
      ctx.datos = { proyectoId: proyecto.id, real };
      await abrirSesionEnNavegador(page, usuario);
      await page.goto(`${FRONT}/proyectos/${proyecto.id}`, { waitUntil: 'load' });
      await esperarTexto(page, '[data-testid="abrir-tarea"]', 'Escribir las pruebas', 20_000);
      // Un modelo pequeño no rellena bien estructuras anidadas sobre toda la página: se extrae columna a columna
      // limitando el árbol de accesibilidad con `selector`, y el progreso en una llamada aparte.
      const esquemaColumna = z.object({
        nombre: z.string().describe('the column heading text'),
        tareas: z.array(z.string()).describe('titles of the task cards inside this column; return an empty array when the column shows the placeholder "Sin tareas en esta columna" (that placeholder is not a task)'),
      });
      const esquemaProgreso = z.object({ progreso: z.number().describe('project progress percentage shown next to "Progreso"') });
      const datos = { columnas: [], progreso: null };
      ctx.salida = { extraido: datos, real };
      for (const lista of listas) {
        // Cada columna es un <section aria-labelledby="columna-<id>">; el xpath debe ser simple (sin paréntesis).
        const columna = await cronometrar(`extract columna ${lista.nombre}`, () => stagehand.extract(
          'Extract the heading of this kanban column and the titles of the task cards it contains',
          esquemaColumna,
          // ignoreSelectors (CSS) excluye del árbol los botones «Asignar miembros a la tarea …», que el modelo confundía con tareas
          { timeout: TIMEOUT_IA, selector: `xpath=//section[@aria-labelledby="columna-${lista.id}"]`, ignoreSelectors: ['button[aria-label^="Asignar miembros"]', 'button[aria-label^="Agregar tarea"]'] },
        ), ctx.tiempos);
        datos.columnas.push(columna);
      }
      const { progreso } = await cronometrar('extract progreso', () => stagehand.extract(
        'Extract the project progress percentage shown next to "Progreso"',
        esquemaProgreso,
        { timeout: TIMEOUT_IA, selector: 'xpath=//*[@role="progressbar"]/..' },
      ), ctx.tiempos);
      datos.progreso = progreso;
      const errores = [];
      // El texto de la columna vacía («Sin tareas en esta columna» / «Arrastra una tarea aquí…») no es una tarea:
      // si el modelo lo devuelve como tal se descarta y se deja constancia (limitación del modelo local).
      const marcadores = ['sin tareas en esta columna', 'arrastra una tarea aquí o crea una nueva', 'arrastra una tarea aquí o crea una nueva.'];
      let marcadoresDescartados = 0;
      const colsExtraidas = (datos.columnas ?? []).map((c) => ({
        nombre: normalizar(c.nombre),
        tareas: (c.tareas ?? []).map(normalizar).filter((t) => { const esMarcador = marcadores.includes(t); if (esMarcador) marcadoresDescartados += 1; return !esMarcador; }),
      }));
      ctx.salida.marcadoresDescartados = marcadoresDescartados;
      for (const col of real.columnas) {
        const e = colsExtraidas.find((c) => c.nombre === normalizar(col.nombre) || c.nombre.includes(normalizar(col.nombre)));
        if (!e) { errores.push(`falta la columna «${col.nombre}»`); continue; }
        const esperadas = col.tareas.map(normalizar).sort();
        const obtenidas = [...e.tareas].sort();
        if (JSON.stringify(esperadas) !== JSON.stringify(obtenidas)) errores.push(`columna «${col.nombre}»: esperado ${JSON.stringify(col.tareas)}, extraído ${JSON.stringify(e.tareas)}`);
      }
      if (Number(datos.progreso) !== 50) errores.push(`progreso extraído ${datos.progreso} (esperado 50)`);
      if (errores.length) throw new Error(errores.join('; '));
      return `extract devolvió ${datos.columnas.length} columnas (${colsExtraidas.map((c) => `«${c.nombre}»: ${c.tareas.length} tarea(s)`).join(', ')}) y progreso ${datos.progreso}; coincide con la API (1 de 2 tareas en «Hecho»)${marcadoresDescartados ? `. Nota: el modelo devolvió ${marcadoresDescartados} texto(s) de columna vacía como si fueran tareas; se descartaron` : ''}.`;
    },
  },
  {
    id: 'ST-07', capacidad: 'act', tipo: 'error', funcionalidad: 'Robustez de la IA',
    nombre: 'act con una instrucción imposible: el botón «Exportar a PDF» no existe',
    objetivo: 'Verificar que una instrucción imposible no produce efectos colaterales en la aplicación: la página debe quedar exactamente igual (misma ruta, mismo contenido, ninguna ventana). Además se registra cómo responde el modelo (success=false, error controlado o alucinación de un elemento).',
    esperado: 'La huella de la página (ruta + texto visible) es idéntica antes y después de act y no hay ventanas abiertas. Comportamiento ideal del modelo: success=false o error controlado; si informa success=true sobre un elemento que no es un botón se documenta como alucinación.',
    async ejecutar(ctx) {
      const usuario = await nuevoUsuario('Ana');
      await abrirSesionEnNavegador(page, usuario);
      await page.goto(`${FRONT}/`, { waitUntil: 'load' });
      await esperarTexto(page, 'h1', 'Mis equipos');
      const huella = () => page.evaluate(() => `${location.pathname}|${document.body.innerText.replace(/\s+/g, ' ').trim()}|dialogos=${document.querySelectorAll('[role="dialog"],[role="alertdialog"]').length}`);
      const antes = await huella();
      let resultado = null;
      let error = null;
      try {
        resultado = await cronometrar('act', () => stagehand.act('Click the "Exportar a PDF" button', { timeout: TIMEOUT_IA }), ctx.tiempos);
      } catch (e) { error = String(e?.message ?? e); }
      await page.waitForTimeout(1000);
      const despues = await huella();
      const elemento = resultado?.actions?.[0]?.selector ? await describirSelector(page, resultado.actions[0].selector) : null;
      const alucinacion = Boolean(resultado?.success);
      ctx.salida = { act: resultado, error, elementoPulsado: elemento, huellaAntes: antes.slice(0, 300), huellaDespues: despues.slice(0, 300), alucinacion };
      if (antes !== despues) throw new Error(`La página cambió tras la instrucción imposible. Antes: ${antes.slice(0, 200)} | Después: ${despues.slice(0, 200)}`);
      if (alucinacion) {
        return `Sin efectos colaterales: la huella de la página es idéntica antes y después y no se abrió ninguna ventana. El modelo, sin embargo, alucinó: informó success=true tras pulsar <${elemento?.tag}> «${elemento?.texto ?? ''}» (descrito como «${resultado.actions[0].description}»), un elemento sin acción asociada; se registra como limitación del modelo local.`;
      }
      return resultado
        ? `Sin efectos colaterales (huella idéntica). act devolvió success=false con el mensaje «${resultado.message}».`
        : `Sin efectos colaterales (huella idéntica). act lanzó un error controlado («${error.slice(0, 160)}»).`;
    },
  },
];

// ---------- ejecución ----------
const resultados = [];
for (const caso of casos.filter((c) => !SOLO || SOLO.includes(c.id))) {
  const ctx = { tiempos: [], salida: null, datos: null };
  const inicio = Date.now();
  let obtenido;
  let estado;
  console.log(`\n> ${caso.id} ${caso.nombre}`);
  try {
    obtenido = await caso.ejecutar(ctx);
    estado = 'Aprobado';
  } catch (e) {
    obtenido = `No conforme: ${String(e?.message ?? e).replace(/\s+/g, ' ').slice(0, 700)}`;
    estado = 'Fallido';
  }
  const duracionSeg = seg(Date.now() - inicio);
  const evidencia = [];
  try { evidencia.push(await capturar(page, caso.id)); } catch (e) { console.warn('sin captura:', e.message); }
  evidencia.push(guardarSalida(caso.id, { id: caso.id, instruccionesYRespuestas: ctx.salida, datosDePrueba: ctx.datos, tiemposIA: ctx.tiempos, estado, obtenido }));
  console.log(`  ${estado} en ${duracionSeg} s · IA: ${ctx.tiempos.map((t) => `${t.paso} ${t.seg}s`).join(', ')}`);
  console.log(`  ${obtenido}`);
  resultados.push({
    id: caso.id, nombre: caso.nombre, capacidad: caso.capacidad, tipo: caso.tipo, funcionalidad: caso.funcionalidad,
    objetivo: caso.objetivo, esperado: caso.esperado, obtenido, estado, duracionSeg, tiemposIA: ctx.tiempos, evidencia,
  });
}

await stagehand.close();

// Registros de inferencia de Stagehand (prompts y respuestas del modelo)
if (existsSync(join(RAIZ, 'inference_summary'))) {
  cpSync(join(RAIZ, 'inference_summary'), join(EVID, 'inferencias'), { recursive: true });
  for (const r of resultados) r.evidencia.push('inferencias/');
}
if (existsSync(join(EVID, 'respuestas-modelo.jsonl'))) for (const r of resultados) r.evidencia.push('respuestas-modelo.jsonl');

// Metadatos del modelo y del entorno
let versionOllama = 'desconocida';
try { versionOllama = (await (await fetch(`${OLLAMA_URL.replace(/\/api\/?$/, '')}/api/version`)).json()).version; } catch { /* sin datos */ }
const version = (p) => JSON.parse(readFileSync(join(RAIZ, 'node_modules', ...p.split('/'), 'package.json'), 'utf8')).version;
const cpu = os.cpus()[0]?.model?.trim();
const totalSeg = seg(Date.now() - inicioTotal);
const segIA = resultados.flatMap((r) => r.tiemposIA).reduce((s, t) => s + t.seg, 0);

const resumen = {
  area: 'E2E con Stagehand e IA',
  herramienta: `Stagehand ${version('@browserbasehq/stagehand')} + Ollama ${versionOllama} (${NOMBRE_MODELO}, local, sin coste)`,
  modelo: {
    proveedor: 'ollama (ollama-ai-provider-v2 a través del AI SDK de Vercel)',
    modelName: NOMBRE_MODELO,
    baseURL: OLLAMA_URL,
    temperatura: 0,
    middleware: 'modelo.mjs: normaliza elementId con corchetes y bloques ```json antes de la validación zod de Stagehand',
    correcciones,
  },
  comando: 'cd pruebas/stagehand && npm test',
  fecha: new Date().toISOString(),
  condiciones: `${os.type()} ${os.release()} ${os.arch()}; ${cpu} (${os.cpus().length} hilos); ${(os.totalmem() / 1073741824).toFixed(1)} GB RAM; Node ${process.version}; Chrome local en modo headless (${CHROME}); frontend ${FRONT}, backend ${API}; inferencia local (sin GPU dedicada), por lo que cada llamada al modelo tarda entre 10 y 120 s según el tamaño del árbol de accesibilidad. Datos únicos por caso creados por API (usuarios, equipos, proyectos y tareas con sufijo temporal).`,
  totales: {
    total: resultados.length,
    aprobados: resultados.filter((r) => r.estado === 'Aprobado').length,
    fallidos: resultados.filter((r) => r.estado === 'Fallido').length,
    duracionSeg: totalSeg,
    segundosEnInferencia: Number(segIA.toFixed(1)),
  },
  capacidades: {
    act: resultados.filter((r) => r.capacidad.includes('act')).length,
    observe: resultados.filter((r) => r.capacidad.includes('observe')).length,
    extract: resultados.filter((r) => r.capacidad.includes('extract')).length,
  },
  entorno: { frontend: FRONT, backend: API, ollama: OLLAMA_URL },
  casos: resultados,
};
writeFileSync(join(EVID, 'resumen.json'), JSON.stringify(resumen, null, 2) + '\n', 'utf8');
console.log(`\nResumen: ${resumen.totales.aprobados}/${resumen.totales.total} aprobados en ${totalSeg} s (${segIA.toFixed(0)} s de inferencia) -> ${join(EVID, 'resumen.json')}`);
process.exit(resumen.totales.fallidos ? 1 : 0);
