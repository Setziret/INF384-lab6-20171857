# Trazabilidad

## Requisito → gate → evidencia

| Requisito | Gate (herramienta y umbral) | Bloquea / avisa | Etapa | Run fallido | Run corregido |
| --- | --- | --- | --- | --- | --- |
| 2.1 Límite de 5000 elementos | Test: `validar-habilitados.test.js` › "lista de 5001 elementos → 400" | Bloquea | Pre-commit / job de tests en CI | No aplica run — el test no existía antes de implementar el middleware; se escribió junto con la corrección | Test en verde desde el commit 3c8ad3f |
| 2.2 Rendimiento con 5000 elementos válidos | Test: `validar-habilitados.test.js` › "lista de 5000 válidos → llama a next() en < 2 s" | Bloquea (umbral de tiempo) | Pre-commit / job de tests en CI | No aplica run — mismo caso que arriba | Test en verde desde el commit 3c8ad3f |
| 3.1 / 3.3 Formato inválido, sin reflejar el valor | Test: `validar-habilitados.test.js` › `"1INF30<script>" → 400 sin reflejar el valor"` y property test `"rechaza con 400 y sin reflejar el valor (100 runs)"` (fast-check, Property 4) | Bloquea | Pre-commit / job de tests en CI | No aplica run — el test se escribió junto con el middleware | Test en verde desde el commit 3c8ad3f |
| 3.2 Error no controlado sin stack trace | Test: `error-handler.test.js` + `habilitados.test.js` (mock del repositorio que lanza) | Bloquea | Pre-commit / job de tests en CI | No aplica run — `error-handler.js` ya existía de la parte guiada | Test en verde desde el commit 5f8c8b3 |
| 4.1 `aprobados` no es arreglo | Test: `validar-habilitados.test.js` › "rechaza %s con 400" (casos string, número, objeto, null, booleano) y "campo aprobados ausente → 400" | Bloquea | Pre-commit / job de tests en CI | No aplica run — test nuevo junto con el middleware | Test en verde desde el commit 3c8ad3f |
| 4.2 / 4.3 Elemento de `aprobados` no es string | Test: `validar-habilitados.test.js` › "rechaza elemento de tipo %s con 400" (número, null, booleano, objeto, arreglo anidado) | Bloquea | Pre-commit / job de tests en CI | No aplica run — test nuevo junto con el middleware | Test en verde desde el commit 3c8ad3f |
| 5.1 Cobertura de líneas ≥ 80% | Jest `--coverage`, `coverageThreshold.global.lines: 80` en `jest.config.js` | Bloquea | CI (job de tests) | GitHub Actions estuvo deshabilitado durante las tareas 1-5; no se capturó un run previo | https://github.com/Setziret/INF384-lab6-20171857/actions/runs/45903664656 — 80.64% líneas |
| Dependencias vulnerables (Política de TI) | `npm audit --audit-level=high` | Bloquea | Pull request y `main` | GitHub Actions estuvo deshabilitado mientras lodash 4.17.20 (vulnerable) estaba en el repo por lo que no se capturó un run en rojo. Evidencia local: salida de `npm audit` mostrando 1 vulnerabilidad high antes de actualizar a 4.18.1 | https://github.com/Setziret/INF384-lab6-20171857/actions/runs/45903664656 — 0 vulnerabilidades |
| Secretos (Política de TI) | gitleaks, umbral 0 hallazgos | Bloquea | Pull request y `main` | No se generó ningún hallazgo real durante el laboratorio; tampoco hubo un run previo por Actions deshabilitado | https://github.com/Setziret/INF384-lab6-20171857/actions/runs/45903664656 |

## Cambios a la propuesta de Kiro

| Documento | Qué propuso Kiro | Qué cambiaste | Por qué |
| --- | --- | --- | --- |
| design.md / ci.yml | Dejar la vulnerabilidad de lodash 4.17.20 como "deuda de seguridad pendiente" y permitir que el gate de SCA quede en rojo | Actualicé lodash a 4.18.1 para que el gate pase en verde | Ya había verificado con `npm audit` que 4.18.1 limpia la vulnerabilidad sin romper ningún test; dejarlo en rojo habría costado puntos sin necesidad (rúbrica: 3 pts si el run queda en verde vs. 1.5 si queda documentado en rojo) |
| .github/workflows/ci.yml (tarea 5) | Job de tests con el comando `npx jest --run --coverage` | Corregí el comando a `npx jest --coverage` (sin `--run`, que no es una opción válida de Jest, es de Vitest) | El flag inexistente hacía fallar el job de CI con "Unrecognized CLI Parameter", bloqueando el pipeline por un error de sintaxis, no por un hallazgo real |