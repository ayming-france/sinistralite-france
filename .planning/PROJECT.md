# Sinistralité France

## What This Is

A public dashboard that makes French workplace accident statistics (sinistralité) easy to understand, sector by sector. Built for Ayming consultants analyzing client risk profiles and anyone interested in occupational safety data in France. Features mobile navigation, accessibility, CSV export, and a self-contained data pipeline. Vanilla JS + ES modules architecture with static JSON data from ameli.fr.

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
- ✓ Insights drawer with automated risk analysis — existing
- ✓ Share drawer (copy link, print/PDF) — existing
- ✓ Dark/light theme toggle with persistence — existing
- ✓ Hash-based deep linking (view/code) — existing
- ✓ Responsive layout (mobile full-width drawers) — existing
- ✓ Click-outside-to-close for drawers — existing
- ✓ Keyboard shortcuts (Escape to close, / to focus search) — existing
- ✓ French accents on all labels (12 occurrences fixed) — v1.0
- ✓ Branding "Sinistralité France" with SVG favicon — v1.0
- ✓ Skeleton loaders and error handling with retry — v1.0
- ✓ Chart.js Lato font, dead CSS cleanup, localStorage key fix — v1.0
- ✓ Mobile bottom tab bar navigation (AT, MP, Trajet) — v1.0
- ✓ ARIA labels (38), skip link, drawer focus trap, :focus-visible — v1.0
- ✓ CSV export with UTF-8 BOM, semicolon separator, children rows — v1.0
- ✓ Self-contained Python data pipeline (refresh_data.py, parse_pdf.py) — v1.0

### Active

(None. Define next milestone requirements with `/gsd:new-milestone`.)

### Out of Scope

- Live datagouv MCP queries — sinistralité data is on ameli.fr, not data.gouv.fr. Static JSON pipeline is the right approach.
- Cloudflare Worker proxy — not needed since data is static, updated annually
- Ameli health data integration — separate app/milestone if needed
- SIRENE company lookup — separate app
- Landing page redesign — defer until needed
- User authentication — not needed for public dashboard
- IF by company size — data exists in PDFs only (not Excel), fragile to parse
- Mobile native app — responsive web is sufficient

## Context

Shipped v1.0 with 7,091 LOC across JS, CSS, HTML, and Python.
Tech stack: Vanilla JS + ES modules, Chart.js 4.4.7, Lucide icons, Lato font. No build step.
Data: 9.2 MB static JSON (at-data.json, mp-data.json, trajet-data.json) from ameli.fr Excel files.
Pipeline: Python scripts in `data/pipeline/` with optional PDF parsing for demographics.
Deployment: GitHub Pages via `ayming-france/sinistralite-france` (public). Backup on `xXencarvXx/datagouv` (private).

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
| v1 = polish only | Fix quality debt while codebase is small and manageable | ✓ Good |
| Lato as sole font | DM Sans was never loaded; Lato is consistent across all charts and UI | ✓ Good |
| SVG data URI favicon | No external file needed, tricolore design (bleu/blanc/rouge) | ✓ Good |
| localStorage key: datagouv-theme | Namespaced, shared between dashboard and landing page | ✓ Good |
| Bottom tab bar for mobile | Simpler than hamburger, matches 3-view structure exactly | ✓ Good |
| Focus trap in vanilla JS | 2 drawers too simple to justify a CDN library | ✓ Good |
| CSV semicolons + UTF-8 BOM | French Excel defaults expect semicolons; BOM preserves accents | ✓ Good |
| Pipeline --pdf-dir required arg | Prevents silent runs without demographics data | ✓ Good |

---
*Last updated: 2026-02-28 after v1.0 milestone*
