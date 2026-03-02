---
phase: 06-pipeline-regional
plan: 02
subsystem: pipeline
tags: [pdfplumber, python, json, pdf-parsing, coordinate-extraction, regional-data]

requires:
  - "06-01: parse_regional.py with CAISSE_MAP and unit tests"

provides:
  - "data/regional-data.json: 21 caisses (16 métro + 5 DOM-TOM) avec AT et Trajet 2020-2024"
  - "data/pipeline/parse_regional.py: extraction par coordonnées pdfplumber, DEPT_MAP, validation"
  - "data/pipeline/refresh_data.py: argument --rapport-pdf intégré, pipeline régional optionnel"

affects:
  - "07-structure-svg: consomme data/regional-data.json avec le schéma meta+caisses finalisé"
  - "08-choroplethe: utilise les IDs stables des caisses et les valeurs AT/Trajet annuelles"
  - "09-navigation-mobile: dépend de la structure JSON pour le panneau régional"

tech-stack:
  added: []
  patterns:
    - "Extraction par coordonnées x (extract_words + x-threshold) au lieu de extract_table pour tableaux à double colonne"
    - "DEPT_MAP numéro de département -> (id, nom canonique, type) pour le format réel des PDF Ameli"
    - "Seuil x (col_center[0] - 30) pour distinguer zone nom (gauche) vs zone données (droite)"
    - "y_tolerance=8 pour regrouper tokens de la même rangée visuelle dans un seul bin"
    - "Concaténation de texte brut (pas de int()) pour préserver les zéros initiaux (ex. '034')"

key-files:
  created:
    - data/regional-data.json
  modified:
    - data/pipeline/parse_regional.py
    - data/pipeline/refresh_data.py

key-decisions:
  - "DEPT_MAP remplace les clés CAISSE_MAP: le PDF 2024 utilise 'NN - NomAbrégé' (département + nom court), pas les noms canoniques"
  - "Extraction par coordonnées x (extract_words) au lieu de extract_table: le tableau a 2 caisses par rangée visuelle, incompatible avec extract_table"
  - "Seuil x fixe (col_centers[0] - 30) pour séparer nom et données: robuste même avec des noms multilignes"
  - "Continuation multilignes traitée par le même seuil x, applicable aux lignes 'Franche-Comté 695 815 2 369...'"
  - "CAISSE_MAP conservé tel quel pour ne pas casser les 24 tests unitaires existants"
  - "Tableau 17 DOM-TOM utilise des codes 71-76 (sans le '9' préfixe) contrairement au Tableau 9 (971-976)"

requirements-completed: [PIPE-05, PIPE-06, PIPE-07, PIPE-08]

duration: 112min
completed: 2026-03-02
---

# Phase 6 Plan 02: Exécution du parser sur le PDF réel

**Extraction par coordonnées pdfplumber sur le rapport annuel 2024, produisant regional-data.json avec 21 caisses (16 métropolitaines + 5 DOM-TOM), AT et Trajet 2020-2024, intégré dans refresh_data.py via --rapport-pdf**

## Performance

- **Duration:** 112 min
- **Started:** 2026-03-02T08:25:00Z
- **Completed:** 2026-03-02T10:16:47Z
- **Tasks:** 3 (tâche 1 résolue avant reprise, tâches 2 et 3 exécutées)
- **Files modified:** 3

## Accomplissements

- `data/regional-data.json` produit avec 21 caisses réelles depuis le rapport annuel 2024
- Toutes les 16 caisses métropolitaines ont AT et Trajet pour les 5 années (2020-2024)
- Valeurs spot-checkées contre le PDF: Sud-Est AT2024=48797, CRAMIF AT2023=81519
- `refresh_data.py` accepte `--rapport-pdf` et appelle `parse_regional_pdf()` en step optionnel
- 24 tests unitaires existants toujours verts après toutes les modifications

## Task Commits

1. **Task 2: Run parser, fix extraction issues, produce regional-data.json** - `7c75145` (feat)
2. **Task 3: Integrate parse_regional into refresh_data.py** - `f6f3a09` (feat)

## Files Created/Modified

- `data/regional-data.json` (créé): 21 caisses avec AT, Trajet, Salariés par année
- `data/pipeline/parse_regional.py` (modifié): extraction par coordonnées, DEPT_MAP, compatibilité CAISSE_MAP
- `data/pipeline/refresh_data.py` (modifié): argument --rapport-pdf, appel conditionnel de parse_regional_pdf

## Decisions Made

- Le PDF rapport annuel 2024 présente les caisses sous la forme "NN - NomAbrégé" (numéro de département), pas les noms canoniques. CAISSE_MAP était inutilisable tel quel; création de DEPT_MAP.
- extract_table() échoue sur ce tableau car il affiche 2 caisses par rangée visuelle (une à gauche, une à droite). La solution est extract_words() avec binning x pour assigner chaque token numérique à sa colonne.
- Le seuil x (30px en deçà du premier centre de colonne) discrimine le nom de caisse (zone gauche) des données numériques (zone droite), ce qui gère à la fois les lignes complètes et les continuations multilignes.
- Pour Tableau 17, les DOM-TOM utilisent des codes 71-76 sans le préfixe 9 (vs 971-976 dans Tableau 9). Les deux variantes sont dans DEPT_MAP.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CAISSE_MAP incompatible avec le format réel du PDF**
- **Found during:** Task 2, dry-run initial
- **Issue:** CAISSE_MAP attend "Carsat Bourgogne-Franche-Comté" mais le PDF contient "21 - Bourgogne-Franche-Comté" (format département + nom abrégé)
- **Fix:** Création de DEPT_MAP indexé par numéro de département. CAISSE_MAP conservé pour la compatibilité avec les tests.
- **Files modified:** data/pipeline/parse_regional.py
- **Commit:** 7c75145

**2. [Rule 1 - Bug] extract_table() n'extrait que la moitié des caisses**
- **Found during:** Task 2, analyse du dry-run
- **Issue:** Le tableau PDF présente 2 caisses côte à côte par rangée visuelle. extract_table() ne retourne que les caisses de gauche (8 sur 16), les caisses de droite apparaissant comme lignes "fantômes" avec None en colonne 0.
- **Fix:** Réécriture complète de l'extraction avec extract_words() et binning par coordonnée x. Suppression de extract_table().
- **Files modified:** data/pipeline/parse_regional.py
- **Commit:** 7c75145

**3. [Rule 1 - Bug] Regex DEPT_RE trop large (matches all 2-3 digit numbers)**
- **Found during:** Task 2, debug token-level
- **Issue:** _DEPT_RE = `^\d{2,3}$` matchait tous les tokens numériques 2-3 chiffres (ex. "695", "815"), pas seulement les numéros de département. Tous les tokens de données étaient skippés comme "numéro de département".
- **Fix:** Remplacement du test regex par un seuil x: les tokens dont le centre x dépasse col_centers[0] - 30 sont des données, pas un nom.
- **Files modified:** data/pipeline/parse_regional.py
- **Commit:** 7c75145

## Issues Encountered

- **pdfplumber non installé:** `python` (=/usr/bin/python3) ne trouvait pas pdfplumber alors que `python3` oui. Le script doit être lancé avec `python3` explicitement.
- **Tableau 17 DOM-TOM codes différents:** 71/72/73/74/25 au lieu de 971/972/973/974/976. Corrigé dans DEPT_MAP en incluant les deux variantes.
- **Mayotte 2020 absent:** Normal selon la note de bas de page du PDF. Génère un avertissement non bloquant.

## Next Phase Readiness

- `data/regional-data.json` est produit et valide, prêt pour la consommation en Phase 7 (SVG)
- Le schéma JSON est définitif: `{meta: {source, generated, years}, caisses: [{id, name, type, at, trajet, salaries?}]}`
- Les IDs stables des caisses (ex. "cramif", "nord-picardie", "rhone-alpes") sont prêts pour le mapping SVG en Phase 7

---
*Phase: 06-pipeline-regional*
*Completed: 2026-03-02*
