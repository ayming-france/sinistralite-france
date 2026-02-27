# Sinistralité France

## What This Is

A public dashboard that makes French workplace accident statistics (sinistralité) easy to understand, sector by sector. Built for both Ayming consultants analyzing client risk profiles and anyone interested in occupational safety data in France. Currently serves BPO data (AT, MP, Trajet) from static JSON files, migrating to live queries via the datagouv MCP server.

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

- [ ] Replace static JSON files with live datagouv MCP queries
- [ ] Fix missing French accents in labels (12 occurrences)
- [ ] Update branding to "Sinistralité France"
- [ ] Add favicon
- [ ] Add error handling on data fetch (loading state, error messages)
- [ ] Fix dead CSS classes and font reference bugs (DM Sans → Lato)
- [ ] Fix localStorage key mismatch between dashboard and landing page
- [ ] Add loading states for data fetching
- [ ] Cloudflare Worker (or equivalent) as MCP proxy for browser queries

### Out of Scope

- Ameli health data integration — deferred to v2, separate milestone
- SIRENE company lookup — deferred, may become separate app
- Landing page redesign — defer until backend/OAuth exists
- User authentication — not needed for v1 public dashboard
- Real-time data streaming — BPO data is published annually
- Mobile native app — responsive web is sufficient

## Context

- **Data source**: CNAM publishes BPO statistics yearly. The datagouv MCP server (`mcp.data.gouv.fr/mcp`) provides query access to these datasets. Need to research exact dataset IDs, update frequency, and query capabilities.
- **Current state**: Working dashboard with 9.2 MB of static JSON across 3 files (at-data.json, mp-data.json, trajet-data.json). Pre-processed from Excel files in the original BPO project (`~/.claude/bpo/`).
- **Quality debt**: No tests, no error handling on fetch, dead CSS from removed features, Chart.js font references DM Sans (not loaded, falls back to sans-serif), ES5/ES6 style split between dashboard and landing page.
- **Deployment**: GitHub Pages via `ayming-france/sinistralite-france` (public, deploy remote). Backup on `xXencarvXx/datagouv` (private, origin remote).
- **Landing page**: 1,869-line self-contained HTML page, deferred from this milestone.

## Constraints

- **No build step**: Vanilla JS + ES modules, no bundler. Must stay zero-dependency on Node.js tooling.
- **Static hosting**: GitHub Pages for now. Cloudflare Worker needed only as thin MCP proxy.
- **CDN dependencies**: Chart.js 4.4.7, chartjs-plugin-datalabels 2.2.0, Lucide (unpinned @latest). No npm packages.
- **French UI**: All visible text in proper French with accents. Code identifiers stay ASCII.
- **Two GitHub accounts**: `xXencarvXx` (origin/backup), `ayming-france` (deploy/Pages).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vanilla JS, no framework | Zero build step, simple deployment, full control | ✓ Good |
| Static JSON for initial data | Fast migration from BPO project, works on GitHub Pages | ⚠️ Revisit (replacing with live queries) |
| Cloudflare Workers for MCP proxy | Free tier, edge-deployed, pairs with static hosting | — Pending |
| Dashboard-first, landing page later | Core value is the dashboard; landing page needs backend for OAuth | — Pending |
| Polish before features | Fix quality debt while codebase is small and manageable | — Pending |

---
*Last updated: 2026-02-27 after initialization*
