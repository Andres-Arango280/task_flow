import { isAxiosError } from 'axios';

const POR_ESTADO: Record<number, string> = {
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El elemento ya no existe o fue eliminado.',
  409: 'La acción entra en conflicto con datos existentes.',
  500: 'Error interno del servidor. Inténtalo de nuevo en unos minutos.',
};

// Textos genéricos en inglés que Nest devuelve cuando no hay un mensaje propio
const GENERICOS_EN_INGLES = /^(Bad Request|Unauthorized|Forbidden|Not Found|Conflict|Internal server error)$/i;

export interface ErrorLegible {
  mensaje: string;
  codigo: string;
}

// Convierte cualquier error de la API en un texto en español con su código de referencia
export function describirError(error: unknown, contexto?: string): ErrorLegible {
  let mensaje = 'Ocurrió un error inesperado.';
  let codigo = 'TF-000';

  if (isAxiosError(error)) {
    if (!error.response) {
      mensaje = 'No hay conexión con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.';
      codigo = 'TF-RED';
    } else {
      const estado = error.response.status;
      const delServidor = (error.response.data as { message?: string | string[] } | undefined)?.message;
      const texto = Array.isArray(delServidor) ? delServidor.join('. ') : delServidor;
      mensaje = texto && !GENERICOS_EN_INGLES.test(texto) ? texto : POR_ESTADO[estado] ?? mensaje;
      codigo = `TF-${estado}`;
    }
  }

  return { mensaje: contexto ? `${contexto}: ${mensaje}` : mensaje, codigo };
}
