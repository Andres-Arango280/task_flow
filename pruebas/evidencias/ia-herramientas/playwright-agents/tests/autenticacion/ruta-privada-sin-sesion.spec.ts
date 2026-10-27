// spec: specs/plan-de-pruebas.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Autenticación', () => {
  test('Ruta privada sin sesión redirige al login', async ({ page }) => {
    // 1. Sin sesión, navegar a /preferencias.
    await page.goto('/preferencias');

    // Expected: URL /login y h1 «Iniciar sesión».
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible();
  });
});
