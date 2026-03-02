---
phase: 06-pipeline-regional
verified: 2026-03-02T12:00:00Z
status: passed
score: 4/4 success criteria verified
re_verification: false
---

# Phase 6: Pipeline Régional - Rapport de Vérification

**Phase Goal:** Les données régionales sont extraites du PDF et disponibles sous forme de JSON valide prêt à être consommé par le frontend
**Verified:** 2026-03-02
**Status:** passed
**Re-verification:** Non - vérification initiale

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `data/regional-data.json` existe avec 16+ caisses métropolitaines, AT et Trajet non nuls pour 2020-2024 | VERIFIED | 16 caisses carsat/cramif, toutes avec 5 années complètes, valeurs AT 10k-81k (plausibles) |
| 2 | Les noms de caisses multi-lignes sont fusionnés correctement (ex. "Bourgogne-Franche-Comté") | VERIFIED | `bourgogne-franche-comte` présent avec `name: "Carsat Bourgogne-Franche-Comté"` (30 chars, non tronqué) |
| 3 | Les lignes Total/Ensemble/France sont exclues du JSON final | VERIFIED | Zéro entrée avec ces mots dans `name` ou `id` dans les 21 caisses |
| 4 | Le JSON inclut le champ `salaries` pour chaque caisse et chaque année | VERIFIED | 16/16 caisses métro ont `salaries` avec 5 années; les DOM-TOM ont aussi des salaries |

**Score:** 4/4 success criteria verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `data/pipeline/parse_regional.py` | Parser PDF autonome | VERIFIED | 744 lignes; contient CAISSE_MAP (21), DEPT_MAP (26), toutes fonctions requises |
| `data/regional-data.json` | JSON régional valide | VERIFIED | 21 caisses, schéma `{meta, caisses}`, 11 041 octets |
| `data/pipeline/refresh_data.py` | Pipeline avec `--rapport-pdf` | VERIFIED | Argument présent, import conditionnel de `parse_regional_pdf`, gestion d'erreur |
| `data/pipeline/test_parse_regional.py` | Tests unitaires fonctions pures | VERIFIED | 24 tests, 24 passed, 0.14s |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `parse_regional.py` | `pdfplumber` | `import pdfplumber` + `pdfplumber.open()` | WIRED | Ligne 22 import, ligne 579 usage dans `parse_regional_pdf()` |
| `parse_regional.py` | `data/regional-data.json` | `json.dump` dans `main()` | WIRED | Ligne 728, `ensure_ascii=False, indent=2` |
| `refresh_data.py` | `parse_regional.py` | `from parse_regional import parse_regional_pdf` | WIRED | Ligne 1190, import conditionnel dans bloc `if args.rapport_pdf:` |
| `parse_regional.py` | `DEPT_MAP` | Lookup par code département extrait du texte PDF | WIRED | Ligne 463-470, mapping `dept -> (id, name, type)` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PIPE-05 | 06-01, 06-02 | Parser extrait données AT par caisse (Tableau 9), années 2020-2024 | SATISFIED | `at` présent avec 5 années pour 16 caisses métro; `find_tableau_page(pdf, "Tableau 9")` ligne 583 |
| PIPE-06 | 06-01, 06-02 | Parser extrait données Trajet par caisse (Tableau 17), années 2020-2024 | SATISFIED | `trajet` présent avec 5 années pour 16 caisses métro; `find_tableau_page(pdf, "Tableau 17")` ligne 584 |
| PIPE-07 | 06-01, 06-02 | Parser gère noms multi-lignes et produit JSON propre | SATISFIED | `merge_multiline_rows()` présent et testé; "Carsat Bourgogne-Franche-Comté" complet dans le JSON |
| PIPE-08 | 06-01, 06-02 | JSON régional inclut effectifs salariés et comptages AT/Trajet par caisse par année | SATISFIED | Champ `salaries` avec 5 années présent dans les 16 caisses métro et les 5 DOM-TOM |

Tous les 4 PIPE requirements assignés à la Phase 6 dans REQUIREMENTS.md sont satisfaits.
Aucun requirement orphelin détecté.

---

### Anti-Patterns Found

Aucun anti-pattern détecté dans les fichiers modifiés par cette phase.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| - | - | - | - | Aucun |

---

### Human Verification Required

#### 1. Exactitude des valeurs numériques

**Test:** Ouvrir le rapport annuel 2024 PDF, localiser Tableau 9 (AT par caisse), comparer 2-3 valeurs avec `data/regional-data.json`.
**Expected:** Ex. CRAMIF AT 2023 = 81519 et Carsat Sud-Est AT 2024 = 48797 (valeurs confirmées dans le SUMMARY 06-02).
**Why human:** Les tests automatisés vérifient la structure et la non-nullité, pas la concordance exacte avec le PDF source.

#### 2. Mayotte 2020 absent

**Test:** Vérifier que l'absence de valeur 2020 pour CSS Mayotte correspond bien à une note de bas de page dans le PDF (donnée non disponible).
**Expected:** Le PDF mentionne une absence de données 2020 pour Mayotte.
**Why human:** L'absence génère un avertissement non bloquant dans le script; confirmation que c'est bien conforme à la source.

---

### Summary

La phase 6 atteint son objectif complet. Le pipeline d'extraction PDF produit un `data/regional-data.json` valide avec:
- 21 caisses réelles (16 métropolitaines + 5 DOM-TOM) issues du rapport annuel 2024
- 5 années complètes (2020-2024) pour AT, Trajet et Salariés sur toutes les caisses métro
- Aucune ligne agrégée (Total/Ensemble/France) dans le JSON final
- Noms canoniques complets sans troncature (gestion multi-lignes opérationnelle)

Les 4 requirements (PIPE-05 à PIPE-08) sont satisfaits et vérifiés par les données effectives dans le JSON. Le module est importable, testé à 100% (24/24 tests), et intégré dans `refresh_data.py` via `--rapport-pdf`. Les commits `34e7b00`, `643e5d1`, `7c75145`, `f6f3a09` sont présents dans le dépôt git et correspondent aux artefacts vérifiés.

---

_Verified: 2026-03-02_
_Verifier: Claude (gsd-verifier)_
