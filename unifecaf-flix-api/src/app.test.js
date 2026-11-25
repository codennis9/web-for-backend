'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('./app');
const FilmeModel = require('./models/filmeModel');

const filmes = [
  { id: 1, nome: 'O Último Farol', sinopse: 'Uma cartógrafa encontra mensagens.' },
  { id: 2, nome: 'Código das Estrelas', sinopse: 'Estudantes investigam um sinal.' }
];

let server;
let baseUrl;

test.before(async () => {
  FilmeModel.listar = async (paginacao) => (paginacao ? { data: filmes, total: 2 } : filmes);
  FilmeModel.buscarPorId = async (id) => filmes.find((filme) => filme.id === id) || null;
  FilmeModel.filtrarPorTexto = async (texto) => filmes.filter((filme) => filme.nome.includes(texto));

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/v1/controle-filmes`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, body: await response.json() };
}

test('GET /filme retorna 200 com todos os filmes', async () => {
  const { status, body } = await get('/filme');
  assert.equal(status, 200);
  assert.deepEqual(body.data, filmes);
});

test('GET /filme com page e limit retorna meta de paginação', async () => {
  const { status, body } = await get('/filme?page=1&limit=1');
  assert.equal(status, 200);
  assert.deepEqual(body.meta, { page: 1, limit: 1, total: 2, totalPages: 2 });
});

test('GET /filme/:id retorna 200 para filme existente', async () => {
  const { status, body } = await get('/filme/1');
  assert.equal(status, 200);
  assert.equal(body.data.nome, 'O Último Farol');
});

test('GET /filme/:id retorna 404 para filme inexistente', async () => {
  const { status, body } = await get('/filme/999');
  assert.equal(status, 404);
  assert.equal(body.error.code, 'FILME_NAO_ENCONTRADO');
});

test('GET /filme/:id retorna 400 para ID inválido', async () => {
  const { status, body } = await get('/filme/abc');
  assert.equal(status, 400);
  assert.equal(body.error.code, 'ID_INVALIDO');
});

test('GET /filtro/filme?nome= retorna 200 com resultados', async () => {
  const { status, body } = await get('/filtro/filme?nome=Farol');
  assert.equal(status, 200);
  assert.equal(body.data.length, 1);
});

test('GET /filtro/filme sem resultados retorna 200 e lista vazia', async () => {
  const { status, body } = await get('/filtro/filme?nome=inexistente');
  assert.equal(status, 200);
  assert.deepEqual(body.data, []);
});

test('GET /filtro/filme sem nome retorna 400', async () => {
  const { status, body } = await get('/filtro/filme');
  assert.equal(status, 400);
  assert.equal(body.error.code, 'NOME_OBRIGATORIO');
});

test('rota inexistente retorna 404 padronizado', async () => {
  const response = await fetch(`${baseUrl}/nao-existe`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'ROTA_NAO_ENCONTRADA');
});
