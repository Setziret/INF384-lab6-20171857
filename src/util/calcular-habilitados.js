// Función pura de cálculo de cursos habilitados (Feature: habilitados).
//
// Dado el catálogo de cursos y la lista de códigos aprobados (posiblemente
// con duplicados), devuelve los cursos no aprobados cuyos requisitos están
// todos contenidos en la lista de aprobados, conservando el orden del
// catálogo (Decisión D2 del design).

function calcularHabilitados(cursos, aprobados) {
  // Set deduplica (D1) y da pertenencia en O(1) (Req 2.3).
  const aprobadosSet = new Set(aprobados);
  return cursos.filter(
    (curso) =>
      !aprobadosSet.has(curso.id) &&
      curso.prerequisites.every((requisito) => aprobadosSet.has(requisito))
  );
}

module.exports = { calcularHabilitados };
