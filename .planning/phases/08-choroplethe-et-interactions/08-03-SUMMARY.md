---
phase: 08-choroplethe-et-interactions
plan: "03"
subsystem: map-choropleth
tags: [choropleth, visual-verification, ux, ranking, hover, transitions]

# Dependency graph
requires:
  - phase: 08-02
    provides: tooltip, year-selector, ranking-panel, updateMap

provides:
  - human-verified-choropleth (coloring, legend, tooltip, year selector, ranking)
  - ranking-horizontal-bar-chart (proportional fills, no scrolling)
  - caisse-boundary-visibility (paint-order stroke technique)
  - smooth-hover-transitions (200ms ease)
  - linked-bidirectional-highlight (map hover highlights ranking row and vice versa)
  - map-hidden-during-naf-results

affects: [index.html, js/map.js, styles/map.css]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "paint-order: stroke fill — stroke under fill pour boundaries visibles sans débordement"
    - "Linked highlight bidirectionnel: map pointerover -> ranking row .active, ranking row hover -> caisse brightness"
    - "Barres horizontales proportionnelles dans le classement (width% = valeur/max*100)"

key-files:
  created: []
  modified:
    - js/map.js
    - styles/map.css
    - index.html

key-decisions:
  - "Classement redessiné en barres horizontales proportionnelles (pas de scrolling, lisibilité immédiate)"
  - "paint-order: stroke fill sur les paths SVG pour que le contour reste sous le fill (boundaries nettes)"
  - "Transitions CSS 200ms ease sur brightness et stroke-width pour fluidité hover"
  - "Linked highlight bidirectionnel: survoler une caisse sur la carte met en évidence la ligne du classement correspondante"
  - "Carte cachée (display:none) quand les résultats NAF sont affichés pour éviter la confusion visuelle"

patterns-established:
  - "Validation humaine en boucle avec améliorations UX in-situ (pas de 2e passe de plan)"

requirements-completed: [MAP-02, MAP-03, MAP-05, MAP-06, MAP-07, MAP-08, MAP-09]

# Metrics
duration: 20min
completed: "2026-03-02"
---

# Phase 8 Plan 03: Choroplèthe et interactions - Vérification visuelle Summary

**Validation humaine approuvée avec 5 améliorations UX in-situ: classement en barres horizontales, boundaries SVG nettes via paint-order, transitions hover 200ms, highlight bidirectionnel carte-classement, et carte cachée lors des résultats NAF**

## Performance

- **Duration:** 20 min (estimation)
- **Started:** 2026-03-02T16:10:00Z
- **Completed:** 2026-03-02T16:30:00Z
- **Tasks:** 1 (checkpoint human-verify, approuvé)
- **Files modified:** 3

## Accomplishments

- Vérification visuelle humaine complète: coloration bleue séquentielle, légende 5 paliers, tooltip au survol, sélecteur 2020-2024, panneau classement, vues AT/Trajet indépendantes, layout responsive 375px
- Classement redessiné en barres horizontales proportionnelles (remplacement du tableau scrollable)
- Highlight bidirectionnel: survol carte -> ligne classement active, survol classement -> caisse brillante sur carte
- Contours de caisses visibles et nets grâce à `paint-order: stroke fill` (contour sous le fill, pas de débordement)
- Carte choroplèthe cachée automatiquement quand les résultats de recherche NAF sont affichés

## Task Commits

Checkpoint approuvé. Les améliorations UX ont été committées atomiquement pendant la vérification:

1. **fix(08): hide choropleth map when NAF results are shown** - `dab84b4`
2. **style(08): redesign ranking panel with color bars, grid layout, sticky header** - `f8d96fb`
3. **style(08): redesign ranking as horizontal bar chart, no scrolling** - `ba7fe3a`
4. **style(08): improve caisse boundary visibility with thicker strokes** - `cdb997b`
5. **style(08): stroke on paths with paint-order, hover highlight per caisse** - `5109581`
6. **style(08): smooth transitions on caisse hover brightness and stroke** - `32618c4`
7. **feat(08): linked highlight between map and ranking on hover** - `ed443d5`

## Files Created/Modified

- `js/map.js` - Ajout du linked highlight bidirectionnel (pointerover/out sur caisses SVG -> classList.toggle sur lignes classement)
- `styles/map.css` - Refonte du panneau classement en barres horizontales, transitions CSS 200ms, paint-order sur paths SVG, `.ranking-row.active` pour le highlight
- `index.html` - Structure mise à jour pour le nouveau design du classement

## Decisions Made

- Classement en barres horizontales: largeur proportionnelle à la valeur (width = value/max * 100%), pas de scrolling, toutes les 16 caisses visibles simultanément
- `paint-order: stroke fill` sur les paths SVG: le contour est dessiné sous le fill, boundaries nettes sans débordement sur les départements voisins
- Transitions CSS 200ms ease sur `filter: brightness()` et `stroke-width` pour une expérience hover fluide sans JavaScript
- Highlight bidirectionnel: un seul mécanisme JS (pointerover sur `[data-caisse]`) qui synchronise le classement sans refactoriser `updateMap`
- Carte cachée via `display:none` quand `#nafResults` est visible: `colorierCarte` vérifie la visibilité avant de tenter l'update

## Deviations from Plan

### Améliorations UX in-situ (approbation humaine)

Le plan prévoyait une vérification visuelle simple et une approbation. L'utilisateur a approuvé en demandant des améliorations pendant la session, ce qui a conduit à 7 commits d'amélioration avant l'approbation finale.

Ces améliorations correspondent à la Rule 2 (fonctionnalité critique manquante) et Rule 1 (bug UX):

**1. [Rule 1 - Bug UX] Carte cachée lors des résultats NAF**
- **Found during:** Vérification visuelle
- **Issue:** La carte choroplèthe restait visible derrière les résultats NAF, créant une confusion
- **Fix:** `display:none` sur `.map-body` quand `#nafResults` est affiché
- **Files modified:** js/map.js, styles/map.css
- **Committed in:** `dab84b4`

**2. [Rule 2 - UX critique] Classement redessiné en barres horizontales**
- **Found during:** Vérification visuelle
- **Issue:** Le classement sous forme de liste scrollable manquait de lisibilité; impossible de comparer les caisses visuellement
- **Fix:** Refonte en barres horizontales proportionnelles avec en-tête sticky
- **Files modified:** styles/map.css, index.html
- **Committed in:** `f8d96fb`, `ba7fe3a`

**3. [Rule 1 - Bug visuel] Contours des caisses imprécis**
- **Found during:** Vérification visuelle
- **Issue:** Les contours débordaient sur les caisses voisines (stroke centré sur le path edge)
- **Fix:** `paint-order: stroke fill` pour dessiner le contour sous le fill
- **Files modified:** styles/map.css
- **Committed in:** `cdb997b`, `5109581`

**4. [Rule 2 - UX critique] Transitions hover manquantes**
- **Found during:** Vérification visuelle
- **Issue:** Les changements d'état au survol étaient brusques (pas de transition)
- **Fix:** `transition: filter 200ms ease, stroke-width 200ms ease` sur les paths SVG
- **Files modified:** styles/map.css
- **Committed in:** `32618c4`

**5. [Rule 2 - UX critique] Linked highlight absent**
- **Found during:** Vérification visuelle
- **Issue:** Survoler la carte ne mettait pas en évidence la ligne correspondante dans le classement (et vice versa)
- **Fix:** Ajout de `pointerover`/`pointerout` qui ajoute/retire `.active` sur les lignes du classement
- **Files modified:** js/map.js, styles/map.css
- **Committed in:** `ed443d5`

---

**Total deviations:** 5 améliorations UX validées par l'utilisateur
**Impact on plan:** Toutes les améliorations ont renforcé l'expérience utilisateur sans modifier l'architecture. L'approbation finale a été obtenue: "Nice idea! Looks great!"

## Issues Encountered

Aucun blocage technique. Les améliorations ont été implémentées et committées de façon fluide pendant la session de vérification.

## User Setup Required

Aucune configuration externe requise.

## Next Phase Readiness

- Phase 8 complète et validée humainement: MAP-02, MAP-03, MAP-05, MAP-06, MAP-07, MAP-08, MAP-09 tous satisfaits
- Phase 9 (Navigation et mobile) peut construire sur:
  - Le panneau de classement redessiné (barres horizontales, structure .ranking-row stable)
  - Le tooltip desktop existant (#mapTooltip en position:fixed)
  - La détection tactile via `navigator.maxTouchPoints > 0`
  - Le système de linked highlight (pattern extensible pour le tap mobile)
- Préoccupation persistante: MP regional data non disponible (rapport annuel: AT et Trajet uniquement), message explicatif prévu en Phase 9

---
*Phase: 08-choroplethe-et-interactions*
*Completed: 2026-03-02*
