---
phase: 08-choroplethe-et-interactions
verified: 2026-03-02T17:00:00Z
status: human_needed
score: 8/8 must-haves verified (automated)
human_verification:
  - test: "Coloration bleue séquentielle visible sur la vue AT et la vue Trajet"
    expected: "Les 16 caisses métropolitaines affichent des nuances de bleu différentes. Île-de-France (cramif) devrait être la plus foncée. Aucune région grise."
    why_human: "La coloration SVG dépend de l'exécution JS et du chargement de regional-data.json — non vérifiable par grep."
  - test: "Légende à 5 paliers lisible sous la carte"
    expected: "5 rectangles de couleur du clair au foncé avec valeurs min et max formatées en fr-FR (ex: 42 000 / 215 000)."
    why_human: "Rendu visuel et lisibilité ne peuvent être vérifiés programmatiquement."
  - test: "Tooltip au survol desktop"
    expected: "Survoler une région affiche une bulle avec le nom de la caisse, la valeur et l'année. Le tooltip reste dans le viewport (ne dépasse pas les bords)."
    why_human: "Comportement interactif temps-réel, clamping viewport uniquement vérifiable en navigateur."
  - test: "Sélecteur d'année 2020-2024 met à jour la carte, la légende et le classement"
    expected: "Changer l'année à 2020 puis 2024 modifie visiblement les couleurs, recalcule la légende et réordonne le classement."
    why_human: "Coordination des trois composants au changement d'état ne peut pas être vérifiée statiquement."
  - test: "Classement en barres horizontales proportionnelles"
    expected: "16 caisses listées avec barres dont la largeur est proportionnelle à la valeur. Bouton de tri bascule entre croissant et décroissant."
    why_human: "Proportionnalité visuelle des barres et comportement de tri requièrent une observation en navigateur."
  - test: "Highlight bidirectionnel carte-classement"
    expected: "Survoler une caisse sur la carte met en évidence la ligne correspondante dans le classement, et vice versa."
    why_human: "Comportement interactif bidirectionnel uniquement vérifiable en navigateur."
  - test: "Vue Trajet indépendante de la vue AT"
    expected: "L'onglet Trajet affiche ses propres couleurs, légende, sélecteur et classement avec des valeurs différentes de celles de AT."
    why_human: "Indépendance visuelle des deux SVGs et de leurs données requiert vérification en navigateur."
  - test: "Layout responsive à 375px"
    expected: "À 375px de largeur, le classement passe sous la carte, pas de scroll horizontal."
    why_human: "Comportement responsive uniquement vérifiable avec outils de développement navigateur."
---

# Phase 8: Choroplèthe et interactions - Rapport de vérification

**Phase Goal:** La carte est colorée proportionnellement aux données de la caisse sélectionnée, avec une légende lisible, un tooltip informatif sur desktop, un sélecteur d'année et un classement des régions.
**Verified:** 2026-03-02T17:00:00Z
**Status:** human_needed (tous les checks automatisés passent, vérification visuelle humaine requise)
**Re-verification:** Non - vérification initiale

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                          | Status     | Evidence                                                          |
|----|-----------------------------------------------------------------------------------------------|------------|-------------------------------------------------------------------|
| 1  | 16 caisses métropolitaines colorées proportionnellement au chargement (2023 par défaut)       | VERIFIED   | `interpolateColor`, `colorierCarte`, `DEFAULT_YEAR='2023'` dans map.js (lignes 17-19, 28, 78) |
| 2  | La couleur change selon AT ou Trajet (vues indépendantes)                                    | VERIFIED   | `colorierCarte('at'...)` et `colorierCarte('trajet'...)` appelés séparément sur deux SVGs (lignes 326-327) |
| 3  | Légende à 5 paliers avec min-max et couleurs correspondantes                                 | VERIFIED   | `renderLegende` génère 5 swatches t=0,0.25,0.5,0.75,1.0 (lignes 58-76), CSS `.legend-swatch` présent |
| 4  | Année par défaut 2023 au premier chargement                                                  | VERIFIED   | `const DEFAULT_YEAR = '2023'` (ligne 19), options `<select>` avec `selected` sur 2023 |
| 5  | Tooltip desktop: nom de caisse, valeur, année, viewport-clampé                              | VERIFIED   | `setupTooltip` avec `mousemove`, `e.target.closest('[data-caisse]')`, clamping left/top (lignes 198-247) |
| 6  | Sélecteur d'année 2020-2024 met à jour carte + légende + classement simultanément           | VERIFIED   | `setupYearSelector` -> `updateMap` -> `colorierCarte` + `renderRanking` (lignes 173-189) |
| 7  | Panneau de classement: 16 caisses triées, bouton de tri pour inverser l'ordre               | VERIFIED   | `renderRanking`, `setupSortButton`, `sortState` (lignes 113-165) |
| 8  | Highlight bidirectionnel carte-classement                                                    | VERIFIED   | `pointerover`/`pointerout` sur SVG et `rankingList` (lignes 258-289), class `.ranking-active` |

**Score:** 8/8 truths verified (automatique)

---

### Required Artifacts

| Artifact               | Expected                                     | Status   | Details                                                  |
|------------------------|----------------------------------------------|----------|----------------------------------------------------------|
| `js/map.js`            | Choropleth, legend, tooltip, ranking, wiring | VERIFIED | Toutes les fonctions présentes et câblées dans DOMContentLoaded |
| `styles/map.css`       | Legend, tooltip, ranking, responsive         | VERIFIED | `.legend-swatch`, `.map-tooltip`, `.ranking-item`, `flex-direction: column` @768px |
| `index.html`           | Legend containers, year selectors, tooltip div, ranking | VERIFIED | `at-mapLegend`, `trajet-mapLegend`, `at-yearSelect`, `trajet-yearSelect`, `at-rankingList`, `trajet-rankingList`, `mapTooltip` |
| `data/regional-data.json` | Source de données régionales            | VERIFIED | 557 lignes, fichier présent |

---

### Key Link Verification

| From                  | To                              | Via                                | Status   | Details                                         |
|-----------------------|---------------------------------|------------------------------------|----------|-------------------------------------------------|
| `js/map.js`           | `data/regional-data.json`       | `fetch()` sur DOMContentLoaded     | WIRED    | Ligne 319: `fetch('data/regional-data.json')`   |
| `js/map.js`           | SVG `[data-caisse]` fill        | `el.style.fill`                    | WIRED    | Ligne 106: `el.style.fill = interpolateColor(...)` |
| `js/map.js tooltip`   | SVG `mousemove` + `[data-caisse]` | event delegation                | WIRED    | Ligne 207-208: `mousemove` + `closest('[data-caisse]')` |
| `js/map.js` year      | `colorierCarte` + `renderRanking` | `change` event sur `select`    | WIRED    | Ligne 177: `addEventListener('change', ...)` -> `updateMap` |
| `renderRanking`       | `ranking-item` innerHTML        | innerHTML replacement              | WIRED    | Ligne 148: template `ranking-item` avec barres proportionnelles |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                              | Status      | Evidence                              |
|-------------|------------|----------------------------------------------------------|-------------|---------------------------------------|
| MAP-02      | 08-01, 08-03 | Choropleth coloring with sequential color scale         | SATISFIED   | `interpolateColor` + `colorierCarte` sur 16 METRO_IDS |
| MAP-03      | 08-01, 08-03 | Color legend showing scale range and units              | SATISFIED   | `renderLegende` 5 swatches + CSS `.legend-swatch` |
| MAP-05      | 08-01, 08-03 | Default year is 2023                                    | SATISFIED   | `DEFAULT_YEAR = '2023'`, option `selected` dans HTML |
| MAP-06      | 08-02, 08-03 | Desktop tooltip showing region name and stats on hover  | SATISFIED   | `setupTooltip` avec viewport clamping, suppression touch |
| MAP-07      | 08-01, 08-03 | AT/Trajet views colored independently                   | SATISFIED   | Deux SVGs séparés (`france-map-at`, `france-map-trajet`), appels indépendants |
| MAP-08      | 08-02, 08-03 | Discreet year selector 2020-2024                        | SATISFIED   | `at-yearSelect`, `trajet-yearSelect` avec options 2020-2024 |
| MAP-09      | 08-02, 08-03 | Sortable region ranking sidebar                         | SATISFIED   | `renderRanking` + `setupSortButton` + `sortState`, barres horizontales |

**Aucun requirement orphelin.** Tous les IDs MAP-02, MAP-03, MAP-05, MAP-06, MAP-07, MAP-08, MAP-09 sont couverts par les plans 08-01, 08-02, 08-03 et implémentés dans le code.

---

### Anti-Patterns Found

Aucun anti-pattern bloquant détecté. Les seuls `return null` présents (lignes 90, 129) sont des retours anticipés légitimes (caisse introuvable dans les données), pas des stubs.

---

### Human Verification Required

Plan 08-03 était explicitement un plan de vérification humaine (`type: execute`, `checkpoint:human-verify`, `gate: blocking`). Il documente une approbation humaine avec la mention "Nice idea! Looks great!" après 5 améliorations UX in-situ. Cette approbation est historique, pas programmatique.

Les points suivants requièrent une vérification humaine pour confirmer l'état actuel du code (les améliorations UX de 08-03 ont modifié le code après l'approbation initiale):

**1. Coloration choroplèthe visible (MAP-02, MAP-07)**
- Test: Ouvrir `index.html`, vérifier que AT et Trajet affichent des nuances de bleu distinctes.
- Expected: Île-de-France plus foncée, gradient visible entre les régions.
- Why human: Rendu SVG via JS au runtime.

**2. Légende à 5 paliers lisible (MAP-03)**
- Test: Vérifier que les 5 swatches s'affichent sous la carte avec valeurs min/max.
- Expected: 5 rectangles colorés du clair au foncé, chiffres lisibles en format fr-FR.
- Why human: Rendu visuel.

**3. Tooltip desktop avec clamping (MAP-06)**
- Test: Survoler plusieurs régions, y compris les régions en bords de viewport.
- Expected: Tooltip visible, jamais coupé, contient nom + valeur + année.
- Why human: Comportement interactif et clamping geometrique.

**4. Sélecteur d'année coordonné (MAP-08)**
- Test: Changer l'année, vérifier que carte + légende + classement changent simultanément.
- Expected: Les 3 composants se mettent à jour sans décalage ni erreur console.
- Why human: Coordination d'état dynamique.

**5. Classement barres horizontales et tri (MAP-09)**
- Test: Vérifier le rendu en barres proportionnelles, cliquer le bouton de tri.
- Expected: Barres proportionnelles, tri bascule croissant/décroissant, les 16 caisses visibles sans scroll.
- Why human: Proportionnalité visuelle et comportement de tri.

**6. Highlight bidirectionnel carte-classement**
- Test: Survoler une caisse sur la carte puis une ligne du classement.
- Expected: La ligne correspondante s'active (côté carte) ou la caisse brille (côté classement).
- Why human: Comportement interactif bidirectionnel.

**7. Vue Trajet indépendante (MAP-07)**
- Test: Basculer sur l'onglet Trajet, vérifier données et contrôles indépendants.
- Expected: Valeurs différentes de AT, sélecteur d'année et classement propres à la vue.
- Why human: Isolation des états entre vues.

**8. Layout responsive 375px**
- Test: DevTools, 375px de largeur.
- Expected: Classement passe sous la carte, pas de scroll horizontal.
- Why human: Comportement responsive uniquement visible en navigateur.

---

### Gaps Summary

Aucun gap bloquant identifié par vérification automatique. Le code implémente toutes les fonctionnalités requises avec câblage complet.

Le statut `human_needed` reflète que la Phase 8 inclut un plan de vérification humaine (08-03) dont l'approbation est documentée dans le SUMMARY mais non vérifiable par grep. Une confirmation visuelle rapide en navigateur clôture définitivement la phase.

---

_Verified: 2026-03-02T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
