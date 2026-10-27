# Browser Use + Ollama sobre TaskFlow

Herramienta de IA n.º 4 de la lista del curso: [Browser Use](https://browser-use.com) (biblioteca Python abierta).
Un **agente LLM** recibe una tarea en lenguaje natural, observa el DOM de la página y decide qué acciones ejecutar
(navegar, escribir, pulsar, extraer) hasta dar por terminada la tarea. Aquí el modelo es local y gratuito:
**Ollama `llama3.1:8b`** (`browser_use.llm.ChatOllama`), sin claves de pago.

## Diseño de las pruebas

- La **tarea** se describe al agente en inglés (el modelo pequeño sigue mejor las instrucciones así); el resultado se
  pide en español.
- La **verificación la hace el script en código**, no el modelo: URL final, texto del `final_result` y consultas a
  la API (`GET /equipos`). Así un modelo que "afirma" éxito sin lograrlo queda como `Fallido`.
- Los datos (usuarios, equipos) se crean por API con sufijo único; en BU-03 la sesión se inyecta en `localStorage`
  antes de arrancar el agente.
- Ajustes para un modelo de 8B sin visión: `use_vision=False`, `use_thinking=False`, `use_judge=False`,
  `max_actions_per_step=2`, `max_steps=10`.
- Navegador: el script lanza Chromium headless con `--remote-debugging-port` y conecta con `Browser(cdp_url=...)`.
  Motivo: Browser Use espera el CDP solo 30 s y, con la máquina cargada (Ollama y otras suites a la vez), Chrome
  tardaba más y el agente abortaba. Lanzándolo aquí se controla la espera (hasta 180 s).

| Id | Tipo | Tarea del agente | Verificación |
|---|---|---|---|
| BU-01 | exploratorio | Abrir `/login` y describir título, etiquetas y botón | El resultado menciona «Iniciar sesión», «correo» y «contraseña» |
| BU-02 | exitoso | Iniciar sesión con credenciales válidas | URL final `/` o resultado con «Mis equipos» |
| BU-03 | exitoso | Con sesión, crear un equipo con nombre único | `GET /equipos` contiene ese nombre |
| BU-04 | error | Iniciar sesión con contraseña incorrecta | Resultado con «no son correctos» y última URL `/login` |

## Ejecutar

```bash
cd pruebas/ia-herramientas/browser-use
python -m venv .venv
.venv\Scripts\pip install browser-use==0.13.11
.venv\Scripts\python pruebas.py          # todos los casos (lento con un modelo local)
.venv\Scripts\python pruebas.py BU-02    # un caso
```

Requiere Ollama en `http://localhost:11434` con `llama3.1:8b`, el backend (3000) y el frontend (5173). Variables:
`OLLAMA_MODEL`, `OLLAMA_HOST_URL`, `CHROME_PATH`, `BU_MAX_PASOS`.

## Evidencias

`pruebas/evidencias/ia-herramientas/browser-use/`: `resumen.json`; `salidas/BU-xx-historial.json` (tarea, acciones
del modelo, `final_result`, URLs, errores y verificación), `salidas/BU-xx-historial-completo.json` (historial nativo
de Browser Use), `salidas/BU-xx-conversacion/` (prompts y respuestas del modelo por paso), `capturas/` y `gif/`.
