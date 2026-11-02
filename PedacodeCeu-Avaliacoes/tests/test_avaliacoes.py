import json

from app.events.assinante import processar_pedido_entregue
from tests.conftest import novo_id, token


def evento_entregue(usuario_id: str, produto_ids: list[str], pedido_id: str | None = None) -> str:
    return json.dumps({
        "id": novo_id(),
        "tipo": "pedido.entregue",
        "ocorridoEm": "2026-11-02T12:00:00.000Z",
        "dados": {"pedidoId": pedido_id or novo_id(), "usuarioId": usuario_id, "produtoIds": produto_ids},
    })


async def test_sem_token_retorna_401(api):
    r = await api.post("/avaliacoes", json={"produtoId": novo_id(), "nota": 5})
    assert r.status_code == 401
    assert r.json() == {"message": "Token não fornecido"}


async def test_nao_comprou_retorna_403(api, back):
    r = await api.post("/avaliacoes", json={"produtoId": novo_id(), "nota": 5}, headers=token())
    assert r.status_code == 403
    assert "entregues" in r.json()["message"]
    assert back.chamadas == 1  # não achou localmente, perguntou ao back


async def test_nota_invalida_retorna_400(api):
    r = await api.post("/avaliacoes", json={"produtoId": novo_id(), "nota": 7}, headers=token())
    assert r.status_code == 400
    assert r.json()["message"] == "Dados inválidos"
    assert r.json()["erros"][0]["campo"] == "nota"


async def test_evento_libera_avaliacao_e_bloqueia_duplicada(api, back):
    usuario, produto = novo_id(), novo_id()
    assert await processar_pedido_entregue(evento_entregue(usuario, [produto])) == 1

    r = await api.post("/avaliacoes", json={"produtoId": produto, "nota": 4, "comentario": "  Muito bom  "},
                       headers=token(usuario, nome="Maria"))
    assert r.status_code == 201, r.text
    corpo = r.json()
    assert corpo["autorNome"] == "Maria"
    assert corpo["comentario"] == "Muito bom"
    assert corpo["usuarioId"] == usuario
    assert back.chamadas == 0  # resolvido pelo banco local, sem HTTP

    r = await api.post("/avaliacoes", json={"produtoId": produto, "nota": 2}, headers=token(usuario))
    assert r.status_code == 409


async def test_evento_repetido_e_idempotente():
    usuario, produto = novo_id(), novo_id()
    evento = evento_entregue(usuario, [produto, produto])
    assert await processar_pedido_entregue(evento) == 1
    assert await processar_pedido_entregue(evento) == 0


async def test_evento_invalido_e_descartado():
    assert await processar_pedido_entregue('{"tipo": "pedido.entregue"}') == 0
    assert await processar_pedido_entregue("isso não é json") == 0


async def test_fallback_http_quando_evento_se_perdeu(api, back):
    usuario, produto = novo_id(), novo_id()
    back.compras.add((usuario, produto))  # o back sabe da compra, mas o evento nunca chegou

    r = await api.post("/avaliacoes", json={"produtoId": produto, "nota": 5}, headers=token(usuario))
    assert r.status_code == 201
    assert back.chamadas == 1

    # A compra ficou registrada localmente: a próxima consulta não chama o back
    r = await api.get(f"/avaliacoes/produto/{produto}/minha", headers=token(usuario))
    assert r.json()["podeAvaliar"] is False
    assert r.json()["avaliacao"]["nota"] == 5
    assert back.chamadas == 1


async def test_back_fora_retry_e_circuit_breaker(api, back):
    back.fora_do_ar = True
    corpo = {"produtoId": novo_id(), "nota": 5}

    r = await api.post("/avaliacoes", json=corpo, headers=token())
    assert r.status_code == 503
    assert back.chamadas == 3  # 3 tentativas (retry)

    r = await api.post("/avaliacoes", json=corpo, headers=token())
    assert r.status_code == 503
    assert back.chamadas == 6  # 2ª falha seguida: circuito abre (limite_falhas=2 no teste)

    r = await api.post("/avaliacoes", json=corpo, headers=token())
    assert r.status_code == 503
    assert back.chamadas == 6  # circuito aberto: recusou sem chamar o back


async def test_minha_quando_back_fora_nao_quebra_a_pagina(api, back):
    back.fora_do_ar = True
    r = await api.get(f"/avaliacoes/produto/{novo_id()}/minha", headers=token())
    assert r.status_code == 200
    assert r.json()["podeAvaliar"] is False
    assert "Tente novamente" in r.json()["motivo"]


async def test_resumo_usa_cache_e_invalida_ao_avaliar(api, redis):
    produto = novo_id()
    u1, u2 = novo_id(), novo_id()
    await processar_pedido_entregue(evento_entregue(u1, [produto]))
    await processar_pedido_entregue(evento_entregue(u2, [produto]))

    await api.post("/avaliacoes", json={"produtoId": produto, "nota": 5}, headers=token(u1))
    r = await api.get(f"/avaliacoes/produto/{produto}/resumo")
    assert r.json()["media"] == 5.0 and r.json()["total"] == 1
    assert await redis.exists(f"avaliacoes:resumo:{produto}")
    assert 0 < await redis.ttl(f"avaliacoes:resumo:{produto}") <= 60

    await api.post("/avaliacoes", json={"produtoId": produto, "nota": 2}, headers=token(u2))
    assert not await redis.exists(f"avaliacoes:resumo:{produto}")  # invalidado no create

    r = await api.get(f"/avaliacoes/produto/{produto}/resumo")
    assert r.json()["media"] == 3.5
    assert r.json()["distribuicao"] == {"1": 0, "2": 1, "3": 0, "4": 0, "5": 1}


async def test_resumo_sem_avaliacoes(api):
    r = await api.get(f"/avaliacoes/produto/{novo_id()}/resumo")
    assert r.status_code == 200
    assert r.json()["media"] is None and r.json()["total"] == 0


async def test_editar_e_remover_permissoes(api):
    dono, outro, produto = novo_id(), novo_id(), novo_id()
    await processar_pedido_entregue(evento_entregue(dono, [produto]))
    avaliacao = (await api.post("/avaliacoes", json={"produtoId": produto, "nota": 3}, headers=token(dono))).json()

    r = await api.put(f"/avaliacoes/{avaliacao['id']}", json={"nota": 1}, headers=token(outro))
    assert r.status_code == 403

    r = await api.put(f"/avaliacoes/{avaliacao['id']}", json={"nota": 4, "comentario": "Melhorou"}, headers=token(dono))
    assert r.status_code == 200 and r.json()["nota"] == 4

    r = await api.delete(f"/avaliacoes/{avaliacao['id']}", headers=token(outro))
    assert r.status_code == 403

    r = await api.delete(f"/avaliacoes/{avaliacao['id']}", headers=token(outro, role="admin"))
    assert r.status_code == 204

    r = await api.delete(f"/avaliacoes/{avaliacao['id']}", headers=token(dono))
    assert r.status_code == 404


async def test_listagem_paginada(api):
    produto = novo_id()
    for nota in (1, 2, 3):
        usuario = novo_id()
        await processar_pedido_entregue(evento_entregue(usuario, [produto]))
        await api.post("/avaliacoes", json={"produtoId": produto, "nota": nota}, headers=token(usuario))

    r = await api.get(f"/avaliacoes/produto/{produto}?pagina=1&limite=2")
    assert r.status_code == 200
    assert len(r.json()["dados"]) == 2
    assert r.json()["meta"] == {"total": 3, "pagina": 1, "limite": 2, "totalPaginas": 2}


async def test_token_invalido(api):
    r = await api.get(f"/avaliacoes/produto/{novo_id()}/minha", headers={"Authorization": "Bearer abc"})
    assert r.status_code == 401
    assert r.json() == {"message": "Token inválido"}
