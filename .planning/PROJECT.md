# Sinistralité France

## What This Is

A public dashboard that makes French workplace accident statistics (sinistralité) easy to understand, sector by sector. Built for both Ayming consultants analyzing client risk profiles and anyone interested in occupational safety data in France. Serves BPO data (AT, MP, Trajet) from pre-processed JSON files. Modular vanilla JS + ES modules architecture, upgraded from the original BPO single-file dashboard.

## Core Value

A user can search any NAF sector code and instantly see its accident profile compared to national averages, with clear visual indicators of risk severity.

## Requirements

### Validated

- ✓ Three-view dashboard (AT, MP, Trajet) with view switching via nav rail — existing
- ✓ NAF code search with autocomplete across division/groupe/classe levels — existing
- ✓ KPI cards (IF, TG, events, IP, deaths, days lost, salariés) with national comparison — existing
- ✓ Cause distribution doughnut chart with percentage labels — existing
- ✓ Funnel chart showing event progression (events → arrêts → IP → décès) — existing
- ✓ Position strip showing sector rank among peers — existing
- ✓ Comparison bar chart (top/bottom sectors) with click-to-navigate — existing
- ✓ Multi-year evolution line charts (IF, TG) — existing
- ✓ Demographics chart (age/gender distribution) — existing
- ✓ Insights drawer with automated risk analysis (IF ratio, TG ratio, IP rate, deaths, trends) — existing
- ✓ Share drawer (copy link, print/PDF) — existing
- ✓ Dark/light theme toggle with persistence — existing
- ✓ Hash-based deep linking (view/code) — existing
- ✓ Responsive layout (mobile full-width drawers) — existing
- ✓ Click-outside-to-close for drawers — existing
- ✓ Keyboard shortcuts (Escape to close, / to focus search) — existing

### Active

- [ ] Fix missing French accents in labels (12 occurrences)
- [ ] Update branding to "Sinistralité France"
- [ ] Add favicon
- [ ] Add error handling on data fetch (loading state, error messages)
- [ ] Fix dead CSS classes and font reference bugs (DM Sans → Lato)
- [ ] Fix localStorage key mismatch between dashboard and landing page
- [ ] Mobile nav (nav rail disappears at 768px with no replacement)
- [ ] Basic ARIA attributes on interactive elements
- [ ] CSV export of current sector data
- [ ] Self-contained data pipeline (copy refresh_data.py + parse_pdf.py from BPO, adapt paths)

### Out of Scope

- Live datagouv MCP queries — sinistralité data is on ameli.fr, not data.gouv.fr. Static JSON from BPO pipeline is the right approach.
- Cloudflare Worker proxy — not needed since data is static, updated annually via BPO refresh_data.py
- Ameli health data integration — separate app/milestone if needed
- SIRENE company lookup — separate app
- Landing page redesign — defer until needed
- User authentication — not needed for public dashboard
- IF by company size — data exists in PDFs only (not Excel), fragile to parse
- Mobile native app — responsive web is sufficient

## Context

- **Data source**: CNAM publishes BPO statistics yearly on ameli.fr (not data.gouv.fr). Excel files are downloaded and processed by the data pipeline in `data/pipeline/`. CNAM has 46 datasets on data.gouv.fr but none cover sinistralité.
- **Current state**: Working dashboard with 9.2 MB of static JSON across 3 files (at-data.json, mp-data.json, trajet-data.json). Pre-processed from the ameli.fr Excel files.
- **Quality debt**: No tests, no error handling on fetch, dead CSS from removed features, Chart.js font references DM Sans (not loaded, falls back to sans-serif), ES5/ES6 style split between dashboard and landing page.
- **Deployment**: GitHub Pages via `ayming-france/sinistralite-france` (public, deploy remote). Backup on `xXencarvXx/datagouv` (private, origin remote).
- **Landing page**: 1,869-line self-contained HTML page, deferred from this milestone.

## Constraints

- **No build step**: Vanilla JS + ES modules, no bundler. Must stay zero-dependency on Node.js tooling.
- **Static hosting**: GitHub Pages. No backend needed.
- **CDN dependencies**: Chart.js 4.4.7, chartjs-plugin-datalabels 2.2.0, Lucide (unpinned @latest). No npm packages.
- **French UI**: All visible text in proper French with accents. Code identifiers stay ASCII.
- **Two GitHub accounts**: `xXencarvXx` (origin/backup), `ayming-france` (deploy/Pages).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vanilla JS, no framework | Zero build step, simple deployment, full control | ✓ Good |
| Static JSON from BPO pipeline | Sinistralité data is on ameli.fr, not datagouv. Annual refresh is sufficient. | ✓ Good |
| No backend/proxy needed | Data is static, updated yearly. No live queries required. | ✓ Good |
| Dashboard-first, landing page later | Core value is the dashboard; landing page deferred | ✓ Good |
| v1 = polish only | Fix quality debt while codebase is small and manageable | — Pending |

---
*Last updated: 2026-02-27 after research (datagouv has no sinistralité data, scope reduced to polish)*
