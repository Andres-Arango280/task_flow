import { mensajes, textoMensajes } from '../../support/utilidades';

// Mensajes de validación en español (src/common/validation.ts)
describe('API - Validación de mensajes', () => {
  let token: string;

  beforeEach(() => {
    cy.usuarioConToken('val').then((datos) => (token = datos.token));
  });

  it('API-VAL-01 Los textos de longitud máxima se traducen al español con su límite', () => {
    cy.api('POST', '/equipos', { token, body: { nombre: 'x'.repeat(256) } }).then((res) => {
      expect(res.status).to.eq(400);
      expect(mensajes(res.body)).to.deep.eq(['El nombre no puede superar 255 caracteres']);
      cy.registrarCaso('API-VAL-01', `Respondió ${res.status} con ${textoMensajes(res.body)}.`, res);
    });
  });

  // Este caso detectó un defecto (ya corregido): src/common/validation.ts traducía la
  // restricción 'isUUID', pero class-validator la nombra 'isUuid', y se usaba el mensaje
  // genérico "no es válido" (sin concordancia de género: "La lista destino no es válido").
  it('API-VAL-02 Un identificador con formato incorrecto se explica como "no es un identificador válido"', () => {
    cy.api('POST', '/proyectos', { token, body: { nombre: 'Proyecto', equipoId: 'no-es-uuid' } }).then((res) => {
      expect(res.status).to.eq(400);
      expect(mensajes(res.body)).to.include('El equipo no es un identificador válido');
      cy.api('PATCH', '/tareas/00000000-0000-4000-8000-000000000000/mover', { token, body: { nuevaListaId: 'no-es-uuid' } }).then((res2) => {
        cy.registrarCaso(
          'API-VAL-02',
          `POST /proyectos respondió ${res.status} con ${textoMensajes(res.body)}; PATCH /tareas/:id/mover respondió ${res2.status} con ${textoMensajes(res2.body)}. (Defecto detectado en una ejecución anterior y corregido.)`,
          res,
        );
        expect(res2.status).to.eq(400);
        expect(mensajes(res2.body)).to.include('La lista destino no es un identificador válido');
      });
    });
  });
});
