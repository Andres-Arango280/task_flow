@web @api @usuarios @seguridad
Feature: Control de acceso entre usuarios
  Necesidad: la líder de un equipo quiere que solo las personas de su equipo vean sus proyectos.
  Regla: la API y la interfaz niegan el acceso a los proyectos de equipos a los que la persona no pertenece.
  Ejemplos: una usuaria ajena consulta la API y abre el tablero de otro equipo.

  Background:
    Given la aplicación TaskFlow está disponible

  Rule: Solo los miembros del equipo ven sus proyectos

    @GH-12 @error
    Scenario: Una usuaria ajena al equipo no puede ver el tablero de Ana
      Given Ana tiene una cuenta, un equipo y un proyecto con la tarea "Tarea confidencial" creados por API
      And Carla tiene una cuenta creada por API y no pertenece al equipo de Ana
      When Carla consulta por API las tareas del proyecto de Ana
      Then la API responde a Carla con el estado 403
      When Carla inicia sesión con sus credenciales
      Then Carla no observa el equipo de Ana en "Mis equipos"
      When Carla intenta abrir el tablero del proyecto de Ana
      Then Carla observa el encabezado "No tienes acceso a este proyecto"
      And Carla observa el mensaje de error "No tienes acceso a este proyecto"
      And Carla no observa el tablero ni la tarea "Tarea confidencial"
