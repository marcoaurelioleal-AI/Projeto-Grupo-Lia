from dados_operacionais import CHECKLISTS, MANUAIS


def test_manuais_cobrem_todas_as_unidades() -> None:
    assert {"Lia Burguer", "Lia Pizza", "Lia Salgados"} <= set(MANUAIS)


def test_manuais_tem_campos_essenciais() -> None:
    campos = {"titulo", "temperatura", "tempo", "ponto_critico", "procedimentos", "dica"}
    for manual in MANUAIS.values():
        assert campos <= set(manual)
        assert manual["procedimentos"]


def test_checklists_tem_itens_operacionais() -> None:
    assert CHECKLISTS
    for grupos in CHECKLISTS.values():
        assert grupos
        for itens in grupos.values():
            assert itens
