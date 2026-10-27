import { AxiosError, AxiosHeaders } from 'axios';
import { describirError } from '../../src/lib/errores';

const config = { headers: new AxiosHeaders() };
const conRespuesta = (estado: number, data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, {
    status: estado,
    statusText: '',
    headers: {},
    config,
    data,
  });

describe('Unidad - lib/errores describirError()', () => {
  it('UNI-ERR-01 Sin respuesta del servidor indica problema de conexión (TF-RED)', () => {
    const resultado = describirError(new AxiosError('Network Error', 'ERR_NETWORK', config));
    expect(resultado.codigo).to.eq('TF-RED');
    expect(resultado.mensaje).to.contain('No hay conexión con el servidor');
    cy.registrarCaso('UNI-ERR-01', `Devolvió código ${resultado.codigo} y "${resultado.mensaje}".`);
  });

  it('UNI-ERR-02 Usa el mensaje del servidor y une las listas de validación', () => {
    const resultado = describirError(conRespuesta(400, { message: ['El nombre es obligatorio', 'El equipo no es válido'] }));
    expect(resultado).to.deep.eq({ mensaje: 'El nombre es obligatorio. El equipo no es válido', codigo: 'TF-400' });
    cy.registrarCaso('UNI-ERR-02', `Devolvió "${resultado.mensaje}" con código ${resultado.codigo}.`);
  });

  it('UNI-ERR-03 Sustituye los textos genéricos en inglés por un mensaje en español según el estado', () => {
    const prohibido = describirError(conRespuesta(403, { message: 'Forbidden' }));
    const interno = describirError(conRespuesta(500, { message: 'Internal server error' }));
    expect(prohibido).to.deep.eq({ mensaje: 'No tienes permiso para realizar esta acción.', codigo: 'TF-403' });
    expect(interno.mensaje).to.eq('Error interno del servidor. Inténtalo de nuevo en unos minutos.');
    cy.registrarCaso('UNI-ERR-03', `"Forbidden" → "${prohibido.mensaje}" (${prohibido.codigo}); "Internal server error" → "${interno.mensaje}".`);
  });

  it('UNI-ERR-04 Antepone el contexto y trata errores que no son de Axios (TF-000)', () => {
    const conContexto = describirError(conRespuesta(404, {}), 'No se pudo cargar el tablero');
    expect(conContexto.mensaje).to.eq('No se pudo cargar el tablero: El elemento ya no existe o fue eliminado.');
    const generico = describirError(new Error('boom'));
    expect(generico).to.deep.eq({ mensaje: 'Ocurrió un error inesperado.', codigo: 'TF-000' });
    cy.registrarCaso('UNI-ERR-04', `Con contexto: "${conContexto.mensaje}"; un Error común devolvió "${generico.mensaje}" (${generico.codigo}).`);
  });
});
