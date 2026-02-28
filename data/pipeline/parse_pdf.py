#!/usr/bin/env python3
"""Parse les fiches PDF Ameli par code NAF pour extraire les données démographiques.

Input:  dossier local contenant des fichiers NAF_*.pdf (chemin fourni via --pdf-dir)
Output: dict[naf5, parsed_data] avec données annuelles AT/Trajet/MP, répartition sexe et âge.

Usage:
    python parse_pdf.py --pdf-dir /chemin/vers/pdfs
"""

import argparse
import re
import sys
from pathlib import Path

import pdfplumber


def parse_fr_number(s: str) -> int:
    """Parse un nombre au format français (espaces comme séparateurs de milliers) vers int."""
    return int(s.replace(" ", "").replace("\u00a0", ""))


def parse_table_row_numbers(digit_groups: list[str], max_values: list[int]) -> list[int]:
    """Parse des groupes de chiffres en valeurs de colonnes selon les règles françaises.

    Utilise max_values par colonne pour distinguer séparateurs de milliers et sauts de colonnes.
    Un groupe de 3 chiffres est traité comme continuation de milliers seulement si le résultat
    combiné reste dans la plage maximale de la colonne courante.
    """
    values = []
    current = -1  # -1 = pas de valeur commencée

    for group in digit_groups:
        n = int(group)
        if current > 0 and len(group) == 3:
            candidate = current * 1000 + n
            col_idx = len(values)
            if col_idx < len(max_values) and candidate <= max_values[col_idx]:
                current = candidate
                continue
        # Nouvelle valeur
        if current >= 0:
            values.append(current)
        current = n

    if current >= 0:
        values.append(current)
    return values


# Valeurs maximales plausibles par colonne : [AT_1er_regl, nouvelles_IP, deces, journees_perdues]
# Niveau NAF5 : AT max ~120k, IP max ~10k, décès max ~200, journées max ~10M
ROW_MAX_VALUES = [200_000, 20_000, 500, 50_000_000]

# Valeurs max adaptatives pour le parsing des lignes annuelles (strict -> mid -> relaxed).
YEARLY_MAX = {
    "at": {
        "strict":  {"count": [999] * 5, "ip": [999] * 5, "deces": [99] * 5, "journees": [999] * 5, "salaries": [999] * 5},
        "mid":     {"count": [50_000] * 5, "ip": [9_999] * 5, "deces": [99] * 5, "journees": [9_999] * 5, "salaries": [9_999] * 5},
        "relaxed": {"count": [200_000] * 5, "ip": [20_000] * 5, "deces": [500] * 5, "journees": [50_000_000] * 5, "salaries": [999_999] * 5},
    },
    "trajet": {
        "strict":  {"count": [999] * 5, "ip": [999] * 5, "deces": [99] * 5, "journees": [999] * 5},
        "mid":     {"count": [9_999] * 5, "ip": [999] * 5, "deces": [99] * 5, "journees": [9_999] * 5},
        "relaxed": {"count": [15_000] * 5, "ip": [5_000] * 5, "deces": [100] * 5, "journees": [999_999] * 5},
    },
    "mp": {
        "strict":  {"count": [999] * 5, "ip": [999] * 5, "deces": [99] * 5, "journees": [999] * 5},
        "mid":     {"count": [9_999] * 5, "ip": [9_999] * 5, "deces": [99] * 5, "journees": [9_999] * 5},
        "relaxed": {"count": [50_000] * 5, "ip": [20_000] * 5, "deces": [100] * 5, "journees": [10_000_000] * 5},
    },
}
YEARLY_YEARS = ["2019", "2020", "2021", "2022", "2023"]


def _parse_yearly_row(digit_groups: list[str], section: str, key: str) -> list[int]:
    """Parse une ligne annuelle en essayant strict -> mid -> relaxed pour obtenir exactement 5 valeurs."""
    for level in ["strict", "mid", "relaxed"]:
        max_vals = YEARLY_MAX[section][level][key]
        result = parse_table_row_numbers(digit_groups, max_vals)
        if len(result) == 5:
            return result
    return parse_table_row_numbers(digit_groups, YEARLY_MAX[section]["strict"][key])


def _parse_yearly_section(page_text: str, section: str) -> dict[str, dict] | None:
    """Extrait un tableau annuel (5 années) depuis le texte de la page 1.

    Args:
        page_text: texte de la page recadrée à 55% de largeur
        section: "at", "trajet" ou "mp"

    Returns: {"2019": {"count": N, "ip": N, "deces": N, "journees": N, "salaries": N?}, ...}
    """
    headers = {
        "at": "Accidents du travail",
        "trajet": "Accidents de trajet",
        "mp": "Maladies professionnelles",
    }
    count_patterns = {
        "at": lambda l: "travail en 1er" in l.lower() or "acc. du travail" in l.lower(),
        "trajet": lambda l: "trajet en 1er" in l.lower() or "acc. de trajet" in l.lower(),
        "mp": lambda l: "mp en 1er" in l.lower(),
    }
    stop_markers = {
        "at": ["Accidents de trajet", "Indice de fr"],
        "trajet": ["Maladies professionnelles", "Indice de fr"],
        "mp": ["Indice de fr", "*Pour les ann"],
    }

    lines = page_text.split("\n")
    in_section = False
    raw = {"count": [], "ip": [], "deces": [], "journees": [], "salaries": []}

    for line in lines:
        if headers[section] in line and "2019" in line:
            in_section = True
            continue
        if not in_section:
            continue

        if any(line.startswith(m) for m in stop_markers[section]):
            break

        # La ligne salariés n'a pas de deux-points (section AT uniquement)
        if "salariés" in line and ":" not in line and section == "at":
            digit_groups = re.findall(r"\d+", line.split("salariés")[1])
            if digit_groups:
                raw["salaries"] = _parse_yearly_row(digit_groups, "at", "salaries")
            continue

        if ":" not in line:
            continue
        after_colon = line.split(":", 1)[1]
        after_colon = re.split(r"[A-Za-zÀ-ÿ]{2,}", after_colon)[0]
        digit_groups = re.findall(r"\d+", after_colon)
        if not digit_groups:
            continue

        if count_patterns[section](line):
            raw["count"] = _parse_yearly_row(digit_groups, section, "count")
        elif "nouvelles ip" in line.lower():
            raw["ip"] = _parse_yearly_row(digit_groups, section, "ip")
        elif "décès" in line.lower() or "deces" in line.lower():
            raw["deces"] = _parse_yearly_row(digit_groups, section, "deces")
        elif "journées perdues" in line.lower() or "journees perdues" in line.lower():
            raw["journees"] = _parse_yearly_row(digit_groups, section, "journees")

        if raw["journees"]:
            break

    for key in ["count", "ip", "deces", "journees"]:
        if len(raw[key]) != 5:
            return None

    result = {}
    has_salaries = len(raw["salaries"]) == 5
    for i, year in enumerate(YEARLY_YEARS):
        entry = {
            "count": raw["count"][i],
            "ip": raw["ip"][i],
            "deces": raw["deces"][i],
            "journees": raw["journees"][i],
        }
        if has_salaries:
            entry["salaries"] = raw["salaries"][i]
        result[year] = entry
    return result


def _extract_row_at_count(line: str, label_end_pattern: str) -> int | None:
    """Extrait le compte AT (première colonne numérique) depuis une ligne de tableau.

    Args:
        line: ligne de texte complète depuis la cellule du tableau
        label_end_pattern: motif regex correspondant à la fin du label
    """
    m = re.search(label_end_pattern + r"\s+([\d\s]+?)$", line)
    if not m:
        return None
    nums_text = m.group(1).strip()
    digit_groups = re.findall(r"\d+", nums_text)
    if not digit_groups:
        return None
    values = parse_table_row_numbers(digit_groups, ROW_MAX_VALUES)
    return values[0] if values else None


def parse_synthesis(page_text: str) -> dict:
    """Extrait les chiffres de synthèse de la page 1.

    Retourne un dict avec les comptes AT, trajet, MP et les pourcentages d'évolution.
    """
    result = {}

    patterns = [
        ("at", r"Accidents du travail"),
        ("trajet", r"Accidents de trajet"),
        ("mp", r"Maladies professionnelles"),
    ]

    for key, label in patterns:
        m = re.search(label + r"\s+(.+?)\s+([+-]?\d+,\d+)\s*%", page_text)
        if m:
            count_str = m.group(1).strip()
            evo_str = m.group(2)
            result[key] = {
                "count": parse_fr_number(count_str),
                "evolution_pct": float(evo_str.replace(",", ".")),
            }
        else:
            m = re.search(label + r"\s+(\d[\d ]*)", page_text)
            if m:
                result[key] = {
                    "count": parse_fr_number(m.group(1).strip()),
                    "evolution_pct": None,
                }

    return result


def parse_sex(cell_text: str) -> dict[str, int]:
    """Extrait les comptes par sexe depuis le texte d'une cellule de tableau (page 2 AT ou page 3 MP)."""
    result = {}

    for label in ("masculin", "féminin"):
        pattern = re.compile(
            r"\d\s+" + label + r"\s+([\d\s]+?)$", re.MULTILINE | re.IGNORECASE
        )
        m = pattern.search(cell_text)
        if not m:
            continue
        nums_text = m.group(1).strip()
        digit_groups = re.findall(r"\d+", nums_text)
        values = parse_table_row_numbers(digit_groups, ROW_MAX_VALUES)
        if values:
            key = "masculin" if label == "masculin" else "feminin"
            result[key] = values[0]

    return result


def parse_age(cell_text: str) -> dict[str, int]:
    """Extrait les comptes AT par tranche d'âge depuis le texte d'une cellule de tableau (page 2).

    Utilise les 9 tranches d'âge originales du PDF.
    """
    age_patterns = [
        ("<20", r"Moins de 20 ans"),
        ("20-24", r"de 20 [àa] 24 ans"),
        ("25-29", r"de 25 [àa] 29 ans"),
        ("30-34", r"de 30 [àa] 34 ans"),
        ("35-39", r"de 35 [àa] 39 ans"),
        ("40-49", r"de 40 [àa] 49 ans"),
        ("50-59", r"de 50 [àa] 59 ans"),
        ("60-64", r"de 60 [àa] 64 ans"),
        ("65+", r"65 ans et plus"),
    ]

    result = {}
    for group_name, pattern in age_patterns:
        m = re.search(
            r"\d+\s*" + pattern + r"\s+([\d\s]+?)$",
            cell_text,
            re.MULTILINE,
        )
        if m:
            nums_text = m.group(1).strip()
            digit_groups = re.findall(r"\d+", nums_text)
            values = parse_table_row_numbers(digit_groups, ROW_MAX_VALUES)
            result[group_name] = values[0] if values else 0
        else:
            result[group_name] = 0

    return result


def parse_siege_lesions(cell_text: str) -> dict[str, int]:
    """Extrait les comptes AT par siège des lésions depuis le texte d'une cellule de tableau (page 2)."""
    siege_patterns = [
        ("non_determine", r"Localisation de la blessure non d[ée]termin[ée]e"),
        ("tete", r"T[êe]te, sans autre sp[ée]cification"),
        ("cou", r"Cou, dont colonne vert[ée]brale"),
        ("dos", r"Dos, dont colonne vert[ée]brale"),
        ("torse", r"Torse et organes"),
        ("membres_superieurs", r"Membres sup[ée]rieurs"),
        ("membres_inferieurs", r"Membres inf[ée]rieurs"),
        ("corps_entier", r"Ensemble du corps"),
        ("autres", r"Autres parties du corps"),
    ]

    result = {}
    for group_name, pattern in siege_patterns:
        m = re.search(
            r"\d+\s*" + pattern + r".*?\s+([\d\s]+?)$",
            cell_text,
            re.MULTILINE,
        )
        if m:
            nums_text = m.group(1).strip()
            digit_groups = re.findall(r"\d+", nums_text)
            values = parse_table_row_numbers(digit_groups, ROW_MAX_VALUES)
            result[group_name] = values[0] if values else 0
        else:
            result[group_name] = 0

    return result


def _extract_section(cell_text: str, header: str, stop_headers: list[str]) -> str:
    """Extrait le texte entre un header de section et le prochain header (ou la fin)."""
    lines = cell_text.split("\n")
    in_section = False
    section_lines = []
    for line in lines:
        if header in line.upper():
            in_section = True
            continue
        if in_section:
            if any(h in line.upper() for h in stop_headers):
                break
            section_lines.append(line)
    return "\n".join(section_lines)


def _parse_section_rows(section_text: str, patterns: list[tuple[str, str]]) -> dict[str, int]:
    """Parse les lignes d'une section de répartition avec les patterns donnés."""
    result = {}
    for group_name, pattern in patterns:
        m = re.search(
            r"\d+\s*" + pattern + r".*?\s+([\d\s]+?)$",
            section_text,
            re.MULTILINE,
        )
        if m:
            nums_text = m.group(1).strip()
            digit_groups = re.findall(r"\d+", nums_text)
            values = parse_table_row_numbers(digit_groups, ROW_MAX_VALUES)
            result[group_name] = values[0] if values else 0
        else:
            result[group_name] = 0
    return result


def parse_activite_physique(cell_text: str) -> dict[str, int]:
    """Extrait les comptes AT par activité physique spécifique depuis une cellule (page 2, cell [1][6])."""
    section = _extract_section(cell_text, "ACTIVITE PHYSIQUE", ["REPARTITION", "MODALITE"])
    return _parse_section_rows(section, [
        ("operation_machine", r"Op[ée]ration de machine"),
        ("outils_main", r"Travail avec des outils [àa] main"),
        ("conduite_transport", r"Conduite/pr[ée]sence moyen de transport"),
        ("manipulation_objets", r"Manipulation d.objets"),
        ("transport_manuel", r"Transport manuel"),
        ("mouvement", r"Mouvement"),
        ("presence", r"Pr[ée]sence"),
        ("autre", r"Autre ou sans information"),
    ])


def parse_modalite_blessure(cell_text: str) -> dict[str, int]:
    """Extrait les comptes AT par modalité de la blessure depuis une cellule (page 2, cell [1][6])."""
    section = _extract_section(cell_text, "MODALITE DE LA BLESSURE", ["REPARTITION", "(1)"])
    return _parse_section_rows(section, [
        ("contact_electrique", r"Contact courant [ée]lectrique"),
        ("noyade_ensevelissement", r"Noyade, ensevelissement"),
        ("ecrasement_mouvement", r"[ÉE]crasement mouvement"),
        ("heurt_objet", r"Heurt par objet"),
        ("contact_coupant", r"Contact agent mat[ée]riel coupant"),
        ("coincement", r"Coincement, [ée]crasement"),
        ("contrainte_corps", r"Contrainte du corps"),
        ("morsure", r"Morsure, coup de pied"),
        ("autre", r"Autre ou sans information"),
    ])


def parse_one_pdf(path: str | Path) -> dict | None:
    """Parse une seule fiche PDF NAF.

    Retourne:
        {
            "synthesis": {"at": {count, evo}, "trajet": {count, evo}, "mp": {count, evo}},
            "at_yearly": {"2019": {count, ip, deces, journees}, ...},
            "trajet_yearly": {"2019": {count, ip, deces, journees}, ...},
            "mp_yearly": {"2019": {count, ip, deces, journees}, ...},
            "sex": {"masculin": int, "feminin": int},
            "age": {"<20": int, "20-24": int, ...},
            "mp_sex": {"masculin": int, "feminin": int},
            "mp_age": {"<20": int, "20-24": int, ...}
        }
    """
    try:
        pdf = pdfplumber.open(path)
    except Exception as e:
        print(f"  ERREUR ouverture {path}: {e}")
        return None

    try:
        p1 = pdf.pages[0]
        p1_text = p1.extract_text()
        synthesis = parse_synthesis(p1_text)

        # Recadrer les 55% gauches de la page 1 pour éviter le chevauchement des graphiques
        cropped = p1.crop((0, 0, p1.width * 0.55, p1.height * 0.35))
        cropped_text = cropped.extract_text()

        at_yearly = _parse_yearly_section(cropped_text, "at")
        trajet_yearly = _parse_yearly_section(cropped_text, "trajet")
        mp_yearly = _parse_yearly_section(cropped_text, "mp")

        # Page 2 : détail AT (sexe + âge)
        p2 = pdf.pages[1]
        tables = p2.extract_tables()
        sex = {}
        age = {}

        siege = {}

        if len(tables) >= 3 and len(tables[2]) >= 2 and tables[2][1][0]:
            cell_text = tables[2][1][0]
            sex = parse_sex(cell_text)
            age = parse_age(cell_text)
            siege = parse_siege_lesions(cell_text)

        # Page 2 right side: activité physique + modalité blessure (cell [1][6])
        activite = {}
        modalite = {}
        if len(tables) >= 3 and len(tables[2]) >= 2 and len(tables[2][1]) >= 7 and tables[2][1][6]:
            right_cell = tables[2][1][6]
            activite = parse_activite_physique(right_cell)
            modalite = parse_modalite_blessure(right_cell)

        # Page 3 : détail MP (sexe + âge) - même format, index de tableau différent
        mp_sex = {}
        mp_age = {}
        if len(pdf.pages) >= 3:
            p3 = pdf.pages[2]
            mp_tables = p3.extract_tables()
            if len(mp_tables) >= 2 and len(mp_tables[1]) >= 2 and mp_tables[1][1][0]:
                mp_cell_text = mp_tables[1][1][0]
                mp_sex = parse_sex(mp_cell_text)
                mp_age = parse_age(mp_cell_text)

        return {
            "synthesis": synthesis,
            "at_yearly": at_yearly,
            "trajet_yearly": trajet_yearly,
            "mp_yearly": mp_yearly,
            "sex": sex,
            "age": age,
            "siege_lesions": siege,
            "activite_physique": activite,
            "modalite_blessure": modalite,
            "mp_sex": mp_sex,
            "mp_age": mp_age,
        }
    except Exception as e:
        print(f"  ERREUR parsing {path}: {e}")
        return None
    finally:
        pdf.close()


def parse_all_pdfs(pdf_dir: Path) -> dict[str, dict]:
    """Parse tous les PDFs NAF depuis un dossier local.

    Args:
        pdf_dir: chemin vers le dossier contenant les fichiers NAF_*.pdf

    Retourne {naf5: parsed_data} pour tous les PDFs traités avec succès.
    """
    pdf_files = sorted(pdf_dir.glob("NAF_*.pdf"))
    total = len(pdf_files)
    print(f"{total} fichier(s) PDF trouvé(s) dans {pdf_dir}")

    if total == 0:
        print("  Aucun fichier NAF_*.pdf trouvé. Vérifiez le chemin et le contenu du dossier.")
        return {}

    results = {}
    failures = []

    for i, pdf_path in enumerate(pdf_files, 1):
        naf5 = pdf_path.stem.replace("NAF_", "")
        print(f"  [{i}/{total}] Traitement de {pdf_path.name}...")

        parsed = parse_one_pdf(pdf_path)
        if parsed:
            results[naf5] = parsed
        else:
            failures.append(naf5)

    print(f"\nRésumé : {len(results)} PDF(s) traité(s) avec succès, {len(failures)} échec(s)")
    if failures:
        print(f"  Echecs : {failures[:20]}{'...' if len(failures) > 20 else ''}")

    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse les fiches PDF NAF pour extraire les données démographiques (sinistralité)"
    )
    parser.add_argument(
        "--pdf-dir",
        required=True,
        help="Chemin vers le dossier contenant les fichiers NAF_*.pdf",
    )
    args = parser.parse_args()

    pdf_dir = Path(args.pdf_dir)

    if not pdf_dir.exists():
        print(f"Erreur : le dossier '{pdf_dir}' n'existe pas.", file=sys.stderr)
        sys.exit(1)

    if not pdf_dir.is_dir():
        print(f"Erreur : '{pdf_dir}' n'est pas un dossier.", file=sys.stderr)
        sys.exit(1)

    pdf_files = list(pdf_dir.glob("NAF_*.pdf"))
    if not pdf_files:
        print(
            f"Avertissement : aucun fichier NAF_*.pdf trouvé dans '{pdf_dir}'.",
            file=sys.stderr,
        )

    import json

    results = parse_all_pdfs(pdf_dir)
    if results:
        sample_key = next(iter(results))
        print(f"\nExemple (NAF {sample_key}) :")
        print(json.dumps(results[sample_key], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
