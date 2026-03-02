#!/usr/bin/env python3
"""Extrait les données AT (Tableau 9) et Trajet (Tableau 17) du rapport annuel PDF.

Input:  rapport annuel Assurance Maladie - Risques professionnels (PDF fourni via --pdf)
Output: data/regional-data.json avec données par caisse régionale pour les années 2020-2024.

Usage:
    python parse_regional.py --pdf /chemin/vers/rapport-annuel.pdf
    python parse_regional.py --pdf /chemin/vers/rapport-annuel.pdf --out /chemin/vers/sortie.json
    python parse_regional.py --pdf /chemin/vers/rapport-annuel.pdf --dry-run
"""

import argparse
import json
import re
import sys
import unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path

import pdfplumber


# Années couvertes par le rapport annuel
YEARS = ["2020", "2021", "2022", "2023", "2024"]

# Correspondance département -> (identifiant stable, nom canonique, type)
# Format des noms dans le PDF: "NN – NomAbrégé" (numéro de département + tiret + nom court)
# Les numéros DOM-TOM (971-976 pour AT, 71-76 pour Trajet) correspondent aux CGSS/CSS.
DEPT_MAP = {
    "13": ("sud-est", "Carsat Sud-Est", "carsat"),
    "21": ("bourgogne-franche-comte", "Carsat Bourgogne-Franche-Comté", "carsat"),
    "31": ("midi-pyrenees", "Carsat Midi-Pyrénées", "carsat"),
    "33": ("aquitaine", "Carsat Aquitaine", "carsat"),
    "34": ("languedoc-roussillon", "Carsat Languedoc-Roussillon", "carsat"),
    "35": ("bretagne", "Carsat Bretagne", "carsat"),
    "44": ("pays-de-la-loire", "Carsat Pays de la Loire", "carsat"),
    "45": ("centre-val-de-loire", "Carsat Centre-Val de Loire", "carsat"),
    "54": ("nord-est", "Carsat Nord-Est", "carsat"),
    "59": ("nord-picardie", "Carsat Nord-Picardie", "carsat"),
    "63": ("auvergne", "Carsat Auvergne", "carsat"),
    "67": ("alsace-moselle", "Carsat Alsace-Moselle", "carsat"),
    "69": ("rhone-alpes", "Carsat Rhône-Alpes", "carsat"),
    "75": ("cramif", "CRAMIF", "cramif"),
    "76": ("normandie", "Carsat Normandie", "carsat"),
    "87": ("centre-ouest", "Carsat Centre-Ouest", "carsat"),
    # DOM-TOM: Tableau 9 utilise 971-976, Tableau 17 utilise 71-76.
    "71": ("cgss-guadeloupe", "CGSS Guadeloupe", "cgss"),
    "72": ("cgss-martinique", "CGSS Martinique", "cgss"),
    "73": ("cgss-guyane", "CGSS Guyane", "cgss"),
    "74": ("cgss-reunion", "CGSS La Réunion", "cgss"),
    "25": ("css-mayotte", "CSS Mayotte", "css"),
    "971": ("cgss-guadeloupe", "CGSS Guadeloupe", "cgss"),
    "972": ("cgss-martinique", "CGSS Martinique", "cgss"),
    "973": ("cgss-guyane", "CGSS Guyane", "cgss"),
    "974": ("cgss-reunion", "CGSS La Réunion", "cgss"),
    "976": ("css-mayotte", "CSS Mayotte", "css"),
}

# CAISSE_MAP conservé pour la compatibilité avec les tests unitaires existants.
# Clés: noms canoniques. Valeur: (identifiant stable, type).
CAISSE_MAP = {
    "CRAMIF": ("cramif", "cramif"),
    "Carsat Normandie": ("normandie", "carsat"),
    "Carsat Nord-Picardie": ("nord-picardie", "carsat"),
    "Carsat Nord-Est": ("nord-est", "carsat"),
    "Carsat Alsace-Moselle": ("alsace-moselle", "carsat"),
    "Carsat Bourgogne-Franche-Comté": ("bourgogne-franche-comte", "carsat"),
    "Carsat Centre-Val de Loire": ("centre-val-de-loire", "carsat"),
    "Carsat Bretagne": ("bretagne", "carsat"),
    "Carsat Pays de la Loire": ("pays-de-la-loire", "carsat"),
    "Carsat Aquitaine": ("aquitaine", "carsat"),
    "Carsat Centre-Ouest": ("centre-ouest", "carsat"),
    "Carsat Midi-Pyrénées": ("midi-pyrenees", "carsat"),
    "Carsat Languedoc-Roussillon": ("languedoc-roussillon", "carsat"),
    "Carsat Auvergne": ("auvergne", "carsat"),
    "Carsat Rhône-Alpes": ("rhone-alpes", "carsat"),
    "Carsat Sud-Est": ("sud-est", "carsat"),
    # DOM-TOM (présence variable selon l'édition du rapport)
    "CGSS Martinique": ("cgss-martinique", "cgss"),
    "CGSS Guadeloupe": ("cgss-guadeloupe", "cgss"),
    "CGSS Guyane": ("cgss-guyane", "cgss"),
    "CGSS La Réunion": ("cgss-reunion", "cgss"),
    "CSS Mayotte": ("css-mayotte", "css"),
}

# Mots-clés de lignes à exclure (totaux, agrégats nationaux)
EXCLUDE_NAMES = {"total", "ensemble", "france", "france entiere", "france entière",
                 "france metropolitaine", "france métropolitaine"}

# Pattern de numéro de département en début de ligne (2 ou 3 chiffres)
_DEPT_RE = re.compile(r"^\d{2,3}$")


def find_tableau_page(pdf: pdfplumber.PDF, label: str) -> tuple[int, object]:
    """Trouve la première page contenant le label de tableau (ex. "Tableau 9").

    Args:
        pdf: document PDF ouvert avec pdfplumber
        label: texte à rechercher (ex. "Tableau 9", "Tableau 17")

    Returns:
        Tuple (index_page, page) pour la première page trouvée.

    Raises:
        ValueError si le label n'est pas trouvé dans aucune page.
    """
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ""
        if label in text:
            print(f"  {label} trouvé à la page {i + 1} (index {i})", file=sys.stderr)
            return i, page
    raise ValueError(
        f"Label '{label}' introuvable dans le PDF. "
        "Vérifiez que le bon fichier a été fourni."
    )


def merge_multiline_rows(raw_rows: list) -> list:
    """Fusionne les lignes de continuation où les colonnes numériques sont None.

    Dans le rapport annuel, certains noms de caisses s'étendent sur deux lignes PDF.
    pdfplumber retourne deux lignes consécutives: la première avec les valeurs numériques,
    la seconde avec la suite du nom et None pour toutes les colonnes suivantes.

    Args:
        raw_rows: lignes brutes retournées par pdfplumber extract_table()

    Returns:
        Lignes fusionnées (liste de listes mutable).
    """
    merged = []
    for row in raw_rows:
        if not row:
            continue
        # Ligne entièrement None: ignorer
        if all(cell is None for cell in row):
            continue
        # Ligne de continuation: toutes les colonnes sauf la première sont None
        if all(cell is None for cell in row[1:]):
            if merged and row[0]:
                # Ajouter la suite du nom de caisse avec un espace
                merged[-1][0] = (merged[-1][0] or "") + " " + row[0].strip()
            continue
        merged.append(list(row))
    return merged


def normalize_caisse_name(s: str) -> str:
    """Normalise un nom de caisse: espaces unifiés, unicode NFC, strip.

    Args:
        s: nom brut extrait du PDF (peut contenir \\n, espaces multiples)

    Returns:
        Nom normalisé prêt pour la recherche dans CAISSE_MAP.
    """
    if not s:
        return ""
    s = " ".join(s.split())  # fusionne \\n, tabulations et espaces multiples
    s = unicodedata.normalize("NFC", s)
    return s.strip()


def parse_fr_number(s: str) -> int | None:
    """Parse un nombre au format français vers int.

    Gère les espaces ordinaires et les espaces insécables (\\u00a0) comme séparateurs de milliers.
    Retourne None en cas d'échec au lieu de lever une exception.

    Args:
        s: chaîne à parser (ex. "12 345", "12\\u00a0345", "0")

    Returns:
        Entier parsé, ou None si la chaîne est vide ou invalide.
    """
    if not s:
        return None
    try:
        return int(s.replace(" ", "").replace("\u00a0", "").replace("\xa0", ""))
    except (ValueError, AttributeError):
        return None


def _is_header_row(row: list) -> bool:
    """Vérifie si une ligne est une ligne d'en-tête (contient des années sur 4 chiffres).

    Args:
        row: ligne de tableau (liste de chaînes ou None)

    Returns:
        True si la ligne contient au moins une cellule correspondant à une année (20xx).
    """
    for cell in row:
        if cell and re.search(r"^20\d{2}$", str(cell).strip()):
            return True
    return False


def _detect_year_columns(rows: list) -> dict[str, int]:
    """Détecte les indices de colonnes correspondant aux années.

    Parcourt les premières lignes pour trouver les cellules contenant des années (20xx).

    Args:
        rows: toutes les lignes du tableau (après fusion multi-lignes)

    Returns:
        Dict {annee_str: col_index}, ex. {"2020": 2, "2021": 3, ...}
    """
    year_cols = {}
    for row in rows[:5]:  # Chercher dans les 5 premières lignes
        for j, cell in enumerate(row):
            if cell and re.search(r"^20\d{2}$", str(cell).strip()):
                year_str = str(cell).strip()
                if year_str not in year_cols:
                    year_cols[year_str] = j
    return year_cols


def _detect_salary_column(rows: list) -> int | None:
    """Détecte l'indice de la colonne effectifs salariés dans l'en-tête.

    Cherche une cellule contenant "salar" (insensible à la casse) dans les premières lignes.

    Args:
        rows: lignes brutes du tableau

    Returns:
        Indice de colonne ou None si non trouvé.
    """
    for row in rows[:5]:
        for j, cell in enumerate(row):
            if cell and "salar" in str(cell).lower():
                return j
    return None


def _words_by_row(page: object, y_tolerance: int = 8) -> dict[int, list]:
    """Regroupe les mots pdfplumber par ligne (coordonnée y).

    Args:
        page: objet page pdfplumber
        y_tolerance: fenêtre (en points) pour regrouper les mots sur la même ligne

    Returns:
        Dict {y_bin: [mots triés par x]}
    """
    words = page.extract_words(x_tolerance=3, y_tolerance=3)
    rows = defaultdict(list)
    for w in words:
        y_bin = round(w["top"] / y_tolerance) * y_tolerance
        rows[y_bin].append(w)
    return {y: sorted(ws, key=lambda w: w["x0"]) for y, ws in rows.items()}


def _detect_col_centers(rows_by_y: dict) -> list[float]:
    """Détecte les centres x des colonnes de données depuis la ligne d'en-tête.

    Recherche les mots "Salariés*", "AT**" ou "Trajet**" dans les premières lignes.

    Args:
        rows_by_y: dict {y_bin: [mots]}

    Returns:
        Liste ordonnée des centres x des colonnes de données (10 colonnes pour 5 années).
    """
    col_centers = []
    for y in sorted(rows_by_y.keys()):
        words = rows_by_y[y]
        texts = [w["text"] for w in words]
        if any(t in ("Salariés*", "AT**", "Trajet**") for t in texts):
            for w in words:
                if w["text"] in ("Salariés*", "AT**", "Trajet**"):
                    col_centers.append((w["x0"] + w["x1"]) / 2)
            if len(col_centers) >= 8:
                break
    return col_centers


def _nearest_col(cx: float, col_centers: list[float]) -> int:
    """Trouve l'indice de la colonne la plus proche d'un centre x.

    Args:
        cx: centre x du mot à assigner
        col_centers: liste des centres x de chaque colonne

    Returns:
        Indice de colonne (0-based).
    """
    if not col_centers:
        return -1
    return min(range(len(col_centers)), key=lambda i: abs(col_centers[i] - cx))


def _is_data_token(text: str) -> bool:
    """Vérifie si un token est une valeur numérique ou un tiret de valeur absente."""
    return bool(re.match(r"^\d+$", text.replace("\xa0", "").replace("\u00a0", ""))) or text in ("-", "–")


def extract_regional_table_by_coords(
    page: object, label: str, has_salaries: bool
) -> list[dict]:
    """Extrait les données d'un tableau régional via les coordonnées de mots.

    Le tableau du rapport annuel présente deux caisses côte à côte par rangée visuelle,
    ce qui fausse l'extraction par extract_table(). Cette fonction utilise extract_words()
    avec les coordonnées x pour assigner chaque token numérique à la bonne colonne.

    Chaque caisse occupe une ou plusieurs lignes ayant le même bloc de données numériques.
    Le numéro de département en début de ligne identifie le début d'une nouvelle caisse.

    Args:
        page: objet page pdfplumber
        label: label du tableau (ex. "Tableau 9") pour ancrer la recherche de l'en-tête
        has_salaries: True pour Tableau 9 (colonnes alternent Salariés/AT),
                      False pour Tableau 17 (colonnes alternent Salariés/Trajet)

    Returns:
        Liste de dicts {"id": str, "name": str, "type": str, "values": dict, "salaries": dict|None}
    """
    rows_by_y = _words_by_row(page)
    col_centers = _detect_col_centers(rows_by_y)

    if not col_centers:
        print(f"  AVERTISSEMENT: colonnes non détectées pour {label}", file=sys.stderr)
        return []

    # Vérifier que le label est bien présent sur la page
    page_text = page.extract_text() or ""
    if label not in page_text:
        print(f"  AVERTISSEMENT: label '{label}' introuvable sur la page", file=sys.stderr)
        return []

    # Trouver la y-position minimale du label pour ignorer le texte au-dessus
    label_y = None
    for y in sorted(rows_by_y.keys()):
        texts = [w["text"] for w in rows_by_y[y]]
        # Le label est souvent sur une ligne contenant "Tableau" + numéro
        combined = " ".join(texts)
        if label in combined:
            label_y = y
            break

    # Accumuler les tokens numériques par colonne pour la caisse en cours
    current_dept = None
    col_buffers: dict[int, list[str]] = defaultdict(list)
    results = []

    def flush() -> None:
        nonlocal current_dept, col_buffers
        if current_dept is None:
            return
        # Reconstruire les 10 valeurs depuis les buffers de colonnes
        numbers: list[int | None] = []
        for col_idx in range(10):
            tokens = col_buffers.get(col_idx, [])
            if not tokens:
                numbers.append(None)
            elif None in tokens:
                numbers.append(None)
            else:
                # Concaténer les chaînes brutes (préserve les zéros initiaux comme dans "034")
                combined = "".join(tokens)
                try:
                    numbers.append(int(combined))
                except ValueError:
                    numbers.append(None)
        results.append({
            "dept": current_dept,
            "numbers": numbers,
        })
        current_dept = None
        col_buffers = defaultdict(list)

    for y in sorted(rows_by_y.keys()):
        if label_y is not None and y <= label_y:
            continue  # ignorer les lignes avant et sur le label

        words = rows_by_y[y]
        texts = [w["text"] for w in words]

        # Fin du tableau
        if texts and texts[0].lower() == "total":
            break

        # Ignorer les lignes d'en-tête et les lignes non-données
        if any(t in ("Salariés*", "AT**", "Trajet**", "Tableau") for t in texts):
            continue

        # Détecter début de nouvelle caisse: premier token = numéro de département
        first_tok = texts[0] if texts else ""
        if _DEPT_RE.match(first_tok):
            flush()
            current_dept = first_tok

        # Traiter les tokens numériques de cette ligne.
        # Si la ligne commence par un numéro de département, les 3 premiers tokens
        # (dept, tiret, début du nom) sont ignorés. Tous les tokens numériques
        # qui suivent le nom de la caisse sont assignés à leurs colonnes de données.
        #
        # Stratégie: parcourir les tokens en deux passes:
        #   1. Identifier où commence la zone numérique (après le nom)
        #   2. Assigner chaque token numérique à la colonne la plus proche
        if _DEPT_RE.match(first_tok):
            # Ligne de caisse: sauter dept + tiret + nom, puis collecter les données.
            # Le nom se termine au premier token dont l'x-position dépasse le début
            # de la zone de données (> x du premier centre de colonne - marge).
            # On utilise la position x pour distinguer le nom (gauche) des données (droite).
            data_x_threshold = col_centers[0] - 30 if col_centers else 130
            skip_dept = True  # ignorer le premier token (numéro de département)
            skip_dash = True  # ignorer le tiret séparateur
            for w in words:
                tok = w["text"]
                tok_clean = tok.replace("\xa0", "").replace("\u00a0", "")
                cx = (w["x0"] + w["x1"]) / 2

                if skip_dept:
                    skip_dept = False
                    continue  # sauter le numéro de département (ex. "21")
                if skip_dash and tok == "–":
                    skip_dash = False
                    continue  # sauter le tiret séparateur

                # Un token est dans la zone données si son centre x dépasse le seuil
                if cx >= data_x_threshold:
                    if current_dept is not None:
                        if tok in ("-", "–"):
                            col = _nearest_col(cx, col_centers)
                            col_buffers[col].append(None)  # type: ignore[arg-type]
                        elif re.match(r"^\d+$", tok_clean):
                            col = _nearest_col(cx, col_centers)
                            col_buffers[col].append(tok_clean)
                # else: partie du nom (à gauche du seuil), ignorer
        else:
            # Ligne de continuation (suite du nom, ou données pures, ou nom+données).
            # Utiliser la position x pour distinguer nom (gauche) et données (droite).
            # Tout token dont le centre x dépasse le seuil est une donnée.
            if current_dept is not None:
                data_x_threshold = col_centers[0] - 30 if col_centers else 130
                for w in words:
                    tok = w["text"]
                    tok_clean = tok.replace("\xa0", "").replace("\u00a0", "")
                    cx = (w["x0"] + w["x1"]) / 2
                    if cx >= data_x_threshold:
                        if tok in ("-", "–"):
                            col = _nearest_col(cx, col_centers)
                            col_buffers[col].append(None)  # type: ignore[arg-type]
                        elif re.match(r"^\d+$", tok_clean):
                            col = _nearest_col(cx, col_centers)
                            col_buffers[col].append(tok_clean)
                    # else: partie du nom à gauche du seuil, ignorer

    flush()

    # Convertir les résultats bruts en entrées de caisse
    entries = []
    for row in results:
        dept = row["dept"]
        numbers = row["numbers"]

        if dept not in DEPT_MAP:
            print(
                f"  AVERTISSEMENT: département non reconnu: '{dept}' (non présent dans DEPT_MAP)",
                file=sys.stderr,
            )
            continue

        caisse_id, canonical_name, caisse_type = DEPT_MAP[dept]

        # Les 10 nombres alternent: Salariés_yr0, DATA_yr0, Salariés_yr1, DATA_yr1, ...
        values: dict[str, int] = {}
        salaries: dict[str, int] = {}

        for i, year in enumerate(YEARS):
            sal_idx = i * 2
            data_idx = i * 2 + 1
            if sal_idx < len(numbers):
                sal = numbers[sal_idx]
                if sal is not None and has_salaries:
                    salaries[year] = sal
            if data_idx < len(numbers):
                val = numbers[data_idx]
                if val is not None:
                    values[year] = val
                else:
                    print(
                        f"  AVERTISSEMENT: valeur absente pour dept {dept} ({canonical_name}) "
                        f"année {year}",
                        file=sys.stderr,
                    )

        entry = {
            "id": caisse_id,
            "name": canonical_name,
            "type": caisse_type,
            "values": values,
            "salaries": salaries if (has_salaries and salaries) else None,
        }
        entries.append(entry)

    return entries


# Alias pour la compatibilité avec l'API historique utilisée dans parse_regional_pdf().
def extract_regional_table(page: object, has_salaries: bool, label: str = "") -> list[dict]:
    """Interface de compatibilité pour extract_regional_table_by_coords().

    Args:
        page: objet page pdfplumber
        has_salaries: True pour Tableau 9 (avec effectifs salariés)
        label: label du tableau à passer à la fonction de base

    Returns:
        Résultat de extract_regional_table_by_coords().
    """
    return extract_regional_table_by_coords(page, label=label, has_salaries=has_salaries)


def validate_output(caisses: list) -> None:
    """Valide le résultat extrait avant d'écrire le fichier JSON.

    Vérifie que le nombre minimum de caisses métropolitaines est présent
    et que chacune a des données AT et Trajet non nulles pour les années 2020-2024.

    Args:
        caisses: liste de dicts au format de sortie final

    Raises:
        AssertionError si les données ne sont pas conformes aux attentes minimales.
    """
    metro = [c for c in caisses if c["type"] in ("carsat", "cramif")]
    assert len(metro) >= 16, (
        f"Seulement {len(metro)} caisses métropolitaines extraites (minimum 16 attendu). "
        "Vérifier le parsing multi-lignes et le filtrage des lignes Total."
    )

    for c in metro:
        for year in YEARS:
            at_val = c.get("at", {}).get(year)
            assert at_val not in (None, 0), (
                f"Donnée AT manquante ou nulle pour {c['id']} année {year}. "
                "Vérifier l'extraction du Tableau 9."
            )
            trajet_val = c.get("trajet", {}).get(year)
            assert trajet_val not in (None, 0), (
                f"Donnée Trajet manquante ou nulle pour {c['id']} année {year}. "
                "Vérifier l'extraction du Tableau 17."
            )

    dom_tom = [c for c in caisses if c["type"] in ("cgss", "css")]
    if len(dom_tom) < 4:
        print(
            f"  AVERTISSEMENT: seulement {len(dom_tom)} caisses DOM-TOM présentes "
            "(4 attendues minimum). Absence possible dans cette édition du rapport.",
            file=sys.stderr,
        )


def parse_regional_pdf(pdf_path: Path) -> dict:
    """Extrait et fusionne les données AT et Trajet depuis le rapport annuel PDF.

    Ouvre le PDF, localise les pages des Tableaux 9 et 17, extrait les données
    par caisse régionale et construit le JSON de sortie selon le schéma défini.

    Args:
        pdf_path: chemin vers le fichier PDF du rapport annuel

    Returns:
        Dict conforme au schéma regional-data.json (meta + caisses).

    Raises:
        ValueError si Tableau 9 ou Tableau 17 n'est pas trouvé dans le PDF.
        AssertionError si la validation du résultat échoue.
    """
    print(f"Ouverture du PDF: {pdf_path}", file=sys.stderr)

    with pdfplumber.open(pdf_path) as pdf:
        print(f"  Nombre de pages: {len(pdf.pages)}", file=sys.stderr)

        # Localiser les pages des tableaux
        _, page_t9 = find_tableau_page(pdf, "Tableau 9")
        _, page_t17 = find_tableau_page(pdf, "Tableau 17")

        # Extraire les données AT (avec salariés)
        print("Extraction des données AT (Tableau 9)...", file=sys.stderr)
        at_rows = extract_regional_table(page_t9, has_salaries=True, label="Tableau 9")
        print(f"  {len(at_rows)} entrées AT extraites", file=sys.stderr)

        # Extraire les données Trajet (sans salariés)
        print("Extraction des données Trajet (Tableau 17)...", file=sys.stderr)
        trajet_rows = extract_regional_table(page_t17, has_salaries=False, label="Tableau 17")
        print(f"  {len(trajet_rows)} entrées Trajet extraites", file=sys.stderr)

    # Indexer par identifiant caisse
    at_by_id = {r["id"]: r for r in at_rows}
    trajet_by_id = {r["id"]: r for r in trajet_rows}

    # Fusionner AT et Trajet par caisse
    all_ids = set(at_by_id.keys()) | set(trajet_by_id.keys())
    caisses = []

    for caisse_id in sorted(all_ids):
        at_entry = at_by_id.get(caisse_id)
        trajet_entry = trajet_by_id.get(caisse_id)

        if at_entry is None and trajet_entry is None:
            continue

        # Métadonnées depuis l'entrée disponible (priorité AT)
        ref = at_entry or trajet_entry
        caisse = {
            "id": caisse_id,
            "name": ref["name"],
            "type": ref["type"],
            "at": at_entry["values"] if at_entry else {},
            "trajet": trajet_entry["values"] if trajet_entry else {},
        }

        # Salariés uniquement depuis Tableau 9 (AT)
        if at_entry and at_entry.get("salaries"):
            caisse["salaries"] = at_entry["salaries"]

        caisses.append(caisse)

    # Validation avant écriture
    print("Validation des données extraites...", file=sys.stderr)
    validate_output(caisses)
    print(f"  Validation réussie: {len(caisses)} caisses au total", file=sys.stderr)

    # Construire l'objet de sortie complet
    output = {
        "meta": {
            "source": "Rapport annuel Assurance Maladie - Risques professionnels",
            "generated": date.today().isoformat(),
            "years": YEARS,
        },
        "caisses": caisses,
    }

    return output


def main() -> None:
    """Point d'entrée principal du script."""
    parser = argparse.ArgumentParser(
        description=(
            "Extrait les données AT/Trajet par caisse régionale depuis le rapport annuel PDF "
            "et écrit data/regional-data.json."
        )
    )
    parser.add_argument(
        "--pdf",
        required=True,
        help="Chemin vers le rapport annuel PDF (Assurance Maladie - Risques professionnels)",
    )
    parser.add_argument(
        "--out",
        default=None,
        help=(
            "Chemin du fichier JSON de sortie "
            "(défaut: data/regional-data.json relatif au dossier du projet)"
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help=(
            "Mode diagnostic: affiche les noms de caisses et valeurs extraits sans écrire le JSON. "
            "Utile pour vérifier DEPT_MAP avant une extraction complète."
        ),
    )
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(f"Erreur: le fichier PDF '{pdf_path}' n'existe pas.", file=sys.stderr)
        sys.exit(1)

    # Chemin de sortie par défaut: data/regional-data.json relatif à la racine du projet
    if args.out is None:
        script_dir = Path(__file__).resolve().parent
        out_path = script_dir.parent / "regional-data.json"
    else:
        out_path = Path(args.out)

    if args.dry_run:
        # Mode diagnostic: afficher les départements et valeurs sans valider ni écrire
        print("Mode --dry-run: extraction diagnostique uniquement.", file=sys.stderr)
        print(f"Ouverture du PDF: {pdf_path}", file=sys.stderr)
        with pdfplumber.open(pdf_path) as pdf:
            _, page_t9 = find_tableau_page(pdf, "Tableau 9")
            _, page_t17 = find_tableau_page(pdf, "Tableau 17")

            rows_t9 = extract_regional_table_by_coords(page_t9, "Tableau 9", has_salaries=True)
            rows_t17 = extract_regional_table_by_coords(page_t17, "Tableau 17", has_salaries=False)

        print("\n=== Données extraites du Tableau 9 (AT) ===")
        for entry in rows_t9:
            caisse_id = entry["id"]
            name = entry["name"]
            status = "OK" if caisse_id else "INCONNU"
            print(f"  [{status}] {caisse_id} ({name})")
            print(f"    AT:       {entry['values']}")
            if entry.get("salaries"):
                print(f"    Salariés: {entry['salaries']}")

        print("\n=== Données extraites du Tableau 17 (Trajet) ===")
        for entry in rows_t17:
            caisse_id = entry["id"]
            name = entry["name"]
            status = "OK" if caisse_id else "INCONNU"
            print(f"  [{status}] {caisse_id} ({name})")
            print(f"    Trajet:   {entry['values']}")
        return

    # Extraction complète
    try:
        data = parse_regional_pdf(pdf_path)
    except (ValueError, AssertionError) as e:
        print(f"Erreur d'extraction: {e}", file=sys.stderr)
        sys.exit(1)

    # Ecrire le JSON de sortie
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Résumé sur stderr
    caisses = data["caisses"]
    years_found = data["meta"]["years"]
    metro_count = sum(1 for c in caisses if c["type"] in ("carsat", "cramif"))
    domtom_count = sum(1 for c in caisses if c["type"] in ("cgss", "css"))

    print(f"\nFichier écrit: {out_path}", file=sys.stderr)
    print(f"  Caisses totales: {len(caisses)}", file=sys.stderr)
    print(f"  Caisses métropolitaines: {metro_count}", file=sys.stderr)
    print(f"  Caisses DOM-TOM: {domtom_count}", file=sys.stderr)
    print(f"  Années couvertes: {', '.join(years_found)}", file=sys.stderr)


if __name__ == "__main__":
    main()
