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
from datetime import date
from pathlib import Path

import pdfplumber


# Paramètres d'extraction de tableau (stratégie "lines" pour tableaux à bordures)
TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
    "snap_tolerance": 3,
    "join_tolerance": 3,
    "intersection_tolerance": 3,
    "text_x_tolerance": 5,
    "text_y_tolerance": 3,
}

# Années couvertes par le rapport annuel
YEARS = ["2020", "2021", "2022", "2023", "2024"]

# Noms canoniques des caisses tels qu'ils apparaissent dans le rapport annuel Ameli.
# 16 caisses métropolitaines (1 CRAMIF + 15 Carsat) + 5 DOM-TOM (4 CGSS + 1 CSS Mayotte)
# Valeur: (identifiant stable, type)
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


def extract_regional_table(page: object, has_salaries: bool) -> list[dict]:
    """Extrait les données d'un tableau régional depuis une page PDF.

    Gère les caisses métropolitaines et DOM-TOM. Les lignes de totaux et d'agrégats
    sont exclues. Les noms non reconnus dans CAISSE_MAP génèrent un avertissement.

    Args:
        page: objet page pdfplumber
        has_salaries: True pour Tableau 9 (inclut effectifs salariés), False pour Tableau 17

    Returns:
        Liste de dicts avec la structure:
        [{"id": str, "name": str, "type": str, "values": {annee: count}, "salaries": {annee: count} | None}]
    """
    raw_rows = page.extract_table(TABLE_SETTINGS)
    if not raw_rows:
        print("  AVERTISSEMENT: extract_table() a retourné None ou vide", file=sys.stderr)
        return []

    rows = merge_multiline_rows(raw_rows)

    # Détecter les colonnes d'années et de salariés depuis les en-têtes
    year_cols = _detect_year_columns(rows)
    salary_col = _detect_salary_column(rows) if has_salaries else None

    if not year_cols:
        print("  AVERTISSEMENT: aucune colonne d'année détectée dans l'en-tête", file=sys.stderr)

    results = []

    for row in rows:
        # Ignorer les lignes d'en-tête
        if _is_header_row(row):
            continue

        # La première colonne doit contenir un nom de caisse
        raw_name = row[0] if row else None
        if not raw_name:
            continue

        name = normalize_caisse_name(raw_name)
        if not name:
            continue

        # Exclure les lignes de totaux et agrégats
        name_lower = name.lower()
        if name_lower in EXCLUDE_NAMES:
            continue
        # Exclure aussi les lignes qui commencent par ces mots-clés
        if any(name_lower.startswith(excl) for excl in EXCLUDE_NAMES):
            continue

        # Lookup dans CAISSE_MAP
        if name not in CAISSE_MAP:
            print(
                f"  AVERTISSEMENT: caisse non reconnue: '{name}' (non présente dans CAISSE_MAP)",
                file=sys.stderr,
            )
            continue

        caisse_id, caisse_type = CAISSE_MAP[name]

        # Extraire les valeurs par année
        values = {}
        if year_cols:
            for year, col_idx in year_cols.items():
                if year in YEARS and col_idx < len(row):
                    val = parse_fr_number(row[col_idx])
                    if val is not None:
                        values[year] = val
                    else:
                        print(
                            f"  AVERTISSEMENT: valeur None pour {name} année {year} col {col_idx}",
                            file=sys.stderr,
                        )
        else:
            # Fallback: utiliser les colonnes 1..N comme années consécutives
            for i, year in enumerate(YEARS):
                col_idx = i + 1
                if col_idx < len(row):
                    val = parse_fr_number(row[col_idx])
                    if val is not None:
                        values[year] = val

        # Extraire les effectifs salariés (Tableau 9 uniquement)
        salaries = None
        if has_salaries and salary_col is not None:
            # La colonne salariés peut précéder les colonnes d'années
            # Elle contient une seule valeur (non répétée par année dans Tableau 9)
            if salary_col < len(row):
                sal_val = parse_fr_number(row[salary_col])
                if sal_val is not None:
                    # On associe la même valeur à toutes les années disponibles
                    # (le rapport peut fournir une valeur unique ou par année)
                    salaries = {year: sal_val for year in values.keys()}

        entry = {
            "id": caisse_id,
            "name": name,
            "type": caisse_type,
            "values": values,
            "salaries": salaries,
        }
        results.append(entry)

    return results


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
        at_rows = extract_regional_table(page_t9, has_salaries=True)
        print(f"  {len(at_rows)} entrées AT extraites", file=sys.stderr)

        # Extraire les données Trajet (sans salariés)
        print("Extraction des données Trajet (Tableau 17)...", file=sys.stderr)
        trajet_rows = extract_regional_table(page_t17, has_salaries=False)
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
            "Mode diagnostic: affiche les noms de caisses extraits sans écrire le JSON. "
            "Utile pour ajuster CAISSE_MAP avant une extraction complète."
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
        # Mode diagnostic: afficher les noms sans valider ni écrire
        print("Mode --dry-run: extraction des noms de caisses uniquement.", file=sys.stderr)
        print(f"Ouverture du PDF: {pdf_path}", file=sys.stderr)
        with pdfplumber.open(pdf_path) as pdf:
            _, page_t9 = find_tableau_page(pdf, "Tableau 9")
            _, page_t17 = find_tableau_page(pdf, "Tableau 17")

            raw_t9 = page_t9.extract_table(TABLE_SETTINGS) or []
            rows_t9 = merge_multiline_rows(raw_t9)
            raw_t17 = page_t17.extract_table(TABLE_SETTINGS) or []
            rows_t17 = merge_multiline_rows(raw_t17)

        print("\n=== Noms extraits du Tableau 9 (AT) ===")
        for row in rows_t9:
            if row and row[0] and not _is_header_row(row):
                name = normalize_caisse_name(row[0])
                status = "OK" if name in CAISSE_MAP else "INCONNU"
                print(f"  [{status}] '{name}'")

        print("\n=== Noms extraits du Tableau 17 (Trajet) ===")
        for row in rows_t17:
            if row and row[0] and not _is_header_row(row):
                name = normalize_caisse_name(row[0])
                status = "OK" if name in CAISSE_MAP else "INCONNU"
                print(f"  [{status}] '{name}'")
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
