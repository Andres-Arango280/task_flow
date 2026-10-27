@web @tareas
Feature: Tablero Kanban de tareas
  Necesidad: una integrante del proyecto quiere crear, mover y eliminar tareas para seguir el avance del equipo.
  Regla: toda tarea necesita un título; mover una tarea a «Hecho» actualiza el progreso; eliminar pide confirmación y se puede deshacer.
  Ejemplos: crear y mover tareas, intentar crear una tarea sin título, eliminar una tarea y deshacer.

  Background:
    Given la aplicación TaskFlow está disponible
    And Ana tiene una cuenta, un equipo y un proyecto vacío creados por API
    And ella ha iniciado sesión en TaskFlow

  Rule: El progreso del proyecto refleja las tareas en «Hecho»

    @GH-09 @exitoso @smoke
    Scenario: Crear tareas y mover una a Hecho
      Given ella está viendo el tablero de su proyecto
      And el progreso del proyecto es 0 %
      When ella crea la tarea "Diseñar la pantalla de inicio" con la descripción "Wireframes y prototipo"
      And ella crea la tarea "Configurar la base de datos"
      Then ella observa en la columna "Por Hacer" solamente las tareas:
        | Diseñar la pantalla de inicio |
        | Configurar la base de datos   |
      And el progreso del proyecto es 0 %
      When ella mueve la tarea "Diseñar la pantalla de inicio" a la columna "Hecho"
      Then ella observa el mensaje "movida a Hecho"
      And ella observa en la columna "Hecho" solamente las tareas:
        | Diseñar la pantalla de inicio |
      And ella observa en la columna "Por Hacer" solamente las tareas:
        | Configurar la base de datos |
      And el progreso del proyecto es 50 %

  Rule: Una tarea necesita un título

    @GH-10 @error
    Scenario: Crear una tarea sin título
      Given ella está viendo el tablero de su proyecto
      When ella intenta crear una tarea sin título con la descripción "Solo descripción, sin título"
      Then ella observa en la ventana de nueva tarea el error "Escribe un título para la tarea"
      And el tablero no muestra ninguna tarea

  Rule: Eliminar una tarea pide confirmación y se puede deshacer

    @GH-11 @alternativo
    Scenario: Eliminar una tarea y deshacer la eliminación
      Given existen por API las tareas en el proyecto de Ana:
        | Tarea temporal     |
        | Tarea que se queda |
      And ella está viendo el tablero de su proyecto
      And ella observa en la columna "Por Hacer" la tarea "Tarea temporal"
      When ella elimina la tarea "Tarea temporal" confirmando la acción
      Then ella observa el mensaje "Tarea \"Tarea temporal\" eliminada"
      And ella observa solamente la tarea "Tarea que se queda" en el tablero
      When ella deshace la última acción desde el mensaje
      Then ella observa en la columna "Por Hacer" la tarea "Tarea temporal"
      And ella observa el mensaje "Tarea \"Tarea temporal\" restaurada"
