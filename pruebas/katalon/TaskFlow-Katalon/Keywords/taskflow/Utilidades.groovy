package taskflow

import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import java.text.SimpleDateFormat

import com.kms.katalon.core.annotation.Keyword
import com.kms.katalon.core.configuration.RunConfiguration
import com.kms.katalon.core.util.KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import internal.GlobalVariable

/**
 * Palabras clave reutilizables de TaskFlow:
 *  - datos únicos (timestamps) para que las pruebas sean repetibles,
 *  - preparación de datos por la API REST (más rápida y estable que por la UI),
 *  - apertura del navegador, inicio de sesión y captura de evidencias.
 *
 * Uso desde un caso: CustomKeywords.'taskflow.Utilidades.generarCorreoUnico'('registro')
 */
class Utilidades {

	// ------------------------------------------------------------------ Datos únicos

	/** Sufijo único basado en fecha y hora (yyyyMMddHHmmss + 3 cifras aleatorias). */
	@Keyword
	String generarSufijo() {
		String fecha = new SimpleDateFormat('yyyyMMddHHmmss').format(new Date())
		return fecha + String.format('%03d', new Random().nextInt(1000))
	}

	/** Correo que no existe todavía en la base de datos: <prefijo>.<sufijo>@correo-pruebas.com */
	@Keyword
	String generarCorreoUnico(String prefijo) {
		return (prefijo + '.' + generarSufijo() + '@correo-pruebas.com').toLowerCase()
	}

	// ------------------------------------------------------------------ API REST

	/** Petición HTTP a la API de TaskFlow. Devuelve [estado: int, cuerpo: objeto JSON o null, texto: String]. */
	static Map peticion(String metodo, String ruta, Map cuerpo, String token) {
		HttpURLConnection conexion = (HttpURLConnection) new URL(GlobalVariable.apiUrl.toString() + ruta).openConnection()
		conexion.setRequestMethod(metodo)
		conexion.setConnectTimeout(10000)
		conexion.setReadTimeout(15000)
		conexion.setRequestProperty('Accept', 'application/json')
		conexion.setRequestProperty('Content-Type', 'application/json; charset=UTF-8')
		if (token) {
			conexion.setRequestProperty('Authorization', 'Bearer ' + token)
		}
		if (cuerpo != null) {
			conexion.setDoOutput(true)
			conexion.getOutputStream().withWriter('UTF-8') { escritor -> escritor.write(JsonOutput.toJson(cuerpo)) }
		}
		int estado = conexion.getResponseCode()
		InputStream flujo = estado >= 400 ? conexion.getErrorStream() : conexion.getInputStream()
		String texto = flujo != null ? flujo.getText('UTF-8') : ''
		Object json = texto ? new JsonSlurper().parseText(texto) : null
		return [('estado') : estado, ('cuerpo') : json, ('texto') : texto]
	}

	private static Object exigir(Map respuesta, List<Integer> estadosValidos, String accion) {
		if (!estadosValidos.contains(respuesta.estado as Integer)) {
			KeywordUtil.markFailedAndStop("Preparación por API fallida (${accion}): HTTP ${respuesta.estado} ${respuesta.texto}")
		}
		return respuesta.cuerpo
	}

	/** Código HTTP de una petición sin cuerpo (para pruebas negativas de la API). */
	@Keyword
	int estadoHttp(String metodo, String ruta, String token) {
		return peticion(metodo, ruta, null, token).estado as int
	}

	/** Registra un usuario con POST /auth/register y devuelve el usuario creado (id, nombre, email). */
	@Keyword
	Map registrarPorApi(String nombre, String email, String contrasena) {
		Map respuesta = peticion('POST', '/auth/register', [('nombre') : nombre, ('email') : email, ('password') : contrasena], null)
		Map usuario = exigir(respuesta, [200, 201], 'registrar ' + email) as Map
		KeywordUtil.logInfo("Usuario de prueba registrado por API: ${email}")
		return usuario
	}

	/** POST /auth/login. Devuelve [estado: int, token: String o null]. No falla: sirve también para negativos. */
	@Keyword
	Map loginPorApi(String email, String contrasena) {
		Map respuesta = peticion('POST', '/auth/login', [('email') : email, ('password') : contrasena], null)
		String token = respuesta.cuerpo instanceof Map ? (respuesta.cuerpo as Map).access_token : null
		return [('estado') : respuesta.estado, ('token') : token]
	}

	/** Registra un usuario nuevo y devuelve [nombre, email, contrasena, id, token]. */
	@Keyword
	Map crearUsuarioConSesion(String prefijo, String nombre) {
		String email = generarCorreoUnico(prefijo)
		String contrasena = GlobalVariable.contrasenaValida.toString()
		Map usuario = registrarPorApi(nombre, email, contrasena)
		Map sesion = loginPorApi(email, contrasena)
		if (!sesion.token) {
			KeywordUtil.markFailedAndStop("No se obtuvo token para ${email} (HTTP ${sesion.estado})")
		}
		return [('nombre') : nombre, ('email') : email, ('contrasena') : contrasena, ('id') : usuario.id, ('token') : sesion.token]
	}

	@Keyword
	String crearEquipoPorApi(String token, String nombre) {
		Map equipo = exigir(peticion('POST', '/equipos', [('nombre') : nombre], token), [200, 201], 'crear equipo') as Map
		return equipo.id
	}

	@Keyword
	String crearProyectoPorApi(String token, String nombre, String equipoId) {
		Map proyecto = exigir(peticion('POST', '/proyectos', [('nombre') : nombre, ('equipoId') : equipoId], token), [200, 201], 'crear proyecto') as Map
		return proyecto.id
	}

	/** Devuelve un mapa nombreDeLista -> id (Por Hacer, En Progreso, Hecho). */
	@Keyword
	Map obtenerListasPorApi(String token, String proyectoId) {
		List listas = exigir(peticion('GET', '/listas/proyecto/' + proyectoId, null, token), [200], 'obtener listas') as List
		Map porNombre = [:]
		listas.sort { it.orden }.each { porNombre[it.nombre] = it.id }
		return porNombre
	}

	@Keyword
	String crearTareaPorApi(String token, String titulo, String descripcion, String listaId) {
		Map cuerpo = [('titulo') : titulo, ('listaId') : listaId]
		if (descripcion) {
			cuerpo.descripcion = descripcion
		}
		Map tarea = exigir(peticion('POST', '/tareas', cuerpo, token), [200, 201], 'crear tarea ' + titulo) as Map
		return tarea.id
	}

	/**
	 * Prepara usuario + equipo + proyecto (+ tareas en 'Por Hacer') por API.
	 * Devuelve [usuario: Map, equipoId, equipoNombre, proyectoId, proyectoNombre, listas: Map].
	 */
	@Keyword
	Map prepararTableroPorApi(String prefijo, List<String> titulosTareas) {
		String sufijo = generarSufijo()
		Map usuario = crearUsuarioConSesion(prefijo, 'Usuario ' + prefijo + ' ' + sufijo)
		String equipoNombre = 'Equipo ' + prefijo + ' ' + sufijo
		String equipoId = crearEquipoPorApi(usuario.token as String, equipoNombre)
		String proyectoNombre = 'Proyecto ' + prefijo + ' ' + sufijo
		String proyectoId = crearProyectoPorApi(usuario.token as String, proyectoNombre, equipoId)
		Map listas = obtenerListasPorApi(usuario.token as String, proyectoId)
		titulosTareas.each { String titulo ->
			crearTareaPorApi(usuario.token as String, titulo, null, listas['Por Hacer'] as String)
		}
		return [('usuario') : usuario, ('equipoId') : equipoId, ('equipoNombre') : equipoNombre,
			('proyectoId') : proyectoId, ('proyectoNombre') : proyectoNombre, ('listas') : listas]
	}

	/** Falla pronto y con un mensaje claro si el backend o el frontend no están levantados. */
	@Keyword
	void comprobarEntorno() {
		[GlobalVariable.apiUrl.toString() + '/auth/login', GlobalVariable.baseUrl.toString() + '/login'].each { String url ->
			try {
				HttpURLConnection conexion = (HttpURLConnection) new URL(url).openConnection()
				conexion.setConnectTimeout(5000)
				conexion.setReadTimeout(5000)
				int estado = conexion.getResponseCode()
				KeywordUtil.logInfo("Entorno OK: ${url} -> HTTP ${estado}")
			} catch (Exception e) {
				KeywordUtil.markFailedAndStop("No responde ${url}. Arranca backend (npm run start:dev) y frontend (npm run dev). Detalle: ${e.message}")
			}
		}
	}

	// ------------------------------------------------------------------ Navegador

	/** Abre Chrome (configuración de ejecución), maximiza y navega a la ruta de la app. */
	@Keyword
	void abrirAplicacion(String ruta) {
		WebUI.openBrowser('')
		WebUI.maximizeWindow()
		WebUI.navigateToUrl(GlobalVariable.baseUrl.toString() + ruta)
		WebUI.waitForPageLoad(GlobalVariable.timeout as int)
	}

	/** Inicia sesión por la pantalla de login y espera a 'Mis equipos'. */
	@Keyword
	void iniciarSesion(String email, String contrasena) {
		int espera = GlobalVariable.timeout as int
		WebUI.navigateToUrl(GlobalVariable.baseUrl.toString() + '/login')
		WebUI.waitForElementVisible(findTestObject('Page_Login/input_Correo'), espera)
		WebUI.setText(findTestObject('Page_Login/input_Correo'), email)
		WebUI.setText(findTestObject('Page_Login/input_Contrasena'), contrasena)
		WebUI.waitForElementClickable(findTestObject('Page_Login/btn_IniciarSesion'), espera)
		WebUI.click(findTestObject('Page_Login/btn_IniciarSesion'))
		WebUI.waitForElementVisible(findTestObject('Page_Inicio/h1_MisEquipos'), espera)
		WebUI.verifyElementVisible(findTestObject('Page_Inicio/h1_MisEquipos'))
	}

	/** Abre la app e inicia sesión con el usuario indicado. */
	@Keyword
	void abrirConSesion(String email, String contrasena) {
		abrirAplicacion('/login')
		iniciarSesion(email, contrasena)
	}

	/** Ruta (path) actual del navegador, sin dominio: p. ej. '/login'. */
	@Keyword
	String rutaActual() {
		return new URL(WebUI.getUrl()).getPath()
	}

	// ------------------------------------------------------------------ Evidencias

	/** Carpeta fija de evidencias del proyecto: <proyecto>/Reports/evidencias */
	static File carpetaEvidencias() {
		File carpeta = new File(RunConfiguration.getProjectDir(), 'Reports/evidencias')
		carpeta.mkdirs()
		return carpeta
	}

	/**
	 * Captura de pantalla con nombre legible (TCxx_NN_descripcion.png) en Reports/evidencias.
	 * Katalon además adjunta la captura al log del caso.
	 */
	@Keyword
	String capturarEvidencia(String nombre) {
		String limpio = nombre.replaceAll('[^A-Za-z0-9_.-]', '_')
		String ruta = new File(carpetaEvidencias(), limpio + '.png').getAbsolutePath()
		WebUI.takeScreenshot(ruta)
		KeywordUtil.logInfo('Evidencia guardada: ' + ruta)
		return ruta
	}
}
