# UniFECAF Flix — Documentação Técnica (Parte Teórica)

API REST para consulta do acervo de filmes da plataforma UniFECAF Flix, construída com **Node.js + Express + Prisma ORM + MySQL**, organizada em **MVC**.

## 1. Arquitetura (MVC + REST)

### 1.1 MVC aplicado a uma API

```text
Cliente (Postman / sistemas da empresa)
        │  HTTP GET
        ▼
   Routes  ──►  Controller  ──►  Validator
                    │
                    ▼
                  Model  ──►  Prisma ORM  ──►  MySQL
                    │
                    ▼
                  View (JSON)  ──►  resposta HTTP
```

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| **Model** | `src/models/filmeModel.js` | Único ponto de acesso ao banco. Monta consultas Prisma (`findMany`, `findUnique`, `count`). Não conhece HTTP. |
| **View** | `src/views/filmeView.js` | Define a representação JSON devolvida (envelope `data`, `meta`, `error`). Em APIs REST a "view" é a serialização, não HTML. |
| **Controller** | `src/controllers/filmeController.js` | Recebe a requisição, chama o validador, aciona o model e escolhe o status HTTP. |
| **Routes** | `src/routes/filmeRoutes.js` | Mapeia método + caminho para o método do controller. |

Camadas de apoio: `validators/` (validação de entrada), `middleware/errorHandler.js` (erros centralizados), `utils/` (`HttpError`, `asyncHandler`), `config/prisma.js` (conexão).

### 1.2 Por que REST?

- **Recursos e URLs previsíveis**: `/filme` (coleção) e `/filme/:id` (item).
- **Semântica HTTP**: `GET` para leitura, status codes que descrevem o resultado (200, 400, 404, 429, 500, 503).
- **Stateless**: cada requisição é independente, o que facilita escalar horizontalmente.
- **Desacoplamento**: qualquer sistema consome o catálogo sem conhecer o banco.
- **Versionamento** (`/v1`) permite evoluir sem quebrar integrações existentes.

## 2. Justificativa das escolhas tecnológicas

| Tecnologia | Motivo |
|---|---|
| **Node.js** | Runtime assíncrono e não bloqueante, ideal para APIs com muitas leituras; mesmo idioma (JavaScript) do front-end; ecossistema npm. |
| **Express 5** | Framework minimalista; middlewares encadeáveis; suporte nativo a promises em handlers. |
| **MySQL (relacional)** | Dados de filmes são estruturados e consistentes; integridade, índices e consultas `LIKE` eficientes; exigido pelo enunciado. |
| **Prisma ORM** | Consultas parametrizadas (protege contra SQL Injection), schema declarativo, cliente tipado e mapeamento `@map` entre colunas SQL e campos JS. |
| **Helmet / CORS / express-rate-limit** | Cabeçalhos de segurança, controle de origens e limite de requisições. |
| **dotenv** | Segredos e configurações fora do código (`.env`). |
| **node:test** | Testes nativos, sem dependências extras. |

**Rotas**: prefixo `/v1/controle-filmes`; substantivos no singular conforme o enunciado; a rota fixa `/filtro/filme` é registrada antes de `/filme/:id` para evitar ambiguidade.

## 3. Endpoints

Base: `http://localhost:3000/v1/controle-filmes`

### 3.1 `GET /filme` — listar todos

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `page` | query, inteiro ≥ 1 | não* | Página (use junto com `limit`). |
| `limit` | query, inteiro 1–100 | não* | Itens por página. |

\* Sem `page`/`limit` a API devolve todos os filmes, como pede o enunciado.

Respostas: `200` lista (ordenada por nome) · `400` paginação inválida.

```json
{ "data": [ { "id": 1, "nome": "O Último Farol", "sinopse": "...", "anoLancamento": 2022,
  "genero": "Drama", "diretor": "Marina Costa", "duracaoMinutos": 108,
  "classificacaoIndicativa": "12", "criadoEm": "2026-11-02T00:00:00.000Z" } ] }
```

### 3.2 `GET /filme/:id` — buscar por ID

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | path, inteiro positivo | sim | ID do filme. |

Respostas: `200` filme · `400` `ID_INVALIDO` (ex.: `abc`, `0`, `-1`) · `404` `FILME_NAO_ENCONTRADO`.

### 3.3 `GET /filtro/filme?nome=xxx` — filtrar por nome ou sinopse

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `nome` | query, texto (1–100 caracteres) | sim | Trecho procurado em `nome` **ou** `sinopse` (`LIKE %texto%`, sem diferenciar maiúsculas/minúsculas). |
| `page`, `limit` | query | não | Paginação opcional, como em 3.1. |

Respostas: `200` lista (vazia `[]` se nada for encontrado) · `400` `NOME_OBRIGATORIO`, `NOME_VAZIO`, `NOME_MUITO_LONGO`.

### 3.4 Tabela de status HTTP

| Status | Quando |
|---|---|
| 200 OK | Consulta bem-sucedida (inclusive busca sem resultados). |
| 400 Bad Request | Entrada inválida (ID, nome, paginação). |
| 404 Not Found | Filme ou rota inexistente. |
| 429 Too Many Requests | Limite de requisições excedido. |
| 500 Internal Server Error | Erro inesperado (sem vazar stack trace). |
| 503 Service Unavailable | Banco MySQL indisponível. |

Formato de erro padronizado:

```json
{ "error": { "code": "ID_INVALIDO", "message": "O ID deve ser um número inteiro positivo." },
  "meta": { "requestId": "c0f0..." } }
```

## 4. Estrutura de pastas

```text
unifecaf-flix-api/
├── docs/DOCUMENTACAO.md        este documento
├── postman/                    coleção e ambiente do Postman
├── prisma/
│   ├── schema.prisma           modelo Filme ↔ tabela `filmes`
│   └── seed.js                 carga inicial idempotente
├── scripts/testar_api.py       testes de ponta a ponta em Python
├── sql/controle_filmes.sql     script: banco, tabela e INSERTs
├── src/
│   ├── app.js                  Express: middlewares e rotas
│   ├── server.js               inicialização e shutdown gracioso
│   ├── config/prisma.js        instância única do PrismaClient
│   ├── routes/                 rotas
│   ├── controllers/            controllers
│   ├── models/                 acesso a dados
│   ├── views/                  formato das respostas JSON
│   ├── validators/             validação de entrada
│   ├── middleware/             404 e tratamento de erros
│   └── utils/                  HttpError, asyncHandler
├── .env.example                variáveis de ambiente
└── package.json
```

## 5. Trechos de código que demonstram o entendimento

**Rota** (`src/routes/filmeRoutes.js`):

```js
router.get('/filtro/filme', asyncHandler(FilmeController.filtrar));
router.get('/filme/:id', asyncHandler(FilmeController.buscarPorId));
router.get('/filme', asyncHandler(FilmeController.listar));
```

**Controller** valida → consulta → responde com o status correto:

```js
async buscarPorId(req, res) {
  const id = validateId(req.params.id);          // 400 se inválido
  const filme = await FilmeModel.buscarPorId(id);
  if (!filme) return res.status(404).json(FilmeView.naoEncontrado(id, req.id));
  return res.status(200).json(FilmeView.item(filme));
}
```

**Model** (busca em nome OU sinopse, parametrizada pelo Prisma):

```js
filtrarPorTexto(texto, paginacao) {
  const where = { OR: [{ nome: { contains: texto } }, { sinopse: { contains: texto } }] };
  return consultar(where, paginacao);
}
```

**Validação** (`src/validators/filmeValidator.js`):

```js
if (typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId)) {
  throw new HttpError(400, 'ID_INVALIDO', 'O ID deve ser um número inteiro positivo.');
}
```

## 6. Questões para exploração

1. **Como aplicar corretamente o MVC?** Cada camada tem uma única responsabilidade: o model só fala com o banco, o controller só orquestra e define o status, a view só formata o JSON, e as rotas só mapeiam URLs. Nenhuma camada acessa a de outra "pulando" etapas (rota → controller → model).
2. **Por que REST?** Interface uniforme, previsível e independente de tecnologia; facilita integração, cache, versionamento e escalabilidade (stateless).
3. **Modularização adotada:** separação por camada e por responsabilidade (`routes`, `controllers`, `models`, `views`, `validators`, `middleware`, `utils`, `config`); erros centralizados em um único middleware; configuração via variáveis de ambiente.
4. **Validação e status codes:** validadores rejeitam entradas inválidas antes de tocar no banco e lançam `HttpError(400, código, mensagem)`; o `errorHandler` converte erros em respostas JSON padronizadas (400/404/429/500/503).
5. **Escalabilidade e segurança:**
   - *Já aplicado*: Prisma (anti SQL Injection), Helmet, CORS restrito, rate limit, limite de corpo, `x-powered-by` desabilitado, validação de entrada, mensagens de erro sem detalhes internos, `X-Request-Id` para rastreio, paginação opcional, índices em `nome` e `ano_lancamento`, shutdown gracioso.
   - *Recomendado em produção*: HTTPS/TLS, usuário MySQL com privilégio mínimo (somente `SELECT`), autenticação (JWT/API key), cache (Redis/CDN), `FULLTEXT` para busca em sinopse, logs estruturados, monitoramento, containerização, CI/CD com testes e múltiplas instâncias atrás de um load balancer.

## 7. Evidências de testes

### 7.1 Script Python de testes de ponta a ponta

`scripts/testar_api.py` executa requisições HTTP reais contra a API em execução e valida status e corpo de cada resposta (listagem, paginação, busca por ID, filtro por nome/sinopse, IDs inválidos, parâmetros ausentes, rota inexistente, cabeçalhos de segurança e tentativa de SQL Injection). Gera um relatório em texto com `--relatorio docs/relatorio_testes.txt`, que serve como evidência de execução.

```sh
python scripts/testar_api.py --relatorio docs/relatorio_testes.txt
```

### 7.2 Postman

Importe `postman/UniFECAF-Flix.postman_collection.json` e o ambiente `UniFECAF-Flix.postman_environment.json`. A coleção cobre:

| # | Requisição | Resultado esperado |
|---|---|---|
| 1 | `GET /filme` | 200 + array |
| 2 | `GET /filme/{{filmeId}}` | 200 + filme |
| 3 | `GET /filtro/filme?nome=mensagens` | 200 + resultados |
| 4 | `GET /filme/abc` | 400 `ID_INVALIDO` |
| 5 | `GET /filme/2147483647` | 404 `FILME_NAO_ENCONTRADO` |
| 6 | `GET /filtro/filme` | 400 `NOME_OBRIGATORIO` |

Coloque as capturas de tela (resposta + aba *Test Results*) na pasta `docs/prints/` e referencie-as abaixo:

<!-- ![Listar filmes](./prints/01-listar.png) -->
<!-- ![Buscar por ID](./prints/02-buscar-id.png) -->
<!-- ![Filtrar](./prints/03-filtrar.png) -->
<!-- ![ID inválido](./prints/04-400.png) -->
<!-- ![Não encontrado](./prints/05-404.png) -->

## 8. Testes automatizados

`npm test` executa 12 testes (`node:test`): validadores (`filmeValidator.test.js`) e testes HTTP dos 3 endpoints, incluindo 200, 400 e 404 (`app.test.js`).
