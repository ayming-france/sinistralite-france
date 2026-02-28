# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Un utilisateur peut chercher un code NAF et voir instantanément le profil accidentel du secteur comparé aux moyennes nationales
**Current focus:** Phase 5 - Pipeline de données

## Current Position

Phase: 5 of 5 (Pipeline de données)
Plan: 3 of 3 in current phase
Status: Completed
Last activity: 2026-02-28 — Plan 05-01 complété (refresh_data.py pipeline AT/MP adapte du BPO, JSON only, pas de pickle)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 35 min
- Total execution time: 2.30 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-branding-et-robustesse | 2 | 105 min | 53 min |
| 02-navigation-mobile | 1 | 30 min | 30 min |
| 03-accessibilit | 1 | 3 min | 3 min |
| 04-export-csv | 1 | 2 min | 2 min |
| 05-pipeline-de-donn-es | 3/3 | 12 min | 4 min |

**Recent Trend:**
- Last 5 plans: 01-01 (15 min), 01-02 (90 min), 02-01 (30 min), 03-01 (3 min), 04-01 (2 min)
- Trend: Export très rapide grâce au RESEARCH.md complet et à la structure existante des drawers

*Updated after each plan completion*
| Phase 05 P02 | 8 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: v1 = polish only. Dashboard features are complete. No new analytical features this milestone.
- [Init]: Live datagouv MCP queries out of scope. Sinistralité data is on ameli.fr, static JSON pipeline is the right approach.
- [Init]: Phase 4 (Export) peut être parallélisée avec phases 2 et 3 en YOLO mode (pas de dépendance entre elles).
- [01-01]: Lato est la police sans-serif pour Chart.js; DM Sans supprimé entièrement.
- [01-01]: Favicon SVG = data URI encodée (3 barres blanches sur fond bleu #4e8ac5); pas de fichier externe.
- [01-01]: Clé localStorage canonique = datagouv-theme (namespaced, partagée entre dashboard et landing).
- [01-02]: Skeleton à l'intérieur du .container (hérite du margin-left nav-rail, pas de layout shift).
- [01-02]: Retry via window.location.reload() (pas de réinitialisation d'état partiel nécessaire).
- [01-02]: Favicon SVG itéré 4x pendant le checkpoint pour atteindre tricolore bleu/blanc/rouge sans fond.
- [02-01]: bottom-nav-label class distincte de nav-label (les labels du rail sont masqués par défaut, ceux du bottom bar toujours visibles).
- [02-01]: Shared .nav-item[data-view] selector: boutons bottom bar réutilisent le selecteur initNav() sans modification JS.
- [02-01]: overflow-x: hidden sur .container mobile + flex-shrink sur .level-tabs pour eviter le scroll horizontal.
- [03-01]: Focus trap implémenté en vanilla JS -- 2 drawers simples ne justifient pas une lib CDN.
- [03-01]: releaseFocus exporté depuis insights.js pour disponibilité dans app.js si besoin futur.
- [03-01]: aria-expanded synchronisé via setAllBtns pour les 3 préfixes (at/mp/trajet) en une seule passe.
- [04-01]: downloadCSV uses hardcoded eventLabel map to avoid circular dependency between insights.js and state.js.
- [04-01]: CSV button disabled state updated at render() end and at share drawer open to cover view-switch scenarios.
- [04-01]: taux_gravite absent in Trajet data: null guard outputs empty string in CSV.
- [05-01]: naf38 supprime des sorties JSON (aucune reference dans dashboard JS confirmee par grep).
- [05-01]: AT 2021 secondary download conserve : fournit les colonnes de causes de risque (col. 20-31) absentes du format 2023.
- [05-01]: PDF/Trajet entierement optionnel via --pdf-dir : AT+MP generes seuls sans les PDFs.
- [05-01]: PIPELINE_DIR/OUTPUT_DIR : scripts dans data/pipeline/, JSON dans data/ (un niveau au-dessus).
- [05-02]: parse_pdf.py uses required --pdf-dir CLI arg (not optional) to avoid silent runs without demographics data.
- [05-02]: parse_all_pdfs() retains explicit pdf_dir: Path parameter for clean integration with refresh_data.py.
- [Phase 05]: parse_pdf.py uses required --pdf-dir CLI arg to avoid silent runs without demographics data
- [Phase 05]: parse_all_pdfs() retains explicit pdf_dir: Path parameter for clean integration with refresh_data.py

### Pending Todos

None yet.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-28
Stopped at: Completed 05-01-PLAN.md (refresh_data.py pipeline AT/MP, JSON only, PIPELINE_DIR/OUTPUT_DIR, no pickle)
Resume file: None
