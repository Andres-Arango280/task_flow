// spec: specs/plan-de-pruebas.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { abrirSesionEnNavegador, crearEquipoPorApi, crearProyectoPorApi, registrarPorApi, unico, usuarioUnico } from '../apoyo';

test.describe('Tablero y tareas', () => {
  test('Crear una tarea sin título es rechazado', async ({ page }) => {
    // 1. Preparar usuario, equipo y proyecto por API; abrir el tablero.
    const sesion = await registrarPorApi(usuarioUnico('sin-titulo'));
    const equipo = await crearEquipoPorApi(sesion.token, unico('Equipo Validación'));
    const proyecto = await crearProyectoPorApi(sesion.token, equipo.id, unico('Proyecto Validación'));
    await abrirSesionEnNavegador(page, sesion);
    await page.goto(`/proyectos/${proyecto.id}`);

    // 2. Pulsar «Nueva tarea» y pulsar «Crear tarea» sin escribir título.
    await page.getByRole('button', { name: /Nueva tarea/ }).click();
    const nueva = page.getByRole('dialog', { name: 'Crear nueva tarea' });
    await nueva.getByRole('button', { name: 'Crear tarea' }).click();

    // Expected: error de validación del título dentro del diálogo y ninguna tarjeta creada.
    await expect(nueva.getByRole('alert')).toBeVisible();
    await expect(nueva).toBeVisible();
    await expect(page.getByRole('region', { name: 'Por Hacer', exact: true }).getByTestId('abrir-tarea')).toHaveCount(0);
  });
});
