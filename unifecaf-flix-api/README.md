# UniFECAF Flix — API de filmes

API REST de leitura para o catálogo de filmes, desenvolvida em Node.js, Express, Prisma e MySQL. Este repositório inclui um schema MySQL e dados fictícios de demonstração.

> **Sobre o banco fornecido:** o enunciado menciona um script SQL disponibilizado, mas ele não veio junto com os arquivos de trabalho. Para tornar o projeto executável, foi criado `sql/controle_filmes.sql` e um schema Prisma equivalente. Se a disciplina fornecer outro script, compare a estrutura e ajuste `prisma/schema.prisma` antes de gerar o cliente.

## Requisitos

- Node.js 20.19 ou superior
- MySQL 8 ou compatível com InnoDB/utf8mb4
- npm
- Postman (opcional, para executar a coleção incluída)

## Executar localmente

1. Crie o banco e a tabela executando `sql/controle_filmes.sql` no MySQL. O script insere cinco filmes fictícios e pode ser executado novamente sem duplicar esses IDs.
2. Copie `.env.example` para `.env` e ajuste `DATABASE_URL` com usuário, senha e host do seu MySQL.
3. Na pasta do projeto, instale e gere o cliente Prisma:

   ```sh
   npm install
   npm run db:generate
   ```

4. Se criou o banco usando o script SQL acima, a tabela já existe. Para criar/verificar a estrutura via Prisma em uma base vazia, use `npm run db:deploy`.
5. Opcional: carregue os dados demonstrativos pelo Prisma. A operação não duplica registros com IDs já existentes:

   ```sh
   npm run db:seed
   ```

6. Inicie o servidor:

   ```sh
   npm run dev
   ```

   A API ficará em `http://localhost:3000`.

7. Execute os testes de validação:

   ```sh
   npm test
   ```

## Endpoints

Prefixo: `/v1/controle-filmes`

| Método | Caminho | Descrição |
|---|---|---|
| GET | `/filme` | Lista os filmes em ordem alfabética. Sem parâmetros, retorna todos. |
| GET | `/filme/:id` | Busca pelo ID inteiro positivo. |
| GET | `/filtro/filme?nome=texto` | Busca trecho em `nome` **ou** `sinopse`, sem diferenciar maiúsculas/minúsculas conforme a collation do MySQL. |

### Paginação opcional

Para listas extensas, ambas as rotas de listagem aceitam `page` e `limit` juntos. `limit` aceita de 1 a 100. Sem eles, a listagem continua retornando o acervo completo, como solicitado.

```text
GET /v1/controle-filmes/filme?page=1&limit=20
GET /v1/controle-filmes/filtro/filme?nome=aventura&page=1&limit=10
```

Quando paginada, a resposta inclui `meta.page`, `meta.limit`, `meta.total` e `meta.totalPages`.

### Exemplos de resposta

`GET /v1/controle-filmes/filme/1`:

```json
{
  "data": {
    "id": 1,
    "nome": "O Último Farol",
    "sinopse": "Em uma ilha distante, uma jovem cartógrafa encontra mensagens que podem mudar o futuro de sua comunidade.",
    "anoLancamento": 2022,
    "genero": "Drama",
    "diretor": "Marina Costa",
    "duracaoMinutos": 108,
    "classificacaoIndicativa": "12",
    "criadoEm": "2026-11-02T00:00:00.000Z"
  }
}
```

`GET /v1/controle-filmes/filtro/filme?nome=texto-sem-resultado` retorna `200` com `{"data":[]}`. Uma busca sem o parâmetro `nome` retorna `400`. Um ID válido sem filme correspondente retorna `404`.

## Arquitetura e decisões

### MVC + REST

- **Model** (`src/models/filmeModel.js`): contém as consultas Prisma e não conhece HTTP.
- **View** (`src/views/filmeView.js`): define o formato JSON das respostas (envelope `data`/`meta`/`error`).
- **Controller** (`src/controllers/filmeController.js`): valida entradas, chama o model, escolhe o status HTTP e usa a view para montar o corpo.
- **Routes** (`src/routes/filmeRoutes.js`): associa método e caminho ao controller. A rota de filtro aparece antes das rotas parametrizadas para manter a leitura explícita.

A documentação completa da parte teórica está em [`docs/DOCUMENTACAO.md`](docs/DOCUMENTACAO.md).

REST dá recursos e operações previsíveis, usa os métodos HTTP conforme sua semântica e permite que clientes diferentes integrem o catálogo sem compartilhar detalhes internos do banco.

### Tecnologias

- **Node.js**: runtime JavaScript para executar o servidor.
- **Express**: composição simples de middlewares e rotas HTTP.
- **Prisma ORM**: consultas parametrizadas e camada de acesso tipada ao MySQL.
- **MySQL/InnoDB**: banco relacional persistente, com colunas e índices definidos no script SQL.
- **Helmet, CORS configurável e rate limit**: cabeçalhos de segurança, controle de origem e limite de requisições de leitura. A configuração CORS local está em `.env.example`.

### Organização

```text
src/
  app.js                    configuração Express e middlewares
  server.js                 inicialização e encerramento gracioso
  config/prisma.js          conexão Prisma
  controllers/              controllers HTTP
  middleware/               404 e tratamento centralizado de erros
  models/                   consultas ao banco
  routes/                   definição das rotas
  utils/                    erros HTTP e wrapper assíncrono
  validators/               validação e testes unitários
  views/                    formato JSON das respostas (View do MVC)
  app.test.js               testes HTTP dos endpoints
docs/DOCUMENTACAO.md        documento da parte teórica
prisma/
  schema.prisma             modelo relacional Prisma
  seed.js                   dados de demonstração idempotentes
sql/controle_filmes.sql     criação do banco, tabela e seed SQL
postman/                    coleção e ambiente local exportáveis
```

## Validação e status HTTP

- `200 OK`: consulta executada, inclusive busca válida sem resultados.
- `400 Bad Request`: ID inválido, busca ausente/vazia/muito longa ou paginação inválida.
- `404 Not Found`: filme ou rota inexistente.
- `429 Too Many Requests`: limite de consultas excedido.
- `500 Internal Server Error`: erro não esperado, sem expor stack trace ao consumidor.
- `503 Service Unavailable`: indisponibilidade de conexão com MySQL.

O nome é limitado a 100 caracteres e tratado como texto de busca, nunca como SQL. IDs são aceitos somente como inteiros positivos seguros. Prisma usa parâmetros nas consultas, mitigando injeção SQL.

## Testes com Python (alternativa ao Postman)

O script [`scripts/testar_api.py`](scripts/testar_api.py) faz requisições reais a todos os endpoints (sucesso, 400 e 404) e confere status e corpo da resposta. Usa apenas a biblioteca padrão do Python 3.9+, sem instalar nada.

```sh
# com a API rodando (npm run dev)
python scripts/testar_api.py
python scripts/testar_api.py --relatorio docs/relatorio_testes.txt   # salva evidência em texto
python scripts/testar_api.py --base-url http://localhost:3000/v1/controle-filmes
```

O código de saída é `0` quando todos os testes passam e `1` se algum falhar.

## Testes com Postman

1. Inicie o MySQL e a API.
2. No Postman, importe `postman/UniFECAF-Flix.postman_collection.json` e `postman/UniFECAF-Flix.postman_environment.json`.
3. Selecione o ambiente **UniFECAF Flix - Local**.
4. Execute os pedidos na pasta **Filmes**. A listagem inicial guarda um ID encontrado para os pedidos seguintes.
5. A coleção verifica os códigos HTTP e os campos de resposta. Para evidência acadêmica, faça capturas da aba **Test Results** para cada pedido e organize-as na entrega.

## Questões para exploração

1. **Como aplicar MVC?** Manter as regras de persistência no model, HTTP no controller e mapeamentos em rotas reduz acoplamento e facilita testes e manutenção.
2. **Por que REST?** Padroniza a interação com recursos, oferece semântica HTTP conhecida e permite evolução independente dos clientes.
3. **Como modularizar?** Configuração, rotas, controllers, models, middleware, validadores e utilitários têm responsabilidades separadas; a definição de dados e a seed ficam em `prisma/`.
4. **Como validar e responder?** Validadores rejeitam entrada inválida antes da consulta; respostas usam códigos HTTP e formato JSON consistente.
5. **Como evoluir segurança e escala?** Usar TLS e segredos fora do repositório, permissões mínimas no MySQL, paginação, monitoramento, logs estruturados, backup, testes de integração, índices orientados a consultas e cache somente se a necessidade for medida.

## Compactar para entrega

No PowerShell, na pasta que contém este projeto:

```powershell
Compress-Archive -Path .\unifecaf-flix-api -DestinationPath .\unifecaf-flix-api.zip -Force
```

Não inclua `.env` nem `node_modules` no arquivo enviado. O `.env.example`, o script SQL, a documentação e a coleção Postman já estão incluídos.

## Roteiro sugerido para o vídeo pitch (até 4 minutos)

1. Apresente o problema e os três endpoints (30 s).
2. Mostre a estrutura MVC e explique a divisão Model, Controller e Routes (50 s).
3. Mostre o schema MySQL/Prisma e a validação de ID e busca (40 s).
4. Demonstre no Postman listagem, busca por ID, filtro, 400 e 404 (1 min 20 s).
5. Encerre com decisões de segurança, testes e aprendizados (40 s).

O vídeo precisa ser gravado e enviado pelo estudante ao YouTube; nenhum link de vídeo ou captura do Postman foi inventado nesta entrega.

## Referências

- [Documentação Node.js](https://nodejs.org/docs/latest/api/)
- [Documentação Prisma](https://www.prisma.io/docs)
- [Status HTTP — MDN](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Status)
- [Introdução ao padrão MVC — DevMedia](https://www.devmedia.com.br/introducao-ao-padrao-mvc/29308)
