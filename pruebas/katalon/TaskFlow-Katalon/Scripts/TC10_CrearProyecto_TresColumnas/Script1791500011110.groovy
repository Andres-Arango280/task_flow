import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable
import org.openqa.selenium.WebElement


/*
 * TC10_CrearProyecto_TresColumnas (POSITIVO)
 * Objetivo: al crear un proyecto se genera un tablero con "Por Hacer", "En Progreso" y "Hecho".
 * Resultado esperado: aviso "Proyecto «X» creado con sus 3 listas."; el tablero tiene exactamente esas 3 columnas
 *   en ese orden y el progreso (aria-valuenow) es 0.
 * Evidencia: Reports/evidencias/TC10_*.png
 */
int T = GlobalVariable.timeout as int
String sufijo = CustomKeywords.'taskflow.Utilidades.generarSufijo'()
Map lider = CustomKeywords.'taskflow.Utilidades.crearUsuarioConSesion'('proyecto', 'Lider ' + sufijo)
String nombreEquipo = 'Equipo Proyectos ' + sufijo
String equipoId = CustomKeywords.'taskflow.Utilidades.crearEquipoPorApi'(lider.token, nombreEquipo)
String nombreProyecto = 'Proyecto Katalon ' + sufijo

WebUI.comment('Paso 1: iniciar sesión y abrir el equipo')
CustomKeywords.'taskflow.Utilidades.abrirConSesion'(lider.email, lider.contrasena)
WebUI.navigateToUrl(GlobalVariable.baseUrl.toString() + '/equipos/' + equipoId)
WebUI.waitForElementVisible(findTestObject('Page_Equipo/h1_NombreEquipo', [('nombre') : nombreEquipo]), T)

WebUI.comment('Paso 2: crear el proyecto desde "Nuevo proyecto"')
WebUI.waitForElementClickable(findTestObject('Page_Equipo/btn_NuevoProyecto'), T)
WebUI.click(findTestObject('Page_Equipo/btn_NuevoProyecto'))
WebUI.waitForElementVisible(findTestObject('Comunes/dialog_PorTitulo', [('titulo') : 'Nuevo proyecto']), T)
WebUI.verifyElementHasAttribute(findTestObject('Page_Equipo/btn_CrearProyecto'), 'disabled', T)
WebUI.setText(findTestObject('Page_Equipo/input_NombreProyecto'), nombreProyecto)
WebUI.waitForElementClickable(findTestObject('Page_Equipo/btn_CrearProyecto'), T)
WebUI.click(findTestObject('Page_Equipo/btn_CrearProyecto'))

WebUI.comment('Verificación: aviso de éxito y proyecto en la lista del equipo')
WebUI.waitForElementVisible(findTestObject('Comunes/toast_Exito', [('texto') : nombreProyecto + '» creado con sus 3 listas']), T)
WebUI.waitForElementNotPresent(findTestObject('Comunes/dialog_Modal'), T)
WebUI.waitForElementVisible(findTestObject('Page_Equipo/link_ProyectoPorNombre', [('nombre') : nombreProyecto]), T)
WebUI.verifyMatch(WebUI.getText(findTestObject('Page_Equipo/h2_Proyectos')), 'Proyectos\\s*\\(1\\)', true)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC10_01_proyecto_creado')

WebUI.comment('Paso 3: abrir el tablero')
WebUI.click(findTestObject('Page_Equipo/link_ProyectoPorNombre', [('nombre') : nombreProyecto]))
WebUI.waitForElementVisible(findTestObject('Page_Tablero/h1_Proyecto', [('nombre') : nombreProyecto]), T)

WebUI.comment('Verificación: exactamente 3 columnas en el orden Por Hacer, En Progreso, Hecho')
WebUI.waitForElementVisible(findTestObject('Page_Tablero/h2_Columna', [('columna') : 'Hecho']), T)
List<WebElement> columnas = WebUI.findWebElements(findTestObject('Page_Tablero/h2_Columnas'), T)
List<String> nombres = columnas.collect { it.getText().trim() }
KeywordUtil.logInfo('Columnas encontradas: ' + nombres)
WebUI.verifyEqual(nombres.size(), 3)
WebUI.verifyEqual(nombres, ['Por Hacer', 'En Progreso', 'Hecho'])

WebUI.comment('Verificación: progreso inicial 0 % y columnas vacías')
WebUI.verifyElementAttributeValue(findTestObject('Page_Tablero/progressbar_Progreso'), 'aria-valuenow', '0', T)
WebUI.verifyElementText(findTestObject('Page_Tablero/span_ContadorColumna', [('columna') : 'Por Hacer']), '0')
WebUI.verifyMatch(CustomKeywords.'taskflow.Utilidades.rutaActual'(), '/proyectos/[0-9a-f-]{36}', true)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC10_02_tablero_tres_columnas')

WebUI.closeBrowser()
