import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC09_InvitarMiembro_CorreoInexistente (NEGATIVO)
 * Objetivo: no se puede invitar un correo mal formado ni uno que no está registrado.
 * Resultado esperado: "correo-invalido" -> "Escribe un correo completo, por ejemplo: ana@empresa.com";
 *   correo válido no registrado -> [role=alert] "No hay ningún usuario registrado con el correo X. ...";
 *   no aparece "Añadir al equipo" y el equipo sigue con 1 miembro.
 * Evidencia: Reports/evidencias/TC09_*.png
 */
int T = GlobalVariable.timeout as int
int TC = GlobalVariable.timeoutCorto as int
String sufijo = CustomKeywords.'taskflow.Utilidades.generarSufijo'()
Map lider = CustomKeywords.'taskflow.Utilidades.crearUsuarioConSesion'('lider', 'Lider ' + sufijo)
String nombreEquipo = 'Equipo Sin Invitados ' + sufijo
String equipoId = CustomKeywords.'taskflow.Utilidades.crearEquipoPorApi'(lider.token, nombreEquipo)
String correoInexistente = CustomKeywords.'taskflow.Utilidades.generarCorreoUnico'('noexiste')

WebUI.comment('Paso 1: iniciar sesión como líder, abrir el equipo y la ventana de invitación')
CustomKeywords.'taskflow.Utilidades.abrirConSesion'(lider.email, lider.contrasena)
WebUI.navigateToUrl(GlobalVariable.baseUrl.toString() + '/equipos/' + equipoId)
WebUI.waitForElementVisible(findTestObject('Page_Equipo/h1_NombreEquipo', [('nombre') : nombreEquipo]), T)
WebUI.waitForElementClickable(findTestObject('Page_Equipo/btn_Invitar'), T)
WebUI.click(findTestObject('Page_Equipo/btn_Invitar'))
WebUI.waitForElementVisible(findTestObject('Comunes/dialog_PorTitulo', [('titulo') : 'Invitar a un miembro']), T)

WebUI.comment('Caso A: correo con formato inválido')
WebUI.setText(findTestObject('Page_Equipo/input_CorreoInvitado'), 'correo-invalido')
WebUI.click(findTestObject('Page_Equipo/btn_Buscar'))
WebUI.waitForElementVisible(findTestObject('Page_Equipo/p_ErrorFormatoCorreo'), T)
WebUI.verifyElementText(findTestObject('Page_Equipo/p_ErrorFormatoCorreo'), 'Escribe un correo completo, por ejemplo: ana@empresa.com')
WebUI.verifyElementAttributeValue(findTestObject('Page_Equipo/input_CorreoInvitado'), 'aria-invalid', 'true', T)
WebUI.verifyElementNotPresent(findTestObject('Page_Equipo/btn_AnadirAlEquipo'), TC)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC09_01_formato_invalido')

WebUI.comment('Caso B: correo válido que no pertenece a ninguna cuenta (API 404)')
WebUI.setText(findTestObject('Page_Equipo/input_CorreoInvitado'), correoInexistente)
WebUI.waitForElementClickable(findTestObject('Page_Equipo/btn_Buscar'), T)
WebUI.click(findTestObject('Page_Equipo/btn_Buscar'))
WebUI.waitForElementVisible(findTestObject('Page_Equipo/alert_ErrorInvitacion'), T)
WebUI.verifyElementText(findTestObject('Page_Equipo/alert_ErrorInvitacion'),
	'No hay ningún usuario registrado con el correo ' + correoInexistente + '. Pídele que cree su cuenta en TaskFlow y vuelve a intentarlo.')
WebUI.verifyElementNotPresent(findTestObject('Page_Equipo/btn_AnadirAlEquipo'), TC)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC09_02_correo_inexistente')

WebUI.comment('Verificación final: se cierra la ventana y el equipo sigue con 1 miembro')
WebUI.click(findTestObject('Comunes/dialog_btnCancelar'))
WebUI.waitForElementNotPresent(findTestObject('Comunes/dialog_Modal'), T)
WebUI.verifyMatch(WebUI.getText(findTestObject('Page_Equipo/h2_Miembros')), 'Miembros\\s*\\(1\\)', true)

WebUI.closeBrowser()
