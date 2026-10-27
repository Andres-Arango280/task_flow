import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC15_Preferencias_AltoContraste (POSITIVO)
 * Objetivo: el modo de alto contraste se activa, persiste al recargar y se puede restablecer.
 * Resultado esperado: por defecto el interruptor está desactivado y "Restablecer" deshabilitado; al activarlo
 *   <html data-contraste="alto"> y sigue activo tras recargar; al restablecer (con confirmación) vuelve a "normal".
 * Evidencia: Reports/evidencias/TC15_*.png
 */
int T = GlobalVariable.timeout as int
Map usuario = CustomKeywords.'taskflow.Utilidades.crearUsuarioConSesion'('preferencias', 'Usuario Preferencias')

WebUI.comment('Paso 1: iniciar sesión y abrir Preferencias desde la barra')
CustomKeywords.'taskflow.Utilidades.abrirConSesion'(usuario.email, usuario.contrasena)
WebUI.waitForElementClickable(findTestObject('Comunes/nav_link_Preferencias'), T)
WebUI.click(findTestObject('Comunes/nav_link_Preferencias'))
WebUI.waitForElementVisible(findTestObject('Page_Preferencias/h1_Preferencias'), T)
WebUI.verifyMatch(CustomKeywords.'taskflow.Utilidades.rutaActual'(), '/preferencias', false)

WebUI.comment('Verificación del estado por defecto')
WebUI.verifyElementNotChecked(findTestObject('Page_Preferencias/chk_AltoContraste'), T)
WebUI.verifyElementAttributeValue(findTestObject('Comunes/html_Raiz'), 'data-contraste', 'normal', T)
WebUI.verifyElementHasAttribute(findTestObject('Page_Preferencias/btn_Restablecer'), 'disabled', T)
WebUI.verifyElementVisible(findTestObject('Page_Preferencias/span_ValoresPorDefecto'))
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC15_01_por_defecto')

WebUI.comment('Paso 2: activar "Alto contraste"')
WebUI.check(findTestObject('Page_Preferencias/chk_AltoContraste'))
WebUI.waitForElementAttributeValue(findTestObject('Comunes/html_Raiz'), 'data-contraste', 'alto', T)
WebUI.verifyElementChecked(findTestObject('Page_Preferencias/chk_AltoContraste'), T)
WebUI.verifyElementAttributeValue(findTestObject('Comunes/html_Raiz'), 'data-contraste', 'alto', T)
WebUI.verifyElementAttributeValue(findTestObject('Page_Preferencias/chk_AltoContraste'), 'role', 'switch', T)
WebUI.waitForElementClickable(findTestObject('Page_Preferencias/btn_Restablecer'), T)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC15_02_alto_contraste_activo')

WebUI.comment('Paso 3: recargar y comprobar que la preferencia persiste')
WebUI.refresh()
WebUI.waitForElementVisible(findTestObject('Page_Preferencias/chk_AltoContraste'), T)
WebUI.verifyElementChecked(findTestObject('Page_Preferencias/chk_AltoContraste'), T)
WebUI.verifyElementAttributeValue(findTestObject('Comunes/html_Raiz'), 'data-contraste', 'alto', T)

WebUI.comment('Paso 4: restablecer valores por defecto (con confirmación)')
WebUI.click(findTestObject('Page_Preferencias/btn_Restablecer'))
WebUI.waitForElementVisible(findTestObject('Comunes/alertdialog_Confirmacion'), T)
WebUI.verifyElementText(findTestObject('Comunes/alertdialog_Titulo'), '¿Restablecer valores por defecto?')
WebUI.click(findTestObject('Comunes/alertdialog_Boton', [('texto') : 'Restablecer']))
WebUI.waitForElementVisible(findTestObject('Comunes/toast_Exito', [('texto') : 'Se restablecieron los valores por defecto.']), T)
WebUI.waitForElementAttributeValue(findTestObject('Comunes/html_Raiz'), 'data-contraste', 'normal', T)
WebUI.verifyElementNotChecked(findTestObject('Page_Preferencias/chk_AltoContraste'), T)
WebUI.verifyElementVisible(findTestObject('Page_Preferencias/span_ValoresPorDefecto'))
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC15_03_restablecido')

WebUI.closeBrowser()
