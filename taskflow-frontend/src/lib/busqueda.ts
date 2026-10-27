// Búsqueda tolerante a mayúsculas, tildes y errores de escritura pequeños
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temporal = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = temporal;
    }
  }
  return fila[b.length];
}

function terminoCoincide(termino: string, palabras: string[], texto: string): boolean {
  if (texto.includes(termino)) return true;
  const tolerancia = termino.length >= 7 ? 2 : termino.length >= 4 ? 1 : 0;
  if (tolerancia === 0) return false;
  return palabras.some(
    (palabra) =>
      distancia(termino, palabra) <= tolerancia ||
      distancia(termino, palabra.slice(0, termino.length)) <= tolerancia,
  );
}

export function coincide(consulta: string, ...campos: (string | null | undefined)[]): boolean {
  const terminos = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (terminos.length === 0) return true;
  const texto = normalizar(campos.filter(Boolean).join(' '));
  const palabras = texto.split(/[^a-z0-9ñ]+/).filter(Boolean);
  return terminos.every((termino) => terminoCoincide(termino, palabras, texto));
}
