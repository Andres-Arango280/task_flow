# TaskFlow — Guía de la entrega final: cómo probar y mostrar cada criterio de la rúbrica

Esta guía explica, criterio por criterio, **qué entregamos, dónde está, cómo se ejecuta y qué mostrar en la sustentación**. Todos los resultados (objetivo, resultado esperado, resultado obtenido y evidencia de cada prueba) se generan automáticamente a partir de los archivos `pruebas/evidencias/<suite>/resumen.json`; nada está escrito a mano.

Repositorio: https://github.com/Andres-Arango280/task_flow (rama `main`).

---

## 0. Preparación del entorno (una sola vez)

| Requisito | Para qué | Cómo comprobarlo |
|---|---|---|
| Node.js 20.x y npm | backend, frontend y todas las suites JS | `node -v` |
| PostgreSQL 18 local (usuario `postgres`, base `taskflow`) | backend NestJS + TypeORM | `psql -U postgres -c "\l"` |
| Docker Desktop | SonarQube (puerto 9000) y Jenkins (puerto 8081) | `docker ps` |
| Ollama con `llama3.1:8b` | Stagehand, Browser Use y Playwright MCP (IA local y gratuita) | `ollama list` |
| Python 3.11 | Browser Use | `py -3.11 --version` |
| Google Chrome | Cypress, Playwright, Lighthouse, Katalon | — |

Pasos:

```bash
# 1) Variables de entorno del backend (copie y ajuste la contraseña de PostgreSQL)
copy .env.example .env

# 2) Dependencias
npm install
cd taskflow-frontend && npm install && cd ..

# 3) Arrancar la aplicación (dos terminales)
npm run start:dev                     # backend  → http://localhost:3000
cd taskflow-frontend && npm run dev   # frontend → http://localhost:5173

# 4) Infraestructura de CI/CD
docker compose up -d                  # SonarQube http://localhost:9000 · Jenkins http://localhost:8081
```

> Las suites comparten la misma base de datos y el mismo backend: ejecútelas **una tras otra**, no en paralelo. Las que usan IA local son lentas (cada llamada al modelo tarda de 30 s a 3 min).

---

## 1. Plan de Pruebas Completo

- **Documento:** `pruebas/informe/Plan-de-Pruebas-TaskFlow.docx`
- **Generador:** `node pruebas/informe/generar-plan.js` (lee `pruebas/informe/funcionalidades.json` y las evidencias).
- **Qué mostrar:** alcance (6 funcionalidades, 23 requisitos RF/RNF), estrategia por niveles (unitario → API → sistema/UI → aceptación Gherkin → IA), entorno, herramientas, criterios de entrada/salida, riesgos y cronograma. Señale que el plan usa los mismos identificadores (F1–F6, RF01–RF13, RNF01–RNF10) que la matriz y el informe.

## 2. Matriz de Trazabilidad actualizada

- **Archivo principal (formato RTM de la asignatura):** `pruebas/evidencias/matriz/Matriz-Trazabilidad-RTM-TaskFlow.xlsx`, con las hojas **Lookups**, **RTM**, **Dashboard**, **Defectos** y **Cómo usar** de la plantilla del curso. Una fila por par caso × requisito (1 004 filas, 529 casos únicos) con HU, RF/RNF, escenario (exitoso / alternativo / error), nivel, tipo, prioridad, riesgo, sprint, estado Pass/Fail/Blocked/Not Run, defecto, severidad, versión, entorno, fecha, notas con el resultado obtenido, evidencia y la fórmula de cobertura por requisito.
- **Archivo detallado:** `pruebas/evidencias/matriz/Matriz-Trazabilidad-TaskFlow.xlsx` (también `matriz.json` y `matriz.md`).
- **Regenerar:** `node pruebas/informe/generar-matriz.js && node pruebas/informe/generar-rtm.js`
- **Qué mostrar:** en el RTM, la hoja **Dashboard** (total, % aprobación, cobertura por cada uno de los 23 requisitos con semáforo, filas por suite), un filtro en la hoja **RTM** por requisito o por funcionalidad F1…F6, y la hoja **Defectos** (20 correcciones C-01…C-20 con los casos que las verifican y 5 hallazgos abiertos HAL-01…HAL-05). En el archivo detallado, la hoja **Casos** con objetivo, esperado, obtenido y evidencia de cada caso. Cobertura: 23/23 requisitos.
- **Mensaje clave:** la matriz se construye con expresiones regulares sobre los prefijos de los casos (`API-AUTH`, `CYS-`, `GH-`, `ST-`…) definidas en `funcionalidades.json`; al añadir una prueba nueva basta con regenerarla.

## 3. Informe Final de Pruebas

- **Documento:** `pruebas/informe/Informe-Pruebas-TaskFlow.docx` (16 secciones + anexos A.1–A.11, tablas por suite e imágenes de los reportes).
- **Regenerar:** `node pruebas/informe/generar-informe.js` (cierre Word antes: el archivo queda bloqueado si está abierto). Al abrirlo, clic derecho sobre el índice → **Actualizar campos**.
- **Qué mostrar:** resumen ejecutivo con totales por suite, la sección de cada herramienta con su tabla «caso · objetivo · esperado · obtenido · evidencia», hallazgos de seguridad abiertos (documentados como mejoras, no ocultos), antes/después, despliegue y recomendaciones.

## 4. Pruebas E2E con Cypress sobre las seis funcionalidades

Cada integrante expone sus funcionalidades con casos de **flujo exitoso, alternativo y de error**, en `taskflow-frontend/cypress/e2e/` (API, regresión UI, seguridad, accesibilidad) y `cypress/component/`.

| Funcionalidad | Prefijos de casos (ejemplos) | Specs |
|---|---|---|
| F1 Autenticación (registro e inicio de sesión) | `API-AUTH`, `API-VAL`, `REG-AUT`, `CYS-JWT`, `CYS-BRU`, `CYA-LOG` | `api/auth.cy.ts`, `regresion/`, `seguridad/`, `accesibilidad/` |
| F2 Usuarios: perfil, preferencias, ayuda y privacidad | `API-USU`, `REG-PRE`, `CYS-DAT`, `CYA-PRE`, `CYA-AYU` | `api/usuarios.cy.ts`, `regresion/`, `accesibilidad/` |
| F3 Equipos y miembros | `API-EQU`, `REG-EQU`, `CYS-ACL`, `CYS-SES`, `CYA-EQU` | `api/equipos.cy.ts`, `regresion/`, `seguridad/` |
| F4 Proyectos | `API-PRO`, `REG-EQU-05/06`, `CYS-ACL-03` | `api/proyectos.cy.ts`, `regresion/` |
| F5 Listas y tablero Kanban | `API-LIS`, `REG-KAN-05…12`, `CYA-TAB`, `CMP-*`, `UNI-*` | `api/listas.cy.ts`, `regresion/`, `component/` |
| F6 Tareas (crear, editar, mover, asignar, eliminar) | `API-TAR`, `REG-KAN-01…04`, `CYS-INY-02`, `CYA-MOD` | `api/tareas.cy.ts`, `regresion/`, `seguridad/` |

Comandos (desde `taskflow-frontend/`, con backend y frontend en marcha):

```bash
npm run test:cypress         # todo: 146 casos → actualiza pruebas/evidencias/cypress/
npm run test:api             # solo API
npm run test:regresion       # solo regresión de UI
npm run test:seguridad       # 13 casos CYS-* (JWT manipulado → 401, 6.º intento → 429, BOLA → 403, XSS como texto, cabeceras helmet)
npm run test:accesibilidad   # 11 casos CYA-* con axe-core (WCAG 2.x A/AA: 0 violaciones en 8 pantallas)
npm run test:component       # componentes React
npm run cy:open              # modo interactivo para la demostración en vivo
```

- **Evidencias:** `pruebas/evidencias/cypress/` (`resumen.json`, `capturas/`, `videos/`, `informe/` HTML, `resultados/` JSON). Catálogo de casos con objetivo/esperado: `taskflow-frontend/cypress/casos/catalogo.json`.
- **Qué mostrar en vivo:** `npm run test:seguridad` (≈10 s) y `npm run test:accesibilidad` (≈20 s); luego el informe HTML de `pruebas/evidencias/cypress/informe/`.
- **Nota Windows:** si `npx cypress run` muestra «Illegal instruction» en Git Bash, use siempre los scripts `npm run …` (envuelven `node cypress/scripts/cypress.mjs`).

## 5. Pruebas E2E con Screenplay y lenguaje Gherkin

- **Carpeta:** `pruebas/e2e-screenplay/`
  - `features/*.feature` — 12 escenarios GH-01…GH-12 en español (Dado / Cuando / Entonces).
  - `features/step_definitions/*.ts` — cada paso llama a `actorCalled('Ana').attemptsTo(...)` con las **mismas tareas Screenplay** de los specs SP-01…SP-18.
  - `src/screenplay/` — actores, tareas, interacciones y preguntas (patrón Screenplay con Serenity/JS 3.48 + Playwright).
- **Comandos:**

```bash
cd pruebas/e2e-screenplay
npm install
npm test            # Screenplay puro: 18 specs SP-* (Playwright + Serenity/JS)
npm run gherkin     # Gherkin + Screenplay: 12 escenarios, 106 pasos (Cucumber 11 + @serenity-js/cucumber)
```

- **Evidencias:** `pruebas/evidencias/gherkin/` (`reporte-serenity/index.html`, `reporte-cucumber/`, `capturas/`, copia de los `.feature`) y `pruebas/evidencias/screenplay/` (reporte Serenity, reporte Playwright, vídeos, trazas).
- **Qué mostrar:** abra un `.feature`, su `step_definitions` y el informe Serenity: cada paso Gherkin se despliega en las tareas e interacciones Screenplay anidadas. Node 20 exige Cucumber 11 (Cucumber 13 requiere Node ≥ 22).

## 6. Pruebas con tres herramientas de IA (por integrante)

Las tres son gratuitas y funcionan con el modelo local `llama3.1:8b` de Ollama o con Claude Code; no hay claves de pago. Cada carpeta tiene su `README.md` con detalles.

| Herramienta | Qué hace | Carpeta y comando | Resultado y evidencia |
|---|---|---|---|
| **Playwright Test Agents** (Planner → Generator → Healer) | El agente explora la app, escribe el plan en Markdown, genera los specs y repara un localizador roto | `pruebas/ia-herramientas/playwright-agents/` → `node explorar.mjs && npx playwright test --grep-invert "healer\|seed" && node generar-resumen.mjs` | 11/11 aprobados. `specs/plan-de-pruebas.md`, `reportes/healer-diff.md`, `pruebas/evidencias/ia-herramientas/playwright-agents/` |
| **Browser Use** (agente Python) | Agente autónomo que recibe instrucciones en lenguaje natural y navega la UI | `pruebas/ia-herramientas/browser-use/` → `.venv\Scripts\python pruebas.py` | 1/4 aprobados: el modelo local no completa todos los flujos; se documenta como limitación del modelo, no de TaskFlow. `pruebas/evidencias/ia-herramientas/browser-use/` |
| **Playwright MCP** (Model Context Protocol) | Cliente MCP propio que entrega las herramientas del navegador a Ollama con *tool calling* | `pruebas/ia-herramientas/playwright-mcp/` → `node cliente.mjs` (diagnóstico: `node listar-herramientas.mjs`) | 1/3 aprobados; `salidas/` con el diálogo completo modelo ↔ herramientas. `pruebas/evidencias/ia-herramientas/playwright-mcp/` |

- **Qué mostrar:** en Playwright Agents, el plan generado y el *diff* del Healer (prueba rota → reparada → verde). En Browser Use y MCP, las salidas JSON con las acciones que el modelo eligió y la validación determinista final contra la API, que es la que decide Aprobado/Fallido.
- **Qué decir sobre los fallos:** son limitaciones del modelo gratuito (JSON fuera de esquema, pasos omitidos, latencia); con un modelo mayor las mismas pruebas pasan. La honestidad del resultado es parte de la evidencia.

## 7. Pruebas con el framework Stagehand

- **Carpeta:** `pruebas/stagehand/` (Stagehand 3.7.3 + Ollama `llama3.1:8b` vía `ollama-ai-provider-v2`).
- **Casos ST-01…ST-07:** cubren las tres capacidades: `observe` (lista acciones con selectores reales), `act` (instrucción en lenguaje natural que se autorrepara; una instrucción imposible devuelve `success=false`) y `extract` (datos validados con esquema zod y comparados con la API).
- **Comandos:**

```bash
cd pruebas/stagehand
npm install
npm run humo    # comprueba que Ollama responde
npm test        # 7 casos → pruebas/evidencias/stagehand/
```

- **Evidencias:** `pruebas/evidencias/stagehand/` (capturas por caso, salidas JSON de cada capacidad, `resumen.json` con segundos de inferencia).
- **Qué mostrar:** el `resumen.json` y una captura de `observe`; explique que el resultado es no determinista (2–3 de 7 por ejecución con el modelo local; en cinco ejecuciones cada capacidad pasó al menos una vez).

## 8. Software refactorizado: antes y después

- **Antes:** commit `8b46dc0` (23/09/2026): API sobre MongoDB/Mongoose, sin helmet, CORS abierto, secreto JWT por defecto, 142 casos automatizados, 3 242 líneas.
- **Después:** commit de entrega final: PostgreSQL/TypeORM con índices, helmet, CORS restringido, bloqueo de fuerza bruta, validación en español, accesibilidad WCAG, ayuda/preferencias/privacidad, 373 casos automatizados en código + suites externas, 16 523 líneas.
- **Comandos:**

```bash
node pruebas/comparacion/comparar.mjs     # genera pruebas/evidencias/comparacion/antes-despues.{md,json}
git log --oneline                         # historia: versión anterior → entrega final
git diff --stat 8b46dc0 HEAD -- src       # archivos del backend que cambiaron
git show 8b46dc0:src/main.ts              # ver un archivo tal como era antes
```

- **Qué mostrar:** `pruebas/evidencias/comparacion/antes-despues.md` (métricas lado a lado, correcciones C-01…C-nn trazadas a los casos que las verifican y extractos de `src/main.ts` y `auth.service.ts` antes/después). Evolución de la calidad: usabilidad GRIHO 52,3 % → 93,4 %; p95 del escenario REN-02 569 ms → 273 ms; Quality Gate de SonarQube en verde.

## 9. Evolución con todas las pruebas y último despliegue (SonarQube + Jenkins)

### 9.1 Suites completas (regresión final)

| Suite | Carpeta | Comando | Resultado |
|---|---|---|---|
| Jest unitarias + e2e API (cobertura 91,5 % líneas) | raíz | `npm run test:evidencias` | 137/137 |
| Cypress | `taskflow-frontend/` | `npm run test:cypress` | 146/146 |
| Screenplay | `pruebas/e2e-screenplay/` | `npm test` | 18/18 |
| Gherkin + Screenplay | `pruebas/e2e-screenplay/` | `npm run gherkin` | 12/12 |
| Seguridad OWASP (node:test) | `pruebas/seguridad/` | `npm test` | 48/53 (5 hallazgos aceptados y documentados) |
| Rendimiento (autocannon) | `pruebas/rendimiento/` | `npm test` | 6/6 |
| UX y accesibilidad (axe, Lighthouse, Puppeteer) | `pruebas/accesibilidad/` | `npm test` | 68/68 |
| Katalon Studio | `pruebas/katalon/` | abrir `TaskFlow-Katalon`, ejecutar `TS_Regresion_Completa`, luego `node pruebas/katalon/actualizar-resumen.js` | 16 preparados (requiere Katalon Studio instalado) |

### 9.2 Despliegue verificado

```bash
docker compose up -d
# Token de usuario de SonarQube: Mi cuenta → Seguridad → Generar token (NO lo guarde en el repositorio)
SONAR_TOKEN=<token> node pruebas/despliegue/verificar-despliegue.mjs
```

El script escribe `pruebas/evidencias/despliegue/` con 20 casos:

- **DEP-01…04** contenedores activos, `nest build`, `vite build`, imagen Docker del backend.
- **SON-01…05** servidor SonarQube, análisis con `sonar-scanner` de backend y frontend, **Quality Gate OK** en ambos (fiabilidad, seguridad y mantenibilidad A en código nuevo; cobertura nueva 87,1 %; duplicación 0 %; 100 % de hotspots revisados). Los `*-medidas.json` y `*-quality-gate.json` son las respuestas reales de la API.
- **JEN-01…04** Jenkins disponible, último build exitoso, diagnóstico de los builds fallidos (#11 sin red, #12 Quality Gate sin cobertura) y **nuevo build sobre la versión final** del repositorio `Andres-Arango280/task_flow`, disparado por el script y esperado hasta su resultado (consola en `jenkins/build-<n>-consola.log`). La etapa de regresión unitaria genera `coverage/lcov.info` para que SonarQube mida la cobertura.
- **REG-01…07** regresión completa posterior al despliegue con los totales de cada suite.

**Qué mostrar:** SonarQube en http://localhost:9000 (proyectos `taskflow:backend` y `taskflow:frontend`, Quality Gate verde, hotspot revisado como «Seguro» con su justificación, falso positivo del `@config` de Tailwind marcado). Jenkins en http://localhost:8081/job/taskflow-pipeline (etapas Checkout → Instalar → Regresión unitaria → Regresión caja negra → Compilar → SonarQube → Quality Gate → Imagen Docker). El `Jenkinsfile` aborta si la Quality Gate falla (`waitForQualityGate abortPipeline: true`).

## 10. Presentación

- **Guion:** `PRESENTACION.md` (regenerar con `node pruebas/informe/generar-presentacion.js`): apertura, funcionalidades por integrante, plan y matriz, demostración en vivo de 6 minutos, antes/después, despliegue, cierre y preguntas frecuentes de sustentación.
- **Orden sugerido de la demo (15 min):**
  1. Plan y matriz abiertos (2 min).
  2. `npm run test:seguridad` y `npm run test:accesibilidad` en Cypress (1 min).
  3. `npm run gherkin` y el informe Serenity (2 min).
  4. Evidencias de Stagehand y el `healer-diff.md` de Playwright Agents (2 min).
  5. `antes-despues.md` y `git log` (2 min).
  6. SonarQube y Jenkins en el navegador + `pruebas/evidencias/despliegue/resumen.json` (2 min).
  7. Informe final en Word y conclusiones (2 min).

---

## Formato común de toda prueba

Cada `resumen.json` sigue el mismo esquema, y de él salen la matriz, el informe y la presentación:

```json
{
  "area": "cypress", "herramienta": "Cypress 15.21.1", "comando": "npm run test:cypress", "fecha": "…",
  "totales": { "total": 146, "aprobados": 146, "fallidos": 0 },
  "casos": [{ "id": "CYS-JWT-01", "nombre": "…", "tipo": "negativo",
              "objetivo": "…", "esperado": "…", "obtenido": "…", "estado": "Aprobado",
              "evidencia": ["capturas/CYS-JWT-01.png"] }]
}
```

## Regenerar toda la entrega en orden

```bash
# con backend, frontend, Ollama y Docker en marcha
npm run test:evidencias
cd taskflow-frontend && npm run test:cypress && cd ..
cd pruebas/seguridad && npm test && cd ../..
cd pruebas/accesibilidad && npm test && cd ../..
cd pruebas/e2e-screenplay && npm test && npm run gherkin && cd ../..
cd pruebas/stagehand && npm test && cd ../..
cd pruebas/rendimiento && npm test && cd ../..           # al final: carga la CPU
# herramientas de IA: ver README de cada carpeta en pruebas/ia-herramientas
SONAR_TOKEN=<token> node pruebas/despliegue/verificar-despliegue.mjs
node pruebas/comparacion/comparar.mjs
node pruebas/informe/generar-matriz.js && node pruebas/informe/generar-rtm.js
node pruebas/informe/generar-plan.js
node pruebas/informe/generar-informe.js
node pruebas/informe/generar-presentacion.js
```

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `EBUSY` al generar el informe | Cierre el `.docx` en Word y repita el comando. |
| `Illegal instruction` con `npx cypress run` en Git Bash | Use los scripts `npm run test:*` del frontend. |
| Stagehand / Browser Use / MCP muy lentos o fallan | Compruebe `ollama list`; cierre otras cargas; repita la ejecución (resultado no determinista con el modelo local). |
| SonarQube responde 401 | Genere un token de usuario y páselo en `SONAR_TOKEN`; nunca lo escriba en archivos del repositorio. |
| Jenkins no construye tras el push | El job sondea el SCM cada 2 min (usa el repositorio del último build exitoso). `verificar-despliegue.mjs` dispara el build por sí mismo: con `JENKINS_USER`/`JENKINS_TOKEN` si se definen, o como anónimo si el administrador concedió ese permiso; también puede pulsar «Construir ahora». |
| Cucumber falla al instalar | Node 20 requiere `@cucumber/cucumber@11`; la versión 13 exige Node ≥ 22. |

Más detalle de cada suite: `README_COMANDOS.md`.
