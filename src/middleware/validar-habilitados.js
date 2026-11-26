// Middleware de validación para POST /habilitados (Feature: habilitados).
//
// Valida req.body.aprobados en el orden especificado por el diseño:
//   1. Existencia y tipo arreglo
//   2. Tipo de cada elemento (string)
//   3. Límite de 5000 elementos
//   4. Formato de cada elemento: ^[0-9A-Z]{4,12}$
//
// Si la validación falla → 400 con mensaje descriptivo (sin reflejar el valor).
// Si todo es válido → next().
//
// Requirements: 2.1, 3.1, 3.3, 4.1, 4.2, 4.3

const PATRON_CODIGO = /^[0-9A-Z]{4,12}$/;
const MAX_ELEMENTOS = 5000;

function validarHabilitados(req, res, next) {
  const { aprobados } = req.body ?? {};

  // 1. Debe existir y ser arreglo
  if (!Array.isArray(aprobados)) {
    return res
      .status(400)
      .json({ error: 'aprobados debe ser un arreglo de strings' });
  }

  // 2. Cada elemento debe ser string
  for (const elemento of aprobados) {
    if (typeof elemento !== 'string') {
      return res
        .status(400)
        .json({ error: 'todos los elementos de aprobados deben ser strings' });
    }
  }

  // 3. Límite de 5000 elementos
  if (aprobados.length > MAX_ELEMENTOS) {
    return res
      .status(400)
      .json({ error: 'aprobados no puede contener más de 5000 elementos' });
  }

  // 4. Formato de cada código: ^[0-9A-Z]{4,12}$
  for (let i = 0; i < aprobados.length; i++) {
    if (!PATRON_CODIGO.test(aprobados[i])) {
      // No se refleja el valor del elemento (Req 3.3)
      return res
        .status(400)
        .json({ error: 'formato de código inválido en aprobados', index: i });
    }
  }

  next();
}

module.exports = { validarHabilitados };
