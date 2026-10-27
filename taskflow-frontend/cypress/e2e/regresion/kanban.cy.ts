import { UUID_INEXISTENTE } from '../../support/utilidades';

type Escenario = {
  usuario: { id: string; nombre: string; email: string; password: string };
  token: string;
  equipo: { id: string; nombre: string };
  proyecto: { id: string; nombre: string };
  listas: { id: string; nombre: string }[];
};

const columna = (nombre: string) => cy.findByRole('region', { name: nombre });
// La tarjeta ya no tiene aria-label (WCAG 2.5.3): se localiza por data-testid y su título visible
const tarjeta = (titulo: string) =>
  cy
    .get('[data-testid="abrir-tarea"]')
    .filter((_, boton) => boton.querySelector('span')?.textContent?.trim() === titulo);
const tareasDelProyecto = (esc: Escenario) =>
  cy.api('GET', '/tareas', { token: esc.token, qs: { proyectoId: esc.proyecto.id } }).its('body');

describe('Regresión UI - Tablero Kanban', () => {
  let esc: Escenario;

  beforeEach(() => {
    cy.escenarioProyecto('ui-kanban').then((datos) => {
      esc = datos as Escenario;
      cy.loginPorApi(esc.usuario);
    });
  });

  const abrirTablero = () => {
    cy.visit(`/proyectos/${esc.proyecto.id}`);
    cy.findByRole('heading', { level: 1, name: esc.proyecto.nombre }).should('be.visible');
  };

  it('REG-KAN-01 Crear una tarea desde "Nueva tarea" la añade a la columna Por Hacer', () => {
    abrirTablero();
    cy.findByText('Tu tablero está vacío. Así se usa:').should('be.visible');
    cy.findByRole('button', { name: 'Nueva tarea' }).click();
    cy.findByRole('dialog', { name: 'Crear nueva tarea' }).within(() => {
      cy.findByLabelText(/Título de la tarea/).type('Diseñar pantalla de inicio');
      cy.findByLabelText(/Descripción/).type('Logo, menú y llamada a la acción');
      cy.findByLabelText('Columna').should('have.value', esc.listas[0].id);
      cy.findByRole('checkbox', { name: esc.usuario.nombre }).check();
      cy.screenshot('REG-KAN-01-01-formulario-tarea');
      cy.findByRole('button', { name: 'Crear tarea' }).click();
    });
    cy.aviso('Tarea "Diseñar pantalla de inicio" creada en Por Hacer.').should('be.visible');
    columna('Por Hacer').within(() => {
      cy.findByRole('button', { name: 'Diseñar pantalla de inicio Logo, menú y llamada a la acción' })
        .should('be.visible')
        .and('have.attr', 'data-testid', 'abrir-tarea');
      cy.findByText('Asignada a: ' + esc.usuario.nombre + '.', { exact: false }).should('exist');
    });
    tareasDelProyecto(esc).should('have.length', 1);
    cy.screenshot('REG-KAN-01-02-tarea-creada');
    cy.registrarCaso('REG-KAN-01', 'Apareció el aviso "Tarea ... creada en Por Hacer.", la tarjeta quedó en Por Hacer con su asignado y la API devolvió 1 tarea.');
  });

  it('REG-KAN-02 No se puede crear una tarea sin título', () => {
    cy.intercept('POST', '**/tareas').as('crear');
    abrirTablero();
    cy.findByRole('button', { name: 'Nueva tarea' }).click();
    cy.findByRole('dialog', { name: 'Crear nueva tarea' }).within(() => {
      cy.findByRole('button', { name: 'Crear tarea' }).click();
      cy.findByRole('alert').should('have.text', 'Escribe un título para la tarea (es obligatorio).');
      cy.findByLabelText(/Título de la tarea/).should('have.attr', 'aria-invalid', 'true');
    });
    cy.get('@crear.all').should('have.length', 0);
    cy.screenshot('REG-KAN-02-01-titulo-obligatorio');
    cy.registrarCaso('REG-KAN-02', 'Se mostró "Escribe un título para la tarea (es obligatorio).", el campo quedó aria-invalid y no se envió POST /tareas.');
  });

  it('REG-KAN-03 Editar el título y la descripción desde el detalle guarda los cambios', () => {
    cy.then(() => cy.crearTareaApi(esc.token, { titulo: 'Título viejo', listaId: esc.listas[0].id }));
    abrirTablero();
    tarjeta('Título viejo').click();
    cy.findByRole('dialog', { name: 'Detalle de la tarea' }).within(() => {
      cy.findByRole('button', { name: 'Guardar cambios' }).should('be.disabled');
      cy.findByLabelText(/^Título/).clear().type('Título nuevo');
      cy.findByLabelText('Descripción').type('Descripción añadida en la prueba');
      cy.screenshot('REG-KAN-03-01-editando');
      cy.findByRole('button', { name: 'Guardar cambios' }).click();
    });
    cy.aviso('Cambios guardados.').should('be.visible');
    cy.findByRole('dialog').within(() => cy.findByRole('button', { name: 'Cerrar' }).click());
    tarjeta('Título nuevo').should('contain', 'Descripción añadida en la prueba');
    tareasDelProyecto(esc).then((tareas) => {
      expect(tareas[0]).to.include({ titulo: 'Título nuevo', descripcion: 'Descripción añadida en la prueba' });
    });
    cy.screenshot('REG-KAN-03-02-editada');
    cy.registrarCaso('REG-KAN-03', 'Apareció "Cambios guardados.", la tarjeta mostró el nuevo título y descripción y la API devolvió los mismos valores.');
  });

  it('REG-KAN-04 Eliminar una tarea pide confirmación y se puede deshacer', () => {
    cy.then(() => cy.crearTareaApi(esc.token, { titulo: 'Tarea a borrar', descripcion: 'Con detalle', listaId: esc.listas[1].id }));
    abrirTablero();
    tarjeta('Tarea a borrar').click();
    cy.findByRole('dialog', { name: 'Detalle de la tarea' }).within(() => cy.findByRole('button', { name: 'Eliminar' }).click());
    cy.findByRole('alertdialog', { name: '¿Eliminar esta tarea?' })
      .should('contain', 'Vas a eliminar la tarea "Tarea a borrar".')
      .and('contain', 'Podrás deshacerlo durante unos segundos');
    cy.screenshot('REG-KAN-04-01-confirmacion');
    cy.findByRole('alertdialog').within(() => cy.findByRole('button', { name: 'Eliminar tarea' }).click());
    cy.aviso('Tarea "Tarea a borrar" eliminada.').should('be.visible');
    cy.contains('[data-testid="abrir-tarea"]', 'Tarea a borrar').should('not.exist');
    tareasDelProyecto(esc).should('have.length', 0);
    cy.screenshot('REG-KAN-04-02-eliminada');

    cy.aviso('Tarea "Tarea a borrar" eliminada.').within(() => cy.findByRole('button', { name: 'Deshacer' }).click());
    cy.aviso('Tarea "Tarea a borrar" restaurada.').should('be.visible');
    columna('En Progreso').within(() => tarjeta('Tarea a borrar').should('be.visible'));
    tareasDelProyecto(esc).then((tareas) => {
      expect(tareas).to.have.length(1);
      expect(tareas[0]).to.include({ titulo: 'Tarea a borrar', descripcion: 'Con detalle', listaId: esc.listas[1].id });
    });
    cy.screenshot('REG-KAN-04-03-restaurada');
    cy.registrarCaso('REG-KAN-04', 'Se pidió confirmación, la tarea desapareció (API: 0 tareas) y con "Deshacer" se restauró en En Progreso con su descripción (API: 1 tarea).');
  });

  it('REG-KAN-05 Cancelar la eliminación conserva la tarea', () => {
    cy.then(() => cy.crearTareaApi(esc.token, { titulo: 'Tarea que se queda', listaId: esc.listas[0].id }));
    abrirTablero();
    tarjeta('Tarea que se queda').click();
    cy.findByRole('dialog', { name: 'Detalle de la tarea' }).within(() => cy.findByRole('button', { name: 'Eliminar' }).click());
    cy.findByRole('alertdialog').within(() => cy.findByRole('button', { name: 'Cancelar' }).click());
    cy.findByRole('alertdialog').should('not.exist');
    cy.findByRole('dialog', { name: 'Detalle de la tarea' }).should('be.visible');
    tareasDelProyecto(esc).should('have.length', 1);
    cy.screenshot('REG-KAN-05-01-cancelado');
    cy.registrarCaso('REG-KAN-05', 'Al cancelar, el diálogo de confirmación se cerró, volvió el detalle de la tarea y la API siguió devolviendo 1 tarea.');
  });

  it('REG-KAN-06 Mover una tarea con el selector "Columna" del detalle persiste tras recargar', () => {
    cy.then(() => cy.crearTareaApi(esc.token, { titulo: 'Tarea viajera', listaId: esc.listas[0].id }));
    abrirTablero();
    tarjeta('Tarea viajera').click();
    cy.findByRole('dialog', { name: 'Detalle de la tarea' }).within(() => {
      cy.findByLabelText('Columna').select('En Progreso');
    });
    cy.aviso('"Tarea viajera" movida a En Progreso.').should('be.visible');
    cy.findByRole('dialog').within(() => cy.findByRole('button', { name: 'Cerrar' }).click());
    columna('En Progreso').within(() => tarjeta('Tarea viajera').should('be.visible'));
    cy.screenshot('REG-KAN-06-01-movida');
    cy.reload();
    columna('En Progreso').within(() => tarjeta('Tarea viajera').should('be.visible'));
    columna('Por Hacer').should('contain', 'Sin tareas en esta columna');
    cy.registrarCaso('REG-KAN-06', 'Apareció el aviso «"Tarea viajera" movida a En Progreso.» y tras recargar la tarjeta siguió en En Progreso (Por Hacer vacía).');
  });

  it('REG-KAN-07 Mover una tarea arrastrándola con el teclado y deshacer el movimiento', () => {
    cy.then(() => cy.crearTareaApi(esc.token, { titulo: 'Tarea con teclado', listaId: esc.listas[0].id }));
    abrirTablero();
    cy.intercept('PATCH', '**/tareas/*/mover').as('mover');
    // Arrastre accesible de @hello-pangea/dnd: Espacio levanta, flecha derecha cambia de columna, Espacio suelta
    cy.findByLabelText('Arrastrar tarea Tarea con teclado').focus().trigger('keydown', { keyCode: 32, key: ' ', code: 'Space' });
    cy.wait(300);
    cy.focused().trigger('keydown', { keyCode: 39, key: 'ArrowRight', code: 'ArrowRight', force: true });
    cy.wait(600);
    cy.focused().trigger('keydown', { keyCode: 32, key: ' ', code: 'Space', force: true });
    cy.wait('@mover').its('response.statusCode').should('eq', 200);
    cy.aviso('"Tarea con teclado" movida a En Progreso.').should('be.visible');
    columna('En Progreso').within(() => tarjeta('Tarea con teclado').should('be.visible'));
    cy.screenshot('REG-KAN-07-01-arrastrada');
    cy.aviso('"Tarea con teclado" movida a En Progreso.').within(() => cy.findByRole('button', { name: 'Deshacer' }).click());
    cy.aviso('"Tarea con teclado" ha vuelto a Por Hacer.').should('be.visible');
    columna('Por Hacer').within(() => tarjeta('Tarea con teclado').should('be.visible'));
    tareasDelProyecto(esc).then((tareas) => expect(tareas[0].listaId).to.eq(esc.listas[0].id));
    cy.registrarCaso('REG-KAN-07', 'El arrastre con teclado llamó a PATCH /mover (200) y llevó la tarjeta a En Progreso; "Deshacer" la devolvió a Por Hacer (confirmado por API).');
  });

  it('REG-KAN-08 La búsqueda ignora tildes, mayúsculas y pequeñas faltas de ortografía', () => {
    ['Diseñar pantalla de inicio', 'Configurar base de datos', 'Escribir documentación'].forEach((titulo) =>
      cy.then(() => cy.crearTareaApi(esc.token, { titulo, listaId: esc.listas[0].id })),
    );
    abrirTablero();
    const buscar = () => cy.findByRole('searchbox', { name: 'Buscar tareas' });
    buscar().type('DISENAR');
    cy.contains('p', 'Mostrando').should('have.text', 'Mostrando 1 de 3 tareas');
    tarjeta('Diseñar pantalla de inicio').should('be.visible');
    cy.screenshot('REG-KAN-08-01-sin-tildes');
    buscar().clear().type('documentasion');
    cy.contains('p', 'Mostrando').should('have.text', 'Mostrando 1 de 3 tareas');
    tarjeta('Escribir documentación').should('be.visible');
    cy.screenshot('REG-KAN-08-02-con-errata');
    cy.findByRole('button', { name: 'Limpiar filtros' }).click();
    cy.contains('p', 'Mostrando').should('have.text', 'Mostrando 3 de 3 tareas');
    cy.registrarCaso('REG-KAN-08', '"DISENAR" encontró "Diseñar pantalla de inicio" y "documentasion" encontró "Escribir documentación" (1 de 3 en ambos casos); "Limpiar filtros" volvió a 3 de 3.');
  });

  it('REG-KAN-09 Una búsqueda sin coincidencias lo indica en cada columna', () => {
    cy.then(() => cy.crearTareaApi(esc.token, { titulo: 'Única tarea', listaId: esc.listas[0].id }));
    abrirTablero();
    cy.findByRole('searchbox', { name: 'Buscar tareas' }).type('zzqqxx');
    cy.contains('p', 'Mostrando').should('have.text', 'Mostrando 0 de 1 tareas');
    cy.findAllByText('Ninguna tarea coincide aquí').should('have.length', 3);
    cy.findByText('Estás viendo un tablero filtrado.', { exact: false }).should('be.visible');
    cy.screenshot('REG-KAN-09-01-sin-coincidencias');
    // Escape dentro del buscador limpia la búsqueda
    cy.findByRole('searchbox', { name: 'Buscar tareas' }).type('{esc}').should('have.value', '');
    tarjeta('Única tarea').should('be.visible');
    cy.registrarCaso('REG-KAN-09', 'Se mostró "Mostrando 0 de 1 tareas" y "Ninguna tarea coincide aquí" en las 3 columnas; Esc limpió la búsqueda.');
  });

  it('REG-KAN-10 La barra de progreso refleja las tareas en "Hecho"', () => {
    ['Uno', 'Dos', 'Tres'].forEach((titulo) => cy.then(() => cy.crearTareaApi(esc.token, { titulo, listaId: esc.listas[0].id })));
    cy.then(() => cy.crearTareaApi(esc.token, { titulo: 'Cuatro', listaId: esc.listas[2].id }));
    abrirTablero();
    cy.findByRole('progressbar', { name: 'Progreso' })
      .should('have.attr', 'aria-valuenow', '25')
      .and('have.attr', 'aria-valuetext', '1 de 4 tareas hechas (25%)');
    cy.findByText('1 de 4 tareas hechas').should('be.visible');
    cy.screenshot('REG-KAN-10-01-progreso-25');
    tarjeta('Uno').click();
    cy.findByRole('dialog', { name: 'Detalle de la tarea' }).within(() => cy.findByLabelText('Columna').select('Hecho'));
    cy.aviso('"Uno" movida a Hecho.').should('be.visible');
    cy.findByRole('dialog').within(() => cy.findByRole('button', { name: 'Cerrar' }).click());
    cy.findByRole('progressbar', { name: 'Progreso' }).should('have.attr', 'aria-valuenow', '50');
    cy.findByText('2 de 4 tareas hechas').should('be.visible');
    cy.screenshot('REG-KAN-10-02-progreso-50');
    cy.registrarCaso('REG-KAN-10', 'Con 1 de 4 tareas en Hecho la barra marcó 25% (aria-valuenow=25); el texto dijo "1 de 4 tareas hechas" (plural según el total); al mover otra pasó a 50% y "2 de 4 tareas hechas".');
  });

  it('REG-KAN-11 Los atajos "n" y "/" abren la nueva tarea y enfocan la búsqueda', () => {
    abrirTablero();
    cy.get('body').type('n');
    cy.findByRole('dialog', { name: 'Crear nueva tarea' }).should('be.visible');
    cy.focused().should('have.attr', 'id').and('match', /titulo$/);
    cy.screenshot('REG-KAN-11-01-atajo-n');
    cy.get('body').type('{esc}');
    cy.findByRole('dialog').should('not.exist');
    cy.get('body').type('/');
    cy.focused().should('have.attr', 'id', 'buscar-tareas');
    cy.registrarCaso('REG-KAN-11', 'La tecla "n" abrió "Crear nueva tarea" con el foco en el título, Esc la cerró y "/" enfocó el buscador.');
  });

  it('REG-KAN-12 Un proyecto inexistente muestra "Proyecto no encontrado"', () => {
    cy.visit(`/proyectos/${UUID_INEXISTENTE}`);
    cy.findByRole('heading', { level: 1, name: 'Proyecto no encontrado' }).should('be.visible');
    cy.findByRole('alert').should('contain', 'No se pudo cargar el tablero');
    cy.screenshot('REG-KAN-12-01-proyecto-no-encontrado');
    cy.findByRole('button', { name: 'Volver a mis equipos' }).click();
    cy.location('pathname').should('eq', '/');
    cy.screenshot('REG-KAN-12-02-vuelta-al-inicio');
    cy.registrarCaso('REG-KAN-12', 'Se mostró "Proyecto no encontrado" con un aviso de error y el botón "Volver a mis equipos" llevó a "/".');
  });
});
