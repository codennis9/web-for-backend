'use strict';

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const filmes = [
  {
    id: 1,
    nome: 'O Último Farol',
    sinopse: 'Em uma ilha distante, uma jovem cartógrafa encontra mensagens que podem mudar o futuro de sua comunidade.',
    anoLancamento: 2022,
    genero: 'Drama',
    diretor: 'Marina Costa',
    duracaoMinutos: 108,
    classificacaoIndicativa: '12'
  },
  {
    id: 2,
    nome: 'Código das Estrelas',
    sinopse: 'Dois estudantes investigam um sinal incomum captado por um pequeno observatório no interior do país.',
    anoLancamento: 2024,
    genero: 'Ficção científica',
    diretor: 'Rafael Nunes',
    duracaoMinutos: 116,
    classificacaoIndicativa: '10'
  },
  {
    id: 3,
    nome: 'A Casa das Janelas',
    sinopse: 'Ao voltar à cidade natal, uma restauradora descobre histórias de várias gerações escondidas em uma casa antiga.',
    anoLancamento: 2021,
    genero: 'Mistério',
    diretor: 'Lívia Martins',
    duracaoMinutos: 101,
    classificacaoIndicativa: '12'
  },
  {
    id: 4,
    nome: 'Domingo de Chuva',
    sinopse: 'Uma família tenta salvar sua pequena livraria enquanto redescobre os laços que a mantêm unida.',
    anoLancamento: 2023,
    genero: 'Comédia dramática',
    diretor: 'Caio Oliveira',
    duracaoMinutos: 94,
    classificacaoIndicativa: 'Livre'
  },
  {
    id: 5,
    nome: 'Além do Horizonte Azul',
    sinopse: 'Uma equipe de pesquisadores parte em uma expedição marítima para estudar um ecossistema pouco conhecido.',
    anoLancamento: 2025,
    genero: 'Aventura',
    diretor: 'Joana Ribeiro',
    duracaoMinutos: 123,
    classificacaoIndicativa: '10'
  }
];

async function main() {
  await prisma.filme.createMany({ data: filmes, skipDuplicates: true });
  console.log(`${filmes.length} filmes de exemplo verificados no banco.`);
}

main()
  .catch((error) => {
    console.error('Falha ao inserir os filmes de exemplo:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
