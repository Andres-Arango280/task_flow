# Pruebas E2E de TaskFlow con Katalon Studio: guía paso a paso

Esta carpeta contiene un proyecto de **Katalon Studio** listo para abrir. Automatiza 16 recorridos funcionales de TaskFlow, 11 positivos y 5 negativos. Usa datos únicos, localizadores semánticos, esperas explícitas y verificaciones, y guarda capturas como evidencia.

> **Estado actual:** el proyecto está preparado pero **todavía no se ha ejecutado en Katalon**. En `pruebas/evidencias/katalon/resumen.json` los 16 casos figuran como *Pendiente*. Después de ejecutarlo, sigue el paso 9 para rellenar automáticamente los resultados reales.

---

## 1. ¿Qué es Katalon Studio?

Katalon Studio es un entorno de automatización de pruebas basado en **Selenium WebDriver** y **Groovy**. Organiza las pruebas en:

| Carpeta del proyecto | Para qué sirve |
|---|---|
| `Profiles/default.glbl` | Variables globales: `baseUrl`, `apiUrl`, `timeout` (10 s), `timeoutCorto` (3 s) y `contrasenaValida`. |
| `Object Repository/` | **Localizadores** agrupados por página: `Page_Login`, `Page_Registro`, `Page_Inicio`, `Page_Equipo`, `Page_Tablero`, `Page_Preferencias` y `Comunes` (diálogos, avisos y barra de navegación). Son 77 objetos XPath/CSS. |
| `Data Files/` + `Data/*.csv` | **Datos de prueba** en CSV: `credenciales_invalidas` (TC05), `titulos_tareas` (TC11) y `consultas_busqueda` (TC14). |
| `Keywords/taskflow/Utilidades.groovy` | **Palabras clave propias**: correos únicos, preparación de datos por la API, inicio de sesión y captura de evidencias. |
| `Test Cases/` + `Scripts/` | Los 16 casos (`.tc`) y su código Groovy. |
| `Test Suites/` | `TS_Regresion_Completa`, `TS_Positivas`, `TS_Negativas` y la colección `TSC_TaskFlow_Chrome`. |
| `Test Listeners/ListenerTaskFlow.groovy` | Si un caso falla, guarda la captura `FALLO_<caso>.png`. Después de cada caso cierra el navegador. |
| `settings/` | Navegador por defecto Chrome, espera por defecto de 10 s, *Smart Wait* activado, capturas en los fallos y reportes HTML/CSV. |

### Casos incluidos

| ID | Caso | Tipo | Qué verifica |
|---|---|---|---|
| TC01 | Registro_Exitoso | positivo | Requisitos "cumplido", redirección a /login con "Cuenta creada" y el correo precargado. |
| TC02 | Registro_CorreoDuplicado | negativo | Alerta "Ya existe una cuenta con el correo …" (409). |
| TC03 | Registro_ContrasenaCorta | negativo | "La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número." (con "abc" y con "abcdefgh") y "Las contraseñas no coinciden…". Comprueba que no se crea la cuenta. |
| TC04 | Login_Exitoso | positivo | Pantalla "Mis equipos", nombre del usuario en la barra y token guardado. |
| TC05 | Login_CredencialesInvalidas | negativo, **data-driven** (7 filas) | Alerta 401 "El correo o la contraseña no son correctos…" o validación HTML5 del navegador. |
| TC06 | RutaProtegida_SinSesion | negativo | Cinco rutas privadas redirigen a /login, y `GET /equipos` sin token devuelve 401. |
| TC07 | CrearEquipo | positivo | Botón deshabilitado con el nombre vacío, aviso "Equipo «X» creado" y rol de líder. |
| TC08 | InvitarMiembro_Exitoso | positivo | Buscar por correo, "Añadir al equipo", aviso y "Miembros (2)". |
| TC09 | InvitarMiembro_CorreoInexistente | negativo | Formato inválido y correo no registrado (404); el equipo sigue con un solo miembro. |
| TC10 | CrearProyecto_TresColumnas | positivo | Exactamente "Por Hacer", "En Progreso" y "Hecho", con un progreso del 0 %. |
| TC11 | CrearTarea | positivo (con Data File) | Título obligatorio y tres tareas creadas desde el CSV. |
| TC12 | MoverTarea_ProgresoActualizado | positivo | `aria-valuenow` pasa de 0 a 50 y a 100, y el valor se mantiene al recargar. |
| TC13 | EliminarTarea_ConfirmarYDeshacer | positivo | Confirmación, Cancelar, Eliminar y **Deshacer**; el resultado se mantiene al recargar. |
| TC14 | BuscarTarea_ToleranteErrores | positivo (con Data File) | La búsqueda tolera las tildes, las mayúsculas y las erratas ("pantala", "revisr"). |
| TC15 | Preferencias_AltoContraste | positivo | `<html data-contraste="alto">` se mantiene al recargar y se puede restablecer. |
| TC16 | CerrarSesion | positivo | Confirmación, token borrado y rutas privadas bloqueadas. |

Cada `.tc` incluye en su **descripción** el objetivo, el resultado esperado, los datos, las esperas y la evidencia. La cabecera de cada script repite la misma información. Por cada caso, el resultado obtenido sale del reporte de Katalon. Se copia a `resumen.json` con el paso 9.

**Por qué las pruebas son reproducibles:**
- Cada caso crea **sus propios datos** con un sello de tiempo (correos `prefijo.yyyyMMddHHmmssNNN@correo-pruebas.com`). Por eso no dependen del orden de ejecución ni de datos anteriores.
- Las precondiciones se preparan por la **API REST** (`POST /auth/register`, `/equipos`, `/proyectos`, `/tareas`). Solo la parte que se prueba pasa por la interfaz.
- El backend bloquea un correo durante 15 minutos tras 5 intentos fallidos (HTTP 429). Por eso **cada fila negativa del login usa un correo distinto**.
- El Listener cierra el navegador después de cada caso aunque el caso falle.

**Localizadores:** la app no tiene `data-testid`. Por eso los localizadores se basan en elementos estables y accesibles:
- `label` → `for` → `input`, por ejemplo `//input[@id=//label[starts-with(normalize-space(.),'Correo electrónico')]/@for]`.
- Roles ARIA: `[role=dialog]`, `[role=alertdialog]`, `[role=alert]`, `[role=status]` y `[role=progressbar]`.
- Atributos `aria-label` cuando no hay texto visible, por ejemplo `Quitar a X del equipo` o `Arrastrar tarea X`.
- `data-testid` + texto visible cuando el nombre accesible es el propio contenido (WCAG 2.5.3): `//a[@data-testid='tarjeta-equipo'][.//h3[normalize-space(.)='X']]`, `//a[@data-testid='tarjeta-proyecto'][.//span[normalize-space(.)='X']]` y `//button[@data-testid='abrir-tarea'][.//span[normalize-space(.)='X']]`.
- Los atributos `type`, `autocomplete` y `aria-keyshortcuts`.
- `data-rfd-draggable-id` para las tarjetas.
- El texto visible de los botones.

Muchos objetos están **parametrizados** con `${…}` y se usan así: `findTestObject('Page_Tablero/card_Tarea', [('titulo') : 'X'])`.

**Esperas:** se usan `waitForElementVisible`, `waitForElementClickable`, `waitForElementNotPresent` y `waitForElementAttributeValue` con un tiempo de `GlobalVariable.timeout` (10 s). Los elementos que deben desaparecer se comprueban con `verifyElementNotPresent(…, 3)`. Además, el *Smart Wait* está activado en el proyecto.

---

## 2. Versión de Katalon

- El proyecto está escrito con el formato de archivos actual de **Katalon Studio 10.x / 11.x**: `.prj`, `.rs` con `selectorCollection`, `.tc`, `.ts` con *data binding* y `.dat` CSV. La versión más reciente al preparar esta guía es la 11.6.0 (octubre de 2026).
- También debería abrirse en la 9.x. Si una versión antigua avisa de que el proyecto se creó con una versión más nueva, acepta abrirlo o instala la última versión.
- Basta con la **edición gratuita** (Katalon Studio Free).

---

## 3. Requisitos previos

1. **Windows 10/11** y **Google Chrome** actualizado.
2. **PostgreSQL** en marcha con la base `taskflow` y el `.env` del backend configurado, como indica el `README.md` de la raíz.
3. **Backend** (NestJS) en `http://localhost:3000`. Desde la raíz del repositorio:
   ```powershell
   npm install          # solo la primera vez
   npm run start:dev
   ```
4. **Frontend** (Vite) en `http://localhost:5173`. En otra terminal:
   ```powershell
   cd taskflow-frontend
   npm install          # solo la primera vez
   npm run dev
   ```
5. Comprueba que `http://localhost:5173/login` se abre en Chrome. Antes de cada suite, el proyecto comprueba automáticamente que ambos servicios respondan (palabra clave `comprobarEntorno`). Si no responden, la suite se detiene con un mensaje claro.

> Si usas otros puertos, cambia `baseUrl` y `apiUrl` en **Profiles > default**.

---

## 4. Instalar Katalon Studio (Windows)

1. Entra en **https://katalon.com/download** y pulsa *Download* para Windows (64 bits).
2. Crea una cuenta gratuita de Katalon o inicia sesión con Google o GitHub. Tienes que verificar el correo.
3. El instalador es un `.zip` (o un `.exe`, según la versión):
   - Si es `.zip`, descomprímelo en una ruta corta y **sin espacios ni tildes**, por ejemplo `C:\Katalon\Katalon_Studio_Windows_64-11.x`. Ejecuta `katalon.exe`.
   - Si es `.exe`, sigue el asistente.
   - **No hace falta instalar Java:** Katalon incluye su propio JRE.
4. En el primer arranque, inicia sesión con tu cuenta y activa la licencia **Free** (Katalon Studio Free). Si te ofrece una prueba de Enterprise, no la necesitas.
5. **Actualiza el driver de Chrome:**
   - Ve a **Tools > Update WebDrivers > Chrome**.
   - Desde la 11.6, Katalon usa por defecto *Selenium Manager* y descarga el driver automáticamente. Aun así, si ves un error de versión de ChromeDriver, usa esta opción.
6. Opcional: en **Window > Katalon Studio Preferences > General** puedes cambiar el idioma, aunque la guía usa los nombres en inglés.

---

## 5. Abrir el proyecto

1. Abre **File > Open Project…**.
2. Selecciona la carpeta `pruebas\katalon\TaskFlow-Katalon` del repositorio, la que contiene `TaskFlow-Katalon.prj`, y pulsa *Open*.
3. Espera a que termine la indexación. Verás la barra de progreso abajo a la derecha. Katalon genera las carpetas `bin/`, `Libs/` y `.settings/` y los archivos `.classpath` y `.project`. Están ignorados en `.gitignore`.
4. En **Tests Explorer** (panel izquierdo) deberías ver Profiles, Test Cases (16), Object Repository (7 carpetas), Test Suites (3 + 1 colección), Data Files (3), Keywords y Test Listeners.
5. Comprobaciones rápidas:
   - Abre **Data Files > credenciales_invalidas** y verás una tabla de 7 filas. Si sale vacía, revisa que exista `Data/credenciales_invalidas.csv`.
   - Abre **Object Repository > Page_Login > input_Correo** para ver el selector CSS. Con **Verify and Highlight** puedes comprobar un localizador con la app abierta.
   - Revisa **Project > Settings > Execution**: *Default browser* = Chrome, *Default wait for element timeout* = 10 s y *Smart Wait* activado.
   - Revisa **Project > Settings > Plugins > Report** (o *Report*, según la versión): *Generate HTML* y *Generate CSV* activados.

---

## 6. Ejecutar las pruebas

### 6.1 Un caso suelto (para probar)
Abre por ejemplo **Test Cases > TC04_Login_Exitoso** y pulsa la flecha verde **Run** (o su desplegable) > **Chrome**.

> Al ejecutar un caso suelto, **TC05** usa los valores por defecto de sus variables: solo el escenario "contraseña incorrecta". Para recorrer las 7 filas del CSV hay que ejecutarlo dentro de una **suite**.

### 6.2 Las suites (lo que se entrega)
1. En **Test Suites**, haz doble clic en **TS_Regresion_Completa**. Contiene los 16 casos en orden.
2. Pulsa el desplegable de **Run** en la barra superior > **Chrome**. No uses *Chrome (headless)* si quieres ver la ejecución.
3. Mientras se ejecuta, abajo verás:
   - **Job Progress**: el avance de la suite.
   - **Log Viewer**: cada paso en verde (PASSED) o rojo (FAILED). Puedes filtrar por *Passed* o *Failed* y expandir cada caso.
   - **Console**: el log en texto.
4. Opcionalmente, ejecuta también **TS_Positivas** y **TS_Negativas** por separado. También puedes ejecutar la colección **TSC_TaskFlow_Chrome**, que lanza ambas en Chrome de forma secuencial: ábrela y pulsa *Execute*.

**Data-driven de TC05:** ábrelo en **TS_Negativas** o **TS_Regresion_Completa**, selecciona el caso y despliega *Show Data Binding*. Verás *Data Files/credenciales_invalidas* enlazado y cada variable unida a su columna (`escenario`, `correo`, `contrasena`, `preparacion`, `validacion`, `mensaje`). Cada fila del CSV es una iteración en el reporte.

Tiempo aproximado de la regresión completa: entre 3 y 6 minutos, según el equipo.

---

## 7. Dónde quedan los resultados

| Qué | Dónde |
|---|---|
| Reporte de cada ejecución | `TaskFlow-Katalon/Reports/<yyyyMMdd_HHmmss>/<Suite>/<yyyyMMdd_HHmmss>/` |
| Reporte JUnit | `…/JUnit_Report.xml` |
| Reporte HTML y CSV | `…/<yyyyMMdd_HHmmss>.html` y `…/<yyyyMMdd_HHmmss>.csv` |
| Log de la ejecución | `…/execution0.log` |
| Capturas automáticas de fallos | En la misma carpeta del reporte (`*.png`) |
| **Capturas de evidencia de cada caso** | `TaskFlow-Katalon/Reports/evidencias/TCxx_NN_descripcion.png`, por ejemplo `TC12_03_hecho_50_por_ciento.png` |
| Capturas de fallo del Listener | `TaskFlow-Katalon/Reports/evidencias/FALLO_TCxx_….png` |

También puedes abrir el reporte dentro de Katalon: en **Tests Explorer > Reports**, haz doble clic en la ejecución. Desde la vista del reporte puedes exportar a HTML, CSV o PDF con el icono de exportar (*Export as…*).

---

## 8. Qué capturar como evidencia para el informe

Para cumplir el criterio "evidencias de resultados", adjunta al informe:

1. **Data Binding de TC05**: captura de la suite abierta con *Show Data Binding*, donde se vea el CSV enlazado.
2. **Data File**: captura de *Data Files > credenciales_invalidas* con sus 7 filas.
3. **Object Repository**: captura de un objeto con su XPath, por ejemplo `Page_Tablero/card_TareaEnColumna` con `${columna}` y `${titulo}`. Añade otra captura usando **Verify and Highlight** sobre la app.
4. **Job Progress** con la suite terminada (100 %).
5. **Log Viewer** con todos los casos en verde (*Passed*). Expande uno, por ejemplo TC12, para que se vean los pasos `waitForElementVisible`, `verifyElementAttributeValue`, etc.
6. **Vista del reporte** en Katalon (Reports > ejecución): el resumen Passed/Failed y la lista de casos, con las 7 iteraciones de TC05.
7. **Reporte HTML** abierto en el navegador (el archivo `.html` de la carpeta del reporte).
8. Las **capturas de checkpoint** de `Reports/evidencias/`. Como mínimo, una por caso: TC01_02, TC05_*, TC07_02, TC10_02, TC12_03, TC13_02, TC14_07, TC15_02 y TC16_02.
9. Si algo falla, la captura `FALLO_*.png` y el mensaje del Log Viewer. Un caso negativo que **detecta** un error de la app también es un hallazgo válido.

Para la tabla del informe con objetivo, resultado esperado, resultado obtenido y evidencia, usa `pruebas/evidencias/katalon/resumen.json` después del paso 9.

---

## 9. Rellenar `resumen.json` con los resultados reales

Después de ejecutar la suite, desde la **raíz del repositorio**:

```powershell
# Usa la ejecución más reciente de TaskFlow-Katalon/Reports
node pruebas/katalon/actualizar-resumen.js

# o indicando un JUnit (o una carpeta de ejecución) concretos
node pruebas/katalon/actualizar-resumen.js "pruebas/katalon/TaskFlow-Katalon/Reports/20261010_101500/TS_Regresion_Completa/20261010_101500/JUnit_Report.xml"
```

El script hace lo siguiente:
- Lee el `JUnit_Report.xml`. Las iteraciones de TC05 aparecen como varios `<testcase>`.
- Rellena `obtenido`, `estado` (Aprobado, Fallido o Pendiente), `evidencia` y `totales` en `pruebas/evidencias/katalon/resumen.json`.
- Copia las capturas de esa ejecución a `pruebas/evidencias/katalon/capturas/`.
- Copia el JUnit, el HTML, el CSV y el log a `pruebas/evidencias/katalon/reporte/`.

No inventa nada: un caso que no aparece en el JUnit sigue como *Pendiente*. Para volver al estado inicial, ejecuta `node pruebas/katalon/actualizar-resumen.js --reiniciar`.

---

## 10. Ejecución por línea de comandos (Katalon Runtime Engine)

- La consola `katalonc` es el **Katalon Runtime Engine (KRE)**, un producto **de pago**. Requiere una licencia de Runtime Engine y una *API key*. Katalon ofrece a veces una prueba de 30 días, normalmente con un correo corporativo.
- **Con la licencia Free de Katalon Studio no se puede ejecutar `katalonc`.**
- En este equipo no hay Katalon ni KRE instalados, y **no se ha ejecutado nada**. Por eso los resultados están *Pendiente* hasta que se ejecute en Katalon Studio. No se ha intentado evitar la licencia.
- Si dispones de una licencia de KRE (o de su prueba), este sería el comando:
  ```powershell
  katalonc -noSplash -runMode=console -projectPath="C:\ruta\pruebas\katalon\TaskFlow-Katalon\TaskFlow-Katalon.prj" `
    -retry=0 -testSuitePath="Test Suites/TS_Regresion_Completa" -browserType="Chrome" `
    -executionProfile="default" -apiKey="<TU_API_KEY>" --config -webui.autoUpdateDrivers=true
  ```

Con la edición gratuita, la forma válida es ejecutar desde la interfaz de Katalon Studio (paso 6) y guardar las capturas del paso 8.

---

## 11. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `SessionNotCreatedException: This version of ChromeDriver only supports Chrome version …` | El driver no coincide con tu Chrome | Usa **Tools > Update WebDrivers > Chrome**, o activa *Selenium Manager* o la actualización automática en **Project > Settings > Execution > WebUI**. Reinicia Katalon. |
| La suite se para en `comprobarEntorno` con "No responde http://localhost:3000…" | El backend o el frontend no están levantados | Arráncalos (paso 3) y comprueba los puertos en **Profiles > default**. |
| `Unable to find the element … within 10 s` | La app tarda más, por ejemplo en el primer arranque de Vite | Sube `timeout` a 20 en **Profiles > default** y vuelve a ejecutar. Abre la app una vez en Chrome antes de lanzar la suite. |
| Login con "Demasiados intentos fallidos…" (HTTP 429) | El mismo correo falló 5 veces en 15 minutos | Los casos ya usan correos únicos. Si probaste a mano con un correo, espera 15 minutos o reinicia el backend (el bloqueo se guarda en memoria). |
| TC05 solo ejecuta 1 iteración | Se ejecutó el caso suelto | Ejecútalo desde `TS_Negativas` o `TS_Regresion_Completa` (paso 6.2). |
| Data File vacío o con caracteres raros | Falta el CSV o tiene otra codificación | Los CSV están en `Data/` en UTF-8 y sin tildes. No los abras ni los guardes con Excel; usa VS Code. |
| `Custom keyword … not found` o un error de compilación tras abrir | Katalon todavía no compiló `Keywords/` | Abre **Project > Refresh** o reinicia Katalon. Debe existir `Keywords/taskflow/Utilidades.groovy`. |
| El navegador no se cierra tras un fallo | — | El Listener lo cierra siempre (`ListenerTaskFlow`). Comprueba que la carpeta Test Listeners existe. |
| Ventana pequeña: no aparece el nombre del usuario en la barra (TC04) | La app lo oculta por debajo de 768 px | Los casos maximizan la ventana. No uses una resolución inferior a 1280×720. |
| El HTML del reporte no se genera | El plugin de reportes está desactivado | En **Project > Settings > Plugins > Report**, marca *Generate HTML/CSV*, o exporta desde la vista del reporte. |
| Error al abrir el proyecto en Katalon 9 | Versión antigua | Instala la última versión 10.x/11.x. |

---

## 12. Relación con la rúbrica

| Criterio de "Alto" | Dónde se cumple |
|---|---|
| Pruebas reproducibles | Datos únicos con sello de tiempo, precondiciones por API, Listener que cierra el navegador y comprobación del entorno al inicio de la suite. |
| Localizadores adecuados | 77 objetos organizados por página, basados en label/for, roles ARIA, aria-label, type y texto visible, y parametrizados. |
| Sincronización | Esperas explícitas en cada paso (`waitFor*` con 10 s), comprobaciones de ausencia con 3 s, `waitForElementAttributeValue` para el progreso y Smart Wait. |
| Casos positivos y negativos | 11 positivos y 5 negativos, con 7 iteraciones en TC05. Varios positivos incluyen además ramas negativas: botón deshabilitado, título obligatorio y Cancelar. |
| Datos | Tres Data Files CSV. TC05 tiene *data binding* a nivel de suite; TC11 y TC14 iteran con `findTestData`. |
| Evidencias de resultados | Capturas por checkpoint, captura automática de los fallos, reportes HTML/CSV/JUnit y `resumen.json` actualizado con `actualizar-resumen.js`. |
