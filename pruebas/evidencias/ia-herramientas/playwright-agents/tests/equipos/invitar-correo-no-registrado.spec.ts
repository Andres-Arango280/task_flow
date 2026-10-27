// spec: specs/plan-de-pruebas.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { abrirSesionEnNavegador, crearEquipoPorApi, registrarPorApi, unico, usuarioUnico } from '../apoyo';

test.describe('Equipos', () => {
  test('Invitar a un correo no registrado muestra un error en la ventana', async ({ page }) => {
    // 1. Preparar usuario y equipo por API; abrir /equipos/:id.
    const sesion = await registrarPorApi(usuarioUnico('invitar'));
    const equipo = await crearEquipoPorApi(sesion.token, unico('Equipo Invitación'));
    await abrirSesionEnNavegador(page, sesion);
    await page.goto(`/equipos/${equipo.id}`);
    await expect(page.getByRole('heading', { level: 1, name: equipo.nombre })).toBeVisible();

    // 2. Pulsar «Invitar», escribir un correo inexistente y pulsar «Buscar».
    const correo = `nadie.${Date.now()}@taskflow-agents.test`;
    await page.getByRole('button', { name: 'Invitar', exact: true }).click();
    const dialogo = page.getByRole('dialog');
    await dialogo.getByLabel(/Correo electrónico/).fill(correo);
    await dialogo.getByRole('button', { name: 'Buscar', exact: true }).click();

    // Expected: error dentro del diálogo y la región «Miembros (1)» no cambia.
    await expect(dialogo.getByRole('alert')).toContainText(`No hay ningún usuario registrado con el correo ${correo}`);
    await expect(page.getByRole('heading', { level: 2, name: 'Miembros (1)' })).toBeVisible();
  });
});
