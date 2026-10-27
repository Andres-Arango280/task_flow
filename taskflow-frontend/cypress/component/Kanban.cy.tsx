import { DragDropContext } from '@hello-pangea/dnd';
import { KanbanColumn } from '../../src/components/kanban/KanbanColumn';
import type { Lista, Tarea } from '../../src/types';

const lista: Lista = { id: 'lista-hecho', nombre: 'Hecho', orden: 2, proyectoId: 'p1' };

const tareas: Tarea[] = [
  {
    id: 'tarea-1',
    titulo: 'Configurar CI',
    descripcion: 'Pipeline con pruebas',
    listaId: lista.id,
    asignados: [
      { id: 'u1', nombre: 'Ana', email: 'ana@x.test' },
      { id: 'u2', nombre: 'Luis', email: 'luis@x.test' },
    ],
  },
  { id: 'tarea-2', titulo: 'Escribir README', descripcion: null, listaId: lista.id, asignados: [] },
];

interface Opciones {
  tareas?: Tarea[];
  filtrando?: boolean;
  totalSinFiltrar?: number;
}

const montar = ({ tareas: lista_ = tareas, filtrando = false, totalSinFiltrar = lista_.length }: Opciones = {}) => {
  const onAddTask = cy.stub().as('onAddTask');
  const onTaskClick = cy.stub().as('onTaskClick');
  const onAssignClick = cy.stub().as('onAssignClick');
  cy.mount(
    <DragDropContext onDragEnd={() => undefined}>
      <KanbanColumn
        lista={lista}
        tareas={lista_}
        totalSinFiltrar={totalSinFiltrar}
        filtrando={filtrando}
        onAddTask={onAddTask}
        onTaskClick={onTaskClick}
        onAssignClick={onAssignClick}
      />
    </DragDropContext>,
  );
};

describe('Componente - KanbanColumn y TaskCard', () => {
  it('CMP-KAN-01 La columna muestra su nombre, el contador y una tarjeta arrastrable por tarea', () => {
    montar();
    cy.findByRole('region', { name: 'Hecho' }).within(() => {
      cy.findByLabelText('2 tareas').should('have.text', '2');
      cy.get('[data-rfd-draggable-id]').should('have.length', 2);
      cy.get('[data-rfd-draggable-id="tarea-1"]').should('contain', 'Configurar CI').and('contain', 'Pipeline con pruebas');
      cy.findByLabelText('Arrastrar tarea Configurar CI').should('have.attr', 'tabindex', '0');
    });
    cy.screenshot('CMP-KAN-01-01-columna-con-tareas');
    cy.registrarCaso('CMP-KAN-01', 'La región "Hecho" mostró el contador 2 y 2 tarjetas con data-rfd-draggable-id y asa de arrastre enfocable (tabindex=0).');
  });

  it('CMP-KAN-02 La tarjeta indica los asignados o "Sin asignar"', () => {
    montar();
    cy.get('[data-rfd-draggable-id="tarea-1"]').within(() => {
      cy.findByText('2 asignados').should('be.visible');
      cy.findByText('Asignada a: Ana, Luis.', { exact: false }).should('have.class', 'sr-only');
    });
    cy.get('[data-rfd-draggable-id="tarea-2"]').should('contain', 'Sin asignar');
    cy.registrarCaso('CMP-KAN-02', 'La tarjeta con 2 personas mostró "2 asignados" (y "Asignada a: Ana, Luis." para lectores); la otra mostró "Sin asignar".');
  });

  it('CMP-KAN-03 Abrir el detalle y asignar miembros llaman a callbacks distintos', () => {
    montar();
    // WCAG 2.5.3: el nombre accesible es el texto visible (título + descripción), sin aria-label
    cy.contains('[data-testid="abrir-tarea"]', 'Configurar CI').should('not.have.attr', 'aria-label');
    cy.contains('[data-testid="abrir-tarea"]', 'Configurar CI').should('have.attr', 'title', 'Ver detalle, editar o eliminar');
    cy.findByRole('button', { name: /^Configurar CI\b/ }).click();
    cy.get('@onTaskClick').should('have.been.calledOnceWith', Cypress.sinon.match({ id: 'tarea-1' }));
    cy.findByRole('button', { name: 'Asignar miembros a la tarea Escribir README' }).click();
    cy.get('@onAssignClick').should('have.been.calledOnceWith', Cypress.sinon.match({ id: 'tarea-2' }));
    cy.get('@onTaskClick').should('have.been.calledOnce');
    cy.findByRole('button', { name: 'Agregar tarea en Hecho' }).click();
    cy.get('@onAddTask').should('have.been.calledOnce');
    cy.registrarCaso('CMP-KAN-03', 'El detalle llamó onTaskClick(tarea-1), el botón de asignar llamó onAssignClick(tarea-2) sin abrir el detalle y "Agregar tarea en Hecho" llamó onAddTask.');
  });

  it('CMP-KAN-04 Sin tareas muestra el estado vacío y, filtrando, "visibles de total"', () => {
    montar({ tareas: [] });
    cy.findByText('Sin tareas en esta columna').should('be.visible');
    cy.screenshot('CMP-KAN-04-01-columna-vacia');
    montar({ tareas: [], filtrando: true, totalSinFiltrar: 5 });
    cy.findByText('Ninguna tarea coincide aquí').should('be.visible');
    cy.findByLabelText('0 de 5 tareas visibles').should('have.text', '0 de 5');
    cy.screenshot('CMP-KAN-04-02-columna-filtrada');
    cy.registrarCaso('CMP-KAN-04', 'Vacía mostró "Sin tareas en esta columna"; filtrando mostró "Ninguna tarea coincide aquí" y el contador "0 de 5".');
  });
});
