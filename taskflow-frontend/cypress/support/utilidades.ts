// Utilidades compartidas por las pruebas de API

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

/** Devuelve true si en cualquier nivel del objeto aparece un campo "password" */
export function contienePassword(valor: unknown): boolean {
  if (Array.isArray(valor)) return valor.some(contienePassword);
  if (valor && typeof valor === 'object') {
    return Object.entries(valor as Record<string, unknown>).some(
      ([clave, v]) => clave.toLowerCase() === 'password' || contienePassword(v),
    );
  }
  return false;
}

/** Normaliza el campo message de Nest (texto o lista) a una lista de textos */
export function mensajes(body: unknown): string[] {
  const message = (body as { message?: string | string[] } | undefined)?.message;
  if (message === undefined) return [];
  return Array.isArray(message) ? message : [message];
}

/** Texto corto con los mensajes devueltos por la API para el resultado obtenido */
export function textoMensajes(body: unknown): string {
  return mensajes(body)
    .map((m) => `"${m}"`)
    .join(', ');
}
