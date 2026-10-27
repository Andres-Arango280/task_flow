import com.kms.katalon.core.annotation.AfterTestCase
import com.kms.katalon.core.annotation.BeforeTestCase
import com.kms.katalon.core.context.TestCaseContext
import com.kms.katalon.core.model.FailureHandling
import com.kms.katalon.core.util.KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import taskflow.Utilidades

/**
 * Antes de cada caso deja constancia en el log; después, si el caso no pasó,
 * guarda una captura FALLO_<caso>.png en Reports/evidencias y cierra siempre el navegador
 * para que el siguiente caso empiece limpio (pruebas independientes y reproducibles).
 */
class ListenerTaskFlow {

	@BeforeTestCase
	def antesDelCaso(TestCaseContext contexto) {
		KeywordUtil.logInfo('Inicio del caso: ' + contexto.getTestCaseId())
	}

	@AfterTestCase
	def despuesDelCaso(TestCaseContext contexto) {
		String estado = contexto.getTestCaseStatus()
		KeywordUtil.logInfo('Fin del caso: ' + contexto.getTestCaseId() + ' -> ' + estado)
		if (estado != 'PASSED') {
			try {
				String nombre = 'FALLO_' + contexto.getTestCaseId().replaceAll('.*/', '')
				new Utilidades().capturarEvidencia(nombre)
			} catch (Exception e) {
				KeywordUtil.logInfo('No se pudo capturar la pantalla del fallo: ' + e.getMessage())
			}
		}
		WebUI.closeBrowser(FailureHandling.OPTIONAL)
	}
}
