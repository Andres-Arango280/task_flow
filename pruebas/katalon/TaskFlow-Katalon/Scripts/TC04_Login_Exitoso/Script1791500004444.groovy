import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC04_Login_Exitoso (POSITIVO)
 * Objetivo: un usuario registrado inicia sesión y llega a "Mis equipos".
 * Resultado esperado: ruta "/", encabezado "Mis equipos", nombre del usuario en la barra y token en localStorage.
 * Evidencia: Reports/evidencias/TC04_*.png
 */
int T = GlobalVariable.timeout as int
String sufijo = CustomKeywords.'taskflow.Utilidades.generarSufijo'()
String nombre = 'Usuario Login ' + sufijo
String correo = CustomKeywords.'taskflow.Utilidades.generarCorreoUnico'('login')
String contrasena = GlobalVariable.contrasenaValida

WebUI.comment('Precondición: usuario registrado por API')
CustomKeywords.'taskflow.Utilidades.registrarPorApi'(nombre, correo, contrasena)

WebUI.comment('Paso 1: abrir /login y escribir las credenciales')
CustomKeywords.'taskflow.Utilidades.abrirAplicacion'('/login')
WebUI.waitForElementVisible(findTestObject('Page_Login/input_Correo'), T)
WebUI.verifyElementText(findTestObject('Page_Login/h1_IniciarSesion'), 'Iniciar sesión')
WebUI.setText(findTestObject('Page_Login/input_Correo'), correo)
WebUI.setText(findTestObject('Page_Login/input_Contrasena'), contrasena)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC04_01_credenciales')

WebUI.comment('Paso 2: pulsar "Iniciar sesión"')
WebUI.waitForElementClickable(findTestObject('Page_Login/btn_IniciarSesion'), T)
WebUI.click(findTestObject('Page_Login/btn_IniciarSesion'))

WebUI.comment('Verificación: pantalla "Mis equipos" con el usuario identificado')
WebUI.waitForElementVisible(findTestObject('Page_Inicio/h1_MisEquipos'), T)
WebUI.verifyElementText(findTestObject('Page_Inicio/h1_MisEquipos'), 'Mis equipos')
WebUI.verifyMatch(CustomKeywords.'taskflow.Utilidades.rutaActual'(), '/', false)
WebUI.waitForElementVisible(findTestObject('Comunes/nav_span_Usuario', [('email') : correo]), T)
WebUI.verifyElementText(findTestObject('Comunes/nav_span_Usuario', [('email') : correo]), nombre)
Object token = WebUI.executeJavaScript('return window.localStorage.getItem("access_token");', null)
WebUI.verifyNotEqual(token, null)
WebUI.verifyElementNotPresent(findTestObject('Page_Login/alert_Error'), GlobalVariable.timeoutCorto as int)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC04_02_mis_equipos')

WebUI.closeBrowser()
