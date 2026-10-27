import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject

import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.util.KeywordUtil as KeywordUtil
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

import internal.GlobalVariable as GlobalVariable

/*
 * TC07_CrearEquipo (POSITIVO)
 * Objetivo: un usuario crea un equipo desde "Mis equipos" y queda como líder.
 * Resultado esperado: "Crear equipo" deshabilitado con el nombre vacío; tras crear, aviso "Equipo «X» creado",
 *   la ventana se cierra, la tarjeta muestra el distintivo "Líder" y la página del equipo muestra "Eres el líder".
 * Evidencia: Reports/evidencias/TC07_*.png
 */
int T = GlobalVariable.timeout as int
Map usuario = CustomKeywords.'taskflow.Utilidades.crearUsuarioConSesion'('equipo', 'Lider Equipo')
String nombreEquipo = 'Equipo Katalon ' + CustomKeywords.'taskflow.Utilidades.generarSufijo'()

WebUI.comment('Paso 1: iniciar sesión')
CustomKeywords.'taskflow.Utilidades.abrirConSesion'(usuario.email, usuario.contrasena)

WebUI.comment('Paso 2: abrir la ventana "Nuevo equipo"')
WebUI.waitForElementClickable(findTestObject('Page_Inicio/btn_NuevoEquipo'), T)
WebUI.click(findTestObject('Page_Inicio/btn_NuevoEquipo'))
WebUI.waitForElementVisible(findTestObject('Comunes/dialog_PorTitulo', [('titulo') : 'Nuevo equipo']), T)
WebUI.verifyElementVisible(findTestObject('Page_Inicio/input_NombreEquipo'))

WebUI.comment('Verificación negativa: con el nombre vacío el botón "Crear equipo" está deshabilitado')
WebUI.verifyElementHasAttribute(findTestObject('Page_Inicio/btn_CrearEquipo'), 'disabled', T)

WebUI.comment('Paso 3: escribir el nombre y crear')
WebUI.setText(findTestObject('Page_Inicio/input_NombreEquipo'), nombreEquipo)
WebUI.waitForElementClickable(findTestObject('Page_Inicio/btn_CrearEquipo'), T)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC07_01_formulario_equipo')
WebUI.click(findTestObject('Page_Inicio/btn_CrearEquipo'))

WebUI.comment('Verificación: aviso de éxito, ventana cerrada y tarjeta del equipo como líder')
WebUI.waitForElementVisible(findTestObject('Comunes/toast_Exito', [('texto') : nombreEquipo + '» creado']), T)
WebUI.verifyElementVisible(findTestObject('Comunes/toast_Exito', [('texto') : nombreEquipo + '» creado']))
WebUI.waitForElementNotPresent(findTestObject('Comunes/dialog_Modal'), T)
WebUI.waitForElementVisible(findTestObject('Page_Inicio/link_EquipoLider', [('nombre') : nombreEquipo]), T)
WebUI.verifyElementVisible(findTestObject('Page_Inicio/link_EquipoLider', [('nombre') : nombreEquipo]))
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC07_02_equipo_creado')

WebUI.comment('Paso 4: abrir el equipo y comprobar el rol de líder')
WebUI.click(findTestObject('Page_Inicio/link_EquipoLider', [('nombre') : nombreEquipo]))
WebUI.waitForElementVisible(findTestObject('Page_Equipo/h1_NombreEquipo', [('nombre') : nombreEquipo]), T)
WebUI.verifyElementVisible(findTestObject('Page_Equipo/span_EresLider'))
WebUI.verifyMatch(CustomKeywords.'taskflow.Utilidades.rutaActual'(), '/equipos/[0-9a-f-]{36}', true)
CustomKeywords.'taskflow.Utilidades.capturarEvidencia'('TC07_03_pagina_equipo')

WebUI.closeBrowser()
