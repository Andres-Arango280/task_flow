# TaskFlow: 7 pruebas E2E con Katalon Recorder (extensión de Chrome)

Archivo para importar: **`TaskFlow-KatalonRecorder.html`**. Es una suite con 7 casos de prueba y 181 comandos, en el mismo formato que guarda Katalon Recorder.

## Casos de prueba

| Caso | Camino de la aplicación | Tipo | Resultado esperado |
|---|---|---|---|
| TC01_Registro_y_login_exitoso | Registro → inicio de sesión → Mis equipos | Positivo | Aparece "Cuenta creada correctamente", entra a "Mis equipos" y la barra muestra el correo del usuario |
| TC02_Registro_rechaza_contrasena_debil | Registro con la contraseña `abcdefgh` | Negativo | El requisito "Al menos un número" queda pendiente, aparece un error y no se crea la cuenta |
| TC03_Login_con_credenciales_invalidas | Inicio de sesión con una cuenta inexistente | Negativo | Aparece "El correo o la contraseña no son correctos" y no se entra |
| TC04_Crear_equipo | Mis equipos → Nuevo equipo | Positivo | Aparece el aviso "Listo … creado" y la tarjeta del equipo con la insignia "Líder" |
| TC05_Crear_proyecto_con_tablero_de_3_columnas | Equipo → Nuevo proyecto → Tablero | Positivo | El tablero tiene las columnas Por Hacer, En Progreso y Hecho |
| TC06_Tareas_validacion_y_busqueda | Tablero → tarea sin título → 2 tareas → buscar "disenar" | Positivo y negativo | Error de título obligatorio; las tareas se crean; la búsqueda sin tilde encuentra solo "Diseñar portada" (1 de 2) |
| TC07_Preferencias_cierre_de_sesion_y_ruta_protegida | Preferencias → Salir → abrir /preferencias sin sesión | Positivo y negativo | El alto contraste se activa y se restablece; al salir se vuelve al login; la página privada redirige a "Iniciar sesión" |

Cada caso es **independiente**:
- borra la sesión anterior (`localStorage.clear()`);
- crea su propio usuario con un correo único (`runScript` con `Date.now()` guardado en `${ts}`).

Se pueden ejecutar por separado o en suite, y repetir tantas veces como se quiera.

## Cómo ejecutarlas

1. **Levanta la aplicación**: backend en http://localhost:3000 y frontend en http://localhost:5173.
2. Abre **Katalon Recorder** (icono de la extensión en Chrome).
3. En el panel izquierdo, junto a *Test Suites*, pulsa **Open** (icono de carpeta) y elige `TaskFlow-KatalonRecorder.html`. Aparece la suite *"TaskFlow - Katalon Recorder (7 caminos)"* con sus 7 casos.
4. Deja abierta una pestaña de Chrome en http://localhost:5173. Katalon Recorder ejecuta los comandos en la pestaña activa.
5. Elige qué ejecutar:
   - **Play Suite**: los 7 casos seguidos.
   - **Play**: solo el caso seleccionado.
6. Si algún paso va demasiado rápido para tu equipo, baja la velocidad en **Speed** (por ejemplo, a la mitad).

## Evidencias para el informe

- **Log:** la pestaña *Log*, abajo, muestra cada comando en verde (OK) o rojo (fallo). Puedes copiar el log o hacerle una captura.
- **Capturas de pantalla:** haz una captura del panel al terminar la suite, con los 7 casos en verde.
- **Reporte:** el botón **Export** del caso, o el menú de la suite, genera el script en otros lenguajes. El historial de ejecución está en *Logs / Reports*.
- **Verificación sin la extensión:** se puede ejecutar la verificación automática:
  ```bash
  node pruebas/katalon/recorder/verificar-suite.js
  ```
  Reproduce la suite con los mismos comandos internos de Katalon Recorder y guarda una captura por caso y `verificacion.json` en `pruebas/evidencias/katalon/recorder/`.

## Comandos de Katalon Recorder que usa la suite

| Comando | Para qué |
|---|---|
| `open` | Abrir una URL |
| `runScript` | Limpiar la sesión y generar datos únicos (`${ts}`) |
| `store` | Guardar el correo del usuario en `${email}` |
| `type`, `click` | Escribir y pulsar |
| `waitForElementPresent` / `waitForElementNotPresent` | Esperas explícitas hasta que algo aparezca o desaparezca |
| `assertElementPresent` / `assertElementNotPresent` | Verificar lo que debe estar en pantalla y lo que no |
| `assertText`, `assertTitle`, `assertAttribute` | Verificar textos, el título de la pestaña y atributos |

## Localizadores

- Son **XPath por texto visible y atributos accesibles**: etiquetas `label`, roles `dialog` / `alert` y `data-testid`. No dependen de clases CSS.
- Son los mismos que se validaron para el proyecto de Katalon Studio (`pruebas/katalon/TaskFlow-Katalon/Object Repository`).

## Notas

- Los casos dejan usuarios de prueba en la base de datos, con correos `tcXX.<número>@taskflow.test`. No afectan a otros datos.
- Si cambias los casos, edita `casos.js` y regenera el HTML:
  ```bash
  node pruebas/katalon/recorder/generar-suite.js
  ```
