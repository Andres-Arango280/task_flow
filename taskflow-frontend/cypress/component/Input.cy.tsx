import { Input } from '../../src/components/ui/Input';

describe('Componente - Input', () => {
  it('CMP-INP-01 La etiqueta está asociada al campo y anuncia que es obligatorio', () => {
    cy.mount(<Input label="Correo electrónico" type="email" required ayuda="Lo usarán para invitarte." />);
    cy.findByLabelText(/Correo electrónico/)
      .should('have.attr', 'type', 'email')
      .and('have.attr', 'required');
    cy.contains('label', 'Correo electrónico').find('.sr-only').should('have.text', ' (obligatorio)');
    cy.findByLabelText(/Correo electrónico/).then(($campo) => {
      const ayudaId = $campo.attr('aria-describedby')!;
      cy.get(`#${CSS.escape(ayudaId)}`).should('have.text', 'Lo usarán para invitarte.');
    });
    cy.findByLabelText(/Correo electrónico/).should('not.have.attr', 'aria-invalid');
    cy.screenshot('CMP-INP-01-01-campo-con-ayuda');
    cy.registrarCaso('CMP-INP-01', 'findByLabelText encontró el input (label for=id), con required, "(obligatorio)" para lectores y aria-describedby apuntando al texto de ayuda.');
  });

  it('CMP-INP-02 Con error marca aria-invalid y enlaza el mensaje con aria-describedby', () => {
    cy.mount(<Input label="Correo electrónico" error="Escribe un correo completo" ayuda="Ayuda oculta" defaultValue="ana@" />);
    cy.findByLabelText('Correo electrónico')
      .should('have.attr', 'aria-invalid', 'true')
      .invoke('attr', 'aria-describedby')
      .then((ids) => {
        const lista = String(ids).split(' ');
        expect(lista, 'ayuda + error').to.have.length(2);
        cy.get(`#${CSS.escape(lista[1])}`).should('have.text', 'Escribe un correo completo').and('have.attr', 'aria-live', 'polite');
      });
    cy.findByText('Ayuda oculta').should('have.class', 'sr-only');
    cy.screenshot('CMP-INP-02-01-campo-con-error');
    cy.registrarCaso('CMP-INP-02', 'El input quedó aria-invalid="true", aria-describedby enlazó ayuda y error ("Escribe un correo completo", aria-live=polite) y la ayuda pasó a sr-only.');
  });

  it('CMP-INP-03 Sin error ni ayuda no añade atributos de accesibilidad vacíos', () => {
    cy.mount(<Input placeholder="Buscar" aria-label="Buscar" />);
    cy.findByRole('textbox', { name: 'Buscar' }).should('not.have.attr', 'aria-describedby');
    cy.findByRole('textbox', { name: 'Buscar' }).should('not.have.attr', 'aria-invalid');
    cy.findByRole('textbox').type('hola').should('have.value', 'hola');
    cy.registrarCaso('CMP-INP-03', 'Sin ayuda ni error el input no tuvo aria-describedby ni aria-invalid y aceptó la escritura ("hola").');
  });
});
