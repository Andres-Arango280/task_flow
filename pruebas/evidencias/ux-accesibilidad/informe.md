# Informe de UX, heurísticas, accesibilidad e interfaz — TaskFlow

- **Fecha de ejecución:** 2026-10-27T04:30:15.884Z
- **Comando:** `cd pruebas/accesibilidad && npm test`
- **Herramientas:** axe-core 4.14.0, Lighthouse 12.8.2, Puppeteer 24.43.1 (puppeteer-core + Chrome instalado), pixelmatch 8.0.0
- **Aplicación auditada:** frontend http://localhost:5173 (servidor de desarrollo Vite) · backend http://localhost:3000
- **Resultado global:** 68 casos · **68 aprobados** · **0 fallidos**

| Tipo | Casos | Aprobados | Fallidos |
| --- | --- | --- | --- |
| accesibilidad | 25 | 25 | 0 |
| teclado | 11 | 11 | 0 |
| visual | 16 | 16 | 0 |
| recorrido | 16 | 16 | 0 |

> Todos los valores "obtenido" y "estado" se calculan en la ejecución (no están escritos a mano). Los datos de prueba (usuarios, equipo, proyecto y 4 tareas) se crean vía API con correos únicos (`Date.now()`).

Contexto: la evaluación heurística GRIHO previa dio **52,3 %** de usabilidad antes de las mejoras y **93,4 %** después (`Evaluacion-Heuristica GRIHO - TaskFlow.xlsx` y `… (mejorada).xlsx`). Este informe verifica con pruebas automatizadas y reproducibles esas mejoras y documenta lo que queda pendiente.

## 1. Metodología

| Técnica | Qué se hace | Criterio de aprobado |
| --- | --- | --- |
| Auditoría automática WCAG (axe-core 4.14.0) | Inyección de axe en 18 páginas/estados (incluye modales, diálogo de confirmación, alto contraste y texto grande) con etiquetas wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice | 0 violaciones de criterios WCAG A/AA (las "best-practice" se informan) |
| Lighthouse 12.8.2 | Accesibilidad, buenas prácticas, rendimiento y SEO de login, inicio y tablero en escritorio y móvil, con sesión iniciada (integración Puppeteer) | Accesibilidad ≥ 90 |
| Teclado (scripts Puppeteer) | Orden de Tab, foco visible por estilos calculados, enlace de salto, trampa de foco, Esc, atajos, arrastre con teclado, login solo con teclado | Ver cada caso |
| Visual | Capturas en 390×844, 768×1024 y 1366×900, desbordamiento horizontal, reflow 320 px, tamaño de texto ≥ 14 px, contraste en 3 viewports, preferencias de accesibilidad, regresión visual con pixelmatch | Ver cada caso |
| Recorridos de usuario | Registro → login → crear equipo → invitar → crear proyecto → crear tarea → mover → deshacer → recargar, contando acciones y tiempo; casos de UX complementarios (sin conexión, búsqueda, ayuda, bloqueo de login, validación) | Tarea completada |
| Evaluación heurística (Nielsen) y contraste IA vs equipo | Hallazgos con severidad 0–4, evidencia y estado calculado a partir de los casos | — |

Escala de severidad de Nielsen: 0 = no es problema · 1 = cosmético · 2 = menor · 3 = mayor · 4 = catastrófico. En los hallazgos "Corregido" se indica la severidad que tenía el problema antes de corregirse.

## 2. Casos de prueba (objetivo, esperado, obtenido, evidencia)

| ID | Tipo | Nombre | Objetivo | Resultado esperado | Resultado obtenido | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A11Y-01 | accesibilidad | axe-core WCAG 2.2 AA – Iniciar sesión (/login) | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Iniciar sesión (/login)". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 32 reglas superadas) | ✅ Aprobado | [login.json](axe/login.json)<br>[axe-login.png](axe/axe-login.png) |
| A11Y-02 | accesibilidad | axe-core WCAG 2.2 AA – Registro (/register) | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Registro (/register)". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 34 reglas superadas) | ✅ Aprobado | [register.json](axe/register.json)<br>[axe-register.png](axe/axe-register.png) |
| A11Y-03 | accesibilidad | axe-core WCAG 2.2 AA – Privacidad (/privacidad) | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Privacidad (/privacidad)". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 27 reglas superadas) | ✅ Aprobado | [privacidad.json](axe/privacidad.json)<br>[axe-privacidad.png](axe/axe-privacidad.png) |
| A11Y-04 | accesibilidad | axe-core WCAG 2.2 AA – Inicio sin equipos (/) | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Inicio sin equipos (/)". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 31 reglas superadas) | ✅ Aprobado | [inicio-vacio.json](axe/inicio-vacio.json)<br>[axe-inicio-vacio.png](axe/axe-inicio-vacio.png) |
| A11Y-05 | accesibilidad | axe-core WCAG 2.2 AA – Inicio con equipos (/) | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Inicio con equipos (/)". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 34 reglas superadas) | ✅ Aprobado | [inicio-equipos.json](axe/inicio-equipos.json)<br>[axe-inicio-equipos.png](axe/axe-inicio-equipos.png) |
| A11Y-06 | accesibilidad | axe-core WCAG 2.2 AA – Vista de equipo (/equipos/:id) | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Vista de equipo (/equipos/:id)". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 31 reglas superadas) | ✅ Aprobado | [equipo.json](axe/equipo.json)<br>[axe-equipo.png](axe/axe-equipo.png) |
| A11Y-07 | accesibilidad | axe-core WCAG 2.2 AA – Modal "Invitar miembro" | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Modal "Invitar miembro"". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 40 reglas superadas) | ✅ Aprobado | [modal-invitar.json](axe/modal-invitar.json)<br>[axe-modal-invitar.png](axe/axe-modal-invitar.png) |
| A11Y-08 | accesibilidad | axe-core WCAG 2.2 AA – Tablero Kanban con tareas (/proyectos/:id) | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Tablero Kanban con tareas (/proyectos/:id)". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 42 reglas superadas) | ✅ Aprobado | [tablero.json](axe/tablero.json)<br>[axe-tablero.png](axe/axe-tablero.png) |
| A11Y-09 | accesibilidad | axe-core WCAG 2.2 AA – Modal de detalle de tarea | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Modal de detalle de tarea". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 43 reglas superadas) | ✅ Aprobado | [modal-detalle-tarea.json](axe/modal-detalle-tarea.json)<br>[axe-modal-detalle-tarea.png](axe/axe-modal-detalle-tarea.png) |
| A11Y-10 | accesibilidad | axe-core WCAG 2.2 AA – Modal "Crear nueva tarea" | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Modal "Crear nueva tarea"". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 43 reglas superadas) | ✅ Aprobado | [modal-crear-tarea.json](axe/modal-crear-tarea.json)<br>[axe-modal-crear-tarea.png](axe/axe-modal-crear-tarea.png) |
| A11Y-11 | accesibilidad | axe-core WCAG 2.2 AA – Diálogo de confirmación (eliminar tarea) | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Diálogo de confirmación (eliminar tarea)". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 43 reglas superadas) | ✅ Aprobado | [dialogo-confirmacion.json](axe/dialogo-confirmacion.json)<br>[axe-dialogo-confirmacion.png](axe/axe-dialogo-confirmacion.png) |
| A11Y-12 | accesibilidad | axe-core WCAG 2.2 AA – Ayuda y preguntas frecuentes (/ayuda) | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Ayuda y preguntas frecuentes (/ayuda)". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 42 reglas superadas) | ✅ Aprobado | [ayuda.json](axe/ayuda.json)<br>[axe-ayuda.png](axe/axe-ayuda.png) |
| A11Y-13 | accesibilidad | axe-core WCAG 2.2 AA – Preferencias (/preferencias) | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Preferencias (/preferencias)". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 39 reglas superadas) | ✅ Aprobado | [preferencias.json](axe/preferencias.json)<br>[axe-preferencias.png](axe/axe-preferencias.png) |
| A11Y-14 | accesibilidad | axe-core WCAG 2.2 AA – Panel de atajos de teclado (tecla ?) | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Panel de atajos de teclado (tecla ?)". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 41 reglas superadas) | ✅ Aprobado | [panel-atajos.json](axe/panel-atajos.json)<br>[axe-panel-atajos.png](axe/axe-panel-atajos.png) |
| A11Y-15 | accesibilidad | axe-core WCAG 2.2 AA – Tablero en modo alto contraste | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Tablero en modo alto contraste". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 42 reglas superadas) | ✅ Aprobado | [tablero-alto-contraste.json](axe/tablero-alto-contraste.json)<br>[axe-tablero-alto-contraste.png](axe/axe-tablero-alto-contraste.png) |
| A11Y-16 | accesibilidad | axe-core WCAG 2.2 AA – Inicio en modo alto contraste | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Inicio en modo alto contraste". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 34 reglas superadas) | ✅ Aprobado | [inicio-alto-contraste.json](axe/inicio-alto-contraste.json)<br>[axe-inicio-alto-contraste.png](axe/axe-inicio-alto-contraste.png) |
| A11Y-17 | accesibilidad | axe-core WCAG 2.2 AA – Tablero con texto "muy grande" | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Tablero con texto "muy grande"". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 43 reglas superadas) | ✅ Aprobado | [tablero-texto-muy-grande.json](axe/tablero-texto-muy-grande.json)<br>[axe-tablero-texto-muy-grande.png](axe/axe-tablero-texto-muy-grande.png) |
| A11Y-18 | accesibilidad | axe-core WCAG 2.2 AA – Preferencias con texto "grande" + reducir animaciones | Detectar automáticamente incumplimientos WCAG 2.0/2.1/2.2 nivel A y AA en "Preferencias con texto "grande" + reducir animaciones". | 0 violaciones de criterios WCAG A/AA (las de "buenas prácticas" se informan pero no hacen fallar el caso). | 0 violaciones (axe 4.14.0, 39 reglas superadas) | ✅ Aprobado | [preferencias-texto-grande.json](axe/preferencias-texto-grande.json)<br>[axe-preferencias-texto-grande.png](axe/axe-preferencias-texto-grande.png) |
| LH-01 | accesibilidad | Lighthouse Login – Escritorio | Medir accesibilidad, buenas prácticas, rendimiento y SEO de Login en escritorio. | Accesibilidad ≥ 90 y la página auditada es la solicitada (sesión válida). | A11y 100 · BP 100 · Rend. 99 · SEO 91 (LCP 0,7 s, CLS 0) · auditorías no superadas: robots-txt | ✅ Aprobado | [login-escritorio.html](lighthouse/login-escritorio.html)<br>[login-escritorio.json](lighthouse/login-escritorio.json) |
| LH-02 | accesibilidad | Lighthouse Login – Móvil | Medir accesibilidad, buenas prácticas, rendimiento y SEO de Login en móvil. | Accesibilidad ≥ 90 y la página auditada es la solicitada (sesión válida). | A11y 100 · BP 100 · Rend. 75 · SEO 91 (LCP 2,3 s, CLS 0) · auditorías no superadas: robots-txt | ✅ Aprobado | [login-movil.html](lighthouse/login-movil.html)<br>[login-movil.json](lighthouse/login-movil.json) |
| LH-03 | accesibilidad | Lighthouse Inicio (Mis equipos) – Escritorio | Medir accesibilidad, buenas prácticas, rendimiento y SEO de Inicio (Mis equipos) en escritorio. | Accesibilidad ≥ 90 y la página auditada es la solicitada (sesión válida). | A11y 100 · BP 100 · Rend. 98 · SEO 91 (LCP 0,6 s, CLS 0) · auditorías no superadas: robots-txt | ✅ Aprobado | [inicio-escritorio.html](lighthouse/inicio-escritorio.html)<br>[inicio-escritorio.json](lighthouse/inicio-escritorio.json) |
| LH-04 | accesibilidad | Lighthouse Inicio (Mis equipos) – Móvil | Medir accesibilidad, buenas prácticas, rendimiento y SEO de Inicio (Mis equipos) en móvil. | Accesibilidad ≥ 90 y la página auditada es la solicitada (sesión válida). | A11y 100 · BP 100 · Rend. 71 · SEO 91 (LCP 2,6 s, CLS 0) · auditorías no superadas: robots-txt | ✅ Aprobado | [inicio-movil.html](lighthouse/inicio-movil.html)<br>[inicio-movil.json](lighthouse/inicio-movil.json) |
| LH-05 | accesibilidad | Lighthouse Tablero Kanban – Escritorio | Medir accesibilidad, buenas prácticas, rendimiento y SEO de Tablero Kanban en escritorio. | Accesibilidad ≥ 90 y la página auditada es la solicitada (sesión válida). | A11y 100 · BP 100 · Rend. 97 · SEO 91 (LCP 0,7 s, CLS 0) · auditorías no superadas: robots-txt | ✅ Aprobado | [tablero-escritorio.html](lighthouse/tablero-escritorio.html)<br>[tablero-escritorio.json](lighthouse/tablero-escritorio.json) |
| LH-06 | accesibilidad | Lighthouse Tablero Kanban – Móvil | Medir accesibilidad, buenas prácticas, rendimiento y SEO de Tablero Kanban en móvil. | Accesibilidad ≥ 90 y la página auditada es la solicitada (sesión válida). | A11y 100 · BP 100 · Rend. 74 · SEO 91 (LCP 2,6 s, CLS 0) · auditorías no superadas: robots-txt | ✅ Aprobado | [tablero-movil.html](lighthouse/tablero-movil.html)<br>[tablero-movil.json](lighthouse/tablero-movil.json) |
| TEC-01 | teclado | Enlace "Saltar al contenido" | Comprobar que el primer Tab muestra el enlace de salto y que al activarlo el siguiente Tab cae dentro del contenido principal (WCAG 2.4.1). | Primer foco = "Saltar al contenido", visible; tras Enter, el siguiente foco está dentro de <main> y no en la barra de navegación. | Primer foco: "Saltar al contenido" (visible); hash=#contenido; siguiente foco: "Nuevo equipo" dentro de <main>. | ✅ Aprobado | [tec01-saltar-al-contenido.png](teclado/tec01-saltar-al-contenido.png) |
| TEC-02 | teclado | Orden de tabulación en "Mis equipos" | Verificar que con Tab se alcanzan las acciones principales en un orden lógico (navegación → contenido) (WCAG 2.1.1, 2.4.3). | Se alcanzan "Nuevo equipo", el buscador y la tarjeta de equipo; la navegación aparece antes que el contenido. | 12 paradas de foco. Nuevo equipo: sí; buscador: sí; tarjeta de equipo: sí; orden nav(2) → main(8). Secuencia: Saltar al contenido › TaskFlow, ir al inicio › Inicio › Ayuda › Preferencias › Ver atajos de teclado › Salir › Nuevo equipo › Ver la guía de ayuda › Ocultar la lista de primeros pasos › Buscar equipo… › Equipo Accesibilidad QA Líder Líder: Laura Líder 2 miembros Abrir | ✅ Aprobado | [tec02-foco-tarjeta-equipo.png](teclado/tec02-foco-tarjeta-equipo.png) |
| TEC-03 | teclado | Foco visible en todos los elementos enfocables | Comprobar con estilos calculados (outline / box-shadow / borde / fondo) que cada parada de foco muestra un indicador visible (WCAG 2.4.7). | 100 % de las paradas de foco con indicador visible distinto del estado sin foco. | 40/40 paradas con indicador visible (inicio 12, tablero 28). | ✅ Aprobado | [tec03-foco-visible-asa-tarea.png](teclado/tec03-foco-visible-asa-tarea.png)<br>[tec02-foco-tarjeta-equipo.png](teclado/tec02-foco-tarjeta-equipo.png) |
| TEC-04 | teclado | Acciones del tablero alcanzables con Tab | Verificar que todas las acciones del tablero (crear, buscar, arrastrar, abrir detalle, asignar, agregar en columna) son operables con teclado (WCAG 2.1.1). | Se alcanzan: Nueva tarea, Buscar tareas, Arrastrar tarea, Abrir detalle de tarea (data-testid="abrir-tarea"), Asignar miembros, Agregar tarea en. | Todas alcanzadas en 28 paradas de foco. | ✅ Aprobado | [tec03-foco-visible-asa-tarea.png](teclado/tec03-foco-visible-asa-tarea.png) |
| TEC-05 | teclado | Modal "Crear tarea": foco atrapado, Esc cierra y el foco vuelve | Comprobar que el modal recibe el foco al abrirse, lo retiene con Tab/Shift+Tab, se cierra con Esc y devuelve el foco al botón que lo abrió (WCAG 2.1.2, 2.4.3). | Foco inicial dentro del diálogo; 20 tabulaciones sin salir; Esc cierra; foco vuelve a "Nueva tarea". | Foco inicial: "Ej: Diseñar la pantalla de inicio" (dentro del diálogo); salidas del diálogo: 0; Esc cierra; foco tras cerrar: "Nueva tarea". | ✅ Aprobado | [tec05-modal-crear-tarea-foco.png](teclado/tec05-modal-crear-tarea-foco.png) |
| TEC-06 | teclado | Detalle de tarea y confirmación de borrado con teclado | Abrir el detalle con Enter, llegar a "Eliminar" con Tab, ver la confirmación y cancelarla con Esc sin borrar nada (prevención de errores operable con teclado). | Detalle abierto; confirmación (alertdialog) con foco dentro; Esc cancela; la tarea sigue existiendo (4 tareas). | Detalle: abierto; "Eliminar" alcanzado: sí; confirmación: abierta (foco en "Cerrar ventana (Esc)"); Esc cancela; tareas en servidor: 4. | ✅ Aprobado | [tec06-confirmacion-teclado.png](teclado/tec06-confirmacion-teclado.png) |
| TEC-07 | teclado | Mover una tarea entre columnas solo con teclado | Verificar la alternativa de teclado al arrastre: Espacio para levantar la tarjeta, flechas para moverla y Espacio para soltar (WCAG 2.1.1, 2.5.7). | La tarea pasa de "Por Hacer" a "En Progreso" y el cambio se guarda en el servidor. | Foco en "Arrastrar tarea Diseñar pantalla de inicio"; Espacio → Flecha derecha → Espacio; en el servidor la tarea pasó de "Por Hacer" a "En Progreso". Aviso visible: "Listo "Diseñar pantalla de inicio" movida a En Progreso. Deshacer". | ✅ Aprobado | [tec07a-asa-enfocada.png](teclado/tec07a-asa-enfocada.png)<br>[tec07b-moviendo-con-flechas.png](teclado/tec07b-moviendo-con-flechas.png)<br>[tec07c-tarea-soltada.png](teclado/tec07c-tarea-soltada.png) |
| TEC-11 | teclado | Instrucciones y anuncios del arrastre en español (lector de pantalla) | Comprobar que las instrucciones de uso del asa de arrastre (aria-describedby) y los anuncios aria-live de la librería de arrastre están en el idioma de la página (WCAG 3.1.2 / 4.1.3). | Textos en español (p. ej. "Para mover la tarea con el teclado: pulsa Espacio…") y un anuncio final que nombra la tarea y la columna destino, sin identificadores internos. | Instrucciones: "Para mover la tarea con el teclado: pulsa Espacio para levantarla, usa las flechas izquierda y derecha para cambiar de columna y pulsa Espac"; último anuncio: "Has movido "Diseñar pantalla de inicio" a En Progreso."; el anuncio nombra la tarea y la columna destino. | ✅ Aprobado | [tec07c-tarea-soltada.png](teclado/tec07c-tarea-soltada.png) |
| TEC-08 | teclado | Atajos de teclado (/, ?, n, h) | Comprobar los aceleradores para usuarios expertos documentados en la Ayuda (heurística 7 de Nielsen). | "/" enfoca la búsqueda; "?" abre el panel de atajos; "n" abre "Crear nueva tarea"; "h" navega a /ayuda. | "/" → foco en "Buscar tareas… (/)"; "?" → "Atajos de teclado"; "n" → "Crear nueva tarea"; "h" → /ayuda. | ✅ Aprobado | [tec08-panel-atajos.png](teclado/tec08-panel-atajos.png) |
| TEC-09 | teclado | Iniciar sesión solo con teclado | Completar el formulario de login usando Tab, escritura y Enter. | Se llega al campo de correo con Tab, Enter envía el formulario y se accede a "Mis equipos". | Campo de correo alcanzado en 1 Tab(s); tras Enter la ruta es / y el título de pestaña "Mis equipos · TaskFlow". | ✅ Aprobado | [tec09-login-teclado.png](teclado/tec09-login-teclado.png) |
| TEC-10 | teclado | Esc cierra todas las ventanas modales | Verificar el "control y libertad del usuario": cualquier ventana se puede abandonar con Esc. | Las 6 ventanas (Nuevo equipo, Invitar miembro, Nuevo proyecto, Asignar miembros, Detalle de tarea, Atajos) se cierran con Esc. | Las 6 ventanas se cierran con Esc. | ✅ Aprobado |  |
| VIS-01 | visual | Diseño adaptable sin desbordamiento – Login | Comprobar que "Login" se adapta a móvil, tablet y escritorio sin barra de desplazamiento horizontal (WCAG 1.4.10). | document.scrollWidth ≤ window.innerWidth en 390, 768 y 1366 px. | Móvil: 390/390px · Tablet: 768/768px · Escritorio: 1366/1366px | ✅ Aprobado | [login-movil.png](capturas/login-movil.png)<br>[login-tablet.png](capturas/login-tablet.png)<br>[login-escritorio.png](capturas/login-escritorio.png) |
| VIS-02 | visual | Diseño adaptable sin desbordamiento – Registro | Comprobar que "Registro" se adapta a móvil, tablet y escritorio sin barra de desplazamiento horizontal (WCAG 1.4.10). | document.scrollWidth ≤ window.innerWidth en 390, 768 y 1366 px. | Móvil: 390/390px · Tablet: 768/768px · Escritorio: 1366/1366px | ✅ Aprobado | [register-movil.png](capturas/register-movil.png)<br>[register-tablet.png](capturas/register-tablet.png)<br>[register-escritorio.png](capturas/register-escritorio.png) |
| VIS-03 | visual | Diseño adaptable sin desbordamiento – Privacidad | Comprobar que "Privacidad" se adapta a móvil, tablet y escritorio sin barra de desplazamiento horizontal (WCAG 1.4.10). | document.scrollWidth ≤ window.innerWidth en 390, 768 y 1366 px. | Móvil: 390/390px · Tablet: 768/768px · Escritorio: 1366/1366px | ✅ Aprobado | [privacidad-movil.png](capturas/privacidad-movil.png)<br>[privacidad-tablet.png](capturas/privacidad-tablet.png)<br>[privacidad-escritorio.png](capturas/privacidad-escritorio.png) |
| VIS-04 | visual | Diseño adaptable sin desbordamiento – Inicio | Comprobar que "Inicio" se adapta a móvil, tablet y escritorio sin barra de desplazamiento horizontal (WCAG 1.4.10). | document.scrollWidth ≤ window.innerWidth en 390, 768 y 1366 px. | Móvil: 390/390px · Tablet: 768/768px · Escritorio: 1366/1366px | ✅ Aprobado | [inicio-movil.png](capturas/inicio-movil.png)<br>[inicio-tablet.png](capturas/inicio-tablet.png)<br>[inicio-escritorio.png](capturas/inicio-escritorio.png) |
| VIS-05 | visual | Diseño adaptable sin desbordamiento – Equipo | Comprobar que "Equipo" se adapta a móvil, tablet y escritorio sin barra de desplazamiento horizontal (WCAG 1.4.10). | document.scrollWidth ≤ window.innerWidth en 390, 768 y 1366 px. | Móvil: 390/390px · Tablet: 768/768px · Escritorio: 1366/1366px | ✅ Aprobado | [equipo-movil.png](capturas/equipo-movil.png)<br>[equipo-tablet.png](capturas/equipo-tablet.png)<br>[equipo-escritorio.png](capturas/equipo-escritorio.png) |
| VIS-06 | visual | Diseño adaptable sin desbordamiento – Tablero | Comprobar que "Tablero" se adapta a móvil, tablet y escritorio sin barra de desplazamiento horizontal (WCAG 1.4.10). | document.scrollWidth ≤ window.innerWidth en 390, 768 y 1366 px. | Móvil: 390/390px · Tablet: 768/768px · Escritorio: 1366/1366px | ✅ Aprobado | [tablero-movil.png](capturas/tablero-movil.png)<br>[tablero-tablet.png](capturas/tablero-tablet.png)<br>[tablero-escritorio.png](capturas/tablero-escritorio.png) |
| VIS-07 | visual | Diseño adaptable sin desbordamiento – Ayuda | Comprobar que "Ayuda" se adapta a móvil, tablet y escritorio sin barra de desplazamiento horizontal (WCAG 1.4.10). | document.scrollWidth ≤ window.innerWidth en 390, 768 y 1366 px. | Móvil: 390/390px · Tablet: 768/768px · Escritorio: 1366/1366px | ✅ Aprobado | [ayuda-movil.png](capturas/ayuda-movil.png)<br>[ayuda-tablet.png](capturas/ayuda-tablet.png)<br>[ayuda-escritorio.png](capturas/ayuda-escritorio.png) |
| VIS-08 | visual | Diseño adaptable sin desbordamiento – Preferencias | Comprobar que "Preferencias" se adapta a móvil, tablet y escritorio sin barra de desplazamiento horizontal (WCAG 1.4.10). | document.scrollWidth ≤ window.innerWidth en 390, 768 y 1366 px. | Móvil: 390/390px · Tablet: 768/768px · Escritorio: 1366/1366px | ✅ Aprobado | [preferencias-movil.png](capturas/preferencias-movil.png)<br>[preferencias-tablet.png](capturas/preferencias-tablet.png)<br>[preferencias-escritorio.png](capturas/preferencias-escritorio.png) |
| VIS-09 | visual | Reflow a 320 px (equivalente a zoom 400 %) | Verificar que todas las páginas pueden leerse a 320 px de ancho sin desplazamiento horizontal (WCAG 1.4.10 Reflow). | Ninguna página desborda a 320 px (el tablero puede desplazar sus columnas dentro de su propia región). | Las 8 páginas caben en 320 px. | ✅ Aprobado |  |
| VIS-10 | visual | Tamaño mínimo de texto (≥ 14 px) | Muestrear el font-size calculado de todos los textos visibles (escritorio) y comprobar que no hay texto menor de 14 px (antes se usaban 12 px). | 0 elementos de texto visibles con font-size < 14 px; cuerpo ≥ 16 px. | 270 textos muestreados en 8 páginas; 0 con < 14 px; cuerpo 16px; mínimo 14px. | ✅ Aprobado |  |
| VIS-11 | visual | Contraste de color en 3 viewports (axe color-contrast) | Verificar con axe-core que todo el texto alcanza 4.5:1 (3:1 en texto grande) en móvil, tablet y escritorio (WCAG 1.4.3). | 0 nodos con contraste insuficiente en las 8 páginas × 3 viewports. | 0 nodos con contraste insuficiente en 24 combinaciones página×viewport. | ✅ Aprobado |  |
| VIS-12 | accesibilidad | axe-core WCAG A/AA en móvil y tablet | Repetir la auditoría automática en los viewports móvil (390 px) y tablet (768 px), donde la barra de navegación cambia (enlaces solo con icono). | 0 violaciones WCAG A/AA en las 8 páginas en móvil y tablet. | 0 violaciones WCAG A/AA en 16 combinaciones página×viewport. | ✅ Aprobado |  |
| VIS-13 | visual | Preferencias "Alto contraste" + "Texto muy grande" se aplican | Comprobar que las preferencias de accesibilidad cambian realmente los estilos calculados y el diseño sigue sin desbordar (WCAG 1.4.4 Redimensionar texto). | html font-size 16px → 20px; texto gris secundario → #111 (rgb 17,17,17); fondo blanco; sin desbordamiento horizontal. | Normal: font 16px, gris oklch(0.373 0.034 259.733), fondo rgb(243, 244, 246). Preferencias activas: font 20px, gris rgb(17, 17, 17), fondo rgb(255, 255, 255); scrollWidth 1366/1366. | ✅ Aprobado | [tablero-alto-contraste-texto-muy-grande.png](capturas/tablero-alto-contraste-texto-muy-grande.png) |
| VIS-14 | visual | Regresión visual (pixelmatch) entre dos ejecuciones | Comparar píxel a píxel la UI de escritorio contra una línea base para detectar cambios visuales no intencionados. | Diferencia ≤ 0.5 % en cada página (UI estable ≈ 0 %). | Login: 0% · Registro: 0.057% · Privacidad: 0% · Inicio: 0% · Equipo: 0.041% · Tablero: 0.001% · Ayuda: 0% · Preferencias: 0.022% (línea base de una ejecución anterior). | ✅ Aprobado | [register.png](visual/diff/register.png)<br>[equipo.png](visual/diff/equipo.png)<br>[tablero.png](visual/diff/tablero.png)<br>[preferencias.png](visual/diff/preferencias.png)<br>[login.png](visual/base/login.png) |
| VIS-15 | visual | Navegación en móvil con etiquetas de texto visibles | Comprobar que en móvil (390 px) los enlaces "Inicio" y "Preferencias" muestran texto visible y no dependen solo de un icono con title, que no se ve en pantallas táctiles (heurística 6, reconocimiento antes que recuerdo). | Los enlaces a / y /preferencias de la barra de navegación muestran el texto "Inicio" y "Preferencias" a 390 px. | Enlace a /: texto visible "Inicio"; enlace a /preferencias: texto visible "Preferencias". | ✅ Aprobado | [nav-movil.png](capturas/nav-movil.png) |
| RUT-01 | recorrido | Recorrido: Registrarse | Crear una cuenta nueva desde /register. | Tras enviar, se llega a /login con el aviso "Cuenta creada correctamente" y el correo ya escrito. | Completado en 5 acciones de usuario y 3 s. Ruta /login, aviso de éxito visible y correo precargado: sí. | ✅ Aprobado | [rut-01-registrarse.png](recorrido/rut-01-registrarse.png) |
| RUT-02 | recorrido | Recorrido: Iniciar sesión | Entrar con la cuenta recién creada. | Se accede a "Mis equipos" con la guía de primeros pasos (0 de 4). | Completado en 2 acciones de usuario y 0.8 s. Título de pestaña "Mis equipos · TaskFlow"; guía: "0 de 4 completados". | ✅ Aprobado | [rut-02-iniciar-sesión.png](recorrido/rut-02-iniciar-sesión.png) |
| RUT-03 | recorrido | Recorrido: Crear equipo | Crear el primer equipo desde el inicio. | El equipo aparece en la lista y un aviso confirma la creación con acceso directo "Abrir equipo". | Completado en 4 acciones de usuario y 2.7 s. Aviso con acción "Abrir equipo" mostrado; abierta la vista del equipo (título "Equipo Recorrido 54510 · TaskFlow"). | ✅ Aprobado | [rut-03-crear-equipo.png](recorrido/rut-03-crear-equipo.png) |
| RUT-04 | recorrido | Recorrido: Invitar compañero | Añadir a un compañero registrado buscándolo por correo. | Se encuentra al usuario, se añade y aparece en la lista de miembros. | Completado en 4 acciones de usuario y 3.4 s. Compañero visible en la lista de miembros y guardado en el servidor. | ✅ Aprobado | [rut-04-invitar-compañero.png](recorrido/rut-04-invitar-compañero.png) |
| RUT-05 | recorrido | Recorrido: Crear proyecto | Crear un proyecto dentro del equipo y abrir su tablero. | El proyecto aparece y al abrirlo se ve el tablero con las columnas Por Hacer / En Progreso / Hecho. | Completado en 4 acciones de usuario y 2.7 s. Tablero abierto. Columnas: Por Hacer / En Progreso / Hecho. Migas: "Mis equipos Equipo Recorrido 54510 Proyecto Lanzamiento". | ✅ Aprobado | [rut-05-crear-proyecto.png](recorrido/rut-05-crear-proyecto.png) |
| RUT-06 | recorrido | Recorrido: Crear tarea | Crear una tarea en el tablero. | La tarjeta aparece en "Por Hacer" y un aviso confirma la creación. | Completado en 3 acciones de usuario y 1.5 s. Tarjeta visible. Aviso: "Listo Tarea "Preparar presentación" creada en Por Hacer.". | ✅ Aprobado | [rut-06-crear-tarea.png](recorrido/rut-06-crear-tarea.png) |
| RUT-07 | recorrido | Recorrido: Mover tarea con el ratón | Arrastrar la tarjeta de "Por Hacer" a "Hecho" con el ratón. | La tarea queda en "Hecho", el progreso pasa a 100 % y se ofrece "Deshacer". | Completado en 1 acciones de usuario y 2.9 s. En el servidor la tarea está en "Hecho". Progreso: "1 de 1 tareas hechas (100%)". Botón "Deshacer": sí. | ✅ Aprobado | [rut-07-mover-tarea-con-el-ratón.png](recorrido/rut-07-mover-tarea-con-el-ratón.png) |
| RUT-08 | recorrido | Recorrido: Deshacer el movimiento | Usar "Deshacer" del aviso para revertir el último movimiento (control y libertad del usuario). | La tarea vuelve a "Por Hacer". | Completado en 1 acciones de usuario y 2.1 s. La tarea volvió a "Por Hacer". | ✅ Aprobado | [rut-08-deshacer-el-movimiento.png](recorrido/rut-08-deshacer-el-movimiento.png) |
| RUT-09 | recorrido | Recorrido: Recargar sin perder la sesión | Recargar el tablero (F5) y comprobar que no se vuelve al login (problema del estado anterior). | Tras recargar, se sigue en el mismo tablero. | Completado en 1 acciones de usuario y 1.9 s. Ruta tras recargar: /proyectos/0378ff47-d5b4-4ef8-8ce6-fba0b8fcd275; título "Proyecto Lanzamiento · TaskFlow". | ✅ Aprobado | [rut-09-recargar-sin-perder-la-sesión.png](recorrido/rut-09-recargar-sin-perder-la-sesión.png) |
| RUT-10 | recorrido | Recorrido completo registrarse → mover tarea | Medir la tasa de éxito y el esfuerzo (acciones) del recorrido principal de un usuario nuevo. | 100 % de las 9 tareas completadas sin ayuda externa. | Éxito 9/9 (100 %); 25 acciones de usuario; 21.0 s de ejecución automatizada. | ✅ Aprobado |  |
| UX-01 | recorrido | Sin conexión: aviso, error con código y borrador conservado | Simular la pérdida de red en el tablero e intentar crear una tarea (heurísticas 1 y 9; antes los errores solo iban a la consola). | Banner "Sin conexión"; al crear, aviso de error en español con código TF-RED; el texto escrito se conserva como borrador al volver la conexión. | Banner: "Sin conexión a internet. Los cambios no se guardarán hasta q…"; aviso: "No se pudo crear la tarea: No hay conexión con el servidor. Revisa tu conexión a internet e inténtalo de nuevo. Código de referencia: TF-RED"; borrador tras reabrir: "Tarea escrita sin conexión". | ✅ Aprobado | [ux-sin-conexion-error.png](recorrido/ux-sin-conexion-error.png)<br>[ux-01.png](recorrido/ux-01.png) |
| UX-02 | recorrido | Búsqueda de tareas tolerante a errores de escritura | Comprobar que el buscador del tablero encuentra tareas aunque se escriba sin tildes o con una errata (heurística 6, antes no había búsqueda). | "presentasion" encuentra "Preparar presentación"; un término inexistente no muestra tareas y explica el estado vacío. | "presentasion" → encuentra la tarea (Mostrando 1 de 1 tareas); "zzqqxx" → 0 resultados (Mostrando 0 de 1 tareas). | ✅ Aprobado | [ux-02.png](recorrido/ux-02.png) |
| UX-03 | recorrido | Ayuda: buscador de preguntas frecuentes | Verificar que la ayuda responde a una duda escrita con palabras del usuario y sin tildes (heurística 10; antes no existía ayuda). | La consulta "como muevo una tarea" muestra al menos una respuesta sobre mover tareas. | 1 respuesta(s): "¿Cómo muevo una tarea de columna?". | ✅ Aprobado | [ux-03.png](recorrido/ux-03.png) |
| UX-04 | recorrido | Confirmación antes de cerrar sesión | Comprobar que "Salir" pide confirmación y que cancelar mantiene la sesión (heurística 5). | Aparece un diálogo "¿Cerrar sesión?"; al cancelar se sigue en la misma página con sesión. | Diálogo: "¿Cerrar sesión?"; tras cancelar la sesión se mantiene. | ✅ Aprobado | [ux-confirmar-salir.png](recorrido/ux-confirmar-salir.png)<br>[ux-04.png](recorrido/ux-04.png) |
| UX-05 | visual | Título de pestaña distinto en cada página | Comprobar que el título del documento identifica la página (WCAG 2.4.2; antes siempre "taskflow-frontend"). | Cada página tiene un título único con el formato "<sección> · TaskFlow". | "Mis equipos · TaskFlow", "Equipo Recorrido 54510 · TaskFlow", "Proyecto Lanzamiento · TaskFlow", "Ayuda · TaskFlow", "Preferencias · TaskFlow", "Privacidad · TaskFlow" | ✅ Aprobado | [ux-05.png](recorrido/ux-05.png) |
| UX-06 | visual | Columnas del tablero diferenciadas por color | Verificar que "Por Hacer", "En Progreso" y "Hecho" tienen colores distintos (antes "Por Hacer" y "Hecho" compartían color). | 3 colores de fondo de columna distintos. | Por Hacer: oklch(0.968 0.007 247.896) · En Progreso: oklch(0.97 0.014 254.604) · Hecho: oklch(0.982 0.018 155.826) | ✅ Aprobado | [ux-06.png](recorrido/ux-06.png) |
| UX-07 | recorrido | Bloqueo de inicio de sesión tras 5 intentos explica qué hacer | Comprobar que, tras 5 contraseñas incorrectas, el mensaje explica el bloqueo y cuánto esperar, en español y con código (heurística 9). | Intentos 1-5: "El correo o la contraseña no son correctos…"; intento 6: "Demasiados intentos fallidos… espera N minuto(s)" con código TF-429. | Intento 1: "El correo o la contraseña no son correctos. Revísalos e inténtalo de nuevo.". Intento 6: "No se pudo iniciar sesión: Demasiados intentos fallidos. Por seguridad, espera 15 minuto(s) antes de volver a intentarlo. Código de referencia: TF-429". | ✅ Aprobado | [ux-07.png](recorrido/ux-07.png) |
| UX-08 | recorrido | Mensajes de validación del servidor en español | Enviar datos inválidos directamente a la API (como haría un cliente sin validación previa) y comprobar el idioma de los mensajes (antes llegaban en inglés: "email must be an email"). | Todos los mensajes de validación en español, sin textos de class-validator en inglés. | HTTP 400: "El nombre es obligatorio", "El correo electrónico no tiene un formato válido (ejemplo: nombre@correo.com)", "La contraseña debe contener al menos una letra", "La contraseña debe tener al menos 8 caracteres" | ✅ Aprobado |  |

## 3. Accesibilidad automática (axe-core)

Nodos afectados por impacto (suma de todos los estados): **critical 0 · serious 0 · moderate 0 · minor 0**.

| Página / estado | critical | serious | moderate | minor | Reglas incumplidas | JSON |
| --- | --- | --- | --- | --- | --- | --- |
| Iniciar sesión (/login) | 0 | 0 | 0 | 0 | — | [login.json](axe/login.json) |
| Registro (/register) | 0 | 0 | 0 | 0 | — | [register.json](axe/register.json) |
| Privacidad (/privacidad) | 0 | 0 | 0 | 0 | — | [privacidad.json](axe/privacidad.json) |
| Inicio sin equipos (/) | 0 | 0 | 0 | 0 | — | [inicio-vacio.json](axe/inicio-vacio.json) |
| Inicio con equipos (/) | 0 | 0 | 0 | 0 | — | [inicio-equipos.json](axe/inicio-equipos.json) |
| Vista de equipo (/equipos/:id) | 0 | 0 | 0 | 0 | — | [equipo.json](axe/equipo.json) |
| Modal "Invitar miembro" | 0 | 0 | 0 | 0 | — | [modal-invitar.json](axe/modal-invitar.json) |
| Tablero Kanban con tareas (/proyectos/:id) | 0 | 0 | 0 | 0 | — | [tablero.json](axe/tablero.json) |
| Modal de detalle de tarea | 0 | 0 | 0 | 0 | — | [modal-detalle-tarea.json](axe/modal-detalle-tarea.json) |
| Modal "Crear nueva tarea" | 0 | 0 | 0 | 0 | — | [modal-crear-tarea.json](axe/modal-crear-tarea.json) |
| Diálogo de confirmación (eliminar tarea) | 0 | 0 | 0 | 0 | — | [dialogo-confirmacion.json](axe/dialogo-confirmacion.json) |
| Ayuda y preguntas frecuentes (/ayuda) | 0 | 0 | 0 | 0 | — | [ayuda.json](axe/ayuda.json) |
| Preferencias (/preferencias) | 0 | 0 | 0 | 0 | — | [preferencias.json](axe/preferencias.json) |
| Panel de atajos de teclado (tecla ?) | 0 | 0 | 0 | 0 | — | [panel-atajos.json](axe/panel-atajos.json) |
| Tablero en modo alto contraste | 0 | 0 | 0 | 0 | — | [tablero-alto-contraste.json](axe/tablero-alto-contraste.json) |
| Inicio en modo alto contraste | 0 | 0 | 0 | 0 | — | [inicio-alto-contraste.json](axe/inicio-alto-contraste.json) |
| Tablero con texto "muy grande" | 0 | 0 | 0 | 0 | — | [tablero-texto-muy-grande.json](axe/tablero-texto-muy-grande.json) |
| Preferencias con texto "grande" + reducir animaciones | 0 | 0 | 0 | 0 | — | [preferencias-texto-grande.json](axe/preferencias-texto-grande.json) |

No se detectaron violaciones.

## 4. Lighthouse

| Página | Dispositivo | Accesibilidad | Buenas prácticas | Rendimiento | SEO | LCP | CLS | Auditorías no superadas | Informe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Login | Escritorio | 100 | 100 | 99 | 91 | 0,7 s | 0 | robots-txt | [login-escritorio.html](lighthouse/login-escritorio.html) |
| Login | Móvil | 100 | 100 | 75 | 91 | 2,3 s | 0 | robots-txt | [login-movil.html](lighthouse/login-movil.html) |
| Inicio (Mis equipos) | Escritorio | 100 | 100 | 98 | 91 | 0,6 s | 0 | robots-txt | [inicio-escritorio.html](lighthouse/inicio-escritorio.html) |
| Inicio (Mis equipos) | Móvil | 100 | 100 | 71 | 91 | 2,6 s | 0 | robots-txt | [inicio-movil.html](lighthouse/inicio-movil.html) |
| Tablero Kanban | Escritorio | 100 | 100 | 97 | 91 | 0,7 s | 0 | robots-txt | [tablero-escritorio.html](lighthouse/tablero-escritorio.html) |
| Tablero Kanban | Móvil | 100 | 100 | 74 | 91 | 2,6 s | 0 | robots-txt | [tablero-movil.html](lighthouse/tablero-movil.html) |

> El rendimiento se mide contra el servidor de desarrollo de Vite (código sin minificar y con HMR); sirve para comparar, no como valor de producción.

## 5. Navegación con teclado

| ID | Comprobación | Obtenido | Estado |
| --- | --- | --- | --- |
| TEC-01 | Enlace "Saltar al contenido" | Primer foco: "Saltar al contenido" (visible); hash=#contenido; siguiente foco: "Nuevo equipo" dentro de <main>. | Aprobado |
| TEC-02 | Orden de tabulación en "Mis equipos" | 12 paradas de foco. Nuevo equipo: sí; buscador: sí; tarjeta de equipo: sí; orden nav(2) → main(8). Secuencia: Saltar al contenido › TaskFlow, ir al inicio › Inicio › Ayuda › Preferencias › Ver atajos de teclado › Salir › Nuevo equipo › Ver la guía de ayuda › Ocultar la lista de primeros pasos › Buscar equipo… › Equipo Accesibilidad QA Líder Líder: Laura Líder 2 miembros Abrir | Aprobado |
| TEC-03 | Foco visible en todos los elementos enfocables | 40/40 paradas con indicador visible (inicio 12, tablero 28). | Aprobado |
| TEC-04 | Acciones del tablero alcanzables con Tab | Todas alcanzadas en 28 paradas de foco. | Aprobado |
| TEC-05 | Modal "Crear tarea": foco atrapado, Esc cierra y el foco vuelve | Foco inicial: "Ej: Diseñar la pantalla de inicio" (dentro del diálogo); salidas del diálogo: 0; Esc cierra; foco tras cerrar: "Nueva tarea". | Aprobado |
| TEC-06 | Detalle de tarea y confirmación de borrado con teclado | Detalle: abierto; "Eliminar" alcanzado: sí; confirmación: abierta (foco en "Cerrar ventana (Esc)"); Esc cancela; tareas en servidor: 4. | Aprobado |
| TEC-07 | Mover una tarea entre columnas solo con teclado | Foco en "Arrastrar tarea Diseñar pantalla de inicio"; Espacio → Flecha derecha → Espacio; en el servidor la tarea pasó de "Por Hacer" a "En Progreso". Aviso visible: "Listo "Diseñar pantalla de inicio" movida a En Progreso. Deshacer". | Aprobado |
| TEC-11 | Instrucciones y anuncios del arrastre en español (lector de pantalla) | Instrucciones: "Para mover la tarea con el teclado: pulsa Espacio para levantarla, usa las flechas izquierda y derecha para cambiar de columna y pulsa Espac"; último anuncio: "Has movido "Diseñar pantalla de inicio" a En Progreso."; el anuncio nombra la tarea y la columna destino. | Aprobado |
| TEC-08 | Atajos de teclado (/, ?, n, h) | "/" → foco en "Buscar tareas… (/)"; "?" → "Atajos de teclado"; "n" → "Crear nueva tarea"; "h" → /ayuda. | Aprobado |
| TEC-09 | Iniciar sesión solo con teclado | Campo de correo alcanzado en 1 Tab(s); tras Enter la ruta es / y el título de pestaña "Mis equipos · TaskFlow". | Aprobado |
| TEC-10 | Esc cierra todas las ventanas modales | Las 6 ventanas se cierran con Esc. | Aprobado |

<details><summary>Secuencia de foco medida (inicio y tablero)</summary>

| Página | # | Elemento | Nombre | Región | Indicador de foco |
| --- | --- | --- | --- | --- | --- |
| inicio | 1 | A | Saltar al contenido | — | outline solid 3px |
| inicio | 2 | A | TaskFlow, ir al inicio | nav | outline solid 3px |
| inicio | 3 | A | Inicio | nav | outline solid 3px |
| inicio | 4 | A | Ayuda | nav | outline solid 3px |
| inicio | 5 | A | Preferencias | nav | outline solid 3px |
| inicio | 6 | BUTTON | Ver atajos de teclado | nav | outline solid 3px |
| inicio | 7 | BUTTON | Salir | nav | outline solid 3px |
| inicio | 8 | BUTTON | Nuevo equipo | main | outline solid 3px |
| inicio | 9 | A | Ver la guía de ayuda | main | outline solid 3px |
| inicio | 10 | BUTTON | Ocultar la lista de primeros pasos | main | outline solid 3px |
| inicio | 11 | INPUT | Buscar equipo… | main | outline solid 3px |
| inicio | 12 | A | Equipo Accesibilidad QA Líder Líder: Laura Líder 2 miembros Abrir | main | outline solid 3px |
| tablero | 1 | A | Saltar al contenido | — | outline solid 3px |
| tablero | 2 | A | TaskFlow, ir al inicio | nav | outline solid 3px |
| tablero | 3 | A | Inicio | nav | outline solid 3px |
| tablero | 4 | A | Ayuda | nav | outline solid 3px |
| tablero | 5 | A | Preferencias | nav | outline solid 3px |
| tablero | 6 | BUTTON | Ver atajos de teclado | nav | outline solid 3px |
| tablero | 7 | BUTTON | Salir | nav | outline solid 3px |
| tablero | 8 | A | Mis equipos | nav | outline solid 3px |
| tablero | 9 | A | Equipo Accesibilidad QA | nav | outline solid 3px |
| tablero | 10 | BUTTON | Nueva tarea | main | outline solid 3px |
| tablero | 11 | INPUT | Buscar tareas… (/) | main | outline solid 3px |
| tablero | 12 | SELECT | Todos Sin asignar Laura Líder (tú) Mario Miembro | main | outline solid 3px |
| tablero | 13 | DIV | Columnas del tablero | main | outline solid 3px |
| tablero | 14 | DIV | Arrastrar tarea Diseñar pantalla de inicio | main | outline solid 3px |
| tablero | 15 | BUTTON | Diseñar pantalla de inicio Boceto y prototipo de la pantalla principal | main | outline solid 3px |
| tablero | 16 | BUTTON | Asignar miembros a la tarea Diseñar pantalla de inicio | main | outline solid 3px |
| tablero | 17 | DIV | Arrastrar tarea Revisar contraste de colores | main | outline solid 3px |
| tablero | 18 | BUTTON | Revisar contraste de colores Comprobar WCAG AA en botones y textos. | main | outline solid 3px |
| tablero | 19 | BUTTON | Asignar miembros a la tarea Revisar contraste de colores | main | outline solid 3px |
| tablero | 20 | BUTTON | Agregar tarea en Por Hacer | main | outline solid 3px |
| tablero | 21 | DIV | Arrastrar tarea Escribir pruebas de teclado | main | outline solid 3px |
| tablero | 22 | BUTTON | Escribir pruebas de teclado Navegación con Tab, Esc y arrastre con tec | main | outline solid 3px |
| tablero | 23 | BUTTON | Asignar miembros a la tarea Escribir pruebas de teclado | main | outline solid 3px |
| tablero | 24 | BUTTON | Agregar tarea en En Progreso | main | outline solid 3px |
| tablero | 25 | DIV | Arrastrar tarea Publicar versión 1.0 | main | outline solid 3px |
| tablero | 26 | BUTTON | Publicar versión 1.0 Despliegue en el servidor de pruebas. | main | outline solid 3px |
| tablero | 27 | BUTTON | Asignar miembros a la tarea Publicar versión 1.0 | main | outline solid 3px |
| tablero | 28 | BUTTON | Agregar tarea en Hecho | main | outline solid 3px |

</details>

## 6. Interfaz y comportamiento visual

| Página | Viewport | innerWidth | scrollWidth | ¿Desborda? | Captura |
| --- | --- | --- | --- | --- | --- |
| Login | movil | 390 | 390 | No | [login-movil.png](capturas/login-movil.png) |
| Login | tablet | 768 | 768 | No | [login-tablet.png](capturas/login-tablet.png) |
| Login | escritorio | 1366 | 1366 | No | [login-escritorio.png](capturas/login-escritorio.png) |
| Login | reflow320 | 320 | 320 | No |  |
| Registro | movil | 390 | 390 | No | [register-movil.png](capturas/register-movil.png) |
| Registro | tablet | 768 | 768 | No | [register-tablet.png](capturas/register-tablet.png) |
| Registro | escritorio | 1366 | 1366 | No | [register-escritorio.png](capturas/register-escritorio.png) |
| Registro | reflow320 | 320 | 320 | No |  |
| Privacidad | movil | 390 | 390 | No | [privacidad-movil.png](capturas/privacidad-movil.png) |
| Privacidad | tablet | 768 | 768 | No | [privacidad-tablet.png](capturas/privacidad-tablet.png) |
| Privacidad | escritorio | 1366 | 1366 | No | [privacidad-escritorio.png](capturas/privacidad-escritorio.png) |
| Privacidad | reflow320 | 320 | 320 | No |  |
| Inicio | movil | 390 | 390 | No | [inicio-movil.png](capturas/inicio-movil.png) |
| Inicio | tablet | 768 | 768 | No | [inicio-tablet.png](capturas/inicio-tablet.png) |
| Inicio | escritorio | 1366 | 1366 | No | [inicio-escritorio.png](capturas/inicio-escritorio.png) |
| Inicio | reflow320 | 320 | 320 | No |  |
| Equipo | movil | 390 | 390 | No | [equipo-movil.png](capturas/equipo-movil.png) |
| Equipo | tablet | 768 | 768 | No | [equipo-tablet.png](capturas/equipo-tablet.png) |
| Equipo | escritorio | 1366 | 1366 | No | [equipo-escritorio.png](capturas/equipo-escritorio.png) |
| Equipo | reflow320 | 320 | 320 | No |  |
| Tablero | movil | 390 | 390 | No | [tablero-movil.png](capturas/tablero-movil.png) |
| Tablero | tablet | 768 | 768 | No | [tablero-tablet.png](capturas/tablero-tablet.png) |
| Tablero | escritorio | 1366 | 1366 | No | [tablero-escritorio.png](capturas/tablero-escritorio.png) |
| Tablero | reflow320 | 320 | 320 | No |  |
| Ayuda | movil | 390 | 390 | No | [ayuda-movil.png](capturas/ayuda-movil.png) |
| Ayuda | tablet | 768 | 768 | No | [ayuda-tablet.png](capturas/ayuda-tablet.png) |
| Ayuda | escritorio | 1366 | 1366 | No | [ayuda-escritorio.png](capturas/ayuda-escritorio.png) |
| Ayuda | reflow320 | 320 | 320 | No |  |
| Preferencias | movil | 390 | 390 | No | [preferencias-movil.png](capturas/preferencias-movil.png) |
| Preferencias | tablet | 768 | 768 | No | [preferencias-tablet.png](capturas/preferencias-tablet.png) |
| Preferencias | escritorio | 1366 | 1366 | No | [preferencias-escritorio.png](capturas/preferencias-escritorio.png) |
| Preferencias | reflow320 | 320 | 320 | No |  |

### Tamaño de texto (escritorio)

| Página | Textos muestreados | < 14 px | Mínimo (px) | Cuerpo (px) |
| --- | --- | --- | --- | --- |
| Login | 9 | 0 | 14 | 16 |
| Registro | 20 | 0 | 14 | 16 |
| Privacidad | 21 | 0 | 16 | 16 |
| Inicio | 23 | 0 | 14 | 16 |
| Equipo | 30 | 0 | 14 | 16 |
| Tablero | 43 | 0 | 14 | 16 |
| Ayuda | 93 | 0 | 14 | 16 |
| Preferencias | 31 | 0 | 14 | 16 |

### Regresión visual (pixelmatch, umbral 0,5 %)

| Página | % píxeles distintos | Origen de la línea base | Base | Actual | Diferencias |
| --- | --- | --- | --- | --- | --- |
| Login | 0 | línea base de una ejecución anterior | [login.png](visual/base/login.png) | [login.png](visual/actual/login.png) | [login.png](visual/diff/login.png) |
| Registro | 0.057 | línea base de una ejecución anterior | [register.png](visual/base/register.png) | [register.png](visual/actual/register.png) | [register.png](visual/diff/register.png) |
| Privacidad | 0 | línea base de una ejecución anterior | [privacidad.png](visual/base/privacidad.png) | [privacidad.png](visual/actual/privacidad.png) | [privacidad.png](visual/diff/privacidad.png) |
| Inicio | 0 | línea base de una ejecución anterior | [inicio.png](visual/base/inicio.png) | [inicio.png](visual/actual/inicio.png) | [inicio.png](visual/diff/inicio.png) |
| Equipo | 0.041 | línea base de una ejecución anterior | [equipo.png](visual/base/equipo.png) | [equipo.png](visual/actual/equipo.png) | [equipo.png](visual/diff/equipo.png) |
| Tablero | 0.001 | línea base de una ejecución anterior | [tablero.png](visual/base/tablero.png) | [tablero.png](visual/actual/tablero.png) | [tablero.png](visual/diff/tablero.png) |
| Ayuda | 0 | línea base de una ejecución anterior | [ayuda.png](visual/base/ayuda.png) | [ayuda.png](visual/actual/ayuda.png) | [ayuda.png](visual/diff/ayuda.png) |
| Preferencias | 0.022 | línea base de una ejecución anterior | [preferencias.png](visual/base/preferencias.png) | [preferencias.png](visual/actual/preferencias.png) | [preferencias.png](visual/diff/preferencias.png) |

> La primera ejecución crea la línea base en `visual/base/`; las siguientes comparan contra ella. Para aceptar un cambio de diseño intencionado, borrar `visual/base/` y volver a ejecutar `npm run visual`.

## 7. Recorridos de usuario

| ID | Tarea | Éxito | Acciones de usuario | Tiempo (s) |
| --- | --- | --- | --- | --- |
| RUT-01 | Registrarse | Sí | 5 | 3 |
| RUT-02 | Iniciar sesión | Sí | 2 | 0.8 |
| RUT-03 | Crear equipo | Sí | 4 | 2.7 |
| RUT-04 | Invitar compañero | Sí | 4 | 3.4 |
| RUT-05 | Crear proyecto | Sí | 4 | 2.7 |
| RUT-06 | Crear tarea | Sí | 3 | 1.5 |
| RUT-07 | Mover tarea con el ratón | Sí | 1 | 2.9 |
| RUT-08 | Deshacer el movimiento | Sí | 1 | 2.1 |
| RUT-09 | Recargar sin perder la sesión | Sí | 1 | 1.9 |

**Tasa de éxito: 9/9 (100 %) · 25 acciones** para ir de "sin cuenta" a "tarea movida a Hecho". Acciones = clics, campos rellenados o teclas significativas, sin contar la navegación entre pantallas automática.

## 8. Evaluación heurística (10 heurísticas de Nielsen)

28 hallazgos: **24 corregidos** y **4 pendientes**. El estado de cada hallazgo vinculado a un caso se calcula con el resultado de ese caso.

| ID | Heurística | Hallazgo | Severidad (0-4) | Evidencia | Recomendación | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| N-01 | H1 Visibilidad del estado del sistema | Los fallos al crear equipo, proyecto o tarea solo se registraban en la consola; el usuario no recibía aviso. Ahora hay avisos (toasts) en español con código de referencia y banner de "sin conexión". | 4 | recorrido/ux-sin-conexion-error.png · caso UX-01 | Mantener: todo error de red/servidor debe mostrarse con mensaje, código y acción de recuperación. | Corregido |
| N-02 | H1 Visibilidad del estado del sistema | La pestaña del navegador siempre decía "taskflow-frontend". Ahora cada página tiene un título propio ("<sección> · TaskFlow"). | 2 | recorrido/ux-05.png · caso UX-05 | Mantener useDocumentTitle en todas las rutas nuevas (WCAG 2.4.2). | Corregido |
| N-03 | H1 Visibilidad del estado del sistema | La barra de "Progreso" era falsa (tareas / (listas × 5)). Ahora refleja las tareas en "Hecho" y se anuncia con role="progressbar" y aria-valuetext. | 3 | recorrido/rut-07-mover-tarea-con-el-ratón.png · caso RUT-07 | Mantener el cálculo real; añadir prueba unitaria del cálculo. | Corregido |
| N-04 | H2 Coincidencia entre el sistema y el mundo real | Los errores de validación del servidor llegaban en inglés ("email must be an email"). Ahora están en español. | 3 | resultados/recorrido.json · caso UX-08 | Mantener mensajes personalizados en todos los DTO de class-validator. | Corregido |
| N-05 | H2 Coincidencia entre el sistema y el mundo real | Las instrucciones y anuncios de la librería de arrastre (@hello-pangea/dnd) que oye un usuario de lector de pantalla estaban en inglés y exponían los UUID internos de las listas ("You have moved the item… in list c7eaceef-…"). Ahora están en español y nombran la tarea y la columna. | 3 | teclado/tec07c-tarea-soltada.png · caso TEC-11 | Pasar dragHandleUsageInstructions en español a <DragDropContext> y usar provided.announce en onDragStart/onDragUpdate/onDragEnd con el título de la tarea y el nombre de la columna. | Corregido |
| N-06 | H3 Control y libertad del usuario | No existía "deshacer": mover o eliminar una tarea o quitar un miembro solo se corregía rehaciéndolo a mano. Ahora el aviso ofrece "Deshacer". | 3 | recorrido/rut-08-deshacer-el-movimiento.png · caso RUT-08 | Mantener; extender a eliminar proyecto/equipo con papelera temporal. | Corregido |
| N-07 | H3 Control y libertad del usuario | Las ventanas modales no se cerraban con Esc ni retenían el foco. Ahora Esc cierra todas y el foco queda atrapado y vuelve al disparador. | 3 | teclado/tec05-modal-crear-tarea-foco.png · caso TEC-05 · caso TEC-10 | Mantener el componente Modal único para todas las ventanas. | Corregido |
| N-08 | H3 Control y libertad del usuario | Al recargar una página privada se volvía al login. Ahora la sesión se restaura de forma síncrona. | 3 | recorrido/rut-09-recargar-sin-perder-la-sesión.png · caso RUT-09 | Mantener la lectura síncrona de la sesión en useAuthStore. | Corregido |
| N-09 | H3 Control y libertad del usuario | No existe "Rehacer" y eliminar un equipo o proyecto es irreversible (aunque se confirma antes). | 1 | Excel GRIHO (mejorada), hoja 3 | Ofrecer "Deshacer" también al eliminar proyecto/equipo (borrado diferido unos segundos). | Pendiente |
| N-10 | H4 Consistencia y estándares | "Por Hacer" y "Hecho" compartían el mismo color. Ahora cada columna tiene color propio y punto de color. | 2 | capturas/tablero-escritorio.png · caso UX-06 | Mantener: cada columna combina borde superior, título y punto de color además del fondo (muy claro, oklch L≈0.97–0.98); no depender solo del color (el nombre de la columna ya lo garantiza). | Corregido |
| N-11 | H4 Consistencia y estándares | Las tarjetas de equipo, proyecto y tarea tenían un aria-label ("Abrir el tablero del proyecto X"…) que no empezaba por el texto visible, por lo que un usuario de control por voz no podía activarlas diciendo lo que ve (WCAG 2.5.3). Ahora las tres se nombran por su texto visible (data-testid="tarjeta-equipo" / "tarjeta-proyecto" / "abrir-tarea") y axe ya no lo detecta en la vista de equipo (escritorio, móvil y tablet). | 2 | axe/equipo.json · caso A11Y-06 · caso A11Y-07 · caso VIS-12 | Mantener: no añadir aria-label a enlaces/botones con texto visible; si hace falta, que empiece por ese texto. | Corregido |
| N-12 | H4 Consistencia y estándares | El aviso de éxito se titulaba "Hecho", igual que la columna "Hecho", lo que podía confundir. Ahora se titula "Listo" (aviso real capturado en TEC-07). | 1 | teclado/tec07c-tarea-soltada.png | Mantener títulos de aviso distintos de los nombres de columna. | Corregido |
| N-13 | H5 Prevención de errores | Solo se confirmaba quitar un miembro. Ahora se confirman eliminar tarea/proyecto/equipo/cuenta y cerrar sesión, con consecuencias explicadas y foco seguro en "Cerrar". | 3 | teclado/tec06-confirmacion-teclado.png · caso TEC-06 · caso UX-04 | Mantener; el foco inicial en una opción no destructiva es correcto. | Corregido |
| N-14 | H5 Prevención de errores | Lo escrito en un modal se perdía al cerrarlo. Ahora se guarda como borrador (también sin conexión). | 2 | recorrido/ux-sin-conexion-error.png · caso UX-01 | Mantener useBorrador en todos los formularios. | Corregido |
| N-15 | H5 Prevención de errores | Login sin protección ante intentos repetidos; ahora se bloquea tras 5 fallos y el mensaje explica cuánto esperar (código TF-429). | 2 | recorrido/ux-07.png · caso UX-07 | Mantener; valorar ofrecer "¿Olvidaste tu contraseña?". | Corregido |
| N-16 | H6 Reconocimiento antes que recuerdo | No había buscador ni accesos recientes. Ahora hay búsqueda tolerante a tildes y erratas, filtro por persona, recientes y migas de pan. | 2 | recorrido/ux-02.png · caso UX-02 · caso RUT-05 | Mantener. | Corregido |
| N-17 | H6 Reconocimiento antes que recuerdo | Para invitar a alguien hay que recordar su correo exacto. | 2 | Excel GRIHO (mejorada), hoja 5 | Autocompletar con personas de otros equipos del usuario o invitar por enlace. | Pendiente |
| N-18 | H6 Reconocimiento antes que recuerdo | En móvil, "Inicio" y "Preferencias" quedaban solo como icono (el nombre solo estaba en title, que no se ve en pantallas táctiles). Ahora muestran texto visible (VIS-15). | 1 | capturas/nav-movil.png · caso VIS-15 | Mostrar etiqueta corta bajo el icono o un menú desplegable con texto en móvil. | Corregido |
| N-19 | H7 Flexibilidad y eficiencia de uso | No había atajos de teclado. Ahora hay atajos (?, i, h, e, p, m, n, /) documentados y desactivables. | 2 | teclado/tec08-panel-atajos.png · caso TEC-08 | Mantener; el botón de atajos podría ocultarse en móvil (sin teclado físico). | Corregido |
| N-20 | H7 Flexibilidad y eficiencia de uso | El asa de arrastre solo aparecía al pasar el ratón. Ahora es visible y las tareas se mueven con teclado (Espacio, flechas, Espacio). | 3 | teclado/tec07b-moviendo-con-flechas.png · caso TEC-07 · caso TEC-04 | Mantener; añadir alternativa sin arrastre (menú "Mover a…") para WCAG 2.5.7. | Corregido |
| N-21 | H7 Flexibilidad y eficiencia de uso | No se puede personalizar la disposición del tablero ni el nombre/orden de las columnas. | 1 | Excel GRIHO (mejorada), hoja 13 | Permitir renombrar/reordenar columnas por proyecto. | Pendiente |
| N-22 | H8 Diseño estético y minimalista | Saludo y botón "Nuevo equipo" duplicados, manchas decorativas animadas y texto en degradado. Ahora hay un solo título y una sola acción principal, sin decoración superflua. | 1 | capturas/inicio-escritorio.png (verificado por captura) | Mantener. | Corregido |
| N-23 | H8 Diseño estético y minimalista | Texto de 12 px (text-xs) en contadores, insignias y ayudas. Ahora el tamaño mínimo es 14 px y el cuerpo 16 px. | 2 | capturas/inicio-escritorio.png · caso VIS-10 | Mantener; prohibir text-xs en el linter de estilos. | Corregido |
| N-24 | H8 Diseño estético y minimalista | Texto gris claro y degradados con contraste insuficiente. Ahora axe no detecta problemas de contraste en 24 combinaciones página×viewport y hay modo alto contraste. | 3 | capturas/tablero-alto-contraste-texto-muy-grande.png · caso VIS-11 · caso VIS-13 | Mantener la paleta oscura (gray-700/800) para texto secundario. | Corregido |
| N-25 | H8 Diseño estético y minimalista | El reset CSS global (fuera de capa) anulaba el espaciado de Tailwind (p-8, mt-4…). Ahora los estilos base están en @layer base. | 2 | capturas/equipo-escritorio.png · caso VIS-01 · caso VIS-04 · caso VIS-06 | Mantener los estilos globales dentro de @layer. | Corregido |
| N-26 | H9 Ayudar a reconocer, diagnosticar y recuperarse de errores | Los mensajes no tenían código de referencia y "invitar" mostraba el mismo error para cualquier fallo. Ahora cada error tiene mensaje específico y código (TF-RED, TF-404, TF-429…). | 2 | recorrido/ux-07.png · caso UX-01 · caso UX-07 | Documentar los códigos en la Ayuda (sección de errores). | Corregido |
| N-27 | H10 Ayuda y documentación | No existía ayuda ni preguntas frecuentes. Ahora hay página de Ayuda con buscador de FAQ tolerante a erratas, pasos y atajos. | 3 | recorrido/ux-03.png · caso UX-03 | Mantener; añadir ayuda contextual (enlace "?" en cada vista). | Corregido |
| N-28 | H10 Ayuda y documentación | No hay asistencia en tiempo real (chat o contacto); la ayuda es solo autoservicio. | 1 | Excel GRIHO (mejorada), hoja 16 | Añadir un canal de contacto/soporte desde la Ayuda. | Pendiente |

## 9. Análisis apoyado por IA vs revisión del equipo

La primera evaluación GRIHO la elaboró el asistente de IA (Claude) a partir del código y de la interfaz; las herramientas automáticas (axe, Lighthouse y los scripts generados con ayuda de IA) amplían ese análisis. La columna "Revisión del equipo" está **prellenada con notas de verificación neutrales** basadas en las capturas y resultados de esta ejecución; el equipo debe revisarla, ajustar severidades y firmar su conformidad.

| # | Hallazgo de la IA / automatización | Sev. IA | Revisión del equipo | ¿Coincide? | Corrección documentada (antes → después) | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Los errores al crear equipo/proyecto/tarea y asignar solo se escriben en la consola; el usuario no se entera. | 4 | Confirmado en el código anterior (console.error en los catch). Tras la corrección, verificado en esta ejecución: Banner: "Sin conexión a internet. Los cambios no se guardarán hasta q…"; aviso: "No se pudo crear la tarea: No hay conexión con el servidor. Revisa tu conexión a internet e inténtalo de nuevo. Código de referencia: TF-RED"; borrador tras reabrir: "Tarea escrita sin conexión". | Sí | Antes: console.error. Después: toasts con mensaje en español + código (describirError) y banner sin conexión. [UX-01: Aprobado] | [ux-sin-conexion-error.png](recorrido/ux-sin-conexion-error.png) |
| 2 | No hay ayuda ni preguntas frecuentes. | 3 | Confirmado (no existía ruta de ayuda). Para una app sencilla el equipo la valora en severidad 2. Tras la corrección: 1 respuesta(s): "¿Cómo muevo una tarea de columna?". | Parcial | Antes: solo README técnico. Después: /ayuda con FAQ buscable, pasos y atajos. [UX-03: Aprobado] | [ux-03.png](recorrido/ux-03.png) |
| 3 | No existe deshacer/rehacer. | 3 | Confirmado. Tras la corrección "Deshacer" funciona (verificado en esta ejecución); "Rehacer" sigue sin existir, por eso el equipo mantiene un pendiente menor. | Sí | Antes: sin deshacer. Después: "Deshacer" en mover/eliminar tarea y quitar miembro. [RUT-08: Aprobado] | [rut-08-deshacer-el-movimiento.png](recorrido/rut-08-deshacer-el-movimiento.png) |
| 4 | No hay buscador, filtros ni recientes. | 2 | De acuerdo con la severidad: con pocos equipos el impacto es bajo. "presentasion" → encuentra la tarea (Mostrando 1 de 1 tareas); "zzqqxx" → 0 resultados (Mostrando 0 de 1 tareas). | Sí | Después: búsqueda tolerante a erratas, filtro por persona y proyectos recientes. [UX-02: Aprobado] | [ux-02.png](recorrido/ux-02.png) |
| 5 | La pestaña siempre dice "taskflow-frontend". | 2 | Confirmado. El equipo lo sube a 3 por ser un fallo WCAG 2.4.2 (nivel A) que afecta a lectores de pantalla. Tras la corrección: "Mis equipos · TaskFlow", "Equipo Recorrido 54510 · TaskFlow", "Proyecto Lanzamiento · TaskFlow", "Ayuda · TaskFlow", "Preferencias · TaskFlow", "Privacidad · TaskFlow" | Parcial | Después: useDocumentTitle en cada página. [UX-05: Aprobado] | [ux-05.png](recorrido/ux-05.png) |
| 6 | "Por Hacer" y "Hecho" comparten el mismo color. | 2 | Confirmado en el código anterior (se esperaban "todo"/"done"). Tras la corrección los colores son distintos (Por Hacer: oklch(0.968 0.007 247.896) · En Progreso: oklch(0.97 0.014 254.604) · Hecho: oklch(0.982 0.018 155.826)), y en la captura se distinguen por el borde superior, el color del título y el punto (gris, azul y verde); los fondos son muy claros pero no son el único indicador. | Sí | Después: estilos por tipo de columna (estilosColumna.ts) con punto y fondo de color. [UX-06: Aprobado] | [tablero-escritorio.png](capturas/tablero-escritorio.png) |
| 7 | La barra de progreso es falsa (tareas / (listas × 5)). | 3 | Confirmado. Tras la corrección: Completado en 1 acciones de usuario y 2.9 s. En el servidor la tarea está en "Hecho". Progreso: "1 de 1 tareas hechas (100%)". Botón "Deshacer": sí. | Sí | Después: progreso = tareas en "Hecho" / total, con role="progressbar". [RUT-07: Aprobado] | [rut-07-mover-tarea-con-el-ratón.png](recorrido/rut-07-mover-tarea-con-el-ratón.png) |
| 8 | El botón de engranaje del tablero no hace nada y el "+" de la tarjeta de equipo es decorativo. | 2 | Confirmado en el código anterior. En las capturas actuales del tablero y del inicio ya no aparecen; el engranaje de la barra lleva a Preferencias. | Sí | Después: eliminados; tarjetas de equipo/proyecto son enlaces reales con "Abrir >". | [tablero-escritorio.png](capturas/tablero-escritorio.png) |
| 9 | Texto gris claro y texto en degradado con contraste insuficiente. | 3 | Confirmado con el código anterior (text-gray-400/500, bg-clip-text). Tras la corrección axe verificado en esta ejecución: 0 nodos con contraste insuficiente en 24 combinaciones página×viewport. | Sí | Después: gray-700/800 para texto secundario, sin degradados en texto y modo alto contraste. [VIS-11: Aprobado] | [inicio-escritorio.png](capturas/inicio-escritorio.png) |
| 10 | Texto de 12 px en contadores, insignias y ayudas. | 2 | Confirmado. Medición actual: 270 textos muestreados en 8 páginas; 0 con < 14 px; cuerpo 16px; mínimo 14px. | Sí | Después: mínimo 14 px y preferencia de tamaño de texto (grande / muy grande). [VIS-10: Aprobado] | [inicio-escritorio.png](capturas/inicio-escritorio.png) |
| 11 | Saludo y botones duplicados, manchas decorativas animadas. | 1 | De acuerdo: es un problema estético menor. En la captura actual hay un único título "Mis equipos" y un único botón "Nuevo equipo". | Sí | Después: encabezado único, sin decoración superflua. | [inicio-escritorio.png](capturas/inicio-escritorio.png) |
| 12 | Los errores de validación llegan en inglés. | 3 | Confirmado. Tras la corrección: HTTP 400: "El nombre es obligatorio", "El correo electrónico no tiene un formato válido (ejemplo: nombre@correo.com)", "La contraseña debe contener al menos una letra", "La contraseña debe tener al menos 8 caracteres" | Sí | Después: mensajes personalizados en los DTO y en el ValidationPipe. [UX-08: Aprobado] | [recorrido.json](resultados/recorrido.json) |
| 13 | Las ventanas modales no se cierran con Esc ni retienen el foco. | 3 | Confirmado. Tras la corrección: Las 6 ventanas se cierran con Esc. / Foco inicial: "Ej: Diseñar la pantalla de inicio" (dentro del diálogo); salidas del diálogo: 0; Esc cierra; foco tras cerrar: "Nueva tarea". | Sí | Después: componente Modal con Esc, trampa de foco y devolución del foco. [TEC-05: Aprobado, TEC-10: Aprobado] | [tec05-modal-crear-tarea-foco.png](teclado/tec05-modal-crear-tarea-foco.png) |
| 14 | Solo se confirma "eliminar miembro"; el resto de acciones no se confirman. | 3 | Parcialmente de acuerdo: confirmar mover/asignar sería excesivo porque existe "Deshacer"; el equipo lo valora en 2 y solo exige confirmación en acciones destructivas. Detalle: abierto; "Eliminar" alcanzado: sí; confirmación: abierta (foco en "Cerrar ventana (Esc)"); Esc cancela; tareas en servidor: 4. | Parcial | Después: confirmaciones en eliminar tarea/proyecto/equipo/cuenta y cerrar sesión. [TEC-06: Aprobado, UX-04: Aprobado] | [tec06-confirmacion-teclado.png](teclado/tec06-confirmacion-teclado.png) |
| 15 | Al recargar una página privada se vuelve al login. | 3 | Confirmado. Tras la corrección: Completado en 1 acciones de usuario y 1.9 s. Ruta tras recargar: /proyectos/0378ff47-d5b4-4ef8-8ce6-fba0b8fcd275; título "Proyecto Lanzamiento · TaskFlow". | Sí | Después: lectura síncrona de la sesión en useAuthStore. [RUT-09: Aprobado] | [rut-09-recargar-sin-perder-la-sesión.png](recorrido/rut-09-recargar-sin-perder-la-sesión.png) |
| 16 | El reset CSS global anula el espaciado de Tailwind. | 2 | Confirmado en index.css anterior. Las capturas en 3 viewports muestran el espaciado correcto y sin desbordamientos (verificado en esta ejecución). | Sí | Después: estilos base dentro de @layer base. [VIS-04: Aprobado] | [equipo-escritorio.png](capturas/equipo-escritorio.png) |
| 17 | Lighthouse: rendimiento móvil Login 75, Inicio (Mis equipos) 71, Tablero Kanban 74 (LCP 2,3 s / 2,6 s / 2,6 s). | 1 | Parcial: se mide contra el servidor de desarrollo de Vite (sin minificar ni empaquetar) y con red 4G simulada; el valor no es representativo de producción. Debe repetirse con "vite build && vite preview". | Parcial | Repetir sobre el build de producción; dividir el bundle por rutas (lazy) si sigue < 90. | [login-movil.html](lighthouse/login-movil.html) |
| 18 | Script de teclado (asistido por IA): las instrucciones y anuncios del arrastre para lectores de pantalla están en inglés y exponen UUID internos. | 3 | Ya corregido: Instrucciones: "Para mover la tarea con el teclado: pulsa Espacio para levantarla, usa las flechas izquierda y derecha para cambiar de columna y pulsa Espac"; último anuncio: "Has movido "Diseñar pantalla de inicio" a En Progreso."; el anuncio nombra la tarea y la columna destino. | Sí | Corregido. [TEC-11: Aprobado] | [tec07c-tarea-soltada.png](teclado/tec07c-tarea-soltada.png) |
| 19 | (Revisión manual del equipo, no detectado por la IA ni por axe) En móvil "Inicio" y "Preferencias" quedan solo como icono con title. | 1 | axe lo aprueba porque title aporta nombre accesible, pero en pantallas táctiles el title no se muestra: la página de accesibilidad es difícil de descubrir. Comprobación automática (VIS-15): Enlace a /: texto visible "Inicio"; enlace a /preferencias: texto visible "Preferencias". | No | Corregido: texto visible "Inicio" y "Preferencias" también en móvil. [VIS-15: Aprobado] | [nav-movil.png](capturas/nav-movil.png) |

Coincidencias: **Sí 14 · Parcial 4 · No 1**. Las discrepancias muestran por qué el análisis de IA y las herramientas automáticas no sustituyen la revisión humana: axe sobrevaloró el impacto de label-content-name-mismatch (ya corregido si no aparece en la tabla), Lighthouse penaliza SEO en páginas privadas y ninguna herramienta estándar detectó los anuncios en inglés del arrastre ni la navegación solo con iconos en móvil (se comprueban con scripts propios: TEC-11 y la verificación de navegación en móvil).

> No hay capturas del estado "antes": se describe a partir del código anterior y de los comentarios del Excel GRIHO original; las capturas "después" son las de esta ejecución.

## 10. Problemas pendientes priorizados

| Prioridad | ID | Severidad | Problema | Recomendación |
| --- | --- | --- | --- | --- |
| 1 | N-17 | 2 | Para invitar a alguien hay que recordar su correo exacto. | Autocompletar con personas de otros equipos del usuario o invitar por enlace. |
| 2 | N-09 | 1 | No existe "Rehacer" y eliminar un equipo o proyecto es irreversible (aunque se confirma antes). | Ofrecer "Deshacer" también al eliminar proyecto/equipo (borrado diferido unos segundos). |
| 3 | N-21 | 1 | No se puede personalizar la disposición del tablero ni el nombre/orden de las columnas. | Permitir renombrar/reordenar columnas por proyecto. |
| 4 | N-28 | 1 | No hay asistencia en tiempo real (chat o contacto); la ayuda es solo autoservicio. | Añadir un canal de contacto/soporte desde la Ayuda. |

## 11. Limitaciones

- Las herramientas automáticas detectan aproximadamente un 30–40 % de los problemas WCAG; no sustituyen la prueba con lectores de pantalla (NVDA/Narrador) ni con usuarios reales.
- Lighthouse se ejecutó contra el servidor de desarrollo; las cifras de rendimiento y SEO deben repetirse sobre el build de producción.
- La base de datos es compartida con otras suites de prueba: se crean usuarios únicos por ejecución. Durante la ejecución hubo 15 error(es) transitorio(s) de carga (TF-RED) que se reintentaron automáticamente.
- El número de acciones de los recorridos es el mínimo de un usuario experto (script); un usuario novel necesitará más pasos y tiempo.

## 12. Índice de evidencias

| Carpeta | Contenido |
| --- | --- |
| `capturas/` | Capturas de cada página en móvil, tablet y escritorio, y modo alto contraste + texto muy grande |
| `axe/` | Un JSON de violaciones por página/estado, `_resumen.json` y captura de cada estado auditado |
| `lighthouse/` | Informes HTML y JSON de Lighthouse (página × dispositivo) |
| `teclado/` | Capturas de foco visible, enlace de salto, modales y arrastre con teclado |
| `visual/` | Línea base, capturas actuales y mapas de diferencias de pixelmatch |
| `recorrido/` | Capturas de cada paso del recorrido y de los casos de UX |
| `resultados/` | Resultado bruto de cada módulo (incluye el detalle de cada medición) |
| `resumen.json` | Resumen en el formato común de la asignatura |

Ejecución: `cd pruebas/accesibilidad && npm install && npm test` (o `npm run axe | lighthouse | teclado | visual | recorrido`). Requiere el backend en :3000, el frontend en :5173 y Chrome instalado (`CHROME_PATH` para otra ruta).
