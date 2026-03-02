# Phase 8: Choroplèthe et interactions - Research

**Researched:** 2026-03-02
**Domain:** Choropleth coloring, SVG DOM manipulation, tooltip positioning, year selector, ranking panel
**Confidence:** HIGH

## Summary

Phase 8 operates entirely in vanilla JS + CSS on an inline SVG already in the DOM. No new libraries are required. The color scale is a linear interpolation between two hex colors applied via `element.style.fill`. The regional data (`regional-data.json`) is already parsed and available; 16 metropolitan caisses have AT values ranging from 11 429 to 81 519 (ratio 7.1x) and Trajet values in a similar spread. DOM-TOM caisses (5 entries: cgss-guadeloupe, cgss-guyane, cgss-martinique, cgss-reunion, css-mayotte) are in the JSON but have no `[data-caisse]` SVG group in the metropolitan map; they must be silently skipped during coloring.

The `colorierCarte(viewType, year, data)` stub already exists in `js/map.js`. Phase 8 fills that body plus adds: (1) a `fetch('data/regional-data.json')` call on view-init to load regional data, (2) color scale logic, (3) a `<div id="map-tooltip">` tooltip moved with `mousemove` using `position: fixed`, (4) a small year `<select>` per map section, and (5) a ranking `<ol>` panel adjacent to each SVG.

**Primary recommendation:** Inline `interpolateColor()` (already decided, ~10 lines), `position: fixed` tooltips, linear scale over metropolitan caisses only (excludes DOM-TOM outliers), default year 2023.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS | ES2020 | DOM fill, event listeners, fetch | Zero-dependency constraint decided in Phase 7 research |
| CSS custom properties | N/A | Theme-aware stroke/fill | Already used by .map-caisse |
| regional-data.json | N/A | AT/Trajet counts per caisse per year | Produced by Phase 6, already on disk |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ColorBrewer sequential | N/A (inline) | 5-step palette for legend | Already decided; implemented as array of 5 hex stops |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline interpolateColor | Chroma.js | Chroma = 58 KB for 10 lines we already decided to hand-write |
| position: fixed tooltip | position: absolute | absolute clips at SVG parent overflow; fixed avoids that |
| Linear scale | Logarithmic | Log useful when ratio > 100x; metro ratio is 7.1x, linear is fine |

**Installation:** None. No new packages.

## Architecture Patterns

### Recommended Project Structure
```
js/map.js              # Fill colorierCarte() body, add tooltip + year logic
styles/map.css         # Add .map-tooltip, .map-legend, .map-ranking, .year-selector rules
index.html             # Add tooltip div, year <select>, ranking <ol> per map section (AT + Trajet)
data/regional-data.json  # Already exists, consumed via fetch()
```

### Pattern 1: Regional data loading
**What:** Single `fetch()` on DOMContentLoaded, store result in module-scoped variable, call `colorierCarte()` after data arrives.
**When to use:** Data file is static, no MCP call needed.
**Example:**
```js
let regionalData = null;

async function loadRegionalData() {
  const res = await fetch('data/regional-data.json');
  regionalData = await res.json();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadRegionalData();
  colorierCarte('at', '2023', regionalData);
  colorierCarte('trajet', '2023', regionalData);
});
```

### Pattern 2: Color interpolation (inline)
**What:** Linear lerp between two hex colors mapped to [min, max] of metropolitan caisses.
**When to use:** Single sequential metric, no diverging scale needed.
**Example:**
```js
// Source: project decision (STATE.md - interpolateColor inline 10 lignes)
function interpolateColor(minColor, maxColor, t) {
  // t in [0,1]
  const parse = hex => [
    parseInt(hex.slice(1,3), 16),
    parseInt(hex.slice(3,5), 16),
    parseInt(hex.slice(5,7), 16)
  ];
  const [r1,g1,b1] = parse(minColor);
  const [r2,g2,b2] = parse(maxColor);
  const r = Math.round(r1 + (r2-r1)*t);
  const g = Math.round(g1 + (g2-g1)*t);
  const b = Math.round(b1 + (b2-b1)*t);
  return `rgb(${r},${g},${b})`;
}
```

### Pattern 3: Choropleth fill application
**What:** Query all `[data-caisse]` groups in the correct SVG (`#france-map-at` or `#france-map-trajet`), apply `element.style.fill`.
**Example:**
```js
export function colorierCarte(viewType, year, data) {
  const svgId = viewType === 'at' ? 'france-map-at' : 'france-map-trajet';
  const svg = document.getElementById(svgId);
  if (!svg || !data) return;

  const METRO_IDS = [
    'alsace-moselle','aquitaine','auvergne','bourgogne-franche-comte',
    'bretagne','centre-ouest','centre-val-de-loire','cramif',
    'languedoc-roussillon','midi-pyrenees','nord-est','nord-picardie',
    'normandie','pays-de-la-loire','rhone-alpes','sud-est'
  ];

  const metric = viewType === 'at' ? 'at' : 'trajet';
  const metroVals = data.caisses
    .filter(c => METRO_IDS.includes(c.id))
    .map(c => ({ id: c.id, name: c.name, val: (c[metric][year] || 0) }));

  const vals = metroVals.map(c => c.val);
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  // ColorBrewer sequential (light -> dark blue)
  const MIN_COLOR = '#deebf7';
  const MAX_COLOR = '#08519c';

  metroVals.forEach(({ id, val }) => {
    const el = svg.querySelector(`[data-caisse="${id}"]`);
    if (!el) return; // DOM-TOM absent from metro SVG — skip silently
    const t = max > min ? (val - min) / (max - min) : 0;
    el.style.fill = interpolateColor(MIN_COLOR, MAX_COLOR, t);
  });
}
```

### Pattern 4: Tooltip with position: fixed
**What:** Single shared tooltip `<div>` per map, moved on `mousemove`, hidden on `mouseleave`. Uses `position: fixed` so viewport edges are the constraint.
**When to use:** SVG is inside `overflow: hidden` container (which `.map-wrap` is).
**Example:**
```js
// In index.html: <div class="map-tooltip" id="at-mapTooltip" aria-hidden="true"></div>
svgEl.addEventListener('mousemove', (e) => {
  const g = e.target.closest('[data-caisse]');
  if (!g) { tooltip.style.display = 'none'; return; }
  const caisse = g.dataset.caisse;
  // populate and position
  tooltip.style.display = 'block';
  // clamp to viewport
  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;
  let left = e.clientX + 12;
  let top = e.clientY + 12;
  if (left + tw > window.innerWidth - 8) left = e.clientX - tw - 12;
  if (top + th > window.innerHeight - 8) top = e.clientY - th - 12;
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
});
svgEl.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
```

### Pattern 5: Year selector
**What:** Small `<select>` with options 2020-2024, default 2023, triggers `colorierCarte()` on change.
**When to use:** MAP-05 and MAP-08 require year selection with 2023 as default.
**Example:**
```html
<!-- In index.html, inside .map-section, before .map-wrap -->
<div class="map-controls">
  <label class="year-label" for="at-yearSelect">Année</label>
  <select class="year-select" id="at-yearSelect">
    <option value="2020">2020</option>
    <option value="2021">2021</option>
    <option value="2022">2022</option>
    <option value="2023" selected>2023</option>
    <option value="2024">2024</option>
  </select>
</div>
```

### Pattern 6: Ranking panel
**What:** `<ol>` adjacent to the SVG, sorted descending by metric. Items list caisse name + value. Clickable header to toggle sort direction (MAP-09).
**Layout:** CSS flex row — `[SVG 65%] [ranking 35%]` on desktop, stacked on mobile.
**Example:**
```js
function renderRanking(svgId, rankingEl, metroVals, sorted = 'desc') {
  const ordered = [...metroVals].sort((a, b) => sorted === 'desc' ? b.val - a.val : a.val - b.val);
  rankingEl.innerHTML = ordered.map((c, i) =>
    `<li class="ranking-item"><span class="ranking-pos">${i+1}</span><span class="ranking-name">${c.name}</span><span class="ranking-val">${c.val.toLocaleString('fr-FR')}</span></li>`
  ).join('');
}
```

### Pattern 7: MAP-07 view toggle integration
**What:** `colorierCarte()` is already called per SVG (AT SVG in AT view, Trajet SVG in Trajet view). No separate AT/Trajet toggle inside the map is needed. The nav switching already shows the correct map section.
**Confirmation:** Two separate `<div class="map-section">` exist: `#at-mapSection` and `#trajet-mapSection`.

### Anti-Patterns to Avoid
- **Using `pointer-events: none` on SVG `<g>` elements:** This breaks hover. Each `<g [data-caisse]>` must receive pointer events.
- **Positioning tooltip as `position: absolute`:** Clips against `.map-wrap { overflow: hidden }`.
- **Including DOM-TOM caisses in the color scale:** Their values (7 to 6150) would compress the metro color range. Filter to METRO_IDS only.
- **Applying fill to `<path>` directly:** `map.css` sets `.map-caisse path { fill: inherit }`, so fill on the `<g>` is correct.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color scale | Custom multi-stop system | Single `interpolateColor(min, max, t)` | 7.1x ratio with linear scale is sufficient |
| Tooltip library | Popper.js / Floating UI | CSS `position: fixed` + clientX/Y clamping | Zero dependency, 15 lines |
| Charting library | D3 | Inline `<ol>` with JS sort | Ranking is a list, not a chart |

**Key insight:** The SVG is already in the DOM and all caisses have `data-caisse` attributes. No D3 data-join, no enter/update/exit. Direct DOM manipulation is correct here.

## Common Pitfalls

### Pitfall 1: DOM-TOM in color scale skewing range
**What goes wrong:** cgss-guyane (AT=321) and css-mayotte (AT=7) compress the metropolitan color scale — Ile-de-France looks barely darker than Alsace.
**Why it happens:** JSON has 21 caisses; SVG has 16 metro groups.
**How to avoid:** Compute min/max over METRO_IDS only. DOM-TOM will simply find no SVG element and skip.
**Warning signs:** Entire metropolitan map renders as near-max color.

### Pitfall 2: Tooltip clipped by map-wrap overflow: hidden
**What goes wrong:** Tooltip appears cut off at the SVG container edge.
**Why it happens:** `.map-wrap` has `overflow: hidden` (set in Phase 7 to prevent horizontal scroll at 375px).
**How to avoid:** `position: fixed` on `.map-tooltip`, positioned with `clientX/Y` from the mouse event.
**Warning signs:** Tooltip visible only inside SVG bounding box.

### Pitfall 3: fill inheritance break on re-render
**What goes wrong:** After year change, some caisses retain old color.
**Why it happens:** `element.style.fill` is cached; if a caisse has no data for a given year, it gets `undefined` as fill.
**How to avoid:** Always set a fallback: `el.style.fill = interpolateColor(...) || defaultColor`.

### Pitfall 4: Year selector out of sync after view switch
**What goes wrong:** User sets year to 2021 in AT view, switches to Trajet — Trajet still shows 2023.
**Why it happens:** Each map section has its own `<select>` with no shared state.
**How to avoid:** Keep year state per viewType in a module-scoped object `{ at: '2023', trajet: '2023' }`, or sync both selects on change.

### Pitfall 5: Legend not updating on year change
**What goes wrong:** Legend shows 2023 min/max but map shows 2021 data.
**How to avoid:** `renderLegend()` and `colorierCarte()` must be called together from the same update function.

## Code Examples

### Legend component
```js
// Source: project pattern — no external lib
function renderLegende(legendEl, minVal, maxVal, minColor, maxColor) {
  const steps = 5;
  const swatches = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    const val = Math.round(minVal + (maxVal - minVal) * t);
    const color = interpolateColor(minColor, maxColor, t);
    return `<span class="legend-swatch" style="background:${color}" title="${val.toLocaleString('fr-FR')}"></span>`;
  }).join('');
  legendEl.innerHTML = `
    <span class="legend-min">${minVal.toLocaleString('fr-FR')}</span>
    <div class="legend-swatches">${swatches}</div>
    <span class="legend-max">${maxVal.toLocaleString('fr-FR')}</span>
  `;
}
```

### Full update cycle (year change handler)
```js
function updateMap(viewType, year) {
  colorierCarte(viewType, year, regionalData);
  renderRanking(...);
  renderLegende(...);
}

document.getElementById('at-yearSelect').addEventListener('change', (e) => {
  updateMap('at', e.target.value);
});
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| D3 choropleth with data-join | Direct `element.style.fill` on existing SVG `[data-caisse]` groups | No D3 load (90 KB saved) |
| Floating tooltip library | CSS `position: fixed` + 15-line clamping | No dependency |

## Open Questions

1. **Tooltip on touch/mobile (MAP-10, Phase 9)**
   - What we know: Phase 9 handles mobile tap behavior (fixed info panel)
   - What's unclear: Whether `pointerover` fires on iOS on first tap or second
   - Recommendation: In Phase 8, suppress tooltip on touch devices using `navigator.maxTouchPoints > 0` check; Phase 9 replaces with tap panel

2. **Color palette: two-color lerp vs. 5-stop ColorBrewer**
   - What we know: Decision log says "ColorBrewer séquentielle"; interpolateColor takes two endpoints
   - What's unclear: Whether to lerp between 2 stops or implement a 5-stop piecewise function
   - Recommendation: 2-stop lerp is sufficient for 16 values; 5-stop only needed if banding is visible

3. **Legend: 5 swatches vs. continuous gradient**
   - What we know: Success criterion says "paliers de couleur" (discrete steps)
   - Recommendation: 5 discrete swatches matching ColorBrewer 5-class sequential

## Sources

### Primary (HIGH confidence)
- Codebase: `js/map.js`, `index.html`, `styles/map.css` — confirmed SVG structure, data-caisse attributes, existing stub signature
- Codebase: `data/regional-data.json` — confirmed 21 caisses, 16 metro, AT 2023 range 11 429-81 519, Trajet range verified
- Codebase: `STATE.md` — confirmed locked decisions: interpolateColor inline, position: fixed tooltips, ColorBrewer sequential, year default 2023, two separate SVGs

### Secondary (MEDIUM confidence)
- MDN Web Docs: SVG fill inheritance — `fill: inherit` on child paths passes parent `g` fill correctly
- MDN Web Docs: `position: fixed` — positioned relative to viewport, unaffected by `overflow: hidden` on ancestors

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed from existing codebase and locked decisions
- Architecture: HIGH — SVG structure and data shape fully inspected
- Pitfalls: HIGH — identified from actual data distribution (DOM-TOM outliers confirmed) and CSS constraints (overflow: hidden confirmed in map.css)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (static data, stable vanilla JS)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAP-02 | Choropleth coloring using sequential color scale based on selected metric | Pattern 3 (colorierCarte fill loop), Pattern 2 (interpolateColor), Pitfall 1 (DOM-TOM exclusion) |
| MAP-03 | Color legend showing scale range and units | Code example (renderLegende), 5-swatch discrete legend |
| MAP-05 | Default year is 2023 (matches sector data) | Pattern 5 (year select with `selected` on 2023 option), Pattern 1 (initial call with '2023') |
| MAP-06 | Desktop tooltip showing region name and stats on hover | Pattern 4 (position: fixed tooltip with clientX/Y clamping), Pitfall 2 |
| MAP-07 | AT/Trajet toggle follows the current view (no separate toggle needed) | Pattern 7 — two SVGs, two map sections, nav switching handles it |
| MAP-08 | Discreet year selector (small, not prominent) to switch map year | Pattern 5 (small `<select>` in .map-controls), Pattern 6 update cycle |
| MAP-09 | Sortable region ranking sidebar alongside the map | Pattern 6 (renderRanking with sort direction toggle), CSS flex layout |
</phase_requirements>
