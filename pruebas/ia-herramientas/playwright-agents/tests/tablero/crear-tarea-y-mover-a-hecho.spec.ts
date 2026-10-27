// spec: specs/plan-de-pruebas.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { abrirSesionEnNavegador, crearEquipoPorApi, crearProyectoPorApi, registrarPorApi, unico, usuarioUnico } from '../apoyo';

test.describe('Tablero y tareas', () => {
  test('Crear una tarea y moverla a «Hecho» actualiza el progreso', async ({ page }) => {
    // 1. Preparar usuario, equipo y proyecto por API; abrir /proyectos/:id.
    const sesion = await registrarPorApi(usuarioUnico('tarea'));
    const equipo = await crearEquipoPorApi(sesion.token, unico('Equipo Tablero'));
    const proyecto = await crearProyectoPorApi(sesion.token, equipo.id, unico('Proyecto Tablero'));
    await abrirSesionEnNavegador(page, sesion);
    await page.goto(`/proyectos/${proyecto.id}`);
    const titulo = unico('Tarea generada');

    // 2. Pulsar «Nueva tarea», escribir el título y pulsar «Crear tarea».
    await page.getByRole('button', { name: /Nueva tarea/ }).click();
    const nueva = page.getByRole('dialog', { name: 'Crear nueva tarea' });
    await nueva.getByLabel(/Título de la tarea/).fill(titulo);
    await nueva.getByRole('button', { name: 'Crear tarea' }).click();

    // 3. Verificar que la tarjeta aparece en «Por Hacer» y el texto «0 de 1 tarea hecha».
    const porHacer = page.getByRole('region', { name: 'Por Hacer', exact: true });
    const tarjeta = porHacer.getByTestId('abrir-tarea').filter({ hasText: titulo });
    await expect(tarjeta).toBeVisible();
    await expect(page.getByText('0 de 1 tarea hecha')).toBeVisible();

    // 4. Abrir la tarjeta, cambiar el combobox «Columna» a «Hecho» y cerrar el detalle.
    await tarjeta.click();
    const detalle = page.getByRole('dialog', { name: 'Detalle de la tarea' });
    await detalle.getByRole('combobox', { name: 'Columna' }).selectOption('Hecho');
    await detalle.getByRole('button', { name: 'Cerrar', exact: true }).click();

    // Expected: la tarjeta está en «Hecho», el progressbar marca 100 y «1 de 1 tarea hecha».
    await expect(page.getByRole('region', { name: 'Hecho', exact: true }).getByTestId('abrir-tarea').filter({ hasText: titulo })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Progreso' })).toHaveAttribute('aria-valuenow', '100');
    await expect(page.getByText('1 de 1 tarea hecha')).toBeVisible();
  });
});
