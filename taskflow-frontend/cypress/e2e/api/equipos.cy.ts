import { UUID, UUID_INEXISTENTE, contienePassword, mensajes, textoMensajes } from '../../support/utilidades';

describe('API - Equipos (/equipos)', () => {
  // Líder, miembro y una persona ajena, creados de nuevo en cada prueba (independientes)
  let lider: { token: string; id: string };
  let miembro: { token: string; id: string; email: string };
  let ajeno: { token: string; id: string };
  let equipoId: string;

  beforeEach(() => {
    cy.usuarioConToken('lider').then(({ usuario, token }) => (lider = { token, id: usuario.id }));
    cy.usuarioConToken('miembro').then(({ usuario, token }) => (miembro = { token, id: usuario.id, email: usuario.email }));
    cy.usuarioConToken('ajeno').then(({ usuario, token }) => (ajeno = { token, id: usuario.id }));
    cy.then(() => cy.crearEquipoApi(lider.token, `Equipo API ${Date.now()}`)).then((equipo) => (equipoId = equipo.id));
  });

  it('API-EQU-01 Crear equipo devuelve 201 con el creador como líder y miembro', () => {
    const nombre = `Equipo nuevo ${Date.now()}`;
    cy.api('POST', '/equipos', { token: lider.token, body: { nombre } }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.id).to.match(UUID);
      expect(res.body.nombre).to.eq(nombre);
      expect(res.body.liderId).to.eq(lider.id);
      expect(res.body.lider.id).to.eq(lider.id);
      expect(res.body.miembros.map((m: { id: string }) => m.id)).to.include(lider.id);
      expect(contienePassword(res.body), 'ni el líder ni los miembros exponen password').to.eq(false);
      cy.registrarCaso('API-EQU-01', `Respondió ${res.status}; liderId = creador, miembros = [creador] y ningún usuario incluye password.`, res);
    });
  });

  it('API-EQU-02 Crear equipo sin nombre devuelve 400', () => {
    cy.api('POST', '/equipos', { token: lider.token, body: { nombre: '' } }).then((res) => {
      expect(res.status).to.eq(400);
      expect(mensajes(res.body)).to.include('El nombre es obligatorio');
      cy.registrarCaso('API-EQU-02', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-EQU-03 GET /equipos lista solo los equipos del usuario', () => {
    cy.api('GET', '/equipos', { token: lider.token }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.be.an('array').with.length(1);
      expect(res.body[0].id).to.eq(equipoId);
      cy.api('GET', '/equipos', { token: ajeno.token }).then((resAjeno) => {
        expect(resAjeno.body).to.deep.eq([]);
        cy.registrarCaso('API-EQU-03', `El líder recibió ${res.body.length} equipo (el suyo); la persona ajena recibió una lista vacía.`, res);
      });
    });
  });

  it('API-EQU-04 Una persona ajena no puede ver el equipo (403)', () => {
    cy.api('GET', `/equipos/${equipoId}`, { token: ajeno.token }).then((res) => {
      expect(res.status).to.eq(403);
      expect(mensajes(res.body)).to.include('No tienes acceso a este equipo');
      cy.registrarCaso('API-EQU-04', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-EQU-05 Un id que no es UUID devuelve 400', () => {
    cy.api('GET', '/equipos/123-no-uuid', { token: lider.token }).then((res) => {
      expect(res.status).to.eq(400);
      cy.registrarCaso('API-EQU-05', `Respondió ${res.status} (${textoMensajes(res.body)}).`, res);
    });
  });

  it('API-EQU-06 Un equipo inexistente devuelve 404', () => {
    cy.api('GET', `/equipos/${UUID_INEXISTENTE}`, { token: lider.token }).then((res) => {
      expect(res.status).to.eq(404);
      expect(mensajes(res.body)).to.include('Equipo no encontrado');
      cy.registrarCaso('API-EQU-06', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-EQU-07 El líder agrega un miembro y aparece en /miembros', () => {
    cy.api('POST', `/equipos/${equipoId}/miembros`, { token: lider.token, body: { userId: miembro.id } }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.miembros.map((m: { id: string }) => m.id)).to.include(miembro.id);
      expect(contienePassword(res.body)).to.eq(false);
      cy.api('GET', `/equipos/${equipoId}/miembros`, { token: miembro.token }).then((lista) => {
        expect(lista.status).to.eq(200);
        expect(lista.body.lider.id).to.eq(lider.id);
        expect(lista.body.miembros.map((m: { email: string }) => m.email)).to.include(miembro.email);
        cy.registrarCaso('API-EQU-07', `Respondió ${res.status}; el nuevo miembro ya puede consultar /miembros (${lista.status}) y figura en la lista.`, res);
      });
    });
  });

  it('API-EQU-08 Agregar dos veces al mismo miembro devuelve 409', () => {
    cy.agregarMiembroApi(lider.token, equipoId, miembro.id);
    cy.api('POST', `/equipos/${equipoId}/miembros`, { token: lider.token, body: { userId: miembro.id } }).then((res) => {
      expect(res.status).to.eq(409);
      expect(mensajes(res.body)).to.include('El usuario ya es miembro del equipo');
      cy.registrarCaso('API-EQU-08', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-EQU-09 Agregar un usuario inexistente devuelve 404', () => {
    cy.api('POST', `/equipos/${equipoId}/miembros`, { token: lider.token, body: { userId: UUID_INEXISTENTE } }).then((res) => {
      expect(res.status).to.eq(404);
      expect(mensajes(res.body)).to.include('Usuario no encontrado');
      cy.registrarCaso('API-EQU-09', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-EQU-10 Un miembro que no es líder no puede agregar miembros (403)', () => {
    cy.agregarMiembroApi(lider.token, equipoId, miembro.id);
    cy.api('POST', `/equipos/${equipoId}/miembros`, { token: miembro.token, body: { userId: ajeno.id } }).then((res) => {
      expect(res.status).to.eq(403);
      expect(mensajes(res.body)).to.include('Solo el líder puede agregar miembros');
      cy.registrarCaso('API-EQU-10', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-EQU-11 Agregar miembro sin userId devuelve 400', () => {
    cy.api('POST', `/equipos/${equipoId}/miembros`, { token: lider.token, body: {} }).then((res) => {
      expect(res.status).to.eq(400);
      expect(mensajes(res.body)).to.include('Debe enviar userId o usuarioId');
      cy.registrarCaso('API-EQU-11', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-EQU-12 El líder quita a un miembro y este pierde el acceso', () => {
    cy.agregarMiembroApi(lider.token, equipoId, miembro.id);
    cy.api('DELETE', `/equipos/${equipoId}/miembros/${miembro.id}`, { token: lider.token }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.miembros.map((m: { id: string }) => m.id)).not.to.include(miembro.id);
      cy.api('GET', `/equipos/${equipoId}`, { token: miembro.token }).then((despues) => {
        expect(despues.status).to.eq(403);
        cy.registrarCaso('API-EQU-12', `Respondió ${res.status} sin el miembro en la lista; después el exmiembro recibe ${despues.status} al abrir el equipo.`, res);
      });
    });
  });

  it('API-EQU-13 El líder no puede quitarse a sí mismo (400)', () => {
    cy.api('DELETE', `/equipos/${equipoId}/miembros/${lider.id}`, { token: lider.token }).then((res) => {
      expect(res.status).to.eq(400);
      expect(mensajes(res.body)).to.include('El líder no puede eliminarse del equipo');
      cy.registrarCaso('API-EQU-13', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-EQU-14 Solo el líder elimina el equipo; después devuelve 404', () => {
    cy.agregarMiembroApi(lider.token, equipoId, miembro.id);
    cy.api('DELETE', `/equipos/${equipoId}`, { token: miembro.token }).then((denegado) => {
      expect(denegado.status).to.eq(403);
      expect(mensajes(denegado.body)).to.include('Solo el líder puede eliminar el equipo');
      cy.api('DELETE', `/equipos/${equipoId}`, { token: lider.token }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.deep.eq({ id: equipoId, eliminado: true });
        cy.api('GET', `/equipos/${equipoId}`, { token: lider.token }).then((despues) => {
          expect(despues.status).to.eq(404);
          cy.registrarCaso(
            'API-EQU-14',
            `El miembro recibió ${denegado.status} (${textoMensajes(denegado.body)}); el líder ${res.status} {eliminado: true}; luego GET = ${despues.status}.`,
            res,
          );
        });
      });
    });
  });
});
