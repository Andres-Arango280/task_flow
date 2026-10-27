import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC02_Registro_CorreoDuplicado (NEGATIVO)
 * Objetivo: no se puede registrar dos veces el mismo correo.
 * Resultado esperado: [role=alert] "Ya existe una cuenta con el correo X. Inicia sesión con ella o usa otro correo."
 *   y la ruta sigue siendo /register.
 * Evidencia: Reports/evidencias/TC02_*.png
 */
int T = GlobalVariable.timeout as int
String correo = CustomKeywords.'taskflow.Utilidades.generarCorreoUnico'('duplicado')
String contrasena = GlobalVariable.contrasenaValida

WebUI.comment('Precondición: el correo ya está registrado (POST /auth/register)')
CustomKeywords.'taskflow.Utilidades.registrarPorApi'('Usuario Existente', correo, contrasena)

WebUI.comment('Paso 1: intentar registrar de nuevo el mismo correo por la interfaz')
CustomKeywords.'taskflow.Utilidades.abrirAplicacion'('/register')
WebUI.waitForElementVisible(findTestObject('Page_Registro/h1_CrearCuenta'), T)
WebUI.setText(findTestObject('Page_Registro/input_NombreCompleto'), 'Usuario Duplicado')
WebUI.setText(findTestObject('Page_Registro/input_Correo'), correo)
WebUI.setText(findTestObject('Page_Registro/input_Contrasena'), contrasena)
WebUI.setText(findTestObject('Page_Registro/input_ConfirmarContrasena'), contrasena)
WebUI.waitForElementClickable(findTestObject('Page_Registro/btn_CrearCuenta'), T)
WebUI.click(findTestObject('Page_Registro/btn_CrearCuenta'))

WebUI.comment('Verificación: mensaje de conflicto (HTTP 409) y permanencia en /register')
WebUI.waitForElementVisible(findTestObject('Page_Registro/alert_Error'), T)
WebUI.verifyElementText(findTestObject('Page_Registro/alert_Error'),
	'Ya existe una cuenta con el correo ' + correo + '. Inicia sesión con ella o usa otro correo.')
WebUI.verifyMatch(CustomKeywords.'taskflow.Utilidades.rutaActual'(), '/register', false)
WebUI.verifyElementNotPresent(findTestObject('Page_Login/status_CuentaCreada'), GlobalVariable.timeoutCorto as int)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC02_01_correo_duplicado')

WebUI.closeBrowser()
