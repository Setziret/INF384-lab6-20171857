# Implementation Plan: Cursos Habilitados

## Overview

Implementación del endpoint `POST /habilitados` con middleware de validación, función pura de cálculo, pruebas unitarias y de propiedad, y gates de seguridad en CI. El manejo de errores ya existe (`src/middleware/error-handler.js`) y no se modifica. Lenguaje: JavaScript (Node 22, Express, Jest, fast-check).

## Tasks

- [x] 1. Función pura de cálculo de habilitados
  - [x] 1.1 Crear `src/util/calcular-habilitados.js`
    - Implementar `calcularHabilitados(cursos, aprobados)`: `Set` de aprobados, filtrado por subconjunto de requisitos y exclusión de aprobados, conservando el orden del catálogo (Decisión D2).
    - No validar tipos aquí (el middleware ya lo hizo); la función asume entrada válida.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x]* 1.2 Pruebas de propiedad de `calcularHabilitados`
    - **Property 1: Corrección del cálculo (modelo de referencia)**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Generar catálogos y subconjuntos aleatorios con fast-check (100 runs), comparar con implementación de referencia.
  - [x]* 1.3 Pruebas de propiedad de orden e idempotencia
    - **Property 2: Orden determinista de la respuesta**
    - **Validates: Requirements 1.4**
    - **Property 3: Idempotencia ante repetidos**
    - **Validates: Requirements 1.5**
    - Verificar subsecuencia de índices crecientes y equivalencia con la lista deduplicada.

- [x] 2. Middleware de validación
  - [x] 2.1 Crear `src/middleware/validar-habilitados.js`
    - Validar en orden: existencia y tipo arreglo, tipo de elementos, límite de 5000, patrón `^[0-9A-Z]{4,12}$`.
    - Respuestas 400 con mensajes descriptivos que no reflejen el valor recibido.
    - _Requirements: 2.1, 3.1, 3.3, 4.1, 4.2, 4.3_
  - [x]* 2.2 Pruebas de propiedad del validador
    - **Property 4: Rechazo de formatos de código inválidos**
    - **Validates: Requirements 3.1, 3.3**
    - Generar strings maliciosas (con `<script>`, `/`, null bytes, unicode) y verificar 400 sin eco del valor.
  - [x]* 2.3 Pruebas de ejemplo del validador
    - `{"aprobados": "1INF25"}` (string), número, objeto, null, booleano → 400.
    - JSON malformado, campo ausente → 400.
    - Lista de 5001 elementos → 400; lista de 5000 válidos responde en < 2 s.
    - _Requirements: 2.1, 2.2, 4.1, 4.2, 4.3_

- [ ] 3. Endpoint y cableado
  - [~] 3.1 Crear `src/routes/habilitados.js` y montarlo en `src/app.js`
    - `router.post('/', validarHabilitados, handler)` que llame a `calcularHabilitados(repositorio.listar(), req.body.aprobados)` y responda 200 con el arreglo.
    - Registrar `app.use('/habilitados', require('./routes/habilitados'))` antes del `errorHandler`.
    - No modificar `src/middleware/error-handler.js` (ya existe y cumple 3.2).
    - _Requirements: 1.1, 2.1, 3.1, 4.1_
  - [ ]* 3.2 Pruebas de integración del endpoint con supertest
    - Caso funcional del enunciado: `{"aprobados": ["1INF25","1INF27","1INF49"]}` → 200 con habilitados correctos.
    - Lista vacía → 200 con todos los cursos sin requisitos (más los que no requieren aprobados).
    - Mock del repositorio que lanza → 500 genérico sin stack trace ni rutas (verifica `error-handler` existente).
    - _Requirements: 1.1, 1.2, 3.2_

- [~] 4. Checkpoint - Verificar funcionalidad y cobertura
  - Ensure all tests pass, ask the user if questions arise.
  - Ejecutar `npx jest --run --coverage` y confirmar cobertura de líneas ≥ 80% en los archivos nuevos (`validar-habilitados.js`, `calcular-habilitados.js`, `habilitados.js`).
  - _Requirements: 5.1_

- [ ] 5. Gates de seguridad y CI
  - [~] 5.1 Ampliar `.github/workflows/ci.yml` con gates de seguridad
    - Agregar paso `npm audit --audit-level=high` (bloquea en vulnerabilidades high/critical) en pull request y main.
    - Agregar paso `gitleaks detect` con umbral cero hallazgos (usar la acción `gitleaks/gitleaks-action@v2` o `gitleaks/gitleaks` en contenedor) en pull request y main.
    - _Requirements: gates SCA y secretos (sección Security Gates de design.md)_
  - [~] 5.2 Ampliar CI con job de pruebas y cobertura
    - Ejecutar `npm ci`, luego `npx jest --run --coverage` con `coverageThreshold` de 80% de líneas sobre los archivos de `src/` (el criterio del laboratorio 5.1 exige cobertura de la nueva ruta no menor a 80%).
    - Configurar el umbral en `jest.config.js` (`coverageThreshold: { global: { lines: 80 } }` o `include` de los archivos nuevos) para que el job falle si no se alcanza.
    - _Requirements: 5.1_

- [~] 6. Checkpoint final - Verificar gates y pruebas
  - Ensure all tests pass, ask the user if questions arise.
  - Confirmar que el CI ejecuta los dos gates (npm audit y gitleaks) y el job de pruebas con cobertura en cada PR.
  - _Requirements: 5.1, gates de seguridad_

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas) y pueden omitirse para un MVP más rápido, aunque se recomienda implementarlas para cumplir el criterio de cobertura del 5.1.
- Cada test de propiedad se anota con `// Feature: habilitados, Property N: <texto>` y configura 100 iteraciones con fast-check.
- `src/middleware/error-handler.js` ya existe en el repo y no se crea ni modifica.
- Los tests existentes (`tests/*.test.js`) no deben romperse: la ruta nueva es aditiva.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["3.1"] },
    { "id": 5, "tasks": ["3.2"] },
    { "id": 6, "tasks": ["4"] },
    { "id": 7, "tasks": ["5.1", "5.2"] },
    { "id": 8, "tasks": ["6"] }
  ]
}
```
