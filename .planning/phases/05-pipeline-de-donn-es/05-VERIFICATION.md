---
phase: 05-pipeline-de-donn-es
verified: 2026-02-28T10:00:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 5: Pipeline de données - Rapport de vérification

**Phase Goal:** Le projet contient un pipeline Python autonome documenté permettant de régénérer les fichiers JSON depuis les sources ameli.fr sans dépendance externe au projet BPO
**Verified:** 2026-02-28T10:00:00Z
**Status:** passed
**Re-verification:** Non - vérification initiale

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                      | Status     | Evidence                                                                                  |
|----|--------------------------------------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------|
| 1  | refresh_data.py existe dans data/pipeline/ et est exécutable avec Python 3.10+            | VERIFIED   | Fichier présent (46 863 octets), syntaxe Python valide confirmée                         |
| 2  | Le script télécharge Excel ameli.fr et produit at-data.json, mp-data.json, trajet-data.json | VERIFIED | Chemins OUTPUT_DIR + at-data.json, mp-data.json, trajet-data.json + json.dump présents   |
| 3  | Aucune référence à pickle, naf38 (logique), chemin absolu BPO ne subsiste                | VERIFIED   | `by_naf38` absent ; `naf38` = constantes de colonnes Excel (attendu) ; pickle absent     |
| 4  | parse_pdf.py accepte --pdf-dir en argument CLI et refuse un chemin invalide               | VERIFIED   | argparse + --pdf-dir + sys.exit(1) si dossier invalide confirmés                         |
| 5  | requirements.txt liste les 3 dépendances                                                   | VERIFIED   | requests>=2.31, openpyxl>=3.1, pdfplumber>=0.10 présents                                 |
| 6  | README explique prérequis, commande à lancer et fréquence de mise à jour                  | VERIFIED   | Sections Prérequis, Lancer une mise à jour (refresh_data.py), Fréquence présentes        |

**Score:** 6/6 vérités confirmées

### Required Artifacts

| Artefact                        | Fourni                                            | Taille    | Status     | Détails                                                    |
|---------------------------------|---------------------------------------------------|-----------|------------|------------------------------------------------------------|
| `data/pipeline/refresh_data.py` | Pipeline principal : téléchargement Excel + JSON  | 46 863 o  | VERIFIED   | Syntaxe valide, OUTPUT_DIR correct, json.dump wired        |
| `data/pipeline/parse_pdf.py`    | Parsing fiches PDF par NAF                        | 15 034 o  | VERIFIED   | argparse, --pdf-dir, sys.exit(1) sur chemin invalide       |
| `data/pipeline/requirements.txt`| Dépendances Python du pipeline                    | 46 o      | VERIFIED   | 3 lignes : requests, openpyxl, pdfplumber                  |
| `data/pipeline/README.md`       | Documentation du pipeline                         | 2 549 o   | VERIFIED   | Prérequis, commandes, fichiers produits, fréquence, sources |

### Key Link Verification

| From                        | To                    | Via                             | Status   | Détails                                                   |
|-----------------------------|-----------------------|---------------------------------|----------|-----------------------------------------------------------|
| `refresh_data.py`           | `data/at-data.json`   | json.dump avec OUTPUT_DIR       | WIRED    | AT_JSON_PATH = OUTPUT_DIR / "at-data.json" + json.dump   |
| `refresh_data.py`           | `data/mp-data.json`   | json.dump avec OUTPUT_DIR       | WIRED    | MP_JSON_PATH = OUTPUT_DIR / "mp-data.json" + json.dump   |
| `refresh_data.py`           | `data/trajet-data.json`| json.dump avec OUTPUT_DIR      | WIRED    | TRAJET_JSON_PATH = OUTPUT_DIR + json.dump                |
| `parse_pdf.py`              | `refresh_data.py`     | import optionnel avec try/except| WIRED    | Ligne 1135 : try/from parse_pdf import parse_all_pdfs    |

### Requirements Coverage

| Requirement | Plan source | Description                                                    | Status      | Evidence                                                      |
|-------------|-------------|----------------------------------------------------------------|-------------|---------------------------------------------------------------|
| PIPE-01     | 05-01, 05-02| Self-contained pipeline dans data/pipeline/                    | SATISFIED   | 4 fichiers présents dans data/pipeline/                       |
| PIPE-02     | 05-01       | Télécharge Excel ameli.fr et produit JSON dans data/           | SATISFIED   | OUTPUT_DIR = PIPELINE_DIR.parent, json.dump confirmés         |
| PIPE-03     | 05-02       | Parse les fiches PDF NAF pour les données démographiques       | SATISFIED   | parse_pdf.py wired via import optionnel dans refresh_data.py  |
| PIPE-04     | 05-02       | README explique comment lancer une mise à jour                 | SATISFIED   | README.md complet avec commandes, prérequis, fréquence        |

### Anti-Patterns Found

| Fichier             | Ligne | Pattern                       | Sévérité | Impact               |
|---------------------|-------|-------------------------------|----------|----------------------|
| refresh_data.py     | 37,62 | `"naf38"` (colonne Excel)     | Info     | Nom de colonne source, pas de logique by_naf38. Acceptable. |
| refresh_data.py     | 118   | `sans pickle` (commentaire)   | Info     | Commentaire explicatif intentionnel. Aucun impact.          |

### Human Verification Required

#### 1. Exécution réelle du pipeline

**Test:** Depuis `data/pipeline/`, lancer `python refresh_data.py` dans un environnement Python avec les dépendances installées
**Expected:** Les 3 fichiers JSON sont écrits dans `data/` avec des données valides (non vides)
**Why human:** Nécessite un accès réseau vers ameli.fr et un interpréteur Python avec les dépendances installées

#### 2. Comportement de parse_pdf.py avec un chemin invalide

**Test:** Lancer `python parse_pdf.py --pdf-dir /chemin/qui/nexiste/pas`
**Expected:** Message d'erreur clair et sortie avec code non-nul
**Why human:** Vérification comportementale à l'exécution

### Gaps Summary

Aucun gap. Les 6 vérités observables sont confirmées, les 4 artefacts sont substantiels et câblés, les 4 requirements sont satisfaits.

Les deux occurrences de `naf38` dans refresh_data.py sont des constantes de nommage de colonnes Excel (dictionnaire de mapping), non de la logique d'agrégation `by_naf38`. Le plan demandait la suppression de "toute logique de construction/agrégation `by_naf38`" - cette logique est absente. Les constantes de colonnes sont nécessaires pour lire les fichiers Excel source.

---

_Verified: 2026-02-28T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
