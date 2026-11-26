// Pruebas de integración para POST /habilitados (Feature: habilitados).
// Requirements: 1.1, 1.2, 3.2

const request = require('supertest');
const app = require('../src/app');

describe('POST /habilitados', () => {
  // -------------------------------------------------------------------------
  // Caso funcional del enunciado
  // -------------------------------------------------------------------------
  it('200 con cursos habilitados para ["1INF25","1INF27","1INF49"]', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF25', '1INF27', '1INF49'] });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const ids = res.body.map((c) => c.id);

    // 1INF30 (prereq: ["1INF25"]) debe habilitarse
    expect(ids).toContain('1INF30');

    // Los aprobados no deben aparecer en el resultado
    expect(ids).not.toContain('1INF25');
    expect(ids).not.toContain('1INF27');
    expect(ids).not.toContain('1INF49');

    // Otros cursos que deben habilitarse con exactamente esos aprobados
    expect(ids).toContain('1INF29'); // prereq: ["1INF25"]
    expect(ids).toContain('1INF31'); // prereq: ["1INF49"]
    expect(ids).toContain('1INF32'); // prereq: ["1INF27","1INF25"]
  });

  // -------------------------------------------------------------------------
  // Lista vacía → todos los cursos sin requisitos
  // -------------------------------------------------------------------------
  it('200 con cursos sin requisitos cuando aprobados = []', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [] });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // Debe haber al menos un curso (el catálogo tiene varios sin requisitos)
    expect(res.body.length).toBeGreaterThan(0);

    // Ningún resultado debe tener prerequisites no vacíos
    for (const curso of res.body) {
      expect(curso.prerequisites).toHaveLength(0);
    }
  });

  // -------------------------------------------------------------------------
  // Error interno → 500 genérico sin stack trace ni rutas
  // -------------------------------------------------------------------------
  it('500 genérico sin stack trace cuando el repositorio lanza', async () => {
    // Reemplazamos listar() temporalmente para que lance
    const repositorio = require('../src/data/repositorio');
    const original = repositorio.listar;
    repositorio.listar = () => {
      throw new Error('fallo simulado de BD');
    };

    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF25'] });

    // Restauramos antes de cualquier assertion para no contaminar otros tests
    repositorio.listar = original;

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Error interno del servidor');

    // No debe filtrar stack traces ni rutas del sistema
    const bodyText = JSON.stringify(res.body);
    expect(bodyText).not.toMatch(/stack/i);
    expect(bodyText).not.toMatch(/src\//);
    expect(bodyText).not.toMatch(/node_modules/);
  });

  // -------------------------------------------------------------------------
  // Tipos inválidos → 400
  // -------------------------------------------------------------------------
  it('400 cuando aprobados es string (no arreglo)', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: '1INF25' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 cuando aprobados tiene 5001 elementos', async () => {
    const lista = Array.from({ length: 5001 }, (_, i) => {
      // Generar códigos válidos de 4 chars para no activar el validador de formato
      const n = String(i).padStart(4, '0');
      return `A${n.slice(0, 3)}`;
    });

    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: lista });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
