# Pruebas E2E de TaskFlow con Stagehand e IA (act, observe, extract)

[Stagehand](https://github.com/browserbase/stagehand) es un SDK de automatización de navegadores que combina
código Playwright convencional con instrucciones en lenguaje natural resueltas por un modelo de lenguaje.
Sus tres capacidades, trabajadas en clase, son:

| Capacidad | Qué hace | Cómo se valida aquí |
|---|---|---|
| `observe(instrucción)` | Lee el árbol de accesibilidad de la página y devuelve **acciones candidatas** con selectores reales (`xpath=…`), descripción y método. | Los selectores devueltos se resuelven con Playwright y se comprueba el elemento real (etiqueta, `type`, texto). |
| `act(instrucción)` | Pide al modelo que elija **una** acción (click, fill, type, selectOption…) sobre un elemento y la ejecuta. Admite `variables` para no exponer datos sensibles al modelo. | El efecto se comprueba de forma determinista: URL, encabezado, `localStorage` y, sobre todo, el estado real en la **API** (GET /equipos, GET /tareas). |
| `extract(instrucción, esquemaZod)` | Devuelve datos estructurados **validados con zod** a partir del contenido de la página. | Se compara campo a campo con los datos creados por API para el mismo caso. |

## Por qué Ollama (modelo local y gratuito)

La rúbrica pide herramientas gratuitas y fáciles de implementar. Stagehand 3.x acepta cualquier proveedor del AI SDK de
Vercel, incluido **Ollama** (`modelName: 'ollama/<modelo>'` a través de `ollama-ai-provider-v2`). Se usa `llama3.1:8b`
(8 000 M de parámetros, cuantización Q4_K_M) ejecutándose en la propia máquina (`http://127.0.0.1:11434`), sin claves ni
coste. La configuración está en `modelo.mjs`:

```js
new Stagehand({
  env: 'LOCAL',
  model: { modelName: 'ollama/llama3.1:8b', baseURL: 'http://127.0.0.1:11434/api', temperature: 0, middleware },
  localBrowserLaunchOptions: { headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  selfHeal: true,
  logInferenceToFile: true,
});
```

### Adaptación necesaria para un modelo pequeño

Stagehand valida la respuesta del modelo con un esquema zod que exige el id del elemento con el formato `0-38`.
`llama3.1:8b` lo copia tal como aparece en el árbol de accesibilidad (`[0-38]`), lo que hacía fallar la validación.
`modelo.mjs` registra un **middleware del AI SDK** (`wrapGenerate`) que normaliza el JSON antes de la validación
(quita los corchetes y los bloques ```` ```json ````). El contador `correcciones` del `resumen.json` indica cuántas
respuestas tuvieron que corregirse: es una medida objetiva de la fiabilidad del modelo local.

## Casos

| Id | Capacidad | Funcionalidad | Tipo | Qué se verifica |
|---|---|---|---|---|
| ST-01 | observe | Autenticación | exitoso | Los selectores devueltos resuelven al correo (`type=email`), la contraseña (`type=password`) y el botón «Iniciar sesión». |
| ST-02 | observe + act | Autenticación | exitoso | Credenciales rellenadas con los selectores de observe (sin pasar por el modelo) y `act` pulsa «Iniciar sesión»: URL `/`, h1 «Mis equipos», token en `localStorage`. |
| ST-03 | extract | Equipos | exitoso | `{ equipos: [{ nombre }] }` coincide exactamente con los 3 equipos creados por API. |
| ST-04 | act ×3 | Equipos | exitoso | «Nuevo equipo» → escribir `%nombre%` (variable) → «Crear equipo»; GET /equipos devuelve el equipo. |
| ST-05 | observe + act | Tareas / tablero | exitoso | observe reconoce «Por Hacer», «En Progreso», «Hecho»; act abre la tarjeta y selecciona «Hecho» en «Columna»; la API confirma la lista. |
| ST-06 | extract | Listas / proyectos | exitoso | `{ columnas: [{ nombre, tareas[] }], progreso }` coincide con la API (1 de 2 tareas hechas → 50 %). |
| ST-07 | act | Robustez | error | Instrucción imposible («Exportar a PDF»): `act` devuelve `success=false` o error controlado y la página no cambia. |

Cada caso crea **sus propios datos por API** (usuario, equipos, proyecto, tareas con sufijo temporal) para que la página
sea pequeña y el resultado sea reproducible. El objetivo, el resultado esperado, el **resultado obtenido real**, el estado,
la duración y los tiempos de cada llamada al modelo quedan en `../evidencias/stagehand/resumen.json`.

## Ejecución

Requisitos: Node 20+, Google Chrome, backend en `http://localhost:3000`, frontend en `http://localhost:5173` y Ollama en
marcha con el modelo descargado (`ollama pull llama3.1:8b`).

```bash
cd pruebas/stagehand
npm install
npm run humo        # comprobación rápida: observe sobre /login (≈ 20-40 s)
npm test            # los 7 casos (≈ 5-15 min según la máquina)
SOLO=ST-03,ST-06 npm test   # solo algunos casos (en PowerShell: $env:SOLO='ST-03'; npm test)
```

Variables opcionales: `STAGEHAND_MODELO` (p. ej. `ollama/qwen2.5:7b`), `OLLAMA_URL`, `STAGEHAND_TIMEOUT_MS` (300000 por
defecto), `STAGEHAND_VERBOSE=1|2`, `CHROME_PATH`, `TASKFLOW_URL`, `TASKFLOW_API_URL`.

## Evidencias (`pruebas/evidencias/stagehand/`)

| Archivo | Contenido |
|---|---|
| `resumen.json` | Totales, capacidades usadas, configuración del modelo, condiciones y ficha de cada caso. |
| `capturas/ST-xx.png` | Captura del estado final del navegador en cada caso. |
| `salidas/ST-xx.json` | Instrucciones enviadas y respuestas devueltas por observe/act/extract, datos de prueba creados por API y tiempos de inferencia. |
| `inferencias/` | Registro de inferencia de Stagehand (`logInferenceToFile`): prompt completo enviado al modelo y su respuesta, por llamada. |

## Limitaciones observadas del modelo local

Se documentan en la sección de Stagehand del informe final a partir de los resultados reales (`obtenido`,
`tiemposIA` y `modelo.correcciones` del `resumen.json`). En general:

* **Lentitud**: sin GPU dedicada, cada llamada tarda de 10 s (páginas pequeñas) a más de un minuto (tablero completo),
  frente a 1-3 s con un modelo en la nube. Por eso los datos se preparan por API y se limita el árbol con `selector`.
* **Formato**: el modelo no siempre respeta el formato pedido (ids con corchetes); se corrige con el middleware.
* **Comprensión**: las instrucciones funcionan mejor cortas, en inglés y citando el texto exacto del botón o la etiqueta
  entre comillas («Click the "Crear equipo" button»).
* **Verificación**: la IA localiza y actúa, pero la **validación** del resultado nunca se delega al modelo: siempre se
  comprueba con Playwright y con la API.
