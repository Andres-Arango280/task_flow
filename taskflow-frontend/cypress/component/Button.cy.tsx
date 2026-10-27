import { Button } from '../../src/components/ui/Button';

describe('Componente - Button', () => {
  it('CMP-BTN-01 Muestra su texto y ejecuta onClick al pulsarlo', () => {
    const alPulsar = cy.stub().as('alPulsar');
    cy.mount(<Button onClick={alPulsar}>Guardar</Button>);
    cy.findByRole('button', { name: 'Guardar' }).should('be.enabled').and('not.have.attr', 'aria-busy');
    cy.findByRole('button', { name: 'Guardar' }).click();
    cy.get('@alPulsar').should('have.been.calledOnce');
    cy.screenshot('CMP-BTN-01-01-boton');
    cy.registrarCaso('CMP-BTN-01', 'El botón "Guardar" se mostró habilitado, sin aria-busy, y onClick se llamó 1 vez.');
  });

  it('CMP-BTN-02 Con isLoading se deshabilita, anuncia aria-busy y muestra el indicador', () => {
    const alPulsar = cy.stub().as('alPulsar');
    cy.mount(
      <Button isLoading onClick={alPulsar}>
        Enviando
      </Button>,
    );
    cy.findByRole('button', { name: 'Enviando' })
      .should('be.disabled')
      .and('have.attr', 'aria-busy', 'true')
      .find('svg.animate-spin')
      .should('have.attr', 'aria-hidden', 'true');
    cy.findByRole('button').click({ force: true });
    cy.get('@alPulsar').should('not.have.been.called');
    cy.screenshot('CMP-BTN-02-01-cargando');
    cy.registrarCaso('CMP-BTN-02', 'Con isLoading el botón quedó disabled, aria-busy="true", con el spinner oculto a lectores, y el clic no llamó a onClick.');
  });

  it('CMP-BTN-03 Con disabled no ejecuta onClick y aplica la variante indicada', () => {
    const alPulsar = cy.stub().as('alPulsar');
    cy.mount(
      <Button variant="danger" disabled onClick={alPulsar}>
        Eliminar
      </Button>,
    );
    cy.findByRole('button', { name: 'Eliminar' }).should('be.disabled').and('have.class', 'bg-danger-600');
    cy.findByRole('button').click({ force: true });
    cy.get('@alPulsar').should('not.have.been.called');
    cy.registrarCaso('CMP-BTN-03', 'El botón "Eliminar" (variante danger) quedó deshabilitado y el clic forzado no llamó a onClick.');
  });
});
