import { UUID, UUID_INEXISTENTE, mensajes, textoMensajes } from '../../support/utilidades';

describe('API - Proyectos y listas (/proyectos, /listas)', () => {
  let lider: { token: string; id: string };
  let miembro: { token: string; id: string };
  let ajeno: { token: string; id: string };
  let equipoId: string;

  beforeEach(() => {
    cy.usuarioConToken('pl-lider').then(({ usuario, token }) => (lider = { token, id: usuario.id }));
    cy.usuarioConToken('pl-miembro').then(({ usuario, token }) => (miembro = { token, id: usuario.id }));
    cy.usuarioConToken('pl-ajeno').then(({ usuario, token }) => (ajeno = { token, id: usuario.id }));
    cy.then(() => cy.crearEquipoApi(lider.token, `Equipo PL ${Date.now()}`)).then((equipo) => {
      equipoId = equipo.id;
      cy.agregarMiembroApi(lider.token, equipoId, miembro.id);
    });
  });

  describe('Proyectos', () => {
    it('API-PRO-01 Crear proyecto devuelve 201 y crea las listas Por Hacer, En Progreso y Hecho', () => {
      const nombre = `Proyecto API ${Date.now()}`;
      cy.api('POST', '/proyectos', { token: miembro.token, body: { nombre, equipoId } }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body.id).to.match(UUID);
        expect(res.body).to.include({ nombre, equipoId });
        cy.api('GET', `/listas/proyecto/${res.body.id}`, { token: miembro.token }).then((listas) => {
          expect(listas.status).to.eq(200);
          expect(listas.body.map((l: { nombre: string }) => l.nombre)).to.deep.eq(['Por Hacer', 'En Progreso', 'Hecho']);
          expect(listas.body.map((l: { orden: number }) => l.orden)).to.deep.eq([0, 1, 2]);
          cy.registrarCaso('API-PRO-01', `Respondió ${res.status}; el proyecto tiene ${listas.body.length} listas en orden: ${listas.body.map((l: { nombre: string }) => l.nombre).join(', ')}.`, res);
        });
      });
    });

    it('API-PRO-02 Crear proyecto en un equipo ajeno devuelve 403', () => {
      cy.api('POST', '/proyectos', { token: ajeno.token, body: { nombre: 'Intruso', equipoId } }).then((res) => {
        expect(res.status).to.eq(403);
        expect(mensajes(res.body)).to.include('No tienes acceso a este equipo');
        cy.registrarCaso('API-PRO-02', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
      });
    });

    it('API-PRO-03 Crear proyecto con equipoId inválido y sin nombre devuelve 400', () => {
      cy.api('POST', '/proyectos', { token: lider.token, body: { nombre: '', equipoId: 'abc' } }).then((res) => {
        expect(res.status).to.eq(400);
        const lista = mensajes(res.body);
        expect(lista).to.include('El nombre es obligatorio');
        // El texto exacto del error de UUID se verifica en API-VAL-01 (defecto conocido)
        expect(lista.some((m) => m.startsWith('El equipo no es'))).to.eq(true);
        cy.registrarCaso('API-PRO-03', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
      });
    });

    it('API-PRO-04 Listar proyectos por equipo; sin equipoId devuelve 400', () => {
      cy.crearProyectoApi(lider.token, equipoId, 'Uno');
      cy.crearProyectoApi(lider.token, equipoId, 'Dos');
      cy.api('GET', '/proyectos', { token: miembro.token, qs: { equipoId } }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.map((p: { nombre: string }) => p.nombre)).to.deep.eq(['Uno', 'Dos']);
        cy.api('GET', '/proyectos', { token: miembro.token }).then((sinParametro) => {
          expect(sinParametro.status).to.eq(400);
          expect(mensajes(sinParametro.body)).to.include('Debes proporcionar equipoId');
          cy.registrarCaso('API-PRO-04', `Con equipoId respondió ${res.status} con 2 proyectos en orden de creación; sin equipoId respondió ${sinParametro.status} ${textoMensajes(sinParametro.body)}.`, res);
        });
      });
    });

    it('API-PRO-05 Una persona ajena no puede ver un proyecto (403)', () => {
      cy.crearProyectoApi(lider.token, equipoId, 'Privado').then((proyecto) => {
        cy.api('GET', `/proyectos/${proyecto.id}`, { token: ajeno.token }).then((res) => {
          expect(res.status).to.eq(403);
          expect(mensajes(res.body)).to.include('No tienes acceso a este proyecto');
          cy.registrarCaso('API-PRO-05', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
        });
      });
    });

    it('API-PRO-06 Un proyecto inexistente devuelve 404', () => {
      cy.api('GET', `/proyectos/${UUID_INEXISTENTE}`, { token: lider.token }).then((res) => {
        expect(res.status).to.eq(404);
        expect(mensajes(res.body)).to.include('Proyecto no encontrado');
        cy.registrarCaso('API-PRO-06', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
      });
    });

    it('API-PRO-07 Solo el líder elimina un proyecto y sus listas desaparecen en cascada', () => {
      cy.crearProyectoApi(lider.token, equipoId, 'Para borrar').then((proyecto) => {
        cy.api('DELETE', `/proyectos/${proyecto.id}`, { token: miembro.token }).then((denegado) => {
          expect(denegado.status).to.eq(403);
          expect(mensajes(denegado.body)).to.include('Solo el líder del equipo puede eliminar proyectos');
        });
        cy.api('DELETE', `/proyectos/${proyecto.id}`, { token: lider.token }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body).to.deep.eq({ id: proyecto.id, eliminado: true });
          cy.api('GET', `/listas/proyecto/${proyecto.id}`, { token: lider.token }).then((listas) => {
            expect(listas.status).to.eq(404);
            cy.registrarCaso('API-PRO-07', `El miembro recibió 403; el líder ${res.status} {eliminado: true}; después las listas responden ${listas.status}.`, res);
          });
        });
      });
    });
  });

  describe('Listas', () => {
    it('API-LIS-01 Un miembro (no líder) obtiene las 3 listas del proyecto', () => {
      cy.crearProyectoApi(lider.token, equipoId, 'Con listas').then((proyecto) => {
        cy.api('GET', `/listas/proyecto/${proyecto.id}`, { token: miembro.token }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body).to.have.length(3);
          res.body.forEach((lista: { id: string; proyectoId: string }) => {
            expect(lista.id).to.match(UUID);
            expect(lista.proyectoId).to.eq(proyecto.id);
          });
          cy.registrarCaso('API-LIS-01', `Respondió ${res.status} con 3 listas (id UUID, proyectoId correcto).`, res);
        });
      });
    });

    it('API-LIS-02 Una persona ajena no puede leer las listas (403)', () => {
      cy.crearProyectoApi(lider.token, equipoId, 'Listas privadas').then((proyecto) => {
        cy.api('GET', `/listas/proyecto/${proyecto.id}`, { token: ajeno.token }).then((res) => {
          expect(res.status).to.eq(403);
          expect(mensajes(res.body)).to.include('No tienes acceso a este proyecto');
          cy.registrarCaso('API-LIS-02', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
        });
      });
    });

    it('API-LIS-03 Listas de un id inválido devuelve 400 y de uno inexistente 404', () => {
      cy.api('GET', '/listas/proyecto/no-es-uuid', { token: lider.token }).then((invalido) => {
        expect(invalido.status).to.eq(400);
        cy.api('GET', `/listas/proyecto/${UUID_INEXISTENTE}`, { token: lider.token }).then((res) => {
          expect(res.status).to.eq(404);
          expect(mensajes(res.body)).to.include('Proyecto no encontrado');
          cy.registrarCaso('API-LIS-03', `Id inválido respondió ${invalido.status}; id inexistente respondió ${res.status} ${textoMensajes(res.body)}.`, res);
        });
      });
    });
  });
});
