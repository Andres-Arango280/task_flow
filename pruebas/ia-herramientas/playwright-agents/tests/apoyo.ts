// Apoyo común de las pruebas generadas: datos únicos y preparación por API,
// tal como recomienda el plan (cada escenario crea sus propios datos).
import { expect, request, type Page } from '@playwright/test';

export const API = process.env.TASKFLOW_API_URL ?? 'http://localhost:3000';

export interface Usuario { nombre: string; email: string; password: string }
export interface Sesion { token: string; user: { id: string; nombre: string; email: string } }

let contador = 0;
export const unico = (prefijo: string) => `${prefijo} ${Date.now()}${(contador++).toString().padStart(2, '0')}`;

export function usuarioUnico(prefijo = 'agente'): Usuario {
  const marca = `${Date.now()}${(contador++).toString().padStart(2, '0')}`;
  return { nombre: `Usuario ${prefijo} ${marca.slice(-6)}`, email: `${prefijo}.${marca}@taskflow-agents.test`, password: 'Clave-Segura-123' };
}

export async function registrarPorApi(usuario: Usuario): Promise<Sesion> {
  const api = await request.newContext({ baseURL: API });
  const reg = await api.post('/auth/register', { data: usuario });
  expect(reg.status(), 'registro por API').toBe(201);
  const login = await api.post('/auth/login', { data: { email: usuario.email, password: usuario.password } });
  expect([200, 201]).toContain(login.status());
  const { access_token: token } = await login.json();
  const yo = await (await api.get('/usuarios/me', { headers: { Authorization: `Bearer ${token}` } })).json();
  await api.dispose();
  return { token, user: { id: yo.id, nombre: yo.nombre, email: yo.email } };
}

export async function apiAutenticada(token: string) {
  return request.newContext({ baseURL: API, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
}

export async function crearEquipoPorApi(token: string, nombre: string): Promise<{ id: string; nombre: string }> {
  const api = await apiAutenticada(token);
  const r = await api.post('/equipos', { data: { nombre } });
  expect(r.status(), 'crear equipo por API').toBe(201);
  const equipo = await r.json();
  await api.dispose();
  return equipo;
}

export async function crearProyectoPorApi(token: string, equipoId: string, nombre: string): Promise<{ id: string; nombre: string }> {
  const api = await apiAutenticada(token);
  const r = await api.post('/proyectos', { data: { nombre, equipoId } });
  expect(r.status(), 'crear proyecto por API').toBe(201);
  const proyecto = await r.json();
  await api.dispose();
  return proyecto;
}

/** Deja la sesión en localStorage con el mismo formato que usa la aplicación (useAuthStore). */
export async function abrirSesionEnNavegador(page: Page, sesion: Sesion) {
  await page.goto('/login');
  await page.evaluate(([token, user]) => {
    localStorage.setItem('access_token', token as string);
    localStorage.setItem('user', JSON.stringify(user));
  }, [sesion.token, sesion.user] as const);
}
