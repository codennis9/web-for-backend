'use strict';

const FilmeModel = require('../models/filmeModel');
const FilmeView = require('../views/filmeView');
const { validateId, validateSearchTerm, validatePagination } = require('../validators/filmeValidator');

/**
 * Controller: valida a entrada, aciona o model e escolhe o status HTTP.
 * A formatação do corpo da resposta fica na view.
 */
function responderLista(res, resultado, paginacao) {
  const corpo = paginacao
    ? FilmeView.listaPaginada(resultado, paginacao)
    : FilmeView.lista(resultado);
  return res.status(200).json(corpo);
}

const FilmeController = {
  // GET /v1/controle-filmes/filme
  async listar(req, res) {
    const paginacao = validatePagination(req.query);
    const resultado = await FilmeModel.listar(paginacao);
    return responderLista(res, resultado, paginacao);
  },

  // GET /v1/controle-filmes/filme/:id
  async buscarPorId(req, res) {
    const id = validateId(req.params.id);
    const filme = await FilmeModel.buscarPorId(id);
    if (!filme) {
      return res.status(404).json(FilmeView.naoEncontrado(id, req.id));
    }

    return res.status(200).json(FilmeView.item(filme));
  },

  // GET /v1/controle-filmes/filtro/filme?nome=xxx
  async filtrar(req, res) {
    const nome = validateSearchTerm(req.query.nome);
    const paginacao = validatePagination(req.query);
    const resultado = await FilmeModel.filtrarPorTexto(nome, paginacao);
    return responderLista(res, resultado, paginacao);
  }
};

module.exports = FilmeController;
