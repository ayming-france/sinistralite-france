---
phase: 01-branding-et-robustesse
plan: 01
subsystem: ui
tags: [chart.js, lato, svg, favicon, localstorage, branding]

# Dependency graph
requires: []
provides:
  - Chart.js uses Lato font exclusively (no DM Sans)
  - SVG chart bar favicon on both index.html and landing.html
  - Nav logo includes chart bar icon + Sinistralité France text
  - localStorage theme key unified to datagouv-theme across dashboard and landing
affects: [01-02, all future chart-rendering plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SVG favicon as data URI (URL-encoded inline, no external file)"
    - "Nav logo = inline SVG icon + text span, icon uses var(--accent) for theme adaptation"
    - "localStorage key convention: datagouv-theme (namespaced to avoid collisions)"

key-files:
  created: []
  modified:
    - js/nav.js
    - js/charts.js
    - index.html
    - landing.html

key-decisions:
  - "Lato chosen as Chart.js font family, consistent with Google Fonts import already in HTML"
  - "SVG favicon: 3-bar ascending chart icon on blue (#4e8ac5) rounded rect background"
  - "Nav logo icon uses var(--accent) fill so it adapts to light/dark theme automatically"
  - "localStorage key datagouv-theme is the canonical cross-page theme key"

patterns-established:
  - "DM Sans is removed from the codebase; Lato is the sans-serif for all Chart.js labels"
  - "Favicons are inline SVG data URIs, not external files"

requirements-completed: [BRAND-01, BRAND-02, BRAND-03, ROBUST-03, ROBUST-05]

# Metrics
duration: 15min
completed: 2026-02-27
---

# Phase 01 Plan 01: Branding et polices Summary

**Branding corrigé : favicon SVG chart-bars sur les deux pages, icône chart dans la nav, Lato remplace DM Sans dans tous les charts, et thème partagé via la clé datagouv-theme**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-27T00:00:00Z
- **Completed:** 2026-02-27T00:15:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Suppression de toutes les références DM Sans (6 occurrences dans nav.js et charts.js) au profit de Lato
- Remplacement du favicon texte "SF" par un favicon SVG chart-bars (3 barres blanches sur fond bleu) sur index.html et landing.html
- Ajout de l'icône chart-bars dans la barre de navigation avant le texte "Sinistralité France"
- Unification de la clé localStorage pour le thème : dashboard et landing page partagent maintenant datagouv-theme

## Task Commits

1. **Task 1: Fix Chart.js font references** - `a1130e0` (fix)
2. **Task 2: SVG chart favicon and nav logo** - `4b67186` (feat)
3. **Task 3: Unify localStorage theme key** - `3cee9d0` (fix)

## Files Created/Modified
- `js/nav.js` - Lato dans Chart.defaults.font.family, localStorage key datagouv-theme
- `js/charts.js` - 5 remplacements DM Sans par Lato (doughnut legend, datalabels, sex donut, age ticks)
- `index.html` - Favicon SVG chart-bars + icône inline dans le logo nav
- `landing.html` - Favicon SVG chart-bars identique

## Decisions Made
- Icône nav utilise `var(--accent)` pour que la couleur s'adapte au thème clair/sombre
- SVG favicon encodé en data URI (URL-encoded) pour éviter un fichier externe
- DM Sans supprimé entièrement du JS (les tooltips en JetBrains Mono sont conservés car c'est intentionnel pour les valeurs chiffrées)

## Deviations from Plan

None - plan exécuté exactement comme écrit.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Tous les éléments visuels de la phase 1 plan 1 sont en place
- Prêt pour le plan 02 (robustesse) de la même phase

---
*Phase: 01-branding-et-robustesse*
*Completed: 2026-02-27*
