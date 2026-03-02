---
phase: 08-choroplethe-et-interactions
plan: "01"
subsystem: map-choropleth
tags: [choropleth, svg, color, legend, data-viz]
dependency_graph:
  requires: [07-02]
  provides: [choropleth-coloring, legend-rendering]
  affects: [index.html, js/map.js, styles/map.css]
tech_stack:
  added: []
  patterns: [linear-color-interpolation, ColorBrewer-sequential, fr-FR-locale-formatting]
key_files:
  created: []
  modified:
    - js/map.js
    - styles/map.css
    - index.html
decisions:
  - interpolateColor inline (10 lignes, pas Chroma.js) confirme choix de recherche
  - renderLegende avec 5 paliers discrets (t = 0, 0.25, 0.5, 0.75, 1.0)
  - Coloration appliquée sur l'élément <g data-caisse> (paths héritent via fill:inherit)
  - DOM-TOM silencieusement ignorés (pas de console.warn si caisse absente du SVG)
metrics:
  duration_minutes: 2
  tasks_completed: 2
  files_modified: 3
  completed_date: "2026-03-02"
---

# Phase 8 Plan 01: Choroplèthe et interactions - Coloration SVG Summary

Choropleth coloring with 5-swatch legend using ColorBrewer sequential blue palette applied to 16 metropolitan caisses from regional-data.json at page load.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Implement choropleth coloring core in js/map.js | 3f6e324 | js/map.js |
| 2 | Add legend HTML containers and CSS styling | 1750f05 | index.html, styles/map.css |

## What Was Built

### js/map.js
- `interpolateColor(minColor, maxColor, t)`: parse hex to RGB, linear lerp each channel clamped to [0,1], returns `rgb(r,g,b)` string
- `colorierCarte(viewType, year, data)`: selects SVG by ID, filters metro caisses, computes min/max, applies blue gradient fill to each `<g data-caisse>` element, calls renderLegende
- `renderLegende(legendElId, minVal, maxVal, minColor, maxColor)`: generates 5 swatches at t=0,0.25,0.5,0.75,1.0 with French locale formatted values
- `loadRegionalData()`: async fetch of `data/regional-data.json`
- DOMContentLoaded handler: calls verifierStructureSVG, loadRegionalData, then colorierCarte for both AT and Trajet views with DEFAULT_YEAR='2023'

### index.html
- Added `<div class="map-legend" id="at-mapLegend">` after `.map-wrap` inside `#at-mapSection`
- Added `<div class="map-legend" id="trajet-mapLegend">` after `.map-wrap` inside `#trajet-mapSection`

### styles/map.css
- `.map-legend`: flex row with 8px gap, 12px top margin, small font
- `.legend-swatches`: flex row with 2px gap
- `.legend-swatch`: 28x14px colored block with 2px radius and border
- `.legend-min`, `.legend-max`: tabular-nums, no-wrap

## Requirements Satisfied

- MAP-02: Légende à 5 paliers affichant la plage min-max
- MAP-03: Styles CSS pour la légende (.map-legend, .legend-swatches, .legend-swatch)
- MAP-05: Année par défaut 2023 au premier chargement
- MAP-07: AT et Trajet colorés indépendamment via deux SVGs séparés

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] js/map.js contains interpolateColor, renderLegende, colorierCarte, loadRegionalData
- [x] DEFAULT_YEAR = '2023' present
- [x] map-legend container present in index.html (count: 2)
- [x] legend-swatch in styles/map.css
- [x] No pointer-events: none on SVG elements
- [x] Commits 3f6e324 and 1750f05 exist

## Self-Check: PASSED
