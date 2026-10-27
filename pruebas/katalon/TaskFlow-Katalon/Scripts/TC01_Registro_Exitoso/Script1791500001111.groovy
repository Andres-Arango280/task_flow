import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC01_Registro_Exitoso (POSITIVO)
 * Objetivo: una persona nueva crea su cuenta desde /register con datos válidos.
 * Resultado esperado: requisitos de contraseña "cumplido"; tras enviar se redirige a /login con el
 *   aviso "Cuenta creada correctamente" y el correo precargado.
 * Evidencia: Reports/evidencias/TC01_*.png
 */
int T = GlobalVariable.timeout as int
String sufijo = CustomKeywords.'taskflow.Utilidades.generarSufijo'()
String nombre = 'Usuario Katalon ' + sufijo
String correo = CustomKeywords.'taskflow.Utilidades.generarCorreoUnico'('registro')
String contrasena = GlobalVariable.contrasenaValida

WebUI.comment('Paso 1: abrir la pantalla de registro')
CustomKeywords.'taskflow.Utilidades.abrirAplicacion'('/register')
WebUI.waitForElementVisible(findTestObject('Page_Registro/h1_CrearCuenta'), T)
WebUI.verifyElementText(findTestObject('Page_Registro/h1_CrearCuenta'), 'Crear cuenta')

WebUI.comment('Paso 2: completar el formulario con datos válidos y únicos')
WebUI.setText(findTestObject('Page_Registro/input_NombreCompleto'), nombre)
WebUI.setText(findTestObject('Page_Registro/input_Correo'), correo)
WebUI.setText(findTestObject('Page_Registro/input_Contrasena'), contrasena)
WebUI.setText(findTestObject('Page_Registro/input_ConfirmarContrasena'), contrasena)

WebUI.comment('Verificación: los cuatro requisitos de la contraseña se anuncian como cumplidos')
WebUI.verifyElementPresent(findTestObject('Page_Registro/li_RequisitoConEstado', [('requisito') : 'Al menos 8 caracteres', ('estado') : 'cumplido']), T)
WebUI.verifyElementPresent(findTestObject('Page_Registro/li_RequisitoConEstado', [('requisito') : 'Al menos una letra', ('estado') : 'cumplido']), T)
WebUI.verifyElementPresent(findTestObject('Page_Registro/li_RequisitoConEstado', [('requisito') : 'Al menos un número', ('estado') : 'cumplido']), T)
WebUI.verifyElementPresent(findTestObject('Page_Registro/li_RequisitoConEstado', [('requisito') : 'Las dos contraseñas coinciden', ('estado') : 'cumplido']), T)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC01_01_formulario_completo')

WebUI.comment('Paso 3: enviar el formulario')
WebUI.waitForElementClickable(findTestObject('Page_Registro/btn_CrearCuenta'), T)
WebUI.click(findTestObject('Page_Registro/btn_CrearCuenta'))

WebUI.comment('Verificación: /login con aviso de cuenta creada y el correo precargado')
WebUI.waitForElementVisible(findTestObject('Page_Login/status_CuentaCreada'), T)
WebUI.verifyElementVisible(findTestObject('Page_Login/status_CuentaCreada'))
WebUI.verifyMatch(CustomKeywords.'taskflow.Utilidades.rutaActual'(), '/login', false)
WebUI.verifyElementAttributeValue(findTestObject('Page_Login/input_Correo'), 'value', correo, T)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC01_02_cuenta_creada')

WebUI.comment('Verificación extra: la cuenta existe (login por API devuelve 200/201 con token)')
Map sesion = CustomKeywords.'taskflow.Utilidades.loginPorApi'(correo, contrasena)
WebUI.verifyNotEqual(sesion.token, null)

WebUI.closeBrowser()
