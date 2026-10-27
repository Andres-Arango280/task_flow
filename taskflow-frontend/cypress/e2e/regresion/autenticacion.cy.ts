import { usuarioUnico } from '../../support/commands';
import { UUID_INEXISTENTE } from '../../support/utilidades';

describe('Regresión UI - Registro, inicio de sesión y rutas protegidas', () => {
  it('REG-AUT-01 Registro correcto redirige al login con el correo precargado y aviso de éxito', () => {
    const usuario = usuarioUnico('ui-reg');
    cy.intercept('POST', '**/auth/register').as('registro');
    cy.visit('/register');
    cy.findByRole('heading', { name: 'Crear cuenta' }).should('be.visible');
    cy.findByLabelText(/Nombre completo/).type(usuario.nombre);
    cy.findByLabelText(/Correo electrónico/).type(usuario.email);
    cy.findByLabelText(/^Contraseña/).type(usuario.password);
    cy.findByLabelText(/Confirmar contraseña/).type(usuario.password);
    cy.contains('li', 'Al menos 8 caracteres').should('contain', 'cumplido');
    cy.contains('li', 'Al menos una letra').should('contain', 'cumplido');
    cy.contains('li', 'Al menos un número').should('contain', 'cumplido');
    cy.contains('li', 'Las dos contraseñas coinciden').should('contain', 'cumplido');
    cy.screenshot('REG-AUT-01-01-formulario-completo');
    cy.findByRole('button', { name: 'Crear cuenta' }).click();

    cy.wait('@registro').its('response.statusCode').should('eq', 201);
    cy.location('pathname').should('eq', '/login');
    cy.contains('[role="status"]', 'Cuenta creada correctamente').should('be.visible');
    cy.findByLabelText(/Correo electrónico/).should('have.value', usuario.email);
    cy.screenshot('REG-AUT-01-02-login-con-aviso');
    cy.registrarCaso('REG-AUT-01', 'La API respondió 201, se redirigió a /login con el aviso "Cuenta creada correctamente" y el correo precargado.');
  });

  it('REG-AUT-02 Registro con un correo ya registrado muestra una alerta clara', () => {
    const usuario = usuarioUnico('ui-dup');
    cy.registrarPorApi(usuario);
    cy.visit('/register');
    cy.findByLabelText(/Nombre completo/).type('Otra Persona');
    cy.findByLabelText(/Correo electrónico/).type(usuario.email);
    cy.findByLabelText(/^Contraseña/).type('Otra-Clave-1');
    cy.findByLabelText(/Confirmar contraseña/).type('Otra-Clave-1');
    cy.findByRole('button', { name: 'Crear cuenta' }).click();

    cy.findByRole('alert')
      .should('contain', `Ya existe una cuenta con el correo ${usuario.email}`)
      .and('contain', 'Inicia sesión con ella o usa otro correo');
    cy.location('pathname').should('eq', '/register');
    cy.screenshot('REG-AUT-02-01-alerta-correo-duplicado');
    cy.registrarCaso('REG-AUT-02', `Se mostró la alerta "Ya existe una cuenta con el correo ${usuario.email}..." y se permaneció en /register.`);
  });

  it('REG-AUT-03 Contraseña que no cumple la política (8 caracteres, letra y número) se rechaza en el cliente sin llamar a la API', () => {
    cy.intercept('POST', '**/auth/register').as('registro');
    cy.visit('/register');
    cy.findByLabelText(/Nombre completo/).type('Ana Corta');
    cy.findByLabelText(/Correo electrónico/).type(usuarioUnico('ui-corta').email);
    cy.findByLabelText(/^Contraseña/).type('12345');
    cy.findByLabelText(/Confirmar contraseña/).type('12345');
    cy.contains('li', 'Al menos 8 caracteres').should('contain', 'pendiente');
    cy.contains('li', 'Al menos una letra').should('contain', 'pendiente');
    cy.contains('li', 'Al menos un número').should('contain', 'cumplido');
    cy.findByRole('button', { name: 'Crear cuenta' }).click();

    const mensaje = 'La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número.';
    cy.findByRole('alert').should('have.text', mensaje);
    cy.screenshot('REG-AUT-03-01-contrasena-corta');
    // 8 caracteres pero sin número: también se rechaza en el cliente
    cy.findByLabelText(/^Contraseña/).clear().type('abcdefgh');
    cy.findByLabelText(/Confirmar contraseña/).clear().type('abcdefgh');
    cy.contains('li', 'Al menos 8 caracteres').should('contain', 'cumplido');
    cy.contains('li', 'Al menos un número').should('contain', 'pendiente');
    cy.findByRole('button', { name: 'Crear cuenta' }).click();
    cy.findByRole('alert').should('have.text', mensaje);
    cy.get('@registro.all').should('have.length', 0);
    cy.registrarCaso('REG-AUT-03', `Con "12345" y con "abcdefgh" la lista de requisitos marcó los pendientes, se mostró "${mensaje}" y no se envió ninguna petición POST /auth/register.`);
  });

  it('REG-AUT-04 Inicio de sesión correcto lleva a "Mis equipos" y guarda la sesión', () => {
    const usuario = usuarioUnico('ui-login');
    cy.registrarPorApi(usuario);
    cy.visit('/login');
    cy.findByLabelText(/Correo electrónico/).type(usuario.email);
    cy.findByLabelText(/^Contraseña/).type(usuario.password);
    cy.screenshot('REG-AUT-04-01-formulario-login');
    cy.findByRole('button', { name: 'Iniciar sesión' }).click();

    cy.location('pathname').should('eq', '/');
    cy.findByRole('heading', { level: 1, name: 'Mis equipos' }).should('be.visible');
    cy.findByRole('navigation', { name: 'Navegación principal' }).should('contain', usuario.nombre);
    cy.window().then((win) => {
      expect(win.localStorage.getItem('access_token')).to.match(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(JSON.parse(win.localStorage.getItem('user')!)).to.include({ email: usuario.email });
    });
    cy.screenshot('REG-AUT-04-02-mis-equipos');
    cy.registrarCaso('REG-AUT-04', 'Se navegó a "/" con el título "Mis equipos", el nombre en la barra y el token JWT + usuario guardados en localStorage.');
  });

  it('REG-AUT-05 Contraseña incorrecta muestra una alerta y no inicia sesión', () => {
    // Correo exclusivo: el bloqueo por intentos fallidos no afecta a otras pruebas
    const usuario = usuarioUnico('ui-malpass');
    cy.registrarPorApi(usuario);
    cy.visit('/login');
    cy.findByLabelText(/Correo electrónico/).type(usuario.email);
    cy.findByLabelText(/^Contraseña/).type('no-es-la-clave');
    cy.findByRole('button', { name: 'Iniciar sesión' }).click();

    cy.findByRole('alert').should('contain', 'El correo o la contraseña no son correctos. Revísalos e inténtalo de nuevo.');
    cy.location('pathname').should('eq', '/login');
    cy.window().its('localStorage').invoke('getItem', 'access_token').should('be.null');
    cy.screenshot('REG-AUT-05-01-alerta-credenciales');
    cy.registrarCaso('REG-AUT-05', 'Se mostró la alerta "El correo o la contraseña no son correctos..." y no se guardó ningún token.');
  });

  it('REG-AUT-06 Recargar la página mantiene la sesión abierta', () => {
    const usuario = usuarioUnico('ui-recarga');
    cy.registrarPorApi(usuario);
    cy.loginPorApi(usuario);
    cy.visit('/preferencias');
    cy.findByRole('heading', { level: 1, name: 'Preferencias' }).should('be.visible');
    cy.reload();
    cy.location('pathname').should('eq', '/preferencias');
    cy.findByRole('heading', { level: 1, name: 'Preferencias' }).should('be.visible');
    cy.contains('strong', usuario.email).should('be.visible');
    cy.screenshot('REG-AUT-06-01-tras-recarga');
    cy.registrarCaso('REG-AUT-06', 'Tras cy.reload() se siguió en /preferencias con el correo del usuario visible, sin volver al login.');
  });

  it('REG-AUT-07 Las rutas privadas sin sesión redirigen a /login', () => {
    const rutas = ['/', `/equipos/${UUID_INEXISTENTE}`, `/proyectos/${UUID_INEXISTENTE}`, '/preferencias', '/ayuda'];
    rutas.forEach((ruta) => {
      cy.visit(ruta);
      cy.location('pathname').should('eq', '/login');
      cy.findByRole('heading', { name: 'Iniciar sesión' }).should('be.visible');
    });
    // La página de privacidad es pública
    cy.visit('/privacidad');
    cy.location('pathname').should('eq', '/privacidad');
    cy.screenshot('REG-AUT-07-01-privacidad-publica');
    cy.registrarCaso('REG-AUT-07', `Las ${rutas.length} rutas privadas (${rutas.join(', ')}) redirigieron a /login; /privacidad siguió siendo pública.`);
  });

  it('REG-AUT-08 Una sesión con token inválido se descarta y vuelve al login', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('access_token', 'token.invalido.firma');
      win.localStorage.setItem('user', JSON.stringify({ id: UUID_INEXISTENTE, nombre: 'Fantasma', email: 'fantasma@x.test' }));
    });
    cy.intercept('GET', '**/equipos').as('equipos');
    cy.visit('/');
    cy.wait('@equipos').its('response.statusCode').should('eq', 401);
    cy.location('pathname').should('eq', '/login');
    cy.window().its('localStorage').invoke('getItem', 'access_token').should('be.null');
    cy.screenshot('REG-AUT-08-01-sesion-descartada');
    cy.registrarCaso('REG-AUT-08', 'GET /equipos respondió 401, la app borró access_token/user y redirigió a /login.');
  });

  it('REG-AUT-09 Cerrar sesión pide confirmación y limpia la sesión', () => {
    const usuario = usuarioUnico('ui-salir');
    cy.registrarPorApi(usuario);
    cy.loginPorApi(usuario);
    cy.visit('/');
    cy.findByRole('button', { name: 'Salir' }).click();
    cy.findByRole('alertdialog', { name: '¿Cerrar sesión?' }).should('be.visible');
    cy.screenshot('REG-AUT-09-01-confirmar-salida');
    cy.findByRole('alertdialog').within(() => cy.findByRole('button', { name: 'Cerrar sesión' }).click());
    cy.location('pathname').should('eq', '/login');
    cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');
    cy.registrarCaso('REG-AUT-09', 'Se mostró el diálogo "¿Cerrar sesión?"; al confirmar se volvió a /login y se borró la sesión.');
  });
});
