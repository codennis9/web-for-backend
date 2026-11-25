'use strict';

const HttpError = require('../utils/httpError');

function notFound(req, res) {
  res.status(404).json({
    error: {
      code: 'ROTA_NAO_ENCONTRADA',
      message: 'A rota solicitada não existe.'
    },
    meta: { requestId: req.id }
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {})
      },
      meta: { requestId: req.id }
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: { code: 'JSON_INVALIDO', message: 'O corpo da requisição contém JSON inválido.' },
      meta: { requestId: req.id }
    });
  }

  if (error.code === 'P1000' || error.code === 'P1001' || error.code === 'P1002') {
    console.error(`[${req.id}] Banco de dados indisponível (${error.code}).`);
    return res.status(503).json({
      error: { code: 'BANCO_INDISPONIVEL', message: 'Não foi possível acessar o banco de dados agora.' },
      meta: { requestId: req.id }
    });
  }

  if (process.env.NODE_ENV === 'development') console.error(`[${req.id}] Erro inesperado:`, error);
  else console.error(`[${req.id}] Erro inesperado (${error.name || 'Error'}).`);
  return res.status(500).json({
    error: { code: 'ERRO_INTERNO', message: 'Ocorreu um erro interno. Tente novamente mais tarde.' },
    meta: { requestId: req.id }
  });
}

module.exports = { notFound, errorHandler };
