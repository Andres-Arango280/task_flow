import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC13_EliminarTarea_ConfirmarYDeshacer (POSITIVO, con rama de cancelación)
 * Objetivo: eliminar una tarea pide confirmación, "Cancelar" no borra y "Deshacer" la restaura.
 * Resultado esperado: [role=alertdialog] "¿Eliminar esta tarea?"; Cancelar mantiene la tarea; "Eliminar tarea" la quita
 *   con aviso 'Tarea "X" eliminada.'; "Deshacer" la restaura (aviso 'Tarea "X" restaurada.') y persiste tras recargar.
 * Evidencia: Reports/evidencias/TC13_*.png
 */
int T = GlobalVariable.timeout as int
String titulo = 'Tarea que se eliminara'
Map tablero = CustomKeywords.'taskflow.Utilidades.prepararTableroPorApi'('eliminar', [titulo])

WebUI.comment('Paso 1: iniciar sesión y abrir el detalle de la tarea')
CustomKeywords.'taskflow.Utilidades.abrirConSesion'(tablero.usuario.email, tablero.usuario.contrasena)
WebUI.navigateToUrl(GlobalVariable.baseUrl.toString() + '/proyectos/' + tablero.proyectoId)
WebUI.waitForElementVisible(findTestObject('Page_Tablero/card_Tarea', [('titulo') : titulo]), T)
WebUI.click(findTestObject('Page_Tablero/btn_AbrirDetalle', [('titulo') : titulo]))
WebUI.waitForElementVisible(findTestObject('Comunes/dialog_PorTitulo', [('titulo') : 'Detalle de la tarea']), T)

WebUI.comment('Paso 2: pulsar Eliminar y cancelar en la confirmación')
WebUI.waitForElementClickable(findTestObject('Page_Tablero/btn_EliminarTarea'), T)
WebUI.click(findTestObject('Page_Tablero/btn_EliminarTarea'))
WebUI.waitForElementVisible(findTestObject('Comunes/alertdialog_Confirmacion'), T)
WebUI.verifyElementText(findTestObject('Comunes/alertdialog_Titulo'), '¿Eliminar esta tarea?')
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC13_01_confirmacion')
WebUI.click(findTestObject('Comunes/alertdialog_Boton', [('texto') : 'Cancelar']))
WebUI.waitForElementNotPresent(findTestObject('Comunes/alertdialog_Confirmacion'), T)
WebUI.waitForElementVisible(findTestObject('Comunes/dialog_PorTitulo', [('titulo') : 'Detalle de la tarea']), T)
WebUI.verifyElementPresent(findTestObject('Page_Tablero/card_Tarea', [('titulo') : titulo]), T)

WebUI.comment('Paso 3: eliminar confirmando')
WebUI.click(findTestObject('Page_Tablero/btn_EliminarTarea'))
WebUI.waitForElementVisible(findTestObject('Comunes/alertdialog_Boton', [('texto') : 'Eliminar tarea']), T)
WebUI.click(findTestObject('Comunes/alertdialog_Boton', [('texto') : 'Eliminar tarea']))
WebUI.waitForElementVisible(findTestObject('Comunes/toast_Exito', [('texto') : 'Tarea "' + titulo + '" eliminada.']), T)
WebUI.waitForElementNotPresent(findTestObject('Page_Tablero/card_Tarea', [('titulo') : titulo]), T)
WebUI.verifyElementNotPresent(findTestObject('Page_Tablero/card_Tarea', [('titulo') : titulo]), GlobalVariable.timeoutCorto as int)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC13_02_eliminada_con_deshacer')

WebUI.comment('Paso 4: pulsar "Deshacer" en el aviso (dura 8 s)')
WebUI.waitForElementClickable(findTestObject('Comunes/toast_Boton', [('etiqueta') : 'Deshacer']), T)
WebUI.click(findTestObject('Comunes/toast_Boton', [('etiqueta') : 'Deshacer']))
WebUI.waitForElementVisible(findTestObject('Comunes/toast_Info', [('texto') : 'Tarea "' + titulo + '" restaurada.']), T)
WebUI.waitForElementVisible(findTestObject('Page_Tablero/card_TareaEnColumna', [('columna') : 'Por Hacer', ('titulo') : titulo]), T)
WebUI.verifyElementVisible(findTestObject('Page_Tablero/card_TareaEnColumna', [('columna') : 'Por Hacer', ('titulo') : titulo]))

WebUI.comment('Paso 5: recargar y comprobar que la tarea restaurada persiste')
WebUI.refresh()
WebUI.waitForElementVisible(findTestObject('Page_Tablero/card_Tarea', [('titulo') : titulo]), T)
WebUI.verifyElementVisible(findTestObject('Page_Tablero/card_Tarea', [('titulo') : titulo]))
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC13_03_restaurada_tras_recargar')

WebUI.closeBrowser()
