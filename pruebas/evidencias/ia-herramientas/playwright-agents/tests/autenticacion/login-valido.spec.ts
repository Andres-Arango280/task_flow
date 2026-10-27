// spec: specs/plan-de-pruebas.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { registrarPorApi, usuarioUnico } from '../apoyo';

test.describe('Autenticación', () => {
  test('Inicio de sesión con credenciales válidas', async ({ page }) => {
    // 1. Crear un usuario por API.
    const usuario = usuarioUnico('login');
    await registrarPorApi(usuario);

    // 2. Navegar a /login, escribir correo y contraseña y pulsar «Iniciar sesión».
    await page.goto('/login');
    await page.getByLabel(/Correo electrónico/).fill(usuario.email);
    await page.getByLabel(/^Contraseña/).fill(usuario.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    // Expected: URL /, h1 «Mis equipos» y título de pestaña «Mis equipos · TaskFlow».
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Mis equipos' })).toBeVisible();
    await expect(page).toHaveTitle('Mis equipos · TaskFlow');
  });
});
