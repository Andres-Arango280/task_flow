'use strict';
// Utilidades para fabricar/manipular JWT en las pruebas (sin dependencias).
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const decodificar = (token) => {
  const [h, p] = token.split('.');
  return {
    header: JSON.parse(Buffer.from(h, 'base64url').toString()),
    payload: JSON.parse(Buffer.from(p, 'base64url').toString()),
  };
};

function firmar(payload, secreto, header = { alg: 'HS256', typ: 'JWT' }) {
  const cuerpo = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  if (header.alg === 'none') return `${cuerpo}.`;
  const firma = crypto.createHmac('sha256', secreto).update(cuerpo).digest('base64url');
  return `${cuerpo}.${firma}`;
}

function alterarFirma(token) {
  const partes = token.split('.');
  const s = partes[2];
  const ultimo = s[s.length - 2] === 'A' ? 'B' : 'A';
  partes[2] = s.slice(0, -2) + ultimo + s.slice(-1);
  return partes.join('.');
}

function cambiarPayloadConservandoFirma(token, cambios) {
  const [h, p, s] = token.split('.');
  const payload = { ...JSON.parse(Buffer.from(p, 'base64url').toString()), ...cambios };
  return `${h}.${b64url(JSON.stringify(payload))}.${s}`;
}

// Lee JWT_SECRET del .env local del backend solo para fabricar un token
// caducado legítimamente firmado (se comprueba que la expiración se valide).
function leerSecretoLocal() {
  try {
    const env = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', '.env'), 'utf8');
    const linea = env.split(/\r?\n/).find((l) => l.startsWith('JWT_SECRET='));
    return linea ? linea.slice('JWT_SECRET='.length).trim() : null;
  } catch {
    return null;
  }
}

module.exports = { firmar, alterarFirma, cambiarPayloadConservandoFirma, decodificar, leerSecretoLocal };
