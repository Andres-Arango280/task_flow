# Plan de pruebas de TaskFlow (generado por el agente Planner)

**Aplicación:** TaskFlow — gestión colaborativa de tareas (equipos → proyectos → tablero Kanban).
**URL:** http://localhost:5173 (API en http://localhost:3000).
**Seed:** `tests/seed.spec.ts`
**Exploración:** snapshots ARIA y capturas en `specs/exploracion/` (01-login … 09-preferencias), obtenidos con `node explorar.mjs`.
**Estado inicial asumido:** base de datos compartida; cada escenario crea sus propios usuarios, equipos y proyectos con un sufijo único (`Date.now()`), y prepara por API lo que no es objeto de la prueba.

## Elementos descubiertos en la exploración

| Página | Elementos interactivos relevantes |
|---|---|
| `/login` | h1 «Iniciar sesión»; textbox «Correo electrónico (obligatorio)»; textbox «Contraseña (obligatorio)»; botón «Mostrar contraseña»; botón «Iniciar sesión»; enlace «Regístrate aquí» |
| `/register` | h1 «Crear cuenta»; textboxes «Nombre completo», «Correo electrónico», «Contraseña», «Confirmar contraseña»; lista de requisitos de contraseña con estado «pendiente / cumplido»; botón «Crear cuenta» |
| `/` (Mis equipos) | nav «Navegación principal» (Inicio, Ayuda, Preferencias, Salir); h1 «Mis equipos»; botón «Nuevo equipo»; región «Primeros pasos»; searchbox «Buscar equipos por nombre»; lista de equipos (enlace por tarjeta) |
| Modal «Nuevo equipo» | textbox «Nombre del equipo (obligatorio)»; botón «Crear equipo» (deshabilitado hasta escribir); «Cancelar» |
| `/equipos/:id` | migas de pan; h1 con el nombre; región «Proyectos (n)» con botón «Nuevo proyecto»; región «Miembros (n)» con botón «Invitar»; botón «Eliminar equipo» |
| `/proyectos/:id` | h1 con el nombre; progressbar «Progreso» y texto «0 de 1 tarea hecha»; botón «Nueva tarea»; searchbox «Buscar tareas»; combobox «Asignada a»; regiones «Por Hacer», «En Progreso», «Hecho» con contador |
| Modal «Crear nueva tarea» | textbox «Título de la tarea *»; textbox «Descripción (opcional)»; combobox «Columna»; checkboxes de miembros; botón «Crear tarea» |
| Modal «Detalle de la tarea» | textbox «Título *»; combobox «Columna» (cambio inmediato); botón «Eliminar»; botón «Guardar cambios» |

---

### 1. Autenticación
**Seed:** `tests/seed.spec.ts`

#### 1.1 Registro con datos válidos redirige al inicio de sesión
**Steps:**
1. Navegar a `/register`.
2. Escribir un nombre, un correo único y una contraseña que cumpla la política (8+ caracteres, letra y número) en «Contraseña» y «Confirmar contraseña».
3. Verificar que los cuatro requisitos de la lista pasan a «cumplido».
4. Pulsar «Crear cuenta».
**Expected:** la URL pasa a `/login`, se muestra el aviso «Cuenta creada correctamente» y el campo «Correo electrónico» trae el correo precargado.

#### 1.2 Inicio de sesión con credenciales válidas
**Steps:**
1. Crear un usuario por API (`POST /auth/register`).
2. Navegar a `/login`, escribir correo y contraseña y pulsar «Iniciar sesión».
**Expected:** la URL pasa a `/`, el h1 es «Mis equipos» y el título de la pestaña es «Mis equipos · TaskFlow».

#### 1.3 Inicio de sesión con contraseña incorrecta
**Steps:**
1. Crear un usuario por API.
2. Navegar a `/login`, escribir el correo y una contraseña equivocada, pulsar «Iniciar sesión».
**Expected:** aparece una alerta (`role=alert`) con «El correo o la contraseña no son correctos» y se permanece en `/login`.

#### 1.4 Ruta privada sin sesión redirige al login
**Steps:**
1. Sin sesión, navegar a `/preferencias`.
**Expected:** la URL pasa a `/login` y el h1 es «Iniciar sesión».

### 2. Equipos
**Seed:** `tests/seed.spec.ts`

#### 2.1 Crear un equipo desde «Mis equipos»
**Steps:**
1. Iniciar sesión por API y dejar la sesión en `localStorage` (`access_token`, `user`).
2. Navegar a `/` y pulsar «Nuevo equipo».
3. Verificar que «Crear equipo» está deshabilitado con el nombre vacío.
4. Escribir un nombre único y pulsar «Crear equipo».
**Expected:** aparece el aviso «Equipo «…» creado» y la tarjeta del equipo (heading nivel 3 con el nombre) en la lista; «Perteneces a 1 equipo.».

#### 2.2 Invitar a un correo no registrado muestra un error en la ventana
**Steps:**
1. Preparar usuario y equipo por API; abrir `/equipos/:id`.
2. Pulsar «Invitar», escribir un correo inexistente y pulsar «Buscar».
**Expected:** dentro del diálogo aparece «No hay ningún usuario registrado con el correo …» y la región «Miembros (1)» no cambia.

### 3. Proyectos
**Seed:** `tests/seed.spec.ts`

#### 3.1 Crear un proyecto genera el tablero con tres columnas
**Steps:**
1. Preparar usuario y equipo por API; abrir `/equipos/:id`.
2. Pulsar «Nuevo proyecto», escribir un nombre y pulsar «Crear proyecto».
3. Abrir el enlace «… Abrir tablero» del nuevo proyecto.
**Expected:** el h1 del tablero es el nombre del proyecto y existen las regiones «Por Hacer», «En Progreso» y «Hecho» con progreso 0 %.

### 4. Tablero y tareas
**Seed:** `tests/seed.spec.ts`

#### 4.1 Crear una tarea y moverla a «Hecho» actualiza el progreso
**Steps:**
1. Preparar usuario, equipo y proyecto por API; abrir `/proyectos/:id`.
2. Pulsar «Nueva tarea», escribir el título y pulsar «Crear tarea».
3. Verificar que la tarjeta aparece en «Por Hacer» y el texto «0 de 1 tarea hecha».
4. Abrir la tarjeta, cambiar el combobox «Columna» a «Hecho» y cerrar el detalle.
**Expected:** la tarjeta está en la región «Hecho», el progressbar marca 100 y el texto dice «1 de 1 tarea hecha».

#### 4.2 Crear una tarea sin título es rechazado
**Steps:**
1. Preparar usuario, equipo y proyecto por API; abrir el tablero.
2. Pulsar «Nueva tarea» y pulsar «Crear tarea» sin escribir título.
**Expected:** se muestra un error de validación del título dentro del diálogo y no se crea ninguna tarjeta («0» tareas en «Por Hacer»).

---

## Criterios de éxito / fallo
- Un escenario pasa si todas las verificaciones (`expect`) se cumplen en menos de 60 s.
- Los escenarios son independientes y pueden ejecutarse en cualquier orden (datos únicos por escenario).
- Un fallo de localizador se delega al agente Healer (ver `tests/healer-demo.spec.ts` y `reportes/healer-diff.md`).
