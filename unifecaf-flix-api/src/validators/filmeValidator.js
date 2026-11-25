'use strict';

const HttpError = require('../utils/httpError');

function validateId(rawId) {
  if (typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId)) {
    throw new HttpError(400, 'ID_INVALIDO', 'O ID deve ser um número inteiro positivo.');
  }

  const id = Number(rawId);
  if (!Number.isSafeInteger(id)) {
    throw new HttpError(400, 'ID_INVALIDO', 'O ID informado está fora do intervalo permitido.');
  }

  return id;
}

function validateSearchTerm(rawName) {
  if (rawName === undefined) {
    throw new HttpError(400, 'NOME_OBRIGATORIO', 'Informe o parâmetro de busca "nome".');
  }
  if (typeof rawName !== 'string') {
    throw new HttpError(400, 'NOME_INVALIDO', 'O parâmetro "nome" deve conter um único texto.');
  }

  const name = rawName.trim();
  if (!name) {
    throw new HttpError(400, 'NOME_VAZIO', 'O parâmetro "nome" não pode ficar vazio.');
  }
  if (name.length > 100) {
    throw new HttpError(400, 'NOME_MUITO_LONGO', 'O parâmetro "nome" deve ter no máximo 100 caracteres.');
  }

  return name;
}

function optionalInteger(raw, field, { min, max }) {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) {
    throw new HttpError(400, 'PAGINACAO_INVALIDA', `O parâmetro "${field}" deve ser um inteiro positivo.`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new HttpError(400, 'PAGINACAO_FORA_DO_LIMITE', `O parâmetro "${field}" deve estar entre ${min} e ${max}.`);
  }
  return value;
}

function validatePagination(query) {
  const page = optionalInteger(query.page, 'page', { min: 1, max: 1000000 });
  const limit = optionalInteger(query.limit, 'limit', { min: 1, max: 100 });
  if ((page === undefined) !== (limit === undefined)) {
    throw new HttpError(400, 'PAGINACAO_INCOMPLETA', 'Informe "page" e "limit" juntos, ou omita ambos.');
  }
  return page === undefined ? null : { page, limit };
}

module.exports = { validateId, validateSearchTerm, validatePagination };
