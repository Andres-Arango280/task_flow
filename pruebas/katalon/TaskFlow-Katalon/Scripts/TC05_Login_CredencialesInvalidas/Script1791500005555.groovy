import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC05_Login_CredencialesInvalidas (NEGATIVO, DATA-DRIVEN)
 * Datos: Data Files/credenciales_invalidas (Data/credenciales_invalidas.csv), enlazado en las suites
 *   (una iteración por fila). Variables: escenario, correo, contrasena, preparacion, validacion, mensaje.
 * Objetivo: el login rechaza credenciales incorrectas o mal formadas.
 * Resultado esperado:
 *   validacion = servidor  -> [role=alert] "El correo o la contraseña no son correctos. Revísalos e inténtalo de nuevo."
 *   validacion = navegador -> el formulario no se envía (checkValidity() = false) y no hay alerta.
 *   En ambos casos se sigue en /login y no se guarda token.
 * Nota: cada fila usa un correo único ({unico}) para no provocar el bloqueo de 5 intentos (HTTP 429).
 * Evidencia: Reports/evidencias/TC05_<escenario>.png
 */
int T = GlobalVariable.timeout as int
String nombreEscenario = (escenario ?: 'sin_nombre').toString()
String correoUsado = (correo ?: '').toString().trim()
String contrasenaUsada = (contrasena ?: '').toString()
String tipoValidacion = (validacion ?: 'servidor').toString().trim()
String fragmento = (mensaje ?: '').toString().trim()

WebUI.comment('Escenario: ' + nombreEscenario + ' | validación: ' + tipoValidacion)
if (correoUsado == '{unico}') {
	correoUsado = CustomKeywords.'taskflow.Utilidades.generarCorreoUnico'('negativo')
}
if ((preparacion ?: '').toString().trim() == 'registrar') {
	WebUI.comment('Precondición: el correo existe con la contraseña válida ' + GlobalVariable.contrasenaValida)
	CustomKeywords.'taskflow.Utilidades.registrarPorApi'('Usuario Negativo', correoUsado, GlobalVariable.contrasenaValida.toString())
}

WebUI.comment('Paso 1: abrir /login y escribir los datos de la fila')
CustomKeywords.'taskflow.Utilidades.abrirAplicacion'('/login')
WebUI.waitForElementVisible(findTestObject('Page_Login/input_Correo'), T)
WebUI.setText(findTestObject('Page_Login/input_Correo'), correoUsado)
WebUI.setText(findTestObject('Page_Login/input_Contrasena'), contrasenaUsada)
WebUI.waitForElementClickable(findTestObject('Page_Login/btn_IniciarSesion'), T)
WebUI.click(findTestObject('Page_Login/btn_IniciarSesion'))

if (tipoValidacion == 'servidor') {
	WebUI.comment('Verificación: el servidor rechaza las credenciales (HTTP 401) y se muestra la alerta')
	WebUI.waitForElementVisible(findTestObject('Page_Login/alert_Error'), T)
	WebUI.verifyElementVisible(findTestObject('Page_Login/alert_Error'))
	String textoAlerta = WebUI.getText(findTestObject('Page_Login/alert_Error'))
	WebUI.verifyMatch(textoAlerta, '.*' + java.util.regex.Pattern.quote(fragmento) + '.*', true)
	WebUI.verifyElementText(findTestObject('Page_Login/alert_Error'),
		'El correo o la contraseña no son correctos. Revísalos e inténtalo de nuevo.')
} else {
	WebUI.comment('Verificación: el navegador bloquea el envío (validación HTML5 de campos obligatorios / formato)')
	WebUI.verifyElementNotPresent(findTestObject('Page_Login/alert_Error'), GlobalVariable.timeoutCorto as int)
	Object formularioValido = WebUI.executeJavaScript('return document.querySelector("form").checkValidity();', null)
	WebUI.verifyEqual(formularioValido, false)
	Object mensajes = WebUI.executeJavaScript(
		'return Array.from(document.querySelectorAll("form input")).map(function (c) { return c.validationMessage; }).filter(Boolean).join(" | ");', null)
	KeywordUtil.logInfo('Mensaje de validación del navegador: ' + mensajes)
	WebUI.verifyNotMatch(mensajes.toString(), '^\\s*$', true)
}

WebUI.comment('Verificación común: se permanece en /login y no hay sesión')
WebUI.verifyMatch(CustomKeywords.'taskflow.Utilidades.rutaActual'(), '/login', false)
Object token = WebUI.executeJavaScript('return window.localStorage.getItem("access_token");', null)
WebUI.verifyEqual(token, null)
WebUI.verifyElementNotPresent(findTestObject('Page_Inicio/h1_MisEquipos'), GlobalVariable.timeoutCorto as int)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC05_' + nombreEscenario)

WebUI.closeBrowser()
