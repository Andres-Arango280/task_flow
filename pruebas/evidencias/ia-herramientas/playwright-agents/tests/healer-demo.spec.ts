// Demostración del agente Healer: esta copia de «Inicio de sesión con credenciales válidas»
// usa un localizador ROTO a propósito (como si la interfaz hubiera cambiado el id del campo).
// spec: specs/plan-de-pruebas.md  ·  seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { registrarPorApi, usuarioUnico } from './apoyo';

test.describe('Autenticación (healer)', () => {
  test('Inicio de sesión con credenciales válidas (copia para el healer)', async ({ page }) => {
    const usuario = usuarioUnico('healer');
    await registrarPorApi(usuario);

    await page.goto('/login');
    // SANADO POR EL HEALER (ver reportes/healer-diff.md): los localizadores por id/clase (#email, #password,
    // button.btn-login) no existen en el DOM; el snapshot de accesibilidad expone los campos por su etiqueta
    // visible y el botón por su nombre accesible, que son localizadores estables ante cambios de estilo.
    await page.getByLabel(/Correo electrónico/).fill(usuario.email);
    await page.getByLabel(/^Contraseña/).fill(usuario.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Mis equipos' })).toBeVisible();
  });
});
