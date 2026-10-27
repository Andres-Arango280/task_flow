# language: es
@autenticacion
Característica: Acceso a TaskFlow (registro, inicio de sesión y rutas protegidas)
  Como persona que quiere organizar tareas con su equipo
  quiero crear mi cuenta e iniciar sesión de forma segura
  para que solo yo pueda ver y gestionar mis equipos y proyectos.

  Antecedentes:
    Dado que la aplicación TaskFlow está disponible

  @exitoso
  Escenario: GH-01 Registro exitoso de una nueva usuaria e inicio de sesión
    Dado que Ana es una persona nueva sin cuenta en TaskFlow
    Cuando Ana se registra desde el formulario con sus datos
    Entonces Ana es redirigida al inicio de sesión con el aviso "Cuenta creada correctamente"
    Y el correo de Ana aparece precargado en el formulario de inicio de sesión
    Cuando Ana inicia sesión con sus credenciales
    Entonces Ana llega a la página "Mis equipos"
    Y el título de la pestaña es "Mis equipos · TaskFlow"
    Y el navegador de Ana guarda un token de acceso

  @alternativo
  Escenario: GH-02 Registro con un correo ya existente muestra un error
    Dado que Ana ya tiene una cuenta registrada en TaskFlow
    Cuando Ana intenta registrarse de nuevo con el mismo correo
    Entonces Ana ve en el formulario de registro el error "Ya existe una cuenta con el correo"
    Y Ana permanece en la ruta "/register"

  @error
  Esquema del escenario: <id> Inicio de sesión rechazado <motivo>
    Dado que Ana ya tiene una cuenta registrada en TaskFlow
    Cuando Ana intenta iniciar sesión <credenciales>
    Entonces Ana ve en el formulario de inicio de sesión el error "El correo o la contraseña no son correctos"
    Y Ana permanece en la ruta "/login"
    Y el navegador de Ana no guarda ningún token de acceso

    Ejemplos:
      | id    | motivo                        | credenciales                              |
      | GH-03 | con una contraseña incorrecta | con su correo y una contraseña equivocada |
      | GH-04 | con un correo que no existe   | con un correo no registrado               |

  @error
  Escenario: GH-05 Una ruta protegida sin sesión redirige al inicio de sesión
    Dado que Ana no ha iniciado sesión en TaskFlow
    Cuando Ana intenta abrir la ruta "/proyectos/00000000-0000-0000-0000-000000000000"
    Entonces Ana es redirigida a la ruta "/login"
    Y el encabezado principal es "Iniciar sesión"
    Cuando Ana intenta abrir la ruta "/preferencias"
    Entonces Ana es redirigida a la ruta "/login"
    Y el título de la pestaña es "Iniciar sesión · TaskFlow"
