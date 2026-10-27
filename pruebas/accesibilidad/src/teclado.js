// Navegación solo con teclado: orden de tabulación, foco visible, enlace de salto, trampas de foco
// en ventanas modales, cierre con Esc, atajos y arrastre de tareas con teclado.
import path from 'node:path';
import {
  CONFIG, DIRS, rel, esperar, lanzarNavegador, iniciarSesion, irA, api, Registro, obtenerEscenario, pulsarBoton,
} from './comun.js';

const PREFS = { tamanoTexto: 'normal', altoContraste: false, reducirAnimaciones: true, atajosTeclado: true };

/** Describe el elemento enfocado: etiqueta, nombre accesible, si está dentro de un diálogo/main/nav. */
const describirFoco = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { tag: 'BODY', nombre: '', enDialogo: false, enMain: false, enNav: false };
    const nombre = (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('placeholder') || el.id || '').trim().replace(/\s+/g, ' ').slice(0, 70);
    return {
      tag: el.tagName,
      nombre,
      testid: el.getAttribute('data-testid') || '',
      enDialogo: Boolean(el.closest('[role="dialog"], [role="alertdialog"]')),
      enMain: Boolean(el.closest('main')),
      enNav: Boolean(el.closest('nav')),
    };
  });

/** Compara el estilo del elemento enfocado con el mismo elemento sin foco: ¿hay indicador visible? */
const indicadorFoco = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const leer = () => {
      const cs = getComputedStyle(el);
      return {
        outlineStyle: cs.outlineStyle, outlineWidth: parseFloat(cs.outlineWidth) || 0, outlineColor: cs.outlineColor,
        boxShadow: cs.boxShadow, borderColor: cs.borderColor, background: cs.backgroundColor, textDecoration: cs.textDecorationLine,
      };
    };
    const conFoco = leer();
    // Mide el estado sin foco sin disparar onBlur de React: clona estilos vía una clase temporal no es fiable,
    // así que se quita el foco y se vuelve a poner con focus({focusVisible:true}) tras medir.
    el.blur();
    const sinFoco = leer();
    el.focus({ preventScroll: true, focusVisible: true });
    const outline = conFoco.outlineStyle !== 'none' && conFoco.outlineWidth > 0;
    const cambia =
      outline ||
      conFoco.boxShadow !== sinFoco.boxShadow ||
      conFoco.borderColor !== sinFoco.borderColor ||
      conFoco.background !== sinFoco.background ||
      conFoco.textDecoration !== sinFoco.textDecoration;
    return { visible: cambia, outline, conFoco, tipo: outline ? `outline ${conFoco.outlineStyle} ${conFoco.outlineWidth}px` : conFoco.boxShadow !== sinFoco.boxShadow ? 'anillo (box-shadow)' : cambia ? 'cambio de borde/fondo' : 'ninguno' };
  });

async function tab(page, veces = 1, shift = false) {
  for (let i = 0; i < veces; i++) {
    if (shift) await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    if (shift) await page.keyboard.up('Shift');
    await esperar(60);
  }
}

async function capturaTeclado(page, nombre) {
  const archivo = path.join(DIRS.teclado, `${nombre}.png`);
  await page.screenshot({ path: archivo });
  return rel(archivo);
}

/** Enfoca el body sin dejar foco previo, como al cargar la página. */
// Coloca el punto de partida de la navegación secuencial al principio del documento (como al cargar),
// con un marcador no tabulable (tabindex=-1) que no altera el orden de tabulación de la app.
async function reiniciarFoco(page) {
  await page.bringToFront();
  await page.evaluate(() => {
    let m = document.getElementById('__inicio-foco-qa');
    if (!m) {
      m = document.createElement('span');
      m.id = '__inicio-foco-qa';
      m.tabIndex = -1;
      document.body.prepend(m);
    }
    window.scrollTo(0, 0);
    m.focus();
  });
}

export async function correrTeclado() {
  console.log('\n== Teclado ==');
  const e = await obtenerEscenario();
  const registro = new Registro('teclado');
  const navegador = await lanzarNavegador();
  const tablero = `/proyectos/${e.proyecto.id}`;

  try {
    const page = await navegador.newPage();

    // ---------------------------------------------------------------- TEC-01 enlace "Saltar al contenido"
    await iniciarSesion(page, e.lider, PREFS);
    await irA(page, '/');
    await reiniciarFoco(page);
    await tab(page);
    const primero = await describirFoco(page);
    const visibleSalto = await page.evaluate(() => {
      const r = document.activeElement.getBoundingClientRect();
      return r.width > 20 && r.height > 10 && r.top >= 0;
    });
    const imgSalto = await capturaTeclado(page, 'tec01-saltar-al-contenido');
    await page.keyboard.press('Enter');
    await esperar(300);
    const hash = await page.evaluate(() => location.hash);
    await tab(page);
    const trasSalto = await describirFoco(page);
    registro.agregar({
      id: 'TEC-01', tipo: 'teclado', nombre: 'Enlace "Saltar al contenido"',
      objetivo: 'Comprobar que el primer Tab muestra el enlace de salto y que al activarlo el siguiente Tab cae dentro del contenido principal (WCAG 2.4.1).',
      esperado: 'Primer foco = "Saltar al contenido", visible; tras Enter, el siguiente foco está dentro de <main> y no en la barra de navegación.',
      obtenido: `Primer foco: "${primero.nombre}" (${visibleSalto ? 'visible' : 'no visible'}); hash=${hash || '(vacío)'}; siguiente foco: "${trasSalto.nombre}" ${trasSalto.enMain ? 'dentro de <main>' : trasSalto.enNav ? 'en la navegación' : 'fuera de <main>'}.`,
      aprobado: /Saltar al contenido/.test(primero.nombre) && visibleSalto && trasSalto.enMain,
      evidencia: [imgSalto],
    });

    // ---------------------------------------------------------------- TEC-02 / TEC-03 orden de tabulación y foco visible (inicio)
    const recorrerTabs = async (ruta, maximo) => {
      await irA(page, ruta);
      await reiniciarFoco(page);
      const secuencia = [];
      for (let i = 0; i < maximo; i++) {
        await tab(page);
        const foco = await describirFoco(page);
        if (foco.tag === 'BODY') break;
        const ind = await indicadorFoco(page);
        secuencia.push({ orden: i + 1, ...foco, indicador: ind?.tipo ?? 'n/d', visible: ind?.visible ?? false });
        if (secuencia.length > 3 && secuencia[0].nombre === foco.nombre) break; // dio la vuelta
      }
      return secuencia;
    };

    const secInicio = await recorrerTabs('/', 30);
    const nombresInicio = secInicio.map((s) => s.nombre);
    const llegaNuevo = nombresInicio.some((n) => /Nuevo equipo/.test(n));
    // La tarjeta de equipo ya no tiene aria-label (WCAG 2.5.3): se identifica por data-testid
    const llegaEquipo = secInicio.some((s) => s.testid === 'tarjeta-equipo');
    const llegaBuscar = nombresInicio.some((n) => /Buscar equipo/i.test(n));
    const idxNav = secInicio.findIndex((s) => s.enNav);
    const idxMain = secInicio.findIndex((s) => s.enMain);
    await page.evaluate(() => document.querySelector('a[data-testid="tarjeta-equipo"]')?.focus({ focusVisible: true }));
    const imgOrden = await capturaTeclado(page, 'tec02-foco-tarjeta-equipo');
    registro.agregar({
      id: 'TEC-02', tipo: 'teclado', nombre: 'Orden de tabulación en "Mis equipos"',
      objetivo: 'Verificar que con Tab se alcanzan las acciones principales en un orden lógico (navegación → contenido) (WCAG 2.1.1, 2.4.3).',
      esperado: 'Se alcanzan "Nuevo equipo", el buscador y la tarjeta de equipo; la navegación aparece antes que el contenido.',
      obtenido: `${secInicio.length} paradas de foco. Nuevo equipo: ${llegaNuevo ? 'sí' : 'no'}; buscador: ${llegaBuscar ? 'sí' : 'no'}; tarjeta de equipo: ${llegaEquipo ? 'sí' : 'no'}; orden nav(${idxNav + 1}) → main(${idxMain + 1}). Secuencia: ${nombresInicio.slice(0, 12).join(' › ')}${nombresInicio.length > 12 ? ' › …' : ''}`,
      aprobado: llegaNuevo && llegaEquipo && idxNav >= 0 && idxMain > idxNav,
      evidencia: [imgOrden],
      detalle: secInicio,
    });

    const secTablero = await recorrerTabs(tablero, 45);
    const todas = [...secInicio.map((s) => ({ ...s, pagina: 'inicio' })), ...secTablero.map((s) => ({ ...s, pagina: 'tablero' }))];
    const sinIndicador = todas.filter((s) => !s.visible);
    await page.evaluate(() => document.querySelector('[aria-label^="Arrastrar tarea"]')?.focus({ focusVisible: true }));
    const imgFoco = await capturaTeclado(page, 'tec03-foco-visible-asa-tarea');
    registro.agregar({
      id: 'TEC-03', tipo: 'teclado', nombre: 'Foco visible en todos los elementos enfocables',
      objetivo: 'Comprobar con estilos calculados (outline / box-shadow / borde / fondo) que cada parada de foco muestra un indicador visible (WCAG 2.4.7).',
      esperado: '100 % de las paradas de foco con indicador visible distinto del estado sin foco.',
      obtenido: `${todas.length - sinIndicador.length}/${todas.length} paradas con indicador visible (inicio ${secInicio.length}, tablero ${secTablero.length}).` +
        (sinIndicador.length ? ` Sin indicador: ${[...new Set(sinIndicador.map((s) => `${s.pagina}: ${s.tag} "${s.nombre}"`))].slice(0, 6).join('; ')}` : ''),
      aprobado: sinIndicador.length === 0 && todas.length > 0,
      evidencia: [imgFoco, imgOrden],
      detalle: todas,
    });

    const secTabNombres = secTablero.map((s) => s.nombre);
    const ABRIR_DETALLE = 'Abrir detalle de tarea (data-testid="abrir-tarea")';
    const tabAcciones = ['Nueva tarea', 'Buscar tareas', 'Arrastrar tarea', ABRIR_DETALLE, 'Asignar miembros', 'Agregar tarea en'];
    const faltan = tabAcciones.filter((a) =>
      a === ABRIR_DETALLE ? !secTablero.some((s) => s.testid === 'abrir-tarea') : !secTabNombres.some((n) => n.includes(a)),
    );
    registro.agregar({
      id: 'TEC-04', tipo: 'teclado', nombre: 'Acciones del tablero alcanzables con Tab',
      objetivo: 'Verificar que todas las acciones del tablero (crear, buscar, arrastrar, abrir detalle, asignar, agregar en columna) son operables con teclado (WCAG 2.1.1).',
      esperado: `Se alcanzan: ${tabAcciones.join(', ')}.`,
      obtenido: faltan.length ? `No se alcanzaron en ${secTablero.length} tabulaciones: ${faltan.join(', ')}` : `Todas alcanzadas en ${secTablero.length} paradas de foco.`,
      aprobado: faltan.length === 0,
      evidencia: [imgFoco],
      detalle: secTablero.map((s) => s.nombre),
    });

    // ---------------------------------------------------------------- TEC-05 trampa de foco + Esc (crear tarea con atajo "n")
    await irA(page, tablero);
    await reiniciarFoco(page);
    await page.evaluate(() => document.querySelector('button[title^="Nueva tarea"]')?.focus());
    const disparador = await describirFoco(page);
    await page.keyboard.press('Enter');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
    await esperar(400);
    const focoInicial = await describirFoco(page);
    const fuera = [];
    for (let i = 0; i < 14; i++) {
      await tab(page);
      const f = await describirFoco(page);
      if (!f.enDialogo) fuera.push(f.nombre || f.tag);
    }
    for (let i = 0; i < 6; i++) {
      await tab(page, 1, true);
      const f = await describirFoco(page);
      if (!f.enDialogo) fuera.push(f.nombre || f.tag);
    }
    const imgModal = await capturaTeclado(page, 'tec05-modal-crear-tarea-foco');
    await page.keyboard.press('Escape');
    await esperar(400);
    const cerrado = await page.evaluate(() => !document.querySelector('[role="dialog"]'));
    const focoVuelto = await describirFoco(page);
    registro.agregar({
      id: 'TEC-05', tipo: 'teclado', nombre: 'Modal "Crear tarea": foco atrapado, Esc cierra y el foco vuelve',
      objetivo: 'Comprobar que el modal recibe el foco al abrirse, lo retiene con Tab/Shift+Tab, se cierra con Esc y devuelve el foco al botón que lo abrió (WCAG 2.1.2, 2.4.3).',
      esperado: 'Foco inicial dentro del diálogo; 20 tabulaciones sin salir; Esc cierra; foco vuelve a "Nueva tarea".',
      obtenido: `Foco inicial: "${focoInicial.nombre}" (${focoInicial.enDialogo ? 'dentro' : 'fuera'} del diálogo); salidas del diálogo: ${fuera.length}; Esc ${cerrado ? 'cierra' : 'NO cierra'}; foco tras cerrar: "${focoVuelto.nombre}".`,
      aprobado: focoInicial.enDialogo && fuera.length === 0 && cerrado && focoVuelto.nombre === disparador.nombre,
      evidencia: [imgModal],
    });

    // ---------------------------------------------------------------- TEC-06 detalle + confirmación con teclado
    await irA(page, tablero);
    await page.evaluate(() => document.querySelector('[data-testid="abrir-tarea"]')?.focus());
    await page.keyboard.press('Enter');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
    await esperar(300);
    const detalleAbierto = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')));
    // Llega a "Eliminar" con Tab dentro del diálogo
    let llegaEliminar = false;
    for (let i = 0; i < 15; i++) {
      await tab(page);
      const f = await describirFoco(page);
      if (/Eliminar/.test(f.nombre)) { llegaEliminar = true; break; }
    }
    if (llegaEliminar) await page.keyboard.press('Enter');
    await page.waitForSelector('[role="alertdialog"]', { timeout: 4000 }).catch(() => {});
    await esperar(300);
    const confirmAbierto = await page.evaluate(() => Boolean(document.querySelector('[role="alertdialog"]')));
    const focoConfirm = await describirFoco(page);
    const imgConfirm = await capturaTeclado(page, 'tec06-confirmacion-teclado');
    await page.keyboard.press('Escape');
    await esperar(400);
    const confirmCerrado = await page.evaluate(() => !document.querySelector('[role="alertdialog"]'));
    const tareasTras = await api.get(`/tareas?proyectoId=${e.proyecto.id}`, e.lider.token);
    // Cierra también el detalle si quedó abierto
    await page.keyboard.press('Escape');
    await esperar(300);
    registro.agregar({
      id: 'TEC-06', tipo: 'teclado', nombre: 'Detalle de tarea y confirmación de borrado con teclado',
      objetivo: 'Abrir el detalle con Enter, llegar a "Eliminar" con Tab, ver la confirmación y cancelarla con Esc sin borrar nada (prevención de errores operable con teclado).',
      esperado: 'Detalle abierto; confirmación (alertdialog) con foco dentro; Esc cancela; la tarea sigue existiendo (4 tareas).',
      obtenido: `Detalle: ${detalleAbierto ? 'abierto' : 'no abierto'}; "Eliminar" alcanzado: ${llegaEliminar ? 'sí' : 'no'}; confirmación: ${confirmAbierto ? 'abierta' : 'no'} (foco en "${focoConfirm.nombre}"); Esc ${confirmCerrado ? 'cancela' : 'no cierra'}; tareas en servidor: ${tareasTras.length}.`,
      aprobado: detalleAbierto && llegaEliminar && confirmAbierto && focoConfirm.enDialogo && confirmCerrado && tareasTras.length >= 4,
      evidencia: [imgConfirm],
    });

    // ---------------------------------------------------------------- TEC-07 arrastrar tarea con teclado
    await irA(page, tablero);
    const antes = await api.get(`/tareas?proyectoId=${e.proyecto.id}`, e.lider.token);
    const listaOrigen = e.listas[0].id;
    const candidata = antes.find((t) => (t.listaId ?? t.lista?.id) === listaOrigen);
    let movida = false;
    let detalleMov = 'no había tarea en la primera lista';
    let imgsMov = [];
    let anuncioLector = { anuncio: '', instrucciones: '' };
    if (candidata) {
      await page.evaluate((titulo) => {
        document.querySelector(`[aria-label="Arrastrar tarea ${titulo}"]`)?.focus();
      }, candidata.titulo);
      const foco = await describirFoco(page);
      imgsMov.push(await capturaTeclado(page, 'tec07a-asa-enfocada'));
      await page.keyboard.press('Space');
      await esperar(500);
      await page.keyboard.press('ArrowRight');
      await esperar(700);
      imgsMov.push(await capturaTeclado(page, 'tec07b-moviendo-con-flechas'));
      await page.keyboard.press('Space');
      await esperar(1500);
      imgsMov.push(await capturaTeclado(page, 'tec07c-tarea-soltada'));
      const despues = await api.get(`/tareas?proyectoId=${e.proyecto.id}`, e.lider.token);
      const t = despues.find((x) => x.id === candidata.id);
      const nuevaLista = t?.listaId ?? t?.lista?.id;
      movida = nuevaLista === e.listas[1].id;
      const aviso = await page.evaluate(() => [...document.querySelectorAll('[role="status"]')].map((n) => n.innerText.trim().replace(/\s+/g, ' ')).find((t) => /movida/.test(t)) ?? '');
      anuncioLector = await page.evaluate(() => {
        const vivo = document.querySelector('[id^="rfd-announcement"], [id*="announcement"]');
        const handle = document.querySelector('[data-rfd-drag-handle-draggable-id]');
        const instr = handle?.getAttribute('aria-describedby');
        return { anuncio: vivo?.textContent?.trim() ?? '', instrucciones: instr ? document.getElementById(instr)?.textContent?.trim() ?? '' : '' };
      });
      detalleMov = `Foco en "${foco.nombre}"; Espacio → Flecha derecha → Espacio; en el servidor la tarea pasó de "${e.listas[0].nombre}" a "${e.listas.find((l) => l.id === nuevaLista)?.nombre ?? nuevaLista}". Aviso visible: "${aviso}".`;
      // Devuelve la tarea a su lista para no alterar otros casos
      if (movida) await api.patch(`/tareas/${candidata.id}/mover`, { nuevaListaId: listaOrigen }, e.lider.token);
    }
    registro.agregar({
      id: 'TEC-07', tipo: 'teclado', nombre: 'Mover una tarea entre columnas solo con teclado',
      objetivo: 'Verificar la alternativa de teclado al arrastre: Espacio para levantar la tarjeta, flechas para moverla y Espacio para soltar (WCAG 2.1.1, 2.5.7).',
      esperado: `La tarea pasa de "${e.listas[0]?.nombre}" a "${e.listas[1]?.nombre}" y el cambio se guarda en el servidor.`,
      obtenido: detalleMov,
      aprobado: movida,
      evidencia: imgsMov,
    });

    // ---------------------------------------------------------------- TEC-11 idioma de los anuncios del arrastre para lectores de pantalla
    const ingles = /\b(press|space bar|drag|dropped|you have|lifted|moved)\b/i;
    const enIngles = ingles.test(anuncioLector.instrucciones) || ingles.test(anuncioLector.anuncio);
    const conUuid = /[0-9a-f]{8}-[0-9a-f]{4}-/.test(anuncioLector.anuncio);
    // El anuncio final debe nombrar la tarea y la columna destino (no identificadores internos)
    const anuncioUtil = Boolean(candidata) && anuncioLector.anuncio.includes(candidata.titulo) && anuncioLector.anuncio.includes(e.listas[1]?.nombre ?? '\u0000');
    registro.agregar({
      id: 'TEC-11', tipo: 'teclado', nombre: 'Instrucciones y anuncios del arrastre en español (lector de pantalla)',
      objetivo: 'Comprobar que las instrucciones de uso del asa de arrastre (aria-describedby) y los anuncios aria-live de la librería de arrastre están en el idioma de la página (WCAG 3.1.2 / 4.1.3).',
      esperado: 'Textos en español (p. ej. "Para mover la tarea con el teclado: pulsa Espacio…") y un anuncio final que nombra la tarea y la columna destino, sin identificadores internos.',
      obtenido: `Instrucciones: "${anuncioLector.instrucciones.replace(/\s+/g, ' ').slice(0, 140)}"; último anuncio: "${anuncioLector.anuncio.replace(/\s+/g, ' ').slice(0, 170)}"${conUuid ? ' (además expone identificadores UUID internos de las listas)' : ''}; el anuncio ${anuncioUtil ? 'nombra' : 'NO nombra'} la tarea y la columna destino.`,
      aprobado: Boolean(anuncioLector.instrucciones) && !enIngles && !conUuid && anuncioUtil,
      evidencia: imgsMov.slice(-1),
    });

    // ---------------------------------------------------------------- TEC-08 atajos de teclado
    await irA(page, tablero);
    await reiniciarFoco(page);
    await page.keyboard.press('/');
    await esperar(200);
    const focoBuscar = await describirFoco(page);
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('?');
    await page.waitForSelector('[role="dialog"]', { timeout: 3000 }).catch(() => {});
    const panel = await page.evaluate(() => document.querySelector('[role="dialog"] h2')?.innerText ?? '');
    const imgAtajos = await capturaTeclado(page, 'tec08-panel-atajos');
    await page.keyboard.press('Escape');
    await esperar(300);
    await page.keyboard.press('n');
    await page.waitForSelector('[role="dialog"]', { timeout: 3000 }).catch(() => {});
    const modalN = await page.evaluate(() => document.querySelector('[role="dialog"] h2')?.innerText ?? '');
    await page.keyboard.press('Escape');
    await esperar(300);
    await page.keyboard.press('h');
    await esperar(800);
    const rutaH = await page.evaluate(() => location.pathname);
    registro.agregar({
      id: 'TEC-08', tipo: 'teclado', nombre: 'Atajos de teclado (/, ?, n, h)',
      objetivo: 'Comprobar los aceleradores para usuarios expertos documentados en la Ayuda (heurística 7 de Nielsen).',
      esperado: '"/" enfoca la búsqueda; "?" abre el panel de atajos; "n" abre "Crear nueva tarea"; "h" navega a /ayuda.',
      obtenido: `"/" → foco en "${focoBuscar.nombre}"; "?" → "${panel || 'nada'}"; "n" → "${modalN || 'nada'}"; "h" → ${rutaH}.`,
      aprobado: /Buscar tareas/i.test(focoBuscar.nombre) && Boolean(panel) && /tarea/i.test(modalN) && rutaH === '/ayuda',
      evidencia: [imgAtajos],
    });

    // ---------------------------------------------------------------- TEC-09 login solo con teclado
    // Contexto aislado: no comparte localStorage con la sesión del líder de la otra pestaña
    const contexto2 = await navegador.createBrowserContext();
    const page2 = await contexto2.newPage();
    await page2.goto(`${CONFIG.web}/login`, { waitUntil: 'networkidle0' });
    await page2.evaluate(() => localStorage.clear());
    await page2.reload({ waitUntil: 'networkidle0' });
    await reiniciarFoco(page2);
    let pasos = 0;
    let llegoEmail = false;
    for (let i = 0; i < 6 && !llegoEmail; i++) {
      await tab(page2);
      pasos++;
      llegoEmail = await page2.evaluate(() => document.activeElement?.type === 'email');
    }
    await page2.keyboard.type(e.miembro.email);
    await tab(page2);
    pasos++;
    await page2.keyboard.type(CONFIG.password);
    await page2.keyboard.press('Enter');
    await page2.waitForFunction(() => location.pathname === '/', { timeout: 10000 }).catch(() => {});
    await esperar(800);
    const rutaLogin = await page2.evaluate(() => location.pathname);
    const titulo = await page2.title();
    const imgLogin = path.join(DIRS.teclado, 'tec09-login-teclado.png');
    await page2.screenshot({ path: imgLogin });
    await contexto2.close();
    registro.agregar({
      id: 'TEC-09', tipo: 'teclado', nombre: 'Iniciar sesión solo con teclado',
      objetivo: 'Completar el formulario de login usando Tab, escritura y Enter.',
      esperado: 'Se llega al campo de correo con Tab, Enter envía el formulario y se accede a "Mis equipos".',
      obtenido: `Campo de correo alcanzado en ${pasos - 1} Tab(s); tras Enter la ruta es ${rutaLogin} y el título de pestaña "${titulo}".`,
      aprobado: llegoEmail && rutaLogin === '/',
      evidencia: [rel(imgLogin)],
    });

    // ---------------------------------------------------------------- TEC-10 Esc en todas las ventanas
    const ventanas = [
      { nombre: 'Nuevo equipo', ruta: '/', abrir: (p) => pulsarBoton(p, 'Nuevo equipo') },
      { nombre: 'Invitar miembro', ruta: `/equipos/${e.equipo.id}`, abrir: (p) => pulsarBoton(p, 'Invitar') },
      { nombre: 'Nuevo proyecto', ruta: `/equipos/${e.equipo.id}`, abrir: (p) => pulsarBoton(p, 'Nuevo proyecto') },
      { nombre: 'Asignar miembros', ruta: tablero, abrir: (p) => pulsarBoton(p, 'Asignar miembros a la tarea') },
      { nombre: 'Detalle de tarea', ruta: tablero, abrir: (p) => p.click('[data-testid="abrir-tarea"]') },
      { nombre: 'Atajos', ruta: '/', abrir: (p) => pulsarBoton(p, 'Ver atajos de teclado') },
    ];
    const resultadosEsc = [];
    for (const v of ventanas) {
      try {
        await irA(page, v.ruta);
        await v.abrir(page);
        await page.waitForSelector('[role="dialog"]', { timeout: 4000 });
        await esperar(200);
        await page.keyboard.press('Escape');
        await esperar(400);
        const ok = await page.evaluate(() => !document.querySelector('[role="dialog"], [role="alertdialog"]'));
        resultadosEsc.push({ ventana: v.nombre, cierra: ok });
      } catch (err) {
        resultadosEsc.push({ ventana: v.nombre, cierra: false, error: err.message });
      }
    }
    const noCierran = resultadosEsc.filter((r) => !r.cierra);
    registro.agregar({
      id: 'TEC-10', tipo: 'teclado', nombre: 'Esc cierra todas las ventanas modales',
      objetivo: 'Verificar el "control y libertad del usuario": cualquier ventana se puede abandonar con Esc.',
      esperado: `Las ${ventanas.length} ventanas (${ventanas.map((v) => v.nombre).join(', ')}) se cierran con Esc.`,
      obtenido: noCierran.length ? `No se cerraron: ${noCierran.map((r) => `${r.ventana}${r.error ? ` (${r.error})` : ''}`).join(', ')}` : `Las ${ventanas.length} ventanas se cierran con Esc.`,
      aprobado: noCierran.length === 0,
      evidencia: [],
      detalle: resultadosEsc,
    });
  } finally {
    await navegador.close();
  }
  registro.guardar();
  return registro;
}
