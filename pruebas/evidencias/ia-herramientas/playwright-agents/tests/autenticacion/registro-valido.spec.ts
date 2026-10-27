// spec: specs/plan-de-pruebas.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { usuarioUnico } from '../apoyo';

test.describe('Autenticación', () => {
  test('Registro con datos válidos redirige al inicio de sesión', async ({ page }) => {
    const usuario = usuarioUnico('registro');

    // 1. Navegar a /register.
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();

    // 2. Escribir nombre, correo único y una contraseña que cumpla la política.
    await page.getByLabel(/Nombre completo/).fill(usuario.nombre);
    await page.getByLabel(/Correo electrónico/).fill(usuario.email);
    await page.getByLabel(/^Contraseña/).fill(usuario.password);
    await page.getByLabel(/Confirmar contraseña/).fill(usuario.password);

    // 3. Verificar que los cuatro requisitos pasan a «cumplido».
    for (const requisito of ['Al menos 8 caracteres', 'Al menos una letra', 'Al menos un número', 'Las dos contraseñas coinciden']) {
      await expect(page.getByRole('listitem').filter({ hasText: requisito })).toContainText('cumplido');
    }

    // 4. Pulsar «Crear cuenta».
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    // Expected: URL /login, aviso «Cuenta creada correctamente» y correo precargado.
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status').filter({ hasText: 'Cuenta creada correctamente' })).toBeVisible();
    await expect(page.getByLabel(/Correo electrónico/)).toHaveValue(usuario.email);
  });
});
