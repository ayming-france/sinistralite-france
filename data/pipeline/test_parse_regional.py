"""Tests unitaires pour les fonctions pures de parse_regional.py.

Ces tests ne nécessitent pas de fichier PDF réel. Ils couvrent:
- merge_multiline_rows()
- normalize_caisse_name()
- parse_fr_number()
- CAISSE_MAP (complétude)
- validate_output()
"""

import unicodedata

import pytest

import parse_regional as m


# ---------------------------------------------------------------------------
# Tests merge_multiline_rows
# ---------------------------------------------------------------------------


def test_merge_multiline_rows_basic():
    """Un nom de caisse sur deux lignes est correctement fusionné."""
    # Première ligne: fragment du nom + valeurs numériques
    # Deuxième ligne: suite du nom + None pour toutes les colonnes suivantes
    raw = [
        ["Carsat Bourgogne-", "12000", "11500", "11800", "11600", "11400"],
        ["Franche-Comté", None, None, None, None, None],
    ]
    merged = m.merge_multiline_rows(raw)
    assert len(merged) == 1
    assert merged[0][0] == "Carsat Bourgogne- Franche-Comté"
    assert merged[0][1] == "12000"


def test_merge_multiline_rows_no_merge_needed():
    """Les lignes sans continuation ne sont pas fusionnées."""
    raw = [
        ["Carsat Bretagne", "12000", "11500", "11800", "11600", "11400"],
        ["Carsat Normandie", "9000", "8800", "9100", "8900", "8700"],
    ]
    merged = m.merge_multiline_rows(raw)
    assert len(merged) == 2
    assert merged[0][0] == "Carsat Bretagne"
    assert merged[1][0] == "Carsat Normandie"


def test_merge_multiline_rows_empty_rows():
    """Les lignes entièrement None sont ignorées."""
    raw = [
        ["Carsat Bretagne", "12000", "11500", "11800", "11600", "11400"],
        [None, None, None, None, None, None],
        ["Carsat Normandie", "9000", "8800", "9100", "8900", "8700"],
    ]
    merged = m.merge_multiline_rows(raw)
    assert len(merged) == 2
    assert merged[0][0] == "Carsat Bretagne"
    assert merged[1][0] == "Carsat Normandie"


def test_merge_multiline_rows_multiple_continuations():
    """Plusieurs caisses avec continuation sont toutes fusionnées correctement."""
    raw = [
        ["Carsat Bourgogne-", "12000", "11500", None, None, None],
        ["Franche-Comté", None, None, None, None, None],
        ["CRAMIF", "80000", "78000", "79000", "77000", "75000"],
        ["Carsat Midi-", "15000", "14800", "15200", "14600", "14400"],
        ["Pyrénées", None, None, None, None, None],
    ]
    merged = m.merge_multiline_rows(raw)
    assert len(merged) == 3
    assert "Franche-Comté" in merged[0][0]
    assert merged[1][0] == "CRAMIF"
    assert "Pyrénées" in merged[2][0]


# ---------------------------------------------------------------------------
# Tests normalize_caisse_name
# ---------------------------------------------------------------------------


def test_normalize_caisse_name_whitespace():
    """Les espaces multiples, tabulations et sauts de ligne sont normalisés."""
    assert m.normalize_caisse_name("Carsat  Bretagne\n") == "Carsat Bretagne"
    assert m.normalize_caisse_name("\tCRST\n  Test  ") == "CRST Test"
    assert m.normalize_caisse_name("Carsat\nNormandie") == "Carsat Normandie"


def test_normalize_caisse_name_unicode():
    """Le texte en forme Unicode décomposée (NFD) est converti en NFC."""
    # Construire "é" en forme décomposée (NFD): e + combining acute accent
    nfd_e = "e" + "\u0301"
    nfd_name = "Carsat Rhon" + nfd_e + "-Alpes"
    # NFC: é composé
    nfc_name = "Carsat Rhône-Alpes"
    result = m.normalize_caisse_name(nfd_name)
    # Le résultat doit être en forme NFC
    assert unicodedata.is_normalized("NFC", result)
    assert result == unicodedata.normalize("NFC", nfd_name)


def test_normalize_caisse_name_empty():
    """Une chaîne vide retourne une chaîne vide."""
    assert m.normalize_caisse_name("") == ""
    assert m.normalize_caisse_name(None) == ""


def test_normalize_caisse_name_already_clean():
    """Un nom déjà propre reste inchangé."""
    name = "Carsat Bretagne"
    assert m.normalize_caisse_name(name) == name


# ---------------------------------------------------------------------------
# Tests parse_fr_number
# ---------------------------------------------------------------------------


def test_parse_fr_number_standard():
    """Les espaces ordinaires comme séparateurs de milliers sont gérés."""
    assert m.parse_fr_number("12 345") == 12345
    assert m.parse_fr_number("1 234 567") == 1234567


def test_parse_fr_number_nbsp():
    """Les espaces insécables (\\u00a0 / \\xa0) sont gérés."""
    assert m.parse_fr_number("12\xa0345") == 12345
    assert m.parse_fr_number("12\u00a0345") == 12345


def test_parse_fr_number_none():
    """Une chaîne vide retourne None."""
    assert m.parse_fr_number("") is None
    assert m.parse_fr_number(None) is None


def test_parse_fr_number_invalid():
    """Une chaîne non numérique retourne None (pas d'exception)."""
    assert m.parse_fr_number("abc") is None
    assert m.parse_fr_number("1.234") is None  # point décimal, pas de milliers


def test_parse_fr_number_zero():
    """Zéro est retourné correctement."""
    assert m.parse_fr_number("0") == 0


def test_parse_fr_number_no_separator():
    """Les nombres sans séparateur de milliers sont parsés correctement."""
    assert m.parse_fr_number("12345") == 12345


# ---------------------------------------------------------------------------
# Tests CAISSE_MAP complétude
# ---------------------------------------------------------------------------


def test_caisse_map_completeness():
    """CAISSE_MAP doit avoir au moins 16 caisses métropolitaines."""
    metro = {
        name: val
        for name, val in m.CAISSE_MAP.items()
        if val[1] in ("carsat", "cramif")
    }
    assert len(metro) >= 16, (
        f"Seulement {len(metro)} caisses métropolitaines dans CAISSE_MAP. "
        "Il doit y en avoir au moins 16 (1 CRAMIF + 15 Carsat)."
    )


def test_caisse_map_total_size():
    """CAISSE_MAP doit avoir au moins 21 entrées (16 metro + 5 DOM-TOM)."""
    assert len(m.CAISSE_MAP) >= 21, (
        f"CAISSE_MAP a seulement {len(m.CAISSE_MAP)} entrées. "
        "Il en faut au moins 21 (16 metro + 5 DOM-TOM)."
    )


def test_caisse_map_types():
    """Chaque entrée de CAISSE_MAP doit avoir un type valide."""
    valid_types = {"cramif", "carsat", "cgss", "css"}
    for name, (caisse_id, caisse_type) in m.CAISSE_MAP.items():
        assert caisse_type in valid_types, (
            f"Type '{caisse_type}' invalide pour la caisse '{name}'. "
            f"Types valides: {valid_types}"
        )


def test_caisse_map_unique_ids():
    """Tous les identifiants de caisses doivent être uniques."""
    ids = [val[0] for val in m.CAISSE_MAP.values()]
    assert len(ids) == len(set(ids)), "Des identifiants de caisse en doublon détectés dans CAISSE_MAP"


def test_caisse_map_dom_tom():
    """CAISSE_MAP doit avoir les 5 caisses DOM-TOM."""
    dom_tom = {
        name: val
        for name, val in m.CAISSE_MAP.items()
        if val[1] in ("cgss", "css")
    }
    assert len(dom_tom) >= 5, (
        f"Seulement {len(dom_tom)} caisses DOM-TOM dans CAISSE_MAP. "
        "Il doit y en avoir au moins 5 (4 CGSS + 1 CSS Mayotte)."
    )


# ---------------------------------------------------------------------------
# Tests validate_output
# ---------------------------------------------------------------------------


def _make_metro_entry(caisse_id: str, caisse_type: str = "carsat") -> dict:
    """Construit une entrée de caisse métropolitaine valide pour les tests."""
    years = ["2020", "2021", "2022", "2023", "2024"]
    return {
        "id": caisse_id,
        "name": f"Carsat {caisse_id}",
        "type": caisse_type,
        "at": {y: 10000 + i * 100 for i, y in enumerate(years)},
        "trajet": {y: 2000 + i * 50 for i, y in enumerate(years)},
        "salaries": {y: 500000 for y in years},
    }


def test_validate_output_passes():
    """validate_output ne lève pas d'exception pour des données valides."""
    caisses = [_make_metro_entry(f"caisse-{i}") for i in range(15)]
    caisses.append(_make_metro_entry("cramif", "cramif"))
    # 15 carsat + 1 cramif = 16 metro, aucune DOM-TOM
    # validate_output émet un warning DOM-TOM mais ne lève pas d'exception
    m.validate_output(caisses)  # Ne doit pas lever d'exception


def test_validate_output_passes_with_domtom():
    """validate_output accepte des données avec caisses DOM-TOM en plus."""
    caisses = [_make_metro_entry(f"caisse-{i}") for i in range(15)]
    caisses.append(_make_metro_entry("cramif", "cramif"))
    # Ajouter des caisses DOM-TOM sans valeurs (warn mais pas d'echec)
    dom_tom_entry = {
        "id": "cgss-martinique",
        "name": "CGSS Martinique",
        "type": "cgss",
        "at": {"2020": 500, "2021": 480},
        "trajet": {"2020": 100, "2021": 95},
    }
    caisses.append(dom_tom_entry)
    m.validate_output(caisses)  # Ne doit pas lever d'exception


def test_validate_output_fails_too_few():
    """validate_output lève AssertionError si moins de 16 caisses métropolitaines."""
    caisses = [_make_metro_entry(f"caisse-{i}") for i in range(10)]
    with pytest.raises(AssertionError, match="10 caisses métropolitaines"):
        m.validate_output(caisses)


def test_validate_output_fails_missing_at():
    """validate_output lève AssertionError si une caisse metro a une valeur AT nulle."""
    caisses = [_make_metro_entry(f"caisse-{i}") for i in range(15)]
    caisses.append(_make_metro_entry("cramif", "cramif"))
    # Corrompre une valeur AT
    caisses[0]["at"]["2022"] = 0
    with pytest.raises(AssertionError, match="AT manquante ou nulle"):
        m.validate_output(caisses)


def test_validate_output_fails_missing_trajet():
    """validate_output lève AssertionError si une caisse metro a une valeur Trajet nulle."""
    caisses = [_make_metro_entry(f"caisse-{i}") for i in range(15)]
    caisses.append(_make_metro_entry("cramif", "cramif"))
    # Corrompre une valeur Trajet
    caisses[3]["trajet"]["2023"] = None
    with pytest.raises(AssertionError, match="Trajet manquante ou nulle"):
        m.validate_output(caisses)
