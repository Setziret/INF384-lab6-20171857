'use strict';

const fc = require('fast-check');
const { calcularHabilitados } = require('../src/util/calcular-habilitados');
const repositorio = require('../src/data/repositorio');

// ---------------------------------------------------------------------------
// Catálogo sintético utilizado en los tests de ejemplo
// ---------------------------------------------------------------------------
// A, B, C, D, E:
//   A - sin requisitos
//   B - sin requisitos
//   C - requiere [A]
//   D - requiere [A, B]
//   E - requiere [C]  (C aún no está aprobado en la mayoría de los casos)
const CATALOGO = [
  { id: 'A', prerequisites: [] },
  { id: 'B', prerequisites: [] },
  { id: 'C', prerequisites: ['A'] },
  { id: 'D', prerequisites: ['A', 'B'] },
  { id: 'E', prerequisites: ['C'] },
];

// ---------------------------------------------------------------------------
// 1.1 — Tests de ejemplo (criterios 1.1–1.5)
// ---------------------------------------------------------------------------

describe('calcularHabilitados - ejemplos unitarios', () => {
  // Req 1.2: curso sin requisitos siempre habilitado si no está aprobado
  test('cursos sin requisitos quedan habilitados cuando aprobados está vacío', () => {
    const resultado = calcularHabilitados(CATALOGO, []);
    const ids = resultado.map((c) => c.id);
    expect(ids).toContain('A');
    expect(ids).toContain('B');
  });

  // Req 1.1: respuesta con todos los habilitados
  test('devuelve exactamente los habilitados para un conjunto de aprobados', () => {
    // Aprobados: [A] → habilitados: B (sin req), C (req A ✓), D necesita A y B (B no aprobado → no)
    const resultado = calcularHabilitados(CATALOGO, ['A']);
    const ids = resultado.map((c) => c.id);
    expect(ids).toContain('B');
    expect(ids).toContain('C');
    expect(ids).not.toContain('A'); // ya aprobado
    expect(ids).not.toContain('D'); // falta B
    expect(ids).not.toContain('E'); // falta C
  });

  // Req 1.3: cursos aprobados no aparecen en la respuesta
  test('excluye cursos aprobados de la respuesta', () => {
    const resultado = calcularHabilitados(CATALOGO, ['A', 'B']);
    const ids = resultado.map((c) => c.id);
    expect(ids).not.toContain('A');
    expect(ids).not.toContain('B');
    expect(ids).toContain('C');
    expect(ids).toContain('D');
  });

  // Req 1.4: orden del catálogo
  test('conserva el orden del catálogo', () => {
    const resultado = calcularHabilitados(CATALOGO, ['A']);
    const ids = resultado.map((c) => c.id);
    // B aparece antes que C en el catálogo
    expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('C'));
  });

  // Req 1.5: duplicados en aprobados
  test('trata duplicados en aprobados igual que sin duplicados', () => {
    const sinDup = calcularHabilitados(CATALOGO, ['A', 'B']);
    const conDup = calcularHabilitados(CATALOGO, ['A', 'A', 'B', 'B', 'B']);
    expect(conDup.map((c) => c.id)).toEqual(sinDup.map((c) => c.id));
  });

  // Límite: todos aprobados → ninguno habilitado
  test('sin habilitados cuando todos los cursos están aprobados', () => {
    const todos = CATALOGO.map((c) => c.id);
    expect(calcularHabilitados(CATALOGO, todos)).toHaveLength(0);
  });

  // Usando datos reales del repositorio
  test('cursos sin prerequisitos son siempre habilitados con lista vacía (datos reales)', () => {
    const cursos = repositorio.listar();
    const resultado = calcularHabilitados(cursos, []);
    const sinRequisitos = cursos.filter((c) => c.prerequisites.length === 0);
    // Todos los que no tienen requisitos deben aparecer en el resultado
    for (const c of sinRequisitos) {
      expect(resultado.find((r) => r.id === c.id)).toBeTruthy();
    }
  });

  test('con lista de aprobados real, ningún aprobado aparece en habilitados (datos reales)', () => {
    const cursos = repositorio.listar();
    const aprobados = ['1INF25', '1INF27', '1INF49'];
    const resultado = calcularHabilitados(cursos, aprobados);
    const idsResultado = resultado.map((c) => c.id);
    for (const cod of aprobados) {
      expect(idsResultado).not.toContain(cod);
    }
  });
});

// ---------------------------------------------------------------------------
// 1.2 — Property 1: Corrección del cálculo (modelo de referencia)
// Feature: habilitados, Property 1: calcularHabilitados equivale al modelo de referencia
// ---------------------------------------------------------------------------
describe('calcularHabilitados - Property 1: corrección respecto al modelo de referencia', () => {
  // Generadores
  //   - codigos: pool de IDs con el patrón del catálogo real
  //   - catalogoArb: array de cursos con prerequisites tomados del mismo pool
  //   - aprobadosArb: subconjunto del pool (con posibles duplicados)
  const idArb = fc.integer({ min: 0, max: 9999 }).map((n) => `C${String(n).padStart(4, '0')}`);

  const catalogoArb = fc
    .array(idArb, { minLength: 0, maxLength: 20 })
    .chain((ids) => {
      // Deduplicar ids para que no haya cursos duplicados en el catálogo
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length === 0) return fc.constant([]);
      const prereqArbs = uniqueIds.map((id) =>
        // Cada curso puede tener como prerequisites un subconjunto de los otros ids
        fc
          .array(fc.constantFrom(...uniqueIds), { minLength: 0, maxLength: 3 })
          .map((reqs) => ({ id, prerequisites: reqs.filter((r) => r !== id) }))
      );
      return fc.tuple(...prereqArbs);
    });

  const aprobadosArb = (ids) =>
    fc.array(fc.constantFrom(...ids.concat(['ZZZZ'])), { minLength: 0, maxLength: 15 });

  // Property 1: Validates: Requirements 1.1, 1.2, 1.3
  test('resultado idéntico al modelo de referencia para catálogos y aprobados arbitrarios', () => {
    // Feature: habilitados, Property 1: corrección del cálculo (modelo de referencia)
    fc.assert(
      fc.property(catalogoArb, (cursos) => {
        if (cursos.length === 0) return true;
        const ids = cursos.map((c) => c.id);
        return fc.check(
          fc.property(
            fc.array(fc.constantFrom(...ids, 'ZZZZ'), { minLength: 0, maxLength: ids.length + 5 }),
            (aprobados) => {
              const aprobadosSet = new Set(aprobados);
              const esperado = cursos.filter(
                (c) =>
                  !aprobadosSet.has(c.id) &&
                  c.prerequisites.every((r) => aprobadosSet.has(r))
              );
              const resultado = calcularHabilitados(cursos, aprobados);
              return JSON.stringify(resultado) === JSON.stringify(esperado);
            }
          ),
          { numRuns: 100 }
        ).failed === false;
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// 1.3 — Property 2: Orden determinista; Property 3: Idempotencia ante repetidos
// Feature: habilitados, Property 2: orden determinista
// Feature: habilitados, Property 3: idempotencia ante repetidos
// ---------------------------------------------------------------------------
describe('calcularHabilitados - Property 2: orden determinista', () => {
  // Validates: Requirements 1.4

  const cursoArb = fc.record({
    id: fc.integer({ min: 0, max: 9999 }).map((n) => `C${String(n).padStart(4, '0')}`),
    prerequisites: fc.constant([]),
  });
  const catalogoUnicoArb = fc
    .array(cursoArb, { minLength: 1, maxLength: 20 })
    .map((cursos) => {
      const vistos = new Set();
      return cursos.filter((c) => {
        if (vistos.has(c.id)) return false;
        vistos.add(c.id);
        return true;
      });
    });

  test('los índices de los habilitados en el catálogo son estrictamente crecientes', () => {
    // Feature: habilitados, Property 2: orden determinista de la respuesta
    fc.assert(
      fc.property(
        catalogoUnicoArb,
        fc.array(fc.integer({ min: 0, max: 9999 }).map((n) => `C${String(n).padStart(4, '0')}`), {
          minLength: 0,
          maxLength: 10,
        }),
        (cursos, aprobados) => {
          const resultado = calcularHabilitados(cursos, aprobados);
          const indices = resultado.map((r) => cursos.findIndex((c) => c.id === r.id));
          for (let i = 1; i < indices.length; i++) {
            if (indices[i] <= indices[i - 1]) return false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('calcularHabilitados - Property 3: idempotencia ante repetidos en aprobados', () => {
  // Validates: Requirements 1.5

  const idArb2 = fc.integer({ min: 0, max: 99 }).map((n) => `C${String(n).padStart(4, '0')}`);
  const catalogoArb2 = fc
    .array(idArb2, { minLength: 1, maxLength: 10 })
    .map((ids) => {
      const uniqueIds = [...new Set(ids)];
      return uniqueIds.map((id) => ({ id, prerequisites: [] }));
    });

  test('duplicar elementos en aprobados no cambia el resultado', () => {
    // Feature: habilitados, Property 3: idempotencia ante repetidos en aprobados
    fc.assert(
      fc.property(
        catalogoArb2,
        fc.array(idArb2, { minLength: 0, maxLength: 20 }),
        (cursos, aprobados) => {
          const sinDup = [...new Set(aprobados)];
          const r1 = calcularHabilitados(cursos, aprobados);
          const r2 = calcularHabilitados(cursos, sinDup);
          return JSON.stringify(r1) === JSON.stringify(r2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
