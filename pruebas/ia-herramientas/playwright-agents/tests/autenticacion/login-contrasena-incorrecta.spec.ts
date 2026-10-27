// spec: specs/plan-de-pruebas.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { registrarPorApi, usuarioUnico } from '../apoyo';

test.describe('Autenticación', () => {
  test('Inicio de sesión con contraseña incorrecta', async ({ page }) => {
    // 1. Crear un usuario por API.
    const usuario = usuarioUnico('login-mal');
    await registrarPorApi(usuario);

    // 2. Navegar a /login, escribir el correo y una contraseña equivocada, pulsar «Iniciar sesión».
    await page.goto('/login');
    await page.getByLabel(/Correo electrónico/).fill(usuario.email);
    await page.getByLabel(/^Contraseña/).fill('contrasena-equivocada-1');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    // Expected: alerta «El correo o la contraseña no son correctos» y se permanece en /login.
    await expect(page.getByRole('alert')).toContainText('El correo o la contraseña no son correctos');
    await expect(page).toHaveURL(/\/login$/);
  });
});
