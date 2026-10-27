import { AxiosError, AxiosHeaders } from 'axios';
import { ProveedorAvisos, useAvisos } from '../../src/components/ui/Toast';

const errorHttp = (estado: number, message: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: estado,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { message },
  });

interface Props {
  alDeshacer?: () => void;
}

// Botones de prueba que disparan cada tipo de aviso
const Panel = ({ alDeshacer = () => undefined }: Props) => {
  const avisos = useAvisos();
  return (
    <div className="p-4 space-x-2">
      <button type="button" onClick={() => avisos.exito('Equipo creado.')}>
        Éxito
      </button>
      <button
        type="button"
        onClick={() => avisos.exito('Tarea eliminada.', { accion: { etiqueta: 'Deshacer', alPulsar: alDeshacer } })}
      >
        Con acción
      </button>
      <button type="button" onClick={() => avisos.error(errorHttp(409, 'El usuario ya es miembro del equipo'), 'No se pudo añadir')}>
        Error
      </button>
    </div>
  );
};

const montar = (props: Props = {}) =>
  cy.mount(
    <ProveedorAvisos>
      <Panel {...props} />
    </ProveedorAvisos>,
  );

describe('Componente - ProveedorAvisos (toasts)', () => {
  it('CMP-AVI-01 Un aviso de éxito se anuncia como status y desaparece solo a los 4 s', () => {
    cy.clock();
    montar();
    cy.findByRole('button', { name: 'Éxito' }).click();
    cy.findByRole('status').should('contain', 'Listo').and('contain', 'Equipo creado.').and('not.contain', 'Hecho');
    cy.screenshot('CMP-AVI-01-01-aviso-exito');
    cy.tick(3900);
    cy.findByRole('status').should('exist');
    cy.tick(200);
    cy.findByRole('status').should('not.exist');
    cy.registrarCaso('CMP-AVI-01', 'El aviso "Equipo creado." apareció con role="status" y título "Listo" (antes "Hecho", que se confundía con la columna); seguía a los 3,9 s y desapareció a los 4,1 s.');
  });

  it('CMP-AVI-02 El botón "Deshacer" ejecuta la acción y cierra el aviso', () => {
    const alDeshacer = cy.stub().as('alDeshacer');
    montar({ alDeshacer });
    cy.findByRole('button', { name: 'Con acción' }).click();
    cy.findByRole('status').within(() => cy.findByRole('button', { name: 'Deshacer' }).click());
    cy.get('@alDeshacer').should('have.been.calledOnce');
    cy.findByRole('status').should('not.exist');
    cy.registrarCaso('CMP-AVI-02', 'Al pulsar "Deshacer" se llamó 1 vez a la acción y el aviso se cerró.');
  });

  it('CMP-AVI-03 Un error HTTP se anuncia como alerta con mensaje en español y código de referencia', () => {
    montar();
    cy.findByRole('button', { name: 'Error' }).click();
    cy.findByRole('alert')
      .should('contain', 'Error')
      .and('contain', 'No se pudo añadir: El usuario ya es miembro del equipo')
      .and('contain', 'Código de referencia: TF-409');
    cy.screenshot('CMP-AVI-03-01-aviso-error');
    cy.findByRole('alert').within(() => cy.findByRole('button', { name: 'Cerrar aviso' }).click());
    cy.findByRole('alert').should('not.exist');
    cy.registrarCaso('CMP-AVI-03', 'Se mostró role="alert" con "No se pudo añadir: El usuario ya es miembro del equipo" y "Código de referencia: TF-409"; "Cerrar aviso" lo quitó.');
  });

  it('CMP-AVI-04 Como máximo se muestran 4 avisos a la vez', () => {
    montar();
    Cypress._.times(6, () => cy.findByRole('button', { name: 'Éxito' }).click());
    cy.findAllByRole('status').should('have.length', 4);
    cy.registrarCaso('CMP-AVI-04', 'Tras lanzar 6 avisos seguidos solo quedaron 4 visibles (los más recientes).');
  });
});
