# Feature Research

**Domain:** Carte choroplèthe régionale sur tableau de bord de sinistralité (v1.1)
**Researched:** 2026-02-28
**Confidence:** MEDIUM (patterns choroplèthes vérifiés via Datawrapper Academy, Leaflet docs, littérature cartographique mobile 2025; tableau de bord existant inspecté directement)

---

## Contexte de départ

Ce document est spécifique au milestone v1.1 : ajout d'une vue carte régionale (choroplèthe SVG) au tableau de bord Sinistralité France existant. Les fonctionnalités déjà livrées (navigation 3 vues, KPI cards, graphiques, drawers, thème, CSV export, mobile bottom nav) sont des points d'intégration, pas des cibles.

**Données disponibles :** 21 caisses régionales + DOM-TOM, AT et Trajet uniquement (pas de MP régional dans la source). Années 2020-2024. Comptages bruts, pas d'IF ni de TG calculables au niveau régional avec ces seules données.

**Contraintes techniques :** Vanilla JS + ES modules, pas de bundler, pas de librairie cartographique (pas de D3, pas de Leaflet). SVG inline dans le HTML, coloration via JS. GitHub Pages statique.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Coloration choroplèthe par intensité | Raison d'être d'une carte de données. Sans couleur proportionnelle aux valeurs, c'est une carte décorative inutile. | MEDIUM | Palette séquentielle (blanc vers bleu foncé ou orange). Calculer min/max sur la métrique affichée, interpoler par région. |
| Légende avec échelle de couleurs | Sans légende, l'utilisateur ne sait pas ce que représente la teinte. Critère universel de lisibilité cartographique. | LOW | 5 paliers suffisent. Positionnement bas-gauche ou bas-droite de la carte. Libellés avec les valeurs brutes (pas de %). |
| Tooltip au survol (desktop) | Attendu sur tout composant interactif de données. L'utilisateur veut connaître la valeur exacte sans devoir lire la légende. | MEDIUM | Afficher : nom de la caisse régionale, valeur de la métrique affichée, année. Apparition immédiate (pas de délai). Position relative au curseur, pas au centre de la région. |
| Nom de région visible au survol | Sur une carte France, plusieurs régions sont petites et difficiles à identifier (Ile-de-France, Alsace, DOM-TOM). L'utilisateur attend un label. | LOW | Inclus dans le tooltip. Pas besoin de labels SVG permanents sur la carte (trop chargé visuellement). |
| Mise en évidence de la région survolée | Sans feedback visuel sur hover, l'utilisateur ne sait pas quelle région est active. Standard absolu de toute carte interactive. | LOW | Modifier l'opacité ou la bordure SVG de la région survolée. Ramener la région au premier plan (`stroke-width` + `z-index` via `parentNode.appendChild`). |
| Basculement AT / Trajet | Les données existent pour les deux types. L'absence de toggle forcerait deux cartes séparées, incohérent avec la logique de vues existante. | LOW | S'intègre au système de vues existant : la carte apparait dans la vue AT et la vue Trajet. La vue MP n'a pas de données régionales (indiqué clairement). |
| Année sélectionnable | 5 ans de données (2020-2024). Une carte figée sur une seule année est moins utile. Les utilisateurs attendent de pouvoir comparer. | MEDIUM | Sélecteur d'année simple (5 boutons ou un `<select>`). Recoloration de la carte au changement. |
| Comportement mobile (touch) | Le tableau de bord est responsive avec bottom nav mobile. La carte doit fonctionner sur mobile, pas juste exister. | MEDIUM | Sur touch : tap déclenche le tooltip (panneau en bas ou modal leger). Pas de hover sur mobile. La carte SVG doit être scrollable/zoomable via viewBox adaptatif. |
| Gestion des DOM-TOM | Les 21 caisses incluent des territoires ultramarins. Les ignorer silencieusement créerait une incohérence avec les totaux. | LOW | Cases séparées (inset) en bas de la carte, comme sur les cartes officielles INSEE. Pas de projection géographique précise requise. |
| Accessibilité de base | Le tableau de bord a déjà 38 ARIA labels et un skip link. La carte doit suivre le même niveau. | MEDIUM | `role="img"` sur le SVG conteneur avec `aria-label` décrivant la carte. Les régions cliquables ont `role="button"` et `aria-label` avec la valeur. Focus visible sur les régions. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Panneau de détail au clic sur une région | Sur desktop, cliquer une région ouvre un panneau latéral (ou une section sous la carte) avec les stats complètes de la caisse. Aucun concurrent ameli.fr ne propose ça. | MEDIUM | Réutiliser le pattern drawer existant (déjà implémenté pour insights et partage). Afficher : nom caisse, valeurs AT + Trajet sur 5 ans, mini graphique d'évolution. |
| Mini graphique d'évolution dans le panneau | Montrer la tendance 2020-2024 pour la caisse sélectionnée. Transforme la carte d'un snapshot en outil d'analyse temporelle. | MEDIUM | Chart.js est déjà chargé. Un mini line chart (150px de haut) dans le panneau de détail. Réutilise le pattern des graphiques d'évolution existants. |
| Classement des caisses dans le panneau | Afficher le rang de la caisse (ex: "3e région la plus accidentogène sur 21"). Contexte immédiat, valeur ajoutée forte pour les consultants. | LOW | Calculé côté JS depuis les données JSON. Pas de requête supplémentaire. |
| Transition de couleur animée au changement d'année | Quand l'utilisateur change l'année, les régions repassent leurs couleurs en fondu (200-300ms CSS transition). Renforce la perception de données en mouvement. | LOW | CSS transition sur `fill` des paths SVG. Fonctionne nativement sans JS animé. Effet significatif pour un coût minimal. |
| Mise en évidence de la région la plus élevée | Marquer automatiquement la région avec la valeur max (une petite icône ou une bordure plus épaisse). Donne un point d'entrée immédiat sans obliger l'utilisateur à parcourir la légende. | LOW | Calculé depuis les données au chargement. Attribut `data-max="true"` sur le path SVG, style CSS dédié. |
| Lien entre la carte et la vue sectorielle | Si l'utilisateur clique sur une région, proposer "Voir les secteurs dominants dans cette région". Connecte la vue macro (géographique) à la vue micro (sectorielle). | HIGH | Nécessiterait des données sectorielles par région, qui n'existent pas dans la source actuelle. A déférer sauf si la donnée devient disponible. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Zoom / pan sur la carte | Cartes interactives modernes ont le zoom. Semble naturel. | SVG inline sans librairie cartographique : implémenter zoom/pan en vanilla JS est une centaine de lignes fragiles (pinch-to-zoom, drag, limites). Rapport effort/valeur mauvais pour une carte de 21 régions où tout est visible à pleine taille. | Insets DOM-TOM en cases séparées + `viewBox` adaptatif selon taille d'écran. Tout visible sans zoom. |
| Projection cartographique précise | "La forme des régions devrait être exacte (Lambert-93, WGS84)." | La valeur est dans les données, pas dans la précision géographique. Une projection précise nécessite GeoJSON + une lib (D3 ou Leaflet), incompatible avec la contrainte "no bundler, no lib". | SVG schématique réaliste des caisses régionales (frontières approximatives mais reconnaissables). L'INSEE et les sites gouvernementaux utilisent couramment des cartes schématiques. |
| Animation temporelle automatique (lecture auto des années) | "Voir l'évolution 2020-2024 comme un film." | Pour 5 points de données, l'animation ajoute de la complexité (contrôles play/pause, timing) pour un effet limité. L'utilisateur avancé interagit manuellement. | Sélecteur d'année manuel avec transition CSS. L'utilisateur contrôle le rythme. |
| Carte choroplèthe pour la vue MP | La vue MP existe déjà dans le tableau de bord. | La source de données (rapport annuel ameli.fr) ne contient pas de tableau régional pour les MP. Afficher une carte vide ou incompléte serait trompeur. | Note explicite dans la vue MP : "Données régionales non disponibles pour les maladies professionnelles dans cette source." |
| Données normalisées par effectif (IF régional) | "L'IF par caisse permettrait une comparaison plus juste." | Les effectifs par caisse régionale ne sont pas dans les tableaux 9 et 17 du rapport annuel. Calculer un IF avec des effectifs approximatifs (salariés par région INSEE) induirait en erreur. | Afficher les comptages bruts avec une note "données brutes, non normalisées par effectif". Honnêteté de la métrique. |
| Carte dans une vue séparée (4e onglet nav) | "La carte mérite son propre onglet." | Le bottom tab bar mobile a exactement 3 onglets (AT, MP, Trajet), alignés sur la structure de données. Ajouter un 4e onglet "Carte" casse la symétrie et force à choisir : carte AT ou Trajet ? | Intégrer la carte dans chaque vue AT et Trajet comme section supplémentaire sous les graphiques. L'utilisateur voit la carte de la métrique active. |

---

## Feature Dependencies

```
[SVG France choroplèthe (structure)]
    └──required by──> [Coloration choroplèthe]
                          └──required by──> [Légende]
                          └──required by──> [Tooltip hover]
                          └──required by──> [Transition d'année]

[Données régionales JSON]
    └──required by──> [Coloration choroplèthe]
    └──required by──> [Panneau de détail au clic]
    └──required by──> [Mini graphique d'évolution]
    └──required by──> [Classement des caisses]

[Panneau de détail au clic]
    └──enhances──> [Mini graphique d'évolution]
    └──enhances──> [Classement des caisses]
    (les deux vivent dans le panneau, dépendent de son existence)

[Basculement AT / Trajet]
    └──uses──> [Système de vues existant (state.js, nav.js)]
    (pas de nouvelle infrastructure, branchement sur l'état existant)

[Comportement mobile touch]
    └──conflicts with──> [Tooltip hover standard]
    (hover n'existe pas sur touch ; le tooltip doit changer de déclencheur)

[Accessibilité régions cliquables]
    └──depends on──> [Panneau de détail au clic]
    (les régions ne sont "cliquables" que si un panneau de détail existe)
```

### Dependency Notes

- **SVG structure required first :** Tout dépend d'un SVG France avec des paths identifiés par `data-caisse` ou `id`. C'est le premier livrable technique du milestone.
- **Données JSON avant coloration :** Le JSON régional (issu du pipeline PDF) doit exister avant que la carte puisse être colorée. Pipeline et carte sont séquentiels.
- **Panneau de détail enhanced by mini chart :** Le panneau seul (juste stats brutes) a de la valeur. Le mini chart l'élève en différenciateur. Ils peuvent être livrés séparément.
- **Mobile tooltip conflict :** Sur desktop, le tooltip suit le curseur. Sur mobile (touch), le tap sur une région doit ouvrir un panneau fixe en bas de l'écran. Deux comportements distincts, un seul handler d'événement.
- **Vue système existant :** Le basculement AT/Trajet est déjà géré par `state.activeView`. La carte écoute ce changement et recolore. Pas de nouveau mécanisme de navigation.

---

## MVP Definition (milestone v1.1 carte régionale)

### Launch With (v1.1)

Minimum viable pour que la carte soit publiable et utile.

- [ ] SVG France schématique avec les 21 caisses régionales identifiées par ID et les DOM-TOM en inset
- [ ] Données JSON régionales générées par le pipeline (AT + Trajet, 2020-2024)
- [ ] Coloration choroplèthe proportionnelle aux comptages bruts (palette séquentielle, 5 paliers)
- [ ] Légende avec les 5 paliers et leurs valeurs
- [ ] Tooltip au survol (desktop) : nom caisse + valeur + année
- [ ] Mise en évidence de la région survolée (stroke + opacité)
- [ ] Sélecteur d'année (5 boutons : 2020 à 2024)
- [ ] Comportement touch mobile : tap ouvre un panneau bas de la carte
- [ ] Carte intégrée dans vue AT et vue Trajet (pas de nouvelle vue)
- [ ] Note "Données non disponibles" dans la vue MP

### Add After Validation (v1.1.x)

- [ ] Panneau de détail au clic avec stats complètes de la caisse
- [ ] Mini graphique d'évolution dans le panneau de détail
- [ ] Classement des caisses (rang affiché dans le panneau)
- [ ] Transition CSS animée au changement d'année
- [ ] Mise en évidence automatique de la région max

### Future Consideration (v2+)

- [ ] Lien carte vers vue sectorielle (nécessite données régionales par NAF, non disponibles actuellement)
- [ ] IF régional si les effectifs par caisse deviennent disponibles dans la source
- [ ] Carte pour les MP si le rapport annuel évolue pour inclure un tableau régional MP

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| SVG France choroplèthe (structure) | HIGH | MEDIUM | P1 |
| Pipeline JSON régional | HIGH | MEDIUM | P1 |
| Coloration choroplèthe | HIGH | LOW | P1 |
| Légende | HIGH | LOW | P1 |
| Tooltip hover | HIGH | LOW | P1 |
| Hover highlight région | HIGH | LOW | P1 |
| Sélecteur d'année | HIGH | LOW | P1 |
| Comportement touch mobile | HIGH | MEDIUM | P1 |
| Intégration vues AT / Trajet | HIGH | LOW | P1 |
| Note MP sans données | MEDIUM | LOW | P1 |
| Panneau de détail au clic | HIGH | MEDIUM | P2 |
| Mini graphique d'évolution | MEDIUM | MEDIUM | P2 |
| Classement des caisses | MEDIUM | LOW | P2 |
| Transition CSS animée | LOW | LOW | P2 |
| Highlight région max | MEDIUM | LOW | P2 |
| Lien carte vers sectoriel | HIGH | HIGH | P3 |
| IF régional normalisé | MEDIUM | HIGH | P3 |

**Priority key:**
- P1 : Must have pour publier v1.1
- P2 : Should have, ajouter quand P1 est stable
- P3 : Future consideration, hors scope v1.1

---

## Competitor Feature Analysis

| Feature | CNAM Ameli rapport annuel (PDF) | Notre approche |
|---------|--------------------------------|----------------|
| Visualisation régionale | Tableau 9 et 17 en texte tabulaire dans PDF | Carte choroplèthe interactive |
| Navigation temporelle | Rapport par année, fichiers séparés | Sélecteur d'année dans la carte |
| Détail par caisse | Valeurs brutes dans le tableau PDF | Tooltip + panneau de détail |
| Mobile | Non applicable (PDF) | Touch-optimisé avec panneau bas |
| Comparaison AT / Trajet | Tableaux séparés dans le PDF | Bascule dans la même carte |
| DOM-TOM | Lignes du tableau | Insets visuels sur la carte |

La carte apporte la même donnée que le PDF, rendue explorable et visuellement lisible sans effort de lecture de tableau.

---

## Sources

- [Datawrapper Academy - What to consider when creating choropleth maps](https://academy.datawrapper.de/article/134-what-to-consider-when-creating-choropleth-maps) - MEDIUM confidence, principes légende et couleur
- [Datawrapper Blog - Choropleth maps: color-coding without misleading](https://www.datawrapper.de/blog/choroplethmaps) - MEDIUM confidence
- [Leaflet Interactive Choropleth example](https://leafletjs.com/examples/choropleth/) - HIGH confidence, patterns hover/tooltip/légende vérifiés sur source officielle
- [Datawrapper Academy - How to create useful tooltips for maps](https://academy.datawrapper.de/article/116-how-to-create-useful-tooltips-for-your-maps) - MEDIUM confidence
- [Hands-On Data Visualization - Design Choropleth Colors & Intervals](https://handsondataviz.org/design-choropleth.html) - MEDIUM confidence, paliers séquentiels
- [Research 2025 - Mobile thematic map design for data journalism](https://www.tandfonline.com/doi/full/10.1080/15230406.2025.2484210) - MEDIUM confidence, comportement touch vs hover
- [Making SVG Maps Responsive for Mobile](https://www.worldindots.com/blog/making-svg-maps-responsive-for-mobile-devices) - LOW confidence (WebSearch, source secondaire)
- Inspection directe du codebase existant (state.js, nav.js, index.html) - HIGH confidence pour les points d'intégration

---

*Feature research for: Sinistralité France - milestone v1.1 carte régionale AT/Trajet*
*Researched: 2026-02-28*
