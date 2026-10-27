# Pruebas E2E de TaskFlow con el patrón Screenplay

Automatización de recorridos de extremo a extremo de **TaskFlow** (Kanban colaborativo) aplicando el
patrón **Screenplay** con [Serenity/JS](https://serenity-js.org) 3.48.2 sobre **Playwright Test** 1.63.0.

Los escenarios están escritos en el lenguaje de las personas usuarias: *actores* que tienen *habilidades*,
realizan *tareas* compuestas de *interacciones* y responden *preguntas* sobre lo que ven, sobre las que se
hacen *aserciones* (`Ensure`).

```ts
await actorCalled('Ana').attemptsTo(
    CrearTarea.titulada('Diseñar la pantalla de inicio'),
    MoverTarea.llamada('Diseñar la pantalla de inicio').aLaColumna('Hecho'),
    Ensure.eventually(ProgresoDelProyecto(), equals(50)),
);
```

## Correspondencia del patrón

```mermaid
flowchart LR
    subgraph Actores["Actores (Elenco)"]
        Ana["Ana · líder"]
        Beto["Beto · miembro"]
        Carla["Carla · usuaria ajena"]
    end
    subgraph Habilidades
        H1[BrowseTheWebWithPlaywright]
        H2[CallAnApi]
        H3[TakeNotes]
    end
    subgraph Tareas
        T1["IniciarSesion / CrearEquipo / InvitarMiembro"]
        T2["CrearProyecto / CrearTarea / MoverTarea / EliminarTarea"]
        T3["PrepararCuentaPorApi / CrearEquipoPorApi ... (arrange)"]
    end
    subgraph Interacciones
        I1["Serenity/JS: Navigate, Click, Enter, Select, Send..."]
        I2["Propias: AutenticarLlamadasApi, ArrastrarTareaConTeclado, OlvidarSesionDelNavegador"]
    end
    subgraph Preguntas
        Q1["TitulosDeTareasEn(columna), ProgresoDelProyecto, MiembrosDelEquipo, MensajeDeError, UrlActual..."]
    end
    UI["ui/ (PageElements por página)"]
    SUT[("TaskFlow\nVite :5173 · API :3000")]

    Ana & Beto & Carla -- tienen --> Habilidades
    Ana & Beto & Carla -- realizan --> Tareas
    Tareas -- se componen de --> Interacciones
    Interacciones -- usan --> Habilidades
    Interacciones -- localizan con --> UI
    Ana & Beto & Carla -- preguntan --> Preguntas
    Preguntas -- leen --> UI
    Habilidades --> SUT
    Preguntas -. "Ensure.that / Ensure.eventually" .-> Aserciones{{Aserciones}}
```

| Elemento Screenplay | Dónde | Qué contiene |
|---|---|---|
| **Actor** | `src/screenplay/actores/Elenco.ts` | `Cast` con **Ana** (líder; usa la página de Playwright, así su vídeo/traza quedan en el informe), **Beto** (miembro) y **Carla** (ajena), cada uno con su propio contexto de navegador y sesión. |
| **Habilidad (Ability)** | `Elenco.ts` | `BrowseTheWebWithPlaywright` (navegar), `CallAnApi` (preparar datos contra la API REST), `TakeNotes` (recordar credenciales, ids de equipo/proyecto/tarea). |
| **Tarea (Task)** | `src/screenplay/tareas/` | Acciones de negocio: `RegistrarseEnTaskFlow`, `IniciarSesion`, `IntentarIniciarSesion`, `CerrarSesion`, `CancelarCierreDeSesion`, `CrearEquipo`, `AbrirEquipo`, `InvitarMiembro`, `BuscarPersonaParaInvitar`, `QuitarMiembro`, `CrearProyecto`, `AbrirTablero`, `CrearTarea`, `RellenarNuevaTarea`, `MoverTarea`, `EliminarTarea`, `DeshacerUltimaAccion`, `BuscarTarea`, `AbrirPreferencias`, `CambiarPreferencias`, `RestablecerPreferencias` y las de preparación por API: `RegistrarUsuarioPorApi`, `IniciarSesionPorApi`, `PrepararCuentaPorApi`, `CrearEquipoPorApi`, `AnadirMiembroPorApi`, `CrearProyectoPorApi`, `CrearTareaPorApi`. |
| **Interacción (Interaction)** | `src/screenplay/interacciones/` + Serenity/JS | De Serenity/JS: `Navigate`, `Click`, `Enter`, `Clear`, `Select`, `Send`, `Wait`. Propias: `AutenticarLlamadasApi` (añade el token Bearer), `ArrastrarTareaConTeclado` (arrastre accesible Espacio + flechas), `OlvidarSesionDelNavegador` (limpia el almacenamiento local). |
| **Pregunta (Question)** | `src/screenplay/preguntas/` | `MensajeDeError`, `MensajeDeCuentaCreada`, `TitulosDeTareasEn(columna)`, `TitulosDeTareasVisibles`, `ColumnasDelTablero`, `ProgresoDelProyecto`, `ContadorDeResultados`, `MiembrosDelEquipo`, `EquiposVisibles`, `TituloDeLaPagina`, `UrlActual`, `EncabezadoPrincipal`, `AvisoVisible`, `ModoDeContraste`, `TamanoDeTexto`, `ValorEnAlmacenamientoLocal`. |
| **Elementos de UI** | `src/screenplay/ui/` | `PageElement`/`PageElements` agrupados por página, localizados por rol y nombre accesible, etiqueta o texto (sin clases de estilo frágiles). |
| **Expectativa propia** | `src/screenplay/expectativas/estaVisible.ts` | Espera a que el elemento esté visible según Playwright (la `isVisible()` de Serenity exige además que esté en el viewport y sin nada encima, lo que daba falsos negativos con avisos emergentes o texto agrandado). |
| **Escenarios** | `specs/*.spec.ts` | 18 casos (SP-01…SP-18), exitosos y alternativos, con aserciones `Ensure.that` / `Ensure.eventually`. |

## Casos cubiertos

| Id | Caso | Tipo | Actores |
|---|---|---|---|
| SP-01 | Registro exitoso e inicio de sesión | exitoso | Ana |
| SP-02 | Registro con correo duplicado | alternativo | Ana |
| SP-03 | Registro con contraseñas que no coinciden | alternativo | Ana |
| SP-04 | Inicio de sesión fallido muestra alerta | alternativo | Ana |
| SP-05 | Ruta protegida sin sesión redirige a /login | alternativo | Ana |
| SP-06 | Cerrar sesión con confirmación (cancelar y confirmar) | exitoso | Ana |
| SP-07 | La líder crea un equipo e invita a un miembro | exitoso | Ana, Beto |
| SP-08 | Invitar un correo no registrado | alternativo | Ana |
| SP-09 | Crear proyecto genera las 3 columnas | exitoso | Ana |
| SP-10 | Quitar miembro con confirmación y deshacer | alternativo | Ana, Beto |
| SP-11 | Crear tareas, mover a «Hecho» y subir el progreso | exitoso | Ana |
| SP-12 | Crear tarea sin título | alternativo | Ana |
| SP-13 | Eliminar tarea con confirmación y deshacer | alternativo | Ana |
| SP-14 | Búsqueda tolerante a tildes y errores | exitoso | Ana |
| SP-15 | Mover tarea arrastrándola con el teclado | exitoso | Ana |
| SP-16 | Beto ve la tarea de Ana y su cambio de columna (multi-actor) | exitoso | Ana, Beto |
| SP-17 | Usuaria ajena no puede ver el tablero | alternativo | Ana, Carla |
| SP-18 | Alto contraste, tamaño de texto y restablecer | exitoso | Ana |

El objetivo y el resultado esperado de cada caso están en `catalogo/casos.json`; el resultado **obtenido**
y el **estado** se generan a partir de la ejecución real (reporter JSON de Playwright).

## Requisitos y ejecución

* Node.js 20+, Google Chrome instalado (se usa `channel: 'chrome'`, no se descargan navegadores) y
  Java 17+ (solo para el informe HTML de Serenity BDD).
* Backend en `http://localhost:3000` y frontend en `http://localhost:5173` en marcha
  (se pueden cambiar con `TASKFLOW_API_URL` y `TASKFLOW_URL`).

```bash
cd pruebas/e2e-screenplay
npm install
npx serenity-bdd update     # descarga (una vez) el CLI de Serenity BDD
npm test                    # pruebas + informe Serenity BDD + resumen y evidencias
npm run test:headed         # ver el navegador (1 worker)
npm run report              # regenerar el informe Serenity BDD y el resumen
npm run report:playwright   # abrir el informe HTML de Playwright
```

Variables útiles: `WORKERS` (por defecto 2), `RETRIES` (por defecto 1) y `FOTOS=interacciones` (una foto de Serenity por interacción).

## Datos de prueba

La base de datos es compartida, así que cada escenario crea **sus propios** usuarios, equipos y proyectos
con un sufijo único (`Date.now()`), y prepara los datos que no son objeto de la prueba **por API**
(`CallAnApi`), dejando la interfaz para el comportamiento que se valida. Los inicios de sesión fallidos usan
correos únicos para no activar el bloqueo de 5 intentos por correo.

## Evidencias

`npm test` deja en `pruebas/evidencias/screenplay/`:

* `resumen.json`: totales, inventario del patrón y, por caso, objetivo, esperado, **obtenido** (aserciones
  verificadas o error real), estado y rutas de evidencia.
* `reporte-serenity/index.html`: documentación viva de Serenity BDD con cada tarea, interacción y aserción y
  capturas de los fallos (Photographer `TakePhotosOfFailures`; con `FOTOS=interacciones` se fotografía cada interacción).
* `reporte-playwright/index.html`: informe HTML de Playwright con captura, vídeo y traza de cada caso.
* `capturas/SP-xx.png`, `videos/SP-xx-*.webm` (incluidos los de Beto y Carla), `trazas/SP-xx-trace.zip`
  (casos SP-11, SP-16 y cualquier caso fallido; se abren con `npx playwright show-trace`).
* `resultados-playwright.json`: resultados en bruto (versión ligera).

## Escenarios Gherkin (Cucumber + Serenity/JS) sobre el mismo patrón Screenplay

Además de las especificaciones de Playwright Test (`specs/`), la carpeta `features/` contiene **escenarios Gherkin**
ejecutados con **Cucumber 11** y el adaptador `@serenity-js/cucumber`, escritos con el formato del material de la clase
(Clase 19: Gherkin, Cucumber y Serenity/JS):

* **Palabras clave en inglés** (`Feature`, `Background`, `Rule`, `Scenario`, `Scenario Outline`, `Examples`,
  `Given` / `When` / `Then` / `And`) y **texto de los pasos en español**. `Feature` y `Scenario` llevan dos puntos; los pasos no.
* La descripción de cada `Feature` sigue el camino **Necesidad → Regla → Ejemplos**, y cada `Rule` agrupa los escenarios
  que la ilustran.
* El **actor se nombra en el primer paso** (`Given Ana es una persona nueva…`) y después se usa el **pronombre**
  (`When ella inicia sesión…`, `Then ella observa el mensaje "…"`), igual que *Alicia* y *ella* en los ejemplos de la clase.
  En el escenario con dos actrices (Ana y Carla) se usan siempre los nombres.
* Los resultados observables se expresan con **«observa»** y datos literales entre comillas (`{string}`); las listas se
  comparan con **tablas de datos** en el `Then` (miembros del equipo, columnas del tablero, tareas de una columna).
* Un **`Scenario Outline`** con dos bloques `Examples` cubre los inicios de sesión rechazados; cada bloque lleva su etiqueta
  `@GH-03` / `@GH-04`.
* Etiquetas: `@web`, `@api`, `@smoke`, el identificador `@GH-xx` de cada escenario, el tipo (`@exitoso`, `@alternativo`,
  `@error`) y la funcionalidad (`@autenticacion`, `@equipos`, `@proyectos`, `@tareas`, `@usuarios`, `@seguridad`).

Los pasos no contienen lógica de automatización: cada uno delega en las **mismas tareas, interacciones y preguntas
Screenplay** de `src/screenplay/` que usan los casos SP-01…SP-18.

```text
features/autenticacion.feature          features/step_definitions/acceso.ts            src/screenplay/tareas/TareasDeAcceso.ts
  When ella se registra desde el    →   When('{word} se registra desde el         →   RegistrarseEnTaskFlow.con(credenciales)
  formulario con sus datos                formulario con sus datos', quien =>           (Navigate, Enter, Click sobre PaginaRegistro)
                                          actorDe(quien).attemptsTo(...))
  Then ella observa la página       →   Then('{word} observa la página {string}', →   Ensure.eventually(EncabezadoPrincipal(), equals(...))
  "Mis equipos"                           ...)                                          Ensure.that(UrlActual(), equals('/'))
```

| Pieza | Dónde | Qué hace |
|---|---|---|
| Características (`.feature`) | `features/*.feature` | 4 `Feature`, 7 `Rule`, 12 escenarios **GH-01…GH-12** (incluye un `Scenario Outline` con dos `Examples` etiquetados), con tablas de datos en los `Then`. |
| Definiciones de pasos | `features/step_definitions/*.ts` | Expresiones Cucumber (`{word}` = nombre del actor o pronombre, `{string}`, `{int}`, `DataTable`) que llaman a `actorDe(quien).attemptsTo(Tarea…, Ensure.that(Pregunta…))`. |
| Contexto del escenario | `features/support/contexto.ts` | Credenciales y nombres únicos generados en el escenario; resuelve el pronombre («ella») al actor en escena (`actorInTheSpotlight`). |
| Configuración Serenity/JS | `features/support/serenity.config.ts` | Lanza Chrome (Playwright), configura el elenco `ElencoGherkin` (un contexto de navegador por actor), los *reporters* (consola, Serenity BDD, fotos) y una captura final por escenario (`@GH-xx.png`). |
| Elenco | `src/screenplay/actores/ElencoGherkin.ts` | Mismas habilidades que en Playwright Test: `BrowseTheWebWithPlaywright`, `CallAnApi`, `TakeNotes`. |
| Configuración Cucumber | `cucumber.js`, `tsconfig.cucumber.json` | Carga los `.ts` con `tsx`, formatos `@serenity-js/cucumber`, JSON y HTML. |
| Catálogo | `catalogo/gherkin.json` | Objetivo y resultado esperado de cada escenario (el obtenido se genera de la ejecución real). |

### Escenarios

| Id | Feature / Rule | Scenario | Tipo |
|---|---|---|---|
| GH-01 | Autenticación / Una persona nueva crea su cuenta y entra con ella | Registro e inicio de sesión correctos | exitoso |
| GH-02 | Autenticación / Una persona nueva crea su cuenta y entra con ella | Registro con un correo ya existente | alternativo |
| GH-03 | Autenticación / Solo las credenciales válidas dan acceso | Inicio de sesión rechazado (Scenario Outline, Examples «contraseña incorrecta») | error |
| GH-04 | Autenticación / Solo las credenciales válidas dan acceso | Inicio de sesión rechazado (Scenario Outline, Examples «correo no registrado») | error |
| GH-05 | Autenticación / Las rutas privadas exigen una sesión iniciada | Una ruta protegida sin sesión redirige al inicio de sesión | error |
| GH-06 | Equipos y proyectos / La líder invita a personas que ya tienen cuenta | Crear un equipo e invitar a un miembro registrado | exitoso |
| GH-07 | Equipos y proyectos / La líder invita a personas que ya tienen cuenta | Invitar un correo que no está registrado | alternativo |
| GH-08 | Equipos y proyectos / Cada proyecto nuevo tiene un tablero con tres listas | Crear un proyecto genera un tablero con las columnas por defecto | exitoso |
| GH-09 | Tablero Kanban / El progreso refleja las tareas en «Hecho» | Crear tareas y mover una a Hecho | exitoso |
| GH-10 | Tablero Kanban / Una tarea necesita un título | Crear una tarea sin título | error |
| GH-11 | Tablero Kanban / Eliminar pide confirmación y se puede deshacer | Eliminar una tarea y deshacer la eliminación | alternativo |
| GH-12 | Control de acceso / Solo los miembros del equipo ven sus proyectos | Una usuaria ajena al equipo no puede ver el tablero de Ana | error |

### Ejecución y evidencias

```bash
cd pruebas/e2e-screenplay
npm install
npm run gherkin                          # Cucumber + Serenity/JS → informe Serenity BDD → resumen y evidencias
npm run gherkin -- --tags @autenticacion # solo una Feature (también @smoke, @GH-09, "@web and @error"…)
HEADED=1 npm run gherkin                 # ver el navegador (PowerShell: $env:HEADED='1'; npm run gherkin)
VIDEO=1 npm run gherkin                  # grabar vídeo de cada actor
npm run gherkin:resumen                  # regenerar solo el resumen a partir de la última ejecución
```

Evidencias en `pruebas/evidencias/gherkin/`: `resumen.json` (objetivo, esperado, obtenido, estado, pasos y evidencia de cada
escenario), `capturas/GH-xx.png` (pantalla final de cada escenario), `reporte-serenity/index.html` (documentación viva de
Serenity BDD con cada paso Gherkin y las tareas Screenplay anidadas), `reporte-cucumber/cucumber.html` + `cucumber.json` y una
copia de los `.feature`.
