import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC16_CerrarSesion (POSITIVO, con rama de cancelación)
 * Objetivo: cerrar sesión pide confirmación, elimina la sesión y vuelve a proteger las rutas privadas.
 * Resultado esperado: "Salir" abre "¿Cerrar sesión?"; Cancelar mantiene la sesión; "Cerrar sesión" lleva a /login,
 *   borra el token y volver a "/" redirige de nuevo a /login.
 * Evidencia: Reports/evidencias/TC16_*.png
 */
int T = GlobalVariable.timeout as int
Map usuario = CustomKeywords.'taskflow.Utilidades.crearUsuarioConSesion'('salir', 'Usuario Salir')

WebUI.comment('Paso 1: iniciar sesión')
CustomKeywords.'taskflow.Utilidades.abrirConSesion'(usuario.email, usuario.contrasena)

WebUI.comment('Paso 2: pulsar "Salir" y cancelar')
WebUI.waitForElementClickable(findTestObject('Comunes/nav_btn_Salir'), T)
WebUI.click(findTestObject('Comunes/nav_btn_Salir'))
WebUI.waitForElementVisible(findTestObject('Comunes/alertdialog_Confirmacion'), T)
WebUI.verifyElementText(findTestObject('Comunes/alertdialog_Titulo'), '¿Cerrar sesión?')
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC16_01_confirmar_salida')
WebUI.click(findTestObject('Comunes/alertdialog_Boton', [('texto') : 'Cancelar']))
WebUI.waitForElementNotPresent(findTestObject('Comunes/alertdialog_Confirmacion'), T)
WebUI.verifyElementVisible(findTestObject('Page_Inicio/h1_MisEquipos'))
WebUI.verifyNotEqual(WebUI.executeJavaScript('return window.localStorage.getItem("access_token");', null), null)

WebUI.comment('Paso 3: pulsar "Salir" y confirmar "Cerrar sesión"')
WebUI.click(findTestObject('Comunes/nav_btn_Salir'))
WebUI.waitForElementVisible(findTestObject('Comunes/alertdialog_Boton', [('texto') : 'Cerrar sesión']), T)
WebUI.click(findTestObject('Comunes/alertdialog_Boton', [('texto') : 'Cerrar sesión']))

WebUI.comment('Verificación: pantalla de login y sesión eliminada')
WebUI.waitForElementVisible(findTestObject('Page_Login/h1_IniciarSesion'), T)
WebUI.verifyMatch(CustomKeywords.'taskflow.Utilidades.rutaActual'(), '/login', false)
WebUI.verifyEqual(WebUI.executeJavaScript('return window.localStorage.getItem("access_token");', null), null)
WebUI.verifyElementNotPresent(findTestObject('Comunes/nav_btn_Salir'), GlobalVariable.timeoutCorto as int)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC16_02_sesion_cerrada')

WebUI.comment('Paso 4: intentar volver a "/" sin sesión')
WebUI.navigateToUrl(GlobalVariable.baseUrl.toString() + '/')
WebUI.waitForElementVisible(findTestObject('Page_Login/h1_IniciarSesion'), T)
WebUI.verifyMatch(CustomKeywords.'taskflow.Utilidades.rutaActual'(), '/login', false)

WebUI.closeBrowser()
