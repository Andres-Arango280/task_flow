# Playwright Test Agents (Planner · Generator · Healer) sobre TaskFlow

Herramienta de IA n.º 3 de la lista del curso: [Playwright Test Agents](https://playwright.dev/docs/test-agents).
Son tres **definiciones de agente** (archivos Markdown) que Playwright genera con `npx playwright init-agents` para
que un asistente de IA planifique (**Planner**), genere (**Generator**) y repare (**Healer**) pruebas E2E usando el
navegador real a través de un servidor MCP (`npx playwright run-test-mcp-server`). Es gratuito y de código abierto;
el único coste posible es el del asistente/modelo que ejecuta los agentes.

## Qué se hizo

| Paso | Agente | Entrada | Salida |
|---|---|---|---|
| 1 | — | `npx playwright init-agents --loop=claude --prompts` | `.claude/agents/playwright-test-{planner,generator,healer}.md`, `.claude/prompts/*.md`, `.mcp.json`, `tests/seed.spec.ts` |
| 2 | Planner | Exploración de la app (`node explorar.mjs` → snapshots ARIA y capturas en `specs/exploracion/`) | `specs/plan-de-pruebas.md`: 9 escenarios en 4 funcionalidades (autenticación, equipos, proyectos, tablero) |
| 3 | Generator | El plan + los snapshots | `tests/**/*.spec.ts`: 9 pruebas (una por archivo, comentario por paso, localizadores por rol/etiqueta, datos únicos, preparación por API) |
| 4 | Healer | `tests/healer-demo.spec.ts` con localizadores rotos a propósito (`#email`, `#password`, `button.btn-login`) | Diagnóstico con el snapshot, corrección y re-ejecución (`reportes/healer-antes.json` → `reportes/healer-despues.json`, diff en `reportes/healer-diff.md`) |

## Honestidad sobre el «loop» de IA

El flujo oficial conecta el asistente del IDE (Copilot, Claude, Codex) al servidor MCP `playwright-test`, que expone
`planner_setup_page`, `generator_write_test`, `test_debug`, etc. En esta entrega **no había clave de API** para esos
asistentes, así que:

- el asistente de IA fue **Claude Code**, que leyó cada definición de agente y la siguió literalmente;
- la exploración del navegador (lo que haría `browser_snapshot` del MCP) se hizo con `explorar.mjs`, que vuelca el
  **mismo árbol de accesibilidad** (`locator.ariaSnapshot()`) de cada página;
- el plan, las pruebas y la reparación son los artefactos reales que producirían los agentes; `.mcp.json` queda
  configurado para repetir el flujo desde un IDE con MCP (`/playwright-test-planner`, `/playwright-test-generator`,
  `/playwright-test-healer`).

Con el MCP conectado, el Generator ejecutaría cada paso en vivo y leería el *generator log* para elegir localizadores,
y el Healer pausaría la prueba fallida (`test_debug`) para inspeccionar el DOM en el punto exacto del fallo.

## Ejecutar

```bash
cd pruebas/ia-herramientas/playwright-agents
npm install
node explorar.mjs                                  # exploración (Planner)
npx playwright test --grep-invert "healer|seed"    # pruebas generadas (Generator)
npx playwright test tests/healer-demo.spec.ts      # prueba sanada (Healer)
node generar-resumen.mjs                           # evidencias → ../../evidencias/ia-herramientas/playwright-agents/
```

Requiere el backend (`http://localhost:3000`) y el frontend (`http://localhost:5173`) en marcha y Google Chrome
instalado (`channel: 'chrome'`).

## Evidencias

`pruebas/evidencias/ia-herramientas/playwright-agents/`: `resumen.json` (objetivo, esperado, obtenido, estado y
evidencia de cada caso PWA-01…PWA-11), `specs/` (plan y exploración), `tests/` (pruebas generadas), `reportes/`
(informe HTML, JSON de resultados, antes/después del healer y diff), `capturas/` y `.claude/` (definiciones de agentes).
