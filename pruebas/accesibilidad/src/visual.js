// Comportamiento visual: capturas en 3 viewports, desbordamiento horizontal, tamaño de texto,
// contraste (axe color-contrast), modos de accesibilidad y regresión visual con pixelmatch.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import {
  CONFIG, DIRS, rel, esperar, lanzarNavegador, iniciarSesion, irA, Registro, obtenerEscenario,
} from './comun.js';
import { ejecutarAxe } from './axe.js';

export const VIEWPORTS = [
  { id: 'movil', nombre: 'Móvil 390×844', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  { id: 'tablet', nombre: 'Tablet 768×1024', width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  { id: 'escritorio', nombre: 'Escritorio 1366×900', width: 1366, height: 900, deviceScaleFactor: 1 },
];
const REFLOW = { id: 'reflow320', nombre: 'Reflow 320×640 (equivale a 1280px al 400 %)', width: 320, height: 640, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };

const PREFS = { tamanoTexto: 'normal', altoContraste: false, reducirAnimaciones: true, atajosTeclado: true };
const UMBRAL_DIFF = 0.5; // % de píxeles distintos tolerado entre dos capturas de la misma UI
const DIR_BASE = path.join(DIRS.visual, 'base');
const DIR_ACTUAL = path.join(DIRS.visual, 'actual');
const DIR_DIFF = path.join(DIRS.visual, 'diff');
for (const d of [DIR_BASE, DIR_ACTUAL, DIR_DIFF]) fs.mkdirSync(d, { recursive: true });

// Oculta contenido que cambia solo (reloj "Actualizado hace…", avisos, cursor) para comparar capturas
const CSS_ESTABLE = `
  *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
  [title="El tablero se actualiza solo cada 15 segundos"], [aria-live] .fixed, .fixed.bottom-4, .fixed.bottom-0 { visibility: hidden !important; }
`;

function paginas(e) {
  return [
    { id: 'login', nombre: 'Login', ruta: '/login', privada: false },
    { id: 'register', nombre: 'Registro', ruta: '/register', privada: false },
    { id: 'privacidad', nombre: 'Privacidad', ruta: '/privacidad', privada: false },
    { id: 'inicio', nombre: 'Inicio', ruta: '/', privada: true },
    { id: 'equipo', nombre: 'Equipo', ruta: `/equipos/${e.equipo.id}`, privada: true },
    { id: 'tablero', nombre: 'Tablero', ruta: `/proyectos/${e.proyecto.id}`, privada: true },
    { id: 'ayuda', nombre: 'Ayuda', ruta: '/ayuda', privada: true },
    { id: 'preferencias', nombre: 'Preferencias', ruta: '/preferencias', privada: true },
  ];
}

async function prepararPagina(navegador, e, p, vp, prefs = PREFS) {
  const page = await navegador.newPage();
  await page.setViewport(vp);
  if (p.privada) await iniciarSesion(page, e.lider, prefs);
  else {
    await page.goto(`${CONFIG.web}/login`, { waitUntil: 'networkidle0' });
    await page.evaluate((pr) => { localStorage.clear(); localStorage.setItem('taskflow:preferencias', JSON.stringify(pr)); }, prefs);
  }
  await irA(page, p.ruta);
  return page;
}

const medirDesbordamiento = (page) =>
  page.evaluate(() => {
    const ancho = window.innerWidth;
    const sw = document.documentElement.scrollWidth;
    // Elementos que sobresalen del viewport (excluye los que están dentro de un contenedor con scroll propio)
    const culpables = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= ancho + 1) continue;
      let p = el.parentElement;
      let enScroll = false;
      while (p && p !== document.body) {
        const ov = getComputedStyle(p).overflowX;
        if (ov === 'auto' || ov === 'scroll' || ov === 'hidden' || ov === 'clip') { enScroll = true; break; }
        p = p.parentElement;
      }
      if (!enScroll && culpables.length < 5) culpables.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).split(' ').slice(0, 3).join('.')} (right=${Math.round(r.right)})`);
    }
    return { innerWidth: ancho, scrollWidth: sw, desborda: sw > ancho, culpables };
  });

const medirTexto = (page) =>
  page.evaluate(() => {
    const muestras = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const vistos = new Set();
    while (walker.nextNode()) {
      const t = walker.currentNode;
      const el = t.parentElement;
      if (!el || vistos.has(el) || !t.textContent.trim()) continue;
      vistos.add(el);
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      // Solo texto visible (excluye sr-only y ocultos)
      if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || cs.display === 'none' || cs.clip === 'rect(0px, 0px, 0px, 0px)') continue;
      if (el.closest('[aria-hidden="true"], .sr-only, svg')) continue;
      muestras.push({ texto: t.textContent.trim().slice(0, 40), px: parseFloat(cs.fontSize), tag: el.tagName.toLowerCase() });
    }
    const pequenos = muestras.filter((m) => m.px < 14);
    const tam = muestras.map((m) => m.px);
    return {
      total: muestras.length,
      menores14: pequenos.length,
      minimo: tam.length ? Math.min(...tam) : null,
      ejemplos: pequenos.slice(0, 6),
      cuerpo: parseFloat(getComputedStyle(document.body).fontSize),
    };
  });

function compararPNG(a, b, salida) {
  const img1 = PNG.sync.read(fs.readFileSync(a));
  const img2 = PNG.sync.read(fs.readFileSync(b));
  if (img1.width !== img2.width || img1.height !== img2.height) {
    return { porcentaje: 100, motivo: `tamaños distintos ${img1.width}×${img1.height} vs ${img2.width}×${img2.height}` };
  }
  const diff = new PNG({ width: img1.width, height: img1.height });
  const n = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold: 0.1 });
  fs.writeFileSync(salida, PNG.sync.write(diff));
  return { porcentaje: +((n / (img1.width * img1.height)) * 100).toFixed(3), pixeles: n };
}

async function capturaEstable(page, archivo) {
  await page.addStyleTag({ content: CSS_ESTABLE });
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  await esperar(300);
  await page.screenshot({ path: archivo });
}

export async function correrVisual() {
  console.log('\n== Visual ==');
  const e = await obtenerEscenario();
  const registro = new Registro('visual');
  const navegador = await lanzarNavegador();
  const tablaCapturas = [];
  const textoPorPagina = [];
  const contraste = [];
  const regresion = [];
  const axeViewport = [];
  let n = 0;
  const sig = () => `VIS-${String(++n).padStart(2, '0')}`;
  let navMovil = null;

  try {
    // ---------------------------------------------------------------- capturas + desbordamiento por página
    for (const p of paginas(e)) {
      const filas = [];
      const evid = [];
      for (const vp of [...VIEWPORTS, REFLOW]) {
        const page = await prepararPagina(navegador, e, p, vp);
        const des = await medirDesbordamiento(page);
        // En móvil, "Inicio" y "Preferencias" deben tener texto visible (no solo icono con title)
        if (p.id === 'inicio' && vp.id === 'movil') {
          navMovil = await page.evaluate(() => {
            const nav = document.querySelector('nav[aria-label="Navegación principal"]') ?? document.querySelector('nav');
            const enlaces = nav ? [...nav.querySelectorAll('a[href]')] : [];
            const visible = (href, etiqueta) => {
              // Puede haber varios enlaces a la misma ruta (p. ej. el logotipo también lleva a /): se elige el de la sección
              const candidatos = enlaces.filter((x) => new URL(x.href).pathname === href);
              const a = candidatos.find((x) => (x.innerText || '').includes(etiqueta)) ?? candidatos[candidatos.length - 1];
              if (!a) return { encontrado: false, texto: '' };
              const r = a.getBoundingClientRect();
              return { encontrado: true, texto: (a.innerText || '').trim().replace(/\s+/g, ' '), visible: r.width > 0 && r.height > 0 };
            };
            return { inicio: visible('/', 'Inicio'), preferencias: visible('/preferencias', 'Preferencias') };
          });
          const archivoNav = path.join(DIRS.capturas, 'nav-movil.png');
          await page.screenshot({ path: archivoNav, clip: { x: 0, y: 0, width: vp.width, height: 120 } });
          navMovil.captura = rel(archivoNav);
        }
        let img = null;
        if (vp.id !== 'reflow320') {
          const archivo = path.join(DIRS.capturas, `${p.id}-${vp.id}.png`);
          await page.screenshot({ path: archivo, fullPage: true });
          img = rel(archivo);
          evid.push(img);
        }
        // contraste por viewport (solo regla color-contrast)
        if (vp.id !== 'reflow320') {
          const res = await ejecutarAxe(page);
          const cc = res.violations.find((v) => v.id === 'color-contrast');
          const wcag = res.violations.filter((v) => v.tags.some((t) => /^wcag2(1|2)?a{1,2}$/.test(t)));
          axeViewport.push({ pagina: p.id, viewport: vp.id, reglas: wcag.map((v) => `${v.id} (${v.nodes.length})`) });
          contraste.push({ pagina: p.id, viewport: vp.id, nodos: cc ? cc.nodes.length : 0, ejemplos: cc ? cc.nodes.slice(0, 3).map((x) => x.target.join(' ')) : [] });
        }
        if (vp.id === 'escritorio') textoPorPagina.push({ pagina: p.nombre, ...(await medirTexto(page)) });
        filas.push({ viewport: vp.nombre, ...des, captura: img });
        tablaCapturas.push({ pagina: p.nombre, viewport: vp.id, innerWidth: des.innerWidth, scrollWidth: des.scrollWidth, desborda: des.desborda, captura: img });
        await page.close();
      }
      const malos = filas.filter((f) => f.desborda && !f.viewport.startsWith('Reflow'));
      registro.agregar({
        id: sig(), tipo: 'visual', nombre: `Diseño adaptable sin desbordamiento – ${p.nombre}`,
        objetivo: `Comprobar que "${p.nombre}" se adapta a móvil, tablet y escritorio sin barra de desplazamiento horizontal (WCAG 1.4.10).`,
        esperado: 'document.scrollWidth ≤ window.innerWidth en 390, 768 y 1366 px.',
        obtenido: filas.filter((f) => !f.viewport.startsWith('Reflow')).map((f) => `${f.viewport.split(' ')[0]}: ${f.scrollWidth}/${f.innerWidth}px${f.desborda ? ' DESBORDA' : ''}`).join(' · ') +
          (malos.length && malos[0].culpables.length ? ` · elementos que sobresalen: ${malos[0].culpables.join(', ')}` : ''),
        aprobado: malos.length === 0,
        evidencia: evid,
        detalle: filas,
      });
    }

    // ---------------------------------------------------------------- reflow a 320 px (todas las páginas)
    const reflow = tablaCapturas.filter((t) => t.viewport === 'reflow320');
    const reflowMal = reflow.filter((t) => t.desborda);
    registro.agregar({
      id: sig(), tipo: 'visual', nombre: 'Reflow a 320 px (equivalente a zoom 400 %)',
      objetivo: 'Verificar que todas las páginas pueden leerse a 320 px de ancho sin desplazamiento horizontal (WCAG 1.4.10 Reflow).',
      esperado: 'Ninguna página desborda a 320 px (el tablero puede desplazar sus columnas dentro de su propia región).',
      obtenido: reflowMal.length ? `Desbordan: ${reflowMal.map((t) => `${t.pagina} (${t.scrollWidth}px)`).join(', ')}` : `Las ${reflow.length} páginas caben en 320 px.`,
      aprobado: reflowMal.length === 0,
      evidencia: [],
      detalle: reflow,
    });

    // ---------------------------------------------------------------- tamaño de texto
    const conPequenos = textoPorPagina.filter((t) => t.menores14 > 0);
    const totalMuestras = textoPorPagina.reduce((s, t) => s + t.total, 0);
    const totalPeq = textoPorPagina.reduce((s, t) => s + t.menores14, 0);
    registro.agregar({
      id: sig(), tipo: 'visual', nombre: 'Tamaño mínimo de texto (≥ 14 px)',
      objetivo: 'Muestrear el font-size calculado de todos los textos visibles (escritorio) y comprobar que no hay texto menor de 14 px (antes se usaban 12 px).',
      esperado: '0 elementos de texto visibles con font-size < 14 px; cuerpo ≥ 16 px.',
      obtenido: `${totalMuestras} textos muestreados en ${textoPorPagina.length} páginas; ${totalPeq} con < 14 px` +
        (conPequenos.length ? ` (${conPequenos.map((t) => `${t.pagina}: ${t.ejemplos.map((x) => `"${x.texto}" ${x.px}px`).slice(0, 3).join(', ')}`).join(' | ')})` : '') +
        `; cuerpo ${textoPorPagina[0]?.cuerpo}px; mínimo ${Math.min(...textoPorPagina.map((t) => t.minimo ?? 99))}px.`,
      aprobado: totalPeq === 0,
      evidencia: [],
      detalle: textoPorPagina,
    });

    // ---------------------------------------------------------------- contraste
    const ccMal = contraste.filter((c) => c.nodos > 0);
    registro.agregar({
      id: sig(), tipo: 'visual', nombre: 'Contraste de color en 3 viewports (axe color-contrast)',
      objetivo: 'Verificar con axe-core que todo el texto alcanza 4.5:1 (3:1 en texto grande) en móvil, tablet y escritorio (WCAG 1.4.3).',
      esperado: '0 nodos con contraste insuficiente en las 8 páginas × 3 viewports.',
      obtenido: ccMal.length ? `Contraste insuficiente en: ${ccMal.map((c) => `${c.pagina}/${c.viewport} (${c.nodos}: ${c.ejemplos.join(', ')})`).join('; ')}` : `0 nodos con contraste insuficiente en ${contraste.length} combinaciones página×viewport.`,
      aprobado: ccMal.length === 0,
      evidencia: [],
      detalle: contraste,
    });

    // ---------------------------------------------------------------- axe completo en móvil y tablet
    {
      const otros = axeViewport.filter((a) => a.viewport !== 'escritorio');
      const conFallos = otros.filter((a) => a.reglas.length);
      registro.agregar({
        id: sig(), tipo: 'accesibilidad', nombre: 'axe-core WCAG A/AA en móvil y tablet',
        objetivo: 'Repetir la auditoría automática en los viewports móvil (390 px) y tablet (768 px), donde la barra de navegación cambia (enlaces solo con icono).',
        esperado: '0 violaciones WCAG A/AA en las 8 páginas en móvil y tablet.',
        obtenido: conFallos.length ? conFallos.map((a) => `${a.pagina}/${a.viewport}: ${a.reglas.join(', ')}`).join('; ') : `0 violaciones WCAG A/AA en ${otros.length} combinaciones página×viewport.`,
        aprobado: conFallos.length === 0,
        evidencia: [],
        detalle: axeViewport,
      });
    }

    // ---------------------------------------------------------------- modos de accesibilidad (alto contraste / texto grande)
    {
      const p = paginas(e).find((x) => x.id === 'tablero');
      const vp = VIEWPORTS[2];
      const normal = await prepararPagina(navegador, e, p, vp);
      const medir = (pg) => pg.evaluate(() => {
        const gris = document.querySelector('[class*="text-gray-7"]');
        return {
          htmlFont: getComputedStyle(document.documentElement).fontSize,
          colorGris: gris ? getComputedStyle(gris).color : null,
          fondo: getComputedStyle(document.body).backgroundColor,
          contraste: document.documentElement.dataset.contraste,
          texto: document.documentElement.dataset.texto,
        };
      });
      const mNormal = await medir(normal);
      await normal.close();
      const ac = await prepararPagina(navegador, e, p, vp, { ...PREFS, altoContraste: true, tamanoTexto: 'muy-grande' });
      const mAc = await medir(ac);
      const archivo = path.join(DIRS.capturas, 'tablero-alto-contraste-texto-muy-grande.png');
      await ac.screenshot({ path: archivo, fullPage: true });
      const des = await medirDesbordamiento(ac);
      await ac.close();
      const ok = mAc.contraste === 'alto' && mAc.htmlFont === '20px' && mAc.colorGris === 'rgb(17, 17, 17)' && !des.desborda;
      registro.agregar({
        id: sig(), tipo: 'visual', nombre: 'Preferencias "Alto contraste" + "Texto muy grande" se aplican',
        objetivo: 'Comprobar que las preferencias de accesibilidad cambian realmente los estilos calculados y el diseño sigue sin desbordar (WCAG 1.4.4 Redimensionar texto).',
        esperado: 'html font-size 16px → 20px; texto gris secundario → #111 (rgb 17,17,17); fondo blanco; sin desbordamiento horizontal.',
        obtenido: `Normal: font ${mNormal.htmlFont}, gris ${mNormal.colorGris}, fondo ${mNormal.fondo}. Preferencias activas: font ${mAc.htmlFont}, gris ${mAc.colorGris}, fondo ${mAc.fondo}; scrollWidth ${des.scrollWidth}/${des.innerWidth}.`,
        aprobado: ok,
        evidencia: [rel(archivo)],
      });
    }

    // ---------------------------------------------------------------- regresión visual
    for (const p of paginas(e)) {
      const vp = VIEWPORTS[2];
      const base = path.join(DIR_BASE, `${p.id}.png`);
      const actual = path.join(DIR_ACTUAL, `${p.id}.png`);
      const diff = path.join(DIR_DIFF, `${p.id}.png`);
      let origen = 'línea base de una ejecución anterior';
      if (!fs.existsSync(base)) {
        const pg = await prepararPagina(navegador, e, p, vp);
        await capturaEstable(pg, base);
        await pg.close();
        origen = 'línea base creada en esta ejecución';
      }
      const pg = await prepararPagina(navegador, e, p, vp);
      await capturaEstable(pg, actual);
      await pg.close();
      const r = compararPNG(base, actual, diff);
      regresion.push({ pagina: p.nombre, ...r, origen, base: rel(base), actual: rel(actual), diff: rel(diff) });
    }
    const inestables = regresion.filter((r) => r.porcentaje > UMBRAL_DIFF);
    registro.agregar({
      id: sig(), tipo: 'visual', nombre: 'Regresión visual (pixelmatch) entre dos ejecuciones',
      objetivo: 'Comparar píxel a píxel la UI de escritorio contra una línea base para detectar cambios visuales no intencionados.',
      esperado: `Diferencia ≤ ${UMBRAL_DIFF} % en cada página (UI estable ≈ 0 %).`,
      obtenido: regresion.map((r) => `${r.pagina}: ${r.porcentaje}%`).join(' · ') + ` (${regresion[0]?.origen}).`,
      aprobado: inestables.length === 0,
      evidencia: regresion.flatMap((r) => (r.porcentaje > 0 ? [r.diff] : [])).slice(0, 4).concat(regresion.slice(0, 1).map((r) => r.base)),
      detalle: regresion,
    });

    // ---------------------------------------------------------------- etiquetas visibles de la navegación en móvil
    const textoInicio = navMovil?.inicio?.texto ?? '';
    const textoPref = navMovil?.preferencias?.texto ?? '';
    registro.agregar({
      id: sig(), tipo: 'visual', nombre: 'Navegación en móvil con etiquetas de texto visibles',
      objetivo: 'Comprobar que en móvil (390 px) los enlaces "Inicio" y "Preferencias" muestran texto visible y no dependen solo de un icono con title, que no se ve en pantallas táctiles (heurística 6, reconocimiento antes que recuerdo).',
      esperado: 'Los enlaces a / y /preferencias de la barra de navegación muestran el texto "Inicio" y "Preferencias" a 390 px.',
      obtenido: navMovil
        ? `Enlace a /: texto visible "${textoInicio}"; enlace a /preferencias: texto visible "${textoPref}".`
        : 'No se pudo medir la barra de navegación en móvil.',
      aprobado: /Inicio/.test(textoInicio) && /Preferencias/.test(textoPref),
      evidencia: navMovil?.captura ? [navMovil.captura] : [],
      detalle: navMovil,
    });
  } finally {
    await navegador.close();
  }
  registro.extra = { capturas: tablaCapturas, texto: textoPorPagina, contraste, axeViewport, regresion };
  registro.guardar();
  return registro;
}
