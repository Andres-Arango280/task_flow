import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC08_InvitarMiembro_Exitoso (POSITIVO)
 * Objetivo: el líder invita a un usuario registrado buscándolo por su correo.
 * Resultado esperado: la búsqueda muestra el nombre; tras "Añadir al equipo" aparece
 *   "<nombre> ahora es miembro del equipo.", la persona figura en la lista con su botón "Quitar"
 *   y el título pasa a "Miembros (2)".
 * Evidencia: Reports/evidencias/TC08_*.png
 */
int T = GlobalVariable.timeout as int
String sufijo = CustomKeywords.'taskflow.Utilidades.generarSufijo'()
Map lider = CustomKeywords.'taskflow.Utilidades.crearUsuarioConSesion'('lider', 'Lider ' + sufijo)
String nombreInvitado = 'Invitada ' + sufijo
String correoInvitado = CustomKeywords.'taskflow.Utilidades.generarCorreoUnico'('invitada')
CustomKeywords.'taskflow.Utilidades.registrarPorApi'(nombreInvitado, correoInvitado, GlobalVariable.contrasenaValida.toString())
String nombreEquipo = 'Equipo Invitaciones ' + sufijo
String equipoId = CustomKeywords.'taskflow.Utilidades.crearEquipoPorApi'(lider.token, nombreEquipo)

WebUI.comment('Paso 1: iniciar sesión como líder y abrir el equipo')
CustomKeywords.'taskflow.Utilidades.abrirConSesion'(lider.email, lider.contrasena)
WebUI.navigateToUrl(GlobalVariable.baseUrl.toString() + '/equipos/' + equipoId)
WebUI.waitForElementVisible(findTestObject('Page_Equipo/h1_NombreEquipo', [('nombre') : nombreEquipo]), T)
WebUI.verifyMatch(WebUI.getText(findTestObject('Page_Equipo/h2_Miembros')), 'Miembros\\s*\\(1\\)', true)

WebUI.comment('Paso 2: abrir "Invitar" y buscar el correo')
WebUI.waitForElementClickable(findTestObject('Page_Equipo/btn_Invitar'), T)
WebUI.click(findTestObject('Page_Equipo/btn_Invitar'))
WebUI.waitForElementVisible(findTestObject('Comunes/dialog_PorTitulo', [('titulo') : 'Invitar a un miembro']), T)
WebUI.setText(findTestObject('Page_Equipo/input_CorreoInvitado'), correoInvitado)
WebUI.waitForElementClickable(findTestObject('Page_Equipo/btn_Buscar'), T)
WebUI.click(findTestObject('Page_Equipo/btn_Buscar'))

WebUI.comment('Verificación: se muestra la persona encontrada y el botón "Añadir al equipo"')
WebUI.waitForElementVisible(findTestObject('Page_Equipo/btn_AnadirAlEquipo'), T)
WebUI.verifyElementVisible(findTestObject('Page_Equipo/p_UsuarioEncontrado', [('nombre') : nombreInvitado]))
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC08_01_usuario_encontrado')

WebUI.comment('Paso 3: añadir al equipo')
WebUI.click(findTestObject('Page_Equipo/btn_AnadirAlEquipo'))
WebUI.waitForElementVisible(findTestObject('Comunes/toast_Exito', [('texto') : nombreInvitado + ' ahora es miembro del equipo.']), T)
WebUI.waitForElementNotPresent(findTestObject('Comunes/dialog_Modal'), T)

WebUI.comment('Verificación: la persona aparece en Miembros con su botón Quitar y el contador es 2')
WebUI.waitForElementVisible(findTestObject('Page_Equipo/li_MiembroPorCorreo', [('email') : correoInvitado]), T)
WebUI.verifyElementVisible(findTestObject('Page_Equipo/li_MiembroPorCorreo', [('email') : correoInvitado]))
WebUI.verifyElementPresent(findTestObject('Page_Equipo/btn_QuitarMiembro', [('nombre') : nombreInvitado]), T)
WebUI.verifyMatch(WebUI.getText(findTestObject('Page_Equipo/h2_Miembros')), 'Miembros\\s*\\(2\\)', true)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC08_02_miembro_anadido')

WebUI.closeBrowser()
