'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const HttpError = require('../utils/httpError');
const { validateId, validateSearchTerm, validatePagination } = require('./filmeValidator');

test('validateId aceita inteiro positivo e rejeita formato inválido', () => {
  assert.equal(validateId('25'), 25);
  for (const id of ['0', '-1', '1.2', 'abc', '9007199254740992']) {
    assert.throws(() => validateId(id), HttpError);
  }
});

test('validateSearchTerm valida texto e limites', () => {
  assert.equal(validateSearchTerm('  aventura  '), 'aventura');
  assert.throws(() => validateSearchTerm(undefined), (error) => error.code === 'NOME_OBRIGATORIO');
  assert.throws(() => validateSearchTerm('  '), (error) => error.code === 'NOME_VAZIO');
  assert.throws(() => validateSearchTerm('x'.repeat(101)), (error) => error.code === 'NOME_MUITO_LONGO');
  assert.throws(() => validateSearchTerm(['filme', 'outro']), (error) => error.code === 'NOME_INVALIDO');
});

test('validatePagination mantém resposta completa por padrão e limita páginas', () => {
  assert.equal(validatePagination({}), null);
  assert.deepEqual(validatePagination({ page: '2', limit: '10' }), { page: 2, limit: 10 });
  assert.throws(() => validatePagination({ page: '2' }), (error) => error.code === 'PAGINACAO_INCOMPLETA');
  assert.throws(() => validatePagination({ limit: '10' }), (error) => error.code === 'PAGINACAO_INCOMPLETA');
  assert.throws(() => validatePagination({ limit: '101' }), (error) => error.code === 'PAGINACAO_FORA_DO_LIMITE');
});
