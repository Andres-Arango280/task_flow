import { UUID, UUID_INEXISTENTE, contienePassword, mensajes, textoMensajes } from '../../support/utilidades';

describe('API - Tareas (/tareas)', () => {
  let lider: { token: string; id: string };
  let miembro: { token: string; id: string };
  let ajeno: { token: string; id: string };
  let proyectoId: string;
  let listas: { id: string; nombre: string }[];

  beforeEach(() => {
    cy.usuarioConToken('t-lider').then(({ usuario, token }) => (lider = { token, id: usuario.id }));
    cy.usuarioConToken('t-miembro').then(({ usuario, token }) => (miembro = { token, id: usuario.id }));
    cy.usuarioConToken('t-ajeno').then(({ usuario, token }) => (ajeno = { token, id: usuario.id }));
    cy.then(() => cy.crearEquipoApi(lider.token, `Equipo T ${Date.now()}`)).then((equipo) => {
      cy.agregarMiembroApi(lider.token, equipo.id, miembro.id);
      cy.crearProyectoApi(lider.token, equipo.id, 'Proyecto tareas').then((proyecto) => {
        proyectoId = proyecto.id;
        cy.listasApi(lider.token, proyecto.id).then((l) => (listas = l));
      });
    });
  });

  it('API-TAR-01 Crear tarea con listaId y asignados devuelve 201 con asignados sin contraseña', () => {
    cy.then(() =>
      cy.api('POST', '/tareas', {
        token: miembro.token,
        body: { titulo: 'Diseñar login', descripcion: 'Pantalla y validaciones', listaId: listas[0].id, asignados: [lider.id, miembro.id] },
      }),
    ).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.id).to.match(UUID);
      expect(res.body).to.include({ titulo: 'Diseñar login', descripcion: 'Pantalla y validaciones', listaId: listas[0].id });
      expect(res.body.asignados.map((u: { id: string }) => u.id)).to.have.members([lider.id, miembro.id]);
      expect(contienePassword(res.body)).to.eq(false);
      cy.registrarCaso('API-TAR-01', `Respondió ${res.status} con la tarea en "${res.body.lista.nombre}" y ${res.body.asignados.length} asignados sin password.`, res);
    });
  });

  it('API-TAR-02 Crear tarea solo con proyectoId la coloca en la primera lista (Por Hacer)', () => {
    cy.then(() => cy.api('POST', '/tareas', { token: lider.token, body: { titulo: 'Sin lista', proyectoId } })).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.lista.nombre).to.eq('Por Hacer');
      expect(res.body.asignados).to.deep.eq([]);
      cy.registrarCaso('API-TAR-02', `Respondió ${res.status} y la tarea quedó en "${res.body.lista.nombre}" sin asignados.`, res);
    });
  });

  it('API-TAR-03 Crear tarea sin título o con título de más de 255 caracteres devuelve 400', () => {
    cy.then(() => cy.api('POST', '/tareas', { token: lider.token, body: { titulo: '', listaId: listas[0].id } })).then((vacio) => {
      expect(vacio.status).to.eq(400);
      expect(mensajes(vacio.body)).to.include('El título es obligatorio');
      cy.api('POST', '/tareas', { token: lider.token, body: { titulo: 'x'.repeat(256), listaId: listas[0].id } }).then((largo) => {
        expect(largo.status).to.eq(400);
        expect(mensajes(largo.body)).to.include('El título no puede superar 255 caracteres');
        cy.registrarCaso('API-TAR-03', `Título vacío: ${vacio.status} ${textoMensajes(vacio.body)}; 256 caracteres: ${largo.status} ${textoMensajes(largo.body)}.`, largo);
      });
    });
  });

  it('API-TAR-04 Crear tarea sin listaId ni proyectoId devuelve 400', () => {
    cy.api('POST', '/tareas', { token: lider.token, body: { titulo: 'Huérfana' } }).then((res) => {
      expect(res.status).to.eq(400);
      expect(mensajes(res.body)).to.include('Debes enviar proyectoId o listaId');
      cy.registrarCaso('API-TAR-04', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  it('API-TAR-05 Una persona ajena no puede crear ni listar tareas del proyecto (403)', () => {
    cy.then(() => cy.api('POST', '/tareas', { token: ajeno.token, body: { titulo: 'Intrusa', listaId: listas[0].id } })).then((res) => {
      expect(res.status).to.eq(403);
      expect(mensajes(res.body)).to.include('No tienes acceso a este proyecto');
      cy.api('GET', '/tareas', { token: ajeno.token, qs: { proyectoId } }).then((lista) => {
        expect(lista.status).to.eq(403);
        cy.registrarCaso('API-TAR-05', `Crear respondió ${res.status} ${textoMensajes(res.body)}; listar respondió ${lista.status}.`, res);
      });
    });
  });

  it('API-TAR-06 Asignar a alguien que no es del equipo devuelve 400', () => {
    cy.then(() => cy.crearTareaApi(lider.token, { titulo: 'Asignable', listaId: listas[0].id })).then((tarea) => {
      cy.api('PATCH', `/tareas/${tarea.id}/asignar`, { token: lider.token, body: { miembros: [ajeno.id] } }).then((res) => {
        expect(res.status).to.eq(400);
        expect(mensajes(res.body)).to.include('Solo se pueden asignar miembros del equipo');
        cy.api('PATCH', `/tareas/${tarea.id}/asignar`, { token: lider.token, body: { miembros: [miembro.id] } }).then((ok) => {
          expect(ok.status).to.eq(200);
          expect(ok.body.asignados.map((u: { id: string }) => u.id)).to.deep.eq([miembro.id]);
          cy.registrarCaso('API-TAR-06', `Asignar a un ajeno respondió ${res.status} ${textoMensajes(res.body)}; asignar a un miembro respondió ${ok.status}.`, res);
        });
      });
    });
  });

  it('API-TAR-07 Editar título y descripción devuelve 200 con los cambios', () => {
    cy.then(() => cy.crearTareaApi(lider.token, { titulo: 'Original', listaId: listas[0].id })).then((tarea) => {
      cy.api('PATCH', `/tareas/${tarea.id}`, { token: miembro.token, body: { titulo: '  Editada  ', descripcion: 'Nueva descripción' } }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.include({ id: tarea.id, titulo: 'Editada', descripcion: 'Nueva descripción' });
        cy.registrarCaso('API-TAR-07', `Respondió ${res.status} con titulo "${res.body.titulo}" (recortado) y la nueva descripción.`, res);
      });
    });
  });

  it('API-TAR-08 Editar con título vacío devuelve 400 y no modifica la tarea', () => {
    cy.then(() => cy.crearTareaApi(lider.token, { titulo: 'Se mantiene', listaId: listas[0].id })).then((tarea) => {
      cy.api('PATCH', `/tareas/${tarea.id}`, { token: lider.token, body: { titulo: '' } }).then((res) => {
        expect(res.status).to.eq(400);
        expect(mensajes(res.body)).to.include('El título es obligatorio');
        cy.api('GET', '/tareas', { token: lider.token, qs: { proyectoId } }).then((lista) => {
          expect(lista.body.find((t: { id: string }) => t.id === tarea.id).titulo).to.eq('Se mantiene');
          cy.registrarCaso('API-TAR-08', `Respondió ${res.status} ${textoMensajes(res.body)}; la tarea conserva el título "Se mantiene".`, res);
        });
      });
    });
  });

  it('API-TAR-09 Mover una tarea a "Hecho" devuelve 200 y se refleja al listar', () => {
    cy.then(() => cy.crearTareaApi(lider.token, { titulo: 'Para mover', listaId: listas[0].id })).then((tarea) => {
      cy.api('PATCH', `/tareas/${tarea.id}/mover`, { token: miembro.token, body: { nuevaListaId: listas[2].id } }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.listaId).to.eq(listas[2].id);
        expect(res.body.lista.nombre).to.eq('Hecho');
        cy.api('GET', '/tareas', { token: lider.token, qs: { proyectoId } }).then((lista) => {
          expect(lista.body.find((t: { id: string }) => t.id === tarea.id).listaId).to.eq(listas[2].id);
          cy.registrarCaso('API-TAR-09', `Respondió ${res.status}; la tarea quedó en "${res.body.lista.nombre}" también al volver a listar.`, res);
        });
      });
    });
  });

  it('API-TAR-10 Mover una tarea a una lista de otro proyecto devuelve 400', () => {
    cy.then(() => cy.crearTareaApi(lider.token, { titulo: 'No sale', listaId: listas[0].id })).then((tarea) => {
      cy.crearEquipoApi(lider.token, 'Otro equipo').then((otro) =>
        cy.crearProyectoApi(lider.token, otro.id, 'Otro proyecto').then((p) =>
          cy.listasApi(lider.token, p.id).then((otrasListas) => {
            cy.api('PATCH', `/tareas/${tarea.id}/mover`, { token: lider.token, body: { nuevaListaId: otrasListas[0].id } }).then((res) => {
              expect(res.status).to.eq(400);
              expect(mensajes(res.body)).to.include('No se puede mover una tarea a otro proyecto');
              cy.registrarCaso('API-TAR-10', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
            });
          }),
        ),
      );
    });
  });

  it('API-TAR-11 Una persona ajena no puede editar, mover ni borrar una tarea (403)', () => {
    cy.then(() => cy.crearTareaApi(lider.token, { titulo: 'Protegida', listaId: listas[0].id })).then((tarea) => {
      cy.api('PATCH', `/tareas/${tarea.id}`, { token: ajeno.token, body: { titulo: 'Hackeada' } }).then((editar) => {
        cy.api('PATCH', `/tareas/${tarea.id}/mover`, { token: ajeno.token, body: { nuevaListaId: listas[1].id } }).then((mover) => {
          cy.api('DELETE', `/tareas/${tarea.id}`, { token: ajeno.token }).then((borrar) => {
            expect([editar.status, mover.status, borrar.status]).to.deep.eq([403, 403, 403]);
            expect(mensajes(borrar.body)).to.include('No tienes acceso a esta tarea');
            cy.registrarCaso('API-TAR-11', `Editar, mover y borrar respondieron ${editar.status}, ${mover.status} y ${borrar.status} con ${textoMensajes(borrar.body)}.`, borrar);
          });
        });
      });
    });
  });

  it('API-TAR-12 Eliminar una tarea devuelve 200 y una segunda vez 404', () => {
    cy.then(() => cy.crearTareaApi(lider.token, { titulo: 'Efímera', listaId: listas[0].id })).then((tarea) => {
      cy.api('DELETE', `/tareas/${tarea.id}`, { token: miembro.token }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.deep.eq({ id: tarea.id, eliminado: true });
        cy.api('DELETE', `/tareas/${tarea.id}`, { token: miembro.token }).then((otraVez) => {
          expect(otraVez.status).to.eq(404);
          expect(mensajes(otraVez.body)).to.include('Tarea no encontrada');
          cy.registrarCaso('API-TAR-12', `Primera eliminación ${res.status} {eliminado: true}; segunda ${otraVez.status} ${textoMensajes(otraVez.body)}.`, res);
        });
      });
    });
  });

  it('API-TAR-13 Listar tareas sin proyectoId o con un id inválido devuelve 400', () => {
    cy.api('GET', '/tareas', { token: lider.token }).then((sinParametro) => {
      expect(sinParametro.status).to.eq(400);
      expect(mensajes(sinParametro.body)).to.include('Debes proporcionar proyectoId');
      cy.api('GET', '/tareas', { token: lider.token, qs: { proyectoId: 'xyz' } }).then((invalido) => {
        expect(invalido.status).to.eq(400);
        cy.api('PATCH', `/tareas/${UUID_INEXISTENTE}/mover`, { token: lider.token, body: { nuevaListaId: 'xyz' } }).then((destino) => {
          expect(destino.status).to.eq(400);
          expect(mensajes(destino.body).some((m) => m.startsWith('La lista destino no es'))).to.eq(true);
          cy.registrarCaso('API-TAR-13', `Sin proyectoId: ${sinParametro.status}; proyectoId inválido: ${invalido.status}; nuevaListaId inválida: ${destino.status} ${textoMensajes(destino.body)}.`, sinParametro);
        });
      });
    });
  });
});
