---
phase: 04-export-csv
plan: 01
subsystem: export
tags: [csv, download, share-drawer, accessibility]
dependency_graph:
  requires: []
  provides: [csv-export]
  affects: [index.html, js/insights.js, js/app.js]
tech_stack:
  added: []
  patterns: [Blob + BOM UTF-8, URL.createObjectURL, disabled state management]
key_files:
  created: []
  modified:
    - index.html
    - js/insights.js
    - js/app.js
decisions:
  - "downloadCSV uses hardcoded eventLabel map rather than importing VIEW_CONFIG into insights.js to avoid circular dependencies"
  - "CSV button disabled state updated at render() end and at share drawer open to cover view-switch scenarios"
  - "taux_gravite absent in Trajet data: null guard outputs empty string in CSV (not zero)"
metrics:
  duration: 2 min
  completed: 2026-02-28
---

# Phase 4 Plan 01: Export CSV Summary

**One-liner:** Export CSV from Share drawer with UTF-8 BOM, semicolon separator, and per-view disabled state, replacing the broken PDF button.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace PDF button with CSV button and implement downloadCSV | 056ebc1 | index.html, js/insights.js |
| 2 | Wire CSV button listener and disabled state management | 2d11c42 | js/app.js |

## What Was Built

The broken "Télécharger PDF" button (which called `window.print()`) in the Share drawer has been fully replaced by a functional "Télécharger CSV" button that exports the currently selected sector's KPI data.

### index.html
- `#downloadPDFBtn` replaced with `#downloadCSVBtn`
- Button starts `disabled` with `aria-disabled="true"` and a descriptive `aria-label`

### js/insights.js
- `downloadPDF()` removed entirely
- New `downloadCSV(viewId)` function:
  - Guards on `!vs.code` (returns early if no sector selected)
  - Escapes libelle double-quotes for CSV safety
  - UTF-8 BOM (`\uFEFF`) ensures Excel opens accents correctly
  - Semicolon separator (French Excel convention)
  - Headers: Code NAF, Secteur, Indice de fréquence, Taux de gravité, {eventLabel}, Incapacités permanentes, Décès, Jours perdus, Salariés
  - Null guards for all optional fields (`taux_gravite` absent in Trajet)
  - Filename: `sinistralite-{AT|MP|Trajet}-{code}.csv`
  - Synthetic anchor pattern with `URL.createObjectURL` / `revokeObjectURL`

### js/app.js
- Import updated: `downloadPDF` replaced with `downloadCSV`
- New `updateCSVBtnState()` helper reads `state.views[activeView].code`
- `render()` calls `updateCSVBtnState()` after sector selection
- Share button click handlers call `updateCSVBtnState()` before opening drawer (covers view-switch scenario)
- CSV button click calls `downloadCSV(state.activeView)`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- index.html: FOUND
- js/insights.js: FOUND
- js/app.js: FOUND

Commits:
- 056ebc1: FOUND
- 2d11c42: FOUND
