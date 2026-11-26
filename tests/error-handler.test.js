const express = require('express');
const request = require('supertest');
const errorHandler = require('../src/middleware/error-handler');

function buildAppWithError(thrownError) {
  const app = express();

  app.get('/ruta-con-error', (_req, _res, next) => {
    next(thrownError);
  });

  app.use(errorHandler);

  return app;
}

describe('Middleware de manejo de errores', () => {
  test('responde 500 con mensaje genérico ante cualquier error no controlado', async () => {
    const app = buildAppWithError(new Error('fallo inesperado'));
    const res = await request(app).get('/ruta-con-error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error interno del servidor' });
  });

  test('responde 500 incluso cuando el error no tiene mensaje', async () => {
    const app = buildAppWithError(new Error());
    const res = await request(app).get('/ruta-con-error');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error interno del servidor');
  });
});
