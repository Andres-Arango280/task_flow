import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC12_MoverTarea_ProgresoActualizado (POSITIVO)
 * Objetivo: mover tareas entre columnas actualiza la barra de progreso y el cambio persiste en el servidor.
 * Resultado esperado (2 tareas): A -> En Progreso = 0 %; A -> Hecho = 50 % ("1 de 2 tareas hechas (50%)");
 *   B -> Hecho = 100 %; tras recargar la página sigue en 100.
 * Se usa el selector "Columna" del detalle de la tarea: es la alternativa accesible al arrastre que ofrece la app
 *   (el arrastre con ratón de @hello-pangea/dnd no es fiable con WebDriver).
 * Evidencia: Reports/evidencias/TC12_*.png
 */
int T = GlobalVariable.timeout as int
String tareaA = 'Implementar formulario de alta'
String tareaB = 'Probar formulario de alta'
Map tablero = CustomKeywords.'taskflow.Utilidades.prepararTableroPorApi'('mover', [tareaA, tareaB])

WebUI.comment('Paso 1: iniciar sesión y abrir el tablero con 2 tareas en "Por Hacer"')
CustomKeywords.'taskflow.Utilidades.abrirConSesion'(tablero.usuario.email, tablero.usuario.contrasena)
WebUI.navigateToUrl(GlobalVariable.baseUrl.toString() + '/proyectos/' + tablero.proyectoId)
WebUI.waitForElementVisible(findTestObject('Page_Tablero/card_TareaEnColumna', [('columna') : 'Por Hacer', ('titulo') : tareaA]), T)
WebUI.verifyElementAttributeValue(findTestObject('Page_Tablero/progressbar_Progreso'), 'aria-valuenow', '0', T)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC12_01_inicio_0_por_ciento')

/** Abre el detalle de la tarea, elige la columna destino, espera el aviso y cierra el detalle. */
def moverTarea = { String titulo, String destino ->
	WebUI.comment('Mover "' + titulo + '" a ' + destino)
	WebUI.waitForElementClickable(findTestObject('Page_Tablero/btn_AbrirDetalle', [('titulo') : titulo]), T)
	WebUI.click(findTestObject('Page_Tablero/btn_AbrirDetalle', [('titulo') : titulo]))
	WebUI.waitForElementVisible(findTestObject('Comunes/dialog_PorTitulo', [('titulo') : 'Detalle de la tarea']), T)
	WebUI.waitForElementClickable(findTestObject('Page_Tablero/select_ColumnaDetalle'), T)
	WebUI.selectOptionByLabel(findTestObject('Page_Tablero/select_ColumnaDetalle'), destino, false)
	WebUI.waitForElementVisible(findTestObject('Comunes/toast_Exito', [('texto') : '"' + titulo + '" movida a ' + destino]), T)
	WebUI.verifyOptionSelectedByLabel(findTestObject('Page_Tablero/select_ColumnaDetalle'), destino, false, T)
	WebUI.click(findTestObject('Page_Tablero/btn_CerrarDetalle'))
	WebUI.waitForElementNotPresent(findTestObject('Comunes/dialog_Modal'), T)
	WebUI.waitForElementVisible(findTestObject('Page_Tablero/card_TareaEnColumna', [('columna') : destino, ('titulo') : titulo]), T)
	WebUI.verifyElementVisible(findTestObject('Page_Tablero/card_TareaEnColumna', [('columna') : destino, ('titulo') : titulo]))
}

WebUI.comment('Paso 2: A -> En Progreso (el progreso no cambia)')
moverTarea(tareaA, 'En Progreso')
WebUI.verifyElementAttributeValue(findTestObject('Page_Tablero/progressbar_Progreso'), 'aria-valuenow', '0', T)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC12_02_en_progreso_0_por_ciento')

WebUI.comment('Paso 3: A -> Hecho (50 %)')
moverTarea(tareaA, 'Hecho')
WebUI.waitForElementAttributeValue(findTestObject('Page_Tablero/progressbar_Progreso'), 'aria-valuenow', '50', T)
WebUI.verifyElementAttributeValue(findTestObject('Page_Tablero/progressbar_Progreso'), 'aria-valuenow', '50', T)
WebUI.verifyElementAttributeValue(findTestObject('Page_Tablero/progressbar_Progreso'), 'aria-valuetext', '1 de 2 tareas hechas (50%)', T)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC12_03_hecho_50_por_ciento')

WebUI.comment('Paso 4: B -> Hecho (100 %)')
moverTarea(tareaB, 'Hecho')
WebUI.waitForElementAttributeValue(findTestObject('Page_Tablero/progressbar_Progreso'), 'aria-valuenow', '100', T)
WebUI.verifyElementAttributeValue(findTestObject('Page_Tablero/progressbar_Progreso'), 'aria-valuenow', '100', T)
WebUI.verifyElementText(findTestObject('Page_Tablero/span_ContadorColumna', [('columna') : 'Hecho']), '2')

WebUI.comment('Paso 5: recargar y comprobar que el estado se guardó en el servidor')
WebUI.refresh()
WebUI.waitForElementVisible(findTestObject('Page_Tablero/card_TareaEnColumna', [('columna') : 'Hecho', ('titulo') : tareaB]), T)
WebUI.verifyElementAttributeValue(findTestObject('Page_Tablero/progressbar_Progreso'), 'aria-valuenow', '100', T)
WebUI.verifyElementAttributeValue(findTestObject('Page_Tablero/progressbar_Progreso'), 'aria-valuetext', '2 de 2 tareas hechas (100%)', T)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC12_04_recargado_100_por_ciento')

WebUI.closeBrowser()
