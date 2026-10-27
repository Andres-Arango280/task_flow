# Guion de presentación — TaskFlow (entrega final de pruebas)

> Generado el 27/10/2026, 8:41:34 a. m. con `node pruebas/informe/generar-presentacion.js` a partir de las evidencias reales. Duración objetivo: 15 minutos + preguntas.

## 1. Apertura (1 min)

- **Qué es TaskFlow**: gestión colaborativa de tareas con equipos, proyectos y tableros Kanban (Por Hacer / En Progreso / Hecho). Backend NestJS + PostgreSQL, frontend React + Vite.
- **Qué entregamos**: plan de pruebas, matriz de trazabilidad, informe final, Cypress sobre las seis funcionalidades, Screenplay + Gherkin, tres herramientas de IA, Stagehand, software refactorizado (antes/después) y el despliegue con SonarQube y Jenkins con regresión posterior.

## 2. Seis funcionalidades y aportes por integrante (2 min)

| Integrante | Funcionalidades | Qué muestra |
|---|---|---|
| Andrés Arango | F1 Autenticación (registro e inicio de sesión)<br>F2 Usuarios: perfil, cuenta, preferencias de accesibilidad, ayuda y privacidad<br>F3 Equipos y miembros<br>F4 Proyectos<br>F5 Listas y tablero Kanban (progreso, búsqueda, filtros)<br>F6 Tareas (crear, editar, mover, asignar, eliminar) | Casos Cypress de cada funcionalidad (API, UI, componentes, seguridad, accesibilidad), escenarios Screenplay/Gherkin, herramientas de IA, Stagehand y correcciones aplicadas |

| Funcionalidad | Casos trazados | Aprobados | Exitosos / alternativos / error | Defectos corregidos |
|---|---:|---:|---|---|
| F1 Autenticación (registro e inicio de sesión) | 138 | 125 | 40 / 7 / 86 | C-10, C-14, C-05, C-06, C-09, C-07, C-04, C-12, C-17, C-01 |
| F2 Usuarios: perfil, cuenta, preferencias de accesibilidad, ayuda y privacidad | 120 | 112 | 72 / 0 / 17 | C-17, C-18, C-16 |
| F3 Equipos y miembros | 87 | 80 | 40 / 5 / 41 | C-15 |
| F4 Proyectos | 55 | 54 | 34 / 1 / 19 | C-12 |
| F5 Listas y tablero Kanban (progreso, búsqueda, filtros) | 56 | 52 | 33 / 0 / 21 | C-16 |
| F6 Tareas (crear, editar, mover, asignar, eliminar) | 66 | 64 | 25 / 3 / 35 | C-16 |

## 3. Plan de pruebas y matriz de trazabilidad (2 min)

- Abrir `pruebas/informe/Plan-de-Pruebas-TaskFlow.docx`: alcance (6 funcionalidades, 23 requisitos), niveles (unitario → API → sistema → aceptación → IA), criterios de salida, riesgos.
- Abrir `pruebas/evidencias/matriz/Matriz-Trazabilidad-TaskFlow.xlsx` (hoja **Requisitos**): 529 casos trazados, 23/23 requisitos cubiertos, 20 defectos (hoja Defectos) enlazados con los casos que los verifican.
- Mensaje clave: la matriz y el informe se **generan automáticamente** desde los `resumen.json` de cada suite; no hay resultados escritos a mano.

## 4. Demostración en vivo (6 min)

| Paso | Comando | Qué señalar |
|---|---|---|
| Cypress seguridad (13 casos, ~10 s) | `cd taskflow-frontend && npm run test:seguridad` | JWT manipulado → 401, 6.º intento → 429, BOLA → 403, XSS mostrado como texto, cabeceras helmet, CORS |
| Cypress accesibilidad (11 casos, ~20 s) | `npm run test:accesibilidad` | axe-core WCAG A/AA sin violaciones en 8 pantallas + diálogo modal + alto contraste + teclado |
| Gherkin + Screenplay (12/12, ~50 s) | `cd pruebas/e2e-screenplay && npm run gherkin` | Abrir un .feature (Feature → Rule → Scenario con Given/When/Then y texto en español, formato de la Clase 19) y el informe Serenity con las tareas Screenplay anidadas |
| Stagehand (2/7) | mostrar `pruebas/evidencias/stagehand` (capturas + salidas JSON) | observe devuelve selectores reales; extract valida con zod; act con instrucción imposible → success=false |
| Playwright Agents (11/11) | abrir `pruebas/ia-herramientas/playwright-agents/specs/plan-de-pruebas.md` y `reportes/healer-diff.md` | Planner → Generator → Healer: el localizador roto se repara y la prueba vuelve a pasar |

Suites completas ya ejecutadas (mostrar reportes HTML si hay tiempo): Jest 137/137 (cobertura líneas 91.5 %), Cypress 146/146, Screenplay 18/18, Seguridad OWASP 48/53, Rendimiento 6/6, UX/a11y 68/68, Browser Use 1/4, Playwright MCP 1/3.

## 5. Antes y después de la refactorización (2 min)

- Versión anterior: commit `8b46dc0` (2026-09-23), API sobre MongoDB/Mongoose, sin helmet, CORS abierto, secreto JWT por defecto, 142 casos automatizados.
- Versión final: PostgreSQL/TypeORM con índices, helmet, CORS restringido, bloqueo de fuerza bruta, validación en español, accesibilidad WCAG, ayuda/preferencias/privacidad; 373 casos automatizados (+231), 59 archivos de prueba.
- 20 correcciones trazadas (C-01…C-20); usabilidad GRIHO 52,3 % → 93,4 %; p95 REN-02 569 ms → 273 ms.
- Mostrar `pruebas/evidencias/comparacion/antes-despues.md`: extractos de `src/main.ts` y `auth.service.ts` antes/después.

## 6. Despliegue y regresión posterior (1 min)

- **DEP-01** Servicios de CI/CD en ejecución (docker compose): Aprobado — jenkins: running; sonarqube: running; sonarqube-db: running
- **DEP-02** Compilación del backend (nest build): Aprobado — nest build terminó con código 0 y generó dist/main.js
- **DEP-03** Compilación del frontend (tsc + vite build): Aprobado — vite build terminó con código 0 y generó dist/index.html
- **DEP-04** Imagen Docker del backend (misma etapa que el pipeline): Aprobado — docker build OK: imagen creada
- **SON-01** Servidor SonarQube disponible: Aprobado — SonarQube 9.9.8.100196 status=UP
- **SON-02** Análisis SonarQube del backend (sonar-scanner): Aprobado — Informe subido y procesado (31 archivos indexados); estado reportado por el scanner: PASSED
- **SON-03** Quality Gate del backend: Aprobado — Quality Gate=OK; condiciones: new_reliability_rating OK (1 vs GT 1) · new_security_rating OK (1 vs GT 1) · new_maintainability_rating OK (1 vs GT 1) · new_coverage OK (88.1 vs LT 8
- **SON-04** Análisis SonarQube del frontend (sonar-scanner): Aprobado — Informe subido y procesado (56 archivos indexados); estado reportado por el scanner: PASSED
- **SON-05** Quality Gate del frontend: Aprobado — Quality Gate=OK; condiciones: new_reliability_rating OK (1 vs GT 1) · new_security_rating OK (1 vs GT 1) · new_maintainability_rating OK (1 vs GT 1) · new_duplicated_lines_density 
- **JEN-01** Servidor Jenkins y job del pipeline disponibles: Aprobado — Jenkins OK (1 jobs); taskflow-pipeline: color=blue, último build #13 (SUCCESS), último exitoso #13
- **JEN-02** Último build exitoso del pipeline (#13): Aprobado — Build #13 del 27/10/2026, 12:21:27 a. m. sobre el commit f6522aa: etapas Declarative: Checkout SCM → Declarative: Tool Install → Checkout → Instalar dependencias → Pruebas de regre
- **JEN-03** Diagnóstico del último build no exitoso (#12, FAILURE): Aprobado — Build #12 del 27/10/2026, 12:11:07 a. m.: QUALITY GATE STATUS: FAILED - View details on http://sonarqube:9000/dashboard?id=taskflow%3Abackend — el análisis se ejecutó sin coverage/
- **JEN-04** Build final del pipeline sobre la versión refactorizada (#13): Aprobado — Build #13 (existente) del 27/10/2026, 12:21:27 a. m. sobre el commit f6522aa: SUCCESS en 187 s; etapas Declarative: Checkout SCM → Declarative: Tool Install → Checkout → Instalar d
- Regresión completa posterior: Regresión backend 137/137; Cypress 146/146; E2E Screenplay 18/18; E2E Gherkin + Screenplay 12/12; Seguridad OWASP 48/53; UX y accesibilidad 68/68; Rendimiento 6/6.

## 7. Cierre: métricas, calidad y recomendaciones (1 min)

- Casos ejecutados o preparados en total: 529; cobertura de servicios 91.5 %; 0 violaciones WCAG A/AA; hallazgos de seguridad abiertos documentados como mejoras (límite por IP, enumeración por correo, CSP del frontend, dependencias que exigen NestJS 11).
- IA: el modelo local gratuito (llama3.1:8b) sirve para explorar y generar pruebas, pero su latencia y el formato de salida limitan su uso en regresión; la validación determinista siempre decide el resultado.
- Recomendaciones: CSP y cookie HttpOnly en el frontend, actualizar Vite/NestJS, límite por IP, integrar todas las suites en Jenkins.

## Preguntas frecuentes de sustentación

- **¿Cómo se enlaza Gherkin con Screenplay?** Cada paso Given/When/Then tiene una definición en `features/step_definitions/*.ts` que llama a `actorDe("ella").attemptsTo(Tarea…)` (el pronombre se resuelve al actor en escena, como Alicia/ella en la clase); las tareas son las mismas que usan los specs SP-01…SP-18.
- **¿Qué hace cada capacidad de Stagehand?** `observe` lista acciones con selectores; `act` ejecuta una instrucción y se autorrepara; `extract` devuelve datos validados por esquema zod. Todo se comprueba después contra la API.
- **¿Por qué fallan algunos casos de Stagehand/IA?** Son limitaciones del modelo local (JSON fuera de esquema, omisiones, lentitud), documentadas como tales; no son defectos de TaskFlow.
- **¿Cómo verifico un módulo concreto?** `npm run test:unit:<modulo>` / `npm run test:e2e:<modulo>`; en Cypress, `--spec cypress/e2e/api/<modulo>.cy.ts`.
- **¿Qué hace la Quality Gate?** Comprueba bugs, vulnerabilidades, cobertura y duplicación en SonarQube; el pipeline aborta si falla (`waitForQualityGate abortPipeline: true`).
- **¿Cómo reproducir la demostración de regresión?** Quitar la lista «Hecho» en `proyectos.service.ts`, ejecutar `npm run test:regression:unit` (2 fallos), revertir y volver a ejecutar.

---
Documentos: `pruebas/informe/Informe-Pruebas-TaskFlow.docx` · `pruebas/informe/Plan-de-Pruebas-TaskFlow.docx` · `pruebas/evidencias/matriz/Matriz-Trazabilidad-TaskFlow.xlsx` · `README_COMANDOS.md`.
