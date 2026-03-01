# Architecture Research

**Domain:** Regional map integration into existing vanilla JS ES module dashboard
**Researched:** 2026-02-28
**Confidence:** HIGH (direct inspection of existing source files; no speculative assumptions)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Python Pipeline (data/pipeline/)             │
│                                                                     │
│  ┌────────────────────┐    ┌───────────────────────────────────┐    │
│  │  parse_regional.py │    │  refresh_data.py (existing)       │    │
│  │  (new)             │    │  parse_pdf.py (existing)          │    │
│  │  Input: PDF        │    │  Input: ameli.fr XLSX             │    │
│  │  Output: regional  │    │  Output: at/mp/trajet-data.json   │    │
│  │  -data.json        │    │                                   │    │
│  └─────────┬──────────┘    └───────────────────────────────────┘    │
│            │                                                        │
└────────────┼────────────────────────────────────────────────────────┘
             │ writes
             v
┌─────────────────────────────────────────────────────────────────────┐
│                        data/ (static JSON)                          │
│                                                                     │
│  at-data.json    mp-data.json    trajet-data.json    regional-data.json (new) │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ fetch() on boot
                          v
┌─────────────────────────────────────────────────────────────────────┐
│                     Browser (GitHub Pages)                          │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  data.js  │  │ state.js  │  │  nav.js   │  │  app.js   │            │
│  │ +loadReg  │  │ +map view │  │ +switchView│  │ +init map │            │
│  └─────┬─────┘  └──────────┘  └──────────┘  └──────────┘            │
│        │                                                            │
│        v                                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  map.js  (new)                                               │   │
│  │  - renderMap(viewId, metric)                                 │   │
│  │  - updateChoropleth(data, metric)                            │   │
│  │  - showTooltip(region, stats)                                │   │
│  │  - clearMap()                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│        |                                                            │
│        v                                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  index.html                                                  │   │
│  │  - #view-map div (new view container)                        │   │
│  │  - Inline SVG of France by caisse regionale (new)            │   │
│  │  - Map nav-item button in nav rail (new)                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `parse_regional.py` (new) | Parse rapport annuel PDF tables 9 and 17, emit `regional-data.json` | Called from `refresh_data.py` or standalone |
| `data/regional-data.json` (new) | Static JSON: 21 caisses, AT + Trajet counts 2020-2024 | Loaded by `data.js` |
| `data.js` (modified) | Load `regional-data.json` alongside existing datasets | `app.js`, `map.js` |
| `state.js` (modified) | Track active metric (`at` or `trajet`), selected region | `map.js`, `nav.js`, `app.js` |
| `nav.js` (modified) | Handle `switchView('map')` — update header, footer, nav rail active state | `app.js`, `state.js` |
| `map.js` (new) | Render SVG choropleth, handle hover/click, show tooltips | `data.js`, `state.js`, DOM (inline SVG) |
| `index.html` (modified) | Add `#view-map` container, inline SVG of France, nav rail button for map | All JS modules |
| `styles/map.css` (new) | Choropleth fill colors, tooltip positioning, legend, hover transitions | None |

## Recommended Project Structure

```
/
├── js/
│   ├── app.js          # Modified: init map on boot, add map to loadFromHash
│   ├── data.js         # Modified: add loadDataset('regional'), getRegionalData()
│   ├── state.js        # Modified: add 'map' to activeView options, add map state
│   ├── nav.js          # Modified: switchView handles 'map' (no sector state carry-over)
│   ├── map.js          # New: SVG choropleth render, tooltip, metric toggle
│   ├── search.js       # Unchanged
│   ├── kpi.js          # Unchanged
│   ├── charts.js       # Unchanged
│   ├── insights.js     # Unchanged
│   └── utils.js        # Unchanged
├── styles/
│   ├── base.css        # Unchanged
│   ├── nav.css         # Minor: add map nav-item styles if needed
│   ├── map.css         # New: choropleth, tooltip, legend, metric toggle
│   ├── search.css      # Unchanged
│   ├── kpi.css         # Unchanged
│   ├── charts.css      # Unchanged
│   └── drawers.css     # Unchanged
├── data/
│   ├── at-data.json        # Unchanged
│   ├── mp-data.json        # Unchanged
│   ├── trajet-data.json    # Unchanged
│   ├── regional-data.json  # New
│   └── pipeline/
│       ├── refresh_data.py     # Modified: optionally call parse_regional.py
│       ├── parse_pdf.py        # Unchanged
│       ├── parse_regional.py   # New
│       └── requirements.txt    # Unchanged (pdfplumber already present)
└── index.html          # Modified: view-map, inline SVG, nav button
```

### Structure Rationale

- **`map.js` as a sibling module:** Follows the exact pattern of `kpi.js`, `charts.js`, `insights.js`. Each render concern is its own module. `app.js` imports and calls it.
- **`map.css` as separate stylesheet:** Follows the CSS split-by-component pattern already established. Isolates map-specific styles (fill colors, tooltip, legend) from the rest.
- **Inline SVG in `index.html`:** Inline SVG is the correct choice for choropleth maps in vanilla JS without a build step. It allows direct DOM manipulation of `<path>` elements via `document.getElementById()`, which is simpler and faster than embedded SVG fetched separately. An external SVG loaded via `<img>` or CSS `background` cannot be styled or manipulated from JavaScript.
- **`regional-data.json` in `data/`:** Follows the existing convention (`at-data.json`, `mp-data.json`, `trajet-data.json`). Loaded at boot via the same `loadDataset()` pattern.
- **`parse_regional.py` as a standalone script:** Mirrors the relationship between `parse_pdf.py` and `refresh_data.py`. The regional parser handles one PDF source (rapport annuel) independently. `refresh_data.py` can call it or it can be run standalone.

## Architectural Patterns

### Pattern 1: Inline SVG with Direct DOM Manipulation

**What:** The SVG map of France (one `<path>` per caisse regionale) is embedded inline in `index.html`. Each `<path>` has an `id` matching the caisse code (e.g. `id="caisse-75"`). `map.js` fills paths using `el.style.fill = colorScale(value)` and attaches `mouseenter`/`mouseleave` events for tooltips.

**When to use:** Any time the map needs to respond to data changes without a redraw. Setting `style.fill` on a DOM element is O(1) per region and requires no library.

**Trade-offs:**
- PRO: No external library (D3, Leaflet, etc.). Zero new CDN dependencies.
- PRO: Direct DOM access means the color update loop is trivial: `regions.forEach(r => path.style.fill = color(r.value))`.
- PRO: SVG `<title>` elements provide accessible labels for screen readers without extra work.
- CON: The SVG must be authored or sourced carefully. France by caisse regionale is not a standard projection; paths must match the 21 caisses exactly (including DOM-TOM treatment).
- CON: Inline SVG adds ~15-30 KB to `index.html`. Acceptable for a single-page app; gzip reduces this significantly.

**Example:**

```javascript
// js/map.js
import { el } from './utils.js';

var COLOR_SCALE_AT = ['#edf8e9', '#bae4bc', '#74c476', '#31a354', '#006d2c'];
var COLOR_SCALE_TJ = ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'];

export function updateChoropleth(regionalData, metric, year) {
  var entries = Object.entries(regionalData[year] || {});
  var values = entries.map(function(p) { return p[1][metric] || 0; });
  var max = Math.max.apply(null, values);

  entries.forEach(function(pair) {
    var code = pair[0];
    var val = pair[1][metric] || 0;
    var path = document.getElementById('caisse-' + code);
    if (!path) return;
    var idx = max > 0 ? Math.floor((val / max) * (COLOR_SCALE_AT.length - 1)) : 0;
    var scale = metric === 'at' ? COLOR_SCALE_AT : COLOR_SCALE_TJ;
    path.style.fill = scale[idx];
    path.dataset.value = val;
    path.dataset.region = pair[1].libelle || code;
  });
}
```

### Pattern 2: Map View as a Peer View (Not a Subview)

**What:** The map is a fourth view (`map`) alongside `at`, `mp`, and `trajet`. It lives in `state.activeView` and is shown/hidden by the same `.view` / `.view.active` CSS mechanism already used for the three existing views. `switchView('map')` follows the same code path as `switchView('at')`.

**When to use:** When the new feature has a different data domain (regional vs. sectoral) that does not share the search bar, KPI grid, or chart layout of the existing views. A peer view avoids embedding map logic into existing view render cycles.

**Trade-offs:**
- PRO: Zero changes to `render()`, `renderKPIs()`, `renderCausesChart()`, etc. The map is isolated.
- PRO: Hash routing extends naturally: `#map` or `#map/at` activates the map view with optional metric preset.
- PRO: Mobile bottom tab bar gets a fourth tab. The existing 3-tab layout works for 3-4 items.
- CON: The map view does not show a sector-specific map (e.g. "which regions have the most accidents in sector 10.1?"). That feature would require a different integration (map overlaid on sector view). Out of scope for v1.1.

**Example:**

```javascript
// nav.js addition — map needs no sector carry-over
export function switchView(viewId) {
  // existing logic unchanged for at/mp/trajet
  if (viewId === 'map') {
    state.activeView = 'map';
    document.querySelectorAll('.nav-item[data-view]').forEach(function(item) {
      item.classList.toggle('active', item.dataset.view === 'map');
    });
    document.querySelectorAll('.view').forEach(function(v) {
      v.classList.toggle('active', v.id === 'view-map');
    });
    el('headerTitle').textContent = 'Carte Régionale';
    el('headerSubtitle').textContent = 'AT et accidents de trajet par caisse régionale (CARSAT/CRAMIF/CGSS).';
    el('footerSource').innerHTML = 'Source : <a href="..." target="_blank">Rapport annuel AT-MP 2023, CNAM</a>';
    window.location.hash = 'map';
    return;
  }
  // existing switch logic for at/mp/trajet follows...
}
```

### Pattern 3: Tooltip via Floating `<div>` (not SVG `<title>`)

**What:** On `mouseenter` of a region path, a positioned `<div id="map-tooltip">` is shown near the cursor using `mousemove` to track position. It is hidden on `mouseleave`. The tooltip content is rendered from `regional-data.json` for the hovered region and the currently selected year/metric.

**When to use:** SVG `<title>` tooltips are browser-styled and cannot be customized. A floating `<div>` styled with `map.css` matches the dashboard's existing tooltip aesthetics (from `charts.css`).

**Trade-offs:**
- PRO: Full control over content layout (region name, AT count, Trajet count, IF if available).
- PRO: Reuses CSS variables already defined in `base.css` (`--bg-card`, `--border`, `--card-shadow`).
- CON: Touch devices have no `hover`. The tooltip must double as a click target (click shows tooltip, second click or outside-click dismisses). This needs explicit handling.
- CON: Tooltip must stay within viewport — add boundary clamping in the `mousemove` handler.

## Data Flow

### Boot Sequence with Regional Data

```
DOMContentLoaded
    |
    v
data.js: loadDataset('at')
         loadDataset('mp')
         loadDataset('trajet')
         loadDataset('regional')   <-- added in parallel with Promise.all
    |
    v
All datasets cached in DATASETS module variable
    |
    v
nav.js: initNav(render)
    |
    v
map.js: initMap()   <-- called once from app.js DOMContentLoaded
        - attaches mouseenter/mouseleave to all caisse paths
        - renders initial choropleth (most recent year, AT metric)
        - sets up metric toggle listeners
    |
    v
loadFromHash():
    '#map'    --> switchView('map')
    '#map/at' --> switchView('map'), set metric = 'at'
    '#at/...' --> existing sector flow unchanged
```

### Regional Data to Map Update

```
User clicks metric toggle (AT vs Trajet)
    |
    v
map.js: state.map.metric = 'at' | 'trajet'
    |
    v
map.js: updateChoropleth(getRegionalData(), state.map.metric, state.map.year)
    |
    v
For each caisse path in SVG:
    path.style.fill = colorScale[quantile index]
    |
    v
Legend updates to reflect new color scale
```

### Regional JSON Shape

```json
{
  "meta": {
    "source": "Rapport annuel AT-MP CNAM 2023",
    "caisses": ["01","02",...,"97"],
    "years": ["2020","2021","2022","2023","2024"]
  },
  "by_year": {
    "2023": {
      "01": { "libelle": "CARSAT Alsace-Moselle", "at": 12345, "trajet": 987 },
      "02": { "libelle": "CARSAT Aquitaine", "at": 8901, "trajet": 654 },
      ...
    }
  }
}
```

Key decisions:
- Keyed by year at the top level so switching years requires no restructuring.
- Caisse codes match the SVG path `id` attributes (must be agreed between pipeline and SVG source).
- AT and Trajet counts are absolute event counts, not indices (the PDF tables provide raw counts; IF computation requires salariés count which may not be available at regional level).

## Python Pipeline Integration

### parse_regional.py Responsibilities

The new script handles a fundamentally different parsing challenge than `parse_pdf.py`. The rapport annuel PDF contains multi-column tables with merged row headers spanning multiple physical rows. pdfplumber's `extract_table()` returns `None` for merged cells, so the parser must handle row merging explicitly.

**Input:** Single PDF file (rapport annuel, downloaded manually or via pipeline). Tableau 9 (page ~24) for AT by caisse, Tableau 17 (page ~37) for Trajet by caisse.

**Output:** `data/regional-data.json` in the shape defined above.

**Key parsing logic:**

```python
def merge_multiline_rows(raw_rows):
    """
    pdfplumber returns None for cells that are part of a merged row header.
    This function merges consecutive rows where the first column is None
    into the preceding row with a non-None first column.
    """
    merged = []
    for row in raw_rows:
        if row[0] is not None:
            merged.append(list(row))
        elif merged:
            # Merge numeric cells into the last row
            for i, cell in enumerate(row):
                if cell and merged[-1][i] is None:
                    merged[-1][i] = cell
    return merged
```

**Year column detection:** The PDF table has a header row with year labels (2020, 2021, ..., 2024). The parser identifies year columns by scanning the header row for 4-digit year patterns, then extracts values at those column indices for each caisse row.

**Caisse identification:** Each row starts with a numeric rank and the caisse name. The caisse code must be derived from the name (e.g. "CARSAT Alsace-Moselle" -> "01"). A lookup dict in the script maps canonical caisse names to their 2-digit codes.

**DOM-TOM handling:** DOM-TOM caisses (Martinique, Guadeloupe, Guyane, Reunion, Mayotte) appear in a separate sub-table or at the bottom of the main table. The parser must handle both layouts.

### refresh_data.py Integration

The simplest integration adds a `--rapport-pdf` optional argument to `refresh_data.py`, paralleling the existing `--pdf-dir` argument:

```
python refresh_data.py --pdf-dir /path/to/naf-pdfs --rapport-pdf /path/to/rapport-annuel.pdf
```

When `--rapport-pdf` is provided, `refresh_data.py` imports and calls `parse_regional.parse_regional_pdf()` and writes the result to `data/regional-data.json`. When omitted, regional data is skipped (no silent failure, a message is printed).

Alternatively, `parse_regional.py` can be run standalone:

```
python data/pipeline/parse_regional.py --pdf /path/to/rapport-annuel.pdf --out data/regional-data.json
```

Both modes are valid. The standalone mode is useful for development and testing without running the full pipeline.

## Integration Points

### New Files Required

| File | Type | Purpose |
|------|------|---------|
| `js/map.js` | New JS module | Choropleth render, tooltip, metric toggle |
| `styles/map.css` | New CSS | Map-specific styles |
| `data/regional-data.json` | New data file | Regional AT + Trajet counts by caisse and year |
| `data/pipeline/parse_regional.py` | New Python script | PDF table parser for rapport annuel |

### Modified Files

| File | Modification | Risk |
|------|-------------|------|
| `index.html` | Add `<nav-item data-view="map">`, add `<div id="view-map">`, embed inline SVG | Medium: SVG is 15-30 KB added to HTML; must not break existing view layout |
| `js/app.js` | Import `map.js`, call `initMap()` in `DOMContentLoaded`, extend `loadFromHash()` for `#map` hash | Low: additive only |
| `js/data.js` | Add `loadDataset('regional')` to boot `Promise.all`, add `getRegionalData()` export | Low: follows existing pattern exactly |
| `js/state.js` | Add `map: { metric: 'at', year: '2023' }` to state object | Low: additive only |
| `js/nav.js` | Extend `switchView()` to handle `'map'` case | Low: new `if` branch, existing branches unchanged |
| `data/pipeline/refresh_data.py` | Add optional `--rapport-pdf` argument and call to `parse_regional.py` | Low: optional flag, no change to existing behavior |

### Unchanged Files (confirmed)

`search.js`, `kpi.js`, `charts.js`, `insights.js`, `utils.js`, `base.css`, `search.css`, `kpi.css`, `charts.css`, `drawers.css`, `dark.css`, `parse_pdf.py`.

### Internal Module Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `app.js` to `map.js` | `import { initMap, renderMap } from './map.js'` | `initMap()` called once on boot after data loaded; `renderMap()` not needed if map auto-renders on `initMap()` |
| `map.js` to `data.js` | `import { getRegionalData } from './data.js'` | `getRegionalData()` returns the cached regional JSON; no async needed (data already loaded at boot) |
| `map.js` to `state.js` | `import { state } from './state.js'` | Reads `state.map.metric` and `state.map.year`; writes on user interaction |
| `nav.js` to `map.js` | None (nav does not call map directly) | `switchView('map')` only manipulates DOM classes. `map.js` initialises once at boot and the SVG is always present but hidden. |
| SVG paths to `map.js` | Direct DOM: `document.getElementById('caisse-XX')` | The SVG path IDs are the contract between the SVG source and the parser's caisse code mapping. They must match. |

## Anti-Patterns

### Anti-Pattern 1: Loading the SVG Separately via Fetch

**What people do:** Fetch the SVG file via `fetch('map.svg')`, inject it into the DOM, then query its paths.

**Why it's wrong:** Async SVG injection means the paths are not in the DOM when `initMap()` runs. Requires a promise chain or MutationObserver. Also breaks the no-build-step constraint if the SVG is treated as a module. Adds one more network request on boot.

**Do this instead:** Inline the SVG directly in `index.html`. It is always in the DOM when `DOMContentLoaded` fires. Path IDs are stable and queryable immediately.

### Anti-Pattern 2: Integrating Map Logic into the Existing `render()` Function

**What people do:** Add a `if (viewId === 'map') renderMap(...)` branch inside the existing `render()` function in `app.js`.

**Why it's wrong:** The `render()` function operates on sector data (`getData(viewId)`, `getStore(viewId, level)`). The map has no sector code, no `level`, no `entry` from `getStore`. Forcing it into the same function signature creates a confusing conditional path and risks breaking existing rendering when state is inconsistent.

**Do this instead:** `map.js` exports its own `initMap()` and `updateChoropleth()` functions called directly from `app.js` outside of `render()`. The map is self-contained.

### Anti-Pattern 3: Using a Quantile Color Scale from a Library

**What people do:** Import D3 or a color scale library to compute choropleth colors.

**Why it's wrong:** This project has zero npm dependencies. D3 is 70 KB min+gzip for the full bundle. Color quantile computation for 21 regions is 5 lines of vanilla JS: sort values, split into N buckets, map each region to its bucket index, index into a color array.

**Do this instead:** Compute quantile breaks manually. 21 caisses with 5 color buckets is simple enough that a linear scale or manual quintile is correct and readable.

### Anti-Pattern 4: Storing the SVG Separately and Fetching It

**What people do:** Keep the SVG in a `public/` or `assets/` folder and reference it with `<object data="map.svg">` or `<img src="map.svg">`.

**Why it's wrong:** `<object>` and `<img>` render SVG in a separate document context. `map.js` cannot access the paths inside them via `document.getElementById()`. The SVG must be in the same DOM tree as the rest of the page.

**Do this instead:** Inline. One `<svg>` element inside `<div id="view-map">`.

## Build Order

Dependencies constrain this sequence:

1. **`parse_regional.py` (pipeline first):** Before any frontend work, the regional JSON must exist. Write the parser, run it against the rapport annuel PDF, validate `regional-data.json` is correct. Gate: JSON contains 21 caisses with AT and Trajet counts for each year. This unblocks all frontend work.

2. **`data.js` + `state.js` extension:** Add `loadDataset('regional')` and `getRegionalData()`, extend state with `map` key. Gate: `regional-data.json` loads successfully and is accessible in browser console.

3. **Inline SVG sourcing and path ID mapping:** Obtain or create the France SVG (one path per caisse), assign IDs matching the caisse codes in `regional-data.json`. Embed in `index.html` inside `<div id="view-map">`. Gate: all 21+ paths are queryable via `document.getElementById('caisse-XX')`.

4. **`map.js` skeleton + `map.css`:** Implement `initMap()` with event attachment and `updateChoropleth()` with color fill. Gate: opening the page in a browser shows a colored map with correct data.

5. **Tooltip implementation:** Add floating `<div id="map-tooltip">` to HTML, wire `mousemove` and `mouseleave` handlers in `map.js`. Gate: hovering a region shows the region name and AT/Trajet counts.

6. **Metric toggle and year selector:** Add UI controls in `#view-map` (AT vs Trajet toggle, optional year slider). Wire to `state.map.metric` and `state.map.year`, call `updateChoropleth()` on change. Gate: switching metric updates all region colors.

7. **`nav.js` + `app.js` + `index.html` navigation wiring:** Add the map nav-item button, extend `switchView()`, extend `loadFromHash()`, call `initMap()` in `DOMContentLoaded`. Gate: clicking the map nav button switches to map view; `#map` URL hash restores the view on reload.

8. **`refresh_data.py` integration (optional):** Add `--rapport-pdf` argument to allow one-command pipeline refresh. Gate: `python refresh_data.py --rapport-pdf /path/to/pdf` regenerates `regional-data.json`.

## Sources

- Existing source files inspected: `js/app.js`, `js/state.js`, `js/nav.js`, `js/data.js`, `js/insights.js`, `data/pipeline/parse_pdf.py`, `data/pipeline/refresh_data.py`, `index.html`, `styles/base.css`
- pdfplumber table extraction (for multi-line row merging): https://github.com/jsvine/pdfplumber#extracting-tables
- Inline SVG for interactive choropleth (no library): standard DOM pattern, no external reference needed
- PROJECT.md milestone definition: `.planning/PROJECT.md`

---
*Architecture research for: Sinistralite France v1.1 — regional map integration*
*Researched: 2026-02-28*
