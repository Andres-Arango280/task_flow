'use strict';
// Envoltorio sobre node:test que documenta cada caso (objetivo, esperado,
// obtenido, estado, evidencia) y lo guarda en un JSON al finalizar.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { iniciarCaso, finalizarCaso } = require('./http');

const RAIZ_EVIDENCIAS = path.resolve(__dirname, '..', '..', 'evidencias', 'seguridad');
const DIR_HTTP = path.join(RAIZ_EVIDENCIAS, 'http');
fs.mkdirSync(DIR_HTTP, { recursive: true });

const resultados = [];

/**
 * meta: { id, categoria, nombre, tipo, objetivo, esperado, severidadSiFalla }
 * fn: async () => ({ ok: boolean, obtenido: string, hallazgo?: {descripcion, severidad, recomendacion}, extra?: any })
 */
function caso(meta, fn) {
  test(`${meta.id} | ${meta.nombre}`, async () => {
    iniciarCaso(meta.id);
    let r;
    try {
      r = await fn();
    } catch (err) {
      r = { ok: false, obtenido: `Error durante la ejecución: ${err.message}` };
    }
    const intercambios = finalizarCaso();
    const archivo = path.join(DIR_HTTP, `${meta.id}.json`);
    fs.writeFileSync(
      archivo,
      JSON.stringify(
        { id: meta.id, nombre: meta.nombre, fecha: new Date().toISOString(), obtenido: r.obtenido, extra: r.extra, intercambios },
        null,
        2,
      ),
    );
    const registro = {
      id: meta.id,
      categoria: meta.categoria,
      nombre: meta.nombre,
      tipo: meta.tipo,
      objetivo: meta.objetivo,
      esperado: meta.esperado,
      obtenido: r.obtenido,
      estado: r.ok ? 'Aprobado' : 'Fallido',
      evidencia: [`http/${meta.id}.json`, 'salida-node-test.txt'],
    };
    if (!r.ok) registro.severidad = meta.severidadSiFalla || 'Media';
    if (r.hallazgo) registro.hallazgo = r.hallazgo;
    resultados.push(registro);
    assert.ok(r.ok, `${meta.id}: ${r.obtenido}`);
  });
}

after(() => {
  fs.writeFileSync(path.join(RAIZ_EVIDENCIAS, 'casos-ejecutados.json'), JSON.stringify(resultados, null, 2));
});

module.exports = { caso, resultados, RAIZ_EVIDENCIAS };
