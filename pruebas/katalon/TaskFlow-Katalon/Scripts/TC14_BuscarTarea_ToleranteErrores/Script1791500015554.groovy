import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC14_BuscarTarea_ToleranteErrores (POSITIVO, con Data File)
 * Datos: Data Files/consultas_busqueda (Data/consultas_busqueda.csv) — consulta, coincidencias, esperada, motivo.
 * Objetivo: el buscador "Buscar tareas" tolera tildes, mayúsculas y pequeños errores de escritura.
 * Resultado esperado: para cada consulta, "Mostrando N de 3 tareas" y las tarjetas visibles son las esperadas;
 *   sin coincidencias aparece "Ninguna tarea coincide aquí"; "Limpiar filtros" vuelve a 3 de 3.
 * Evidencia: Reports/evidencias/TC14_*.png
 */
int T = GlobalVariable.timeout as int
int TC = GlobalVariable.timeoutCorto as int
Map<String, String> titulos = [('T1') : 'Diseñar pantalla de inicio', ('T2') : 'Revisar API de usuarios', ('T3') : 'Preparar demostración final']
Map tablero = CustomKeywords.'taskflow.Utilidades.prepararTableroPorApi'('buscar', titulos.values() as List)
TestData consultas = findTestData('Data Files/consultas_busqueda')

WebUI.comment('Paso 1: iniciar sesión y abrir el tablero con 3 tareas')
CustomKeywords.'taskflow.Utilidades.abrirConSesion'(tablero.usuario.email, tablero.usuario.contrasena)
WebUI.navigateToUrl(GlobalVariable.baseUrl.toString() + '/proyectos/' + tablero.proyectoId)
WebUI.waitForElementVisible(findTestObject('Page_Tablero/card_Tarea', [('titulo') : titulos.T3]), T)
WebUI.waitForElementVisible(findTestObject('Page_Tablero/input_BuscarTareas'), T)

for (int fila = 1; fila <= consultas.getRowNumbers(); fila++) {
	String consulta = consultas.getValue('consulta', fila)
	String coincidencias = consultas.getValue('coincidencias', fila)
	String esperada = consultas.getValue('esperada', fila)
	WebUI.comment('Consulta ' + fila + ': "' + consulta + '" (' + consultas.getValue('motivo', fila) + ') -> ' + coincidencias)

	WebUI.setText(findTestObject('Page_Tablero/input_BuscarTareas'), consulta)
	WebUI.verifyElementAttributeValue(findTestObject('Page_Tablero/input_BuscarTareas'), 'value', consulta, T)
	WebUI.verifyMatch(WebUI.getText(findTestObject('Page_Tablero/p_ContadorVisibles')), 'Mostrando\\s+' + coincidencias + '\\s+de\\s+3\\s+tareas', true)

	List<String> visibles = esperada == 'todas' ? (titulos.values() as List) : (esperada == 'ninguna' ? [] : [titulos[esperada]])
	titulos.values().each { String titulo ->
		if (visibles.contains(titulo)) {
			WebUI.waitForElementVisible(findTestObject('Page_Tablero/card_Tarea', [('titulo') : titulo]), T)
			WebUI.verifyElementVisible(findTestObject('Page_Tablero/card_Tarea', [('titulo') : titulo]))
		} else {
			WebUI.waitForElementNotPresent(findTestObject('Page_Tablero/card_Tarea', [('titulo') : titulo]), TC)
			WebUI.verifyElementNotPresent(findTestObject('Page_Tablero/card_Tarea', [('titulo') : titulo]), 1)
		}
	}
	if (esperada == 'ninguna') {
		WebUI.verifyElementVisible(findTestObject('Page_Tablero/p_SinCoincidencias'))
	}
	CustomKeywords.'taskflow.Utilidades.capturarEvidencia'(String.format('TC14_%02d_%s', fila, consulta.replace(' ', '_')))
}

WebUI.comment('Paso final: "Limpiar filtros" vuelve a mostrar las 3 tareas')
WebUI.waitForElementClickable(findTestObject('Page_Tablero/btn_LimpiarFiltros'), T)
WebUI.click(findTestObject('Page_Tablero/btn_LimpiarFiltros'))
WebUI.verifyElementAttributeValue(findTestObject('Page_Tablero/input_BuscarTareas'), 'value', '', T)
WebUI.verifyMatch(WebUI.getText(findTestObject('Page_Tablero/p_ContadorVisibles')), 'Mostrando\\s+3\\s+de\\s+3\\s+tareas', true)

WebUI.closeBrowser()
