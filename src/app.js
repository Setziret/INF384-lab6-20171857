const path = require('path');
const express = require('express');
const repositorio = require('./data/repositorio');
const errorHandler = require('./middleware/error-handler');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', cursos: repositorio.listar().length });
});

app.use('/cursos', require('./routes/cursos'));
app.use('/habilitados', require('./routes/habilitados'));

// Middleware de manejo de errores no controlados (debe ir al final)
app.use(errorHandler);

module.exports = app;
