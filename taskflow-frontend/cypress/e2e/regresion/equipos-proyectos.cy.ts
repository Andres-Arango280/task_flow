import { usuarioUnico } from '../../support/commands';

describe('Regresión UI - Equipos, miembros y proyectos', () => {
  let lider: { token: string; id: string; nombre: string; email: string; password: string };

  beforeEach(() => {
    const usuario = usuarioUnico('ui-equipo');
    cy.registrarPorApi(usuario).then((creado) => {
      cy.loginPorApi(creado).then(({ token }) => {
        lider = { ...creado, token } as typeof lider;
      });
    });
  });

  it('REG-EQU-01 Crear un equipo desde "Mis equipos" lo muestra con el distintivo de líder', () => {
    const nombre = `Equipo UI ${Date.now()}`;
    cy.visit('/');
    cy.findByText('Todavía no tienes equipos').should('be.visible');
    cy.findByRole('button', { name: 'Nuevo equipo' }).click();
    cy.findByRole('dialog', { name: 'Nuevo equipo' }).within(() => {
      cy.findByRole('button', { name: 'Crear equipo' }).should('be.disabled');
      cy.findByLabelText(/Nombre del equipo/).type(nombre);
      cy.screenshot('REG-EQU-01-01-dialogo-nuevo-equipo');
      cy.findByRole('button', { name: 'Crear equipo' }).should('be.enabled').click();
    });
    cy.aviso(`Equipo «${nombre}» creado`).should('be.visible');
    // WCAG 2.5.3: la tarjeta no tiene aria-label; su nombre accesible es el contenido visible
    cy.contains('a[data-testid="tarjeta-equipo"]', nombre)
      .should('be.visible')
      .and('contain', 'Líder')
      .and('contain', '1 miembro')
      .and('contain', 'Abrir');
    cy.contains('a[data-testid="tarjeta-equipo"]', nombre).should('not.have.attr', 'aria-label');
    cy.findByRole('link', { name: new RegExp(`^${nombre} Líder`) }).should('be.visible');
    cy.findByText('Perteneces a 1 equipo.').should('be.visible');
    cy.screenshot('REG-EQU-01-02-equipo-creado');
    cy.registrarCaso('REG-EQU-01', `Apareció el aviso "Equipo «${nombre}» creado" y la tarjeta del equipo (data-testid="tarjeta-equipo", sin aria-label) con el distintivo "Líder" y "1 miembro"; su nombre accesible empieza por el texto visible.`);
  });

  it('REG-EQU-02 El líder invita a un miembro registrado buscándolo por correo', () => {
    const invitado = usuarioUnico('ui-invitado');
    cy.registrarPorApi(invitado);
    cy.then(() => cy.crearEquipoApi(lider.token, `Equipo invitar ${Date.now()}`)).then((equipo) => {
      cy.visit(`/equipos/${equipo.id}`);
      cy.findByRole('heading', { name: /Miembros/ }).should('contain', '(1)');
      cy.findByRole('button', { name: 'Invitar' }).click();
      cy.findByRole('dialog', { name: 'Invitar a un miembro' }).within(() => {
        cy.findByLabelText(/Correo electrónico/).type(invitado.email.toUpperCase());
        cy.findByRole('button', { name: 'Buscar' }).click();
        cy.findByText(invitado.nombre).should('be.visible');
        cy.screenshot('REG-EQU-02-01-usuario-encontrado');
        cy.findByRole('button', { name: 'Añadir al equipo' }).click();
      });
      cy.aviso(`${invitado.nombre} ahora es miembro del equipo.`).should('be.visible');
      cy.findByRole('dialog').should('not.exist');
      cy.findByRole('heading', { name: /Miembros/ }).should('contain', '(2)');
      cy.contains('li', invitado.email).should('be.visible');
      cy.screenshot('REG-EQU-02-02-miembro-agregado');
      cy.registrarCaso('REG-EQU-02', `Se encontró a "${invitado.nombre}", apareció el aviso "... ahora es miembro del equipo." y el contador pasó a Miembros (2).`);
    });
  });

  it('REG-EQU-03 Invitar un correo no registrado muestra una alerta y no agrega a nadie', () => {
    const inexistente = `nadie.${Date.now()}@taskflow-cypress.test`;
    cy.then(() => cy.crearEquipoApi(lider.token, `Equipo sin invitado ${Date.now()}`)).then((equipo) => {
      cy.visit(`/equipos/${equipo.id}`);
      cy.findByRole('button', { name: 'Invitar' }).click();
      cy.findByRole('dialog', { name: 'Invitar a un miembro' }).within(() => {
        cy.findByLabelText(/Correo electrónico/).type(inexistente);
        cy.findByRole('button', { name: 'Buscar' }).click();
        cy.findByRole('alert').should('contain', `No hay ningún usuario registrado con el correo ${inexistente}`);
        cy.findByRole('button', { name: 'Añadir al equipo' }).should('not.exist');
      });
      cy.screenshot('REG-EQU-03-01-correo-inexistente');
      cy.findByRole('dialog').within(() => cy.findByRole('button', { name: 'Cancelar' }).click());
      cy.findByRole('heading', { name: /Miembros/ }).should('contain', '(1)');
      cy.registrarCaso('REG-EQU-03', `Se mostró la alerta "No hay ningún usuario registrado con el correo ${inexistente}..." sin botón para añadir; el equipo siguió con 1 miembro.`);
    });
  });

  it('REG-EQU-04 Quitar a un miembro pide confirmación y se puede deshacer', () => {
    cy.usuarioConToken('ui-quitar').then(({ usuario: miembro }) => {
      cy.then(() => cy.crearEquipoApi(lider.token, `Equipo quitar ${Date.now()}`)).then((equipo) => {
        cy.agregarMiembroApi(lider.token, equipo.id, miembro.id);
        cy.visit(`/equipos/${equipo.id}`);
        cy.findByRole('heading', { name: /Miembros/ }).should('contain', '(2)');
        cy.findByRole('button', { name: `Quitar a ${miembro.nombre} del equipo` }).click();
        cy.findByRole('alertdialog', { name: `¿Quitar a ${miembro.nombre} del equipo?` })
          .should('contain', 'Perderá el acceso a todos los proyectos y tableros del equipo.')
          .within(() => cy.findByRole('button', { name: 'Quitar del equipo' }).click());
        cy.aviso(`${miembro.nombre} ya no forma parte del equipo.`).should('be.visible');
        cy.findByRole('heading', { name: /Miembros/ }).should('contain', '(1)');
        cy.screenshot('REG-EQU-04-01-miembro-quitado');
        cy.aviso(`${miembro.nombre} ya no forma parte del equipo.`).within(() => cy.findByRole('button', { name: 'Deshacer' }).click());
        cy.aviso(`${miembro.nombre} ha vuelto al equipo.`).should('be.visible');
        cy.findByRole('heading', { name: /Miembros/ }).should('contain', '(2)');
        cy.screenshot('REG-EQU-04-02-deshacer');
        cy.registrarCaso('REG-EQU-04', 'Tras confirmar, Miembros pasó de (2) a (1); al pulsar "Deshacer" apareció "... ha vuelto al equipo." y volvió a (2).');
      });
    });
  });

  it('REG-EQU-05 Crear un proyecto genera un tablero con las columnas Por Hacer, En Progreso y Hecho', () => {
    const nombre = `Proyecto UI ${Date.now()}`;
    cy.then(() => cy.crearEquipoApi(lider.token, `Equipo proyectos ${Date.now()}`)).then((equipo) => {
      cy.visit(`/equipos/${equipo.id}`);
      cy.findByText('Este equipo aún no tiene proyectos').should('be.visible');
      cy.findByRole('button', { name: 'Nuevo proyecto' }).click();
      cy.findByRole('dialog', { name: 'Nuevo proyecto' }).within(() => {
        cy.findByLabelText(/Nombre del proyecto/).type(nombre);
        cy.findByRole('button', { name: 'Crear proyecto' }).click();
      });
      cy.aviso(`Proyecto «${nombre}» creado con sus 3 listas.`).should('be.visible');
      cy.findByRole('heading', { name: /Proyectos/ }).should('contain', '(1)');
      cy.screenshot('REG-EQU-05-01-proyecto-creado');
      // WCAG 2.5.3: la tarjeta de proyecto no tiene aria-label; su nombre accesible es el contenido visible
      cy.contains('a[data-testid="tarjeta-proyecto"]', nombre)
        .should('be.visible')
        .and('contain', 'Abrir tablero')
        .and('not.have.attr', 'aria-label');
      cy.findByRole('link', { name: new RegExp(`^${nombre}\\s*Abrir tablero`) }).click();

      cy.location('pathname').should('match', /^\/proyectos\/[0-9a-f-]{36}$/);
      cy.findByRole('heading', { level: 1, name: nombre }).should('be.visible');
      cy.get('section[aria-labelledby^="columna-"] h2').then(($titulos) => {
        const columnas = [...$titulos].map((h) => h.textContent);
        expect(columnas).to.deep.eq(['Por Hacer', 'En Progreso', 'Hecho']);
      });
      cy.findByRole('progressbar').should('have.attr', 'aria-valuenow', '0');
      cy.screenshot('REG-EQU-05-02-tablero-tres-columnas');
      cy.registrarCaso('REG-EQU-05', 'Apareció el aviso "... creado con sus 3 listas.", la tarjeta del proyecto (data-testid="tarjeta-proyecto", sin aria-label; su nombre accesible empieza por el texto visible) y el tablero mostró las columnas Por Hacer, En Progreso y Hecho con progreso 0%.');
    });
  });

  it('REG-EQU-06 Un miembro que no es líder no ve las acciones de líder', () => {
    cy.usuarioConToken('ui-nolider').then(({ usuario: miembro }) => {
      cy.then(() => cy.crearEquipoApi(lider.token, `Equipo permisos ${Date.now()}`)).then((equipo) => {
        cy.agregarMiembroApi(lider.token, equipo.id, miembro.id);
        cy.clearLocalStorage();
        cy.loginPorApi(miembro);
        cy.visit(`/equipos/${equipo.id}`);
        cy.findByRole('heading', { level: 1 }).should('contain', equipo.nombre);
        cy.findByRole('button', { name: 'Invitar' }).should('not.exist');
        cy.findByRole('button', { name: /^Quitar a / }).should('not.exist');
        cy.findByRole('button', { name: /Eliminar/ }).should('not.exist');
        cy.screenshot('REG-EQU-06-01-vista-miembro');
        cy.registrarCaso('REG-EQU-06', 'La vista del equipo para un miembro no mostró los botones "Invitar", "Quitar a ..." ni "Eliminar" (equipo o proyecto).');
      });
    });
  });
});
