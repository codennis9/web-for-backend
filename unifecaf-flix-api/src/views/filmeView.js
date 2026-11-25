'use strict';

/**
 * View da API: define a representação JSON (envelope) devolvida ao cliente.
 * O controller decide o status HTTP; esta camada decide o formato do corpo.
 */
const FilmeView = {
  item(filme) {
    return { data: filme };
  },

  lista(filmes) {
    return { data: filmes };
  },

  listaPaginada({ data, total }, { page, limit }) {
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  naoEncontrado(id, requestId) {
    return {
      error: {
        code: 'FILME_NAO_ENCONTRADO',
        message: `Nenhum filme foi encontrado com o ID ${id}.`
      },
      meta: { requestId }
    };
  }
};

module.exports = FilmeView;
