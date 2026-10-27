import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC03_Registro_ContrasenaCorta (NEGATIVO)
 * Objetivo: el registro valida la política de contraseñas (mínimo 8 caracteres, al menos una letra y un número)
 *   y que la confirmación coincida.
 * Resultado esperado: con "abc" los requisitos "Al menos 8 caracteres" y "Al menos un número" quedan "pendiente"
 *   y aparece "La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número.";
 *   con "abcdefgh" (8 letras, sin número) se rechaza con el mismo mensaje;
 *   con confirmación distinta aparece "Las contraseñas no coinciden. Vuelve a escribir la confirmación.";
 *   la cuenta NO se crea (login por API = 401).
 * Evidencia: Reports/evidencias/TC03_*.png
 */
int T = GlobalVariable.timeout as int
String correo = CustomKeywords.'taskflow.Utilidades.generarCorreoUnico'('corta')

WebUI.comment('Paso 1: completar el formulario con una contraseña de 3 caracteres')
CustomKeywords.'taskflow.Utilidades.abrirAplicacion'('/register')
WebUI.waitForElementVisible(findTestObject('Page_Registro/h1_CrearCuenta'), T)
WebUI.setText(findTestObject('Page_Registro/input_NombreCompleto'), 'Usuario Contrasena Corta')
WebUI.setText(findTestObject('Page_Registro/input_Correo'), correo)
WebUI.setText(findTestObject('Page_Registro/input_Contrasena'), 'abc')
WebUI.setText(findTestObject('Page_Registro/input_ConfirmarContrasena'), 'abc')

WebUI.comment('Verificación: los requisitos de longitud y de número se anuncian como pendientes')
WebUI.verifyElementPresent(findTestObject('Page_Registro/li_RequisitoConEstado', [('requisito') : 'Al menos 8 caracteres', ('estado') : 'pendiente']), T)
WebUI.verifyElementPresent(findTestObject('Page_Registro/li_RequisitoConEstado', [('requisito') : 'Al menos una letra', ('estado') : 'cumplido']), T)
WebUI.verifyElementPresent(findTestObject('Page_Registro/li_RequisitoConEstado', [('requisito') : 'Al menos un número', ('estado') : 'pendiente']), T)

WebUI.comment('Paso 2: enviar y comprobar el mensaje de error')
WebUI.click(findTestObject('Page_Registro/btn_CrearCuenta'))
WebUI.waitForElementVisible(findTestObject('Page_Registro/alert_Error'), T)
WebUI.verifyElementText(findTestObject('Page_Registro/alert_Error'), 'La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número.')
WebUI.verifyMatch(CustomKeywords.'taskflow.Utilidades.rutaActual'(), '/register', false)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC03_01_contrasena_corta')

WebUI.comment('Paso 2b: 8 caracteres pero sin ningún número (contraseña trivial) también se rechaza')
WebUI.setText(findTestObject('Page_Registro/input_Contrasena'), 'abcdefgh')
WebUI.setText(findTestObject('Page_Registro/input_ConfirmarContrasena'), 'abcdefgh')
WebUI.verifyElementPresent(findTestObject('Page_Registro/li_RequisitoConEstado', [('requisito') : 'Al menos 8 caracteres', ('estado') : 'cumplido']), T)
WebUI.verifyElementPresent(findTestObject('Page_Registro/li_RequisitoConEstado', [('requisito') : 'Al menos un número', ('estado') : 'pendiente']), T)
WebUI.click(findTestObject('Page_Registro/btn_CrearCuenta'))
WebUI.verifyElementText(findTestObject('Page_Registro/alert_Error'), 'La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número.')
WebUI.verifyMatch(CustomKeywords.'taskflow.Utilidades.rutaActual'(), '/register', false)

WebUI.comment('Paso 3: contraseña válida pero confirmación distinta')
WebUI.setText(findTestObject('Page_Registro/input_Contrasena'), 'Clave123')
WebUI.setText(findTestObject('Page_Registro/input_ConfirmarContrasena'), 'Clave999')
WebUI.verifyElementPresent(findTestObject('Page_Registro/li_RequisitoConEstado', [('requisito') : 'Las dos contraseñas coinciden', ('estado') : 'pendiente']), T)
WebUI.click(findTestObject('Page_Registro/btn_CrearCuenta'))
WebUI.waitForElementVisible(findTestObject('Page_Registro/alert_Error'), T)
WebUI.verifyElementText(findTestObject('Page_Registro/alert_Error'), 'Las contraseñas no coinciden. Vuelve a escribir la confirmación.')
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC03_02_confirmacion_distinta')

WebUI.comment('Verificación final: la cuenta no se creó (login por API responde 401)')
Map sesion = CustomKeywords.'taskflow.Utilidades.loginPorApi'(correo, 'abc123')
WebUI.verifyEqual(sesion.estado, 401)

WebUI.closeBrowser()
