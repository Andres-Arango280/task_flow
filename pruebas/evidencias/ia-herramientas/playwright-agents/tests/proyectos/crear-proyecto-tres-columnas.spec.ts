// spec: specs/plan-de-pruebas.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { abrirSesionEnNavegador, crearEquipoPorApi, registrarPorApi, unico, usuarioUnico } from '../apoyo';

test.describe('Proyectos', () => {
  test('Crear un proyecto genera el tablero con tres columnas', async ({ page }) => {
    // 1. Preparar usuario y equipo por API; abrir /equipos/:id.
    const sesion = await registrarPorApi(usuarioUnico('proyecto'));
    const equipo = await crearEquipoPorApi(sesion.token, unico('Equipo Proyecto'));
    await abrirSesionEnNavegador(page, sesion);
    await page.goto(`/equipos/${equipo.id}`);
    const nombre = unico('Proyecto Agente');

    // 2. Pulsar «Nuevo proyecto», escribir un nombre y pulsar «Crear proyecto».
    await page.getByRole('button', { name: /Nuevo proyecto/ }).click();
    const dialogo = page.getByRole('dialog');
    await dialogo.getByLabel(/Nombre del proyecto/).fill(nombre);
    await dialogo.getByRole('button', { name: 'Crear proyecto' }).click();

    // 3. Abrir el enlace «… Abrir tablero» del nuevo proyecto.
    await page.getByRole('link', { name: new RegExp(`${nombre}.*Abrir tablero`) }).click();

    // Expected: h1 con el nombre y regiones «Por Hacer», «En Progreso» y «Hecho» con progreso 0 %.
    await expect(page.getByRole('heading', { level: 1, name: nombre })).toBeVisible();
    for (const columna of ['Por Hacer', 'En Progreso', 'Hecho']) {
      await expect(page.getByRole('region', { name: columna, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('progressbar', { name: 'Progreso' })).toHaveAttribute('aria-valuenow', '0');
  });
});
