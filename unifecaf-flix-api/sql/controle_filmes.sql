CREATE DATABASE IF NOT EXISTS unifecaf_flix
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE unifecaf_flix;

CREATE TABLE IF NOT EXISTS filmes (
  id_filme INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(180) NOT NULL,
  sinopse TEXT NOT NULL,
  ano_lancamento SMALLINT NOT NULL,
  genero VARCHAR(80) NOT NULL,
  diretor VARCHAR(140) NOT NULL,
  duracao_minutos SMALLINT NOT NULL,
  classificacao_indicativa VARCHAR(10) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_filme),
  INDEX idx_filmes_nome (nome),
  INDEX idx_filmes_ano (ano_lancamento)
) ENGINE=InnoDB;

INSERT IGNORE INTO filmes
  (id_filme, nome, sinopse, ano_lancamento, genero, diretor, duracao_minutos, classificacao_indicativa)
VALUES
  (1, 'O Último Farol', 'Em uma ilha distante, uma jovem cartógrafa encontra mensagens que podem mudar o futuro de sua comunidade.', 2022, 'Drama', 'Marina Costa', 108, '12'),
  (2, 'Código das Estrelas', 'Dois estudantes investigam um sinal incomum captado por um pequeno observatório no interior do país.', 2024, 'Ficção científica', 'Rafael Nunes', 116, '10'),
  (3, 'A Casa das Janelas', 'Ao voltar à cidade natal, uma restauradora descobre histórias de várias gerações escondidas em uma casa antiga.', 2021, 'Mistério', 'Lívia Martins', 101, '12'),
  (4, 'Domingo de Chuva', 'Uma família tenta salvar sua pequena livraria enquanto redescobre os laços que a mantêm unida.', 2023, 'Comédia dramática', 'Caio Oliveira', 94, 'Livre'),
  (5, 'Além do Horizonte Azul', 'Uma equipe de pesquisadores parte em uma expedição marítima para estudar um ecossistema pouco conhecido.', 2025, 'Aventura', 'Joana Ribeiro', 123, '10');
