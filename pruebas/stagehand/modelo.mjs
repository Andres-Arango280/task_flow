// Configuración del modelo local (Ollama) para Stagehand, con un middleware que corrige
// las desviaciones de formato habituales de un modelo pequeño (llama3.1:8b).
import { appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const NOMBRE_MODELO = process.env.STAGEHAND_MODELO ?? 'ollama/llama3.1:8b';
export const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434/api';

/** Contadores de las desviaciones de formato corregidas (se publican en resumen.json como medida de fiabilidad). */
export const correcciones = { llamadas: 0, elementIdConCorchetes: 0, elementIdSinGuion: 0, elementIdTextual: 0, argumentosDeClickEliminados: 0, bloqueMarkdown: 0 };

/** Ids de elemento ("0-38") presentes en el árbol de accesibilidad que se envió al modelo, con el texto de su línea. */
function idsDelPrompt(params) {
  const texto = JSON.stringify(params?.prompt ?? '');
  const lineas = [...texto.matchAll(/\[(\d+-\d+)\]\s*([^\\\n"]{0,100})/g)].map((m) => ({ id: m[1], texto: m[2].trim().toLowerCase() }));
  return { ids: [...new Set(lineas.map((l) => l.id))], lineas };
}

/** Normaliza el texto JSON que devuelve el modelo antes de que Stagehand lo valide con zod. */
export function normalizarTexto(texto, idsValidos = [], lineas = []) {
  let salida = texto;
  // A veces escribe en elementId la descripción del nodo ("button: Iniciar sesión") en lugar de su id: se busca la línea del árbol.
  salida = salida.replace(/"elementId"\s*:\s*"([^"\d][^"]{0,100})"/g, (todo, descripcion) => {
    const buscado = descripcion.trim().toLowerCase();
    const linea = lineas.find((l) => l.texto === buscado) ?? lineas.find((l) => l.texto.includes(buscado) || buscado.includes(l.texto.replace(/^[a-z]+:\s*/, '')) && l.texto.length > 3);
    if (!linea) return todo;
    correcciones.elementIdTextual += 1;
    return `"elementId": "${linea.id}"`;
  });
  // Algunos modelos devuelven el JSON dentro de un bloque ```json ... ```
  if (/^\s*```/.test(salida)) correcciones.bloqueMarkdown += 1;
  salida = salida.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  // El esquema exige "0-38"; el modelo suele copiar el id tal como aparece en el árbol: "[0-38]".
  if (/"elementId"\s*:\s*"\s*\[/.test(salida)) correcciones.elementIdConCorchetes += 1;
  salida = salida.replace(/"elementId"\s*:\s*"\s*\[?\s*(\d+-\d+)\s*\]?\s*"/g, '"elementId": "$1"');
  // A veces omite el prefijo del marco ("1038" en lugar de "0-1038"): se recupera buscando el id en el árbol enviado.
  salida = salida.replace(/"elementId"\s*:\s*"\s*(\d+)\s*"/g, (todo, numero) => {
    const candidato = idsValidos.find((id) => id.endsWith(`-${numero}`)) ?? `0-${numero}`;
    correcciones.elementIdSinGuion += 1;
    return `"elementId": "${candidato}"`;
  });
  // Para "click" el modelo inventa argumentos ("right", el texto del botón…) que CDP rechaza como botón del ratón.
  salida = salida.replace(/("method"\s*:\s*"click"\s*,\s*"arguments"\s*:\s*)\[[^\]]*\]/g, (todo, inicio, desplazamiento, cadena) => {
    if (!/\[\s*\]/.test(todo)) correcciones.argumentosDeClickEliminados += 1;
    return `${inicio}[]`;
  });
  return salida;
}

/** Registro de cada respuesta cruda del modelo (antes de normalizar), como evidencia de su comportamiento. */
export const REGISTRO_RESPUESTAS = process.env.STAGEHAND_REGISTRO
  ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'evidencias', 'stagehand', 'respuestas-modelo.jsonl');
function registrar(entrada) {
  if (!REGISTRO_RESPUESTAS) return;
  try { appendFileSync(REGISTRO_RESPUESTAS, JSON.stringify(entrada) + '\n', 'utf8'); } catch { /* sin registro */ }
}

/** Middleware del AI SDK (LanguageModelV2Middleware) aplicado a cada llamada al modelo. */
export const middlewareModeloLocal = {
  specificationVersion: 'v2',
  wrapGenerate: async ({ doGenerate, params }) => {
    const inicio = Date.now();
    const resultado = await doGenerate();
    correcciones.llamadas += 1;
    const { ids, lineas } = idsDelPrompt(params);
    const textoCrudo = Array.isArray(resultado.content)
      ? resultado.content.filter((p) => p.type === 'text').map((p) => p.text).join('')
      : resultado.text;
    const instruccion = (JSON.stringify(params?.prompt ?? '').match(/instruction: ([^\\"]{0,160})/) ?? [])[1] ?? null;
    registrar({ fecha: new Date().toISOString(), segundos: Number(((Date.now() - inicio) / 1000).toFixed(1)), instruccion, respuestaCruda: textoCrudo, tokensEntrada: resultado.usage?.inputTokens, tokensSalida: resultado.usage?.outputTokens });
    if (Array.isArray(resultado.content)) {
      resultado.content = resultado.content.map((parte) =>
        parte.type === 'text' ? { ...parte, text: normalizarTexto(parte.text, ids, lineas) } : parte,
      );
    } else if (typeof resultado.text === 'string') {
      resultado.text = normalizarTexto(resultado.text, ids, lineas);
    }
    return resultado;
  },
};

export const configuracionModelo = () => ({
  modelName: NOMBRE_MODELO,
  baseURL: OLLAMA_URL,
  temperature: 0,
  middleware: middlewareModeloLocal,
});
