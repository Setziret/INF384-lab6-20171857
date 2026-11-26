// Tests del middleware validarHabilitados (Feature: habilitados).
// Pruebas de ejemplo (subtarea 2.3) y de propiedad con fast-check (subtarea 2.2).
//
// Requirements: 2.1, 2.2, 3.1, 3.3, 4.1, 4.2, 4.3

const express = require('express');
const request = require('supertest');
const fc = require('fast-check');
const { validarHabilitados } = require('../src/middleware/validar-habilitados');

// ---------- Helpers: mock de req/res/next (sin levantar Express) ----------

function crearMockRes() {
  const res = {
    statusCode: null,
    cuerpo: null,
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
  return res;
}

function correrMiddleware(body) {
  return new Promise((resolve) => {
    const req = { body };
    const res = crearMockRes();
    let resuelto = false;

    const next = () => {
      resuelto = true;
      resolve({ nextLlamado: true, res });
    };

    validarHabilitados(req, res, next);

    // Si next no fue llamado sincrónicamente la respuesta ya fue enviada.
    if (!resuelto) {
      resolve({ nextLlamado: false, res });
    }
  });
}

// ---------- 2.3: Pruebas de ejemplo ----------

describe('validarHabilitados — pruebas de ejemplo', () => {
  describe('aprobados no es arreglo (Req 2.1, 4.1, 4.2)', () => {
    const casosInvalidos = [
      ['string', '1INF25'],
      ['número', 42],
      ['objeto', { 0: '1INF25' }],
      ['null', null],
      ['booleano', true],
    ];

    test.each(casosInvalidos)('rechaza %s con 400', async (_, valor) => {
      const { nextLlamado, res } = await correrMiddleware({ aprobados: valor });
      expect(nextLlamado).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.cuerpo).toEqual({
        error: 'aprobados debe ser un arreglo de strings',
      });
    });

    test('campo aprobados ausente → 400', async () => {
      const { nextLlamado, res } = await correrMiddleware({});
      expect(nextLlamado).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.cuerpo).toEqual({
        error: 'aprobados debe ser un arreglo de strings',
      });
    });

    test('JSON malformado → 400 (via express.json + middleware)', async () => {
      // El body parser de Express rechaza JSON malformado con 400 antes
      // de llegar al middleware; se verifica el comportamiento de extremo a extremo.
      const app = express();
      app.use(express.json());
      app.post('/habilitados', validarHabilitados, (req, res) =>
        res.json({ ok: true })
      );

      const response = await request(app)
        .post('/habilitados')
        .set('Content-Type', 'application/json')
        .send('{"aprobados": ["1INF25",'); // malformado

      expect(response.status).toBe(400);
    });
  });

  describe('elementos que no son strings (Req 4.3)', () => {
    test.each([
      ['número', [123]],
      ['null', [null]],
      ['booleano', [true]],
      ['objeto', [{ id: '1INF25' }]],
      ['arreglo anidado', [['1INF25']]],
    ])('rechaza elemento de tipo %s con 400', async (_, aprobados) => {
      const { nextLlamado, res } = await correrMiddleware({ aprobados });
      expect(nextLlamado).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.cuerpo).toEqual({
        error: 'todos los elementos de aprobados deben ser strings',
      });
    });
  });

  describe('límite de 5000 elementos (Req 2.1)', () => {
    test('lista de 5001 elementos → 400', async () => {
      const aprobados = Array(5001).fill('1INF25');
      const { nextLlamado, res } = await correrMiddleware({ aprobados });
      expect(nextLlamado).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.cuerpo).toEqual({
        error: 'aprobados no puede contener más de 5000 elementos',
      });
    });

    test('lista de 5000 válidos → llama a next() en < 2 s', async () => {
      // Genera 5000 códigos únicos válidos (A000–A999, B000–B999, … × 5)
      const aprobados = Array.from(
        { length: 5000 },
        (_, i) => `${String.fromCharCode(65 + Math.floor(i / 1000))}${String(i % 1000).padStart(3, '0')}A`
      );
      const inicio = Date.now();
      const { nextLlamado, res } = await correrMiddleware({ aprobados });
      const duracion = Date.now() - inicio;
      expect(nextLlamado).toBe(true);
      expect(res.statusCode).toBeNull();
      expect(duracion).toBeLessThan(2000);
    });
  });

  describe('formato de código inválido (Req 3.1, 3.3)', () => {
    test('"1INF30<script>" → 400 sin reflejar el valor', async () => {
      const { nextLlamado, res } = await correrMiddleware({
        aprobados: ['1INF25', '1INF30<script>'],
      });
      expect(nextLlamado).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.cuerpo).toEqual({
        error: 'formato de código inválido en aprobados',
        index: 1,
      });
      expect(JSON.stringify(res.cuerpo)).not.toContain('<script>');
      expect(JSON.stringify(res.cuerpo)).not.toContain('1INF30<script>');
    });

    test('reporta el índice del primer elemento inválido', async () => {
      const { res } = await correrMiddleware({
        aprobados: ['ABCD', 'EFGH', 'bad', 'IJKL'],
      });
      expect(res.statusCode).toBe(400);
      expect(res.cuerpo).toEqual({
        error: 'formato de código inválido en aprobados',
        index: 2,
      });
    });
  });

  describe('entradas válidas → next()', () => {
    test('lista vacía', async () => {
      const { nextLlamado } = await correrMiddleware({ aprobados: [] });
      expect(nextLlamado).toBe(true);
    });

    test('lista de códigos válidos', async () => {
      const { nextLlamado } = await correrMiddleware({
        aprobados: ['1INF25', '1INF27', '1INF49'],
      });
      expect(nextLlamado).toBe(true);
    });

    test('duplicados válidos → next() (deduplica la calculadora, D1)', async () => {
      const { nextLlamado } = await correrMiddleware({
        aprobados: ['1INF25', '1INF25'],
      });
      expect(nextLlamado).toBe(true);
    });
  });
});

// ---------- 2.2: Pruebas de propiedad (fast-check) ----------

// Feature: habilitados, Property 4: Rechazo de formatos de código inválidos
// Validates: Requirements 3.1, 3.3
describe('validarHabilitados — Property 4: Rechazo de formatos inválidos', () => {
  // Genera strings que seguro NO cumplen el patrón ^[0-9A-Z]{4,12}$:
  // contienen caracteres fuera de [0-9A-Z], o longitud fuera de [4,12].
  const invalidStringArbitrary = fc.oneof(
    // Caracteres maliciosos / unicode / null bytes (embebidos)
    fc
      .constantFrom(
        '<script>alert(1)</script>',
        '../../../etc/passwd',
        '1INF30\x00',
        'ünïcödé',
        '1INF30<script>',
        "'; DROP TABLE cursos; --"
      )
      .map((s) => 'AB' + s + '12'),
    // Demasiado corto (< 4 caracteres)
    fc.constantFrom('ab', 'ABC', 'a', 'z1'),
    // Demasiado largo (> 12 caracteres)
    fc.constantFrom('ABCD123456789', 'AB12AB12AB12AB12', '0123456789ABCD'),
    // Minúsculas / espacios / slash / punto
    fc.constantFrom('a b c', 'abcd', 'AB/12', 'AB 12', 'AB.12')
  );

  test(
    'rechaza con 400 y sin reflejar el valor (100 runs)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(invalidStringArbitrary, { minLength: 1 }),
          async (invalidos) => {
            const { nextLlamado, res } = await correrMiddleware({
              aprobados: invalidos,
            });
            expect(nextLlamado).toBe(false);
            expect(res.statusCode).toBe(400);

            // La respuesta es exactamente una de las formas de error conocidas
            // (estructuralmente incapaces de reflejar el input).
            const erroresConocidos = new Set([
              'aprobados debe ser un arreglo de strings',
              'todos los elementos de aprobados deben ser strings',
              'aprobados no puede contener más de 5000 elementos',
              'formato de código inválido en aprobados',
            ]);
            expect(erroresConocidos.has(res.cuerpo.error)).toBe(true);
            expect(Object.keys(res.cuerpo).every((k) => k === 'error' || k === 'index')).toBe(true);

            if (res.cuerpo.error === 'formato de código inválido en aprobados') {
              expect(Number.isInteger(res.cuerpo.index)).toBe(true);
              expect(res.cuerpo.index).toBeGreaterThanOrEqual(0);
              expect(res.cuerpo.index).toBeLessThan(invalidos.length);
              // No-reflexión: strings con contenido sustantivo no deben
              // aparecer en la respuesta (los muy cortos aparecen por azar
              // en el propio mensaje de error, p.ej. "a" en "aprobados").
              const respuesta = JSON.stringify(res.cuerpo);
              for (const valor of invalidos) {
                if (valor.length >= 8) {
                  expect(respuesta).not.toContain(valor);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    },
    30000
  );
});
