'use strict';
// Cliente HTTP mínimo (fetch nativo de Node 20) que registra cada intercambio
// petición/respuesta como evidencia del caso de prueba en curso.

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const estado = {
  casoActual: null,
  intercambiosCaso: [],
  todasLasRespuestas: [], // { caso, metodo, ruta, status, texto }
};

function iniciarCaso(id) {
  estado.casoActual = id;
  estado.intercambiosCaso = [];
}

function finalizarCaso() {
  const datos = estado.intercambiosCaso;
  estado.intercambiosCaso = [];
  estado.casoActual = null;
  return datos;
}

function ocultarToken(valor) {
  if (typeof valor !== 'string') return valor;
  return valor.replace(/(eyJ[\w-]{6})[\w-]*\.[\w-]+\.[\w-]*/g, '$1…(token recortado)');
}

/**
 * Realiza una petición y devuelve { status, headers, body, texto, ms }.
 * opciones: { token, body, headers, cuerpoCrudo, base }
 */
async function peticion(metodo, ruta, opciones = {}) {
  const headers = { ...(opciones.headers || {}) };
  let cuerpo;
  if (opciones.cuerpoCrudo !== undefined) {
    cuerpo = opciones.cuerpoCrudo;
    headers['content-type'] = headers['content-type'] || 'application/json';
  } else if (opciones.body !== undefined) {
    cuerpo = JSON.stringify(opciones.body);
    headers['content-type'] = 'application/json';
  }
  if (opciones.token) headers.authorization = `Bearer ${opciones.token}`;

  const url = `${opciones.base || BASE_URL}${ruta}`;
  const inicio = performance.now();
  let res;
  try {
    res = await fetch(url, { method: metodo, headers, body: cuerpo });
  } catch {
    // Reintento único ante un socket keep-alive cerrado por el servidor (p. ej. tras un 413)
    res = await fetch(url, { method: metodo, headers, body: cuerpo });
  }
  const texto = await res.text();
  const ms = Math.round((performance.now() - inicio) * 10) / 10;
  let body = null;
  try {
    body = texto ? JSON.parse(texto) : null;
  } catch {
    body = texto;
  }
  const cabeceras = Object.fromEntries(res.headers.entries());

  const cuerpoEvidencia =
    typeof cuerpo === 'string' && cuerpo.length > 600 ? `${cuerpo.slice(0, 200)}… (${cuerpo.length} bytes)` : cuerpo;
  estado.intercambiosCaso.push({
    peticion: {
      metodo,
      url,
      headers: Object.fromEntries(
        Object.entries(headers).map(([k, v]) => [k, k === 'authorization' ? ocultarToken(v) : v]),
      ),
      body: cuerpoEvidencia ? safeParse(cuerpoEvidencia) : undefined,
    },
    respuesta: {
      status: res.status,
      headers: cabeceras,
      body: texto.length > 4000 ? `${texto.slice(0, 4000)}… (${texto.length} bytes)` : body,
      tiempoMs: ms,
    },
  });
  estado.todasLasRespuestas.push({ caso: estado.casoActual, metodo, ruta, status: res.status, texto });
  return { status: res.status, headers: cabeceras, body, texto, ms };
}

function safeParse(t) {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

module.exports = { BASE_URL, peticion, iniciarCaso, finalizarCaso, estado };
