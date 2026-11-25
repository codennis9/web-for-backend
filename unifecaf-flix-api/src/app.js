'use strict';

require('dotenv').config();
const { randomUUID } = require('node:crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const filmeRoutes = require('./routes/filmeRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'OPTIONS'],
  credentials: false,
  maxAge: 600
}));
app.use(express.json({ limit: '10kb' }));
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'MUITAS_REQUISICOES', message: 'Limite de consultas atingido. Aguarde antes de tentar novamente.' }
  }
}));

app.use('/v1/controle-filmes', filmeRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
