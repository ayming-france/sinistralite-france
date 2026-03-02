---
phase: 07-structure-svg
plan: "01"
subsystem: map
tags: [svg, carte, responsive, css]
dependency_graph:
  requires: []
  provides: [map-svg-structure, map-css]
  affects: [index.html, styles/map.css]
tech_stack:
  added: []
  patterns: [inline-svg-grouped-by-caisse, responsive-svg-width-100pct, explicit-fill-css]
key_files:
  created:
    - styles/map.css
  modified:
    - index.html
decisions:
  - "Chemins SVG approximatifs (placeholders) utilisés suite à l'indisponibilité du source regisenguehard/carte-france-svg (404 au téléchargement)"
  - "map-section placé en dehors de .results-section pour rester visible sans sélection de secteur"
  - "Deux SVGs indépendants (AT + Trajet) pour permettre la coloration indépendante en Phase 8"
metrics:
  duration: "8 minutes"
  completed: "2026-03-02"
  tasks: 2
  files: 2
---

# Phase 7 Plan 01: Structure SVG de la carte régionale - Résumé

**One-liner:** SVG inline de France métropolitaine groupé par 16 caisses Carsat via `<g data-caisse>`, avec map.css responsive (width:100%, overflow:hidden, fill explicite)

## Objectif

Construire la carte SVG de France métropolitaine groupée par caisse régionale et l'intégrer dans les vues AT et Trajet du tableau de bord.

## Ce qui a été accompli

### Tâche 1 - styles/map.css (commit: a0dd2b3)

Création du fichier CSS dédié à la carte avec:
- `.map-section` (margin-top/bottom, responsive)
- `.map-title` (uppercase, text-secondary)
- `.map-wrap` avec `overflow: hidden` (critique pour MAP-11 - pas de scroll horizontal à 375px)
- `.map-svg` avec `display: block; width: 100%; height: auto`
- `.map-caisse` avec `fill: var(--border-light)` (evite l'héritage de currentColor en noir)
- `.map-caisse path { fill: inherit }` (garantit la propagation sur les paths enfants)
- Media query 768px pour réduire le margin-top mobile

### Tâche 2 - Intégration SVG dans index.html (commit: 107f04e)

Modifications de index.html:
- Ajout `<link rel="stylesheet" href="styles/map.css">` dans `<head>` après drawers.css
- Bloc `#at-mapSection` avec SVG `#france-map-at` dans `#view-at` (après `.results-section`)
- Bloc `#trajet-mapSection` avec SVG `#france-map-trajet` dans `#view-trajet` (après `.results-section`)
- 16 groupes `<g data-caisse="...">` par SVG, 32 au total (16 caisses x 2 vues)
- Tous les 96 départements métropolitains couverts + Corse (2A, 2B) dans `sud-est`
- DOM-TOM exclus avec commentaire HTML (protection Phase 8)
- Aucun 4e onglet nav ajouté, nav.js et state.js non modifiés

## Vérifications réussies

1. `grep -c 'data-caisse=' index.html` retourne 32 (>= 32)
2. `grep -q 'map\.css' index.html` passe
3. Aucun `data-view="map"` dans index.html (pas de 4e onglet)
4. `overflow: hidden` dans map.css
5. `fill: var(--border-light)` dans map.css
6. `data-caisse="cramif"` présent dans les deux vues

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Chemins SVG approximatifs utilisés suite à l'indisponibilité du source**
- **Found during:** Tâche 2
- **Issue:** `curl` vers `https://raw.githubusercontent.com/regisenguehard/carte-france-svg/main/carte-france.svg` retourne 404. Chemin réel du fichier dans le repo inconnu (API GitHub aussi inaccessible)
- **Fix:** Fallback sur les chemins approximatifs fournis dans le plan, comme spécifié: "utiliser les chemins approximatifs du plan comme fallback"
- **Impact:** Structure correcte (16 groupes data-caisse, 96 paths), géographie schématique. Phase 8 peut corriger les paths réels si nécessaire
- **Files modified:** index.html
- **Commits:** 107f04e

## Décisions prises

| Décision | Justification |
|----------|---------------|
| Chemins SVG approximatifs | Source regisenguehard/carte-france-svg inaccessible (404). Fallback prévu dans le plan. |
| map-section hors .results-section | Carte toujours visible, même sans secteur sélectionné (MAP-04) |
| Deux SVG séparés par vue | Permet la coloration indépendante AT vs Trajet en Phase 8 |
| Corse (2A/2B) incluse dans sud-est | Cohérent avec le tableau département-caisse de RESEARCH.md |

## Self-Check: PASSED

- styles/map.css: créé, 46 lignes, règles critiques présentes
- index.html: modifié, 32 data-caisse présents, link map.css présent, pas de 4e onglet
- Commits: a0dd2b3 (map.css), 107f04e (index.html)
