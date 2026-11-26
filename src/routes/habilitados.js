// Ruta POST /habilitados (Feature: habilitados).
//
// Pipeline: validarHabilitados (400 en entrada inválida) →
// calcularHabilitados sobre el catálogo del repositorio → 200 con arreglo.
// Errores no controlados llegan al errorHandler global (500 genérico).
// Requirements: 1.1, 2.1, 3.1, 4.1

const express = require('express');
const router = express.Router();
const { validarHabilitados } = require('../middleware/validar-habilitados');
const { calcularHabilitados } = require('../util/calcular-habilitados');
const repositorio = require('../data/repositorio');

router.post('/', validarHabilitados, (req, res) => {
  const cursos = repositorio.listar();
  const resultado = calcularHabilitados(cursos, req.body.aprobados);
  res.json(resultado);
});

module.exports = router;
