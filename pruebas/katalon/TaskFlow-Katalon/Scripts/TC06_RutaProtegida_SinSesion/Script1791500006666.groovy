import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC06_RutaProtegida_SinSesion (NEGATIVO)
 * Objetivo: las rutas privadas no son accesibles sin sesión, ni por la interfaz ni por la API.
 * Resultado esperado: cada ruta privada redirige a /login sin mostrar la barra de navegación;
 *   GET /equipos sin token responde 401.
 * Evidencia: Reports/evidencias/TC06_*.png
 */
int T = GlobalVariable.timeout as int
String uuidInexistente = '00000000-0000-4000-8000-000000000000'
List<String> rutasPrivadas = ['/', '/preferencias', '/ayuda', '/equipos/' + uuidInexistente, '/proyectos/' + uuidInexistente]

WebUI.comment('Paso 1: abrir el navegador sin sesión (perfil limpio)')
CustomKeywords.'taskflow.Utilidades.abrirAplicacion'('/login')
WebUI.executeJavaScript('window.localStorage.clear(); window.sessionStorage.clear();', null)

int indice = 0
for (String ruta : rutasPrivadas) {
	indice++
	WebUI.comment('Paso: navegar directamente a ' + ruta)
	WebUI.navigateToUrl(GlobalVariable.baseUrl.toString() + ruta)
	WebUI.waitForElementVisible(findTestObject('Page_Login/h1_IniciarSesion'), T)
	WebUI.verifyElementVisible(findTestObject('Page_Login/h1_IniciarSesion'))
	WebUI.verifyMatch(CustomKeywords.'taskflow.Utilidades.rutaActual'(), '/login', false)
	WebUI.verifyElementNotPresent(findTestObject('Comunes/nav_btn_Salir'), GlobalVariable.timeoutCorto as int)
	CustomKeywords.'taskflow.Utilidades.capturarEvidencia'(String.format('TC06_%02d_redirigido%s', indice, ruta.replace('/', '_')))
}

WebUI.comment('Verificación API: GET /equipos sin token -> 401')
int estado = CustomKeywords.'taskflow.Utilidades.estadoHttp'('GET', '/equipos', null)
WebUI.verifyEqual(estado, 401)

WebUI.closeBrowser()
