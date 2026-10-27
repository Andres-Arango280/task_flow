# Playwright MCP + asistente de IA local sobre TaskFlow

Herramienta de IA n.º 2 de la lista del curso: [Playwright MCP](https://github.com/microsoft/playwright-mcp).
Es un servidor del *Model Context Protocol* que expone el navegador real como herramientas (`browser_navigate`,
`browser_snapshot`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_take_screenshot`…). Normalmente lo
usa GitHub Copilot (modo agente) o Claude desde el IDE. Aquí, al no disponer de clave de API para esos asistentes,
el **asistente es un cliente propio** (`cliente.mjs`) que conecta el servidor MCP con un modelo local de **Ollama
(llama3.1:8b)** mediante *tool calling* nativo. El servidor MCP, las herramientas y el flujo son exactamente los mismos.

## Cómo funciona `cliente.mjs`

1. Arranca `@playwright/mcp` por stdio (`--headless --isolated`, Chrome instalado) con `@modelcontextprotocol/sdk`.
2. Pide la lista de herramientas y expone al modelo solo 7 esenciales (menos opciones → decisiones más fiables en un modelo de 8B).
3. Bucle agente (máx. 12 turnos): el modelo decide una herramienta por turno; el cliente la ejecuta en el servidor
   MCP y le devuelve la respuesta (el *snapshot* de accesibilidad con referencias `ref=eN`).
4. El modelo termina con un JSON `{"resultado", "exito"}`.
5. **Verificación en código**: el cliente llama por su cuenta a `browser_snapshot` y `browser_take_screenshot` y
   comprueba el texto esperado (p. ej. `heading "Mis equipos"`), sin fiarse de lo que afirme el modelo.
6. Guarda la transcripción completa (cada mensaje, cada `tool_call` con sus argumentos y la respuesta recortada de la
   herramienta) y las capturas, y genera `resumen.json`.

## Casos

| Id | Tipo | Qué hace el asistente | Verificación en código |
|---|---|---|---|
| MCP-01 | exploratorio | Abre `/login`, toma el snapshot y enumera los campos | Usó `browser_snapshot`; su respuesta menciona correo, contraseña y «Iniciar sesión»; la página final es /login |
| MCP-02 | exitoso | Escribe credenciales válidas (usuario creado por API) y pulsa «Iniciar sesión» | El snapshot final contiene `heading "Mis equipos"` |
| MCP-03 | error | Escribe una contraseña incorrecta y pulsa el botón | El snapshot final contiene la alerta «El correo o la contraseña no son correctos» y la URL sigue en /login |

## Ejecutar

```bash
cd pruebas/ia-herramientas/playwright-mcp
npm install
node cliente.mjs            # todos los casos (lento: cada turno del modelo local tarda de 30 s a varios minutos)
node cliente.mjs MCP-02     # un caso
node listar-herramientas.mjs   # ver las herramientas que expone el servidor MCP
```

Requiere Ollama en `http://localhost:11434` con `llama3.1:8b` (`ollama pull llama3.1:8b`), el backend (3000) y el
frontend (5173) en marcha. Variables: `OLLAMA_MODEL`, `OLLAMA_HOST_URL`, `MCP_MAX_TURNOS`, `CHROME_PATH`.

## Evidencias

`pruebas/evidencias/ia-herramientas/playwright-mcp/`: `resumen.json`, `salidas/MCP-xx-transcripcion.json` (transcripción
completa y snapshot final), `capturas/MCP-xx-final.png` (y las capturas que el propio modelo decidió tomar).
