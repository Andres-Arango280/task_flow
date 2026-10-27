// Recorrido de usuario completo por la interfaz (sin atajos de API):
// registrarse → iniciar sesión → crear equipo → invitar → crear proyecto → crear tarea → mover tarea.
// Se cuentan las acciones del usuario (clics, campos rellenados, teclas) y el tiempo de cada tarea.
import path from 'node:path';
import { CONFIG, DIRS, rel, esperar, lanzarNavegador, api, crearUsuario, Registro, pulsarBoton } from './comun.js';

/** Escribe en el campo asociado a la etiqueta visible (getByLabel). */
async function escribir(page, etiqueta, valor, ambito = 'body') {
  const campo = await page.evaluateHandle(
    (et, amb) => {
      const raiz = [...document.querySelectorAll(amb)].pop() ?? document.body;
      const label = [...raiz.querySelectorAll('label')].find((l) => l.textContent.replace(/\*|\(obligatorio\)/g, '').trim().startsWith(et));
      return label?.control ?? null;
    },
    etiqueta,
    ambito,
  );
  const el = campo.asElement();
  if (!el) throw new Error(`No se encontró el campo "${etiqueta}"`);
  await el.click({ clickCount: 3 });
  await el.type(valor, { delay: 5 });
}

async function esperarTexto(page, texto, timeout = 8000) {
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, texto);
}

export async function correrRecorrido() {
  console.log('\n== Recorrido de usuario ==');
  const registro = new Registro('recorrido');
  const navegador = await lanzarNavegador();
  const marca = Date.now();
  const nuevo = { nombre: 'Rocío Recorrido', email: `recorrido.${marca}@taskflow-qa.test`, password: CONFIG.password };
  const companero = await crearUsuario('recorrido.companero', 'Carlos Compañero');
  const nombres = { equipo: `Equipo Recorrido ${marca % 100000}`, proyecto: 'Proyecto Lanzamiento', tarea: 'Preparar presentación' };
  const resumen = [];
  let n = 0;
  const contexto = { equipoId: null, proyectoId: null };

  const page = await navegador.newPage();
  await page.goto(`${CONFIG.web}/login`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());

  const paso = async (nombre, objetivo, esperado, fn) => {
    n += 1;
    const id = `RUT-${String(n).padStart(2, '0')}`;
    const t0 = Date.now();
    const acciones = { n: 0 };
    let ok = false;
    let obtenido = '';
    const evid = [];
    try {
      obtenido = await fn(acciones);
      ok = true;
    } catch (err) {
      obtenido = `Falló: ${err.message.split('\n')[0]}`;
    }
    const archivo = path.join(DIRS.recorrido, `${id.toLowerCase()}-${nombre.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-').replace(/-+$/, '')}.png`);
    await page.screenshot({ path: archivo, fullPage: false }).catch(() => {});
    evid.push(rel(archivo));
    const segundos = +((Date.now() - t0) / 1000).toFixed(1);
    resumen.push({ id, tarea: nombre, exito: ok, acciones: acciones.n, segundos });
    registro.agregar({
      id, tipo: 'recorrido', nombre: `Recorrido: ${nombre}`, objetivo, esperado,
      obtenido: `${ok ? 'Completado' : 'No completado'} en ${acciones.n} acciones de usuario y ${segundos} s. ${obtenido}`,
      aprobado: ok, evidencia: evid,
    });
    return ok;
  };

  try {
    await paso('Registrarse', 'Crear una cuenta nueva desde /register.', 'Tras enviar, se llega a /login con el aviso "Cuenta creada correctamente" y el correo ya escrito.', async (a) => {
      await page.goto(`${CONFIG.web}/register`, { waitUntil: 'networkidle0' });
      await escribir(page, 'Nombre completo', nuevo.nombre); a.n++;
      await escribir(page, 'Correo electrónico', nuevo.email); a.n++;
      await escribir(page, 'Contraseña', nuevo.password); a.n++;
      await escribir(page, 'Confirmar contraseña', nuevo.password); a.n++;
      await pulsarBoton(page, 'Crear cuenta'); a.n++;
      await page.waitForFunction(() => location.pathname === '/login', { timeout: 10000 });
      await esperarTexto(page, 'Cuenta creada correctamente');
      const correo = await page.$eval('input[type="email"]', (i) => i.value);
      return `Ruta /login, aviso de éxito visible y correo precargado: ${correo === nuevo.email ? 'sí' : 'no'}.`;
    });

    await paso('Iniciar sesión', 'Entrar con la cuenta recién creada.', 'Se accede a "Mis equipos" con la guía de primeros pasos (0 de 4).', async (a) => {
      await escribir(page, 'Contraseña', nuevo.password); a.n++;
      await pulsarBoton(page, 'Iniciar sesión'); a.n++;
      await page.waitForFunction(() => location.pathname === '/', { timeout: 10000 });
      await esperarTexto(page, 'Primeros pasos');
      const progreso = await page.evaluate(() => (document.body.innerText.match(/\d de 4 completados/) || [''])[0]);
      return `Título de pestaña "${await page.title()}"; guía: "${progreso}".`;
    });

    await paso('Crear equipo', 'Crear el primer equipo desde el inicio.', 'El equipo aparece en la lista y un aviso confirma la creación con acceso directo "Abrir equipo".', async (a) => {
      await pulsarBoton(page, 'Nuevo equipo'); a.n++;
      await escribir(page, 'Nombre del equipo', nombres.equipo, '[role="dialog"]'); a.n++;
      await pulsarBoton(page, 'Crear equipo', '[role="dialog"]'); a.n++;
      await esperarTexto(page, 'Abrir equipo');
      await pulsarBoton(page, 'Abrir equipo'); a.n++;
      await page.waitForFunction(() => location.pathname.startsWith('/equipos/'), { timeout: 8000 });
      contexto.equipoId = await page.evaluate(() => location.pathname.split('/').pop());
      await esperar(600);
      return `Aviso con acción "Abrir equipo" mostrado; abierta la vista del equipo (título "${await page.title()}").`;
    });

    await paso('Invitar compañero', 'Añadir a un compañero registrado buscándolo por correo.', 'Se encuentra al usuario, se añade y aparece en la lista de miembros.', async (a) => {
      await pulsarBoton(page, 'Invitar'); a.n++;
      await escribir(page, 'Correo electrónico', companero.email, '[role="dialog"]'); a.n++;
      await pulsarBoton(page, 'Buscar', '[role="dialog"]'); a.n++;
      await esperarTexto(page, companero.nombre);
      await pulsarBoton(page, 'Añadir al equipo', '[role="dialog"]'); a.n++;
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 8000 });
      await esperar(800);
      const visible = await page.evaluate((nom) => document.body.innerText.includes(nom), companero.nombre);
      const equipo = await api.get(`/equipos/${contexto.equipoId}`, (await api.post('/auth/login', { email: nuevo.email, password: nuevo.password })).access_token);
      const enServidor = (equipo.miembros ?? []).some((m) => m.id === companero.id);
      if (!visible || !enServidor) throw new Error(`miembro visible=${visible}, en servidor=${enServidor}`);
      return 'Compañero visible en la lista de miembros y guardado en el servidor.';
    });

    await paso('Crear proyecto', 'Crear un proyecto dentro del equipo y abrir su tablero.', 'El proyecto aparece y al abrirlo se ve el tablero con las columnas Por Hacer / En Progreso / Hecho.', async (a) => {
      await pulsarBoton(page, 'Nuevo proyecto'); a.n++;
      await escribir(page, 'Nombre del proyecto', nombres.proyecto, '[role="dialog"]'); a.n++;
      await pulsarBoton(page, 'Crear proyecto', '[role="dialog"]'); a.n++;
      await esperarTexto(page, nombres.proyecto);
      await esperar(500);
      // Tarjeta de proyecto: data-testid="tarjeta-proyecto" + nombre visible (sin aria-label, WCAG 2.5.3)
      await page.waitForFunction((t) => [...document.querySelectorAll('a[data-testid="tarjeta-proyecto"]')].some((l) => l.innerText.split('\n')[0].trim() === t), { timeout: 8000 }, nombres.proyecto);
      await page.evaluate((t) => {
        const enlace = [...document.querySelectorAll('a[data-testid="tarjeta-proyecto"]')].find((l) => l.innerText.split('\n')[0].trim() === t);
        enlace.scrollIntoView({ block: 'center' });
        enlace.click();
      }, nombres.proyecto); a.n++;
      await page.waitForFunction(() => location.pathname.startsWith('/proyectos/'), { timeout: 8000 });
      contexto.proyectoId = await page.evaluate(() => location.pathname.split('/').pop());
      await page.waitForSelector('[aria-label="Columnas del tablero"]', { timeout: 8000 });
      await esperar(600);
      const columnas = await page.$$eval('[aria-label="Columnas del tablero"] h2, [aria-label="Columnas del tablero"] h3', (h) => h.map((x) => x.innerText.trim()));
      const migas = await page.evaluate(() => document.querySelector('nav[aria-label*="igas"], nav[aria-label*="ruta"], nav[aria-label*="Ruta"]')?.innerText.replace(/\s+/g, ' ') ?? '');
      return `Tablero abierto. Columnas: ${columnas.join(' / ')}. Migas: "${migas}".`;
    });

    await paso('Crear tarea', 'Crear una tarea en el tablero.', 'La tarjeta aparece en "Por Hacer" y un aviso confirma la creación.', async (a) => {
      await pulsarBoton(page, 'Nueva tarea'); a.n++;
      await escribir(page, 'Título', nombres.tarea, '[role="dialog"]'); a.n++;
      await pulsarBoton(page, 'Crear tarea', '[role="dialog"]'); a.n++;
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 8000 });
      await esperarTexto(page, nombres.tarea);
      const aviso = await page.evaluate(() => [...document.querySelectorAll('[role="status"]')].map((x) => x.innerText.replace(/\s+/g, ' ')).find((t) => /creada/.test(t)) ?? '');
      return `Tarjeta visible. Aviso: "${aviso.trim()}".`;
    });

    await paso('Mover tarea con el ratón', 'Arrastrar la tarjeta de "Por Hacer" a "Hecho" con el ratón.', 'La tarea queda en "Hecho", el progreso pasa a 100 % y se ofrece "Deshacer".', async (a) => {
      const handle = await page.$(`[aria-label="Arrastrar tarea ${nombres.tarea}"]`);
      const columnas = await page.$$('[data-rfd-droppable-id]');
      const destino = columnas[columnas.length - 1];
      const h = await handle.boundingBox();
      const d = await destino.boundingBox();
      await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
      await page.mouse.down();
      // Movimiento progresivo para que la librería detecte el arrastre
      for (let i = 1; i <= 25; i++) {
        await page.mouse.move(h.x + ((d.x + d.width / 2 - h.x) * i) / 25, h.y + ((d.y + 60 - h.y) * i) / 25);
        await esperar(20);
      }
      await esperar(300);
      await page.mouse.up(); a.n++;
      await esperar(1500);
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      const listas = await api.get(`/listas/proyecto/${contexto.proyectoId}`, token);
      const tareas = await api.get(`/tareas?proyectoId=${contexto.proyectoId}`, token);
      const t = tareas.find((x) => x.titulo === nombres.tarea);
      const lista = listas.find((l) => l.id === (t?.listaId ?? t?.lista?.id));
      const progreso = await page.evaluate(() => document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuetext') ?? '');
      const deshacer = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.innerText.trim() === 'Deshacer'));
      if (!/Hecho/i.test(lista?.nombre ?? '')) throw new Error(`la tarea está en "${lista?.nombre}"`);
      return `En el servidor la tarea está en "${lista.nombre}". Progreso: "${progreso}". Botón "Deshacer": ${deshacer ? 'sí' : 'no'}.`;
    });

    await paso('Deshacer el movimiento', 'Usar "Deshacer" del aviso para revertir el último movimiento (control y libertad del usuario).', 'La tarea vuelve a "Por Hacer".', async (a) => {
      await pulsarBoton(page, 'Deshacer'); a.n++;
      await esperar(1500);
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      const listas = await api.get(`/listas/proyecto/${contexto.proyectoId}`, token);
      const tareas = await api.get(`/tareas?proyectoId=${contexto.proyectoId}`, token);
      const t = tareas.find((x) => x.titulo === nombres.tarea);
      const lista = listas.find((l) => l.id === (t?.listaId ?? t?.lista?.id));
      if (!/Por Hacer/i.test(lista?.nombre ?? '')) throw new Error(`la tarea está en "${lista?.nombre}"`);
      return `La tarea volvió a "${lista.nombre}".`;
    });

    await paso('Recargar sin perder la sesión', 'Recargar el tablero (F5) y comprobar que no se vuelve al login (problema del estado anterior).', 'Tras recargar, se sigue en el mismo tablero.', async (a) => {
      await page.reload({ waitUntil: 'networkidle0' }); a.n++;
      await esperar(800);
      const ruta = await page.evaluate(() => location.pathname);
      if (!ruta.startsWith('/proyectos/')) throw new Error(`tras recargar la ruta es ${ruta}`);
      return `Ruta tras recargar: ${ruta}; título "${await page.title()}".`;
    });
  } catch (err) {
    console.error(err);
  }

  const exitos = resumen.filter((r) => r.exito).length;
  const acciones = resumen.reduce((s, r) => s + r.acciones, 0);
  const segundos = resumen.reduce((s, r) => s + r.segundos, 0);
  registro.agregar({
    id: `RUT-${String(++n).padStart(2, '0')}`, tipo: 'recorrido', nombre: 'Recorrido completo registrarse → mover tarea',
    objetivo: 'Medir la tasa de éxito y el esfuerzo (acciones) del recorrido principal de un usuario nuevo.',
    esperado: `100 % de las ${resumen.length} tareas completadas sin ayuda externa.`,
    obtenido: `Éxito ${exitos}/${resumen.length} (${Math.round((exitos / resumen.length) * 100)} %); ${acciones} acciones de usuario; ${segundos.toFixed(1)} s de ejecución automatizada.`,
    aprobado: exitos === resumen.length,
    evidencia: [],
    detalle: resumen,
  });
  // ================================================================ Casos de UX complementarios (heurísticas)
  const renovarSesion = async () => {
    const { access_token } = await api.post('/auth/login', { email: nuevo.email, password: nuevo.password });
    const yo = await api.get('/usuarios/me', access_token);
    await page.goto(`${CONFIG.web}/login`, { waitUntil: 'networkidle0' }).catch(() => {});
    await page.evaluate((t, us) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('user', JSON.stringify(us));
    }, access_token, { id: yo.id, nombre: yo.nombre, email: yo.email });
    await esperar(1000);
  };
  let u = 0;
  const caso = async ({ tipo = 'recorrido', nombre, objetivo, esperado, pagina = page }, fn) => {
    const id = `UX-${String(++u).padStart(2, '0')}`;
    let ok = false;
    let obtenido = '';
    const evid = [];
    for (let intento = 1; intento <= 2; intento++) {
      try {
        const r = await fn(evid);
        ok = r.ok;
        obtenido = r.obtenido + (intento > 1 ? ' (superado en el 2.º intento tras una recarga ajena a la prueba)' : '');
        break;
      } catch (err) {
        obtenido = `Error durante la prueba: ${err.message.split('\n')[0]}`;
        // Recarga/redirección provocada por el entorno compartido (reinicio del backend o HMR de Vite): se repite una vez
        if (intento === 1 && /context was destroyed|same JavaScript world|Waiting for selector|detached|Target closed/i.test(err.message)) {
          console.log(`    (aviso) ${id}: ${err.message.split('\n')[0]}; se repite con la sesión renovada`);
          if (pagina === page) await renovarSesion();
          continue;
        }
        break;
      }
    }
    if (pagina && !pagina.isClosed()) {
      const archivo = path.join(DIRS.recorrido, `${id.toLowerCase()}.png`);
      await pagina.screenshot({ path: archivo }).catch(() => {});
      evid.push(rel(archivo));
    }
    registro.agregar({ id, tipo, nombre, objetivo, esperado, obtenido, aprobado: ok, evidencia: evid });
  };

  try {
    const tableroNuevo = contexto.proyectoId ? `/proyectos/${contexto.proyectoId}` : '/';

    await caso({
      nombre: 'Sin conexión: aviso, error con código y borrador conservado',
      objetivo: 'Simular la pérdida de red en el tablero e intentar crear una tarea (heurísticas 1 y 9; antes los errores solo iban a la consola).',
      esperado: 'Banner "Sin conexión"; al crear, aviso de error en español con código TF-RED; el texto escrito se conserva como borrador al volver la conexión.',
    }, async (evid) => {
      await page.goto(`${CONFIG.web}${tableroNuevo}`, { waitUntil: 'networkidle0' });
      await esperar(600);
      await page.setOfflineMode(true);
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));
      await esperar(400);
      const banner = await page.evaluate(() => [...document.querySelectorAll('[role="alert"]')].map((x) => x.innerText).find((t) => /Sin conexión/.test(t)) ?? '');
      await pulsarBoton(page, 'Nueva tarea');
      await escribir(page, 'Título', 'Tarea escrita sin conexión', '[role="dialog"]');
      await pulsarBoton(page, 'Crear tarea', '[role="dialog"]');
      await esperar(1500);
      const toast = await page.evaluate(() => document.body.innerText.match(/[^\n]*No se pudo crear la tarea[^\n]*(\n[^\n]*){0,3}/)?.[0]?.replace(/\s+/g, ' ') ?? '');
      const archivo = path.join(DIRS.recorrido, 'ux-sin-conexion-error.png');
      await page.screenshot({ path: archivo });
      evid.push(rel(archivo));
      await page.setOfflineMode(false);
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await page.keyboard.press('Escape');
      await esperar(400);
      await pulsarBoton(page, 'Nueva tarea');
      const borrador = await page.evaluate(() => document.querySelector('[role="dialog"] input')?.value ?? '');
      await page.keyboard.press('Escape');
      await esperar(300);
      const ok = Boolean(banner) && /TF-RED/.test(toast) && borrador === 'Tarea escrita sin conexión';
      return { ok, obtenido: `Banner: "${banner.slice(0, 60)}…"; aviso: "${toast.slice(0, 160)}"; borrador tras reabrir: "${borrador}".` };
    });

    await caso({
      nombre: 'Búsqueda de tareas tolerante a errores de escritura',
      objetivo: 'Comprobar que el buscador del tablero encuentra tareas aunque se escriba sin tildes o con una errata (heurística 6, antes no había búsqueda).',
      esperado: '"presentasion" encuentra "Preparar presentación"; un término inexistente no muestra tareas y explica el estado vacío.',
    }, async () => {
      await page.goto(`${CONFIG.web}${tableroNuevo}`, { waitUntil: 'networkidle0' });
      await esperar(500);
      const buscar = await page.$('#buscar-tareas');
      await buscar.type('presentasion');
      await esperar(500);
      const encontrada = await page.evaluate((t) => Boolean([...document.querySelectorAll('[data-testid="abrir-tarea"]')].some((b) => b.querySelector('span')?.textContent?.trim() === t)), nombres.tarea);
      const estado1 = await page.evaluate(() => document.body.innerText.match(/Mostrando \d+ de \d+ tareas/)?.[0] ?? '');
      await buscar.click({ clickCount: 3 });
      await buscar.type('zzqqxx');
      await esperar(500);
      const estado2 = await page.evaluate(() => document.body.innerText.match(/Mostrando \d+ de \d+ tareas/)?.[0] ?? '');
      const ninguna = await page.evaluate(() => !document.querySelector('[data-testid="abrir-tarea"]'));
      await buscar.click({ clickCount: 3 });
      await buscar.type('presentasion');
      await esperar(300);
      return { ok: encontrada && ninguna, obtenido: `"presentasion" → ${encontrada ? 'encuentra la tarea' : 'no la encuentra'} (${estado1}); "zzqqxx" → ${ninguna ? '0 resultados' : 'muestra tareas'} (${estado2}).` };
    });

    await caso({
      nombre: 'Ayuda: buscador de preguntas frecuentes',
      objetivo: 'Verificar que la ayuda responde a una duda escrita con palabras del usuario y sin tildes (heurística 10; antes no existía ayuda).',
      esperado: 'La consulta "como muevo una tarea" muestra al menos una respuesta sobre mover tareas.',
    }, async () => {
      await page.goto(`${CONFIG.web}/ayuda`, { waitUntil: 'networkidle0' });
      await page.type('#buscar-ayuda', 'como muevo una tarea');
      await esperar(500);
      const preguntas = await page.$$eval('details summary', (s) => s.map((x) => x.innerText.trim()));
      const ok = preguntas.some((p) => /mov|muev/i.test(p));
      return { ok, obtenido: `${preguntas.length} respuesta(s): ${preguntas.slice(0, 3).map((p) => `"${p}"`).join(', ')}.` };
    });

    await caso({
      nombre: 'Confirmación antes de cerrar sesión',
      objetivo: 'Comprobar que "Salir" pide confirmación y que cancelar mantiene la sesión (heurística 5).',
      esperado: 'Aparece un diálogo "¿Cerrar sesión?"; al cancelar se sigue en la misma página con sesión.',
    }, async (evid) => {
      await page.goto(`${CONFIG.web}/`, { waitUntil: 'networkidle0' });
      await pulsarBoton(page, 'Salir');
      await page.waitForSelector('[role="alertdialog"], [role="dialog"]', { timeout: 4000 });
      const titulo = await page.$eval('[role="alertdialog"] h2, [role="dialog"] h2', (h) => h.innerText);
      const archivo = path.join(DIRS.recorrido, 'ux-confirmar-salir.png');
      await page.screenshot({ path: archivo });
      evid.push(rel(archivo));
      await pulsarBoton(page, 'Cancelar', '[role="alertdialog"], [role="dialog"]');
      await esperar(400);
      const sigue = await page.evaluate(() => location.pathname === '/' && Boolean(localStorage.getItem('access_token')));
      return { ok: /Cerrar sesión/i.test(titulo) && sigue, obtenido: `Diálogo: "${titulo}"; tras cancelar la sesión ${sigue ? 'se mantiene' : 'se perdió'}.` };
    });

    await caso({
      tipo: 'visual',
      nombre: 'Título de pestaña distinto en cada página',
      objetivo: 'Comprobar que el título del documento identifica la página (WCAG 2.4.2; antes siempre "taskflow-frontend").',
      esperado: 'Cada página tiene un título único con el formato "<sección> · TaskFlow".',
    }, async () => {
      const rutas = ['/', `/equipos/${contexto.equipoId}`, tableroNuevo, '/ayuda', '/preferencias', '/privacidad'];
      const titulos = [];
      for (const r of rutas) {
        await page.goto(`${CONFIG.web}${r}`, { waitUntil: 'networkidle0' });
        await page.waitForFunction(() => !/^Cargando/.test(document.title), { timeout: 8000 }).catch(() => {});
        await esperar(400);
        titulos.push(await page.title());
      }
      const unicos = new Set(titulos);
      const ok = unicos.size === titulos.length && titulos.every((t) => /· TaskFlow$/.test(t) && !/taskflow-frontend/.test(t));
      return { ok, obtenido: titulos.map((t) => `"${t}"`).join(', ') };
    });

    await caso({
      tipo: 'visual',
      nombre: 'Columnas del tablero diferenciadas por color',
      objetivo: 'Verificar que "Por Hacer", "En Progreso" y "Hecho" tienen colores distintos (antes "Por Hacer" y "Hecho" compartían color).',
      esperado: '3 colores de fondo de columna distintos.',
    }, async () => {
      await page.goto(`${CONFIG.web}${tableroNuevo}`, { waitUntil: 'networkidle0' });
      await esperar(500);
      const colores = await page.evaluate(() => {
        const res = [];
        for (const d of document.querySelectorAll('[data-rfd-droppable-id]')) {
          // Sube hasta el contenedor de la columna (el que tiene el encabezado)
          let c = d.parentElement;
          while (c && !c.querySelector('h2, h3')) c = c.parentElement;
          if (!c) continue;
          let fondo = getComputedStyle(c).backgroundColor;
          let x = c;
          while (fondo === 'rgba(0, 0, 0, 0)' && x.parentElement) { x = x.parentElement; fondo = getComputedStyle(x).backgroundColor; }
          res.push({ columna: c.querySelector('h2, h3').innerText.trim(), fondo, zona: getComputedStyle(d).backgroundColor });
        }
        return res;
      });
      const distintos = new Set(colores.map((c) => `${c.fondo}|${c.zona}`)).size;
      return { ok: colores.length >= 3 && distintos === colores.length, obtenido: colores.map((c) => `${c.columna}: ${c.fondo}`).join(' · ') };
    });

    // Bloqueo tras 5 intentos: usuario desechable en un contexto aislado
    const victima = await crearUsuario('recorrido.bloqueo', 'Bea Bloqueo');
    const ctx = await navegador.createBrowserContext();
    const pb = await ctx.newPage();
    await caso({
      pagina: pb,
      nombre: 'Bloqueo de inicio de sesión tras 5 intentos explica qué hacer',
      objetivo: 'Comprobar que, tras 5 contraseñas incorrectas, el mensaje explica el bloqueo y cuánto esperar, en español y con código (heurística 9).',
      esperado: 'Intentos 1-5: "El correo o la contraseña no son correctos…"; intento 6: "Demasiados intentos fallidos… espera N minuto(s)" con código TF-429.',
    }, async () => {
      await pb.goto(`${CONFIG.web}/login`, { waitUntil: 'networkidle0' });
      const mensajes = [];
      for (let i = 1; i <= 6; i++) {
        await escribir(pb, 'Correo electrónico', victima.email);
        await escribir(pb, 'Contraseña', `incorrecta${i}`);
        await pulsarBoton(pb, 'Iniciar sesión');
        await pb.waitForSelector('[role="alert"]', { timeout: 5000 });
        await esperar(500);
        mensajes.push(await pb.$eval('[role="alert"]', (a) => a.innerText.replace(/\s+/g, ' ').trim()));
      }
      const ok = /no son correctos/.test(mensajes[0]) && /Demasiados intentos/.test(mensajes[5]) && /TF-429/.test(mensajes[5]);
      return { ok, obtenido: `Intento 1: "${mensajes[0]}". Intento 6: "${mensajes[5]}".` };
    });
    await ctx.close();

    await caso({
      pagina: null,
      nombre: 'Mensajes de validación del servidor en español',
      objetivo: 'Enviar datos inválidos directamente a la API (como haría un cliente sin validación previa) y comprobar el idioma de los mensajes (antes llegaban en inglés: "email must be an email").',
      esperado: 'Todos los mensajes de validación en español, sin textos de class-validator en inglés.',
    }, async () => {
      const res = await fetch(`${CONFIG.api}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: '', email: 'no-es-correo', password: '1' }) });
      const cuerpo = await res.json();
      const msgs = Array.isArray(cuerpo.message) ? cuerpo.message : [cuerpo.message];
      const ingles = msgs.filter((m) => /\b(must|should|be an|longer|shorter|empty|not be)\b/i.test(m));
      return { ok: res.status === 400 && ingles.length === 0, obtenido: `HTTP ${res.status}: ${msgs.map((m) => `"${m}"`).join(', ')}` };
    });
  } finally {
    await navegador.close();
  }

  registro.extra = { recorrido: resumen, usuario: nuevo.email };
  registro.guardar();
  return registro;
}
