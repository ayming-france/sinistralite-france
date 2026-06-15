# Roadmap: Sinistralité France

## Milestones

- ✅ **v1.0 Sinistralité France** — Phases 1-5 (shipped 2026-02-28)
- ✅ **v1.1 Carte régionale** — Phases 6-9 (audit passed 2026-03-02)
- ✅ **v2.0 Refresh 2024 + enrichissement** — données 2024, évolution 6 ans, taille d'établissement, panneau lésions/maladies (shipped 2026-06-15)
- [ ] **v3 Évolution (backlog recherche)** — voir section dédiée ci-dessous

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
- [x] **Phase 8: Choroplèthe et interactions** - Coloration, légende, tooltip desktop, sélecteur d'année, classement (completed 2026-03-02)
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
**Plans:** 3/3 plans complete

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
**Plans:** 1 plan

Plans:
- [ ] 09-01-PLAN.md — Touch tap panel, MP unavailable message, visual verification

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
| 8. Choroplèthe et interactions | 3/3 | Complete   | 2026-03-02 | - |
| 9. Navigation et mobile | v1.1 | 1/1 | Complete | 2026-03-02 |

---

## v3 — Évolution (backlog issu de la recherche)

Recherche menée le 2026-06-15 (4 axes : outils comparables, UX dashboards data, croissance/SEO,
besoins métier AT/MP). Synthèse priorisée. Tags : valeur [high/med/low], effort [S/M/L].
Objectif directeur : rendre l'app **utilisée** (grand public + démos commerciales Ayming) et offrir
ce que les PDF Ameli ne peuvent pas : comparaison, tendance, découverte, valeur financière.

### Thème A — Comparaison & benchmarking (la force vs PDF + le « money shot » démo)
- [ ] **A1 [high][M] Comparateur multi-secteurs** : choisir 2-4 codes NAF (recherche par nom) côte à côte, KPIs + évolution superposée + ligne nationale. *(en cours, "comparison first")*
- [ ] **A2 [high][M] Calculateur « mon entreprise vs mon secteur »** : saisir effectif + nb AT → IF/TF/TG calculés et benchmarkés au secteur + national. Inspiré du BLS Injury Rate Calculator (data.bls.gov/iirc). Principal levier d'engagement.
- [ ] **A3 [high][S] Cadrage relatif « Nx la moyenne nationale »** sur chaque KPI + phrases d'insight auto en français clair (lisibles à voix haute en démo).
- [ ] **A4 [med][M] Explorer / league table** : secteurs les plus à risque, plus gros mouvements 2019-2024, filtres CTN / niveau NAF. *(phase 2 de l'Explorer)*

### Thème B — Compréhension & démo (pour les commerciaux qui « ne savent pas s'en servir »)
- [ ] **B1 [high][M] Visite guidée courte** (3-5 étapes, skippable, relançable) + **mode démo** avec secteur préchargé (jamais d'écran vide en pitch). Tours = +35-50% d'adoption si courts (Appcues).
- [ ] **B2 [med][S] Glossaire « expliquer cette métrique »** (IF / TF / TG en français clair) + avertissement non-comparabilité avec le LTIFR international.
- [ ] **B3 [med][S] Bloc confiance** : source citée + note méthodologique + date de mise à jour + gestion explicite des petits effectifs / données manquantes (ex. Mayotte 2020).

### Thème C — Coût & valeur prévention (angle conseil Ayming, relie la data aux €)
- [ ] **C1 [high][M] Simulateur de coût cotisation AT/MP** : effectif → mode collectif/mixte/individuel, estimation taux net (composantes M1-M4) et coût annuel. (ameli, URSSAF)
- [ ] **C2 [high][M] Estimateur ROI prévention** : valeur du risque par sinistre + ristourne Carsat jusqu'à -25% → € économisés, pour justifier un budget prévention.
- [ ] **C3 [med][M] Module « alimenter le DUERP »** : top risques/causes du secteur en export PDF, point de départ du plan d'action (obligation dès 1 salarié, art. R4121-1).
- [ ] **C4 [med][S] CTA B2B « Demander un audit / diagnostic »** + export brandé (capture de lead). ⏸️ **EN ATTENTE** : dépend de la stratégie lead magnet (à définir).

### Thème D — Découverte & distribution (la croissance : comment les gens arrivent)
> ⏸️ **THÈME EN ATTENTE** (décision 2026-06-15) : on ne lance pas le SEO / Google tant que la
> stratégie **lead magnet** n'est pas définie. Inutile d'amener du trafic search avant de savoir
> ce qu'on lui propose à convertir. À débloquer une fois le lead magnet décidé (lié à C4).

- [ ] **D1 [high][L] Pages par secteur indexables** : supprimer le hash routing (#at/CODE), passer en History API + pré-rendu des ~729 pages. Plus gros levier SEO (un SPA comparable a perdu ~60% de trafic organique à cause du hash). Débloque D2/D3.
- [ ] **D2 [high][M] SEO programmatique** : title/meta/H1 uniques par secteur + JSON-LD (Dataset/Article) + sitemap.xml des 729 URLs. Requêtes longue traîne « [métier] accidents du travail ».
- [ ] **D3 [med][S] Cartes OpenGraph/Twitter par secteur** (pré-générées) + liens profonds partageables + export PNG/PDF du profil secteur.
- [ ] **D4 [med][S] Référencement « réutilisation » sur data.gouv.fr** (distribution gratuite + crédibilité + backlink).
- [ ] **D5 [med][M] Page « secteurs les plus à risque 2024 »** : data story annuelle, format journaliste, aimant à liens.
- [ ] **D6 [low][M] Widget iframe intégrable** + alertes email sur secteur suivi (« données 2025 publiées / ce qui a changé ») + newsletter.

### Thème E — Polish & profondeur (priorité moindre)
- [ ] **E1 [med][M] Accessibilité graphiques** : jamais la couleur seule (motifs/labels directs), contrastes WCAG (4.5:1 texte, 3:1 graphique), tooltips au clavier.
- [ ] **E2 [low][M] Cross-filtering** (clic sur barre/région filtre les autres vues) + small multiples à axes partagés.
- [ ] **E3 [low][S] Ligne de projection** sur l'évolution 6 ans.
- [ ] **E4 [low][L] Couche qualitative** (récits d'accidents type EPICEA) + onglet comparaison européenne (Eurostat work accidents).

### Quick wins recommandés (prochain incrément)
A1 (comparateur, déjà engagé) → A3 (cadrage « Nx national » + insights auto) → B1 (mode démo + visite guidée) → A2 (calculateur entreprise). Ces quatre servent directement le persona « commercial en démo » et la promesse « ce que le PDF ne peut pas faire ».
