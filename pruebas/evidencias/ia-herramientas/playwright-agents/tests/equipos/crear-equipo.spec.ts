// spec: specs/plan-de-pruebas.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { abrirSesionEnNavegador, registrarPorApi, unico, usuarioUnico } from '../apoyo';

test.describe('Equipos', () => {
  test('Crear un equipo desde «Mis equipos»', async ({ page }) => {
    // 1. Iniciar sesión por API y dejar la sesión en localStorage.
    const sesion = await registrarPorApi(usuarioUnico('equipo'));
    await abrirSesionEnNavegador(page, sesion);
    const nombre = unico('Equipo Agente');

    // 2. Navegar a / y pulsar «Nuevo equipo».
    await page.goto('/');
    await page.getByRole('button', { name: /Nuevo equipo/ }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nuevo equipo' });
    await expect(dialogo).toBeVisible();

    // 3. Verificar que «Crear equipo» está deshabilitado con el nombre vacío.
    await expect(dialogo.getByRole('button', { name: 'Crear equipo' })).toBeDisabled();

    // 4. Escribir un nombre único y pulsar «Crear equipo».
    await dialogo.getByLabel(/Nombre del equipo/).fill(nombre);
    await dialogo.getByRole('button', { name: 'Crear equipo' }).click();

    // Expected: aviso «Equipo «…» creado», tarjeta en la lista y «Perteneces a 1 equipo.».
    await expect(page.getByRole('status').filter({ hasText: 'creado' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: nombre })).toBeVisible();
    await expect(page.getByText('Perteneces a 1 equipo.')).toBeVisible();
  });
});
