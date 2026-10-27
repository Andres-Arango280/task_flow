import { usuarioUnico } from '../../support/commands';

// Pruebas de accesibilidad con Cypress + axe-core (cypress-axe) sobre las pantallas de las
// seis funcionalidades: acceso (login/registro), equipos, proyectos, tablero/tareas,
// preferencias/ayuda (usuario) y el diálogo de creación de tareas.
// Se evalúan las reglas WCAG 2.0/2.1/2.2 de nivel A y AA; las de «buenas prácticas» no hacen fallar el caso.

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

interface ResultadoAxe {
  testEngine: { version: string };
  violations: { id: string; impact: string; help: string; nodes: unknown[] }[];
  passes: unknown[];
  incomplete: unknown[];
}

/** Ejecuta axe-core en la página (o en un contexto) y registra el resultado real del caso */
function auditar(id: string, contexto?: string, captura = `${id}-01-pagina-auditada`) {
  cy.injectAxe();
  cy.screenshot(captura);
  cy.window({ log: false })
    .then((win) => {
      const axe = (win as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<ResultadoAxe> } }).axe;
      return cy.wrap(
        axe.run(contexto ?? win.document, {
          runOnly: { type: 'tag', values: ETIQUETAS_WCAG },
          resultTypes: ['violations', 'passes', 'incomplete'],
        }),
        { log: false, timeout: 30000 },
      );
    })
    .then((resultado) => {
      const r = resultado as unknown as ResultadoAxe;
      const detalle = r.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length} nodo(s)): ${v.help}`);
      const obtenido = detalle.length
        ? `${detalle.length} violación(es) WCAG A/AA con axe-core ${r.testEngine.version}: ${detalle.join('; ')}. ${r.passes.length} reglas superadas.`
        : `0 violaciones WCAG 2.x A/AA (axe-core ${r.testEngine.version}); ${r.passes.length} reglas superadas, ${r.incomplete.length} marcadas para revisión manual.`;
      cy.registrarCaso(id, obtenido);
      cy.task('log', `${id}: ${obtenido}`, { log: false });
      expect(r.violations, `violaciones WCAG A/AA: ${detalle.join(' | ')}`).to.have.length(0);
    });
}

describe('Accesibilidad - Pantallas públicas (acceso)', () => {
  it('CYA-LOG-01 La página de inicio de sesión no tiene violaciones WCAG A/AA', () => {
    cy.visit('/login');
    cy.findByRole('heading', { level: 1, name: 'Iniciar sesión' }).should('be.visible');
    auditar('CYA-LOG-01');
  });

  it('CYA-REG-01 La página de registro no tiene violaciones WCAG A/AA (incluida la lista de requisitos de contraseña)', () => {
    cy.visit('/register');
    cy.findByRole('heading', { level: 1, name: 'Crear cuenta' }).should('be.visible');
    cy.findByLabelText(/^Contraseña/).type('abc');
    auditar('CYA-REG-01');
  });

  it('CYA-PRI-01 La página de privacidad (pública) no tiene violaciones WCAG A/AA', () => {
    cy.visit('/privacidad');
    cy.findByRole('heading', { level: 1 }).should('be.visible');
    cy.get('main').should('exist');
    auditar('CYA-PRI-01');
  });
});

describe('Accesibilidad - Pantallas privadas (equipos, proyectos, tablero, usuario)', () => {
  type Escenario = {
    usuario: { id: string; nombre: string; email: string; password: string };
    token: string;
    equipo: { id: string; nombre: string };
    proyecto: { id: string; nombre: string };
    listas: { id: string; nombre: string }[];
  };
  let esc: Escenario;

  beforeEach(() => {
    cy.escenarioProyecto('a11y').then((datos) => {
      esc = datos as Escenario;
      cy.crearTareaApi(esc.token, { titulo: 'Preparar la demostración', descripcion: 'Ensayo general', proyectoId: esc.proyecto.id, asignados: [esc.usuario.id] });
      cy.crearTareaApi(esc.token, { titulo: 'Redactar el informe', proyectoId: esc.proyecto.id }).then((tarea) =>
        cy.api('PATCH', `/tareas/${tarea.id}/mover`, { token: esc.token, body: { nuevaListaId: esc.listas[2].id } }).its('status').should('eq', 200),
      );
      cy.loginPorApi(esc.usuario);
    });
  });

  it('CYA-INI-01 «Mis equipos» con un equipo creado no tiene violaciones WCAG A/AA', () => {
    cy.visit('/');
    cy.findByRole('heading', { level: 1, name: 'Mis equipos' }).should('be.visible');
    cy.contains('[data-testid="tarjeta-equipo"]', esc.equipo.nombre).should('be.visible');
    auditar('CYA-INI-01');
  });

  it('CYA-EQU-01 La página del equipo (miembros y proyectos) no tiene violaciones WCAG A/AA', () => {
    cy.visit(`/equipos/${esc.equipo.id}`);
    cy.findByRole('heading', { level: 1, name: esc.equipo.nombre }).should('be.visible');
    cy.contains(esc.proyecto.nombre).should('be.visible');
    auditar('CYA-EQU-01');
  });

  it('CYA-TAB-01 El tablero Kanban con tareas en dos columnas no tiene violaciones WCAG A/AA', () => {
    cy.visit(`/proyectos/${esc.proyecto.id}`);
    cy.findByRole('heading', { level: 1, name: esc.proyecto.nombre }).should('be.visible');
    cy.contains('Preparar la demostración').should('be.visible');
    cy.contains('Redactar el informe').should('be.visible');
    auditar('CYA-TAB-01');
  });

  it('CYA-MOD-01 El diálogo «Crear nueva tarea» es accesible y recibe el foco al abrirse', () => {
    cy.visit(`/proyectos/${esc.proyecto.id}`);
    cy.findByRole('heading', { level: 1, name: esc.proyecto.nombre }).should('be.visible');
    cy.findByRole('button', { name: 'Nueva tarea' }).click();
    cy.findByRole('dialog', { name: 'Crear nueva tarea' }).should('be.visible').and('have.attr', 'aria-modal', 'true');
    cy.focused().should(($el) => {
      expect($el.closest('[role="dialog"]'), 'el foco está dentro del diálogo').to.have.length(1);
    });
    auditar('CYA-MOD-01', '[role="dialog"]');
  });

  it('CYA-PRE-01 La página de preferencias (interruptores y opciones) no tiene violaciones WCAG A/AA', () => {
    cy.visit('/preferencias');
    cy.findByRole('heading', { level: 1, name: 'Preferencias' }).should('be.visible');
    cy.findByRole('switch', { name: 'Alto contraste' }).should('exist');
    auditar('CYA-PRE-01');
  });

  it('CYA-AYU-01 La página de ayuda no tiene violaciones WCAG A/AA', () => {
    cy.visit('/ayuda');
    cy.findByRole('heading', { level: 1 }).should('be.visible');
    auditar('CYA-AYU-01');
  });

  it('CYA-CON-01 Con alto contraste y texto grande el tablero mantiene el contraste de color exigido por WCAG', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('taskflow:preferencias', JSON.stringify({ altoContraste: true, tamanoTexto: 'grande' }));
    });
    cy.visit(`/proyectos/${esc.proyecto.id}`);
    cy.get('html').should('have.attr', 'data-contraste', 'alto').and('have.attr', 'data-texto', 'grande');
    cy.findByRole('heading', { level: 1, name: esc.proyecto.nombre }).should('be.visible');
    auditar('CYA-CON-01', undefined, 'CYA-CON-01-01-alto-contraste-texto-grande');
  });
});

describe('Accesibilidad - Navegación por teclado', () => {
  it('CYA-TEC-01 El formulario de inicio de sesión se completa y envía solo con el teclado', () => {
    const usuario = usuarioUnico('a11y-teclado');
    cy.registrarPorApi(usuario);
    cy.visit('/login');
    cy.findByLabelText(/Correo electrónico/).focus().type(usuario.email);
    cy.focused().should('have.attr', 'type', 'email');
    cy.findByLabelText(/^Contraseña/).focus().type(`${usuario.password}{enter}`);
    cy.location('pathname').should('eq', '/');
    cy.findByRole('heading', { level: 1, name: 'Mis equipos' }).should('be.visible');
    cy.screenshot('CYA-TEC-01-01-sesion-iniciada-con-teclado');
    cy.registrarCaso('CYA-TEC-01', 'Ambos campos recibieron el foco y el texto desde el teclado; Enter envió el formulario y se llegó a «Mis equipos» sin usar el ratón.');
  });
});
