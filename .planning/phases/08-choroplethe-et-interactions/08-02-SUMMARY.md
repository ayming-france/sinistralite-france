---
phase: 08-choroplethe-et-interactions
plan: "02"
subsystem: map-choropleth
tags: [tooltip, year-selector, ranking, interactions, svg, choropleth]

requires:
  - phase: 08-01
    provides: colorierCarte, renderLegende, regional-data.json

provides:
  - tooltip-on-hover (desktop only, viewport-clamped)
  - year-selector-2020-2024 (default 2023)
  - ranking-panel (sortable, per view)
  - updateMap function (coordinates color + legend + ranking)

affects: [index.html, js/map.js, styles/map.css]

tech-stack:
  added: []
  patterns: [event-delegation-on-svg, viewport-clamping, touch-detection-maxTouchPoints]

key-files:
  created: []
  modified:
    - js/map.js
    - styles/map.css
    - index.html

key-decisions:
  - "Tooltip via position:fixed sur un div partagé hors des sections (évite l'overflow clipping)"
  - "Suppression du tooltip sur appareils tactiles via navigator.maxTouchPoints > 0 (Phase 9 gère le tap panel)"
  - "sortState module-level par vue (at/trajet) pour conserver l'ordre entre changements d'année"
  - "updateMap(viewType, year) centralise colorierCarte + renderRanking (renderLegende est déjà dans colorierCarte)"

patterns-established:
  - "Event delegation sur SVG: e.target.closest('[data-caisse]') pour tous les paths de la caisse"
  - "Viewport clamping: déplacer le tooltip à gauche/au-dessus si débordement détecté"

requirements-completed: [MAP-06, MAP-08, MAP-09]

duration: 2min
completed: "2026-03-02"
---

# Phase 8 Plan 02: Choroplèthe et interactions - Tooltip, sélecteur d'année, et classement Summary

**Tooltip desktop viewport-clampé, sélecteur d'année 2020-2024, et panneau de classement triable sur les 16 caisses métropolitaines**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T16:04:34Z
- **Completed:** 2026-03-02T16:06:34Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Tooltip fixed positionné hors du flux affiche nom de caisse, valeur et année au survol (desktop uniquement)
- Sélecteur d'année (2020-2024, défaut 2023) met à jour simultanément carte, légende et classement
- Panneau de classement triable (croissant/décroissant) avec bouton bascule par vue AT et Trajet
- Layout flex carte + classement côte à côte sur desktop, empilé sur mobile

## Task Commits

Chaque tâche a été commitée atomiquement :

1. **Task 1: Add tooltip, year selector, and ranking HTML + CSS** - `a68be1a` (feat)
2. **Task 2: Implement tooltip, year change, and ranking logic in map.js** - `9d23a41` (feat)

## Files Created/Modified

- `js/map.js` - Ajout de renderRanking, setupSortButton, setupYearSelector, updateMap, setupTooltip (140 lignes)
- `styles/map.css` - Ajout des règles map-controls, year-select, map-body, map-ranking, ranking-*, map-tooltip (110 lignes)
- `index.html` - Ajout des sélecteurs d'année, conteneurs map-body + map-ranking, div#mapTooltip partagé

## Decisions Made

- Tooltip partagé unique (#mapTooltip) placé avant `</body>` pour éviter le clipping des sections parent
- Touch detection via `navigator.maxTouchPoints > 0` supprime le tooltip sur mobile/tablette (Phase 9 gère le tap)
- `sortState` conservé au niveau module pour que l'ordre de tri persiste entre les changements d'année
- `updateMap` centralise l'appel à `colorierCarte` (qui appelle `renderLegende` en interne) + `renderRanking`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Phase 9 (Navigation et mobile) peut construire sur le panneau de classement pour le tap mobile
- Le tooltip est prêt pour la Phase 9 qui devra ajouter le panneau fixe mobile sur tap des caisses
- Toutes les interactions desktop (MAP-06, MAP-08, MAP-09) sont complètes

## Self-Check: PASSED

- [x] js/map.js contient renderRanking, setupSortButton, setupYearSelector, updateMap, setupTooltip (5 fonctions)
- [x] index.html contient yearSelect (4 occurrences: 2 labels + 2 selects), rankingList (2), mapTooltip (1)
- [x] styles/map.css contient position: fixed (tooltip), flex-direction: column (mobile)
- [x] Commits a68be1a et 9d23a41 existent

---
*Phase: 08-choroplethe-et-interactions*
*Completed: 2026-03-02*
