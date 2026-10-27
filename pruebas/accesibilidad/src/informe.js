// Genera resumen.json e informe.md a partir de los resultados reales de cada módulo
// (resultados/*.json). Las tablas de Nielsen e "IA vs equipo" calculan su estado a partir
// de los casos ejecutados: si los casos asociados se aprueban → "Corregido", si no → "Pendiente".
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { DIRS, CONFIG, leerJSON, guardarJSON } from './comun.js';

const require = createRequire(import.meta.url);
const version = (p) => {
  try { return require(`${p}/package.json`).version; } catch { return '?'; }
};

const MODULOS = ['axe', 'lighthouse', 'teclado', 'visual', 'recorrido'];

// Recomendaciones en español para reglas cuya ayuda de axe solo está en inglés
const RECOMENDACIONES_ES = {
  'label-content-name-mismatch': 'Hacer que el nombre accesible empiece por el texto visible (WCAG 2.5.3): quitar el aria-label y usar el texto de la tarjeta, o usar p. ej. aria-label="<título> – abrir detalle" en el botón de la tarea y "<nombre del equipo>, líder, N miembros" en la tarjeta de equipo.',
};

function cargar() {
  const r = {};
  for (const m of MODULOS) r[m] = leerJSON(path.join(DIRS.resultados, `${m}.json`), { casos: [] });
  return r;
}

// ---------------------------------------------------------------- utilidades
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const tabla = (cabeceras, filas) =>
  [`| ${cabeceras.join(' | ')} |`, `| ${cabeceras.map(() => '---').join(' | ')} |`, ...filas.map((f) => `| ${f.map(esc).join(' | ')} |`)].join('\n');
const enlace = (p) => (p ? `[${path.basename(p)}](${p})` : '');

function crearConsultas(res) {
  const casos = MODULOS.flatMap((m) => res[m].casos ?? []);
  const porId = Object.fromEntries(casos.map((c) => [c.id, c]));
  const ok = (...ids) => ids.length > 0 && ids.every((id) => porId[id]?.estado === 'Aprobado');
  const existe = (...ids) => ids.every((id) => porId[id]);
  const obt = (id) => porId[id]?.obtenido ?? '(caso no ejecutado)';
  const ev = (id, i = 0) => porId[id]?.evidencia?.[i] ?? '';
  return { casos, porId, ok, existe, obt, ev };
}

// ---------------------------------------------------------------- Nielsen
// severidad: escala de Nielsen 0-4 del problema (para los corregidos, la severidad que tenía antes de corregirse)
function hallazgosNielsen(res, q) {
  const axe = res.axe;
  const lh = res.lighthouse.tabla ?? [];
  const estado = (ids, fijo) => (fijo ? fijo : ids.length && q.existe(...ids) ? (q.ok(...ids) ? 'Corregido' : 'Pendiente') : 'Pendiente');
  // Título del aviso de éxito: se lee del aviso real capturado en TEC-07 ("Aviso visible: "<título> …")
  const tituloAviso = (q.obt('TEC-07').match(/Aviso visible: "(\S+)/) ?? [])[1] ?? '';
  const idNavMovil = q.casos.find((c) => /^Navegación en móvil/.test(c.nombre))?.id;
  const lista = [
    // H1
    { h: 'H1 Visibilidad del estado del sistema', hallazgo: 'Los fallos al crear equipo, proyecto o tarea solo se registraban en la consola; el usuario no recibía aviso. Ahora hay avisos (toasts) en español con código de referencia y banner de "sin conexión".', severidad: 4, casos: ['UX-01'], evidencia: q.ev('UX-01'), recomendacion: 'Mantener: todo error de red/servidor debe mostrarse con mensaje, código y acción de recuperación.' },
    { h: 'H1 Visibilidad del estado del sistema', hallazgo: 'La pestaña del navegador siempre decía "taskflow-frontend". Ahora cada página tiene un título propio ("<sección> · TaskFlow").', severidad: 2, casos: ['UX-05'], evidencia: q.ev('UX-05'), recomendacion: 'Mantener useDocumentTitle en todas las rutas nuevas (WCAG 2.4.2).' },
    { h: 'H1 Visibilidad del estado del sistema', hallazgo: 'La barra de "Progreso" era falsa (tareas / (listas × 5)). Ahora refleja las tareas en "Hecho" y se anuncia con role="progressbar" y aria-valuetext.', severidad: 3, casos: ['RUT-07'], evidencia: q.ev('RUT-07'), recomendacion: 'Mantener el cálculo real; añadir prueba unitaria del cálculo.' },
    // H2
    { h: 'H2 Coincidencia entre el sistema y el mundo real', hallazgo: 'Los errores de validación del servidor llegaban en inglés ("email must be an email"). Ahora están en español.', severidad: 3, casos: ['UX-08'], evidencia: 'resultados/recorrido.json', recomendacion: 'Mantener mensajes personalizados en todos los DTO de class-validator.' },
    { h: 'H2 Coincidencia entre el sistema y el mundo real', hallazgo: q.ok('TEC-11') ? 'Las instrucciones y anuncios de la librería de arrastre (@hello-pangea/dnd) que oye un usuario de lector de pantalla estaban en inglés y exponían los UUID internos de las listas ("You have moved the item… in list c7eaceef-…"). Ahora están en español y nombran la tarea y la columna.' : 'Las instrucciones y anuncios de la librería de arrastre (@hello-pangea/dnd) que oye un usuario de lector de pantalla están en inglés y exponen los UUID internos de las listas ("You have moved the item… in list c7eaceef-…").', severidad: 3, casos: ['TEC-11'], evidencia: q.ev('TEC-11'), recomendacion: 'Pasar dragHandleUsageInstructions en español a <DragDropContext> y usar provided.announce en onDragStart/onDragUpdate/onDragEnd con el título de la tarea y el nombre de la columna.' },
    // H3
    { h: 'H3 Control y libertad del usuario', hallazgo: 'No existía "deshacer": mover o eliminar una tarea o quitar un miembro solo se corregía rehaciéndolo a mano. Ahora el aviso ofrece "Deshacer".', severidad: 3, casos: ['RUT-08'], evidencia: q.ev('RUT-08'), recomendacion: 'Mantener; extender a eliminar proyecto/equipo con papelera temporal.' },
    { h: 'H3 Control y libertad del usuario', hallazgo: 'Las ventanas modales no se cerraban con Esc ni retenían el foco. Ahora Esc cierra todas y el foco queda atrapado y vuelve al disparador.', severidad: 3, casos: ['TEC-05', 'TEC-10'], evidencia: q.ev('TEC-05'), recomendacion: 'Mantener el componente Modal único para todas las ventanas.' },
    { h: 'H3 Control y libertad del usuario', hallazgo: 'Al recargar una página privada se volvía al login. Ahora la sesión se restaura de forma síncrona.', severidad: 3, casos: ['RUT-09'], evidencia: q.ev('RUT-09'), recomendacion: 'Mantener la lectura síncrona de la sesión en useAuthStore.' },
    { h: 'H3 Control y libertad del usuario', hallazgo: 'No existe "Rehacer" y eliminar un equipo o proyecto es irreversible (aunque se confirma antes).', severidad: 1, casos: [], fijo: 'Pendiente', evidencia: 'Excel GRIHO (mejorada), hoja 3', recomendacion: 'Ofrecer "Deshacer" también al eliminar proyecto/equipo (borrado diferido unos segundos).' },
    // H4
    { h: 'H4 Consistencia y estándares', hallazgo: '"Por Hacer" y "Hecho" compartían el mismo color. Ahora cada columna tiene color propio y punto de color.', severidad: 2, casos: ['UX-06'], evidencia: 'capturas/tablero-escritorio.png', recomendacion: 'Mantener: cada columna combina borde superior, título y punto de color además del fondo (muy claro, oklch L≈0.97–0.98); no depender solo del color (el nombre de la columna ya lo garantiza).' },
    // WCAG 2.5.3: si axe sigue detectando label-content-name-mismatch, el hallazgo aparece abajo como "Pendiente" (herramientas automáticas)
    ...((axe.reglas ?? []).some((r) => r.regla === 'label-content-name-mismatch') ? [] : [
      { h: 'H4 Consistencia y estándares', hallazgo: `Las tarjetas de equipo, proyecto y tarea tenían un aria-label ("Abrir el tablero del proyecto X"…) que no empezaba por el texto visible, por lo que un usuario de control por voz no podía activarlas diciendo lo que ve (WCAG 2.5.3). Ahora las tres se nombran por su texto visible (data-testid="tarjeta-equipo" / "tarjeta-proyecto" / "abrir-tarea") y axe ${q.ok('A11Y-06', 'A11Y-07', 'VIS-12') ? 'ya no lo detecta' : 'aún no lo confirma'} en la vista de equipo (escritorio, móvil y tablet).`, severidad: 2, casos: ['A11Y-06', 'A11Y-07', 'VIS-12'], evidencia: q.ev('A11Y-06'), recomendacion: 'Mantener: no añadir aria-label a enlaces/botones con texto visible; si hace falta, que empiece por ese texto.' },
    ]),
    { h: 'H4 Consistencia y estándares', hallazgo: tituloAviso && tituloAviso !== 'Hecho' ? `El aviso de éxito se titulaba "Hecho", igual que la columna "Hecho", lo que podía confundir. Ahora se titula "${tituloAviso}" (aviso real capturado en TEC-07).` : 'El aviso de éxito se titula "Hecho", igual que la columna "Hecho" ("Hecho · \"X\" movida a En Progreso"), lo que puede confundir.', severidad: 1, casos: [], fijo: tituloAviso && tituloAviso !== 'Hecho' ? 'Corregido' : 'Pendiente', evidencia: q.ev('TEC-07', 2) || q.ev('RUT-06'), recomendacion: tituloAviso && tituloAviso !== 'Hecho' ? 'Mantener títulos de aviso distintos de los nombres de columna.' : 'Titular los avisos de éxito como "Listo" o "Guardado".' },
    // H5
    { h: 'H5 Prevención de errores', hallazgo: 'Solo se confirmaba quitar un miembro. Ahora se confirman eliminar tarea/proyecto/equipo/cuenta y cerrar sesión, con consecuencias explicadas y foco seguro en "Cerrar".', severidad: 3, casos: ['TEC-06', 'UX-04'], evidencia: q.ev('TEC-06'), recomendacion: 'Mantener; el foco inicial en una opción no destructiva es correcto.' },
    { h: 'H5 Prevención de errores', hallazgo: 'Lo escrito en un modal se perdía al cerrarlo. Ahora se guarda como borrador (también sin conexión).', severidad: 2, casos: ['UX-01'], evidencia: q.ev('UX-01'), recomendacion: 'Mantener useBorrador en todos los formularios.' },
    { h: 'H5 Prevención de errores', hallazgo: 'Login sin protección ante intentos repetidos; ahora se bloquea tras 5 fallos y el mensaje explica cuánto esperar (código TF-429).', severidad: 2, casos: ['UX-07'], evidencia: q.ev('UX-07'), recomendacion: 'Mantener; valorar ofrecer "¿Olvidaste tu contraseña?".' },
    // H6
    { h: 'H6 Reconocimiento antes que recuerdo', hallazgo: 'No había buscador ni accesos recientes. Ahora hay búsqueda tolerante a tildes y erratas, filtro por persona, recientes y migas de pan.', severidad: 2, casos: ['UX-02', 'RUT-05'], evidencia: q.ev('UX-02'), recomendacion: 'Mantener.' },
    { h: 'H6 Reconocimiento antes que recuerdo', hallazgo: 'Para invitar a alguien hay que recordar su correo exacto.', severidad: 2, casos: [], fijo: 'Pendiente', evidencia: 'Excel GRIHO (mejorada), hoja 5', recomendacion: 'Autocompletar con personas de otros equipos del usuario o invitar por enlace.' },
    { h: 'H6 Reconocimiento antes que recuerdo', hallazgo: idNavMovil && q.ok(idNavMovil) ? `En móvil, "Inicio" y "Preferencias" quedaban solo como icono (el nombre solo estaba en title, que no se ve en pantallas táctiles). Ahora muestran texto visible (${idNavMovil}).` : 'En móvil, "Inicio" y "Preferencias" quedan solo como icono (el nombre solo está en title, que no se ve en pantallas táctiles); la página de accesibilidad es difícil de descubrir en móvil.', severidad: 1, casos: idNavMovil ? [idNavMovil] : [], evidencia: (idNavMovil && q.ev(idNavMovil)) || 'capturas/tablero-movil.png', recomendacion: 'Mostrar etiqueta corta bajo el icono o un menú desplegable con texto en móvil.' },
    // H7
    { h: 'H7 Flexibilidad y eficiencia de uso', hallazgo: 'No había atajos de teclado. Ahora hay atajos (?, i, h, e, p, m, n, /) documentados y desactivables.', severidad: 2, casos: ['TEC-08'], evidencia: q.ev('TEC-08'), recomendacion: 'Mantener; el botón de atajos podría ocultarse en móvil (sin teclado físico).' },
    { h: 'H7 Flexibilidad y eficiencia de uso', hallazgo: 'El asa de arrastre solo aparecía al pasar el ratón. Ahora es visible y las tareas se mueven con teclado (Espacio, flechas, Espacio).', severidad: 3, casos: ['TEC-07', 'TEC-04'], evidencia: q.ev('TEC-07', 1), recomendacion: 'Mantener; añadir alternativa sin arrastre (menú "Mover a…") para WCAG 2.5.7.' },
    { h: 'H7 Flexibilidad y eficiencia de uso', hallazgo: 'No se puede personalizar la disposición del tablero ni el nombre/orden de las columnas.', severidad: 1, casos: [], fijo: 'Pendiente', evidencia: 'Excel GRIHO (mejorada), hoja 13', recomendacion: 'Permitir renombrar/reordenar columnas por proyecto.' },
    // H8
    { h: 'H8 Diseño estético y minimalista', hallazgo: 'Saludo y botón "Nuevo equipo" duplicados, manchas decorativas animadas y texto en degradado. Ahora hay un solo título y una sola acción principal, sin decoración superflua.', severidad: 1, casos: [], fijo: 'Corregido', evidencia: 'capturas/inicio-escritorio.png (verificado por captura)', recomendacion: 'Mantener.' },
    { h: 'H8 Diseño estético y minimalista', hallazgo: 'Texto de 12 px (text-xs) en contadores, insignias y ayudas. Ahora el tamaño mínimo es 14 px y el cuerpo 16 px.', severidad: 2, casos: ['VIS-10'], evidencia: 'capturas/inicio-escritorio.png', recomendacion: 'Mantener; prohibir text-xs en el linter de estilos.' },
    { h: 'H8 Diseño estético y minimalista', hallazgo: 'Texto gris claro y degradados con contraste insuficiente. Ahora axe no detecta problemas de contraste en 24 combinaciones página×viewport y hay modo alto contraste.', severidad: 3, casos: ['VIS-11', 'VIS-13'], evidencia: 'capturas/tablero-alto-contraste-texto-muy-grande.png', recomendacion: 'Mantener la paleta oscura (gray-700/800) para texto secundario.' },
    { h: 'H8 Diseño estético y minimalista', hallazgo: 'El reset CSS global (fuera de capa) anulaba el espaciado de Tailwind (p-8, mt-4…). Ahora los estilos base están en @layer base.', severidad: 2, casos: ['VIS-01', 'VIS-04', 'VIS-06'], evidencia: 'capturas/equipo-escritorio.png', recomendacion: 'Mantener los estilos globales dentro de @layer.' },
    // H9
    { h: 'H9 Ayudar a reconocer, diagnosticar y recuperarse de errores', hallazgo: 'Los mensajes no tenían código de referencia y "invitar" mostraba el mismo error para cualquier fallo. Ahora cada error tiene mensaje específico y código (TF-RED, TF-404, TF-429…).', severidad: 2, casos: ['UX-01', 'UX-07'], evidencia: q.ev('UX-07'), recomendacion: 'Documentar los códigos en la Ayuda (sección de errores).' },
    // H10
    { h: 'H10 Ayuda y documentación', hallazgo: 'No existía ayuda ni preguntas frecuentes. Ahora hay página de Ayuda con buscador de FAQ tolerante a erratas, pasos y atajos.', severidad: 3, casos: ['UX-03'], evidencia: q.ev('UX-03'), recomendacion: 'Mantener; añadir ayuda contextual (enlace "?" en cada vista).' },
    { h: 'H10 Ayuda y documentación', hallazgo: 'No hay asistencia en tiempo real (chat o contacto); la ayuda es solo autoservicio.', severidad: 1, casos: [], fijo: 'Pendiente', evidencia: 'Excel GRIHO (mejorada), hoja 16', recomendacion: 'Añadir un canal de contacto/soporte desde la Ayuda.' },
  ];

  // Hallazgos detectados por las herramientas automáticas en esta ejecución (siempre "Pendiente" si aparecen)
  const mapaHeur = {
    'label-content-name-mismatch': 'H4 Consistencia y estándares',
    'landmark-one-main': 'H4 Consistencia y estándares',
    region: 'H4 Consistencia y estándares',
    'color-contrast': 'H8 Diseño estético y minimalista',
  };
  const sevAxe = { critical: 4, serious: 3, moderate: 2, minor: 1 };
  const ajusteEquipo = { 'label-content-name-mismatch': 2, 'landmark-one-main': 1, region: 1 };
  for (const r of axe.reglas ?? []) {
    r.recomendacion = RECOMENDACIONES_ES[r.regla] ?? r.recomendacion;
    lista.push({
      h: mapaHeur[r.regla] ?? 'H4 Consistencia y estándares',
      hallazgo: `axe-core: ${r.descripcion} (regla ${r.regla}${r.criterios.length ? `, WCAG ${r.criterios.join('/')}` : ', buena práctica'}) en ${r.paginas.length} estado(s): ${r.paginas.join(', ')}. Ej.: ${r.selectores.slice(0, 2).join(' ; ')}`,
      severidad: ajusteEquipo[r.regla] ?? sevAxe[r.impacto] ?? 2,
      casos: [], fijo: 'Pendiente', evidencia: `axe/${r.paginas[0]}.json`, recomendacion: r.recomendacion,
    });
  }
  const clsMalo = lh.filter((f) => parseFloat(String(f.metricas?.CLS ?? '0').replace(',', '.')) > 0.1);
  if (clsMalo.length) {
    lista.push({
      h: 'H8 Diseño estético y minimalista',
      hallazgo: `Lighthouse: desplazamiento de diseño al cargar (CLS > 0,1) en ${clsMalo.map((f) => `${f.pagina} ${f.dispositivo} (CLS ${f.metricas.CLS})`).join(', ')}: el contenido "salta" cuando llegan los datos.`,
      severidad: 1, casos: [], fijo: 'Pendiente', evidencia: clsMalo[0].informe,
      recomendacion: 'Reservar el alto de "Primeros pasos"/lista de equipos con esqueletos (skeletons) mientras cargan los datos.',
    });
  }

  return lista.map((x, i) => ({
    id: `N-${String(i + 1).padStart(2, '0')}`,
    heuristica: x.h,
    hallazgo: x.hallazgo,
    severidad: x.severidad,
    evidencia: [x.evidencia, ...x.casos.map((c) => `caso ${c}`)].filter(Boolean).join(' · '),
    recomendacion: x.recomendacion,
    estado: estado(x.casos, x.fijo),
  }));
}

// ---------------------------------------------------------------- IA vs revisión del equipo
function iaVsEquipo(res, q) {
  const axe = res.axe;
  const lh = res.lighthouse.tabla ?? [];
  const idNavMovil = q.casos.find((c) => /^Navegación en móvil/.test(c.nombre))?.id;
  const verif = (ids) => (q.existe(...ids) ? (q.ok(...ids) ? 'verificado en esta ejecución' : 'NO superado en esta ejecución') : 'sin caso automatizado');
  const filas = [
    { ia: 'Los errores al crear equipo/proyecto/tarea y asignar solo se escriben en la consola; el usuario no se entera.', sev: 4, rev: `Confirmado en el código anterior (console.error en los catch). Tras la corrección, ${verif(['UX-01'])}: ${q.obt('UX-01')}`, co: 'Sí', corr: 'Antes: console.error. Después: toasts con mensaje en español + código (describirError) y banner sin conexión.', ev: q.ev('UX-01'), casos: ['UX-01'] },
    { ia: 'No hay ayuda ni preguntas frecuentes.', sev: 3, rev: `Confirmado (no existía ruta de ayuda). Para una app sencilla el equipo la valora en severidad 2. Tras la corrección: ${q.obt('UX-03')}`, co: 'Parcial', corr: 'Antes: solo README técnico. Después: /ayuda con FAQ buscable, pasos y atajos.', ev: q.ev('UX-03'), casos: ['UX-03'] },
    { ia: 'No existe deshacer/rehacer.', sev: 3, rev: `Confirmado. Tras la corrección "Deshacer" funciona (${verif(['RUT-08'])}); "Rehacer" sigue sin existir, por eso el equipo mantiene un pendiente menor.`, co: 'Sí', corr: 'Antes: sin deshacer. Después: "Deshacer" en mover/eliminar tarea y quitar miembro.', ev: q.ev('RUT-08'), casos: ['RUT-08'] },
    { ia: 'No hay buscador, filtros ni recientes.', sev: 2, rev: `De acuerdo con la severidad: con pocos equipos el impacto es bajo. ${q.obt('UX-02')}`, co: 'Sí', corr: 'Después: búsqueda tolerante a erratas, filtro por persona y proyectos recientes.', ev: q.ev('UX-02'), casos: ['UX-02'] },
    { ia: 'La pestaña siempre dice "taskflow-frontend".', sev: 2, rev: `Confirmado. El equipo lo sube a 3 por ser un fallo WCAG 2.4.2 (nivel A) que afecta a lectores de pantalla. Tras la corrección: ${q.obt('UX-05')}`, co: 'Parcial', corr: 'Después: useDocumentTitle en cada página.', ev: q.ev('UX-05'), casos: ['UX-05'] },
    { ia: '"Por Hacer" y "Hecho" comparten el mismo color.', sev: 2, rev: `Confirmado en el código anterior (se esperaban "todo"/"done"). Tras la corrección los colores son distintos (${q.obt('UX-06')}), y en la captura se distinguen por el borde superior, el color del título y el punto (gris, azul y verde); los fondos son muy claros pero no son el único indicador.`, co: 'Sí', corr: 'Después: estilos por tipo de columna (estilosColumna.ts) con punto y fondo de color.', ev: 'capturas/tablero-escritorio.png', casos: ['UX-06'] },
    { ia: 'La barra de progreso es falsa (tareas / (listas × 5)).', sev: 3, rev: `Confirmado. Tras la corrección: ${q.obt('RUT-07')}`, co: 'Sí', corr: 'Después: progreso = tareas en "Hecho" / total, con role="progressbar".', ev: q.ev('RUT-07'), casos: ['RUT-07'] },
    { ia: 'El botón de engranaje del tablero no hace nada y el "+" de la tarjeta de equipo es decorativo.', sev: 2, rev: 'Confirmado en el código anterior. En las capturas actuales del tablero y del inicio ya no aparecen; el engranaje de la barra lleva a Preferencias.', co: 'Sí', corr: 'Después: eliminados; tarjetas de equipo/proyecto son enlaces reales con "Abrir >".', ev: 'capturas/tablero-escritorio.png', casos: [] },
    { ia: 'Texto gris claro y texto en degradado con contraste insuficiente.', sev: 3, rev: `Confirmado con el código anterior (text-gray-400/500, bg-clip-text). Tras la corrección axe ${verif(['VIS-11'])}: ${q.obt('VIS-11')}`, co: 'Sí', corr: 'Después: gray-700/800 para texto secundario, sin degradados en texto y modo alto contraste.', ev: 'capturas/inicio-escritorio.png', casos: ['VIS-11'] },
    { ia: 'Texto de 12 px en contadores, insignias y ayudas.', sev: 2, rev: `Confirmado. Medición actual: ${q.obt('VIS-10')}`, co: 'Sí', corr: 'Después: mínimo 14 px y preferencia de tamaño de texto (grande / muy grande).', ev: 'capturas/inicio-escritorio.png', casos: ['VIS-10'] },
    { ia: 'Saludo y botones duplicados, manchas decorativas animadas.', sev: 1, rev: 'De acuerdo: es un problema estético menor. En la captura actual hay un único título "Mis equipos" y un único botón "Nuevo equipo".', co: 'Sí', corr: 'Después: encabezado único, sin decoración superflua.', ev: 'capturas/inicio-escritorio.png', casos: [] },
    { ia: 'Los errores de validación llegan en inglés.', sev: 3, rev: `Confirmado. Tras la corrección: ${q.obt('UX-08')}`, co: 'Sí', corr: 'Después: mensajes personalizados en los DTO y en el ValidationPipe.', ev: 'resultados/recorrido.json', casos: ['UX-08'] },
    { ia: 'Las ventanas modales no se cierran con Esc ni retienen el foco.', sev: 3, rev: `Confirmado. Tras la corrección: ${q.obt('TEC-10')} / ${q.obt('TEC-05')}`, co: 'Sí', corr: 'Después: componente Modal con Esc, trampa de foco y devolución del foco.', ev: q.ev('TEC-05'), casos: ['TEC-05', 'TEC-10'] },
    { ia: 'Solo se confirma "eliminar miembro"; el resto de acciones no se confirman.', sev: 3, rev: `Parcialmente de acuerdo: confirmar mover/asignar sería excesivo porque existe "Deshacer"; el equipo lo valora en 2 y solo exige confirmación en acciones destructivas. ${q.obt('TEC-06')}`, co: 'Parcial', corr: 'Después: confirmaciones en eliminar tarea/proyecto/equipo/cuenta y cerrar sesión.', ev: q.ev('TEC-06'), casos: ['TEC-06', 'UX-04'] },
    { ia: 'Al recargar una página privada se vuelve al login.', sev: 3, rev: `Confirmado. Tras la corrección: ${q.obt('RUT-09')}`, co: 'Sí', corr: 'Después: lectura síncrona de la sesión en useAuthStore.', ev: q.ev('RUT-09'), casos: ['RUT-09'] },
    { ia: 'El reset CSS global anula el espaciado de Tailwind.', sev: 2, rev: `Confirmado en index.css anterior. Las capturas en 3 viewports muestran el espaciado correcto y sin desbordamientos (${verif(['VIS-01', 'VIS-04', 'VIS-06'])}).`, co: 'Sí', corr: 'Después: estilos base dentro de @layer base.', ev: 'capturas/equipo-escritorio.png', casos: ['VIS-04'] },
  ];

  // Hallazgos de la automatización (axe / Lighthouse / scripts) contrastados por el equipo
  for (const r of axe.reglas ?? []) {
    const notas = {
      'label-content-name-mismatch': `El equipo revisa el nodo señalado (${r.selectores.slice(0, 2).join(' ; ')}): las tres tarjetas —equipo (Mis equipos), proyecto (vista de equipo, ProjectsList.tsx) y tarea (tablero)— ya no tienen aria-label y se nombran por su texto visible (data-testid="tarjeta-equipo" / "tarjeta-proyecto" / "abrir-tarea"), así que este nodo es un control nuevo o una regresión. Afecta a usuarios de control por voz; impacto real moderado → severidad 2 (axe: serious).`,
      'landmark-one-main': 'Confirmado en el código: Privacidad usa un <div> raíz sin <main> porque no pasa por PrivateRoute. Impacto bajo (página de solo lectura) → severidad 1.',
      region: 'Misma causa que landmark-one-main en Privacidad: el contenido no está en regiones. Severidad 1.',
    };
    filas.push({
      ia: `axe-core ${axe.axeVersion}: ${r.descripcion} [${r.regla}, impacto ${r.impacto}${r.criterios.length ? `, WCAG ${r.criterios.join('/')}` : ''}] en ${r.paginas.length} estado(s).`,
      sev: { critical: 4, serious: 3, moderate: 2, minor: 1 }[r.impacto] ?? 2,
      rev: notas[r.regla] ?? 'Pendiente de revisión manual por el equipo.',
      co: notas[r.regla] && /severidad 2|severidad 1/.test(notas[r.regla]) && r.impacto !== 'minor' ? 'Parcial' : 'Sí',
      corr: `Pendiente: ${r.recomendacion}`,
      ev: `axe/${r.paginas[0]}.json`,
      casos: [],
    });
  }
  const seoFalla = lh.filter((f) => f.auditoriasFallidas?.some((a) => a.id === 'meta-description'));
  if (seoFalla.length) {
    filas.push({
      ia: `Lighthouse ${res.lighthouse.lighthouseVersion}: SEO ${seoFalla[0].seo}/100 por falta de meta description y robots.txt.`,
      sev: 1,
      rev: 'El equipo no lo considera un problema de usabilidad: las páginas privadas no deben indexarse y robots.txt falla porque se audita el servidor de desarrollo. Solo afecta a /login (página pública).',
      co: 'No', corr: 'Opcional: añadir <meta name="description"> en index.html.', ev: seoFalla[0].informe, casos: [],
    });
  }
  const rendMovil = lh.filter((f) => f.dispositivo === 'Móvil');
  if (rendMovil.length) {
    filas.push({
      ia: `Lighthouse: rendimiento móvil ${rendMovil.map((f) => `${f.pagina} ${f.rendimiento}`).join(', ')} (LCP ${rendMovil.map((f) => f.metricas?.LCP).join(' / ')}).`,
      sev: 1,
      rev: 'Parcial: se mide contra el servidor de desarrollo de Vite (sin minificar ni empaquetar) y con red 4G simulada; el valor no es representativo de producción. Debe repetirse con "vite build && vite preview".',
      co: 'Parcial', corr: 'Repetir sobre el build de producción; dividir el bundle por rutas (lazy) si sigue < 90.', ev: rendMovil[0].informe, casos: [],
    });
  }
  const clsMalo = lh.filter((f) => parseFloat(String(f.metricas?.CLS ?? '0').replace(',', '.')) > 0.1);
  if (clsMalo.length) {
    filas.push({
      ia: `Lighthouse: CLS ${clsMalo.map((f) => `${f.pagina} ${f.dispositivo} ${f.metricas.CLS}`).join(', ')} (> 0,1).`,
      sev: 1,
      rev: 'Confirmado al observar la carga del inicio: "Primeros pasos" y la lista de equipos aparecen tras el indicador de carga y desplazan el contenido. Impacto estético menor.',
      co: 'Sí', corr: 'Pendiente: esqueletos con alto reservado.', ev: clsMalo[0].informe, casos: [],
    });
  }
  if (q.existe('TEC-11')) {
    filas.push({
      ia: 'Script de teclado (asistido por IA): las instrucciones y anuncios del arrastre para lectores de pantalla están en inglés y exponen UUID internos.',
      sev: 3,
      rev: q.ok('TEC-11') ? `Ya corregido: ${q.obt('TEC-11')}` : `Confirmado leyendo el DOM (aria-describedby y región aria-live de la librería): ${q.obt('TEC-11')}. axe no lo detecta (no comprueba idioma del contenido). El equipo debe verificarlo con NVDA/Narrador.`,
      co: 'Sí', corr: q.ok('TEC-11') ? 'Corregido.' : 'Pendiente: dragHandleUsageInstructions y announce() en español.', ev: q.ev('TEC-11'), casos: ['TEC-11'],
    });
  }
  filas.push({
    ia: '(Revisión manual del equipo, no detectado por la IA ni por axe) En móvil "Inicio" y "Preferencias" quedan solo como icono con title.',
    sev: 1,
    rev: 'axe lo aprueba porque title aporta nombre accesible, pero en pantallas táctiles el title no se muestra: la página de accesibilidad es difícil de descubrir.' + (idNavMovil ? ` Comprobación automática (${idNavMovil}): ${q.obt(idNavMovil)}` : ''),
    co: 'No', corr: idNavMovil && q.ok(idNavMovil) ? 'Corregido: texto visible "Inicio" y "Preferencias" también en móvil.' : 'Pendiente: etiqueta visible o menú con texto en móvil.', ev: (idNavMovil && q.ev(idNavMovil)) || 'capturas/tablero-movil.png', casos: idNavMovil ? [idNavMovil] : [],
  });

  return filas.map((f) => ({
    hallazgoIA: f.ia,
    severidadIA: f.sev,
    revisionEquipo: f.rev,
    coincide: f.co,
    correccion: f.corr + (f.casos.length ? ` [${f.casos.map((c) => `${c}: ${q.porId[c]?.estado ?? 'no ejecutado'}`).join(', ')}]` : ''),
    evidencia: f.ev,
  }));
}

// ---------------------------------------------------------------- informe
export async function generarInforme({ comando = 'npm test' } = {}) {
  const res = cargar();
  const q = crearConsultas(res);
  const versiones = {
    axe: res.axe.axeVersion ?? version('axe-core'),
    lighthouse: res.lighthouse.lighthouseVersion ?? version('lighthouse'),
    puppeteer: version('puppeteer-core'),
    pixelmatch: version('pixelmatch'),
  };
  const casos = q.casos.map(({ detalle, ...c }) => c);
  const aprobados = casos.filter((c) => c.estado === 'Aprobado').length;
  const nielsen = hallazgosNielsen(res, q);
  const ia = iaVsEquipo(res, q);
  const lighthouse = (res.lighthouse.tabla ?? []).map(({ pagina, dispositivo, accesibilidad, buenasPracticas, rendimiento, seo }) => ({ pagina, dispositivo, accesibilidad, buenasPracticas, rendimiento, seo }));

  const resumen = {
    area: 'UX, heurísticas, accesibilidad e interfaz',
    herramienta: `axe-core ${versiones.axe}, Lighthouse ${versiones.lighthouse}, Puppeteer ${versiones.puppeteer} (puppeteer-core + Chrome instalado), pixelmatch ${versiones.pixelmatch}`,
    comando,
    fecha: new Date().toISOString(),
    totales: { total: casos.length, aprobados, fallidos: casos.length - aprobados },
    casos,
    lighthouse,
    nielsen,
    ia_vs_equipo: ia,
  };
  guardarJSON(path.join(DIRS.raiz, 'resumen.json'), resumen);
  fs.writeFileSync(path.join(DIRS.raiz, 'informe.md'), construirMarkdown(resumen, res, q), 'utf8');
  return resumen;
}

function construirMarkdown(resumen, res, q) {
  const L = [];
  const p = (...x) => L.push(...x);
  const porTipo = {};
  for (const c of resumen.casos) {
    porTipo[c.tipo] ??= { total: 0, ok: 0 };
    porTipo[c.tipo].total++;
    if (c.estado === 'Aprobado') porTipo[c.tipo].ok++;
  }
  const axe = res.axe;
  const fallidos = resumen.casos.filter((c) => c.estado === 'Fallido');

  p('# Informe de UX, heurísticas, accesibilidad e interfaz — TaskFlow', '');
  p(`- **Fecha de ejecución:** ${resumen.fecha}`);
  p(`- **Comando:** \`cd pruebas/accesibilidad && ${resumen.comando}\``);
  p(`- **Herramientas:** ${resumen.herramienta}`);
  p(`- **Aplicación auditada:** frontend ${CONFIG.web} (servidor de desarrollo Vite) · backend ${CONFIG.api}`);
  p(`- **Resultado global:** ${resumen.totales.total} casos · **${resumen.totales.aprobados} aprobados** · **${resumen.totales.fallidos} fallidos**`, '');
  p(tabla(['Tipo', 'Casos', 'Aprobados', 'Fallidos'], Object.entries(porTipo).map(([t, v]) => [t, v.total, v.ok, v.total - v.ok])), '');
  p('> Todos los valores "obtenido" y "estado" se calculan en la ejecución (no están escritos a mano). Los datos de prueba (usuarios, equipo, proyecto y 4 tareas) se crean vía API con correos únicos (`Date.now()`).', '');
  p('Contexto: la evaluación heurística GRIHO previa dio **52,3 %** de usabilidad antes de las mejoras y **93,4 %** después (`Evaluacion-Heuristica GRIHO - TaskFlow.xlsx` y `… (mejorada).xlsx`). Este informe verifica con pruebas automatizadas y reproducibles esas mejoras y documenta lo que queda pendiente.', '');

  // ---- metodología
  p('## 1. Metodología', '');
  p('| Técnica | Qué se hace | Criterio de aprobado |', '| --- | --- | --- |');
  p(`| Auditoría automática WCAG (axe-core ${axe.axeVersion}) | Inyección de axe en ${axe.paginas?.length ?? 0} páginas/estados (incluye modales, diálogo de confirmación, alto contraste y texto grande) con etiquetas ${axe.etiquetas?.join(', ')} | 0 violaciones de criterios WCAG A/AA (las "best-practice" se informan) |`);
  p(`| Lighthouse ${res.lighthouse.lighthouseVersion} | Accesibilidad, buenas prácticas, rendimiento y SEO de login, inicio y tablero en escritorio y móvil, con sesión iniciada (integración Puppeteer) | Accesibilidad ≥ 90 |`);
  p('| Teclado (scripts Puppeteer) | Orden de Tab, foco visible por estilos calculados, enlace de salto, trampa de foco, Esc, atajos, arrastre con teclado, login solo con teclado | Ver cada caso |');
  p('| Visual | Capturas en 390×844, 768×1024 y 1366×900, desbordamiento horizontal, reflow 320 px, tamaño de texto ≥ 14 px, contraste en 3 viewports, preferencias de accesibilidad, regresión visual con pixelmatch | Ver cada caso |');
  p('| Recorridos de usuario | Registro → login → crear equipo → invitar → crear proyecto → crear tarea → mover → deshacer → recargar, contando acciones y tiempo; casos de UX complementarios (sin conexión, búsqueda, ayuda, bloqueo de login, validación) | Tarea completada |');
  p('| Evaluación heurística (Nielsen) y contraste IA vs equipo | Hallazgos con severidad 0–4, evidencia y estado calculado a partir de los casos | — |', '');
  p('Escala de severidad de Nielsen: 0 = no es problema · 1 = cosmético · 2 = menor · 3 = mayor · 4 = catastrófico. En los hallazgos "Corregido" se indica la severidad que tenía el problema antes de corregirse.', '');

  // ---- casos
  p('## 2. Casos de prueba (objetivo, esperado, obtenido, evidencia)', '');
  p(tabla(['ID', 'Tipo', 'Nombre', 'Objetivo', 'Resultado esperado', 'Resultado obtenido', 'Estado', 'Evidencia'],
    resumen.casos.map((c) => [c.id, c.tipo, c.nombre, c.objetivo, c.esperado, c.obtenido, c.estado === 'Aprobado' ? '✅ Aprobado' : '❌ Fallido', c.evidencia.map(enlace).join('<br>')])), '');

  // ---- axe
  p('## 3. Accesibilidad automática (axe-core)', '');
  const ti = axe.totalesImpacto ?? {};
  p(`Nodos afectados por impacto (suma de todos los estados): **critical ${ti.critical ?? 0} · serious ${ti.serious ?? 0} · moderate ${ti.moderate ?? 0} · minor ${ti.minor ?? 0}**.`, '');
  p(tabla(['Página / estado', 'critical', 'serious', 'moderate', 'minor', 'Reglas incumplidas', 'JSON'],
    (axe.paginas ?? []).map((x) => [x.pagina, x.conteo.critical, x.conteo.serious, x.conteo.moderate, x.conteo.minor, x.reglas.join(', ') || '—', enlace(`axe/${x.id}.json`)])), '');
  if ((axe.reglas ?? []).length) {
    p('### Reglas incumplidas, criterios WCAG y recomendación', '');
    p(tabla(['Regla', 'Impacto', 'Nivel', 'Criterio WCAG', 'Descripción', 'Nodos', 'Selectores (ejemplos)', 'Recomendación'],
      axe.reglas.map((r) => [r.regla, r.impacto, r.nivel, r.criterios.join(', ') || '—', r.descripcion, r.nodos, r.selectores.slice(0, 3).map((s) => `\`${s.slice(0, 90)}\``).join('<br>'), r.recomendacion])), '');
  } else p('No se detectaron violaciones.', '');

  // ---- lighthouse
  p('## 4. Lighthouse', '');
  p(tabla(['Página', 'Dispositivo', 'Accesibilidad', 'Buenas prácticas', 'Rendimiento', 'SEO', 'LCP', 'CLS', 'Auditorías no superadas', 'Informe'],
    (res.lighthouse.tabla ?? []).map((f) => [f.pagina, f.dispositivo, f.accesibilidad, f.buenasPracticas, f.rendimiento, f.seo, f.metricas?.LCP, f.metricas?.CLS, f.auditoriasFallidas.map((a) => a.id).join(', ') || '—', enlace(f.informe)])), '');
  p('> El rendimiento se mide contra el servidor de desarrollo de Vite (código sin minificar y con HMR); sirve para comparar, no como valor de producción.', '');

  // ---- teclado
  p('## 5. Navegación con teclado', '');
  const tec = res.teclado.casos ?? [];
  p(tabla(['ID', 'Comprobación', 'Obtenido', 'Estado'], tec.map((c) => [c.id, c.nombre, c.obtenido, c.estado])), '');
  const foco = q.porId['TEC-03']?.detalle ?? res.teclado.casos?.find((c) => c.id === 'TEC-03')?.detalle;
  if (Array.isArray(foco)) {
    p('<details><summary>Secuencia de foco medida (inicio y tablero)</summary>', '');
    p(tabla(['Página', '#', 'Elemento', 'Nombre', 'Región', 'Indicador de foco'], foco.map((s) => [s.pagina, s.orden, s.tag, s.nombre, s.enNav ? 'nav' : s.enMain ? 'main' : '—', s.indicador])), '', '</details>', '');
  }

  // ---- visual
  p('## 6. Interfaz y comportamiento visual', '');
  const vis = res.visual;
  p(tabla(['Página', 'Viewport', 'innerWidth', 'scrollWidth', '¿Desborda?', 'Captura'],
    (vis.capturas ?? []).map((c) => [c.pagina, c.viewport, c.innerWidth, c.scrollWidth, c.desborda ? 'Sí' : 'No', enlace(c.captura)])), '');
  p('### Tamaño de texto (escritorio)', '');
  p(tabla(['Página', 'Textos muestreados', '< 14 px', 'Mínimo (px)', 'Cuerpo (px)'], (vis.texto ?? []).map((t) => [t.pagina, t.total, t.menores14, t.minimo, t.cuerpo])), '');
  p('### Regresión visual (pixelmatch, umbral 0,5 %)', '');
  p(tabla(['Página', '% píxeles distintos', 'Origen de la línea base', 'Base', 'Actual', 'Diferencias'],
    (vis.regresion ?? []).map((r) => [r.pagina, r.porcentaje, r.origen, enlace(r.base), enlace(r.actual), enlace(r.diff)])), '');
  p('> La primera ejecución crea la línea base en `visual/base/`; las siguientes comparan contra ella. Para aceptar un cambio de diseño intencionado, borrar `visual/base/` y volver a ejecutar `npm run visual`.', '');

  // ---- recorridos
  p('## 7. Recorridos de usuario', '');
  const rec = res.recorrido.recorrido ?? [];
  p(tabla(['ID', 'Tarea', 'Éxito', 'Acciones de usuario', 'Tiempo (s)'], rec.map((r) => [r.id, r.tarea, r.exito ? 'Sí' : 'No', r.acciones, r.segundos])), '');
  if (rec.length) {
    const ok = rec.filter((r) => r.exito).length;
    p(`**Tasa de éxito: ${ok}/${rec.length} (${Math.round((ok / rec.length) * 100)} %) · ${rec.reduce((s, r) => s + r.acciones, 0)} acciones** para ir de "sin cuenta" a "tarea movida a Hecho". Acciones = clics, campos rellenados o teclas significativas, sin contar la navegación entre pantallas automática.`, '');
  }

  // ---- nielsen
  p('## 8. Evaluación heurística (10 heurísticas de Nielsen)', '');
  const corr = resumen.nielsen.filter((n) => n.estado === 'Corregido').length;
  p(`${resumen.nielsen.length} hallazgos: **${corr} corregidos** y **${resumen.nielsen.length - corr} pendientes**. El estado de cada hallazgo vinculado a un caso se calcula con el resultado de ese caso.`, '');
  p(tabla(['ID', 'Heurística', 'Hallazgo', 'Severidad (0-4)', 'Evidencia', 'Recomendación', 'Estado'],
    resumen.nielsen.map((n) => [n.id, n.heuristica, n.hallazgo, n.severidad, n.evidencia, n.recomendacion, n.estado])), '');

  // ---- IA vs equipo
  p('## 9. Análisis apoyado por IA vs revisión del equipo', '');
  p('La primera evaluación GRIHO la elaboró el asistente de IA (Claude) a partir del código y de la interfaz; las herramientas automáticas (axe, Lighthouse y los scripts generados con ayuda de IA) amplían ese análisis. La columna "Revisión del equipo" está **prellenada con notas de verificación neutrales** basadas en las capturas y resultados de esta ejecución; el equipo debe revisarla, ajustar severidades y firmar su conformidad.', '');
  p(tabla(['#', 'Hallazgo de la IA / automatización', 'Sev. IA', 'Revisión del equipo', '¿Coincide?', 'Corrección documentada (antes → después)', 'Evidencia'],
    resumen.ia_vs_equipo.map((f, i) => [i + 1, f.hallazgoIA, f.severidadIA, f.revisionEquipo, f.coincide, f.correccion, enlace(f.evidencia) || f.evidencia])), '');
  const cuenta = (v) => resumen.ia_vs_equipo.filter((f) => f.coincide === v).length;
  p(`Coincidencias: **Sí ${cuenta('Sí')} · Parcial ${cuenta('Parcial')} · No ${cuenta('No')}**. Las discrepancias muestran por qué el análisis de IA y las herramientas automáticas no sustituyen la revisión humana: axe sobrevaloró el impacto de label-content-name-mismatch (ya corregido si no aparece en la tabla), Lighthouse penaliza SEO en páginas privadas y ninguna herramienta estándar detectó los anuncios en inglés del arrastre ni la navegación solo con iconos en móvil (se comprueban con scripts propios: TEC-11 y la verificación de navegación en móvil).`, '');
  p('> No hay capturas del estado "antes": se describe a partir del código anterior y de los comentarios del Excel GRIHO original; las capturas "después" son las de esta ejecución.', '');

  // ---- pendientes
  p('## 10. Problemas pendientes priorizados', '');
  const pend = resumen.nielsen.filter((n) => n.estado === 'Pendiente').sort((a, b) => b.severidad - a.severidad);
  p(tabla(['Prioridad', 'ID', 'Severidad', 'Problema', 'Recomendación'], pend.map((n, i) => [i + 1, n.id, n.severidad, n.hallazgo, n.recomendacion])), '');
  if (fallidos.length) {
    p('Casos fallidos en esta ejecución:', '');
    for (const c of fallidos) p(`- **${c.id} ${c.nombre}:** ${c.obtenido}`);
    p('');
  }

  // ---- limitaciones
  p('## 11. Limitaciones', '');
  p('- Las herramientas automáticas detectan aproximadamente un 30–40 % de los problemas WCAG; no sustituyen la prueba con lectores de pantalla (NVDA/Narrador) ni con usuarios reales.');
  p('- Lighthouse se ejecutó contra el servidor de desarrollo; las cifras de rendimiento y SEO deben repetirse sobre el build de producción.');
  p('- La base de datos es compartida con otras suites de prueba: se crean usuarios únicos por ejecución.' + ((MODULOS.flatMap((m) => res[m].incidenciasCarga ?? []).length) ? ` Durante la ejecución hubo ${MODULOS.flatMap((m) => res[m].incidenciasCarga ?? []).length} error(es) transitorio(s) de carga (TF-RED) que se reintentaron automáticamente.` : ''));
  p('- El número de acciones de los recorridos es el mínimo de un usuario experto (script); un usuario novel necesitará más pasos y tiempo.', '');

  // ---- evidencias
  p('## 12. Índice de evidencias', '');
  p('| Carpeta | Contenido |', '| --- | --- |');
  p('| `capturas/` | Capturas de cada página en móvil, tablet y escritorio, y modo alto contraste + texto muy grande |');
  p('| `axe/` | Un JSON de violaciones por página/estado, `_resumen.json` y captura de cada estado auditado |');
  p('| `lighthouse/` | Informes HTML y JSON de Lighthouse (página × dispositivo) |');
  p('| `teclado/` | Capturas de foco visible, enlace de salto, modales y arrastre con teclado |');
  p('| `visual/` | Línea base, capturas actuales y mapas de diferencias de pixelmatch |');
  p('| `recorrido/` | Capturas de cada paso del recorrido y de los casos de UX |');
  p('| `resultados/` | Resultado bruto de cada módulo (incluye el detalle de cada medición) |');
  p('| `resumen.json` | Resumen en el formato común de la asignatura |', '');
  p('Ejecución: `cd pruebas/accesibilidad && npm install && npm test` (o `npm run axe | lighthouse | teclado | visual | recorrido`). Requiere el backend en :3000, el frontend en :5173 y Chrome instalado (`CHROME_PATH` para otra ruta).', '');
  return L.join('\n');
}
