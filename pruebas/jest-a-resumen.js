// Convierte los resultados JSON de Jest (backend) al formato común de evidencias del informe.
// Uso: node pruebas/jest-a-resumen.js   (después de npm run test:evidencias)
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'evidencias', 'backend-jest');
const leer = (archivo) => JSON.parse(fs.readFileSync(path.join(dir, archivo), 'utf8'));

const NEGATIVO = /lanzar|no debe|impedir|rechaz|error|inválid|sin |no puede|bloque|ajeno|inexistente|denegad|401|403|404|409|400/i;

function casos(resultado, prefijo, tipoPrueba) {
  const lista = [];
  let n = 0;
  for (const suite of resultado.testResults) {
    const archivo = path.relative(path.join(__dirname, '..'), suite.name).replace(/\\/g, '/');
    for (const prueba of suite.assertionResults) {
      n += 1;
      const titulo = prueba.title;
      const aprobado = prueba.status === 'passed';
      lista.push({
        id: `${prefijo}-${String(n).padStart(3, '0')}`,
        suite: prueba.ancestorTitles.join(' › '),
        nombre: titulo,
        tipo: NEGATIVO.test(titulo) ? 'negativo' : 'positivo',
        objetivo: `${tipoPrueba}: verificar que el sistema ${titulo.replace(/^debe /, '')}.`,
        esperado: `El sistema ${titulo.replace(/^debe /, '')}.`,
        obtenido: aprobado
          ? `Correcto: todas las aserciones se cumplieron (${prueba.duration ?? 0} ms).`
          : `Falló: ${(prueba.failureMessages || []).join(' ').split('\n')[0]}`,
        estado: aprobado ? 'Aprobado' : 'Fallido',
        evidencia: [archivo, `pruebas/evidencias/backend-jest/${prefijo === 'JU' ? 'jest-unit.json' : 'jest-e2e.json'}`],
      });
    }
  }
  return lista;
}

const unit = leer('jest-unit.json');
const e2e = leer('jest-e2e.json');
const todos = [...casos(unit, 'JU', 'Prueba unitaria de servicio'), ...casos(e2e, 'JE', 'Prueba de caja negra del servicio')];
const aprobados = todos.filter((c) => c.estado === 'Aprobado').length;

let cobertura = null;
const rutaCobertura = path.join(dir, 'cobertura', 'coverage-summary.json');
if (fs.existsSync(rutaCobertura)) {
  const total = JSON.parse(fs.readFileSync(rutaCobertura, 'utf8')).total;
  cobertura = Object.fromEntries(['lines', 'statements', 'functions', 'branches'].map((k) => [k, total[k].pct]));
}

const resumen = {
  area: 'Regresión del backend (servicios)',
  herramienta: `Jest ${require('jest/package.json').version} + ts-jest + Supertest`,
  comando: 'npm run test:evidencias',
  fecha: new Date().toISOString(),
  totales: {
    total: todos.length,
    aprobados,
    fallidos: todos.length - aprobados,
    duracionSeg: Math.round(((unit.testResults.reduce((s, t) => s + (t.endTime - t.startTime), 0) +
      e2e.testResults.reduce((s, t) => s + (t.endTime - t.startTime), 0)) / 1000) * 10) / 10,
  },
  cobertura,
  casos: todos,
};

fs.writeFileSync(path.join(dir, 'resumen.json'), JSON.stringify(resumen, null, 2));
console.log(`resumen.json: ${aprobados}/${todos.length} aprobados; cobertura líneas ${cobertura?.lines}%`);
