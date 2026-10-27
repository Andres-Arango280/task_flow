// Exploración de la aplicación para el agente Planner: vuelca el snapshot de accesibilidad
// (ARIA) de cada página relevante, tal como lo haría browser_snapshot del MCP de Playwright.
import { chromium, request } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const UI = 'http://localhost:5173';
const API = 'http://localhost:3000';
const marca = Date.now();
const usuario = { nombre: `Planner ${marca}`, email: `planner.${marca}@taskflow-agents.test`, password: 'Clave-Segura-123' };

const api = await request.newContext({ baseURL: API });
let r = await api.post('/auth/register', { data: usuario });
if (!r.ok()) throw new Error(`registro ${r.status()}`);
r = await api.post('/auth/login', { data: { email: usuario.email, password: usuario.password } });
const { access_token: token } = await r.json();
const auth = { Authorization: `Bearer ${token}` };
const yo = await (await api.get('/usuarios/me', { headers: auth })).json();
const equipo = await (await api.post('/equipos', { headers: auth, data: { nombre: `Equipo Planner ${marca}` } })).json();
const proyecto = await (await api.post('/proyectos', { headers: auth, data: { nombre: `Proyecto Planner ${marca}`, equipoId: equipo.id } })).json();
await api.post('/tareas', { headers: auth, data: { titulo: 'Tarea de ejemplo', descripcion: 'Explorada por el planner', proyectoId: proyecto.id } });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ baseURL: UI, locale: 'es-ES', viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
mkdirSync('specs/exploracion', { recursive: true });

async function volcar(nombre, ruta, opciones = {}) {
  await page.goto(ruta);
  if (opciones.esperar) await page.getByText(opciones.esperar).first().waitFor();
  await page.waitForTimeout(500);
  const aria = await page.locator('body').ariaSnapshot();
  writeFileSync(`specs/exploracion/${nombre}.txt`, `# ${ruta}\n# título: ${await page.title()}\n\n${aria}\n`, 'utf8');
  await page.screenshot({ path: `specs/exploracion/${nombre}.png`, fullPage: true });
  console.log(`✔ ${nombre} (${ruta})`);
}

await volcar('01-login', '/login', { esperar: 'Iniciar sesión' });
await volcar('02-registro', '/register', { esperar: 'Crear cuenta' });
// Sesión como la guarda la app (localStorage)
await page.goto('/login');
await page.evaluate(([t, u]) => { localStorage.setItem('access_token', t); localStorage.setItem('user', JSON.stringify(u)); }, [token, { id: yo.id, nombre: yo.nombre, email: yo.email }]);
await volcar('03-mis-equipos', '/', { esperar: 'Mis equipos' });
await volcar('04-equipo', `/equipos/${equipo.id}`, { esperar: 'Miembros' });
await volcar('05-tablero', `/proyectos/${proyecto.id}`, { esperar: 'Por Hacer' });
// Ventanas modales
await page.goto('/');
await page.getByRole('button', { name: /Nuevo equipo/ }).click();
await page.getByRole('dialog').waitFor();
writeFileSync('specs/exploracion/06-modal-nuevo-equipo.txt', await page.getByRole('dialog').ariaSnapshot(), 'utf8');
await page.goto(`/proyectos/${proyecto.id}`);
await page.getByRole('button', { name: /Nueva tarea/ }).click();
await page.getByRole('dialog').waitFor();
writeFileSync('specs/exploracion/07-modal-nueva-tarea.txt', await page.getByRole('dialog').ariaSnapshot(), 'utf8');
await page.keyboard.press('Escape');
await page.getByText('Tarea de ejemplo').first().click();
await page.getByRole('dialog').waitFor();
writeFileSync('specs/exploracion/08-detalle-tarea.txt', await page.getByRole('dialog').ariaSnapshot(), 'utf8');
await volcar('09-preferencias', '/preferencias', { esperar: 'Preferencias' });
await browser.close();
await api.dispose();
console.log('Exploración guardada en specs/exploracion/');
