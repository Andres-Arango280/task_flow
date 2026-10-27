@web @autenticacion
Feature: Autenticación en TaskFlow
  Necesidad: una persona quiere organizar las tareas de su equipo sin que nadie más vea su información.
  Regla: TaskFlow crea cuentas con datos válidos y solo concede acceso con credenciales válidas; rechaza las inválidas.
  Ejemplos: registro y acceso aceptados, correo repetido rechazado, credenciales inválidas rechazadas y rutas privadas protegidas.

  Background:
    Given la aplicación TaskFlow está disponible

  Rule: Una persona nueva crea su cuenta y entra con ella

    @GH-01 @exitoso @smoke
    Scenario: Registro e inicio de sesión correctos
      Given Ana es una persona nueva sin cuenta en TaskFlow
      When ella se registra desde el formulario con sus datos
      Then ella es redirigida al inicio de sesión con el mensaje "Cuenta creada correctamente"
      And ella observa su correo precargado en el formulario de inicio de sesión
      When ella inicia sesión con sus credenciales
      Then ella observa la página "Mis equipos"
      And el título de la pestaña es "Mis equipos · TaskFlow"
      And su navegador guarda un token de acceso

    @GH-02 @alternativo
    Scenario: Registro con un correo ya existente
      Given Ana ya tiene una cuenta registrada en TaskFlow
      When ella intenta registrarse de nuevo con el mismo correo
      Then ella observa en el formulario de registro el error "Ya existe una cuenta con el correo"
      And ella permanece en la ruta "/register"

  Rule: Solo las credenciales válidas dan acceso

    @error
    Scenario Outline: Inicio de sesión rechazado
      Given Ana ya tiene una cuenta registrada en TaskFlow
      When ella intenta iniciar sesión con <credenciales>
      Then ella observa en el formulario de inicio de sesión el error "<mensaje>"
      And ella permanece en la ruta "/login"
      And su navegador no guarda ningún token de acceso

      @GH-03
      Examples: contraseña incorrecta
        | credenciales                          | mensaje                                    |
        | su correo y una contraseña equivocada | El correo o la contraseña no son correctos |

      @GH-04
      Examples: correo no registrado
        | credenciales            | mensaje                                    |
        | un correo no registrado | El correo o la contraseña no son correctos |

  Rule: Las rutas privadas exigen una sesión iniciada

    @GH-05 @error
    Scenario: Una ruta protegida sin sesión redirige al inicio de sesión
      Given Ana no ha iniciado sesión en TaskFlow
      When ella intenta abrir la ruta "/proyectos/00000000-0000-0000-0000-000000000000"
      Then ella es redirigida a la ruta "/login"
      And el encabezado principal es "Iniciar sesión"
      When ella intenta abrir la ruta "/preferencias"
      Then ella es redirigida a la ruta "/login"
      And el título de la pestaña es "Iniciar sesión · TaskFlow"
