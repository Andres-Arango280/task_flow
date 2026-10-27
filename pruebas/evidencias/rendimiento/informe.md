# Informe de pruebas de rendimiento — TaskFlow API

- **Fecha:** 2026-10-27T04:35:41.156Z
- **Herramienta:** autocannon 7.15.0 (API programática) sobre Node.js v20.20.2; monitor de CPU/memoria con PowerShell Get-Process
- **Comando:** `cd pruebas/rendimiento && npm test   (todos; por escenario: npm run carga-base | carga-media | escritura | login | estres | resistencia; regenerar informe: npm run informe)`
- **Resultado:** 6/6 escenarios cumplen sus criterios de aceptación

## 1. Condiciones del entorno

| Elemento | Valor |
|---|---|
| Sistema operativo | Windows_NT 10.0.26300 (Windows 11 Home) x64 |
| CPU | AMD Ryzen AI 7 350 w/ Radeon 860M — 16 hilos lógicos |
| RAM | 23.2 GB |
| Node.js | v20.20.2 |
| Base de datos | PostgreSQL 18.6 (max_connections=100; pool TypeORM/pg por defecto = 10 conexiones) |
| Backend | NestJS 10 en modo desarrollo (npm run start:dev, proceso único) en http://localhost:3000 |
| Generador de carga | autocannon 7.15.0, misma máquina |
| Observación | Generador de carga (autocannon) y servidor en la misma máquina: compiten por CPU, por lo que los valores absolutos son conservadores. |

Datos sembrados vía API antes de cada ejecución (equipo dedicado, 5 usuarios, 50 tareas con 2 asignados en el proyecto de lectura) y eliminados al finalizar (borrado en cascada del equipo y de los usuarios).

## 2. Escenarios, criterios y resultados

| ID | Escenario | Condiciones | Criterio de aceptación | Req totales | Req/s | Media | p50 | p90 | p95 | p99 | Máx | Non-2xx | Errores/timeouts | Estado |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| REN-01 | Carga base — GET /equipos autenticado | 10 conexiones concurrentes, 30 s, token JWT válido; equipo con 5 miembros y 2 proyectos. | p95 < 200 ms y tasa de error ≤ 0% | 15001 | 500.04 | 19.53 | 19.07 | 25.47 | 28.27 | 35.23 | 239.47 | 0 | 0/0 | Aprobado |
| REN-02 | Carga media — GET /tareas?proyectoId (50 tareas) | 50 conexiones concurrentes, 30 s; proyecto con 50 tareas sembradas (2 asignados cada una). | p95 < 500 ms y tasa de error ≤ 1% | 5497 | 183.24 | 271.76 | 269.7 | 309.13 | 323.68 | 358.5 | 399.2 | 0 | 0/0 | Aprobado |
| REN-03 | Escritura — POST /tareas | 20 conexiones concurrentes, 20 s; cada petición crea una tarea con título único en el proyecto "Perf escritura". | p95 < 800 ms y tasa de error ≤ 1% | 5364 | 268.2 | 73.96 | 72.62 | 90.61 | 98.83 | 117.84 | 146.9 | 0 | 0/0 | Aprobado |
| REN-04 | Login — POST /auth/login (bcrypt coste 10) | 10 conexiones concurrentes, 20 s, credenciales correctas del mismo usuario (cada éxito reinicia el contador de bloqueo, por lo que no aparecen 429). | p95 < 1000 ms y tasa de error ≤ 1% | 1267 | 63.35 | 157.88 | 158.61 | 184.61 | 187.18 | 200.62 | 212.18 | 0 | 0/0 | Aprobado |
| REN-05 | Pico / estrés — GET /equipos en escalones 10→50→100→200→300 conexiones | 10 conexiones, 15 s | p95 < 1000 ms y tasa de error ≤ 1% (Criterio aplicado hasta 200 conexiones; 300 se usa para observar el comportamiento fuera de capacidad.) | 7345 | 489.67 | 19.94 | 19.18 | 26.21 | 29.01 | 37.6 | 304.7 | 0 | 0/0 | Aprobado |
| REN-05 | Pico / estrés — GET /equipos en escalones 10→50→100→200→300 conexiones | 50 conexiones, 15 s | p95 < 1000 ms y tasa de error ≤ 1% (Criterio aplicado hasta 200 conexiones; 300 se usa para observar el comportamiento fuera de capacidad.) | 7486 | 499.07 | 99.4 | 97.38 | 121.36 | 133.5 | 156.22 | 177.44 | 0 | 0/0 | Aprobado |
| REN-05 | Pico / estrés — GET /equipos en escalones 10→50→100→200→300 conexiones | 100 conexiones, 15 s | p95 < 1000 ms y tasa de error ≤ 1% (Criterio aplicado hasta 200 conexiones; 300 se usa para observar el comportamiento fuera de capacidad.) | 8607 | 573.8 | 173.03 | 167.96 | 200.14 | 225.34 | 255.79 | 286.65 | 0 | 0/0 | Aprobado |
| REN-05 | Pico / estrés — GET /equipos en escalones 10→50→100→200→300 conexiones | 200 conexiones, 15 s | p95 < 1000 ms y tasa de error ≤ 1% (Criterio aplicado hasta 200 conexiones; 300 se usa para observar el comportamiento fuera de capacidad.) | 9085 | 605.67 | 326.88 | 311.9 | 383.43 | 415.85 | 456.72 | 499.07 | 0 | 0/0 | Aprobado |
| REN-05 | Pico / estrés — GET /equipos en escalones 10→50→100→200→300 conexiones | 300 conexiones, 15 s | p95 < 1000 ms y tasa de error ≤ 1% (Criterio aplicado hasta 200 conexiones; 300 se usa para observar el comportamiento fuera de capacidad.) | 8345 | 556.34 | 531.73 | 525.16 | 587.01 | 616.4 | 692.1 | 752.67 | 0 | 0/0 | Aprobado |
| REN-06 | Resistencia corta (soak) — mezcla de lecturas, 2 min | 25 conexiones, 120 s; cada conexión rota GET /equipos, GET /proyectos?equipoId, GET /listas/proyecto/:id y GET /tareas?proyectoId. | p95 < 500 ms y tasa de error ≤ 1%; deriva del p95 ≤ 50% | 39952 | 332.94 | 74.69 | 73.45 | 93.85 | 102.46 | 122.4 | 176.23 | 0 | 0/0 | Aprobado |

Latencias en milisegundos. Percentiles calculados con todas las respuestas individuales (autocannon no reporta p95).

## 3. Ficha de cada caso

### REN-01 — Carga base — GET /equipos autenticado

- **Objetivo:** Medir el tiempo de respuesta de la consulta más frecuente (dashboard) con carga normal.
- **Condiciones:** 10 conexiones concurrentes, 30 s, token JWT válido; equipo con 5 miembros y 2 proyectos.
- **Resultado esperado:** p95 < 200 ms y tasa de error ≤ 0%
- **Resultado obtenido:** 15001 peticiones, 500.04 req/s, latencia media 19.53 ms, p50 19.07 ms, p90 25.47 ms, p95 28.27 ms, p99 35.23 ms, máx 239.47 ms; non-2xx 0, errores 0, timeouts 0 (tasa de error 0%). Backend: CPU media 100.94% de un núcleo (máx 108.55%), memoria 102.71→128.97 MB (máx 144.65 MB).
- **Estado:** Aprobado
- **Evidencia:** `raw/carga-base.json`, `salida-autocannon.txt`, `reporte.html`

### REN-02 — Carga media — GET /tareas?proyectoId (50 tareas)

- **Objetivo:** Evaluar la consulta más pesada del tablero Kanban (tareas + lista + asignados) con concurrencia media.
- **Condiciones:** 50 conexiones concurrentes, 30 s; proyecto con 50 tareas sembradas (2 asignados cada una).
- **Resultado esperado:** p95 < 500 ms y tasa de error ≤ 1%
- **Resultado obtenido:** 5497 peticiones, 183.24 req/s, latencia media 271.76 ms, p50 269.7 ms, p90 309.13 ms, p95 323.68 ms, p99 358.5 ms, máx 399.2 ms; non-2xx 0, errores 0, timeouts 0 (tasa de error 0%). Backend: CPU media 113.74% de un núcleo (máx 123%), memoria 125.98→178.19 MB (máx 216.28 MB).
- **Estado:** Aprobado
- **Evidencia:** `raw/carga-media.json`, `salida-autocannon.txt`, `reporte.html`

### REN-03 — Escritura — POST /tareas

- **Objetivo:** Medir la creación concurrente de tareas (validación + comprobación de acceso + INSERT + relectura).
- **Condiciones:** 20 conexiones concurrentes, 20 s; cada petición crea una tarea con título único en el proyecto "Perf escritura".
- **Resultado esperado:** p95 < 800 ms y tasa de error ≤ 1%
- **Resultado obtenido:** 5364 peticiones, 268.2 req/s, latencia media 73.96 ms, p50 72.62 ms, p90 90.61 ms, p95 98.83 ms, p99 117.84 ms, máx 146.9 ms; non-2xx 0, errores 0, timeouts 0 (tasa de error 0%). Backend: CPU media 105.85% de un núcleo (máx 117.78%), memoria 152.65→157.96 MB (máx 231.78 MB).
- **Estado:** Aprobado
- **Evidencia:** `raw/escritura.json`, `salida-autocannon.txt`, `reporte.html`

### REN-04 — Login — POST /auth/login (bcrypt coste 10)

- **Objetivo:** Medir el coste del inicio de sesión, limitado por CPU por bcrypt.
- **Condiciones:** 10 conexiones concurrentes, 20 s, credenciales correctas del mismo usuario (cada éxito reinicia el contador de bloqueo, por lo que no aparecen 429).
- **Resultado esperado:** p95 < 1000 ms y tasa de error ≤ 1%
- **Resultado obtenido:** 1267 peticiones, 63.35 req/s, latencia media 157.88 ms, p50 158.61 ms, p90 184.61 ms, p95 187.18 ms, p99 200.62 ms, máx 212.18 ms; non-2xx 0, errores 0, timeouts 0 (tasa de error 0%). Backend: CPU media 409.33% de un núcleo (máx 415.69%), memoria 111.68→110.95 MB (máx 112.25 MB).
- **Estado:** Aprobado
- **Evidencia:** `raw/login.json`, `salida-autocannon.txt`, `reporte.html`

### REN-05 — Pico / estrés — GET /equipos en escalones 10→50→100→200→300 conexiones

- **Objetivo:** Encontrar el punto de saturación (throughput deja de crecer) y de degradación (p95 o errores fuera de umbral).
- **Condiciones:** Escalones de 15 s con 10, 50, 100, 200 y 300 conexiones concurrentes, sin pausa intermedia relevante.
- **Resultado esperado:** p95 < 1000 ms y tasa de error ≤ 1% (Criterio aplicado hasta 200 conexiones; 300 se usa para observar el comportamiento fuera de capacidad.)
- **Resultado obtenido:** 10 conex.: 489.67 req/s, p95 29.01 ms, p99 37.6 ms, errores 0% | 50 conex.: 499.07 req/s, p95 133.5 ms, p99 156.22 ms, errores 0% | 100 conex.: 573.8 req/s, p95 225.34 ms, p99 255.79 ms, errores 0% | 200 conex.: 605.67 req/s, p95 415.85 ms, p99 456.72 ms, errores 0% | 300 conex.: 556.34 req/s, p95 616.4 ms, p99 692.1 ms, errores 0%. Throughput máximo 605.67 req/s con 200 conexiones; saturación desde 10 conexiones; degradación fuera de umbral: no alcanzada.. Backend: CPU media 106.09% de un núcleo (máx 127.29%), memoria 100.91→195.63 MB (máx 234.84 MB).
- **Estado:** Aprobado
- **Evidencia:** `raw/estres.json`, `salida-autocannon.txt`, `reporte.html`

### REN-06 — Resistencia corta (soak) — mezcla de lecturas, 2 min

- **Objetivo:** Observar deriva de latencia, errores y memoria del backend con carga moderada sostenida.
- **Condiciones:** 25 conexiones, 120 s; cada conexión rota GET /equipos, GET /proyectos?equipoId, GET /listas/proyecto/:id y GET /tareas?proyectoId.
- **Resultado esperado:** p95 < 500 ms y tasa de error ≤ 1%; deriva del p95 ≤ 50%
- **Resultado obtenido:** 39952 peticiones, 332.94 req/s, latencia media 74.69 ms, p50 73.45 ms, p90 93.85 ms, p95 102.46 ms, p99 122.4 ms, máx 176.23 ms; non-2xx 0, errores 0, timeouts 0 (tasa de error 0%); p95 inicial 98.33 ms → final 98.2 ms (deriva -0.13%). Backend: CPU media 102.97% de un núcleo (máx 115.04%), memoria 147.01→124.97 MB (máx 236.17 MB).
- **Estado:** Aprobado
- **Evidencia:** `raw/resistencia.json`, `salida-autocannon.txt`, `reporte.html`

## 4. Uso de recursos durante la carga

| Escenario | CPU backend media (% de 1 núcleo) | CPU backend máx | Memoria backend inicio → fin (MB) | Memoria máx (MB) | CPU PostgreSQL media (% total) |
|---|---:|---:|---:|---:|---:|
| REN-01 carga-base | 100.94 | 108.55 | 102.71 → 128.97 | 144.65 | 0 |
| REN-02 carga-media | 113.74 | 123 | 125.98 → 178.19 | 216.28 | 0 |
| REN-03 escritura | 105.85 | 117.78 | 152.65 → 157.96 | 231.78 | 0 |
| REN-04 login | 409.33 | 415.69 | 111.68 → 110.95 | 112.25 | 0 |
| REN-05 estres | 106.09 | 127.29 | 100.91 → 195.63 | 234.84 | 0 |
| REN-06 resistencia | 102.97 | 115.04 | 147.01 → 124.97 | 236.17 | 0 |

## 5. Interpretación

- **Carga base:** con 10 conexiones GET /equipos sirve 500.04 req/s con p95 de 28.27 ms y 0% de errores — holgadamente dentro del objetivo de 200 ms. El proceso del backend ya trabaja cerca del 100% de un núcleo: el límite es la CPU de Node (serialización JSON, hidratación de entidades de TypeORM, verificación JWT), no PostgreSQL, cuyo consumo de CPU es bajo.
- **Carga media:** con 50 conexiones y 50 tareas por proyecto el throughput es 183.24 req/s (respuestas de ~51 KB) y el p95 323.68 ms. Cumple el umbral de 500 ms. Al quintuplicar la concurrencia la latencia crece casi proporcionalmente porque las peticiones esperan en la cola del único hilo de eventos (ley de Little: latencia ≈ concurrencia / throughput = 50/183.24 ≈ 272.87 ms).
- **Escritura:** 268.2 req/s con p95 98.83 ms y 0% de errores (5364 tareas creadas). Las escrituras son más caras que las lecturas porque cada creación hace varias consultas (comprobación de acceso con relaciones + INSERT + relectura).
- **Login:** 63.35 req/s y p95 187.18 ms. bcrypt con coste 10 es intencionadamente costoso (~decenas de ms por hash en este equipo) y se ejecuta en el pool de libuv (4 hilos), por lo que es el endpoint con menor capacidad; es un compromiso seguridad/rendimiento aceptable y el bloqueo por fuerza bruta reduce el abuso.
- **Estrés:** el throughput máximo fue 605.67 req/s (200 conexiones). El throughput forma una meseta (489.67-605.67 req/s) en todos los escalones y la CPU del backend ya está al ~106.09% de un núcleo desde 10 conexiones: el sistema está saturado por CPU desde el inicio, de modo que más concurrencia solo se traduce en cola y latencia (latencia ≈ conexiones / throughput). Con 300 conexiones el throughput incluso baja (556.34 req/s) por la sobrecarga de gestionar más sockets. En ningún escalón se superó el umbral de p95/errores. Factor p95 respecto al primer escalón: 10→×1, 50→×4.6, 100→×7.77, 200→×14.33, 300→×21.25. No hubo errores ni timeouts: el sistema se degrada de forma ordenada (más latencia) sin rechazar peticiones.
- **Resistencia:** durante 2 minutos a 25 conexiones con mezcla de lecturas se mantuvieron 332.94 req/s, p95 102.46 ms y 0% de errores; deriva del p95 -0.13% entre el inicio y el final. Memoria del backend 147.01 → 124.97 MB.

## 6. Hallazgos y propuestas de mejora

| ID | Severidad | Descripción | Mejora propuesta |
|---|---|---|---|
| H-01 | Media | El backend es un único proceso Node (modo desarrollo) limitado por CPU: el throughput de GET /equipos se estanca en ~605.67 req/s (200 conexiones) con el proceso al ~106.09% de un núcleo de media durante toda la prueba (ya saturado desde el primer escalón de 10 conexiones: el throughput se mueve en una meseta de 489.67-605.67 req/s); a partir de ahí más concurrencia solo añade cola (p95 ×21.25 con 300 conexiones respecto a 10). | Ejecutar el build de producción (node dist/main, sin --watch), usar cluster/PM2 con un proceso por núcleo o varias réplicas tras un balanceador, y establecer límites de concurrencia/rate limiting para proteger la latencia. |
| H-02 | Baja | GET /tareas?proyectoId devuelve todas las tareas con lista y asignados sin paginación (~51 KB por respuesta con 50 tareas) y sin compresión HTTP; el coste crece linealmente con el tamaño del proyecto. Con 50 conexiones: 183.24 req/s y p95 323.68 ms. | Paginación o carga por lista (limit/offset o cursor), seleccionar solo los campos necesarios de los asignados, habilitar compression() (gzip/brotli) y cabeceras ETag/Cache-Control para lecturas repetidas. |
| H-03 | Baja | Cada petición autenticada ejecuta una consulta adicional (JwtStrategy.validate → findById del usuario) y GET /equipos carga líder y miembros de todos los equipos en dos consultas más; esto multiplica las consultas por petición y satura antes el pool de conexiones (10 por defecto en pg). | Cachear el usuario autenticado (p. ej. caché en memoria/Redis de 30-60 s o confiar en los claims del token), ajustar extra.max del pool de TypeORM según la carga y usar consultas con select explícito. |
| H-04 | Informativa | El login está limitado por bcrypt (coste 10): solo 63.35 req/s con p95 187.18 ms frente a 500.04 req/s de una lectura; un pico de inicios de sesión (o un ataque de credenciales) consume el pool de hilos de libuv (4 hilos por defecto) y la CPU. | Mantener coste 10-12 (es una defensa deliberada); limitar /auth/login por IP, ajustar UV_THREADPOOL_SIZE al número de núcleos, y escalar horizontalmente si el volumen de logins lo requiere. No reducir el coste por rendimiento. |
| H-05 | Informativa | La escritura (POST /tareas) alcanza 268.2 req/s con p95 98.83 ms: cada creación hace 4-5 consultas (lista, proyecto+equipo+miembros, INSERT, relectura con relaciones). | Devolver la entidad guardada sin releerla, cargar solo los ids de miembros para la comprobación de acceso y agrupar las consultas en una transacción. |
| H-06 | Informativa | En la prueba de resistencia (2 min) el p95 pasó de 98.33 ms a 98.2 ms (deriva -0.13%) con 0% de errores; la memoria del backend fue de 147.01 a 124.97 MB (-14.99%, máx 236.17 MB). No se observan síntomas de fuga de memoria ni degradación progresiva en esta ventana corta. | Repetir la prueba de resistencia durante 30-60 min en un entorno de staging con el build de producción y monitorización (Prometheus/Grafana o clinic.js) para confirmar la estabilidad. |

Mejoras adicionales: compresión HTTP, caché (Redis) de lecturas frecuentes con invalidación al escribir, índices en claves foráneas, paginación, pool de conexiones dimensionado, build de producción en cluster y escalado horizontal tras un balanceador; incorporar estas pruebas al pipeline (Jenkins) con umbrales para detectar regresiones.

## 7. Evidencias

- `resumen.json` — resumen estructurado generado automáticamente.
- `raw/<escenario>.json` — resultado completo de autocannon, serie temporal por segundo/ventana y muestras de CPU/memoria.
- `salida-autocannon.txt` — salida de consola de la ejecución.
- `reporte.html` — gráficas (percentiles por escenario, curva de estrés, evolución en resistencia).
- `indices-postgresql.txt` — índices existentes (consulta de solo lectura).

