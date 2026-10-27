import { Modal } from '../../src/components/ui/Modal';

describe('Componente - Modal', () => {
  it('CMP-MOD-01 Cerrado no renderiza nada; abierto es un diálogo modal con título y foco en el primer campo', () => {
    const alCerrar = cy.stub().as('alCerrar');
    cy.mount(
      <Modal isOpen={false} onClose={alCerrar} title="Nuevo equipo">
        <input aria-label="Nombre" />
      </Modal>,
    );
    cy.findByRole('dialog').should('not.exist');
    cy.mount(
      <Modal isOpen onClose={alCerrar} title="Nuevo equipo" descripcion="Serás el líder.">
        <button type="button">Antes</button>
        <input aria-label="Nombre" />
      </Modal>,
    );
    cy.findByRole('dialog', { name: 'Nuevo equipo' }).should('have.attr', 'aria-modal', 'true').and('have.attr', 'aria-describedby');
    cy.findByRole('dialog', { description: 'Serás el líder.' }).should('exist');
    cy.focused().should('have.attr', 'aria-label', 'Nombre');
    cy.screenshot('CMP-MOD-01-01-dialogo-abierto');
    cy.registrarCaso('CMP-MOD-01', 'Con isOpen=false no hubo diálogo; abierto tuvo role="dialog", aria-modal, nombre y descripción accesibles y el foco en el primer input.');
  });

  it('CMP-MOD-02 La tecla Escape cierra la ventana', () => {
    const alCerrar = cy.stub().as('alCerrar');
    cy.mount(
      <Modal isOpen onClose={alCerrar} title="Detalle">
        <input aria-label="Título" />
      </Modal>,
    );
    cy.focused().type('{esc}');
    cy.get('@alCerrar').should('have.been.calledOnce');
    cy.registrarCaso('CMP-MOD-02', 'Pulsar Escape llamó a onClose exactamente 1 vez.');
  });

  it('CMP-MOD-03 El botón "Cerrar ventana" y el fondo oscuro también cierran', () => {
    const alCerrar = cy.stub().as('alCerrar');
    cy.mount(
      <Modal isOpen onClose={alCerrar} title="Detalle">
        <p>Contenido</p>
      </Modal>,
    );
    cy.findByRole('button', { name: 'Cerrar ventana (Esc)' }).click();
    cy.get('div[aria-hidden="true"].fixed.inset-0').click({ force: true });
    cy.get('@alCerrar').should('have.been.calledTwice');
    cy.registrarCaso('CMP-MOD-03', 'El botón "Cerrar ventana (Esc)" y el clic en el fondo llamaron a onClose (2 llamadas).');
  });

  it('CMP-MOD-04 El foco queda atrapado dentro con Tab y puede usarse como alertdialog', () => {
    cy.mount(
      <Modal isOpen onClose={() => undefined} title="¿Eliminar?" rol="alertdialog">
        <button type="button">Cancelar</button>
        <button type="button">Eliminar</button>
      </Modal>,
    );
    cy.findByRole('alertdialog', { name: '¿Eliminar?' }).should('exist');
    // Primer enfocable: el botón de cerrar; el último: "Eliminar"
    cy.findByRole('button', { name: 'Eliminar' }).focus();
    cy.focused().trigger('keydown', { key: 'Tab' });
    cy.focused().should('have.attr', 'aria-label', 'Cerrar ventana (Esc)');
    cy.focused().trigger('keydown', { key: 'Tab', shiftKey: true });
    cy.focused().should('have.text', 'Eliminar');
    cy.registrarCaso('CMP-MOD-04', 'Con rol="alertdialog" se expuso como alertdialog; Tab desde el último botón volvió al primero y Shift+Tab desde el primero fue al último.');
  });
});
