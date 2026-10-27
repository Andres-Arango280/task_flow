# Evidencia de Pruebas y Regresión

Resumen de la entrega:

- Jenkins pipeline: `taskflow-pipeline` Build #10 — PASSED
- SonarQube: Quality Gate PASSED — [Dashboard](http://localhost:9000/dashboard?id=taskflow%3Abackend)
- Pruebas unitarias: 35 passed
- Pruebas e2e: 46 passed

Comandos principales para reproducir:

```bash
# Ejecutar todas las pruebas unitarias
npm run test:unit

# Ejecutar todas las pruebas e2e
npm run test:e2e

# Ejecutar pruebas unitarias de un modulo (ej: auth)
npm run test:unit:auth

# Ejecutar pruebas e2e de un modulo (ej: auth)
npm run test:e2e:auth

# Generar coverage (unit)
npx jest --selectProjects unit --coverage --coverageReporters=lcov

# Ejecutar SonarScanner (requiere Sonar en http://localhost:9000)
npx sonar-scanner

# Levantar stack (Sonar + Jenkins)
docker compose up -d --build
```

Demostración de regresión aplicada:

1. Introduje un cambio temporal en `src/proyectos/proyectos.service.ts` que removía la lista 'Hecho'.
2. Ejecución de `npm run test:regression:unit` mostró 2 tests rotos en `ProyectosService` (esperaban 3 listas). Output relevante:

```
FAIL   unit  src/proyectos/proyectos.service.spec.ts
  Regression - ProyectosService - crearProyecto
    × debe crear un proyecto cuando el usuario es miembro del equipo
    × debe crear las tres listas por defecto cuando se guarda el proyecto
```

3. Revertí el cambio; las pruebas pasan nuevamente.

Notas:

- Las pruebas se dividen por módulos en `jest.config.js` (ej: `unit-auth`, `e2e-auth`, `unit-proyectos`, etc.).
- Scripts nuevos en `package.json` permiten ejecutar módulos independientes: `test:unit:auth`, `test:e2e:auth`, `test:unit:proyectos`, ...

Si quieres, genero un PDF con capturas de la consola de Jenkins y del dashboard Sonar para entregar.