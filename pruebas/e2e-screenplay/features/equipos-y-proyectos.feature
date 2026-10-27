@web @equipos
Feature: Equipos y proyectos
  Necesidad: la líder de un equipo quiere organizar el trabajo con sus compañeros en tableros compartidos.
  Regla: solo se invita a personas que ya tienen cuenta y cada proyecto nace con las tres listas del tablero.
  Ejemplos: crear un equipo e invitar a un miembro, invitar un correo inexistente y crear un proyecto.

  Background:
    Given la aplicación TaskFlow está disponible

  Rule: La líder invita a personas que ya tienen cuenta

    @GH-06 @exitoso @smoke
    Scenario: Crear un equipo e invitar a un miembro registrado
      Given Beto ya tiene una cuenta registrada en TaskFlow
      And Ana ha iniciado sesión en TaskFlow
      When ella crea el equipo "Equipo Backend"
      Then ella observa el mensaje "creado"
      When ella abre el equipo "Equipo Backend"
      Then el título de la pestaña termina en "· TaskFlow"
      And ella observa solamente los miembros:
        | Ana |
      When ella invita a Beto por su correo
      Then ella observa el mensaje "ahora es miembro del equipo"
      And ella observa solamente los miembros:
        | Ana  |
        | Beto |

    @GH-07 @alternativo
    Scenario: Invitar un correo que no está registrado
      Given Ana tiene una cuenta y un equipo creados por API
      And ella ha iniciado sesión en TaskFlow
      And ella está en la página de su equipo
      When ella busca para invitar a un correo que no está registrado
      Then ella observa en la ventana de invitación el error "No hay ningún usuario registrado con el correo"
      And el equipo sigue teniendo 1 miembro

  Rule: Cada proyecto nuevo tiene un tablero con tres listas

    @GH-08 @proyectos @exitoso
    Scenario: Crear un proyecto genera un tablero con las columnas por defecto
      Given Ana tiene una cuenta y un equipo creados por API
      And ella ha iniciado sesión en TaskFlow
      And ella está en la página de su equipo
      When ella crea el proyecto "Proyecto API"
      Then ella observa el mensaje "creado con sus 3 listas"
      When ella abre el tablero del proyecto "Proyecto API"
      Then la ruta actual contiene "/proyectos/"
      And ella observa solamente las columnas:
        | Por Hacer   |
        | En Progreso |
        | Hecho       |
      And el progreso del proyecto es 0 %
