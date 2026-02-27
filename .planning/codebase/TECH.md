# Technology Stack

**Analysis Date:** 2026-02-27

## Languages

**Primary:**
- JavaScript (ES6+) - All application logic, ES modules with `import`/`export`
- CSS3 - Styling via custom properties, animations, grid/flexbox, `@media` queries, print styles

**Secondary:**
- HTML5 - Two pages: `index.html` (dashboard SPA), `landing.html` (marketing/landing page)
- JSON - Static data files in `data/` (pre-processed datasets)

**No TypeScript, no JSX, no preprocessors.**

## Runtime

**Environment:**
- Browser-only, no Node.js runtime
- ES modules loaded natively via `<script type="module" src="js/app.js">`
- No bundler, no transpilation, no build step

**Package Manager:**
- None. No `package.json`, no `node_modules/`. All dependencies loaded via CDN.

**Dev Server:**
- VS Code Live Server on port 5501 (configured in `.vscode/settings.json`)

## Frameworks

**Core:**
- No framework. Vanilla JavaScript with manual DOM manipulation via `document.getElementById()` and `innerHTML` templating.

**Charting:**
- Chart.js 4.4.7 (CDN: jsDelivr) - Bar, line, doughnut charts
- chartjs-plugin-datalabels 2.2.0 (CDN: jsDelivr) - Percentage labels on doughnut charts

**Icons:**
- Lucide (CDN: unpkg, `@latest`) - SVG icon library, initialized via `lucide.createIcons()`

**Fonts:**
- Google Fonts: Lato (300, 400, 700, 900), JetBrains Mono (400, 500, 600)

## CDN Dependencies

All external dependencies are loaded as global scripts (not ES modules):

| Library | Version | CDN | Global Variable | Used In |
|---------|---------|-----|-----------------|---------|
| Chart.js | 4.4.7 | jsDelivr | `Chart` | `js/charts.js`, `js/nav.js` |
| chartjs-plugin-datalabels | 2.2.0 | jsDelivr | `ChartDataLabels` | `js/charts.js` |
| Lucide | latest | unpkg | `lucide` | `js/nav.js`, `js/app.js` |

**CDN URLs (from `index.html`):**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
<script src="https://unpkg.com/lucide@latest"></script>
```

**Risk:** Lucide uses `@latest` which can break on major version bumps. Pin to a specific version for stability.

## Data Layer

**Static JSON files** loaded at startup via `fetch()`:

| File | Size | Lines | Content |
|------|------|-------|---------|
| `data/at-data.json` | 3.8 MB | 158,865 | Workplace accidents (AT) |
| `data/mp-data.json` | 3.4 MB | 143,282 | Occupational diseases (MP) |
| `data/trajet-data.json` | 2.0 MB | 84,694 | Commute accidents |

**Total payload:** ~9.2 MB of JSON loaded on first visit.

**Data structure** (all three files share the same schema):
```json
{
  "meta": { "source", "source_url", "national": {...}, "years": [2019..2023] },
  "by_naf5": { "01.11Z": { "libelle", "stats", "risk_causes", "demographics", "yearly" } },
  "by_naf4": { "01.11": { ... } },
  "by_naf2": { "01": { ... } },
  "naf_index": [{ "code", "libelle", "level" }]
}
```

**Stats keys:** `nb_salaries`, `nb_heures`, `nb_siret`, `at_1er_reglement`, `at_4j_arret`, `nouvelles_ip`, `deces`, `journees_it`, `indice_frequence`, `taux_gravite`

**Loading pattern** (from `js/data.js`):
```javascript
var DATASETS = {};
export async function loadDataset(type) {
  if (DATASETS[type]) return DATASETS[type];
  var resp = await fetch('./data/' + type + '-data.json');
  var json = await resp.json();
  DATASETS[type] = json;
  return json;
}
```
All three datasets are loaded in parallel at startup via `Promise.all()` in `js/app.js`.

## Browser APIs Used

| API | Purpose | File |
|-----|---------|------|
| `fetch()` | Load JSON data files | `js/data.js` |
| `localStorage` | Persist dark/light theme preference | `js/nav.js` |
| `navigator.clipboard.writeText()` | Copy share link | `js/insights.js` |
| `window.location.hash` | Client-side routing (#view/code) | `js/app.js` |
| `window.print()` | PDF export (browser print dialog) | `js/insights.js` |
| `getComputedStyle()` | Read CSS custom property values for Chart.js theming | `js/utils.js` |
| `Element.scrollIntoView()` | Scroll autocomplete items into view | `js/search.js` |
| `String.normalize('NFD')` | Accent-insensitive search | `js/utils.js` |
| `Number.toLocaleString('fr-FR')` | French number formatting (space separators) | `js/utils.js` |
| CSS `@keyframes` | Staggered entrance animations (`fadeUp`) | `styles/base.css` |
| CSS Custom Properties | Full theming system (light/dark) | `styles/base.css` |
| `hashchange` event | SPA routing between views | `js/app.js` |

## Theming System

**Approach:** CSS custom properties on `:root` with `[data-theme="dark"]` overrides.

**Toggle mechanism:** `js/nav.js` sets `data-theme` attribute on `<html>` and persists to `localStorage`.

**Chart re-rendering:** When theme toggles, Chart.js global defaults are updated via `getComputedStyle()`, and the active view is fully re-rendered.

**Key custom properties:** `--bg`, `--bg-elevated`, `--bg-card`, `--border`, `--text`, `--text-secondary`, `--text-dim`, `--accent`, `--chart-tooltip-bg`, `--chart-grid`, `--chart-label`, `--card-shadow`

**Font variables:** `--mono` (JetBrains Mono), `--sans` (Lato), `--serif` (Lato/Georgia, defined but rarely used)

## Module System

**ES modules** with `<script type="module">`. Single entry point: `js/app.js`.

**Module graph:**
```
js/app.js (entry)
  ├── js/data.js      (fetch + cache)
  ├── js/state.js     (shared mutable state + view configs)
  ├── js/utils.js     (formatting, DOM helpers, colors)
  ├── js/nav.js       (navigation, theme toggle)
  ├── js/search.js    (autocomplete, level tabs, URL sync)
  ├── js/kpi.js       (KPI card rendering)
  ├── js/charts.js    (Chart.js wrappers: causes, funnel, comparison, evolution, demographics)
  └── js/insights.js  (insight generation, drawer toggles, share/PDF)
```

**No circular dependencies.** `charts.js` imports from `search.js` (for `selectCode` click handlers), and `search.js` imports from `data.js` and `state.js`.

## CSS Architecture

**Seven separate CSS files** loaded in order via `<link>` tags in `index.html`:

| File | Lines | Purpose |
|------|-------|---------|
| `styles/base.css` | 278 | Reset, custom properties, layout, footer, animations, print styles |
| `styles/nav.css` | 151 | Top nav bar, side rail (GA4-style), theme toggle |
| `styles/search.css` | 242 | Search input, autocomplete dropdown, level tabs |
| `styles/kpi.css` | 109 | KPI cards grid, badges, help tooltips |
| `styles/charts.css` | 346 | Chart cards, funnel bars, position strip, comparison table, evolution/demo grids |
| `styles/drawers.css` | 201 | Insights drawer, share drawer, slide-in animations |
| `styles/dark.css` | 1 | Reserved placeholder (dark overrides live in `base.css` via `[data-theme="dark"]`) |

**No CSS preprocessor.** No Tailwind. No CSS modules. Plain CSS with custom properties for theming.

## Build & Deploy Pipeline

**Build step:** None. Files are served as-is.

**Git remotes:**
- `origin` -> `https://github.com/xXencarvXx/datagouv.git` (private backup)
- `deploy` -> `https://github.com/ayming-france/sinistralite-france.git` (GitHub Pages, public)

**Deployment:** Push `main` branch to `deploy` remote. GitHub Pages serves the repo root directly.

**CI/CD:** None configured. Manual push.

**No `.github/workflows/` directory. No build scripts. No `package.json`.**

## Codebase Size

| Category | Files | Lines |
|----------|-------|-------|
| JavaScript | 9 | 1,524 |
| CSS | 7 | 1,328 |
| HTML | 2 | 2,189 |
| JSON data | 3 | 386,841 |
| **Total** | **21** | **391,882** |

## Platform Requirements

**Development:**
- Any modern browser (ES module support required)
- VS Code with Live Server extension (port 5501)
- Git for version control

**Production:**
- Static file hosting (GitHub Pages)
- No server-side requirements
- Requires CDN availability (jsDelivr, unpkg, Google Fonts)

**Browser support:**
- ES modules: Chrome 61+, Firefox 60+, Safari 11+, Edge 79+
- CSS custom properties: same range
- `navigator.clipboard`: requires HTTPS (GitHub Pages provides this)

---

*Stack analysis: 2026-02-27*
