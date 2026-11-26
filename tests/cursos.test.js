const request = require('supertest');
const app = require('../src/app');

describe('GET /cursos', () => {
  // Criterio 1.1: sin filtro devuelve todos los cursos con los campos requeridos
  describe('1.1 - sin parámetros', () => {
    test('responde 200 con un arreglo de 87 cursos', async () => {
      const res = await request(app).get('/cursos');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(87);
    });

    test('cada curso contiene id, name, credits, cycle y type', async () => {
      const res = await request(app).get('/cursos');

      for (const curso of res.body) {
        expect(typeof curso.id).toBe('string');
        expect(typeof curso.name).toBe('string');
        expect(typeof curso.credits).toBe('number');
        // cycle puede ser un número entero o null (cursos electivos sin ciclo fijo)
        expect(curso.cycle === null || typeof curso.cycle === 'number').toBe(true);
        expect(curso.type).toMatch(/^(obligatorio|electivo)$/);
      }
    });
  });

  // Criterio 1.2: ?ciclo=N con N válido (5-10) devuelve solo los cursos de ese ciclo
  describe('1.2 - filtro por ciclo válido', () => {
    test('?ciclo=10 devuelve 3 cursos del ciclo 10', async () => {
      const res = await request(app).get('/cursos?ciclo=10');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body.every((c) => c.cycle === 10)).toBe(true);
    });

    test('?ciclo=5 devuelve solo cursos del ciclo 5', async () => {
      const res = await request(app).get('/cursos?ciclo=5');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((c) => c.cycle === 5)).toBe(true);
    });
  });

  // Criterio 1.3: ?ciclo inválido → 400 con mensaje de error
  describe('1.3 - ciclo inválido → 400', () => {
    test('?ciclo=4 (fuera de rango) responde 400', async () => {
      const res = await request(app).get('/cursos?ciclo=4');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
    });

    test('?ciclo=11 (fuera de rango) responde 400', async () => {
      const res = await request(app).get('/cursos?ciclo=11');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
    });

    test('?ciclo=abc (no numérico) responde 400', async () => {
      const res = await request(app).get('/cursos?ciclo=abc');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
    });

    test('?ciclo=6.5 (no entero) responde 400', async () => {
      const res = await request(app).get('/cursos?ciclo=6.5');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
    });
  });
});

describe('GET /cursos/:codigo', () => {
  // Criterio 2.1: código existente devuelve el curso con requisitos (id y nombre)
  describe('2.1 - código existente', () => {
    test('responde 200 con 1INF30 y sus requisitos resueltos', async () => {
      const res = await request(app).get('/cursos/1INF30');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: '1INF30',
        name: 'Programación 3',
        credits: 5.0,
        cycle: 6,
        type: 'obligatorio',
        prerequisites: [{ id: '1INF25', name: 'Programación 2' }],
      });
    });

    test('cada requisito incluye código y nombre del curso requisito', async () => {
      // Buscar un curso con más de un requisito
      const listado = await request(app).get('/cursos');
      const conRequisitos = listado.body.filter(
        (c) => Array.isArray(c.prerequisites) && c.prerequisites.length > 1,
      );
      const objetivo = conRequisitos[0] || listado.body.find((c) => c.prerequisites && c.prerequisites.length === 1);

      const res = await request(app).get(`/cursos/${encodeURIComponent(objetivo.id)}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.prerequisites)).toBe(true);
      for (const req of res.body.prerequisites) {
        expect(typeof req.id).toBe('string');
        expect(typeof req.name).toBe('string');
      }
    });

    test('un curso sin requisitos devuelve prerequisites: []', async () => {
      const res = await request(app).get('/cursos/1GES92');

      expect(res.status).toBe(200);
      expect(res.body.prerequisites).toEqual([]);
    });
  });

  // Criterio 2.2: código inexistente → 404
  describe('2.2 - código inexistente → 404', () => {
    test('responde 404 con mensaje de error para un código que no existe', async () => {
      const res = await request(app).get('/cursos/XXX999');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'curso no encontrado' });
    });

    test('responde 404 para un código con formato válido pero desconocido', async () => {
      const res = await request(app).get('/cursos/1INF99');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'curso no encontrado' });
    });
  });
});
