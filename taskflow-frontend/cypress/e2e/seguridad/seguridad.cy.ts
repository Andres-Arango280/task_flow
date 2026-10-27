import { usuarioUnico } from '../../support/commands';
import { UUID_INEXISTENTE, contienePassword, textoMensajes } from '../../support/utilidades';

// Pruebas de seguridad con Cypress (API y UI) sobre las seis funcionalidades:
// autenticación (JWT, fuerza bruta), autorización (equipos, proyectos, listas, tareas),
// inyección y exposición de datos (usuarios) y configuración HTTP (helmet, CORS).
// Complementan la suite OWASP de pruebas/seguridad (node --test) con casos ejecutables en Cypress.

const alterarUltimoCaracter = (texto: string) => texto.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));

describe('Seguridad - Autenticación (JWT y fuerza bruta)', () => {
  it('CYS-JWT-01 Las rutas protegidas sin token responden 401 y no devuelven datos', () => {
    cy.usuarioConToken('seg-rutas').then(({ token }) =>
      cy.crearEquipoApi(token, `Equipo seg ${Date.now()}`).then((equipo) =>
        cy.crearProyectoApi(token, equipo.id, `Proyecto seg ${Date.now()}`).then((proyecto) => {
          const rutas: [string, string][] = [
            ['GET', '/usuarios/me'],
            ['GET', '/equipos'],
            ['GET', `/equipos/${equipo.id}/miembros`],
            ['GET', `/proyectos?equipoId=${equipo.id}`],
            ['GET', `/listas/proyecto/${proyecto.id}`],
            ['GET', `/tareas?proyectoId=${proyecto.id}`],
            ['POST', '/equipos'],
            ['POST', '/tareas'],
            ['DELETE', `/equipos/${equipo.id}`],
          ];
          const resultados: string[] = [];
          rutas.forEach(([metodo, ruta]) =>
            cy.api(metodo, ruta, { body: metodo === 'POST' ? { nombre: 'x' } : undefined }).then((res) => {
              expect(res.status, `${metodo} ${ruta} sin token`).to.eq(401);
              expect(JSON.stringify(res.body)).to.not.include(equipo.nombre);
              resultados.push(`${metodo} ${ruta} → ${res.status}`);
            }),
          );
          cy.then(() =>
            cy.registrarCaso('CYS-JWT-01', `${rutas.length}/${rutas.length} rutas respondieron 401 sin cabecera Authorization y sin datos del equipo: ${resultados.join('; ')}.`),
          );
        }),
      ),
    );
  });

  it('CYS-JWT-02 Un token con la firma o el contenido alterados es rechazado con 401', () => {
    cy.usuarioConToken('seg-firma').then(({ token }) => {
      const [cabecera, carga, firma] = token.split('.');
      const firmaAlterada = `${cabecera}.${carga}.${alterarUltimoCaracter(firma)}`;
      const cargaOriginal = JSON.parse(atob(carga));
      const cargaFalsa = btoa(JSON.stringify({ ...cargaOriginal, sub: UUID_INEXISTENTE }))
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      const contenidoAlterado = `${cabecera}.${cargaFalsa}.${firma}`;
      const resultados: string[] = [];

      cy.api('GET', '/usuarios/me', { token: firmaAlterada }).then((res) => {
        expect(res.status, 'firma alterada').to.eq(401);
        resultados.push(`firma alterada → ${res.status}`);
      });
      cy.api('GET', '/usuarios/me', { token: contenidoAlterado }).then((res) => {
        expect(res.status, 'payload alterado (sub de otro usuario)').to.eq(401);
        resultados.push(`payload alterado → ${res.status}`);
      });
      cy.api('GET', '/usuarios/me', { token: 'no-es-un-jwt' }).then((res) => {
        expect(res.status, 'token malformado').to.eq(401);
        resultados.push(`token malformado → ${res.status}`);
        cy.registrarCaso('CYS-JWT-02', `Los tres tokens manipulados fueron rechazados: ${resultados.join('; ')} ${textoMensajes(res.body)}.`, res);
      });
    });
  });

  it('CYS-JWT-03 El token de una cuenta eliminada deja de ser válido (401, no 404 ni 500)', () => {
    cy.usuarioConToken('seg-borrado').then(({ token }) => {
      cy.api('GET', '/usuarios/me', { token }).its('status').should('eq', 200);
      cy.api('DELETE', '/usuarios/me', { token }).then((baja) => {
        expect(baja.status, 'eliminar la propia cuenta').to.be.oneOf([200, 204]);
        cy.api('GET', '/usuarios/me', { token }).then((res) => {
          expect(res.status).to.eq(401);
          cy.registrarCaso('CYS-JWT-03', `Antes de eliminar la cuenta /usuarios/me respondió 200; tras DELETE /usuarios/me (${baja.status}) el mismo token recibió ${res.status} ${textoMensajes(res.body)}.`, res);
        });
      });
    });
  });

  it('CYS-BRU-01 Tras 5 intentos fallidos el login se bloquea con 429 aunque la contraseña sea correcta', () => {
    const usuario = usuarioUnico('seg-bruta');
    cy.registrarPorApi(usuario);
    const estados: number[] = [];
    for (let intento = 1; intento <= 5; intento += 1) {
      cy.api('POST', '/auth/login', { body: { email: usuario.email, password: `Equivocada-${intento}` } }).then((res) => {
        expect(res.status, `intento fallido ${intento}`).to.eq(401);
        estados.push(res.status);
      });
    }
    cy.api('POST', '/auth/login', { body: { email: usuario.email, password: usuario.password } }).then((res) => {
      expect(res.status, 'sexto intento con la contraseña correcta').to.eq(429);
      expect(textoMensajes(res.body)).to.include('Demasiados intentos fallidos');
      expect(res.body.access_token).to.be.undefined;
      cy.registrarCaso('CYS-BRU-01', `Cinco intentos con contraseña incorrecta respondieron ${estados.join(', ')}; el sexto, con la contraseña correcta, respondió ${res.status} ${textoMensajes(res.body)} y sin token.`, res);
    });
  });
});

describe('Seguridad - Autorización (equipos, proyectos, listas y tareas)', () => {
  type Preparado = {
    lider: { token: string; id: string };
    miembro: { token: string; id: string };
    ajeno: { token: string; id: string };
    equipo: { id: string; nombre: string };
    proyecto: { id: string };
    listas: { id: string; nombre: string }[];
    tarea: { id: string };
  };

  const preparar = (prefijo: string) =>
    cy.usuarioConToken(`${prefijo}-lider`).then(({ usuario: lider, token: tLider }) =>
      cy.usuarioConToken(`${prefijo}-miembro`).then(({ usuario: miembro, token: tMiembro }) =>
        cy.usuarioConToken(`${prefijo}-ajeno`).then(({ usuario: ajeno, token: tAjeno }) =>
          cy.crearEquipoApi(tLider, `Equipo ${prefijo} ${Date.now()}`).then((equipo) =>
            cy.agregarMiembroApi(tLider, equipo.id, miembro.id).then(() =>
              cy.crearProyectoApi(tLider, equipo.id, `Proyecto ${prefijo} ${Date.now()}`).then((proyecto) =>
                cy.listasApi(tLider, proyecto.id).then((listas) =>
                  cy.crearTareaApi(tLider, { titulo: 'Tarea privada', proyectoId: proyecto.id }).then(
                    (tarea) =>
                      ({
                        lider: { token: tLider, id: lider.id },
                        miembro: { token: tMiembro, id: miembro.id },
                        ajeno: { token: tAjeno, id: ajeno.id },
                        equipo,
                        proyecto,
                        listas,
                        tarea,
                      }) as Preparado,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );

  it('CYS-ACL-01 Un usuario ajeno al equipo no puede leer su equipo, miembros, proyectos, listas ni tareas (403)', () => {
    preparar('acl-lectura').then((p) => {
      const rutas = [
        `/equipos/${p.equipo.id}`,
        `/equipos/${p.equipo.id}/miembros`,
        `/proyectos?equipoId=${p.equipo.id}`,
        `/proyectos/${p.proyecto.id}`,
        `/listas/proyecto/${p.proyecto.id}`,
        `/tareas?proyectoId=${p.proyecto.id}`,
      ];
      const resultados: string[] = [];
      rutas.forEach((ruta) =>
        cy.api('GET', ruta, { token: p.ajeno.token }).then((res) => {
          expect(res.status, `GET ${ruta} como ajeno`).to.eq(403);
          expect(JSON.stringify(res.body)).to.not.include('Tarea privada');
          resultados.push(`GET ${ruta} → ${res.status}`);
        }),
      );
      cy.then(() => cy.registrarCaso('CYS-ACL-01', `${rutas.length}/${rutas.length} lecturas del usuario ajeno respondieron 403 sin filtrar datos: ${resultados.join('; ')}.`));
    });
  });

  it('CYS-ACL-02 Solo el líder gestiona miembros y elimina el equipo; un ajeno no puede crear proyectos ni tareas (403)', () => {
    preparar('acl-escritura').then((p) => {
      const resultados: string[] = [];
      const esperar403 = (etiqueta: string, metodo: string, ruta: string, token: string, body?: unknown) =>
        cy.api(metodo, ruta, { token, body }).then((res) => {
          expect(res.status, etiqueta).to.eq(403);
          resultados.push(`${etiqueta} → ${res.status}`);
        });

      esperar403('miembro invita a otro', 'POST', `/equipos/${p.equipo.id}/miembros`, p.miembro.token, { userId: p.ajeno.id });
      esperar403('miembro expulsa al líder', 'DELETE', `/equipos/${p.equipo.id}/miembros/${p.lider.id}`, p.miembro.token);
      esperar403('miembro elimina el equipo', 'DELETE', `/equipos/${p.equipo.id}`, p.miembro.token);
      esperar403('ajeno crea proyecto', 'POST', '/proyectos', p.ajeno.token, { nombre: 'Intruso', equipoId: p.equipo.id });
      esperar403('ajeno crea tarea', 'POST', '/tareas', p.ajeno.token, { titulo: 'Intrusa', proyectoId: p.proyecto.id });
      esperar403('ajeno mueve tarea', 'PATCH', `/tareas/${p.tarea.id}/mover`, p.ajeno.token, { nuevaListaId: p.listas[2].id });

      // Control positivo: el líder sí puede hacerlo
      cy.api('GET', `/equipos/${p.equipo.id}/miembros`, { token: p.lider.token }).then((res) => {
        expect(res.status).to.eq(200);
        cy.registrarCaso('CYS-ACL-02', `Seis operaciones de escritura no autorizadas respondieron 403 (${resultados.join('; ')}); el líder sigue accediendo a sus miembros (200).`, res);
      });
    });
  });

  it('CYS-ACL-03 Identificadores inexistentes o malformados devuelven 404/400 controlados, nunca 500', () => {
    cy.usuarioConToken('acl-ids').then(({ token }) => {
      const resultados: string[] = [];
      const casos: [string, string, number[], unknown?][] = [
        ['GET', `/equipos/${UUID_INEXISTENTE}`, [404]],
        ['GET', `/proyectos/${UUID_INEXISTENTE}`, [404]],
        ['GET', `/listas/proyecto/${UUID_INEXISTENTE}`, [404]],
        ['PATCH', `/tareas/${UUID_INEXISTENTE}/mover`, [404], { nuevaListaId: UUID_INEXISTENTE }],
        ['GET', '/equipos/no-es-un-uuid', [400, 404]],
        ['POST', '/proyectos', [400, 404], { nombre: 'X', equipoId: 'no-es-un-uuid' }],
      ];
      casos.forEach(([metodo, ruta, esperados, body]) =>
        cy.api(metodo, ruta, { token, body }).then((res) => {
          expect(res.status, `${metodo} ${ruta}`).to.be.oneOf(esperados);
          expect(JSON.stringify(res.body)).to.not.match(/at .*\.(ts|js):\d+/);
          resultados.push(`${metodo} ${ruta} → ${res.status}`);
        }),
      );
      cy.then(() => cy.registrarCaso('CYS-ACL-03', `Ningún identificador inválido produjo 500 ni trazas internas: ${resultados.join('; ')}.`));
    });
  });
});

describe('Seguridad - Inyección y exposición de datos', () => {
  it('CYS-INY-01 Payloads de inyección en el login nunca autentican ni provocan errores 500', () => {
    const usuario = usuarioUnico('seg-iny');
    cy.registrarPorApi(usuario);
    const payloads: unknown[] = [
      { email: `${usuario.email}' OR '1'='1`, password: "' OR '1'='1" },
      { email: "admin'--", password: 'x' },
      { email: usuario.email, password: { $ne: null } },
      { email: { $gt: '' }, password: 'Clave-Segura-123' },
    ];
    const resultados: string[] = [];
    payloads.forEach((body) =>
      cy.api('POST', '/auth/login', { body }).then((res) => {
        expect(res.status, JSON.stringify(body)).to.be.oneOf([400, 401]);
        expect(res.body.access_token, 'no se emite token').to.be.undefined;
        resultados.push(`${JSON.stringify(body).slice(0, 60)} → ${res.status}`);
      }),
    );
    cy.then(() => cy.registrarCaso('CYS-INY-01', `Los ${payloads.length} payloads respondieron 400/401 sin token y sin 500: ${resultados.join('; ')}.`));
  });

  it('CYS-INY-02 Un título con HTML/JavaScript se guarda literal y el tablero lo muestra como texto (sin XSS)', () => {
    const titulo = `<img src=x onerror=alert('xss')>Tarea <script>alert("xss")</script> ${Date.now()}`;
    cy.escenarioProyecto('seg-xss').then((esc) => {
      cy.crearTareaApi(esc.token, { titulo, proyectoId: esc.proyecto.id }).then((tarea) => {
        expect(tarea.titulo, 'la API guarda el texto literal').to.eq(titulo);
      });
      cy.loginPorApi(esc.usuario);
      const alertas: string[] = [];
      cy.on('window:alert', (texto) => alertas.push(String(texto)));
      cy.visit(`/proyectos/${esc.proyecto.id}`);
      cy.findByRole('heading', { level: 1, name: esc.proyecto.nombre }).should('be.visible');
      cy.contains('[data-testid="abrir-tarea"]', '<script>alert("xss")</script>').should('be.visible');
      cy.get('img[src="x"]').should('not.exist');
      cy.get('main script').should('not.exist');
      cy.screenshot('CYS-INY-02-01-titulo-renderizado-como-texto');
      cy.then(() => {
        expect(alertas, 'no se ejecutó ningún alert()').to.have.length(0);
        cy.registrarCaso('CYS-INY-02', 'La API devolvió el título literal; en el tablero se mostró como texto plano (sin <img> ni <script> en el DOM) y no se ejecutó ningún alert().');
      });
    });
  });

  it('CYS-DAT-01 Ninguna respuesta de la API ni el JWT exponen la contraseña', () => {
    cy.usuarioConToken('seg-datos').then(({ usuario, token }) => {
      const revisadas: string[] = [];
      const revisar = (etiqueta: string, metodo: string, ruta: string, opciones: { token?: string; qs?: Record<string, string> } = {}) =>
        cy.api(metodo, ruta, opciones).then((res) => {
          expect(res.status, etiqueta).to.be.oneOf([200, 201]);
          expect(contienePassword(res.body), `${etiqueta} sin password`).to.eq(false);
          expect(JSON.stringify(res.body)).to.not.include(usuario.password);
          revisadas.push(etiqueta);
        });

      revisar('GET /usuarios/me', 'GET', '/usuarios/me', { token });
      revisar('GET /usuarios?email=', 'GET', '/usuarios', { token, qs: { email: usuario.email } });
      cy.crearEquipoApi(token, `Equipo datos ${Date.now()}`).then((equipo) => {
        revisar('GET /equipos', 'GET', '/equipos', { token });
        revisar('GET /equipos/:id/miembros', 'GET', `/equipos/${equipo.id}/miembros`, { token });
      });
      cy.api('POST', '/auth/login', { body: { email: usuario.email, password: usuario.password } }).then((res) => {
        const payload = JSON.parse(atob(res.body.access_token.split('.')[1]));
        expect(contienePassword(payload)).to.eq(false);
        expect(JSON.stringify(payload)).to.not.include(usuario.password);
        revisadas.push('payload del JWT');
        cy.registrarCaso('CYS-DAT-01', `Se revisaron ${revisadas.length} respuestas (${revisadas.join(', ')}): ninguna contiene el campo password ni la contraseña en claro.`, res);
      });
    });
  });
});

describe('Seguridad - Configuración HTTP (helmet y CORS)', () => {
  it('CYS-HDR-01 La API envía las cabeceras de seguridad de helmet y oculta X-Powered-By', () => {
    cy.api('GET', '/usuarios/me').then((res) => {
      const h = res.headers as Record<string, string>;
      expect(h['content-security-policy'], 'CSP').to.be.a('string').and.include("default-src 'self'");
      expect(h['x-content-type-options']).to.eq('nosniff');
      expect(h['x-frame-options'], 'X-Frame-Options').to.match(/SAMEORIGIN|DENY/i);
      expect(h['strict-transport-security'], 'HSTS').to.include('max-age=');
      expect(h['referrer-policy'], 'Referrer-Policy').to.be.a('string');
      expect(h['x-powered-by'], 'X-Powered-By ausente').to.be.undefined;
      cy.registrarCaso('CYS-HDR-01', `Cabeceras presentes: CSP (${h['content-security-policy'].slice(0, 40)}…), X-Content-Type-Options=${h['x-content-type-options']}, X-Frame-Options=${h['x-frame-options']}, HSTS=${h['strict-transport-security']}, Referrer-Policy=${h['referrer-policy']}; X-Powered-By ausente.`, res);
    });
  });

  it('CYS-HDR-02 CORS solo permite el origen del frontend configurado', () => {
    const peticion = (origen: string) =>
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/usuarios/me`,
        headers: { Origin: origen },
        failOnStatusCode: false,
      });
    peticion('http://malicioso.test').then((malo) => {
      expect(malo.headers['access-control-allow-origin'], 'origen no autorizado sin ACAO').to.be.undefined;
      peticion('http://localhost:5173').then((bueno) => {
        expect(bueno.headers['access-control-allow-origin']).to.eq('http://localhost:5173');
        expect(bueno.headers['access-control-allow-credentials']).to.eq('true');
        cy.registrarCaso('CYS-HDR-02', `Origin http://malicioso.test → sin Access-Control-Allow-Origin; Origin http://localhost:5173 → Access-Control-Allow-Origin=${bueno.headers['access-control-allow-origin']} y Allow-Credentials=${bueno.headers['access-control-allow-credentials']}.`);
      });
    });
  });

  it('CYS-SES-01 (UI) Un usuario ajeno que abre el tablero de otro equipo ve un mensaje de acceso denegado y ningún dato', () => {
    cy.escenarioProyecto('seg-ui-dueno').then((dueno) => {
      cy.crearTareaApi(dueno.token, { titulo: 'Secreto del equipo', proyectoId: dueno.proyecto.id });
      cy.registrarPorApi(usuarioUnico('seg-ui-ajeno')).then((ajeno) => {
        cy.loginPorApi(ajeno);
        cy.visit(`/proyectos/${dueno.proyecto.id}`);
        cy.findByRole('heading', { level: 1 }).should('be.visible').invoke('text').should('not.eq', dueno.proyecto.nombre);
        cy.contains('No tienes acceso a este proyecto').should('be.visible');
        cy.contains('Secreto del equipo').should('not.exist');
        cy.screenshot('CYS-SES-01-01-acceso-denegado');
        cy.registrarCaso('CYS-SES-01', 'La interfaz mostró «No tienes acceso a este proyecto» (403) sin el nombre del proyecto ni la tarea «Secreto del equipo».');
      });
    });
  });
});
