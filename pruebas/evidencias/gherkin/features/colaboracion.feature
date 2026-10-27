# language: es
@usuarios @seguridad
Característica: Control de acceso entre usuarios
  Como líder de un equipo
  quiero que solo las personas de mi equipo vean nuestros proyectos
  para proteger la información del trabajo.

  Antecedentes:
    Dado que la aplicación TaskFlow está disponible

  @error
  Escenario: GH-12 Una usuaria ajena al equipo no puede ver el tablero de Ana
    Dado que Ana tiene una cuenta, un equipo y un proyecto con la tarea "Tarea confidencial" creados por API
    Y que Carla tiene una cuenta creada por API y no pertenece al equipo de Ana
    Cuando Carla consulta por API las tareas del proyecto de Ana
    Entonces la API responde a Carla con el estado 403
    Cuando Carla inicia sesión con sus credenciales
    Entonces Carla no ve el equipo de Ana en "Mis equipos"
    Cuando Carla intenta abrir el tablero del proyecto de Ana
    Entonces el encabezado principal que ve Carla es "No tienes acceso a este proyecto"
    Y Carla ve un aviso de error "No tienes acceso a este proyecto"
    Y Carla no ve el tablero ni la tarea "Tarea confidencial"
