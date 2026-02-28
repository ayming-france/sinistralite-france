---
phase: 03-accessibilit
plan: 01
subsystem: accessibility
tags: [aria, focus-management, keyboard-nav, skip-link, wcag]
dependency_graph:
  requires: []
  provides: [A11Y-01, A11Y-02, A11Y-03]
  affects: [index.html, styles/base.css, js/insights.js, js/app.js]
tech_stack:
  added: []
  patterns: [skip-link, focus-trap-vanilla, aria-expanded-sync, focus-visible-css]
key_files:
  created: []
  modified:
    - index.html
    - styles/base.css
    - js/insights.js
    - js/app.js
decisions:
  - "Focus trap implémenté en vanilla JS (pas de lib focus-trap) -- 2 drawers simples ne justifient pas une dépendance CDN"
  - "releaseFocus exporté depuis insights.js pour être disponible dans app.js si besoin futur"
  - "Escape handler dans app.js route via toggleInsights/toggleShare -- pas de releaseFocus dupliqué"
  - "aria-expanded synchronisé via setAllBtns pour les 3 préfixes (at/mp/trajet) en une seule passe"
  - "tabindex=-1 sur #main-content pour que le focus programmatique fonctionne dans tous les navigateurs"
metrics:
  duration: 3
  completed: 2026-02-28
  tasks_completed: 2
  files_modified: 4
---

# Phase 3 Plan 1: Accessibilité ARIA Complète

**One-liner:** Skip link, 38 aria-labels français, focus trap vanilla sur 2 drawers, aria-expanded synchronisé sur 6 boutons, et :focus-visible global.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Skip link, aria-labels, drawer roles, :focus-visible CSS | f859bba | index.html, styles/base.css |
| 2 | Focus trap, aria-expanded sync, Escape handler | f76c56b | js/insights.js, js/app.js |

## What Was Built

### Task 1: Markup ARIA et CSS

**index.html:**
- Skip link `<a href="#main-content" class="skip-link">Aller au contenu principal</a>` inséré comme premier enfant de `<body>`
- `id="main-content"` et `tabindex="-1"` ajoutés au `.container` pour permettre le focus programmatique cross-browser
- 38 attributs `aria-label` ajoutés à tous les éléments interactifs (logo, 4 boutons nav rail, 3 inputs de recherche, 6 boutons action Insights/Share, 2 boutons close, 9 boutons niveau NAF, 6 boutons comp-toggle)
- `aria-expanded="false"` ajouté aux 6 boutons déclencheurs de drawers (insightsBtn, mp-insightsBtn, trajet-insightsBtn, shareBtn, mp-shareBtn, trajet-shareBtn)
- `role="dialog" aria-modal="true" aria-label="Insights"` sur `#insightsDrawer`
- `role="dialog" aria-modal="true" aria-label="Partager"` sur `#shareDrawer`
- `aria-live="polite"` sur `#drawerBody` pour les annonces screen reader
- `aria-label` ajoutés aux boutons close des drawers

**styles/base.css:**
- `.skip-link` CSS: position absolute, top -100% par défaut, top 0 au :focus, z-index 9999
- `:focus-visible` global: outline 2px solid var(--accent), offset 2px, border-radius 2px
- `:focus:not(:focus-visible)` global: outline none (pas d'outline au clic souris)

### Task 2: Focus Management JS

**js/insights.js:**
- `FOCUSABLE` constant: sélecteur de tous les éléments tabbables dans un drawer
- `trapFocus(drawer)`: écoute Tab/Shift+Tab, cycle entre premier et dernier focusable, stocke le handler sur `drawer._trapHandler`
- `releaseFocus(drawer)`: retire l'écouteur keydown stocké dans `drawer._trapHandler`, exporté pour app.js
- `setAllBtns` mis à jour: synchronise `aria-expanded` ('true'/'false') sur tous les boutons préfixés en plus du classList.toggle
- `toggleInsights` mis à jour: appelle trapFocus + focus sur .close-btn à l'ouverture; releaseFocus + focus sur trigger de la vue courante à la fermeture; libère aussi le focus trap du shareDrawer si nécessaire
- `toggleShare` mis à jour: même pattern que toggleInsights pour le share drawer

**js/app.js:**
- Import `releaseFocus` ajouté depuis insights.js
- Escape handler inchangé: route via toggleInsights/toggleShare qui gèrent déjà releaseFocus et le retour du focus

## Verification Results

| Critère | Résultat |
|---------|----------|
| skip-link dans index.html | 1 occurrence |
| aria-label total dans index.html | 38 attributs |
| role=dialog dans index.html | 2 occurrences |
| focus-visible dans base.css | 2 règles |
| trapFocus dans insights.js | 3 appels |
| releaseFocus dans insights.js | 5 appels |
| aria-expanded dans insights.js | 1 setAttribute |
| FOCUSABLE dans insights.js | 2 références |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files verified:
- index.html: FOUND (38 aria-labels, 1 skip-link, 2 role=dialog, 6 aria-expanded=false)
- styles/base.css: FOUND (.skip-link et :focus-visible présents)
- js/insights.js: FOUND (trapFocus, releaseFocus, FOCUSABLE, setAllBtns mis à jour)
- js/app.js: FOUND (import releaseFocus ajouté)

Commits verified:
- f859bba: FOUND (Task 1)
- f76c56b: FOUND (Task 2)
