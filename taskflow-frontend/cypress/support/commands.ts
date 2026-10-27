/// <reference types="cypress" />
// Comandos personalizados de TaskFlow: preparan datos por API (rápido y reproducible)
// y abren sesión en el navegador tal como lo hace la aplicación (localStorage).

export interface UsuarioPrueba {
  id?: string;
  nombre: string;
  email: string;
  password: string;
}

export interface Sesion {
  token: string;
  user: { id: string; nombre: string; email: string };
}

const api = (ruta: string) => `${Cypress.env('apiUrl')}${ruta}`;

let contador = 0;
/** Genera un usuario con correo único (la BD es compartida: nunca se reutilizan datos) */
export function usuarioUnico(prefijo = 'cy'): UsuarioPrueba {
  contador += 1;
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}${contador}`;
  return {
    nombre: `Usuario ${prefijo} ${marca.slice(-6)}`,
    email: `${prefijo}.${marca}@taskflow-cypress.test`,
    password: 'Clave-Segura-123',
  };
}

/** Petición a la API que nunca falla por el código de estado: las aserciones las hace la prueba */
Cypress.Commands.add('api', (method: string, ruta: string, opciones: { token?: string; body?: unknown; qs?: Record<string, string> } = {}) => {
  return cy.request({
    method,
    url: api(ruta),
    body: opciones.body as Cypress.RequestBody,
    qs: opciones.qs,
    headers: opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {},
    failOnStatusCode: false,
  }).then((res) => {
    // Se adjunta la petición para poder guardarla como evidencia
    const cuerpo = opciones.body as Record<string, unknown> | undefined;
    (res as Cypress.Response<unknown> & { peticion?: unknown }).peticion = {
      metodo: method,
      url: api(ruta),
      query: opciones.qs,
      autenticado: Boolean(opciones.token),
      cuerpo: cuerpo && typeof cuerpo === 'object' && 'password' in cuerpo ? { ...cuerpo, password: '***' } : cuerpo,
    };
    return res;
  });
});

Cypress.Commands.add('registrarPorApi', (usuario: UsuarioPrueba) => {
  return cy
    .request({ method: 'POST', url: api('/auth/register'), body: usuario })
    .then((res) => {
      expect(res.status, 'registro por API').to.eq(201);
      return { ...usuario, id: res.body.id as string };
    });
});

Cypress.Commands.add('tokenPorApi', (usuario: UsuarioPrueba) => {
  return cy
    .request({ method: 'POST', url: api('/auth/login'), body: { email: usuario.email, password: usuario.password } })
    .then((res) => {
      expect(res.status, 'login por API').to.be.oneOf([200, 201]);
      return res.body.access_token as string;
    });
});

/** Crea (si hace falta) un usuario único, inicia sesión por API y deja la sesión lista en localStorage */
Cypress.Commands.add('loginPorApi', (usuario: UsuarioPrueba) => {
  return cy.tokenPorApi(usuario).then((token) =>
    cy
      .request({ url: api('/usuarios/me'), headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const user = { id: res.body.id, nombre: res.body.nombre, email: res.body.email };
        // Mismo formato que guarda src/store/useAuthStore.ts
        window.localStorage.setItem('access_token', token);
        window.localStorage.setItem('user', JSON.stringify(user));
        return { token, user } as Sesion;
      }),
  );
});

/** Registra un usuario nuevo y devuelve su sesión (token + datos) sin tocar el navegador */
Cypress.Commands.add('usuarioConToken', (prefijo = 'cy') => {
  const usuario = usuarioUnico(prefijo);
  return cy.registrarPorApi(usuario).then((creado) =>
    cy.tokenPorApi(creado).then((token) => ({ usuario: creado, token })),
  );
});

Cypress.Commands.add('crearEquipoApi', (token: string, nombre: string) => {
  return cy.api('POST', '/equipos', { token, body: { nombre } }).then((res) => {
    expect(res.status, 'crear equipo por API').to.eq(201);
    return res.body;
  });
});

Cypress.Commands.add('agregarMiembroApi', (token: string, equipoId: string, userId: string) => {
  return cy.api('POST', `/equipos/${equipoId}/miembros`, { token, body: { userId } }).then((res) => {
    expect(res.status, 'agregar miembro por API').to.eq(201);
    return res.body;
  });
});

Cypress.Commands.add('crearProyectoApi', (token: string, equipoId: string, nombre: string) => {
  return cy.api('POST', '/proyectos', { token, body: { nombre, equipoId } }).then((res) => {
    expect(res.status, 'crear proyecto por API').to.eq(201);
    return res.body;
  });
});

Cypress.Commands.add('listasApi', (token: string, proyectoId: string) => {
  return cy.api('GET', `/listas/proyecto/${proyectoId}`, { token }).then((res) => {
    expect(res.status, 'listas por API').to.eq(200);
    return res.body;
  });
});

Cypress.Commands.add('crearTareaApi', (token: string, datos: Record<string, unknown>) => {
  return cy.api('POST', '/tareas', { token, body: datos }).then((res) => {
    expect(res.status, 'crear tarea por API').to.eq(201);
    return res.body;
  });
});

/** Prepara usuario + equipo + proyecto (con sus 3 listas) y devuelve todo lo necesario */
Cypress.Commands.add('escenarioProyecto', (prefijo = 'cy') => {
  return cy.usuarioConToken(prefijo).then(({ usuario, token }) =>
    cy.crearEquipoApi(token, `Equipo ${prefijo} ${Date.now()}`).then((equipo) =>
      cy.crearProyectoApi(token, equipo.id, `Proyecto ${prefijo} ${Date.now()}`).then((proyecto) =>
        cy.listasApi(token, proyecto.id).then((listas) => ({ usuario, token, equipo, proyecto, listas })),
      ),
    ),
  );
});

/**
 * Guarda el resultado obtenido real de un caso (y, en API, la petición y la respuesta)
 * para el resumen de evidencias. El token se enmascara.
 */
Cypress.Commands.add('registrarCaso', (id: string, obtenido: string, res?: Cypress.Response<unknown>) => {
  const registro: Record<string, unknown> = { id, obtenido };
  if (res) {
    registro.peticion = (res as Cypress.Response<unknown> & { peticion?: unknown }).peticion;
    registro.respuesta = { estado: res.status, duracionMs: res.duration, cuerpo: res.body };
  }
  return cy.task('registrarCaso', registro, { log: false });
});

/** Aviso emergente (toast) de éxito o información */
Cypress.Commands.add('aviso', (texto: string | RegExp) => {
  return cy.contains('[role="status"]', texto, { timeout: 10000 });
});

/**
 * Espera a que la API responda. El backend corre con "nest start --watch" y se reinicia
 * cuando cambia algún .ts vigilado; así una recarga del servidor no se confunde con un fallo.
 */
Cypress.Commands.add('esperarBackend', (intentosRestantes = 60) => {
  return cy
    .task('backendDisponible', `${Cypress.env('apiUrl')}/usuarios/me`, { log: false })
    .then((disponible) => {
      if (disponible) return;
      if (intentosRestantes <= 0) throw new Error('La API de TaskFlow no responde en ' + Cypress.env('apiUrl'));
      cy.wait(1000, { log: false });
      cy.esperarBackend(intentosRestantes - 1);
    });
});
