# language: es
@tareas
Característica: Tablero Kanban de tareas
  Como miembro de un proyecto
  quiero crear, mover y eliminar tareas en el tablero
  para seguir el avance del trabajo del equipo.

  Antecedentes:
    Dado que la aplicación TaskFlow está disponible
    Y que Ana tiene una cuenta, un equipo y un proyecto vacío creados por API
    Y que Ana ha iniciado sesión en TaskFlow

  @exitoso
  Escenario: GH-09 Crear tareas, mover una a «Hecho» y ver subir el progreso
    Dado que Ana está viendo el tablero de su proyecto
    Y el progreso del proyecto es 0 %
    Cuando Ana crea la tarea "Diseñar la pantalla de inicio" con la descripción "Wireframes y prototipo"
    Y Ana crea la tarea "Configurar la base de datos"
    Entonces la columna "Por Hacer" contiene las tareas "Diseñar la pantalla de inicio" y "Configurar la base de datos"
    Y el progreso del proyecto es 0 %
    Cuando Ana mueve la tarea "Diseñar la pantalla de inicio" a la columna "Hecho"
    Entonces Ana ve el aviso "movida a Hecho"
    Y la columna "Hecho" contiene la tarea "Diseñar la pantalla de inicio"
    Y la columna "Por Hacer" contiene la tarea "Configurar la base de datos"
    Y el progreso del proyecto es 50 %

  @error
  Escenario: GH-10 Crear una tarea sin título muestra un error y no la crea
    Dado que Ana está viendo el tablero de su proyecto
    Cuando Ana intenta crear una tarea sin título con la descripción "Solo descripción, sin título"
    Entonces Ana ve en la ventana de nueva tarea el error "Escribe un título para la tarea"
    Y el tablero no muestra ninguna tarea

  @alternativo
  Escenario: GH-11 Eliminar una tarea pide confirmación y se puede deshacer
    Dado que existen por API las tareas "Tarea temporal" y "Tarea que se queda" en el proyecto de Ana
    Y que Ana está viendo el tablero de su proyecto
    Y la columna "Por Hacer" contiene la tarea "Tarea temporal"
    Cuando Ana elimina la tarea "Tarea temporal" confirmando la acción
    Entonces Ana ve el aviso "Tarea \"Tarea temporal\" eliminada"
    Y el tablero muestra únicamente la tarea "Tarea que se queda"
    Cuando Ana deshace la última acción desde el aviso
    Entonces la columna "Por Hacer" contiene la tarea "Tarea temporal"
    Y Ana ve el aviso "Tarea \"Tarea temporal\" restaurada"
