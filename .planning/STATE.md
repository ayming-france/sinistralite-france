# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Un utilisateur peut chercher un code NAF et voir instantanément le profil accidentel du secteur comparé aux moyennes nationales
**Current focus:** Phase 3 - Accessibilité

## Current Position

Phase: 3 of 5 (Accessibilité)
Plan: 1 of 1 in current phase
Status: Completed
Last activity: 2026-02-28 — Plan 03-01 complété (skip link, ARIA labels, focus trap drawers, :focus-visible)

Progress: [████░░░░░░] 40%

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

**Recent Trend:**
- Last 5 plans: 01-01 (15 min), 01-02 (90 min), 02-01 (30 min), 03-01 (3 min)
- Trend: ARIA retrofitting très rapide grâce à l'audit préalable (RESEARCH.md complet)

*Updated after each plan completion*

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Research flag]: Phase 5 (Pipeline) — adapter les chemins de refresh_data.py et parse_pdf.py depuis le projet BPO existant (`~/.claude/bpo/`). Vérifier que les scripts sont bien là avant de planifier.

## Session Continuity

Last session: 2026-02-28
Stopped at: Completed 03-01-PLAN.md (skip link, ARIA labels, focus trap drawers, :focus-visible)
Resume file: None
