# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Un utilisateur peut chercher un code NAF et voir instantanément le profil accidentel du secteur comparé aux moyennes nationales
**Current focus:** v1.1 Carte régionale — Phase 6: Pipeline régional

## Current Position

Phase: 6 (Pipeline régional)
Plan: 01 (complete)
Status: Phase 6 Plan 01 terminé — parse_regional.py et tests unitaires livrés
Last activity: 2026-03-02 — Plan 06-01 exécuté (parser PDF régional + 24 tests pytest)

```
v1.1 Progress: [          ] 0/4 phases (Phase 6 in progress: 1/? plans)
Phase 6: [~] Pipeline régional (Plan 01/? complet)
Phase 7: [ ] Structure SVG
Phase 8: [ ] Choroplèthe et interactions
Phase 9: [ ] Navigation et mobile
```

## Performance Metrics

**v1.0 (reference)**
- 5 phases, 7 plans, 59 files modified
- 7,091 LOC total

**v1.1 (in progress)**
- 4 phases planned (6-9)
- 0 plans complete

## Accumulated Context

### Decisions

Decisions sont loguées dans PROJECT.md Key Decisions table.

Décisions Phase 6 Plan 01 (2026-03-02):
- Salariés extraits de Tableau 9 uniquement (absent du Tableau 17) et inclus par caisse dans le JSON
- CAISSE_MAP utilise des tuples (id, type) pour éviter une lookup table séparée
- validate_output() bloquant avant écriture JSON (assertion sur >= 16 caisses metro et valeurs non nulles)
- Tous les logs/warnings vont sur stderr; le JSON va uniquement dans le fichier de sortie
- Absence de caisses DOM-TOM génère un warning mais pas d'échec (variable selon édition PDF)

Décisions v1.1 confirmées par la recherche:
- SVG inline (pas D3, Leaflet, ou amCharts) — zéro nouvelle dépendance browser-side
- Carte comme section dans vues AT/Trajet, pas un 4e onglet
- `interpolateColor()` inline 10 lignes (pas Chroma.js 58 Ko)
- Tooltips en `position: fixed` pour éviter le clipping
- `pointerover`/`pointerout` unifiés (hover + touch)
- Panneau fixe mobile (pas tooltip flottant) sur tap
- Palette ColorBrewer séquentielle validée en simulation daltonienne
- Année par défaut: 2023 (correspond aux données sectorielles)

### Pending Todos

- Vérifier les numéros de page exacts des Tableaux 9 et 17 dans le rapport annuel PDF avec `page.debug_tablefinder()` avant de coder l'extraction (Phase 6)
- Prévoir assertion `len(mapping) >= 16` dans le parser pour détecter les caisses manquantes (Phase 6)
- Inspecter les règles CSS héritées dans DevTools avant d'implémenter la coloration SVG (Phase 7)
- Calculer la distribution des données réelles avant de choisir la méthode de couleur (linéaire, clamped 95e percentile, logarithmique) (Phase 8)

### Blockers/Concerns

- MP regional data not available (rapport annuel covers AT and Trajet only) — message explicatif prévu en Phase 9
- Mapping caisse-to-région non bijectif: table manuelle requise. Auvergne-Rhône-Alpes = 2 caisses distinctes (Carsat Auvergne + Carsat Rhône-Alpes). DOM-TOM = CGSS, hors carte métropolitaine.
- Nombre de caisses par édition variable (20-22 selon les années, Mayotte apparait à partir d'une certaine édition): assertion doit accepter une fourchette

## Session Continuity

Last session: 2026-03-02
Stopped at: Phase 6 Plan 01 complet — parse_regional.py + test_parse_regional.py livrés
Resume file: None
Next action: Plan 06-02 — Exécution du parser sur le PDF réel et validation de regional-data.json
