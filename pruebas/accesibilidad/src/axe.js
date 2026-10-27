// Auditoría automática WCAG 2.1/2.2 AA con axe-core en todas las páginas y estados de TaskFlow.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  CONFIG, DIRS, rel, esperar, guardarJSON, lanzarNavegador, iniciarSesion, irA, captura, pulsarBoton,
  Registro, obtenerEscenario,
} from './comun.js';

const require = createRequire(import.meta.url);
const axeRuta = require.resolve('axe-core/axe.min.js');
const AXE_FUENTE = fs.readFileSync(axeRuta, 'utf8');
export const AXE_VERSION = require('axe-core/package.json').version;

const ETIQUETAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

// Recomendaciones en español para las reglas más habituales
const RECOMENDACIONES = {
  'color-contrast': 'Oscurecer el texto o aclarar el fondo hasta alcanzar 4.5:1 (3:1 en texto grande ≥ 24px o 18.66px negrita).',
  'color-contrast-enhanced': 'Para AAA, subir el contraste a 7:1.',
  'button-name': 'Dar a cada botón un nombre accesible (texto visible o aria-label).',
  'link-name': 'Dar a cada enlace un texto descriptivo o aria-label.',
  label: 'Asociar una etiqueta <label for> o aria-label a cada campo de formulario.',
  'aria-allowed-attr': 'Quitar atributos ARIA no permitidos para el rol del elemento.',
  'aria-allowed-role': 'Usar un rol ARIA compatible con el elemento HTML o un elemento nativo adecuado.',
  'aria-prohibited-attr': 'No usar aria-label en elementos sin rol que lo admita (div/span genéricos); añadir un rol o mover el texto.',
  'aria-required-children': 'Incluir los hijos obligatorios del rol ARIA o cambiar el rol.',
  'aria-required-parent': 'Colocar el elemento dentro de un contenedor con el rol padre requerido.',
  'aria-valid-attr-value': 'Corregir el valor del atributo ARIA (ids existentes, valores permitidos).',
  'heading-order': 'Respetar la jerarquía de encabezados (h1 → h2 → h3) sin saltar niveles.',
  'landmark-one-main': 'Incluir exactamente un <main> por página.',
  'landmark-unique': 'Dar etiquetas distintas (aria-label) a regiones del mismo tipo.',
  'landmark-no-duplicate-main': 'Evitar más de un <main> en la página.',
  'landmark-main-is-top-level': 'El <main> no debe estar dentro de otra región.',
  'landmark-complementary-is-top-level': 'El <aside> debe estar al nivel superior, no dentro de <main>; o usar <section>/<div role=note>.',
  region: 'Envolver todo el contenido visible en regiones (header, nav, main, footer).',
  'page-has-heading-one': 'Incluir un encabezado <h1> en la página.',
  'nested-interactive': 'No anidar controles interactivos (botón dentro de elemento con rol button/foco); separar el asa de arrastre.',
  'scrollable-region-focusable': 'Hacer enfocable (tabindex="0") la región con desplazamiento para poder desplazarla con teclado.',
  'html-has-lang': 'Añadir lang="es" a <html>.',
  'html-lang-valid': 'Usar un código de idioma válido en lang.',
  'document-title': 'Incluir un <title> descriptivo.',
  'meta-viewport': 'No impedir el zoom (quitar user-scalable=no / maximum-scale).',
  'target-size': 'Aumentar el área táctil de los controles a 24×24 px como mínimo (WCAG 2.5.8).',
  'list': 'Las listas <ul>/<ol> solo deben contener <li>.',
  'listitem': 'Los <li> deben estar dentro de <ul>/<ol>.',
  'aria-hidden-focus': 'No ocultar con aria-hidden elementos que pueden recibir foco.',
  'focus-order-semantics': 'Dar un rol adecuado a los elementos enfocables.',
  'empty-heading': 'Evitar encabezados vacíos.',
  'select-name': 'Asociar una etiqueta al <select>.',
  'aria-dialog-name': 'Dar nombre accesible al diálogo (aria-labelledby).',
  'label-content-name-mismatch': 'Hacer que el nombre accesible empiece por el texto visible (WCAG 2.5.3): quitar el aria-label y usar el texto de la tarjeta, o usar p. ej. aria-label="<título> – abrir detalle" en el botón de la tarea y "<nombre del equipo>, líder, N miembros" en la tarjeta de equipo.',
  'presentation-role-conflict': 'No poner role="presentation" en elementos enfocables o con atributos globales ARIA.',
};

const ORDEN_IMPACTO = ['critical', 'serious', 'moderate', 'minor'];

/** Convierte etiquetas axe (wcag143) en criterios legibles (1.4.3). */
export function criteriosWCAG(tags) {
  return tags
    .filter((t) => /^wcag\d{3,4}$/.test(t))
    .map((t) => {
      const d = t.replace('wcag', '');
      return `${d[0]}.${d[1]}.${d.slice(2)}`;
    });
}

function nivelWCAG(tags) {
  if (tags.some((t) => /^wcag2(1|2)?aa$/.test(t))) return 'AA';
  if (tags.some((t) => /^wcag2(1|2)?a$/.test(t))) return 'A';
  if (tags.includes('best-practice')) return 'Buena práctica';
  return 'Otro';
}

export async function ejecutarAxe(page) {
  const yaCargado = await page.evaluate(() => typeof window.axe !== 'undefined');
  if (!yaCargado) await page.addScriptTag({ content: AXE_FUENTE });
  return page.evaluate(
    (etiquetas) =>
      window.axe.run(document, {
        runOnly: { type: 'tag', values: etiquetas },
        resultTypes: ['violations', 'incomplete'],
      }),
    ETIQUETAS,
  );
}

function resumirViolaciones(resultado) {
  return resultado.violations.map((v) => ({
    regla: v.id,
    impacto: v.impact,
    nivel: nivelWCAG(v.tags),
    criterios: criteriosWCAG(v.tags),
    descripcion: v.help,
    ayuda: v.helpUrl,
    recomendacion: RECOMENDACIONES[v.id] ?? v.description,
    nodos: v.nodes.map((n) => ({
      selector: n.target.join(' '),
      html: n.html.slice(0, 220),
      resumen: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 300),
    })),
  }));
}

/** Estados a auditar: cada uno prepara la página y devuelve el nombre. */
function definirEstados(e) {
  const tablero = `/proyectos/${e.proyecto.id}`;
  return [
    { id: 'login', nombre: 'Iniciar sesión (/login)', usuario: null, ruta: '/login' },
    { id: 'register', nombre: 'Registro (/register)', usuario: null, ruta: '/register' },
    { id: 'privacidad', nombre: 'Privacidad (/privacidad)', usuario: null, ruta: '/privacidad' },
    { id: 'inicio-vacio', nombre: 'Inicio sin equipos (/)', usuario: 'vacio', ruta: '/' },
    { id: 'inicio-equipos', nombre: 'Inicio con equipos (/)', usuario: 'lider', ruta: '/' },
    { id: 'equipo', nombre: 'Vista de equipo (/equipos/:id)', usuario: 'lider', ruta: `/equipos/${e.equipo.id}` },
    {
      id: 'modal-invitar', nombre: 'Modal "Invitar miembro"', usuario: 'lider', ruta: `/equipos/${e.equipo.id}`,
      preparar: async (p) => { await pulsarBoton(p, 'Invitar'); await p.waitForSelector('[role="dialog"]'); },
    },
    { id: 'tablero', nombre: 'Tablero Kanban con tareas (/proyectos/:id)', usuario: 'lider', ruta: tablero },
    {
      id: 'modal-detalle-tarea', nombre: 'Modal de detalle de tarea', usuario: 'lider', ruta: tablero,
      preparar: async (p) => { await p.click('[data-testid="abrir-tarea"]'); await p.waitForSelector('[role="dialog"]'); },
    },
    {
      id: 'modal-crear-tarea', nombre: 'Modal "Crear nueva tarea"', usuario: 'lider', ruta: tablero,
      preparar: async (p) => { await pulsarBoton(p, 'Nueva tarea'); await p.waitForSelector('[role="dialog"]'); },
    },
    {
      id: 'dialogo-confirmacion', nombre: 'Diálogo de confirmación (eliminar tarea)', usuario: 'lider', ruta: tablero,
      preparar: async (p) => {
        await p.click('[data-testid="abrir-tarea"]');
        await p.waitForSelector('[role="dialog"]');
        await pulsarBoton(p, 'Eliminar', '[role="dialog"]');
        await p.waitForSelector('[role="alertdialog"]');
      },
    },
    { id: 'ayuda', nombre: 'Ayuda y preguntas frecuentes (/ayuda)', usuario: 'lider', ruta: '/ayuda' },
    { id: 'preferencias', nombre: 'Preferencias (/preferencias)', usuario: 'lider', ruta: '/preferencias' },
    {
      id: 'panel-atajos', nombre: 'Panel de atajos de teclado (tecla ?)', usuario: 'lider', ruta: '/',
      preparar: async (p) => { await pulsarBoton(p, 'Ver atajos de teclado'); await p.waitForSelector('[role="dialog"]'); },
    },
    {
      id: 'tablero-alto-contraste', nombre: 'Tablero en modo alto contraste', usuario: 'lider', ruta: tablero,
      prefs: { tamanoTexto: 'normal', altoContraste: true, reducirAnimaciones: false, atajosTeclado: true },
    },
    {
      id: 'inicio-alto-contraste', nombre: 'Inicio en modo alto contraste', usuario: 'lider', ruta: '/',
      prefs: { tamanoTexto: 'normal', altoContraste: true, reducirAnimaciones: false, atajosTeclado: true },
    },
    {
      id: 'tablero-texto-muy-grande', nombre: 'Tablero con texto "muy grande"', usuario: 'lider', ruta: tablero,
      prefs: { tamanoTexto: 'muy-grande', altoContraste: false, reducirAnimaciones: false, atajosTeclado: true },
    },
    {
      id: 'preferencias-texto-grande', nombre: 'Preferencias con texto "grande" + reducir animaciones', usuario: 'lider', ruta: '/preferencias',
      prefs: { tamanoTexto: 'grande', altoContraste: false, reducirAnimaciones: true, atajosTeclado: true },
    },
  ];
}

export async function correrAxe() {
  console.log(`\n== axe-core ${AXE_VERSION} ==`);
  const escenario = await obtenerEscenario();
  const registro = new Registro('axe');
  const navegador = await lanzarNavegador();
  const resumenPaginas = [];
  const totalesImpacto = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const porRegla = {};
  let n = 0;

  try {
    for (const estado of definirEstados(escenario)) {
      n += 1;
      for (let intento = 1; intento <= 2; intento++) {
      const page = await navegador.newPage();
      try {
        if (estado.usuario) {
          await iniciarSesion(page, escenario[estado.usuario], estado.prefs);
        } else {
          await page.goto(`${CONFIG.web}/login`, { waitUntil: 'networkidle0' });
          await page.evaluate(() => localStorage.clear());
        }
        await irA(page, estado.ruta);
        if (estado.preparar) await estado.preparar(page);
        await esperar(500);

        const resultado = await ejecutarAxe(page);
        const violaciones = resumirViolaciones(resultado);
        const archivo = path.join(DIRS.axe, `${estado.id}.json`);
        guardarJSON(archivo, {
          pagina: estado.nombre,
          url: page.url(),
          fecha: new Date().toISOString(),
          axe: AXE_VERSION,
          etiquetas: ETIQUETAS,
          totalViolaciones: violaciones.length,
          violaciones,
          incompletas: resultado.incomplete.map((i) => ({ regla: i.id, impacto: i.impact, nodos: i.nodes.length, descripcion: i.help })),
          reglasSuperadas: resultado.passes?.length,
        });
        const img = await captura(page, `axe-${estado.id}`, DIRS.axe, !estado.preparar);

        const conteo = { critical: 0, serious: 0, moderate: 0, minor: 0 };
        for (const v of violaciones) {
          conteo[v.impacto] = (conteo[v.impacto] ?? 0) + v.nodos.length;
          totalesImpacto[v.impacto] = (totalesImpacto[v.impacto] ?? 0) + v.nodos.length;
          const r = (porRegla[v.regla] ??= {
            regla: v.regla, impacto: v.impacto, nivel: v.nivel, criterios: v.criterios, descripcion: v.descripcion,
            recomendacion: v.recomendacion, paginas: [], nodos: 0, selectores: [],
          });
          r.paginas.push(estado.id);
          r.nodos += v.nodos.length;
          for (const nodo of v.nodos) if (r.selectores.length < 8 && !r.selectores.includes(nodo.selector)) r.selectores.push(nodo.selector);
        }
        const wcag = violaciones.filter((v) => v.nivel === 'A' || v.nivel === 'AA');
        const bp = violaciones.filter((v) => v.nivel === 'Buena práctica');
        resumenPaginas.push({ id: estado.id, pagina: estado.nombre, conteo, reglas: violaciones.map((v) => v.regla), wcag: wcag.length, buenasPracticas: bp.length });

        const obtenido = violaciones.length === 0
          ? `0 violaciones (axe ${AXE_VERSION}, ${resultado.passes.length} reglas superadas)`
          : `${wcag.length} regla(s) WCAG A/AA y ${bp.length} de buenas prácticas incumplidas: ` +
            violaciones.map((v) => `${v.regla} [${v.impacto}, ${v.nodos.length} nodo(s)${v.criterios.length ? `, WCAG ${v.criterios.join('/')}` : ''}]`).join('; ');
        registro.agregar({
          id: `A11Y-${String(n).padStart(2, '0')}`,
          tipo: 'accesibilidad',
          nombre: `axe-core WCAG 2.2 AA – ${estado.nombre}`,
          objetivo: `Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "${estado.nombre}".`,
          esperado: '0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso).',
          obtenido,
          aprobado: wcag.length === 0,
          evidencia: [rel(archivo), img],
        });
        break;
      } catch (err) {
        // Fallo del entorno (recarga, backend compartido reiniciándose, timeout de captura): se repite una vez
        if (intento === 1) {
          console.log(`    (aviso) ${estado.id}: ${err.message.split('\n')[0]}; se repite`);
          continue;
        }
        registro.agregar({
          id: `A11Y-${String(n).padStart(2, '0')}`, tipo: 'accesibilidad', nombre: `axe-core WCAG 2.2 AA – ${estado.nombre}`,
          objetivo: `Auditar "${estado.nombre}" con axe-core.`, esperado: 'Página auditada sin violaciones WCAG A/AA.',
          obtenido: `Error al preparar/auditar el estado: ${err.message}`, aprobado: false,
        });
      } finally {
        await page.close().catch(() => {});
      }
      }
    }
  } finally {
    await navegador.close();
  }

  const reglas = Object.values(porRegla).sort((a, b) => ORDEN_IMPACTO.indexOf(a.impacto) - ORDEN_IMPACTO.indexOf(b.impacto));
  registro.extra = { axeVersion: AXE_VERSION, etiquetas: ETIQUETAS, totalesImpacto, paginas: resumenPaginas, reglas };
  guardarJSON(path.join(DIRS.axe, '_resumen.json'), registro.extra);
  registro.guardar();
  return registro;
}
