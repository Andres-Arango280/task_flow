import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC11_CrearTarea (POSITIVO, con Data File)
 * Datos: Data Files/titulos_tareas (Data/titulos_tareas.csv) — columnas titulo, descripcion.
 * Objetivo: crear tareas desde "Nueva tarea" (incluida la validación de título obligatorio).
 * Resultado esperado: sin título -> "Escribe un título para la tarea (es obligatorio)."; cada fila del CSV
 *   aparece en "Por Hacer" con el aviso 'Tarea "X" creada en Por Hacer.'; contador "Mostrando N de N tareas".
 * Evidencia: Reports/evidencias/TC11_*.png
 */
int T = GlobalVariable.timeout as int
TestData datos = findTestData('Data Files/titulos_tareas')
int filas = datos.getRowNumbers()
Map tablero = CustomKeywords.'taskflow.Utilidades.prepararTableroPorApi'('tareas', [])

WebUI.comment('Paso 1: iniciar sesión y abrir el tablero vacío')
CustomKeywords.'taskflow.Utilidades.abrirConSesion'(tablero.usuario.email, tablero.usuario.contrasena)
WebUI.navigateToUrl(GlobalVariable.baseUrl.toString() + '/proyectos/' + tablero.proyectoId)
WebUI.waitForElementVisible(findTestObject('Page_Tablero/h1_Proyecto', [('nombre') : tablero.proyectoNombre]), T)

WebUI.comment('Paso 2 (negativo): intentar crear una tarea sin título')
WebUI.waitForElementClickable(findTestObject('Page_Tablero/btn_NuevaTarea'), T)
WebUI.click(findTestObject('Page_Tablero/btn_NuevaTarea'))
WebUI.waitForElementVisible(findTestObject('Comunes/dialog_PorTitulo', [('titulo') : 'Crear nueva tarea']), T)
WebUI.click(findTestObject('Page_Tablero/btn_CrearTarea'))
WebUI.waitForElementVisible(findTestObject('Page_Tablero/p_ErrorTitulo'), T)
WebUI.verifyElementText(findTestObject('Page_Tablero/p_ErrorTitulo'), 'Escribe un título para la tarea (es obligatorio).')
WebUI.verifyElementAttributeValue(findTestObject('Page_Tablero/input_TituloTarea'), 'aria-invalid', 'true', T)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC11_01_titulo_obligatorio')

WebUI.comment('Paso 3: crear una tarea por cada fila del Data File')
for (int fila = 1; fila <= filas; fila++) {
	String titulo = datos.getValue('titulo', fila)
	String descripcion = datos.getValue('descripcion', fila)
	WebUI.comment('Fila ' + fila + ': ' + titulo)
	if (!WebUI.waitForElementPresent(findTestObject('Comunes/dialog_PorTitulo', [('titulo') : 'Crear nueva tarea']), 1, FailureHandling.OPTIONAL)) {
		WebUI.waitForElementClickable(findTestObject('Page_Tablero/btn_NuevaTarea'), T)
		WebUI.click(findTestObject('Page_Tablero/btn_NuevaTarea'))
		WebUI.waitForElementVisible(findTestObject('Comunes/dialog_PorTitulo', [('titulo') : 'Crear nueva tarea']), T)
	}
	WebUI.setText(findTestObject('Page_Tablero/input_TituloTarea'), titulo)
	WebUI.setText(findTestObject('Page_Tablero/textarea_DescripcionTarea'), descripcion)
	WebUI.waitForElementClickable(findTestObject('Page_Tablero/btn_CrearTarea'), T)
	WebUI.click(findTestObject('Page_Tablero/btn_CrearTarea'))

	WebUI.waitForElementVisible(findTestObject('Comunes/toast_Exito', [('texto') : 'Tarea "' + titulo + '" creada en Por Hacer.']), T)
	WebUI.waitForElementNotPresent(findTestObject('Comunes/dialog_Modal'), T)
	WebUI.waitForElementVisible(findTestObject('Page_Tablero/card_TareaEnColumna', [('columna') : 'Por Hacer', ('titulo') : titulo]), T)
	WebUI.verifyElementVisible(findTestObject('Page_Tablero/card_TareaEnColumna', [('columna') : 'Por Hacer', ('titulo') : titulo]))
}

WebUI.comment('Verificación: contadores del tablero y de la columna')
WebUI.verifyMatch(WebUI.getText(findTestObject('Page_Tablero/p_ContadorVisibles')), 'Mostrando\\s+' + filas + '\\s+de\\s+' + filas + '\\s+tareas', true)
WebUI.verifyElementText(findTestObject('Page_Tablero/span_ContadorColumna', [('columna') : 'Por Hacer']), filas.toString())
WebUI.verifyElementAttributeValue(findTestObject('Page_Tablero/progressbar_Progreso'), 'aria-valuenow', '0', T)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC11_02_tareas_creadas')

WebUI.closeBrowser()
