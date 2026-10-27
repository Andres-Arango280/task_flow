// Playwright MCP + asistente de IA local (Ollama llama3.1:8b).
//
// Este cliente hace el papel que normalmente hace GitHub Copilot / Claude: se conecta al servidor MCP de
// Playwright (@playwright/mcp) por stdio, le pide la lista de herramientas, expone un subconjunto al modelo
// mediante "tool calling" nativo de Ollama (POST /api/chat con `tools`) y ejecuta en bucle lo que el modelo
// decide (navegar, tomar snapshot de accesibilidad, escribir, pulsar...). Al final, el script VERIFICA en
// código el estado real del navegador (snapshot) para no depender de lo que afirme el modelo.
//
// Uso: node cliente.mjs            (todos los casos)
//      node cliente.mjs MCP-02     (un caso)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const SALIDAS = join(RAIZ, 'salidas');
const EVID = resolve(RAIZ, '..', '..', 'evidencias', 'ia-herramientas', 'playwright-mcp');
const UI = process.env.TASKFLOW_URL ?? 'http://localhost:5173';
const API = process.env.TASKFLOW_API_URL ?? 'http://localhost:3000';
const OLLAMA = process.env.OLLAMA_HOST_URL ?? 'http://localhost:11434';
const MODELO = process.env.OLLAMA_MODEL ?? 'llama3.1:8b';
const MAX_TURNOS = Number(process.env.MCP_MAX_TURNOS ?? 12);
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const require = createRequire(import.meta.url);
const version = (p) => require(`${p}/package.json`).version;

// Herramientas esenciales que se exponen al modelo (menos herramientas = decisiones más fiables en un modelo 8B)
const HERRAMIENTAS = ['browser_navigate', 'browser_snapshot', 'browser_click', 'browser_type', 'browser_fill_form', 'browser_wait_for', 'browser_take_screenshot'];

const SISTEMA = `You are a QA automation agent controlling a real web browser through tools (Playwright MCP).
Rules:
1. Call exactly ONE tool per turn. Never answer with text while the task is unfinished.
2. Before clicking or typing, ALWAYS call browser_snapshot to see the page. The snapshot lists elements like: textbox "Correo electrónico (obligatorio)" [ref=e12]. Use that ref string (e.g. "e12") as the "target" argument of browser_click / browser_type / browser_fill_form, and the quoted name as "element".
3. Use browser_type with {"target","element","text"} to fill a field (submit=false). Use browser_click with {"target","element"} to press a button.
4. After the final action, call browser_snapshot once more to check the result.
5. When the task is complete (or impossible), answer ONLY with this JSON and nothing else:
{"resultado": "<what you observed, in Spanish>", "exito": true|false}
Be literal: use the exact texts given in the task. Do not invent URLs or elements that are not in the snapshot.`;

// ---------- utilidades ----------
const marca = () => `${Date.now()}${Math.floor(Math.random() * 100)}`;
async function api(metodo, ruta, cuerpo, token) {
  const r = await fetch(API + ruta, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}
async function registrar(prefijo) {
  const m = marca();
  const usuario = { nombre: `Usuario ${prefijo} ${m.slice(-6)}`, email: `${prefijo}.${m}@taskflow-mcp.test`, password: 'Clave-Segura-123' };
  const reg = await api('POST', '/auth/register', usuario);
  if (reg.status !== 201) throw new Error(`registro ${reg.status}`);
  const login = await api('POST', '/auth/login', { email: usuario.email, password: usuario.password });
  return { usuario, token: login.body.access_token };
}
const recortar = (texto, max = 7000) => (texto.length > max ? `${texto.slice(0, max)}\n…[recortado ${texto.length - max} caracteres]` : texto);
const textoDe = (resultado) => (resultado.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');

async function chatOllama(mensajes, tools) {
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    signal: AbortSignal.timeout(15 * 60_000),
    body: JSON.stringify({ model: MODELO, stream: false, messages: mensajes, tools, options: { temperature: 0, num_ctx: 16384 } }),
  });
  if (!r.ok) throw new Error(`Ollama ${r.status}: ${await r.text()}`);
  return r.json();
}

// ---------- servidor MCP ----------
async function conectarMcp() {
  const args = [join(RAIZ, 'node_modules', '@playwright', 'mcp', 'cli.js'), '--headless', '--viewport-size', '1280x720', '--isolated'];
  if (existsSync(CHROME)) args.push('--executable-path', CHROME); else args.push('--browser', 'chrome');
  const transport = new StdioClientTransport({ command: process.execPath, args });
  const client = new Client({ name: 'taskflow-cliente-ollama', version: '1.0.0' });
  await client.connect(transport);
  const { tools } = await client.listTools();
  const expuestas = tools.filter((t) => HERRAMIENTAS.includes(t.name)).map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
  return { client, todas: tools.map((t) => t.name), expuestas };
}

// ---------- bucle agente ----------
async function ejecutarCaso(caso) {
  const inicio = Date.now();
  const { client, todas, expuestas } = await conectarMcp();
  const contexto = caso.preparar ? await caso.preparar() : {};
  const tarea = caso.tarea(contexto);
  const transcripcion = [{ rol: 'system', contenido: SISTEMA }, { rol: 'user', contenido: tarea }];
  const mensajes = [{ role: 'system', content: SISTEMA }, { role: 'user', content: tarea }];
  const llamadas = [];
  let respuestaFinal = null;
  let error = null;
  try {
    for (let turno = 1; turno <= MAX_TURNOS; turno++) {
      const t0 = Date.now();
      const respuesta = await chatOllama(mensajes, expuestas);
      const msg = respuesta.message;
      const segLlm = ((Date.now() - t0) / 1000).toFixed(1);
      mensajes.push(msg);
      if (!msg.tool_calls?.length) {
        transcripcion.push({ turno, rol: 'assistant', contenido: msg.content, segundosLlm: Number(segLlm) });
        respuestaFinal = msg.content;
        break;
      }
      for (const llamada of msg.tool_calls) {
        const nombre = llamada.function.name;
        let argumentos = llamada.function.arguments ?? {};
        if (typeof argumentos === 'string') { try { argumentos = JSON.parse(argumentos); } catch { /* se envía tal cual */ } }
        if (nombre === 'browser_take_screenshot') argumentos = { ...argumentos, scale: 'css', filename: join(SALIDAS, `${caso.id}-modelo-${turno}.png`) };
        let salida;
        try {
          const resultado = await client.callTool({ name: nombre, arguments: argumentos });
          salida = textoDe(resultado) || JSON.stringify(resultado).slice(0, 2000);
          if (resultado.isError) salida = `ERROR: ${salida}`;
        } catch (e) {
          salida = `ERROR: ${e.message}`;
        }
        llamadas.push({ turno, herramienta: nombre, argumentos });
        transcripcion.push({ turno, rol: 'assistant→tool', herramienta: nombre, argumentos, segundosLlm: Number(segLlm) });
        transcripcion.push({ turno, rol: 'tool', herramienta: nombre, contenido: recortar(salida, 3000) });
        mensajes.push({ role: 'tool', tool_name: nombre, content: recortar(salida) });
        console.log(`  [${caso.id}] turno ${turno}: ${nombre}(${JSON.stringify(argumentos).slice(0, 110)}) · LLM ${segLlm}s`);
      }
    }
  } catch (e) {
    error = e.message;
    transcripcion.push({ rol: 'error', contenido: e.message });
  }

  // Verificación en código con el estado real del navegador
  let snapshotFinal = '';
  let urlFinal = '';
  try {
    const s = await client.callTool({ name: 'browser_snapshot', arguments: {} });
    snapshotFinal = textoDe(s);
    urlFinal = (snapshotFinal.match(/Page URL:\s*(\S+)/) ?? [])[1] ?? '';
    await client.callTool({ name: 'browser_take_screenshot', arguments: { scale: 'css', filename: join(SALIDAS, `${caso.id}-final.png`) } });
  } catch (e) {
    snapshotFinal = `ERROR al obtener el snapshot final: ${e.message}`;
  }
  await client.close().catch(() => {});

  let json = null;
  try { json = JSON.parse((respuestaFinal ?? '').match(/\{[\s\S]*\}/)?.[0] ?? 'null'); } catch { json = null; }
  const verificacion = await caso.verificar({ ...contexto, snapshotFinal, urlFinal, json, respuestaFinal, llamadas });
  const estado = verificacion.ok ? 'Aprobado' : 'Fallido';
  const duracionSeg = Number(((Date.now() - inicio) / 1000).toFixed(1));
  const herramientasUsadas = [...new Set(llamadas.map((l) => l.herramienta))];
  const obtenido = `${verificacion.ok ? 'Conforme' : 'No conforme'}: ${verificacion.detalle} El modelo hizo ${llamadas.length} llamadas a herramientas (${herramientasUsadas.join(', ') || 'ninguna'}) en ${transcripcion.filter((t) => t.rol === 'assistant→tool' || t.rol === 'assistant').length} turnos y respondió: ${JSON.stringify(respuestaFinal ?? '(sin respuesta final)').slice(0, 300)}.${error ? ` Error: ${error}` : ''}`;

  mkdirSync(SALIDAS, { recursive: true });
  writeFileSync(join(SALIDAS, `${caso.id}-transcripcion.json`), JSON.stringify({ id: caso.id, tarea, modelo: MODELO, herramientasExpuestas: expuestas.map((t) => t.function.name), herramientasDelServidor: todas, transcripcion, urlFinal, snapshotFinal: recortar(snapshotFinal, 6000), verificacion, estado, duracionSeg }, null, 2), 'utf8');
  console.log(`[${caso.id}] ${estado} en ${duracionSeg} s — ${obtenido.slice(0, 180)}`);
  return { id: caso.id, nombre: caso.nombre, tipo: caso.tipo, objetivo: caso.objetivo, esperado: caso.esperado, tarea, obtenido, estado, duracionSeg, turnos: llamadas.length, herramientasUsadas, respuestaFinal, urlFinal, evidencia: [`salidas/${caso.id}-transcripcion.json`, ...(existsSync(join(SALIDAS, `${caso.id}-final.png`)) ? [`capturas/${caso.id}-final.png`] : [])] };
}

// ---------- casos ----------
const CASOS = [
  {
    id: 'MCP-01', tipo: 'exploratorio', nombre: 'Inspeccionar el formulario de inicio de sesión con browser_snapshot',
    objetivo: 'Comprobar que el asistente navega a /login, obtiene el snapshot de accesibilidad y enumera los campos del formulario.',
    esperado: 'El modelo usa browser_navigate y browser_snapshot y su respuesta final menciona el correo, la contraseña y el botón «Iniciar sesión».',
    tarea: () => `Task: open ${UI}/login, take an accessibility snapshot and finish. In "resultado" list, in Spanish, the heading text, the label of each textbox and the text of the submit button exactly as they appear in the snapshot.`,
    verificar: async ({ json, respuestaFinal, llamadas, snapshotFinal }) => {
      const texto = (respuestaFinal ?? '').toLowerCase();
      const usoSnapshot = llamadas.some((l) => l.herramienta === 'browser_snapshot');
      const menciona = ['correo', 'contraseña', 'iniciar sesión'].filter((t) => texto.includes(t));
      const enLogin = /Iniciar sesión/.test(snapshotFinal);
      return { ok: usoSnapshot && menciona.length === 3 && enLogin, detalle: `browser_snapshot usado: ${usoSnapshot}; menciona ${menciona.length}/3 textos esperados; página final es /login: ${enLogin}; exito declarado: ${json?.exito}.` };
    },
  },
  {
    id: 'MCP-02', tipo: 'exitoso', nombre: 'Iniciar sesión con credenciales válidas',
    objetivo: 'Comprobar que el asistente rellena el formulario con las credenciales dadas, pulsa el botón y llega a «Mis equipos».',
    esperado: 'El snapshot final (comprobado por el script) contiene el encabezado «Mis equipos» y la URL es la raíz.',
    preparar: () => registrar('mcp-login'),
    tarea: ({ usuario }) => `Task: open ${UI}/login . Type "${usuario.email}" into the textbox labeled "Correo electrónico (obligatorio)" and "${usuario.password}" into the textbox labeled "Contraseña (obligatorio)". Then click the button "Iniciar sesión". Take a snapshot and finish; put in "resultado" the text of the level-1 heading of the page you landed on.`,
    verificar: async ({ snapshotFinal, urlFinal, json }) => {
      const ok = /heading "Mis equipos"/.test(snapshotFinal);
      return { ok, detalle: `snapshot final contiene heading «Mis equipos»: ${ok}; URL final: ${urlFinal || 'desconocida'}; exito declarado por el modelo: ${json?.exito}.` };
    },
  },
  {
    id: 'MCP-03', tipo: 'error', nombre: 'Contraseña incorrecta muestra una alerta',
    objetivo: 'Comprobar que el asistente intenta iniciar sesión con una contraseña incorrecta y reporta la alerta de error.',
    esperado: 'El snapshot final contiene la alerta «El correo o la contraseña no son correctos» y la URL sigue siendo /login.',
    preparar: () => registrar('mcp-error'),
    tarea: ({ usuario }) => `Task: open ${UI}/login . Type "${usuario.email}" into the textbox labeled "Correo electrónico (obligatorio)" and "ClaveIncorrecta-999" into the textbox labeled "Contraseña (obligatorio)". Click the button "Iniciar sesión". Then take a snapshot and finish; put in "resultado" the exact text of the alert shown on the page, in Spanish, and set "exito" to true only if an error alert is visible.`,
    verificar: async ({ snapshotFinal, urlFinal, json }) => {
      const alerta = /El correo o la contraseña no son correctos/.test(snapshotFinal);
      const enLogin = urlFinal.endsWith('/login');
      return { ok: alerta && enLogin, detalle: `alerta en el snapshot final: ${alerta}; URL sigue en /login: ${enLogin}; el modelo reportó: ${JSON.stringify(json?.resultado ?? '').slice(0, 160)}.` };
    },
  },
];

// ---------- principal ----------
const seleccion = process.argv.slice(2);
const inicio = Date.now();
mkdirSync(SALIDAS, { recursive: true });
const resultados = [];
for (const caso of CASOS) {
  if (seleccion.length && !seleccion.includes(caso.id)) continue;
  resultados.push(await ejecutarCaso(caso));
}

rmSync(EVID, { recursive: true, force: true });
mkdirSync(join(EVID, 'salidas'), { recursive: true });
mkdirSync(join(EVID, 'capturas'), { recursive: true });
for (const r of resultados) {
  cpSync(join(SALIDAS, `${r.id}-transcripcion.json`), join(EVID, 'salidas', `${r.id}-transcripcion.json`));
  for (const f of ['final', 'modelo-1', 'modelo-2', 'modelo-3', 'modelo-4', 'modelo-5', 'modelo-6', 'modelo-7', 'modelo-8', 'modelo-9', 'modelo-10', 'modelo-11', 'modelo-12']) {
    const origen = join(SALIDAS, `${r.id}-${f}.png`);
    if (existsSync(origen)) { cpSync(origen, join(EVID, 'capturas', `${r.id}-${f}.png`)); if (f !== 'final') r.evidencia.push(`capturas/${r.id}-${f}.png`); }
  }
}
const resumen = {
  area: 'Pruebas con IA — Playwright MCP + asistente local',
  herramienta: `@playwright/mcp ${version('@playwright/mcp')} + @modelcontextprotocol/sdk ${version('@modelcontextprotocol/sdk')} (cliente propio en Node ${process.version})`,
  modelo: `Ollama ${MODELO} (local, sin coste) con tool calling nativo`,
  proposito: 'Que un asistente de IA inspeccione el navegador real (snapshot de accesibilidad) y ejecute acciones (navegar, escribir, pulsar) mediante el servidor MCP de Playwright, como hace GitHub Copilot en modo agente; el script verifica en código el estado final del navegador.',
  configuracion: {
    servidor: `node node_modules/@playwright/mcp/cli.js --headless --isolated --viewport-size 1280x720 --executable-path ${CHROME}`,
    herramientasExpuestas: HERRAMIENTAS,
    bucle: `máximo ${MAX_TURNOS} turnos, una herramienta por turno, temperature 0, num_ctx 16384, respuesta final en JSON {resultado, exito}`,
    verificacion: 'tras el bucle el script llama a browser_snapshot y browser_take_screenshot y comprueba el texto esperado',
  },
  comando: 'cd pruebas/ia-herramientas/playwright-mcp && node cliente.mjs',
  fecha: new Date().toISOString(),
  totales: { total: resultados.length, aprobados: resultados.filter((r) => r.estado === 'Aprobado').length, fallidos: resultados.filter((r) => r.estado !== 'Aprobado').length, duracionSeg: Number(((Date.now() - inicio) / 1000).toFixed(1)) },
  casos: resultados,
  aportes: [
    'El asistente ve la página como árbol de accesibilidad con referencias estables (ref=eN), lo que le permite actuar sin selectores escritos por una persona y detectar problemas de accesibilidad (elementos sin nombre).',
    'El protocolo MCP es abierto: el mismo servidor sirve para Copilot, Claude, Cursor o un cliente propio como este, y las herramientas son las mismas que usa Playwright (click, type, fill_form, wait_for, screenshot).',
    'Permite exploración guiada por lenguaje natural y generación de pruebas a partir de lo observado; la transcripción completa (argumentos y respuestas de cada herramienta) es en sí misma evidencia reproducible.',
  ],
  limitaciones: [
    'Un modelo local de 8B decide peor que los modelos grandes: a veces omite el snapshot previo, confunde el ref de un elemento o responde con texto en lugar de llamar a una herramienta; hubo que restringir las herramientas a 7 y dar reglas muy estrictas.',
    'Cada turno requiere enviar el snapshot completo al modelo: con páginas grandes el contexto crece y la latencia local sube a minutos por turno.',
    'El resultado declarado por el modelo no es fiable por sí solo (puede afirmar éxito sin haberlo logrado): la validación debe hacerse en código con el estado real del navegador, como se hace aquí.',
    'Sin API key de un modelo en la nube no es posible usar Copilot/Claude directamente desde el IDE, así que el "asistente" se implementó como cliente propio; el servidor MCP y el flujo son los mismos.',
  ],
};
writeFileSync(join(EVID, 'resumen.json'), JSON.stringify(resumen, null, 2), 'utf8');
console.log(`\nResumen: ${resumen.totales.aprobados}/${resumen.totales.total} aprobados → ${join(EVID, 'resumen.json')}`);
process.exit(resumen.totales.fallidos ? 1 : 0);
