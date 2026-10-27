import { usuarioUnico } from '../../support/commands';
import { UUID, contienePassword, mensajes, textoMensajes } from '../../support/utilidades';

describe('API - Auth (/auth/register, /auth/login)', () => {
  it('API-AUTH-01 Registro válido devuelve 201 con id, nombre y email y sin contraseña', () => {
    const usuario = usuarioUnico('auth');
    cy.api('POST', '/auth/register', { body: usuario }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.id).to.match(UUID);
      expect(res.body).to.include({ nombre: usuario.nombre, email: usuario.email });
      expect(Object.keys(res.body)).to.have.members(['id', 'nombre', 'email']);
      expect(contienePassword(res.body), 'la respuesta no expone password').to.eq(false);
      cy.registrarCaso('API-AUTH-01', `Respondió ${res.status} con id UUID ${res.body.id}, nombre y email; sin campo password.`, res);
    });
  });

  it('API-AUTH-02 Registro con email ya existente devuelve 409 con mensaje en español', () => {
    const usuario = usuarioUnico('dup');
    cy.registrarPorApi(usuario);
    // Mismo correo en mayúsculas: la unicidad no distingue mayúsculas
    cy.api('POST', '/auth/register', { body: { ...usuario, email: usuario.email.toUpperCase() } }).then((res) => {
      expect(res.status).to.eq(409);
      expect(mensajes(res.body)).to.include('El email ya está registrado');
      cy.registrarCaso('API-AUTH-02', `Respondió ${res.status} con el mensaje ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-AUTH-03 Registro con contraseña que no cumple la política (8 caracteres, letra y número) devuelve 400', () => {
    const resultados: string[] = [];
    cy.api('POST', '/auth/register', { body: { ...usuarioUnico('corta'), password: 'abc1' } }).then((res) => {
      expect(res.status).to.eq(400);
      expect(mensajes(res.body)).to.include('La contraseña debe tener al menos 8 caracteres');
      resultados.push(`"abc1" → ${res.status} ${textoMensajes(res.body)}`);
    });
    cy.api('POST', '/auth/register', { body: { ...usuarioUnico('sinletra'), password: '12345678' } }).then((res) => {
      expect(res.status).to.eq(400);
      expect(mensajes(res.body)).to.include('La contraseña debe contener al menos una letra');
      resultados.push(`"12345678" → ${res.status} ${textoMensajes(res.body)}`);
    });
    cy.api('POST', '/auth/register', { body: { ...usuarioUnico('sinnumero'), password: 'abcdefgh' } }).then((res) => {
      expect(res.status).to.eq(400);
      expect(mensajes(res.body)).to.include('La contraseña debe contener al menos un número');
      resultados.push(`"abcdefgh" → ${res.status} ${textoMensajes(res.body)}`);
      cy.registrarCaso('API-AUTH-03', `${resultados.join('; ')}; no se creó ningún usuario.`, res);
    });
  });

  it('API-AUTH-04 Registro con email inválido y nombre vacío devuelve 400 con un mensaje por campo', () => {
    cy.api('POST', '/auth/register', { body: { nombre: '', email: 'no-es-un-correo', password: 'Valida-123' } }).then((res) => {
      expect(res.status).to.eq(400);
      const lista = mensajes(res.body);
      expect(lista).to.include('El nombre es obligatorio');
      expect(lista.some((m) => m.startsWith('El correo electrónico no tiene un formato válido'))).to.eq(true);
      cy.registrarCaso('API-AUTH-04', `Respondió ${res.status} con ${lista.length} mensajes en español: ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-AUTH-05 Login con credenciales correctas devuelve un JWT', () => {
    const usuario = usuarioUnico('login');
    cy.registrarPorApi(usuario);
    cy.api('POST', '/auth/login', { body: { email: usuario.email, password: usuario.password } }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
      expect(res.body.access_token).to.be.a('string');
      expect(res.body.access_token.split('.'), 'JWT con 3 partes').to.have.length(3);
      const payload = JSON.parse(atob(res.body.access_token.split('.')[1]));
      expect(payload.email).to.eq(usuario.email);
      expect(contienePassword(payload)).to.eq(false);
      cy.registrarCaso('API-AUTH-05', `Respondió ${res.status} con access_token JWT válido (payload con email ${payload.email}, sin password).`, res);
    });
  });

  it('API-AUTH-06 Login con contraseña incorrecta devuelve 401 sin token', () => {
    const usuario = usuarioUnico('malpass');
    cy.registrarPorApi(usuario);
    cy.api('POST', '/auth/login', { body: { email: usuario.email, password: 'incorrecta-999' } }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body).not.to.have.property('access_token');
      expect(mensajes(res.body)).to.include('Credenciales inválidas');
      cy.registrarCaso('API-AUTH-06', `Respondió ${res.status} con ${textoMensajes(res.body)} y sin access_token.`, res);
    });
  });

  it('API-AUTH-07 Tras 5 intentos fallidos el login del mismo correo se bloquea (429)', () => {
    // Correo exclusivo de esta prueba: el bloqueo dura 15 minutos y no afecta a otras
    const usuario = usuarioUnico('bloqueo');
    cy.registrarPorApi(usuario);
    const estados: number[] = [];
    Cypress._.times(5, () => {
      cy.api('POST', '/auth/login', { body: { email: usuario.email, password: 'mala-clave' } }).then((r) => estados.push(r.status));
    });
    // Incluso con la contraseña correcta, el sexto intento queda bloqueado
    cy.api('POST', '/auth/login', { body: { email: usuario.email, password: usuario.password } }).then((res) => {
      expect(estados).to.deep.eq([401, 401, 401, 401, 401]);
      expect(res.status).to.eq(429);
      expect(mensajes(res.body)[0]).to.match(/^Demasiados intentos fallidos/);
      cy.registrarCaso(
        'API-AUTH-07',
        `Los 5 intentos fallidos respondieron ${estados.join(', ')}; el 6.º (con la clave correcta) respondió ${res.status}: ${textoMensajes(res.body)}.`,
        res,
      );
    });
  });

  it('API-AUTH-08 Login con un correo no registrado devuelve 401 con el mismo mensaje genérico', () => {
    cy.api('POST', '/auth/login', { body: { email: usuarioUnico('noexiste').email, password: 'loquesea-1' } }).then((res) => {
      expect(res.status).to.eq(401);
      expect(mensajes(res.body)).to.include('Credenciales inválidas');
      cy.registrarCaso('API-AUTH-08', `Respondió ${res.status} con ${textoMensajes(res.body)} (no revela si el correo existe).`, res);
    });
  });
});
