import { useState } from 'react';
import { ProveedorConfirmacion, useConfirmacion } from '../../src/components/ui/Confirmacion';

// Componente de prueba: pide confirmación y muestra la respuesta recibida
const Disparador = () => {
  const confirmar = useConfirmacion();
  const [respuesta, setRespuesta] = useState('sin respuesta');
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const ok = await confirmar({
            titulo: '¿Eliminar el proyecto?',
            mensaje: 'Esta acción es permanente.',
            consecuencias: ['Se borrarán sus listas.', 'No se puede deshacer.'],
            textoConfirmar: 'Eliminar proyecto',
            peligroso: true,
          });
          setRespuesta(String(ok));
        }}
      >
        Abrir confirmación
      </button>
      <output data-testid="respuesta">{respuesta}</output>
    </>
  );
};

const montar = () =>
  cy.mount(
    <ProveedorConfirmacion>
      <Disparador />
    </ProveedorConfirmacion>,
  );

describe('Componente - ProveedorConfirmacion', () => {
  it('CMP-CON-01 Muestra título, mensaje y consecuencias y resuelve true al confirmar', () => {
    montar();
    cy.findByRole('button', { name: 'Abrir confirmación' }).click();
    cy.findByRole('alertdialog', { name: '¿Eliminar el proyecto?' }).within(() => {
      cy.findByText('Esta acción es permanente.').should('be.visible');
      cy.findAllByRole('listitem').should('have.length', 2);
      cy.findByRole('button', { name: 'Eliminar proyecto' }).should('have.class', 'bg-danger-600');
    });
    cy.screenshot('CMP-CON-01-01-confirmacion');
    cy.findByRole('button', { name: 'Eliminar proyecto' }).click();
    cy.findByTestId('respuesta').should('have.text', 'true');
    cy.findByRole('alertdialog').should('not.exist');
    cy.registrarCaso('CMP-CON-01', 'El alertdialog mostró el mensaje y 2 consecuencias con botón de peligro; al confirmar la promesa resolvió true y se cerró.');
  });

  it('CMP-CON-02 Resuelve false al pulsar "Cancelar"', () => {
    montar();
    cy.findByRole('button', { name: 'Abrir confirmación' }).click();
    cy.findByRole('button', { name: 'Cancelar' }).click();
    cy.findByTestId('respuesta').should('have.text', 'false');
    cy.registrarCaso('CMP-CON-02', 'Al pulsar "Cancelar" la promesa resolvió false.');
  });

  it('CMP-CON-03 Resuelve false al cerrar con Escape', () => {
    montar();
    cy.findByRole('button', { name: 'Abrir confirmación' }).click();
    cy.findByRole('alertdialog').should('exist');
    cy.focused().type('{esc}');
    cy.findByTestId('respuesta').should('have.text', 'false');
    cy.findByRole('alertdialog').should('not.exist');
    cy.registrarCaso('CMP-CON-03', 'Al pulsar Escape el diálogo se cerró y la promesa resolvió false.');
  });

  it('CMP-CON-04 useConfirmacion fuera del proveedor lanza un error descriptivo', () => {
    const errores: string[] = [];
    cy.on('uncaught:exception', (error) => {
      errores.push(error.message);
      return false;
    });
    cy.mount(<Disparador />);
    cy.findByRole('button', { name: 'Abrir confirmación' }).should('not.exist');
    cy.wrap(errores).should((lista) => {
      expect(lista.some((m) => m.includes('useConfirmacion debe usarse dentro de ProveedorConfirmacion'))).to.eq(true);
    });
    cy.registrarCaso('CMP-CON-04', 'Montar el componente sin proveedor lanzó "useConfirmacion debe usarse dentro de ProveedorConfirmacion" y no se renderizó.');
  });
});
