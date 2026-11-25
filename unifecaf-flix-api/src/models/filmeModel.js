'use strict';

const prisma = require('../config/prisma');

const publicFields = {
  id: true,
  nome: true,
  sinopse: true,
  anoLancamento: true,
  genero: true,
  diretor: true,
  duracaoMinutos: true,
  classificacaoIndicativa: true,
  criadoEm: true
};

const defaultOrder = [{ nome: 'asc' }, { id: 'asc' }];

/**
 * Executa a consulta com ou sem paginação.
 * Sem paginação retorna o array completo; com paginação retorna { data, total }.
 */
async function consultar(where, paginacao) {
  const query = { where, select: publicFields, orderBy: defaultOrder };

  if (!paginacao) return prisma.filme.findMany(query);

  const [data, total] = await prisma.$transaction([
    prisma.filme.findMany({
      ...query,
      skip: (paginacao.page - 1) * paginacao.limit,
      take: paginacao.limit
    }),
    prisma.filme.count({ where })
  ]);

  return { data, total };
}

const FilmeModel = {
  listar(paginacao) {
    return consultar(undefined, paginacao);
  },

  buscarPorId(id) {
    return prisma.filme.findUnique({ where: { id }, select: publicFields });
  },

  filtrarPorTexto(texto, paginacao) {
    const where = {
      OR: [
        { nome: { contains: texto } },
        { sinopse: { contains: texto } }
      ]
    };
    return consultar(where, paginacao);
  }
};

module.exports = FilmeModel;
