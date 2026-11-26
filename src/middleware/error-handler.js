// Middleware de manejo de errores no controlados.
// Debe montarse al final, después de todas las rutas.
// Devuelve una respuesta JSON genérica: nunca expone detalles del error.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = errorHandler;
