# TaskFlow: comandos de pruebas

Este documento reúne los comandos para ejecutar cada prueba incluida en el informe **Informe-Pruebas-TaskFlow.docx**. Para cada una se indica la carpeta donde está y dónde se guardan sus evidencias.

Todas las rutas son relativas a la raíz del proyecto (`TercerExamen-main/`).

---

## 0. Requisitos y puesta en marcha

| Requisito | Detalle |
|---|---|
| Node.js | 20.x (probado con 20.20.2) |
| PostgreSQL | 18, base de datos `taskflow` (cadena de conexión en `.env`, ver `.env.example`) |
| Google Chrome | En `C:/Program Files/Google/Chrome/Application/chrome.exe`; si está en otra ruta, defina la variable `CHROME_PATH` |
| Katalon Studio | Solo para el criterio 5 (ver `pruebas/katalon/README_GUIA.md`) |

### Instalar dependencias (solo la primera vez)

```bash
npm install                                   # backend (raíz)
cd taskflow-frontend      && npm install && cd ..
cd pruebas/accesibilidad  && npm install && cd ../..
cd pruebas/e2e-screenplay && npm install && npx playwright install chromium && cd ../..
cd pruebas/rendimiento    && npm install && cd ../..
cd pruebas/informe        && npm install && cd ../..
```

`pruebas/seguridad` no necesita instalación porque solo usa módulos nativos de Node.

### Arrancar la aplicación

La mayoría de las suites necesita la aplicación en marcha. Abra **dos terminales**:

```bash
# Terminal 1 — backend (API en http://localhost:3000)
npm run start:dev

# Terminal 2 — frontend (http://localhost:5173)
cd taskflow-frontend
npm run dev
```

> Las pruebas unitarias de Jest **no** necesitan la aplicación en marcha. Las pruebas e2e de Jest **sí** necesitan PostgreSQL.

---

## Resumen rápido

| Criterio de la rúbrica | Suite | Módulo (carpeta) | Comando completo | Evidencias en `pruebas/evidencias/` |
|---|---|---|---|---|
| 1. Regresión, API y componentes | Regresión del backend (Jest) | `src/**/*.spec.ts` y `src/**/*.e2e.spec.ts` | `npm run test:evidencias` (raíz) | `backend-jest/` |
| 1. Regresión, API y componentes | Cypress: API, regresión de interfaz y componentes | `taskflow-frontend/cypress/` | `npm run test:cypress` (en `taskflow-frontend`) | `cypress/` |
| 2. Seguridad y rendimiento | Seguridad | `pruebas/seguridad/` | `npm test` (en `pruebas/seguridad`) | `seguridad/` |
| 2. Seguridad y rendimiento | Rendimiento (autocannon) | `pruebas/rendimiento/` | `npm test` (en `pruebas/rendimiento`) | `rendimiento/` |
| 3. UX, heurísticas, accesibilidad e interfaz | axe, Lighthouse, teclado, visual y recorridos | `pruebas/accesibilidad/` | `npm test` (en `pruebas/accesibilidad`) | `ux-accesibilidad/` |
| 4. E2E Screenplay | Serenity/JS + Playwright | `pruebas/e2e-screenplay/` | `npm test` (en `pruebas/e2e-screenplay`) | `screenplay/` |
| 5. E2E Katalon | Katalon Studio | `pruebas/katalon/TaskFlow-Katalon/` | Desde Katalon Studio (ver sección 5) | `katalon/` |
| — | Informe Word | `pruebas/informe/` | `node pruebas/informe/generar-informe.js` | `pruebas/informe/Informe-Pruebas-TaskFlow.docx` |

---

## 1. Criterio 1: regresión, API y componentes

### 1.1 Regresión del backend (Jest + ts-jest + Supertest)

- **Módulo:** pruebas unitarias en `src/<módulo>/*.spec.ts` (auth, usuarios, equipos, proyectos, listas, tareas) y pruebas e2e de la API en `src/<módulo>/*.e2e.spec.ts`.
- **Dónde ejecutar:** raíz del proyecto.

| Comando | Qué ejecuta |
|---|---|
| `npm run test:evidencias` | **Ejecución que usa el informe:** unitarias con cobertura, e2e y el `resumen.json` |
| `npm test` / `npm run test:unit` | Todas las unitarias |
| `npm run test:e2e` | Todas las e2e de la API (necesita PostgreSQL) |
| `npm run test:regression` | Unitarias y e2e seguidas |
| `npm run test:cov` | Unitarias con cobertura |
| `npm run test:unit:auth`, `:equipos`, `:proyectos`, `:listas`, `:tareas`, `:usuarios` | Unitarias de un solo módulo |
| `npm run test:e2e:auth`, `:equipos`, `:proyectos`, `:listas`, `:tareas`, `:usuarios` | E2e de un solo módulo |

- **Evidencias:** `pruebas/evidencias/backend-jest/` contiene:
  - `resumen.json`;
  - `jest-unit.json` y `jest-e2e.json`;
  - el reporte de cobertura `cobertura/index.html`.

### 1.2 Cypress: API, regresión de interfaz y componentes

- **Módulo:** `taskflow-frontend/cypress/`.

| Carpeta | Contenido |
|---|---|
| `e2e/api/` | Pruebas de API: auth, usuarios, equipos, proyectos-listas, tareas, validacion |
| `e2e/regresion/` | Regresión de interfaz: autenticacion, equipos-proyectos, kanban, preferencias |
| `component/` | Componentes React: Button, Input, Modal, Confirmacion, Toast, Migas, Kanban, busqueda, errores |
| `casos/catalogo.json` | Objetivo y resultado esperado de cada caso |

- **Dónde ejecutar:** `taskflow-frontend/`. Los comandos E2E necesitan la aplicación en marcha.

| Comando | Qué ejecuta |
|---|---|
| `npm run test:cypress` | **Ejecución completa que usa el informe:** limpia, ejecuta E2E y componentes, genera el reporte HTML y el `resumen.json` |
| `npm run test:api` | Solo las pruebas de API |
| `npm run test:regresion` | Solo la regresión de interfaz |
| `npm run test:e2e` | API y regresión de interfaz |
| `npm run test:component` | Solo las pruebas de componentes |
| `npm run cy:open` | Abre Cypress en modo interactivo |
| `npm run cy:resumen` | Regenera el `resumen.json` a partir de los últimos resultados |

- **Evidencias:** `pruebas/evidencias/cypress/` contiene:
  - el reporte HTML `informe/informe-cypress.html`;
  - las carpetas `capturas/`, `videos/` y `api/` (petición y respuesta de cada caso);
  - `resumen.json`.

---

## 2. Criterio 2: seguridad y rendimiento

### 2.1 Pruebas de seguridad (node --test)

- **Módulo:** `pruebas/seguridad/`. Los casos están en `seguridad.test.js`, con los grupos SEG-AUTH, SEG-INY, SEG-VAL, SEG-CONF, SEG-DATA y SEG-DEP.
- **Dónde ejecutar:** `pruebas/seguridad/`. Necesita el backend en marcha.

| Comando | Qué ejecuta |
|---|---|
| `npm test` | **Ejecución que usa el informe:** toda la suite, con JUnit, `resumen.json` e `informe.md` |
| `npm run test:solo` | Solo el runner `node --test`, sin generar evidencias |
| `npm run test:estricto` | Igual que `npm test`, en modo estricto |

- **Evidencias:** `pruebas/evidencias/seguridad/` contiene:
  - `resumen.json`, `informe.md` y `junit.xml`;
  - `salida-node-test.txt`;
  - el detalle HTTP en `http/`;
  - los informes de `npm audit`.

### 2.2 Pruebas de rendimiento (autocannon)

- **Módulo:** `pruebas/rendimiento/`. Los escenarios REN-01 a REN-06 están definidos en `escenarios.js`.
- **Dónde ejecutar:** `pruebas/rendimiento/`. Necesita el backend en marcha.

| Comando | Escenario |
|---|---|
| `npm test` | **Todos los escenarios** (siembra datos, calienta, mide, limpia y genera el informe) |
| `npm run carga-base` | REN-01: carga base |
| `npm run carga-media` | REN-02: carga media |
| `npm run escritura` | REN-03: escritura |
| `npm run login` | REN-04: login |
| `npm run estres` | REN-05: estrés por concurrencia |
| `npm run resistencia` | REN-06: resistencia |
| `npm run seed` / `npm run limpiar` | Crear o borrar los datos de prueba |
| `npm run informe` | Regenerar el informe con la última ejecución |

- **Evidencias:** `pruebas/evidencias/rendimiento/` contiene:
  - el reporte con gráficas `reporte.html`;
  - `resumen.json` e `informe.md`;
  - los datos crudos en `raw/`;
  - `indices-postgresql.txt`.

---

## 3. Criterio 3: UX, heurísticas, accesibilidad e interfaz

- **Módulo:** `pruebas/accesibilidad/src/`. Usa axe-core, Lighthouse, Puppeteer y pixelmatch.
- **Dónde ejecutar:** `pruebas/accesibilidad/`. Necesita el backend y el frontend en marcha.

| Comando | Qué ejecuta |
|---|---|
| `npm test` | **Ejecución que usa el informe:** todas las pruebas y el informe |
| `npm run axe` | Accesibilidad automática WCAG con axe-core (A11Y) |
| `npm run lighthouse` | Puntuaciones Lighthouse de inicio, login y tablero, en escritorio y móvil |
| `npm run teclado` | Navegación solo con teclado y lector de pantalla (TEC) |
| `npm run visual` | Interfaz responsiva y regresión visual (VIS) |
| `npm run recorrido` | Recorridos de usuario y heurísticas de Nielsen (RUT/UX) |
| `npm run informe` | Regenera `informe.md` y `resumen.json`, incluidas las heurísticas de Nielsen y la comparación IA vs. equipo |

- **Evidencias:** `pruebas/evidencias/ux-accesibilidad/` contiene las carpetas `axe/`, `lighthouse/`, `teclado/`, `visual/`, `recorrido/` y `capturas/`, además de `resumen.json` e `informe.md`.
- **Evaluación heurística GRIHO** (complementaria): Excel en el Escritorio, `Evaluacion-Heuristica GRIHO - TaskFlow (mejorada).xlsx`.

---

## 4. Criterio 4: E2E con el patrón Screenplay (Serenity/JS + Playwright)

- **Módulo:** `pruebas/e2e-screenplay/`.

| Carpeta | Contenido |
|---|---|
| `src/screenplay/` | Actores, tareas, interacciones, preguntas y páginas (`ui/`) |
| `specs/` | Escenarios SP-01 a SP-18: caminos de éxito y alternativos |
| `README.md` | Explicación del patrón, con un diagrama |

- **Dónde ejecutar:** `pruebas/e2e-screenplay/`. Necesita el backend y el frontend en marcha.

| Comando | Qué ejecuta |
|---|---|
| `npm test` | **Ejecución que usa el informe:** limpia, ejecuta y genera el reporte Serenity BDD y el `resumen.json` |
| `npm run test:headed` | Ejecuta mostrando el navegador |
| `npm run report` | Regenera el reporte Serenity BDD |
| `npm run report:playwright` | Abre el reporte HTML de Playwright |
| `npm run typecheck` | Comprueba los tipos de TypeScript |

- **Evidencias:** `pruebas/evidencias/screenplay/` contiene:
  - el reporte Serenity `reporte-serenity/index.html`;
  - el reporte de Playwright en `reporte-playwright/`;
  - las carpetas `capturas/`, `videos/` y `trazas/`;
  - `resumen.json`.

---

## 5. Criterio 5: E2E con Katalon

### 5.1 Katalon Recorder (extensión de Chrome): 7 casos

- **Módulo:** `pruebas/katalon/recorder/`. La suite está en `TaskFlow-KatalonRecorder.html`, los casos en `casos.js` y la guía en `GUIA.md`.
- **En la extensión:** abra Katalon Recorder, pulse **Open** junto a *Test Suites*, elija `TaskFlow-KatalonRecorder.html` y pulse **Play Suite**. Debe tener una pestaña abierta en http://localhost:5173.

| Comando (en la raíz) | Qué hace |
|---|---|
| `node pruebas/katalon/recorder/generar-suite.js` | Regenera la suite HTML a partir de `casos.js` |
| `node pruebas/katalon/recorder/verificar-suite.js` | Ejecuta los 7 casos sin abrir la extensión, con el mismo motor de escritura y clic, y guarda las evidencias en `pruebas/evidencias/katalon/recorder/` |

### 5.2 Katalon Studio: 16 casos

- **Módulo:** `pruebas/katalon/TaskFlow-Katalon/` (proyecto de Katalon).

| Carpeta | Contenido |
|---|---|
| `Test Cases/` | TC01 a TC16, casos positivos y negativos |
| `Object Repository/` | Localizadores |
| `Data Files/` | Datos CSV para las pruebas guiadas por datos |
| `Keywords/` | Palabras clave reutilizables |
| `Test Suites/` | `TS_Positivas`, `TS_Negativas`, `TS_Regresion_Completa` y la colección `TSC_TaskFlow_Chrome` |

- **Guía de instalación y uso:** `pruebas/katalon/README_GUIA.md`.

Pasos (con el backend y el frontend en marcha):

1. Abrir Katalon Studio y elegir **File > Open Project** con la carpeta `pruebas/katalon/TaskFlow-Katalon`.
2. Abrir `Test Suites/TS_Regresion_Completa` (o la colección `TSC_TaskFlow_Chrome`) y ejecutarla con **Run > Chrome**.
3. Volcar los resultados al resumen y regenerar el informe Word, desde la raíz del proyecto:

```bash
node pruebas/katalon/actualizar-resumen.js          # lee la ejecución más reciente de TaskFlow-Katalon/Reports
node pruebas/informe/generar-informe.js
```

| Comando auxiliar (en la raíz) | Qué hace |
|---|---|
| `node pruebas/katalon/validar-xpaths.cjs` | Comprueba los localizadores de Katalon contra la aplicación sin abrir Katalon. Usa Playwright de `e2e-screenplay` |
| `node pruebas/katalon/actualizar-resumen.js "<ruta>/JUnit_Report.xml"` | Usa un reporte JUnit concreto |
| `node pruebas/katalon/actualizar-resumen.js --reiniciar` | Vuelve a dejar todos los casos como "Pendiente" |

- **Evidencias:** `pruebas/evidencias/katalon/` contiene:
  - `resumen.json` y `validacion-xpaths.json`;
  - las carpetas `capturas/` y `reporte/`, que se crean al ejecutar Katalon.

---

## 6. Informe Word

- **Módulo:** `pruebas/informe/`.

| Archivo | Contenido |
|---|---|
| `generar-informe.js` | Genera el documento |
| `capturar-reportes.js` | Captura en PNG los reportes HTML |
| `datos-extra.json` | Tabla GRIHO, evolución, correcciones, conclusiones e imágenes |

El informe lee el `resumen.json` de cada suite en `pruebas/evidencias/`. Comandos, desde la raíz del proyecto:

```bash
node pruebas/informe/capturar-reportes.js   # actualiza las capturas de los reportes (pruebas/evidencias/capturas-reportes/)
node pruebas/informe/generar-informe.js     # genera pruebas/informe/Informe-Pruebas-TaskFlow.docx
```

> Al abrir el Word, actualice el índice con clic derecho sobre el índice y **Actualizar campos**.

---

## 7. Ejecutar todo en orden

Con el backend y el frontend en marcha, desde la raíz del proyecto:

```bash
npm run test:evidencias
cd pruebas/seguridad       && npm test && cd ../..
cd taskflow-frontend       && npm run test:cypress && cd ..
cd pruebas/e2e-screenplay  && npm test && cd ../..
cd pruebas/accesibilidad   && npm test && cd ../..
cd pruebas/rendimiento     && npm test && cd ../..
node pruebas/katalon/validar-xpaths.cjs
# (ejecutar Katalon en Katalon Studio y luego: node pruebas/katalon/actualizar-resumen.js)
node pruebas/informe/capturar-reportes.js
node pruebas/informe/generar-informe.js
```

> Ejecute las suites **una tras otra**, no a la vez: comparten la misma base de datos y el mismo backend. Rendimiento debe ir al final, porque carga la CPU.

---

## 6. Entrega final: suites y documentos nuevos

| Criterio | Suite / documento | Carpeta | Comando | Evidencias |
|---|---|---|---|---|
| 1. Plan de pruebas | Plan-de-Pruebas-TaskFlow.docx | `pruebas/informe/` | `node pruebas/informe/generar-plan.js` | `pruebas/informe/Plan-de-Pruebas-TaskFlow.docx` |
| 2. Matriz de trazabilidad | Excel detallado + JSON + MD, y RTM en el formato de la asignatura (Lookups, RTM, Dashboard, Defectos, Cómo usar) | `pruebas/informe/generar-matriz.js`, `generar-rtm.js` | `node pruebas/informe/generar-matriz.js && node pruebas/informe/generar-rtm.js` | `pruebas/evidencias/matriz/` |
| 3. Informe final | Informe-Pruebas-TaskFlow.docx (16 secciones + anexos) | `pruebas/informe/` | `node pruebas/informe/generar-informe.js` | `pruebas/informe/Informe-Pruebas-TaskFlow.docx` |
| 4. Cypress: seguridad y accesibilidad | `cypress/e2e/seguridad/` (CYS-*) y `cypress/e2e/accesibilidad/` (CYA-*, axe-core) | `taskflow-frontend/` | `npm run test:seguridad` · `npm run test:accesibilidad` · todo: `npm run test:cypress` | `pruebas/evidencias/cypress/` |
| 5. Gherkin + Screenplay | `features/*.feature`, `features/step_definitions/`, `features/support/` (Cucumber 11 + Serenity/JS) | `pruebas/e2e-screenplay/` | `npm run gherkin` | `pruebas/evidencias/gherkin/` |
| 6. IA: Playwright Test Agents | Planner / Generator / Healer con Claude Code | `pruebas/ia-herramientas/playwright-agents/` | ver su `README.md` (`npx playwright test`) | `pruebas/evidencias/ia-herramientas/playwright-agents/` |
| 6. IA: Browser Use | Agente con Ollama `llama3.1:8b` | `pruebas/ia-herramientas/browser-use/` | `.venv\Scripts\python pruebas.py` | `pruebas/evidencias/ia-herramientas/browser-use/` |
| 6. IA: Playwright MCP | Cliente MCP + Ollama (tool calling) | `pruebas/ia-herramientas/playwright-mcp/` | `node cliente.mjs` (ver `README.md`) | `pruebas/evidencias/ia-herramientas/playwright-mcp/` |
| 7. Stagehand | act / observe / extract con Ollama | `pruebas/stagehand/` | `npm test` | `pruebas/evidencias/stagehand/` |
| 8. Antes / después | Comparación git HEAD (versión anterior) vs árbol de trabajo (versión final) | `pruebas/comparacion/` | `node pruebas/comparacion/comparar.mjs` | `pruebas/evidencias/comparacion/antes-despues.md` y `.json` |
| 9. Despliegue y regresión posterior | Docker Compose (SonarQube + Jenkins), builds, imagen Docker, Quality Gate, pipeline | `pruebas/despliegue/` | `docker compose up -d` y luego `SONAR_TOKEN=<token> node pruebas/despliegue/verificar-despliegue.mjs` (opcional `JENKINS_USER`/`JENKINS_TOKEN`) | `pruebas/evidencias/despliegue/` |
| 10. Presentación | Guion de sustentación con los números reales | `PRESENTACION.md` | `node pruebas/informe/generar-presentacion.js` | — |

### Requisitos adicionales

- **Ollama** (https://ollama.com) en ejecución con el modelo local: `ollama pull llama3.1:8b`. Lo usan Stagehand, Browser Use y el cliente de Playwright MCP; sin claves de pago.
- **Python 3.11** para Browser Use (`python -m venv .venv` y `pip install browser-use==0.13.11` en `pruebas/ia-herramientas/browser-use`).
- **Docker Desktop** para SonarQube (9000) y Jenkins (8081): `docker compose up -d` en la raíz. SonarQube exige un token (Mi cuenta → Seguridad → Generar token); Jenkins exige usuario + API token para disparar el job.
- Las suites basadas en IA son lentas con el modelo local (cada llamada puede tardar de 30 s a 3 min); ejecútelas sin otras cargas pesadas en paralelo.

### Orden recomendado para regenerar toda la entrega

```bash
# 1) app en marcha (backend y frontend) y Ollama arrancado
npm run test:evidencias                                   # Jest
cd taskflow-frontend && npm run test:cypress && cd ..      # Cypress (146 casos)
cd pruebas/seguridad && npm test && cd ../..
cd pruebas/rendimiento && npm test && cd ../..
cd pruebas/accesibilidad && npm test && cd ../..
cd pruebas/e2e-screenplay && npm test && npm run gherkin && cd ../..
cd pruebas/stagehand && npm test && cd ../..
# herramientas de IA: ver README de cada carpeta en pruebas/ia-herramientas
# 2) despliegue
docker compose up -d
SONAR_TOKEN=<token> node pruebas/despliegue/verificar-despliegue.mjs
# 3) documentos
node pruebas/comparacion/comparar.mjs
node pruebas/informe/generar-matriz.js
node pruebas/informe/generar-plan.js
node pruebas/informe/generar-informe.js
node pruebas/informe/generar-presentacion.js
```

> Edite `pruebas/informe/funcionalidades.json` («integrantes») con los nombres reales y el reparto de las seis funcionalidades antes de generar el plan, la matriz, el informe y la presentación.
