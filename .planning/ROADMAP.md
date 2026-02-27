# Roadmap: Sinistralité France

## Overview

This milestone brings an already-functional dashboard to production quality. The existing feature set is complete. The work ahead is grouped into five focused phases: fix code hygiene and branding first (it's the fastest pass and unblocks the rest), then address mobile navigation (broken at 768px), then add ARIA and accessibility signals, then add CSV export, and finally make the data pipeline self-contained. Each phase delivers something verifiable on its own and does not depend on the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Branding et robustesse** (1/2 plans) - Accents, titres, favicon, états de chargement, CSS mort, polices, localStorage
- [x] **Phase 2: Navigation mobile** (0/1 plans) - Remplacement du nav rail disparu sous 768px (completed 2026-02-27)
- [x] **Phase 3: Accessibilité** - ARIA, skip link, annonces screen reader (completed 2026-02-27)
- [ ] **Phase 4: Export CSV** - Téléchargement CSV des données du secteur courant
- [ ] **Phase 5: Pipeline de données** - Scripts Python autonomes avec documentation

## Phase Details

### Phase 1: Branding et robustesse
**Goal**: Le dashboard affiche correctement les accents français, le bon nom de marque, informe l'utilisateur pendant et après les chargements de données, et ne contient plus de code mort ni de références à des ressources absentes
**Depends on**: Nothing (first phase)
**Requirements**: BRAND-01, BRAND-02, BRAND-03, ROBUST-01, ROBUST-02, ROBUST-03, ROBUST-04, ROBUST-05
**Success Criteria** (what must be TRUE):
  1. Tous les libellés KPI et d'interface affichent les bons accents (é, è, ê, à, ç, etc.) sans caractères corrompus
  2. L'onglet du navigateur, le logo de nav et le titre de page affichent "Sinistralité France" avec le favicon
  3. L'utilisateur voit un skeleton ou spinner pendant le chargement des données, pas un écran vide
  4. Si une donnée échoue à se charger, l'utilisateur voit un message d'erreur clair avec un bouton pour réessayer
  5. La police des graphiques Chart.js est Lato, la clé localStorage du thème est cohérente, et aucune classe CSS morte ne subsiste
**Plans:** 2/2 plans complete
Plans:
- [x] 01-01-PLAN.md — Branding: accents, favicon SVG, nav logo, Lato font, localStorage key
- [ ] 01-02-PLAN.md — Robustesse: skeleton loaders, error handling, dead CSS cleanup + visual checkpoint

### Phase 2: Navigation mobile
**Goal**: Un utilisateur sur téléphone peut naviguer entre les trois vues AT, MP et Trajet
**Depends on**: Phase 1
**Requirements**: MOBILE-01, MOBILE-02
**Success Criteria** (what must be TRUE):
  1. Sur un écran de 375px (iPhone SE), une navigation alternative (bottom bar ou hamburger) est visible et utilisable
  2. L'utilisateur peut basculer entre AT, MP et Trajet depuis un mobile sans avoir accès au nav rail de bureau
  3. La vue active est visuellement indiquée dans la navigation mobile
**Plans:** 1/1 plans complete
Plans:
- [ ] 02-01-PLAN.md — Bottom tab bar: HTML, CSS responsive, visual checkpoint

### Phase 3: Accessibilité
**Goal**: Les utilisateurs de lecteurs d'écran et de navigation clavier peuvent utiliser toutes les fonctionnalités interactives du dashboard
**Depends on**: Phase 2
**Requirements**: A11Y-01, A11Y-02, A11Y-03
**Success Criteria** (what must be TRUE):
  1. Chaque bouton, input et lien interactif a un aria-label descriptif lisible par un screen reader
  2. L'ouverture et la fermeture des drawers (Insights, Share) est annoncée par aria-live ou aria-expanded
  3. Un lien "Aller au contenu" est le premier élément focusable sur la page et fonctionne au clavier
**Plans:** 1/1 plans complete
Plans:
- [ ] 03-01-PLAN.md — ARIA labels, skip link, drawer focus management, :focus-visible CSS

### Phase 4: Export CSV
**Goal**: Un utilisateur peut télécharger les données KPI du secteur affiché sous forme de fichier CSV
**Depends on**: Phase 1
**Requirements**: EXPORT-01, EXPORT-02
**Success Criteria** (what must be TRUE):
  1. Un bouton d'export CSV est accessible depuis le dashboard pour le secteur sélectionné
  2. Le fichier téléchargé contient le code NAF, le nom du secteur, et toutes les valeurs KPI affichées (IF, TG, événements, IP, décès, jours perdus, salariés)
  3. Le CSV s'ouvre correctement dans Excel avec les accents français préservés (encodage UTF-8 BOM)
**Plans:** 1 plan
Plans:
- [ ] 04-01-PLAN.md — CSV export: bouton dans Share drawer, downloadCSV avec Blob + BOM, disabled state

### Phase 5: Pipeline de données
**Goal**: Le projet contient un pipeline Python autonome documenté permettant de régénérer les fichiers JSON depuis les sources ameli.fr sans dépendance externe au projet BPO
**Depends on**: Phase 1
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04
**Success Criteria** (what must be TRUE):
  1. Le dossier `data/pipeline/` existe dans le projet et contient tous les scripts nécessaires (refresh_data.py, parse_pdf.py et dépendances)
  2. Un utilisateur peut lancer le pipeline depuis `data/pipeline/` et obtenir les fichiers at-data.json, mp-data.json, trajet-data.json mis à jour
  3. Le pipeline télécharge les fichiers Excel depuis ameli.fr et parse les fiches PDF par NAF pour les données démographiques
  4. Un README dans `data/pipeline/` explique les prérequis, la commande à lancer, et la fréquence de mise à jour attendue
**Plans**: TBD

## Progress

**Execution Order:**
Phases exécutent dans l'ordre numérique : 1 → 2 → 3 → 4 → 5
(Phase 4 et Phase 5 peuvent être parallélisées avec phases 2 et 3 en YOLO mode, toutes dépendent de Phase 1)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Branding et robustesse | 1/2 | Complete    | 2026-02-27 |
| 2. Navigation mobile | 0/1 | Complete    | 2026-02-27 |
| 3. Accessibilité | 1/1 | Complete    | 2026-02-27 |
| 4. Export CSV | 0/TBD | Not started | - |
| 5. Pipeline de données | 0/TBD | Not started | - |
