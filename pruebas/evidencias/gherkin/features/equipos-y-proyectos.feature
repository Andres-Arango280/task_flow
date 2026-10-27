# language: es
@equipos
Característica: Equipos y proyectos
  Como líder de un equipo
  quiero crear equipos, invitar a mis compañeros y abrir proyectos
  para organizar el trabajo en tableros Kanban compartidos.

  Antecedentes:
    Dado que la aplicación TaskFlow está disponible

  @exitoso
  Escenario: GH-06 La líder crea un equipo e invita a un miembro registrado
    Dado que Beto ya tiene una cuenta registrada en TaskFlow
    Y que Ana ha iniciado sesión en TaskFlow
    Cuando Ana crea el equipo "Equipo Backend"
    Entonces Ana ve el aviso "creado"
    Cuando Ana abre el equipo "Equipo Backend"
    Entonces el título de la pestaña termina en "· TaskFlow"
    Y los miembros del equipo son solo Ana
    Cuando Ana invita a Beto por su correo
    Entonces los miembros del equipo son Ana y Beto
    Y Ana ve el aviso "ahora es miembro del equipo"

  @alternativo
  Escenario: GH-07 Invitar un correo que no está registrado muestra un error en la ventana
    Dado que Ana tiene una cuenta y un equipo creados por API
    Y que Ana ha iniciado sesión en TaskFlow
    Y que Ana está en la página de su equipo
    Cuando Ana busca para invitar a un correo que no está registrado
    Entonces Ana ve en la ventana de invitación el error "No hay ningún usuario registrado con el correo"
    Y el equipo sigue teniendo 1 miembro

  @proyectos @exitoso
  Escenario: GH-08 Crear un proyecto genera un tablero con las 3 columnas por defecto
    Dado que Ana tiene una cuenta y un equipo creados por API
    Y que Ana ha iniciado sesión en TaskFlow
    Y que Ana está en la página de su equipo
    Cuando Ana crea el proyecto "Proyecto API"
    Entonces Ana ve el aviso "creado con sus 3 listas"
    Cuando Ana abre el tablero del proyecto "Proyecto API"
    Entonces la ruta actual contiene "/proyectos/"
    Y las columnas del tablero son "Por Hacer", "En Progreso" y "Hecho"
    Y el progreso del proyecto es 0 %
