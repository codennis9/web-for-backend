#!/usr/bin/env python3
"""Testes de ponta a ponta da API UniFECAF Flix.

Faz requisições HTTP reais aos 3 endpoints obrigatórios (e aos casos de erro)
e confere status HTTP e corpo da resposta. Usa apenas a biblioteca padrão do
Python (nenhuma instalação necessária).

Uso:
    python scripts/testar_api.py
    python scripts/testar_api.py --base-url http://localhost:3000/v1/controle-filmes
    python scripts/testar_api.py --relatorio docs/relatorio_testes.txt

Pré-requisito: MySQL com o script sql/controle_filmes.sql e a API rodando
(npm run dev). Código de saída: 0 se tudo passou, 1 se algum teste falhou,
2 se a API estiver inacessível.
"""

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, Optional

BASE_URL_PADRAO = "http://localhost:3000/v1/controle-filmes"
CAMPOS_FILME = {
    "id", "nome", "sinopse", "anoLancamento", "genero",
    "diretor", "duracaoMinutos", "classificacaoIndicativa", "criadoEm",
}


@dataclass
class Resposta:
    status: int
    corpo: object
    cabecalhos: dict = field(default_factory=dict)


@dataclass
class Resultado:
    nome: str
    metodo_url: str
    esperado: int
    obtido: Optional[int]
    passou: bool
    detalhe: str = ""


def requisitar(url: str) -> Resposta:
    """Executa um GET e devolve status + JSON (inclusive para respostas 4xx/5xx)."""
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            bruto, status, cab = resp.read(), resp.status, dict(resp.headers)
    except urllib.error.HTTPError as erro:
        bruto, status, cab = erro.read(), erro.code, dict(erro.headers)
    try:
        corpo = json.loads(bruto.decode("utf-8")) if bruto else None
    except ValueError:
        corpo = None
    return Resposta(status, corpo, cab)


def verificar(condicao: bool, mensagem: str) -> None:
    if not condicao:
        raise AssertionError(mensagem)


class Suite:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.resultados: list[Resultado] = []
        self.filme_id: Optional[int] = None
        self.filme_nome: Optional[str] = None

    def caso(self, nome: str, caminho: str, esperado: int,
             conferir: Optional[Callable[[Resposta], None]] = None) -> Optional[Resposta]:
        url = self.base_url + caminho
        rotulo = f"GET {caminho}" if len(caminho) <= 50 else f"GET {caminho[:47]}..."
        resposta = None
        try:
            resposta = requisitar(url)
            verificar(resposta.status == esperado,
                      f"status {resposta.status}, esperado {esperado}")
            if conferir:
                conferir(resposta)
            self.resultados.append(Resultado(nome, rotulo, esperado, resposta.status, True))
            return resposta
        except AssertionError as erro:
            obtido = resposta.status if resposta else None
            self.resultados.append(Resultado(nome, rotulo, esperado, obtido, False, str(erro)))
        except (urllib.error.URLError, OSError) as erro:
            self.resultados.append(Resultado(nome, rotulo, esperado, None, False,
                                             f"API inacessível: {erro}"))
        return None

    # ---- GET /filme --------------------------------------------------------
    def listar(self) -> None:
        def conferir(r: Resposta) -> None:
            dados = r.corpo["data"]
            verificar(isinstance(dados, list) and len(dados) > 0, "lista vazia ou inválida")
            verificar(CAMPOS_FILME <= set(dados[0]), "filme sem todos os campos esperados")
            self.filme_id, self.filme_nome = dados[0]["id"], dados[0]["nome"]

        self.caso("Listar todos os filmes", "/filme", 200, conferir)

        def paginado(r: Resposta) -> None:
            meta = r.corpo["meta"]
            verificar(len(r.corpo["data"]) <= 2, "retornou mais itens que o limit")
            verificar(meta["page"] == 1 and meta["limit"] == 2, "meta.page/limit incorretos")
            verificar(meta["total"] >= len(r.corpo["data"]), "meta.total incoerente")
            verificar("totalPages" in meta, "meta.totalPages ausente")

        self.caso("Listar com paginação (page=1&limit=2)", "/filme?page=1&limit=2", 200, paginado)
        self.caso("Paginação incompleta (só page)", "/filme?page=1", 400,
                  lambda r: verificar(r.corpo["error"]["code"] == "PAGINACAO_INCOMPLETA", "código de erro incorreto"))
        self.caso("Paginação com limit acima do máximo", "/filme?page=1&limit=101", 400,
                  lambda r: verificar(r.corpo["error"]["code"] == "PAGINACAO_FORA_DO_LIMITE", "código de erro incorreto"))

    # ---- GET /filme/:id ----------------------------------------------------
    def buscar_por_id(self) -> None:
        if self.filme_id is None:
            self.resultados.append(Resultado("Buscar filme por ID", "GET /filme/:id", 200, None, False,
                                             "sem ID disponível (a listagem falhou)"))
        else:
            def conferir(r: Resposta) -> None:
                filme = r.corpo["data"]
                verificar(filme["id"] == self.filme_id, "ID retornado diferente do solicitado")
                verificar(CAMPOS_FILME <= set(filme), "filme sem todos os campos esperados")

            self.caso(f"Buscar filme por ID ({self.filme_id})", f"/filme/{self.filme_id}", 200, conferir)

        erro = lambda codigo: (lambda r: verificar(r.corpo["error"]["code"] == codigo, f"esperado código {codigo}"))
        self.caso("ID inexistente", "/filme/2147483647", 404, erro("FILME_NAO_ENCONTRADO"))
        self.caso("ID não numérico", "/filme/abc", 400, erro("ID_INVALIDO"))
        self.caso("ID zero", "/filme/0", 400, erro("ID_INVALIDO"))
        self.caso("ID negativo", "/filme/-1", 400, erro("ID_INVALIDO"))
        self.caso("ID decimal", "/filme/1.5", 400, erro("ID_INVALIDO"))

    # ---- GET /filtro/filme?nome= -------------------------------------------
    def filtrar(self) -> None:
        erro = lambda codigo: (lambda r: verificar(r.corpo["error"]["code"] == codigo, f"esperado código {codigo}"))

        if self.filme_nome:
            trecho = self.filme_nome[:4]

            def por_nome(r: Resposta) -> None:
                dados = r.corpo["data"]
                verificar(len(dados) >= 1, "nenhum filme encontrado")
                verificar(any(self.filme_nome == f["nome"] for f in dados), "filme esperado não veio no resultado")

            self.caso(f"Filtrar por parte do nome ('{trecho}')",
                      "/filtro/filme?nome=" + urllib.parse.quote(trecho), 200, por_nome)
            self.caso("Filtro ignora maiúsculas/minúsculas",
                      "/filtro/filme?nome=" + urllib.parse.quote(trecho.upper()), 200, por_nome)

        def por_sinopse(r: Resposta) -> None:
            dados = r.corpo["data"]
            verificar(len(dados) >= 1, "nenhum filme encontrado pela sinopse")
            verificar(all("mensagens" in f["sinopse"].lower() or "mensagens" in f["nome"].lower() for f in dados),
                      "resultado não contém o termo buscado")

        self.caso("Filtrar por trecho da sinopse ('mensagens')", "/filtro/filme?nome=mensagens", 200, por_sinopse)
        self.caso("Filtro com acentuação preservada ('cartógrafa')",
                  "/filtro/filme?nome=" + urllib.parse.quote("cartógrafa"), 200,
                  lambda r: verificar(len(r.corpo["data"]) >= 1 and "cartógrafa" in r.corpo["data"][0]["sinopse"],
                                      "acentos corrompidos no banco ou na resposta"))
        self.caso("Filtro sem resultados retorna lista vazia", "/filtro/filme?nome=zzzxyz123", 200,
                  lambda r: verificar(r.corpo["data"] == [], "esperado data = []"))
        self.caso("Filtro com paginação", "/filtro/filme?nome=a&page=1&limit=1", 200,
                  lambda r: verificar(len(r.corpo["data"]) <= 1 and "meta" in r.corpo, "paginação não aplicada"))
        self.caso("Filtro sem parâmetro nome", "/filtro/filme", 400, erro("NOME_OBRIGATORIO"))
        self.caso("Filtro com nome vazio", "/filtro/filme?nome=", 400, erro("NOME_VAZIO"))
        self.caso("Filtro com nome muito longo", "/filtro/filme?nome=" + "x" * 101, 400, erro("NOME_MUITO_LONGO"))
        self.caso("Filtro com tentativa de SQL Injection é tratado como texto",
                  "/filtro/filme?nome=" + urllib.parse.quote("' OR 1=1 --"), 200,
                  lambda r: verificar(r.corpo["data"] == [], "esperado nenhum resultado"))

    # ---- Comportamentos gerais ---------------------------------------------
    def gerais(self) -> None:
        self.caso("Rota inexistente", "/nao-existe", 404,
                  lambda r: verificar(r.corpo["error"]["code"] == "ROTA_NAO_ENCONTRADA", "código incorreto"))

        def cabecalhos(r: Resposta) -> None:
            nomes = {k.lower() for k in r.cabecalhos}
            verificar("x-request-id" in nomes, "cabeçalho X-Request-Id ausente")
            verificar("x-content-type-options" in nomes, "cabeçalhos do Helmet ausentes")
            verificar("x-powered-by" not in nomes, "X-Powered-By não deveria ser exposto")

        self.caso("Cabeçalhos de segurança (Helmet) e rastreio", "/filme", 200, cabecalhos)

    def executar(self) -> None:
        self.listar()
        self.buscar_por_id()
        self.filtrar()
        self.gerais()


def montar_relatorio(base_url: str, resultados: list[Resultado]) -> str:
    linhas = [
        "RELATÓRIO DE TESTES - UniFECAF Flix API",
        f"Data: {datetime.now():%d/%m/%Y %H:%M:%S}",
        f"Base URL: {base_url}",
        "=" * 100,
        f"{'#':>2}  {'RESULTADO':<9} {'ESPERADO':>8} {'OBTIDO':>6}  TESTE",
        "-" * 100,
    ]
    for i, r in enumerate(resultados, 1):
        status = "PASSOU" if r.passou else "FALHOU"
        obtido = "-" if r.obtido is None else str(r.obtido)
        linhas.append(f"{i:>2}  {status:<9} {r.esperado:>8} {obtido:>6}  {r.nome}  [{r.metodo_url}]")
        if r.detalhe:
            linhas.append(f"{'':>30}-> {r.detalhe}")
    passaram = sum(r.passou for r in resultados)
    linhas += ["-" * 100, f"Total: {len(resultados)} | Passaram: {passaram} | Falharam: {len(resultados) - passaram}"]
    return "\n".join(linhas)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Testa os endpoints da API UniFECAF Flix.")
    parser.add_argument("--base-url", default=BASE_URL_PADRAO, help=f"padrão: {BASE_URL_PADRAO}")
    parser.add_argument("--relatorio", help="caminho para salvar o relatório em texto (opcional)")
    args = parser.parse_args()

    try:
        requisitar(args.base_url.rstrip("/") + "/filme")
    except (urllib.error.URLError, OSError) as erro:
        print(f"ERRO: não foi possível conectar à API em {args.base_url}\n({erro})\n")
        print("Antes de rodar os testes:")
        print("  1. Execute sql/controle_filmes.sql no MySQL")
        print("  2. Copie .env.example para .env e ajuste DATABASE_URL")
        print("  3. npm install && npm run db:generate")
        print("  4. Em OUTRO terminal, inicie a API: npm run dev")
        return 2

    suite = Suite(args.base_url)
    suite.executar()
    relatorio = montar_relatorio(args.base_url, suite.resultados)
    print(relatorio)

    if args.relatorio:
        with open(args.relatorio, "w", encoding="utf-8") as arquivo:
            arquivo.write(relatorio + "\n")
        print(f"\nRelatório salvo em: {args.relatorio}")

    return 0 if all(r.passou for r in suite.resultados) else 1


if __name__ == "__main__":
    sys.exit(main())
