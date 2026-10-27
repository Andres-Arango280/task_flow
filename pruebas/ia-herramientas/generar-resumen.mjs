// Agrega los resúmenes de las tres herramientas de IA en ../evidencias/ia-herramientas/resumen.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const EVID = resolve(RAIZ, '..', 'evidencias', 'ia-herramientas');
const HERRAMIENTAS = [
  { carpeta: 'playwright-agents', nombre: 'Playwright Test Agents (Planner, Generator, Healer)', numeroCurso: 3, gratis: 'Herramientas abiertas; el asistente (Claude Code) sin coste adicional' },
  { carpeta: 'browser-use', nombre: 'Browser Use', numeroCurso: 4, gratis: 'Biblioteca abierta + modelo local Ollama llama3.1:8b (sin coste)' },
  { carpeta: 'playwright-mcp', nombre: 'Playwright MCP + asistente de IA', numeroCurso: 2, gratis: 'MCP abierto + cliente propio con Ollama llama3.1:8b (sin coste)' },
];

const herramientas = HERRAMIENTAS.map((h) => {
  const ruta = join(EVID, h.carpeta, 'resumen.json');
  const r = existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : null;
  return {
    ...h,
    resumen: `${h.carpeta}/resumen.json`,
    herramienta: r?.herramienta ?? 'sin ejecutar',
    modelo: r?.modelo ?? '-',
    proposito: r?.proposito ?? '-',
    comando: r?.comando ?? '-',
    fecha: r?.fecha ?? null,
    totales: r?.totales ?? { total: 0, aprobados: 0, fallidos: 0 },
    casos: (r?.casos ?? []).map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, estado: c.estado, duracionSeg: c.duracionSeg })),
    aportes: r?.aportes ?? [],
    limitaciones: r?.limitaciones ?? [],
  };
});

const suma = (k) => herramientas.reduce((s, h) => s + (h.totales[k] ?? 0), 0);
const resumen = {
  area: 'Pruebas con herramientas de IA (criterio 6)',
  descripcion: 'Tres herramientas de IA de la lista del curso, gratuitas y ejecutadas en local: Playwright Test Agents, Browser Use y Playwright MCP. Cada una con propósito, configuración, casos (objetivo, esperado, obtenido, evidencia) y análisis de aportes y limitaciones.',
  fecha: new Date().toISOString(),
  totales: { herramientas: herramientas.length, total: suma('total'), aprobados: suma('aprobados'), fallidos: suma('fallidos') },
  herramientas,
};
writeFileSync(join(EVID, 'resumen.json'), JSON.stringify(resumen, null, 2), 'utf8');
for (const h of herramientas) console.log(`${h.nombre}: ${h.totales.aprobados}/${h.totales.total}`);
console.log(`Total: ${resumen.totales.aprobados}/${resumen.totales.total} → ${join(EVID, 'resumen.json')}`);
