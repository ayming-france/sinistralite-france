# Architecture

**Analysis Date:** 2026-02-27

## Pattern Overview

**Overall:** Single-page application with view-switching, built on vanilla ES6 modules, no build step.

**Key Characteristics:**
- Multi-view SPA: three parallel views (AT, MP, Trajet) sharing identical DOM structure with prefixed IDs
- Centralized render orchestration: `app.js` defines the `render()` function that coordinates all sub-renderers
- Static JSON data loaded at boot, no live API calls at runtime
- Hash-based routing for deep-linking and view switching
- Shared global state object (mutable singleton in `state.js`)
- CSS theming via CSS custom properties with `[data-theme="dark"]` override

## Layers

**Data Layer:**
- Purpose: Load and cache JSON datasets, provide accessors
- Location: `js/data.js` (19 lines)
- Contains: `loadDataset()`, `getData()`, `getStore()` functions
- Depends on: Static JSON files in `data/`
- Used by: All rendering modules (`app.js`, `charts.js`, `kpi.js`, `search.js`, `insights.js`)

**State Layer:**
- Purpose: Hold mutable application state and per-view configuration constants
- Location: `js/state.js` (70 lines)
- Contains: `state` object (active view, per-view code/level/chart instances) and `VIEW_CONFIG` constant
- Depends on: Nothing
- Used by: All modules read/write `state`; `VIEW_CONFIG` consumed by renderers

**Rendering Layer (multiple modules):**
- Purpose: Transform data into DOM output and Chart.js instances
- Location: `js/kpi.js` (97 lines), `js/charts.js` (643 lines), `js/insights.js` (152 lines)
- Contains: Pure rendering functions that receive data and write to DOM
- Depends on: `utils.js`, `state.js`, `data.js`
- Used by: Called from `render()` in `app.js`

**Interaction Layer:**
- Purpose: Handle user input (search, navigation, drawers, keyboard shortcuts)
- Location: `js/search.js` (193 lines), `js/nav.js` (87 lines), `js/insights.js` (drawer toggling)
- Contains: Event listener setup, autocomplete logic, view switching, theme toggle
- Depends on: `state.js`, `data.js`, `utils.js`
- Used by: Initialized from `app.js` on DOMContentLoaded

**Utilities Layer:**
- Purpose: Shared DOM helpers, formatting, constants
- Location: `js/utils.js` (50 lines)
- Contains: `el()`, `viewEl()`, `fmt()`, `fmtCompact()`, `badgeHTML()`, `normalize()`, `themeColor()`, `CAUSE_COLORS`, `KPI_HELP`
- Depends on: Nothing (pure helpers)
- Used by: All rendering and interaction modules

**Orchestration Layer:**
- Purpose: Bootstrap the app, wire modules together, define the central `render()` function
- Location: `js/app.js` (213 lines)
- Contains: `render()`, `loadFromHash()`, `attachDrawerListeners()`, `DOMContentLoaded` handler
- Depends on: All other modules
- Used by: HTML entry point (`<script type="module" src="js/app.js">`)

## Module Dependency Graph

```
app.js (entry point)
  |-- data.js       (loadDataset, getData, getStore)
  |-- state.js       (state, VIEW_CONFIG)
  |-- utils.js       (el, viewEl)
  |-- nav.js         (initNav, switchView)
  |     |-- state.js
  |     |-- utils.js
  |-- search.js      (setupSearch, selectCode, setLevel)
  |     |-- state.js
  |     |-- data.js
  |     |-- utils.js
  |-- kpi.js         (renderKPIs, renderNationalState)
  |     |-- utils.js
  |     |-- data.js
  |-- charts.js      (renderCausesChart, renderFunnelChart, renderPositionStrip, renderComparisonChart, renderEvolutionCharts, renderDemographics, setupCompToggle)
  |     |-- utils.js
  |     |-- state.js
  |     |-- data.js
  |     |-- search.js (selectCode)
  |-- insights.js    (renderInsights, toggleInsights, toggleShare, copyLink, downloadPDF)
        |-- utils.js
        |-- state.js
        |-- data.js
```

**Circular dependency note:** `charts.js` imports `selectCode` from `search.js` for click-to-navigate on comparison bars and position dots. No true circular dependency exists since `search.js` does not import from `charts.js`.

## Data Flow

**Boot Sequence (DOMContentLoaded):**

1. `loadDataset('at')`, `loadDataset('mp')`, `loadDataset('trajet')` fetch three JSON files in parallel via `Promise.all`
2. JSON responses are cached in `DATASETS` (module-scope `var` in `data.js`)
3. `initNav(render)` sets Chart.js defaults, wires nav rail clicks, restores theme from localStorage
4. `attachDrawerListeners()` binds insights/share drawer buttons
5. `setupSearch('at', render)`, `setupSearch('mp', render)`, `setupSearch('trajet', render)` bind input/keydown/click handlers for each view's search
6. `setupCompToggle()` for each view wires chart/table toggle
7. `renderNationalState()` for each view renders default empty-state KPIs and Top 10 table
8. `loadFromHash()` parses `window.location.hash` and triggers `selectCode()` + `render()` if a code is present

**User Selects a Sector:**

1. User types in search input, debounced (120ms) `showAutocomplete()` filters `data.naf_index` array
2. User clicks autocomplete item, or presses Enter on highlighted item
3. `setLevel(viewId, level)` updates `state.views[viewId].level` and toggles active tab button
4. `selectCode(viewId, code, level, render)` updates `state.views[viewId].code`, sets search input value, updates `window.location.hash`, calls `render()`
5. `render(viewId, code, level)` in `app.js`:
   - Retrieves entry from `getStore(viewId, level)[code]`
   - Hides empty state, shows results section
   - Updates title, subtitle, breadcrumb
   - Computes ranking among all codes at current level
   - Calls `renderKPIs()` (6 KPI cards with badges)
   - Calls `renderInsights()` (generates insight pills for drawer)
   - Calls `renderPositionStrip()` (IF distribution dot strip)
   - Calls `renderCausesChart()` (doughnut, if causesTitle not null)
   - Calls `renderFunnelChart()` (severity cascade)
   - Calls `renderComparisonChart()` (bar chart + table of peers)
   - Calls `renderEvolutionCharts()` (line charts for yearly trends)
   - Calls `renderDemographics()` (sex donut + age bar, if data exists)

**State Management:**
- `state` in `js/state.js` is a mutable singleton object, imported by all modules
- `state.activeView`: string (`'at'`, `'mp'`, `'trajet'`)
- `state.views[viewId]`: per-view object holding `code`, `level`, chart instances (`causesChart`, `compChart`, `evoCharts[]`, `demoCharts[]`), and `acIndex` (autocomplete cursor)
- Chart instances stored in state to enable `.destroy()` before re-creation
- No event bus, no pub/sub. State changes propagate via direct function calls from `render()`.
- `window.location.hash` serves as shareable URL state. Hash changes re-trigger `loadFromHash()`.

## Key Abstractions

**View ID Convention:**
- Purpose: Isolate three parallel dashboard instances in one page
- Pattern: All DOM element IDs use `{viewId}-{suffix}` (e.g., `at-searchInput`, `mp-kpiGrid`, `trajet-compChart`)
- The `viewEl(viewId, suffix)` helper in `js/utils.js` encapsulates `document.getElementById(viewId + '-' + suffix)`
- `VIEW_CONFIG[viewId]` holds per-view constants (event key, labels, funnel definition)
- Each `.view` div in HTML is toggled via `.active` class

**NAF Level Hierarchy:**
- Purpose: Three granularity levels for sector codes
- `naf2`: 2-digit division (89 codes in AT data)
- `naf4`: 4-digit sub-class (612 codes)
- `naf5`: Full NAF code with letter suffix (729 codes)
- Data stored in `by_naf2`, `by_naf4`, `by_naf5` dictionaries per dataset
- `naf_index` is a flat searchable array with `{code, libelle, level}` entries (1430 items)
- `adaptCode()` in `js/search.js` truncates a code to match a different granularity level

**Chart Instance Lifecycle:**
- Pattern: Store Chart.js instance in `state.views[viewId]`, `.destroy()` before re-creating
- Examples: `vs.causesChart`, `vs.compChart`, `vs.evoCharts[]`, `vs.demoCharts[]`
- Chart.js global defaults set once in `initNav()`, refreshed on theme toggle

## Entry Points

**Dashboard App:**
- Location: `index.html` line 318 loads `js/app.js` as `type="module"`
- Triggers: DOMContentLoaded
- Responsibilities: Load data, initialize all UI, handle routing

**Landing Page:**
- Location: `landing.html` (1869 lines, 58KB, self-contained)
- Triggers: Direct navigation or link from dashboard
- Responsibilities: Marketing/informational page. Completely standalone with inline styles, no shared modules.

## Error Handling

**Strategy:** Minimal. No try/catch blocks. No error boundaries.

**Patterns:**
- `if (!entry) return;` in `render()` silently exits if code not found in store
- `fetch()` in `data.js` has no error handling (no `.catch()`, no status check)
- Chart rendering uses optional chaining-style guards: `if (!section) return;`, `if (!years || years.length < 2) return;`
- Null/zero guards via `|| 0` on numeric fields throughout `state.js` funnel definitions and `kpi.js`

## Cross-Cutting Concerns

**Theming:**
- CSS custom properties defined in `:root` (light) and `[data-theme="dark"]` in `styles/base.css`
- Theme persisted in `localStorage.setItem('theme', ...)` and restored on boot in `js/nav.js`
- `themeColor(varName)` in `js/utils.js` reads live CSS variable values for Chart.js config
- Theme toggle re-renders the active view's charts (calls `render()`) to pick up new colors

**Routing:**
- Hash-based: `#at/01.29Z`, `#mp`, `#trajet/43`
- `window.addEventListener('hashchange', loadFromHash)` in `js/app.js`
- `selectCode()` in `js/search.js` updates `window.location.hash` on every code selection
- Legacy format `#CODE` (bare code without view prefix) maps to AT view

**DOM ID Convention:**
- All per-view elements use `{viewId}-{suffix}` pattern
- Shared drawers (insights, share) have fixed IDs outside `.container`
- Canvas elements for Chart.js follow `{viewId}-{chartName}` (e.g., `at-compChart`, `mp-causesChart`)

**External Dependencies (CDN):**
- Chart.js 4.4.7 via jsDelivr (UMD global `Chart`)
- chartjs-plugin-datalabels 2.2.0 via jsDelivr (global `ChartDataLabels`)
- Lucide icons via unpkg (global `lucide`)
- Google Fonts: Lato + JetBrains Mono

**Print Support:**
- `@media print` rules in `styles/base.css` hide nav, search, drawers, empty states
- `downloadPDF()` in `js/insights.js` simply calls `window.print()`

---

*Architecture analysis: 2026-02-27*
