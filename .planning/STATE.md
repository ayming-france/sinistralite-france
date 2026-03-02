# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Un utilisateur peut chercher un code NAF et voir instantanément le profil accidentel du secteur comparé aux moyennes nationales
**Current focus:** v1.1 Carte régionale — Phase 7: Structure SVG

## Current Position

Phase: 7 (Structure SVG)
Plan: 01 (complete)
Status: Phase 7 Plan 01 terminé — styles/map.css créé, SVG inline (16 caisses) intégré dans #view-at et #view-trajet
Last activity: 2026-03-02 — Plan 07-01 exécuté (map.css, SVG carte régionale placeholder dans index.html)

```
v1.1 Progress: [==        ] 1/4 phases (Phase 7 in progress: 1/1 plans complets)
Phase 6: [x] Pipeline régional (Plan 01/02 complet, Plan 02/02 complet)
Phase 7: [~] Structure SVG (Plan 01/01 complet)
Phase 8: [ ] Choroplèthe et interactions
Phase 9: [ ] Navigation et mobile
```

## Performance Metrics

**v1.0 (reference)**
- 5 phases, 7 plans, 59 files modified
- 7,091 LOC total

**v1.1 (in progress)**
- 4 phases planned (6-9)
- 3 plans complete (06-01, 06-02, 07-01)
- 3 files modified in 06-02 (parse_regional.py, refresh_data.py, regional-data.json)
- 2 files modified in 07-01 (styles/map.css créé, index.html +525 lignes SVG)

## Accumulated Context

### Decisions

Decisions sont loguées dans PROJECT.md Key Decisions table.

Décisions Phase 6 Plan 01 (2026-03-02):
- Salariés extraits de Tableau 9 uniquement (absent du Tableau 17) et inclus par caisse dans le JSON
- CAISSE_MAP utilise des tuples (id, type) pour éviter une lookup table séparée
- validate_output() bloquant avant écriture JSON (assertion sur >= 16 caisses metro et valeurs non nulles)
- Tous les logs/warnings vont sur stderr; le JSON va uniquement dans le fichier de sortie
- Absence de caisses DOM-TOM génère un warning mais pas d'échec (variable selon édition PDF)

Décisions Phase 6 Plan 02 (2026-03-02):
- DEPT_MAP indexé par numéro de département (format réel PDF "NN - NomAbrégé") remplace CAISSE_MAP comme clé de lookup
- Extraction par coordonnées x (extract_words + seuil x = col_centers[0] - 30) au lieu de extract_table (tableau PDF à 2 caisses par rangée visuelle)
- CAISSE_MAP conservé pour compatibilité avec 24 tests unitaires existants (non cassés)
- Tableau 17 DOM-TOM utilise codes 71-76 (sans préfixe 9), les deux variantes sont dans DEPT_MAP
- Continuation multilignes traitée par même seuil x (valide pour "Franche-Comté 695 815 2 369...")

Décisions v1.1 confirmées par la recherche:
- SVG inline (pas D3, Leaflet, ou amCharts) — zéro nouvelle dépendance browser-side
- Carte comme section dans vues AT/Trajet, pas un 4e onglet
- `interpolateColor()` inline 10 lignes (pas Chroma.js 58 Ko)
- Tooltips en `position: fixed` pour éviter le clipping
- `pointerover`/`pointerout` unifiés (hover + touch)
- Panneau fixe mobile (pas tooltip flottant) sur tap
- Palette ColorBrewer séquentielle validée en simulation daltonienne
- Année par défaut: 2023 (correspond aux données sectorielles)
- [Phase 06]: DEPT_MAP indexé par numéro de département remplace les clés CAISSE_MAP (format réel PDF: 'NN - NomAbrégé')
- [Phase 06]: Extraction par coordonnées x (extract_words + seuil x) au lieu de extract_table (tableau PDF à 2 caisses par rangée visuelle)
- [Phase 07]: Chemins SVG approximatifs (placeholders) suite à l'indisponibilité du source regisenguehard/carte-france-svg
- [Phase 07]: Deux SVGs séparés (AT + Trajet) pour coloration indépendante en Phase 8

### Pending Todos

- Vérifier les chemins SVG approximatifs dans un navigateur et remplacer par les paths réels de regisenguehard/carte-france-svg si disponibles (Phase 8 ou avant déploiement)
- Calculer la distribution des données réelles avant de choisir la méthode de couleur (linéaire, clamped 95e percentile, logarithmique) (Phase 8)

### Blockers/Concerns

- MP regional data not available (rapport annuel covers AT and Trajet only) — message explicatif prévu en Phase 9
- Mapping caisse-to-région non bijectif: table manuelle requise. Auvergne-Rhône-Alpes = 2 caisses distinctes (Carsat Auvergne + Carsat Rhône-Alpes). DOM-TOM = CGSS, hors carte métropolitaine.
- Nombre de caisses par édition variable (20-22 selon les années, Mayotte apparait à partir d'une certaine édition): assertion doit accepter une fourchette

## Session Continuity

Last session: 2026-03-02
Stopped at: Phase 7 Plan 01 complet — styles/map.css et SVG inline (16 caisses) dans index.html
Resume file: None
Next action: Plan 08-01 — Choroplèthe et interactions (coloration des caisses SVG par données régionales)
