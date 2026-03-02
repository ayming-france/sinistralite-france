---
phase: 09-navigation-et-mobile
plan: "01"
subsystem: ui
tags: [touch, mobile, bottom-sheet, hash-routing, svg, choropleth]

# Dependency graph
requires:
  - phase: 08-choroplethe-et-interactions
    provides: SVG choropleth with tooltip, linked highlight, ranking bars
  - phase: 07-structure-svg
    provides: SVG maps with [data-caisse] groups, js/map.js module
provides:
  - Fixed bottom sheet panel for touch tap on SVG regions
  - MP view unavailable message for regional data
  - Hash routing confirmation (pre-existing, regression-free)
affects: [deploy, future-mobile-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Touch detection via navigator.maxTouchPoints === 0 gate (skip tap panel on desktop)"
    - "Fixed bottom sheet: position:fixed bottom:0, transform:translateY(100%) hidden, .open shows"
    - "env(safe-area-inset-bottom) for iPhone notch clearance"
    - "e.stopPropagation() on region tap prevents immediate dismiss via document click handler"
    - "hashchange listener closes panel on view switch (avoids cross-module coupling)"

key-files:
  created: []
  modified:
    - index.html
    - js/map.js
    - styles/map.css

key-decisions:
  - "Bottom sheet z-index 200 (above bottom-nav z-index 100) so panel overlays navigation"
  - "hashchange listener in map.js closes tap panel on view switch instead of cross-module import"
  - "setupTapPanel gated on navigator.maxTouchPoints === 0: desktop retains hover tooltip, mobile gets tap panel"
  - "MP map section added to index.html with .mp-map-unavailable message (data not published by CNAM per caisse)"
  - "Tooltip viewport clamping and touch-device hide added as deviation fix (Rule 1)"

patterns-established:
  - "Touch gate pattern: if (navigator.maxTouchPoints === 0) return — use at top of mobile-only setup functions"
  - "Bottom sheet pattern: position:fixed + translateY(100%) hidden, add .open to slide up"

requirements-completed: [MAP-10]

# Metrics
duration: ~30min
completed: 2026-03-02
---

# Phase 9 Plan 01: Navigation et mobile Summary

**Panneau bas fixe (bottom sheet) sur tap SVG mobile avec message MP indisponible et routage hash vérifié sans régression**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-02
- **Completed:** 2026-03-02
- **Tasks:** 3 (2 auto + 1 checkpoint human-verify)
- **Files modified:** 3

## Accomplishments

- Tap sur une région SVG ouvre un panneau fixe en bas de l'écran avec le nom de la caisse, le type d'accident, et la valeur formatée avec l'année active
- Panneau se ferme au tap extérieur, au bouton de fermeture, ou automatiquement lors d'un changement de vue (hashchange)
- Vue MP affiche un message explicatif indiquant l'absence de données régionales CNAM par caisse
- Hash routing (#at, #mp, #trajet) confirmé fonctionnel sans régression (pré-existant)
- Desktop inchangé: tooltip hover actif, tap panel non activé (navigator.maxTouchPoints gate)

## Task Commits

1. **Task 1: Add tap panel HTML/CSS and MP unavailable message** - `c00682e` (feat)
2. **Task 2: Implement setupTapPanel logic and close-on-view-switch** - `2be085d` (feat)
3. **Task 3: Visual verification on mobile and desktop** - checkpoint approuvé par l'utilisateur

**Deviation fix:** `7c9c338` (fix) - tooltip viewport clamping and MP alignment

## Files Created/Modified

- `index.html` - Ajout de #mapTapPanel (bottom sheet) et #mp-mapSection avec message indisponible
- `js/map.js` - Fonctions setupTapPanel() et closeTapPanel(), appels DOMContentLoaded, hashchange listener, document click dismiss
- `styles/map.css` - Styles .map-tap-panel, .tap-panel-* (handle, close, name, metric, val), .mp-map-unavailable

## Decisions Made

- `hashchange` listener dans map.js ferme le panneau au lieu d'un import cross-module (nav.js est un script classique, map.js est type=module)
- z-index 200 pour le panneau (au-dessus de bottom-nav z-index 100)
- `env(safe-area-inset-bottom)` pour compatibilité iPhone notch (meme pattern que nav.css)
- `e.stopPropagation()` sur le click region evite la fermeture immediate du panneau par le document click handler

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tooltip viewport clamping et hide sur appareils tactiles**
- **Found during:** Task 3 (visual verification checkpoint)
- **Issue:** Le tooltip pouvait deborder hors du viewport sur mobile; les appareils tactiles affichaient a la fois le tooltip et le tap panel
- **Fix:** Ajout de clamping left/top dans le positionnement du tooltip (min/max bounds); masquage du tooltip si navigator.maxTouchPoints > 0
- **Files modified:** js/map.js, styles/map.css
- **Verification:** Verification visuelle approuvee par l'utilisateur
- **Committed in:** 7c9c338 (fix commit post-checkpoint)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Correction necessaire pour l'utilisabilite mobile. Pas de depassement de perimetre.

## Issues Encountered

Aucun probleme bloquant. La detection touch via navigator.maxTouchPoints a necessité une attention particulière pour éviter que tooltip et tap panel coexistent sur mobile.

## User Setup Required

Aucune configuration externe requise.

## Next Phase Readiness

- MAP-10 satisfait: panneau tap remplace le tooltip hover sur mobile
- Phase 9 plan 01 complet, phase 09 prete pour eventuel plan suivant
- Déploiement GitHub Pages possible via `gh auth switch --user ayming-france` et `git push deploy main`

---
*Phase: 09-navigation-et-mobile*
*Completed: 2026-03-02*
