# Codebase Structure

**Analysis Date:** 2026-02-27

## Directory Layout

```
datagouv/
├── data/               # Static JSON datasets (fetched at runtime)
│   ├── at-data.json    # Accidents du Travail (3.8MB)
│   ├── mp-data.json    # Maladies Professionnelles (3.4MB)
│   └── trajet-data.json # Accidents de Trajet (2.0MB)
├── js/                 # ES6 modules
│   ├── app.js          # Entry point, orchestration (213 lines, 7.3KB)
│   ├── charts.js       # All Chart.js rendering (643 lines, 24KB)
│   ├── data.js         # Data loading & cache (19 lines, 430B)
│   ├── insights.js     # Insight generation & drawers (152 lines, 6.0KB)
│   ├── kpi.js          # KPI card rendering (97 lines, 4.6KB)
│   ├── nav.js          # Navigation & theme (87 lines, 2.5KB)
│   ├── search.js       # Search & autocomplete (193 lines, 7.4KB)
│   ├── state.js        # Global state & view config (70 lines, 3.1KB)
│   └── utils.js        # Shared helpers (50 lines, 2.3KB)
├── styles/             # CSS files (one per UI domain)
│   ├── base.css        # Reset, variables, layout, typography (278 lines, 8.8KB)
│   ├── charts.css      # Charts, funnel, position strip, evo/demo grids (346 lines, 8.6KB)
│   ├── dark.css        # Reserved placeholder (1 line, 78B)
│   ├── drawers.css     # Insights & share drawers (201 lines, 4.9KB)
│   ├── kpi.css         # KPI grid & cards (109 lines, 2.8KB)
│   ├── nav.css         # Top nav bar & nav rail (151 lines, 3.5KB)
│   └── search.css      # Search input, autocomplete, breadcrumb, action buttons (242 lines, 6.1KB)
├── index.html          # Dashboard SPA (320 lines, 14KB)
├── landing.html        # Standalone landing page (1869 lines, 58KB)
├── CLAUDE.md           # Project instructions
└── .gitignore
```

## Directory Purposes

**`data/`:**
- Purpose: Pre-built JSON datasets fetched by `data.js` at boot
- Contains: One JSON file per view (AT, MP, Trajet)
- Key files: `at-data.json` (3.8MB), `mp-data.json` (3.4MB), `trajet-data.json` (2.0MB)
- JSON structure per file: `{meta, by_naf5, by_naf4, by_naf2, naf_index}`
- `meta`: source info, national aggregates, years array
- `by_naf{2,4,5}`: dictionaries keyed by NAF code, each entry has `{libelle, stats, risk_causes, demographics, yearly}`
- `naf_index`: flat array of `{code, libelle, level}` for search

**`js/`:**
- Purpose: All application JavaScript as ES6 modules
- Contains: 9 modules totaling 1,524 lines
- All modules use `export`/`import` syntax, loaded via `<script type="module">` in `index.html`
- No node_modules, no bundler, no transpiler

**`styles/`:**
- Purpose: CSS split by UI component domain
- Contains: 7 CSS files totaling 1,328 lines
- All loaded via `<link rel="stylesheet">` in `index.html` head
- Theme variables defined in `base.css` (`:root` and `[data-theme="dark"]`)
- `dark.css` is an empty placeholder reserved for future component-specific dark overrides

## Key File Locations

**Entry Points:**
- `index.html`: Dashboard SPA shell. Loads CDN scripts, 7 CSS files, and `js/app.js`
- `landing.html`: Self-contained marketing page. Has its own inline `<style>` block (does not share CSS files)
- `js/app.js`: Module entry point. Imports from all other modules, runs on DOMContentLoaded

**Configuration:**
- `js/state.js`: `VIEW_CONFIG` object defines per-view constants (titles, event keys, funnel items, source URLs)
- `styles/base.css`: CSS custom properties (`:root` block at top) define all design tokens
- `.gitignore`: Contains `*.env` exclusion

**Core Logic:**
- `js/data.js`: Dataset loading, caching, and accessor functions
- `js/search.js`: Autocomplete filtering, code selection, level switching, code adaptation across NAF levels
- `js/charts.js`: All Chart.js chart creation (doughnut, bar, line, funnel, position strip, demographics)
- `js/insights.js`: Rule-based insight generation (IF ratio, gravity, IP rate, evolution trends)

**Rendering:**
- `js/kpi.js`: KPI card HTML generation for both sector-selected and national-default states
- `js/charts.js`: 7 exported chart rendering functions
- `js/insights.js`: Insight pill generation for drawer body

**Utilities:**
- `js/utils.js`: `el()`, `viewEl()`, `fmt()`, `fmtCompact()`, `badgeHTML()`, `normalize()`, `themeColor()`, `CAUSE_COLORS`, `KPI_HELP`

## Naming Conventions

**Files:**
- JS modules: `lowercase.js` (e.g., `app.js`, `state.js`, `charts.js`)
- CSS files: `lowercase.css`, named by UI domain (e.g., `nav.css`, `kpi.css`, `drawers.css`)
- JSON data: `{viewId}-data.json` (e.g., `at-data.json`, `mp-data.json`)
- HTML pages: `lowercase.html`

**DOM IDs:**
- Per-view elements: `{viewId}-{suffix}` (e.g., `at-searchInput`, `mp-kpiGrid`, `trajet-compChart`)
- Shared elements: plain IDs (e.g., `themeToggle`, `insightsDrawer`, `shareDrawer`)
- Canvas elements: `{viewId}-{chartName}` (e.g., `at-causesChart`, `mp-evoEvents`)

**CSS Classes:**
- BEM-lite: `.component-element` pattern (e.g., `.kpi-card`, `.kpi-card .label`, `.funnel-bar-label`)
- State classes: `.active`, `.open`, `.visible`, `.disabled`, `.current`
- Modifier classes: `.up`, `.down`, `.neutral` (for badges)

**JS Functions:**
- camelCase for all functions: `renderKPIs()`, `selectCode()`, `setupCompToggle()`
- `render` prefix for DOM-producing functions: `renderCausesChart()`, `renderInsights()`, `renderNationalState()`
- `setup` prefix for event-binding initializers: `setupSearch()`, `setupCompToggle()`
- `toggle` prefix for open/close functions: `toggleInsights()`, `toggleShare()`, `toggleTheme()`

## Where to Add New Code

**New View (e.g., "Overview" view):**
1. Add HTML section in `index.html` following the `<!-- AT VIEW -->` pattern: `.view` div with prefixed IDs
2. Add nav button in `#navRail` with `data-view="overview"`
3. Add `VIEW_CONFIG.overview` entry in `js/state.js`
4. Add `state.views.overview` initial state in `js/state.js`
5. Create JSON data file `data/overview-data.json`
6. Add `loadDataset('overview')` to the `Promise.all` in `js/app.js`
7. Call `setupSearch('overview', render)` and other initializers in `js/app.js`

**New Chart Type:**
- Add rendering function in `js/charts.js`
- Export it and import in `js/app.js`
- Call from `render()` function in `js/app.js`
- Add CSS in `styles/charts.css`

**New KPI or Metric:**
- Add HTML container in `index.html` within the view's `.kpi-grid` or results section
- Update `renderKPIs()` in `js/kpi.js` to include the new card
- If it needs a help tooltip, add entry to `KPI_HELP` in `js/utils.js`

**New Insight Rule:**
- Add conditional block in `renderInsights()` in `js/insights.js`
- Use `{ level: 'danger'|'warn'|'info', text: '...' }` format

**New CSS Component:**
- Create `styles/{component}.css`
- Add `<link rel="stylesheet" href="styles/{component}.css">` in `index.html` head (before `dark.css`)

**New Utility Function:**
- Add to `js/utils.js` and export
- Import where needed

## Special Directories

**`data/`:**
- Purpose: Static JSON datasets
- Generated: Yes, likely generated offline (by MCP queries or scripts, not part of this codebase)
- Committed: Yes (tracked in git, total 9.2MB)

**`.planning/`:**
- Purpose: Planning and analysis documents for GSD workflow
- Generated: Yes (by Claude Code)
- Committed: Configurable (depends on workflow)

**`.vscode/`:**
- Purpose: VS Code workspace settings
- Contains: `settings.local.json`
- Committed: Yes

## File Size Summary

| Category | Files | Total Lines | Total Size |
|----------|-------|-------------|------------|
| HTML | 2 | 2,189 | 72KB |
| JavaScript | 9 | 1,524 | 58KB |
| CSS | 7 | 1,328 | 35KB |
| JSON Data | 3 | (minified) | 9.2MB |
| **Total** | **21** | **5,041+** | **9.4MB** |

Largest JS file: `js/charts.js` (643 lines, 24KB) contains all chart rendering logic.
Largest CSS file: `styles/charts.css` (346 lines, 8.6KB).
Largest HTML file: `landing.html` (1,869 lines, 58KB, self-contained standalone page).

---

*Structure analysis: 2026-02-27*
