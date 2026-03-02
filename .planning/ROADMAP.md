# Roadmap: Sinistralité France

## Milestones

- ✅ **v1.0 Sinistralité France** — Phases 1-5 (shipped 2026-02-28)
- [ ] **v1.1 Carte régionale** — Phases 6-9 (in progress)

## Phases

<details>
<summary>✅ v1.0 Sinistralité France (Phases 1-5) — SHIPPED 2026-02-28</summary>

- [x] Phase 1: Branding et robustesse (2/2 plans) — completed 2026-02-27
- [x] Phase 2: Navigation mobile (1/1 plan) — completed 2026-02-27
- [x] Phase 3: Accessibilité (1/1 plan) — completed 2026-02-27
- [x] Phase 4: Export CSV (1/1 plan) — completed 2026-02-28
- [x] Phase 5: Pipeline de données (2/2 plans) — completed 2026-02-28

</details>

### v1.1 Carte régionale

- [x] **Phase 6: Pipeline régional** - Parser PDF + JSON validé (21 caisses, AT + Trajet, 2020-2024) (completed 2026-03-02)
- [x] **Phase 7: Structure SVG** - Carte France inline dans le DOM, identifiée par caisse, responsive (completed 2026-03-02)
- [ ] **Phase 8: Choroplèthe et interactions** - Coloration, légende, tooltip desktop, sélecteur d'année, classement
- [ ] **Phase 9: Navigation et mobile** - Intégration vues AT/Trajet, panneau tactile, hash routing

## Phase Details

### Phase 6: Pipeline régional

**Goal**: Les données régionales sont extraites du PDF et disponibles sous forme de JSON valide prêt à être consommé par le frontend
**Depends on**: Phase 5 (pipeline infrastructure existante — parse_pdf.py, refresh_data.py)
**Requirements**: PIPE-05, PIPE-06, PIPE-07, PIPE-08
**Success Criteria** (what must be TRUE):
  1. `data/regional-data.json` existe et contient des entrées pour toutes les caisses attendues (16 métropolitaines minimum) avec des comptages non nuls pour AT et Trajet sur les années 2020-2024
  2. Le parser traite correctement les noms de caisses qui s'étendent sur plusieurs lignes dans le PDF (ex. "Bourgogne-Franche-Comté") sans les tronquer ni les dupliquer
  3. Les lignes "Total" / "Ensemble" et les cellules fusionnées sont exclues du JSON final
  4. Le JSON inclut les effectifs salariés (champ `salaries`) pour chaque caisse et chaque année, permettant un calcul de taux futur
**Plans:** 2/2 plans complete

Plans:
- [ ] 06-01-PLAN.md — Create parse_regional.py standalone script with unit tests
- [ ] 06-02-PLAN.md — Run against real PDF, fix issues, integrate into refresh_data.py

### Phase 7: Structure SVG

**Goal**: Une carte SVG de France est présente dans le DOM du tableau de bord avec chaque caisse régionale identifiable par attribut, affichée dans les vues AT et Trajet, sans casser l'affichage existant
**Depends on**: Phase 6 (JSON régional valide)
**Requirements**: MAP-01, MAP-04, MAP-11
**Success Criteria** (what must be TRUE):
  1. La carte est visible dans la vue AT et dans la vue Trajet, mais n'apparait pas comme un 4e onglet de navigation
  2. Chaque zone de la carte peut être ciblée individuellement via un attribut `data-caisse` dont la valeur correspond exactement à une clé du JSON régional
  3. La carte s'affiche sans barre de défilement horizontale sur un écran de 375px de large (iPhone SE)
  4. Aucune règle CSS existante du tableau de bord ne colore ou ne masque les paths SVG de la carte
**Plans:** 2/2 plans complete

Plans:
- [ ] 07-01-PLAN.md — Construire le SVG groupé par caisse et le CSS responsive (map.css)
- [ ] 07-02-PLAN.md — Créer js/map.js stub et valider visuellement la carte dans le navigateur

### Phase 8: Choroplèthe et interactions

**Goal**: La carte est colorée proportionnellement aux données de la caisse sélectionnée, avec une légende lisible, un tooltip informatif sur desktop, un sélecteur d'année et un classement des régions
**Depends on**: Phase 7 (SVG dans le DOM avec IDs valides)
**Requirements**: MAP-02, MAP-03, MAP-05, MAP-06, MAP-07, MAP-08, MAP-09
**Success Criteria** (what must be TRUE):
  1. Les régions sont colorées selon une échelle séquentielle reflétant les comptages AT ou Trajet de l'année affichée, et la couleur change visiblement quand l'utilisateur bascule entre AT et Trajet
  2. Une légende montre la plage de valeurs (minimum, maximum) et les paliers de couleur, avec des libellés lisibles
  3. Survoler une région sur desktop affiche un tooltip indiquant le nom de la caisse, la valeur du métrique et l'année, sans que le tooltip soit coupé par les bords du viewport
  4. Un sélecteur d'année (2020-2024) permet de changer l'année affichée sur la carte. L'année par défaut est 2023 au chargement de la vue
  5. Un panneau de classement adjacent à la carte liste les caisses triées par valeur décroissante du métrique actif, avec possibilité de changer l'ordre
**Plans:** 1/3 plans executed

Plans:
- [ ] 08-01-PLAN.md — Choropleth core: data loading, coloring, legend (MAP-02, MAP-03, MAP-05, MAP-07)
- [ ] 08-02-PLAN.md — Interactions: tooltip, year selector, ranking panel (MAP-06, MAP-08, MAP-09)
- [ ] 08-03-PLAN.md — Visual verification checkpoint (all MAP requirements)

### Phase 9: Navigation et mobile

**Goal**: La carte est accessible depuis la navigation existante, réagit correctement aux interactions tactiles, et l'URL reflète l'état de la carte pour le partage
**Depends on**: Phase 8 (carte fonctionnelle sur desktop)
**Requirements**: MAP-10
**Success Criteria** (what must be TRUE):
  1. Sur un appareil tactile, taper sur une région ouvre un panneau fixe en bas de l'écran affichant le nom de la caisse et ses statistiques. Taper en dehors du panneau le ferme
  2. La vue MP affiche un message explicatif indiquant que les données régionales ne sont pas disponibles pour les maladies professionnelles
  3. Le hash de l'URL reflète la vue active (ex. `#at`, `#trajet`) et la carte se positionne correctement lors d'un rechargement sur cette URL
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Branding et robustesse | v1.0 | 2/2 | Complete | 2026-02-27 |
| 2. Navigation mobile | v1.0 | 1/1 | Complete | 2026-02-27 |
| 3. Accessibilité | v1.0 | 1/1 | Complete | 2026-02-27 |
| 4. Export CSV | v1.0 | 1/1 | Complete | 2026-02-28 |
| 5. Pipeline de données | v1.0 | 2/2 | Complete | 2026-02-28 |
| 6. Pipeline régional | v1.1 | 2/2 | Complete | 2026-03-02 |
| 7. Structure SVG | 2/2 | Complete    | 2026-03-02 | - |
| 8. Choroplèthe et interactions | 1/3 | In Progress|  | - |
| 9. Navigation et mobile | v1.1 | 0/? | Not started | - |
