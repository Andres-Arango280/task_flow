import { UUID, contienePassword, mensajes, textoMensajes } from '../../support/utilidades';

describe('API - Usuarios (/usuarios)', () => {
  let token: string;
  let usuario: { id: string; nombre: string; email: string; password: string };

  beforeEach(() => {
    cy.usuarioConToken('usu').then((datos) => {
      token = datos.token;
      usuario = datos.usuario as typeof usuario;
    });
  });

  it('API-USU-01 GET /usuarios/me con token devuelve el perfil sin contraseña', () => {
    cy.api('GET', '/usuarios/me', { token }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.id).to.match(UUID);
      expect(res.body).to.include({ id: usuario.id, email: usuario.email, nombre: usuario.nombre });
      expect(contienePassword(res.body)).to.eq(false);
      cy.registrarCaso('API-USU-01', `Respondió ${res.status} con el perfil (id, nombre, email, fechas) y sin campo password.`, res);
    });
  });

  it('API-USU-02 GET /usuarios/me sin token devuelve 401', () => {
    cy.api('GET', '/usuarios/me').then((res) => {
      expect(res.status).to.eq(401);
      cy.registrarCaso('API-USU-02', `Respondió ${res.status} (Unauthorized): la ruta exige autenticación.`, res);
    });
  });

  it('API-USU-03 GET /usuarios/me con un token manipulado devuelve 401', () => {
    const partes = token.split('.');
    const manipulado = `${partes[0]}.${partes[1]}.firmaFalsa${partes[2].slice(10)}`;
    cy.api('GET', '/usuarios/me', { token: manipulado }).then((res) => {
      expect(res.status).to.eq(401);
      cy.registrarCaso('API-USU-03', `Respondió ${res.status}: la firma alterada del JWT fue rechazada.`, res);
    });
  });

  it('API-USU-04 Buscar usuario por email (sin distinguir mayúsculas) devuelve 200', () => {
    cy.api('GET', '/usuarios', { token, qs: { email: usuario.email.toUpperCase() } }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.id).to.eq(usuario.id);
      expect(contienePassword(res.body)).to.eq(false);
      cy.registrarCaso('API-USU-04', `Respondió ${res.status} con el usuario ${res.body.email} buscando el correo en mayúsculas; sin password.`, res);
    });
  });

  it('API-USU-05 Buscar un email inexistente devuelve 404 "Usuario no encontrado"', () => {
    cy.api('GET', '/usuarios', { token, qs: { email: `nadie.${Date.now()}@taskflow-cypress.test` } }).then((res) => {
      expect(res.status).to.eq(404);
      expect(mensajes(res.body)).to.include('Usuario no encontrado');
      cy.registrarCaso('API-USU-05', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-USU-06 Buscar sin el parámetro email devuelve 400', () => {
    cy.api('GET', '/usuarios', { token }).then((res) => {
      expect(res.status).to.eq(400);
      expect(mensajes(res.body)).to.include('Debes proporcionar un email');
      cy.registrarCaso('API-USU-06', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-USU-07 PATCH /usuarios/me actualiza el nombre (recortando espacios)', () => {
    const nuevo = `Nombre Editado ${Date.now()}`;
    cy.api('PATCH', '/usuarios/me', { token, body: { nombre: `  ${nuevo}  ` } }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.nombre).to.eq(nuevo);
      expect(contienePassword(res.body)).to.eq(false);
      cy.registrarCaso('API-USU-07', `Respondió ${res.status} con nombre "${res.body.nombre}" (sin espacios sobrantes).`, res);
    });
  });

  it('API-USU-08 PATCH /usuarios/me con nombre vacío devuelve 400', () => {
    cy.api('PATCH', '/usuarios/me', { token, body: { nombre: '' } }).then((res) => {
      expect(res.status).to.eq(400);
      expect(mensajes(res.body)).to.include('El nombre es obligatorio');
      cy.registrarCaso('API-USU-08', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-USU-09 Eliminar la cuenta siendo líder de un equipo devuelve 409', () => {
    cy.crearEquipoApi(token, `Equipo lider ${Date.now()}`);
    cy.api('DELETE', '/usuarios/me', { token }).then((res) => {
      expect(res.status).to.eq(409);
      expect(mensajes(res.body)[0]).to.match(/^Eres líder de 1 equipo\(s\)/);
      cy.registrarCaso('API-USU-09', `Respondió ${res.status} con ${textoMensajes(res.body)}; la cuenta no se borró.`, res);
    });
  });

  it('API-USU-10 Eliminar la cuenta sin equipos devuelve 200 y luego no se puede iniciar sesión', () => {
    cy.api('DELETE', '/usuarios/me', { token }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.deep.eq({ id: usuario.id, eliminado: true });
      cy.api('POST', '/auth/login', { body: { email: usuario.email, password: usuario.password } }).then((login) => {
        expect(login.status).to.eq(401);
        cy.registrarCaso('API-USU-10', `DELETE respondió ${res.status} {eliminado: true}; el login posterior respondió ${login.status}.`, res);
      });
    });
  });
});
