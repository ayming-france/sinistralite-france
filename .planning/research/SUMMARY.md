# Project Research Summary

**Project:** Sinistralité France — milestone v1.1 carte régionale AT/Trajet
**Domain:** SVG choroplèthe interactif intégré à un tableau de bord vanilla JS existant
**Researched:** 2026-02-28
**Confidence:** HIGH (stack et architecture basés sur inspection directe du code existant)

## Executive Summary

Ce milestone ajoute une vue carte choroplèthe par caisse régionale au tableau de bord de sinistralité France existant (7 091 LOC, Chart.js 4.4.7, vanilla JS, GitHub Pages). La contrainte fondamentale est l'absence de build step et de dépendances externes. L'approche validée par la recherche est un SVG France inline dans le HTML avec coloration directe via `setAttribute('fill')`, des données extraites du rapport annuel Ameli par un nouveau script Python (`parse_regional.py`), et une intégration comme quatrième vue dans le système de navigation existant. Aucune librairie cartographique (D3, Leaflet, amCharts) n'est justifiée pour 21 régions statiques.

Le premier risque majeur est le mapping caisses-régions, qui n'est pas bijectif. Les 21 caisses du rapport Ameli ne correspondent pas aux 13 régions administratives post-2016 : la région Auvergne-Rhône-Alpes est couverte par deux caisses distinctes (Carsat Auvergne et Carsat Rhône-Alpes), et les DOM-TOM utilisent des CGSS, pas des CARSAT. La table de correspondance doit être construite manuellement et validée avant toute autre étape. Le second risque est le parsing PDF : les noms de caisses longs wrappent sur plusieurs lignes dans `extract_table()` et les cellules fusionnées retournent `None`, deux comportements qui causent des échecs silencieux si non traités explicitement.

La stratégie de mitigation est séquentielle et bien définie. Le pipeline Python doit être validé en premier, car le JSON régional est un prérequis bloquant pour tout le frontend. L'SVG doit être sourcé depuis Wikimedia Commons (CC BY-SA 3.0, DOM-TOM en inset inclus) et adapté manuellement pour correspondre à la géographie des caisses, pas aux régions administratives standard. Le rendu frontend suit les patterns établis du projet existant : `map.js` comme module pair de `kpi.js` et `charts.js`, `map.css` comme feuille de styles isolée, le tout branché sur le `state.activeView` existant sans modifier les cycles de rendu actuels.

## Key Findings

### Recommended Stack

Le projet existant impose une contrainte forte : zéro nouvelle dépendance browser-side. Cette contrainte est tenable car l'API SVG DOM (`path.style.fill = color`) couvre entièrement le besoin de choroplèthe, et une fonction `interpolateColor()` de 10 lignes remplace Chroma.js (58 Ko). Le seul ajout pipeline est `pdfplumber 0.11.9` (déjà dans le venv) pour l'extraction des Tableaux 9 et 17 du rapport annuel. La source SVG recommandée est Wikimedia Commons (CC BY-SA 3.0), à adapter manuellement pour grouper les départements par caisse et non par région administrative.

**Technologies principales:**
- SVG inline handcrafté: carte France par caisse régionale — zéro dépendance, manipulation directe depuis JS
- Vanilla JS ES2020 (existant): coloration, tooltip, event handling — déjà standard du projet
- pdfplumber 0.11.9: extraction des tableaux PDF du rapport annuel — déjà présent dans le pipeline

**Bibliothèques exclues avec justification:**
- D3.js: 60+ Ko, nécessite GeoJSON + projection pour une carte statique de 21 polygones
- Leaflet: librairie tile-map, aucun apport pour un choroplèthe statique
- Chroma.js: 58 Ko CDN pour une interpolation linéaire deux couleurs
- simplemaps SVG France: mappe les 13 régions post-2016, pas les caisses régionales

### Expected Features

La recherche identifie 10 fonctionnalités table stakes (attendues par défaut) et 6 différenciateurs. La carte sans coloration proportionnelle et sans tooltip n'a pas de valeur. Le sélecteur d'année (5 boutons pour 2020-2024) est attendu. Le comportement touch mobile est table stakes, pas une amélioration optionnelle.

**Must have — v1.1 (prérequis pour publier):**
- SVG France schématique, 21 caisses identifiées par ID, DOM-TOM en inset
- Coloration choroplèthe proportionnelle aux comptages bruts, palette séquentielle 5 paliers
- Légende avec les 5 paliers et leurs valeurs
- Tooltip desktop: nom caisse, valeur, année
- Mise en évidence de la région survolée (stroke + opacité)
- Sélecteur d'année (2020-2024)
- Comportement touch mobile: tap ouvre panneau fixe en bas
- Intégration dans vues AT et Trajet (pas de nouvelle vue dédiée)
- Note "Données non disponibles" dans la vue MP

**Should have — v1.1.x (après validation):**
- Panneau de détail au clic avec stats complètes de la caisse
- Mini graphique d'évolution (Chart.js déjà chargé) dans le panneau
- Classement de la caisse parmi les 21 (calculé en JS)
- Transition CSS animée sur `fill` au changement d'année
- Mise en évidence automatique de la région max

**Defer — v2+ (hors scope v1.1):**
- Lien carte vers vue sectorielle (nécessite données régionales par NAF, non disponibles)
- IF régional normalisé (effectifs par caisse absents des tableaux 9 et 17)
- Carte MP (données régionales absentes du rapport annuel pour les maladies professionnelles)

**Anti-features confirmées:**
- Zoom/pan SVG: coût élevé en vanilla JS, aucune valeur pour 21 régions toutes visibles
- 4e onglet de navigation dédié "Carte": casse la symétrie AT/MP/Trajet
- Animation temporelle automatique: 5 points de données, valeur limitée face à la complexité

### Architecture Approach

La carte s'intègre comme vue pair dans le système existant, sans modifier les cycles de rendu actuels. Le SVG France est inline dans `index.html` (15-30 Ko, acceptable, compressé par gzip). `map.js` est un nouveau module ES isolé, analogue à `kpi.js` et `charts.js`. `app.js` l'importe et l'appelle depuis `DOMContentLoaded`, hors de la fonction `render()` existante. Le JSON régional (`regional-data.json`) suit la convention des 3 datasets existants et est chargé au boot via le même `Promise.all`.

**Composants majeurs:**
1. `data/pipeline/parse_regional.py` (nouveau): parse Tableau 9 (AT) et Tableau 17 (Trajet) du rapport annuel PDF, produit `regional-data.json`
2. `data/regional-data.json` (nouveau): 21 caisses, comptages AT et Trajet 2020-2024, structuré par année
3. `js/map.js` (nouveau): `initMap()`, `updateChoropleth()`, tooltip, toggle métrique et année
4. `styles/map.css` (nouveau): fill choroplèthe, tooltip, légende, transitions hover
5. Modifications légères: `data.js` (+loadDataset regional), `state.js` (+state.map), `nav.js` (+switchView map), `app.js` (+initMap), `index.html` (+view-map, +SVG inline, +nav button)
6. Inchangés: `search.js`, `kpi.js`, `charts.js`, `insights.js`, `utils.js`, tous les CSS existants sauf `nav.css` (ajout mineur)

**Ordre de construction contraint par les dépendances:**
Pipeline Python (JSON valide) => data.js + state.js => SVG inline + IDs => map.js skeleton => tooltip => controls => navigation => intégration refresh_data.py

### Critical Pitfalls

1. **Mapping caisse-to-région non bijectif** — La table doit être construite manuellement. 16 caisses métropolitaines couvrent 13 régions admin. Auvergne-Rhône-Alpes agrège deux caisses distinctes. DOM-TOM hors carte métropolitaine. Prévention: assertion Python `len(mapping) == 16` avant tout rendu.

2. **Noms de caisses multi-lignes dans pdfplumber** — Les cellules de nom wrappent sur 2 lignes physiques dans le PDF. Appliquer `' '.join(cell.split())` sur chaque cellule de nom. Tester spécifiquement "Bourgogne-Franche-Comté" et "Île-de-France". Assertion: nombre de caisses extraites == nombre attendu.

3. **Cellules fusionnées (merged cells) et lignes de total** — pdfplumber retourne `None` pour les cellules fusionnées. Filtrer les lignes où toutes les colonnes numériques sont `None`. Détecter les lignes "Total" / "Ensemble" et les exclure. Logger les lignes non reconnues plutôt que de les ignorer.

4. **Palette de couleurs faussée par un outlier régional** — L'interpolation linéaire min-max est inexploitable si une région domine. Calculer d'abord la distribution des vraies données, puis choisir la méthode (linéaire, clamped au 95e percentile, logarithmique). Ne pas choisir l'algorithme avant d'avoir les vraies données.

5. **Conflits CSS avec le dashboard existant** — `path { fill: none }` en CSS global (utilisé par Chart.js) efface toutes les régions SVG. Encapsuler dans `.map-container svg path`. Inspecter les règles héritées dans DevTools avant d'implémenter la coloration. Tooltips en `position: fixed` pour éviter le clipping par `overflow: hidden`.

6. **Hover inexistant sur mobile** — `mouseenter`/`mouseleave` ne se déclenchent pas sur touch. Utiliser `pointerover`/`pointerout` unifiés. Sur mobile: afficher un panneau fixe en bas, pas un tooltip flottant. Implémenter dès le début, pas comme amélioration a posteriori.

## Implications for Roadmap

La recherche révèle une dépendance séquentielle forte entre les phases. Le JSON régional est un prérequis bloquant pour tout le frontend. L'SVG structure est un prérequis bloquant pour tout rendu. Quatre phases se dégagent naturellement de ces contraintes.

### Phase 1: Pipeline PDF — Extraction régionale

**Rationale:** Le JSON régional est le prérequis bloquant de tout le reste. Sans données valides, le frontend ne peut pas avancer. Cette phase doit être complète et vérifiée avant d'écrire une seule ligne de JavaScript.

**Delivers:** `data/pipeline/parse_regional.py` fonctionnel + `data/regional-data.json` validé (21 caisses, AT + Trajet, 2020-2024)

**Addresses:**
- Table de mapping caisse-to-région construite et vérifiée manuellement
- Normalisation des noms multi-lignes via `' '.join(cell.split())`
- Filtrage des cellules fusionnées et des lignes de total
- Test du parser sur les PDF éditions 2023 et 2024 simultanément

**Avoids:** Pitfalls 1, 2, 3, 8, 9 (tous liés au pipeline PDF)

**Research flag:** Standard. pdfplumber bien documenté. Patterns de merge multi-lignes documentés dans les issues GitHub. Pas besoin de recherche additionnelle.

### Phase 2: SVG France — Sourcing et intégration structure

**Rationale:** L'SVG doit exister dans le DOM avant que `map.js` puisse interroger les `<path>`. C'est le second prérequis technique. L'adaptation manuelle (regroupement par caisse, attribution des IDs) prend du temps et doit être traitée séparément du code.

**Delivers:** SVG France inline dans `index.html` avec 21+ paths identifiés par `data-caisse` correspondant aux clés du JSON régional. DOM-TOM en inset. CSS responsive (`viewBox` sans `width`/`height` fixe).

**Uses:** Wikimedia Commons SVG (CC BY-SA 3.0), Inkscape pour le nettoyage et la simplification des paths

**Addresses:**
- viewBox sans width/height fixe (responsive dès le début)
- Préfixage des IDs SVG (`map-reg-XX`) pour éviter les conflits DOM
- Inspection CSS dans DevTools: vérifier qu'aucune règle existante n'affecte les paths cartographiques

**Avoids:** Pitfalls 3 (SVG non responsive), 7 (conflits CSS/DOM)

**Research flag:** Standard. Pattern inline SVG documenté et validé. Pas de recherche additionnelle.

### Phase 3: Rendu choroplèthe et interactions

**Rationale:** Une fois les données et l'SVG en place, la logique de rendu peut être construite en un seul bloc. Coloration, légende, tooltip desktop, highlight hover et sélecteur d'année sont interdépendants et se développent mieux ensemble.

**Delivers:** `js/map.js` complet (table stakes v1.1) + `styles/map.css`. Carte colorée avec légende, tooltip desktop fonctionnel, sélecteur d'année 2020-2024, bascule AT/Trajet.

**Uses:** `interpolateColor()` inline (10 lignes), palette séquentielle ColorBrewer validée en simulation daltonienne, tooltip `position: fixed` + `pointer-events: none`

**Addresses:**
- Distribution des vraies données calculée avant de choisir la méthode de couleur
- Test Deuteranopia dans Chrome DevTools (Rendering > Emulate vision deficiencies)
- Tooltip `position: fixed` pour éviter le clipping et le flickering

**Avoids:** Pitfalls 4 (outlier couleur), 5 (palette inaccessible), 7 (tooltip clipping)

**Research flag:** Standard pour desktop. Les patterns SVG choroplèthe sans librairie sont bien établis.

### Phase 4: Intégration navigation et mobile

**Rationale:** La navigation et le comportement mobile se greffent sur un rendu fonctionnel. C'est la phase d'assemblage final: wiring `switchView('map')`, hash routing `#map`, fourth tab mobile, events touch, note MP sans données.

**Delivers:** Vue carte accessible depuis la navigation existante. Comportement touch correct sur vrai appareil. URL hashable (`#map`, `#map/at`, `#map/trajet`). Intégration optionnelle dans `refresh_data.py` via `--rapport-pdf`.

**Addresses:**
- `pointerover`/`pointerout` à la place de `mouseover`/`mouseout`
- Panneau fixe en bas de carte sur mobile (pas tooltip flottant)
- `touch-action: none` sur SVG pour éviter scroll parasite lors du tap sur petite région
- Masquage ou message explicatif dans la vue MP

**Avoids:** Pitfall 6 (hover inexistant sur mobile)

**Research flag:** Standard. Le wiring navigation suit le pattern existant documenté dans ARCHITECTURE.md. Tester sur vrai appareil iOS/Android, pas seulement en émulation DevTools.

### Phase Ordering Rationale

- Pipeline avant frontend: dépendance bloquante. Pas de JSON = pas de coloration possible.
- SVG avant map.js: `document.getElementById('caisse-XX')` dans `initMap()` doit trouver les paths dans le DOM.
- Rendu avant navigation: inutile de router vers une vue qui n'existe pas encore.
- Mobile en dernière phase: le panneau fixe mobile réutilise le panneau de détail au clic (v1.1.x), il est logique de l'implémenter quand la structure du panneau est stable.

### Research Flags

Phases avec patterns bien documentés (pas de recherche additionnelle nécessaire):
- **Phase 1:** pdfplumber 0.11.9, patterns multi-lignes documentés dans les issues GitHub officielles
- **Phase 2:** Pattern SVG inline choroplèthe, viewBox responsive, standard DOM
- **Phase 3:** Interpolation couleur vanilla JS, patterns tooltip SVG, palettes ColorBrewer
- **Phase 4:** Pattern `switchView` existant documenté dans ARCHITECTURE.md

Aucune phase ne nécessite `/gsd:research-phase` avant planification. La recherche couvre l'ensemble du domaine avec des sources de confiance élevée.

## Confidence Assessment

| Domaine | Confiance | Notes |
|---------|-----------|-------|
| Stack | HIGH | Inspection directe du codebase existant. pdfplumber 0.11.9 vérifié sur PyPI (janvier 2026). SVG vanilla JS pattern standard, zero dépendance justifiée. |
| Features | MEDIUM | Patterns choroplèthe vérifiés via Datawrapper Academy et Leaflet docs officiels. Comportement touch basé sur littérature 2025 et sources communautaires. Inspection directe du codebase pour les points d'intégration (HIGH). |
| Architecture | HIGH | Inspection directe des fichiers `app.js`, `state.js`, `nav.js`, `data.js`, `parse_pdf.py`, `refresh_data.py`, `index.html`. Pas d'hypothèses spéculatives. Patterns de module ES vérifiés sur le code réel. |
| Pitfalls | HIGH | Sources officielles: pdfplumber GitHub issues, MDN, Datawrapper, CSS-Tricks, Smashing Magazine. Mapping caisse-région vérifié sur sources territoriales officielles CARSAT. |

**Confiance globale: HIGH**

### Gaps to Address

- **Numéros de page exacts dans le rapport annuel:** Le Tableau 9 est attendu vers p.24 et le Tableau 17 vers p.37, mais ces numéros varient selon l'édition. La Phase 1 doit commencer par `page.debug_tablefinder()` pour localiser les tableaux avant de coder l'extraction.

- **Nombre exact de lignes par édition:** Le rapport peut contenir entre 20 et 22 lignes de caisses selon l'année (Mayotte apparait à partir d'une certaine édition). L'assertion de validation doit accepter une fourchette, pas un nombre fixe.

- **Format des valeurs numériques dans le PDF:** Les comptages peuvent utiliser des espaces insécables comme séparateurs de milliers ("12 345" au lieu de "12345"). La normalisation `cell.replace('\xa0', '').replace(' ', '')` avant `int()` doit être prévue mais n'est pas confirmée sans test sur le vrai PDF.

- **Temps d'adaptation du SVG Wikimedia Commons:** La source recommandée nécessite une adaptation manuelle pour regrouper les départements par caisse. Le temps dépend de la qualité des paths dans le fichier source. Prévoir une alternative si les paths sont trop complexes à regrouper manuellement dans Inkscape.

## Sources

### Primaires (confiance HIGH)
- Inspection directe des fichiers source JS et Python du projet existant (`app.js`, `state.js`, `nav.js`, `data.js`, `parse_pdf.py`, `refresh_data.py`, `index.html`)
- [pdfplumber PyPI 0.11.9](https://pypi.org/project/pdfplumber/) — version courante, paramètres `table_settings` vérifiés
- [pdfplumber GitHub issues #768, #84, #719, #1071](https://github.com/jsvine/pdfplumber) — comportement multi-lignes, merged cells, valeurs None, snap_tolerance
- [Wikimedia Commons: France administrative divisions 2016 SVG (+overseas)](https://commons.wikimedia.org/wiki/File:France,_administrative_divisions_-_en_(%2Boverseas)_-_colored_2016.svg) — licence CC BY-SA 3.0, DOM-TOM inclus
- [Datawrapper Academy — What to consider when creating choropleth maps](https://academy.datawrapper.de/article/134-what-to-consider-when-creating-choropleth-maps) — palettes, légende, intervalles
- [Smashing Magazine — SVG Interaction with Pointer Events](https://www.smashingmagazine.com/2018/05/svg-interaction-pointer-events-property/) — pointer-events sur SVG
- [CSS-Tricks — 6 Common SVG Fails](https://css-tricks.com/6-common-svg-fails-and-how-to-fix-them/) — conflits CSS SVG inline
- [Mathisonian — Easy responsive SVGs with ViewBox](https://mathisonian.com/writing/easy-responsive-svgs-with-viewbox) — viewBox et responsive

### Secondaires (confiance MEDIUM)
- [Datawrapper Blog — color palettes for choropleth maps](https://www.datawrapper.de/blog/how-to-choose-a-color-palette-for-choropleth-maps) — daltonisme, ColorBrewer
- [Leaflet Interactive Choropleth example](https://leafletjs.com/examples/choropleth/) — patterns hover/tooltip/légende (source officielle)
- [Research 2025 — Mobile thematic map design](https://www.tandfonline.com/doi/full/10.1080/15230406.2025.2484210) — touch vs hover sur cartes thématiques
- [ESSPACE — Organisation territoriale CARSAT](https://esspace.fr/carsat-organisation-territoriale-regions-3/) — structure des caisses régionales, mapping

### Tertiaires (confiance LOW)
- [Making SVG Maps Responsive for Mobile](https://www.worldindots.com/blog/making-svg-maps-responsive-for-mobile-devices) — patterns responsive SVG mobile (source secondaire non officielle)
- [simplemaps.com France SVG](https://simplemaps.com/svg/country/fr) — vérifié: mappe les 13 régions post-2016, pas les caisses (source négative, usage de référence)

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
