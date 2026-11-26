# Requirements Document

## Introduction

La Malla INF necesita un endpoint `POST /habilitados` que, dado un arreglo de códigos de cursos aprobados, devuelva los cursos no aprobados cuyos requisitos están todos incluidos en la lista de aprobados. Un curso sin requisitos está siempre habilitado, siempre que no figure en aprobados. El endpoint debe resistir entradas maliciosas (DoS por listas grandes, inyección de caracteres, tipos incorrectos) sin degradar el servicio ni filtrar información interna.

## Glossary

- **Sistema**: El servicio Express de la Malla INF (código en `src/`).
- **Aprobados**: Arreglo de códigos de cursos (strings) enviados en el cuerpo de la petición `POST /habilitados` bajo el campo `aprobados`.
- **Curso habilitado**: Curso que no está en Aprobados y cuyos requisitos están todos contenidos en Aprobados.
- **Requisitos**: Códigos listados en el campo `prerequisites` de un curso en `data/cursos.json`.
- **Validador**: Middleware de Express encargado de validar el cuerpo de `POST /habilitados` antes de que llegue a la ruta.
- **Calculadora_Habilitados**: Función pura que, dado el catálogo de cursos y el conjunto Aprobados, calcula los Cursos habilitados.
- **Patrón de código**: Expresión regular que acepta códigos de curso alfanuméricos en mayúsculas: `^[0-9A-Z]{4,12}$`.

## Requirements

### Requirement 1: Endpoint de cursos habilitados

**User Story:** As a estudiante, I want enviar mis cursos aprobados y recibir los cursos que puedo llevar, so that puedo planificar mi matrícula.

#### Acceptance Criteria

1. WHEN se recibe una petición `POST /habilitados` con un cuerpo válido `{"aprobados": [...]}`, THEN THE Sistema SHALL responder 200 con el arreglo de Cursos habilitados.
2. WHEN un curso no está en Aprobados y no tiene requisitos, THEN THE Sistema SHALL incluir ese curso en la respuesta.
3. WHEN un curso está en Aprobados, THEN THE Sistema SHALL excluir ese curso de la respuesta aunque cumpla los requisitos de otros cursos.
4. THE Sistema SHALL devolver los Cursos habilitados en el mismo orden en que aparecen en `data/cursos.json`.
5. WHEN la lista Aprobados contiene códigos repetidos, THEN THE Sistema SHALL deduplicarlos y devolver una respuesta idéntica a la obtenida con la lista sin repetidos.

### Requirement 2: Protección contra denegación de servicio por lista grande

**User Story:** As a operador del servicio, I want que una lista anormalmente grande de aprobados no bloquee el servicio, so que la disponibilidad se mantiene.

#### Acceptance Criteria

1. WHEN la lista Aprobados contiene más de 5000 elementos, THEN THE Sistema SHALL responder 400 con un mensaje de error descriptivo, sin procesar la lista.
2. WHEN la lista Aprobados contiene exactamente 5000 elementos válidos, THEN THE Sistema SHALL responder en menos de 2 segundos.
3. WHILE el Validador y la Calculadora_Habilitados procesan cualquier lista de hasta 5000 elementos, THE Sistema SHALL usar una estructura de conjuntos (Set) para las verificaciones de pertenencia, evitando búsquedas lineales por elemento.

### Requirement 3: Prevención de fuga de información

**User Story:** As a responsable de seguridad, I want que los valores maliciosos no expongan detalles internos, so que no se filtra información del servidor.

#### Acceptance Criteria

1. WHEN un elemento de Aprobados contiene caracteres fuera del Patrón de código (por ejemplo `"1INF30<script>"`), THEN THE Sistema SHALL responder 400 con un error de validación, sin procesar el valor.
2. IF un error no controlado ocurre durante el procesamiento de la petición, THEN THE Sistema SHALL responder 500 con un mensaje genérico sin incluir stack trace, rutas del sistema de archivos ni detalles internos.
3. WHILE la Validación rechaza un elemento por formato, THE Sistema SHALL indicar en la respuesta qué elemento es inválido, sin reflejar el contenido completo del valor ingresado.

### Requirement 4: Rechazo de tipos incorrectos

**User Story:** As a consumidor de la API, I want recibir un error claro cuando el cuerpo no tiene el formato esperado, so que puedo corregir mi petición.

#### Acceptance Criteria

1. WHEN el campo `aprobados` no es un arreglo (por ejemplo el string `"1INF25"`), THEN THE Sistema SHALL responder 400 con un error que indique que `aprobados` debe ser un arreglo de strings.
2. WHEN el cuerpo no es JSON válido o el campo `aprobados` falta, THEN THE Sistema SHALL responder 400 con un error descriptivo.
3. WHEN algún elemento de Aprobados no es un string, THEN THE Sistema SHALL responder 400 con un error descriptivo.

### Requirement 5: Calidad y cobertura

**User Story:** As a desarrollador del laboratorio, I want que el código nuevo esté cubierto por pruebas, so que los cambios futuros no rompan la funcionalidad en silencio.

#### Acceptance Criteria

1. THE Sistema SHALL mantener una cobertura de líneas no menor a 80% para el código nuevo de la ruta `POST /habilitados` (middleware de validación y calculadora), medida con la herramienta de cobertura de Jest.
