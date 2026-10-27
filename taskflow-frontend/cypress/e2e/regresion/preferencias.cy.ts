import { usuarioUnico } from '../../support/commands';

describe('Regresión UI - Preferencias y accesibilidad', () => {
  let usuario: ReturnType<typeof usuarioUnico> & { id: string };

  beforeEach(() => {
    cy.registrarPorApi(usuarioUnico('ui-pref')).then((creado) => {
      usuario = creado;
      cy.loginPorApi(creado);
    });
    cy.visit('/preferencias');
    cy.findByRole('heading', { level: 1, name: 'Preferencias' }).should('be.visible');
  });

  it('REG-PRE-01 Activar "Alto contraste" se aplica al instante y se conserva al recargar', () => {
    cy.get('html').should('have.attr', 'data-contraste', 'normal');
    cy.findByText('Estás usando los valores por defecto.').should('be.visible');
    cy.findByRole('switch', { name: 'Alto contraste' }).should('not.be.checked').check();
    cy.get('html').should('have.attr', 'data-contraste', 'alto');
    cy.findByRole('radio', { name: /^Grande/ }).check({ force: true });
    cy.get('html').should('have.attr', 'data-texto', 'grande');
    cy.screenshot('REG-PRE-01-01-alto-contraste-texto-grande');
    cy.reload();
    cy.get('html').should('have.attr', 'data-contraste', 'alto').and('have.attr', 'data-texto', 'grande');
    cy.findByRole('switch', { name: 'Alto contraste' }).should('be.checked');
    cy.window().then((win) => {
      expect(JSON.parse(win.localStorage.getItem('taskflow:preferencias')!)).to.include({ altoContraste: true, tamanoTexto: 'grande' });
    });
    cy.registrarCaso('REG-PRE-01', 'El <html> pasó a data-contraste="alto" y data-texto="grande" al instante y ambos valores se mantuvieron tras recargar (guardados en localStorage).');
  });

  it('REG-PRE-02 "Restablecer valores por defecto" pide confirmación y deshace los cambios', () => {
    cy.findByRole('button', { name: 'Restablecer valores por defecto' }).should('be.disabled');
    cy.findByRole('switch', { name: 'Alto contraste' }).check();
    cy.findByRole('switch', { name: 'Reducir animaciones' }).check();
    cy.get('html').should('have.attr', 'data-animaciones', 'reducidas');
    cy.findByRole('button', { name: 'Restablecer valores por defecto' }).should('be.enabled').click();
    cy.findByRole('alertdialog', { name: '¿Restablecer valores por defecto?' })
      .should('contain', 'Tus equipos, proyectos, tareas y tu nombre NO se modifican.');
    cy.screenshot('REG-PRE-02-01-confirmacion');
    cy.findByRole('alertdialog').within(() => cy.findByRole('button', { name: 'Restablecer' }).click());
    cy.aviso('Se restablecieron los valores por defecto.').should('be.visible');
    cy.get('html').should('have.attr', 'data-contraste', 'normal').and('have.attr', 'data-animaciones', 'normales');
    cy.findByRole('switch', { name: 'Alto contraste' }).should('not.be.checked');
    cy.findByText('Estás usando los valores por defecto.').should('be.visible');
    cy.screenshot('REG-PRE-02-02-restablecido');
    cy.registrarCaso('REG-PRE-02', 'Se pidió confirmación; al aceptar apareció "Se restablecieron los valores por defecto." y el <html> volvió a contraste normal y animaciones normales.');
  });

  it('REG-PRE-03 Cancelar el restablecimiento mantiene las preferencias', () => {
    cy.findByRole('switch', { name: 'Alto contraste' }).check();
    cy.findByRole('button', { name: 'Restablecer valores por defecto' }).click();
    cy.findByRole('alertdialog').within(() => cy.findByRole('button', { name: 'Cancelar' }).click());
    cy.findByRole('alertdialog').should('not.exist');
    cy.get('html').should('have.attr', 'data-contraste', 'alto');
    cy.findByRole('switch', { name: 'Alto contraste' }).should('be.checked');
    cy.screenshot('REG-PRE-03-01-cancelado');
    cy.registrarCaso('REG-PRE-03', 'Al pulsar "Cancelar" se cerró el diálogo y el alto contraste siguió activo (data-contraste="alto").');
  });

  it('REG-PRE-04 Cambiar el nombre visible lo guarda en la API y en la barra de navegación', () => {
    const nuevo = `Nombre Cypress ${Date.now()}`;
    cy.findByRole('button', { name: 'Guardar nombre' }).should('be.disabled');
    cy.findByLabelText(/Nombre visible para tu equipo/).clear().type(nuevo);
    cy.findByRole('button', { name: 'Guardar nombre' }).click();
    cy.aviso('Tu nombre se actualizó correctamente.').should('be.visible');
    cy.findByRole('navigation', { name: 'Navegación principal' }).should('contain', nuevo);
    cy.screenshot('REG-PRE-04-01-nombre-actualizado');
    cy.then(() => cy.tokenPorApi(usuario)).then((token) => {
      cy.api('GET', '/usuarios/me', { token }).its('body.nombre').should('eq', nuevo);
    });
    cy.registrarCaso('REG-PRE-04', `Apareció "Tu nombre se actualizó correctamente.", la barra mostró "${nuevo}" y GET /usuarios/me devolvió el mismo nombre.`);
  });

  it('REG-PRE-05 Desactivar los atajos de teclado hace que "n" ya no abra la nueva tarea', () => {
    cy.findByRole('switch', { name: 'Atajos de teclado' }).should('be.checked').uncheck();
    cy.then(() => cy.tokenPorApi(usuario)).then((token) => {
      cy.crearEquipoApi(token, 'Equipo atajos').then((equipo) => {
        cy.crearProyectoApi(token, equipo.id, 'Proyecto atajos').then((proyecto) => {
          cy.visit(`/proyectos/${proyecto.id}`);
          cy.findByRole('heading', { level: 1, name: 'Proyecto atajos' }).should('be.visible');
          cy.get('body').type('n');
          cy.wait(300);
          cy.findByRole('dialog').should('not.exist');
          cy.screenshot('REG-PRE-05-01-atajo-desactivado');
        });
      });
    });
    cy.registrarCaso('REG-PRE-05', 'Con los atajos desactivados, pulsar "n" en el tablero no abrió ninguna ventana.');
  });
});
