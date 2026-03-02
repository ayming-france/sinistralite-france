# Phase 7: Structure SVG - Research

**Researched:** 2026-03-02
**Domain:** SVG inline map, caisse-to-department mapping, responsive SVG, CSS isolation
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAP-01 | Inline SVG map of France with identifiable paths per caisse régionale | SVG source identified (regisenguehard/carte-france-svg, CC BY 4.0), department-level paths exist, caisse grouping via `<g data-caisse>` wrapping department paths |
| MAP-04 | Map appears as a section within AT and Trajet views (not a 4th nav tab) | Existing `.view` + `.results-section` HTML pattern confirmed; map goes inside each view as a sibling div, not a nav button |
| MAP-11 | SVG scales responsively without horizontal scroll on 375px (iPhone SE) | `width:100%` + `viewBox` on the SVG element (no fixed width/height attributes) + `.map-section { overflow:hidden }` wrapper; confirmed pattern |
</phase_requirements>

---

## Summary

Phase 7 embeds an inline SVG map of metropolitan France into the existing dashboard. The map must be split by caisse régionale boundaries, not the 13 modern administrative regions. The SVG source (regisenguehard/carte-france-svg, CC BY 4.0) uses department-level `<path>` elements grouped inside `<g>` elements with region classes. Since Carsat caisses are defined by fixed lists of departments (not administrative regions), the correct approach is to wrap department paths into new `<g data-caisse="caisse-id">` groups corresponding to the 16 metropolitan caisses + CRAMIF.

The existing CSS has zero `fill` or `stroke` rules targeting raw SVG paths. The global `* { margin: 0; padding: 0; box-sizing: border-box; }` reset has no color effects on SVG. The only SVG size rules are scoped to `.nav-icon-wrap svg`, `.comp-toggle button svg`, and `.action-btn svg`, none of which will match the map SVG. This means Phase 7 can safely embed the SVG with dedicated CSS rules without fear of conflict.

The map section is inserted as a static block inside `#view-at` and `#view-trajet` (not `#view-mp` since MP regional data is not available). It appears below the empty-state/results content, always visible regardless of whether a sector is selected. No JS is needed in Phase 7 beyond verifying `data-caisse` attribute presence (Phase 8 handles coloring).

**Primary recommendation:** Hand-craft a department-grouped SVG where each `<g data-caisse="caisse-id">` wraps the relevant `<path>` elements from regisenguehard/carte-france-svg, set `viewBox="105 18 568 567"` (existing coordinate space), add `width="100%" height="auto"`, and wrap in `.map-section` with `overflow: hidden` and a new `map.css` file. DOM-TOM caisses (CGSS + CSS Mayotte) are excluded from the SVG per the "Out of Scope" rules (DOM-TOM insets are a v2 feature).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Inline SVG (hand-crafted) | N/A | France map with caisse groupings | Zero dependencies, no CDN, CSS-styleable, accessible via aria-label |
| regisenguehard/carte-france-svg | CC BY 4.0 | Source of department path data | Open source, department-level granularity, correct viewBox geometry |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vanilla JS (existing app.js pattern) | ES Modules | Verify data-caisse presence at init time | Phase 8 coloring; in Phase 7 only verification |
| New `map.css` file | N/A | SVG layout and default styles | Follows existing per-feature CSS file convention |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline SVG with grouped departments | D3.js choropleth | D3 adds 80 KB+ bundle, overkill for a static map shape |
| Inline SVG with grouped departments | Leaflet with GeoJSON | Leaflet adds 150 KB, designed for tile maps, zoom/pan already marked out of scope |
| Inline SVG with grouped departments | amCharts SVG maps | Proprietary, adds JS dependency, hard to customize CSS |
| Carsat boundaries as `<g>` wrappers | 13 modern admin regions | Carsat boundaries do NOT match modern regions (e.g., Auvergne + Rhône-Alpes are two separate caisses within one admin region) |

**Installation:** No installation needed. Inline SVG is copy-pasted and modified directly into the HTML or a separate `.svg` file loaded as a `<object>` tag. Given the project uses vanilla JS with no build step, inline SVG in HTML is the standard approach for direct CSS and JS access.

---

## Architecture Patterns

### Recommended Project Structure
```
index.html                  # Map SVG block added inside #view-at and #view-trajet
styles/
  map.css                   # New file: .map-section, .map-svg, path defaults
js/
  map.js                    # New file: Phase 8 coloring (empty stub in Phase 7)
```

### Pattern 1: Caisse-grouped SVG structure
**What:** Department `<path>` elements grouped inside `<g data-caisse="caisse-id">` elements
**When to use:** Every path in the SVG must belong to exactly one caisse group
**Example:**
```xml
<!-- Source: adapted from regisenguehard/carte-france-svg (CC BY 4.0) -->
<svg
  id="france-map"
  class="map-svg"
  viewBox="105 18 568 567"
  width="100%"
  height="auto"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="Carte des caisses régionales AT/Trajet"
>
  <title>Carte sinistralité par caisse régionale</title>

  <g data-caisse="alsace-moselle" class="map-caisse">
    <!-- departments 57, 67, 68 -->
    <path class="map-dept" data-dept="57" d="m..." />
    <path class="map-dept" data-dept="67" d="m..." />
    <path class="map-dept" data-dept="68" d="m..." />
  </g>

  <g data-caisse="cramif" class="map-caisse">
    <!-- departments 75, 77, 78, 91, 92, 93, 94, 95 -->
    <path class="map-dept" data-dept="75" d="m..." />
    <!-- ... -->
  </g>
  <!-- 15 more caisse groups... -->
</svg>
```

### Pattern 2: Map section as always-visible block in AT and Trajet views
**What:** `.map-section` div placed after `.empty-state` and `.results-section` blocks, always visible
**When to use:** Map must appear regardless of sector selection state (no sector selected = map shows neutral/grey)
**Example:**
```html
<!-- Inside #view-at, after .results-section -->
<div class="map-section" id="at-mapSection">
  <h3 class="map-title">Sinistralité par caisse régionale</h3>
  <!-- inline SVG here, same markup in both at and trajet views -->
  <svg id="france-map-at" class="map-svg" viewBox="105 18 568 567"
       width="100%" height="auto" aria-label="Carte des caisses régionales AT">
    <!-- caisse groups -->
  </svg>
</div>

<!-- Inside #view-trajet, same structure with id="france-map-trajet" -->
```

### Pattern 3: CSS for default map path appearance
**What:** Explicit default fill/stroke on `.map-caisse` paths to prevent inheritance issues
**When to use:** Required in Phase 7 to guarantee requirement MAP-01 (no existing CSS colors paths)
**Example:**
```css
/* map.css */
.map-section {
  margin-top: 32px;
  overflow: hidden; /* critical: prevents horizontal scroll */
}

.map-title {
  font-family: var(--sans);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.map-svg {
  display: block;
  width: 100%;
  height: auto;
  max-width: 600px;
}

.map-caisse {
  fill: var(--border-light);  /* neutral grey default */
  stroke: var(--bg-elevated);
  stroke-width: 1;
  cursor: default;
}
```

### Department-to-caisse mapping table (authoritative)
This mapping is verified from official Carsat sources. 16 metropolitan caisses + CRAMIF = 17 zones total. DOM-TOM excluded from SVG per project scope.

| Caisse ID (JSON) | Departments |
|---|---|
| `alsace-moselle` | 57, 67, 68 |
| `aquitaine` | 24, 33, 40, 47, 64 |
| `auvergne` | 03, 15, 43, 63 |
| `bourgogne-franche-comte` | 21, 25, 39, 58, 70, 71, 89, 90 |
| `bretagne` | 22, 29, 35, 56 |
| `centre-val-de-loire` | 18, 28, 36, 37, 41, 45 |
| `centre-ouest` | 16, 17, 19, 23, 79, 86, 87 |
| `cramif` | 75, 77, 78, 91, 92, 93, 94, 95 |
| `languedoc-roussillon` | 11, 30, 34, 48, 66 |
| `midi-pyrenees` | 09, 12, 31, 32, 46, 65, 81, 82 |
| `nord-est` | 08, 10, 51, 52, 54, 55, 88 |
| `nord-picardie` | 02, 59, 60, 62, 80 |
| `normandie` | 14, 27, 50, 61, 76 |
| `pays-de-la-loire` | 44, 49, 53, 72, 85 |
| `rhone-alpes` | 01, 07, 26, 38, 42, 69, 73, 74 |
| `sud-est` | 04, 05, 06, 13, 2A, 2B, 83, 84 |

**Note on Corse (2A, 2B):** Included in `sud-est`. The SVG path data from regisenguehard uses separate paths for 2A and 2B within their group. Corse appears in the source SVG.

**Missing from SVG (DOM-TOM, out of scope for Phase 7):**
- `cgss-guadeloupe`, `cgss-guyane`, `cgss-martinique`, `cgss-reunion`, `css-mayotte`

### Anti-Patterns to Avoid
- **Using 13 modern admin region `<g>` groups directly:** Carsat boundaries do not match administrative regions (Auvergne-Rhône-Alpes admin region = 2 separate caisses).
- **Setting fixed `width` and `height` attributes in px on `<svg>`:** Prevents responsive scaling; breaks MAP-11 at 375px.
- **Placing the map inside `.results-section`:** The results section is hidden when no sector is selected; the map should always be visible.
- **Adding the map as a 4th nav button:** Explicitly out of scope per MAP-04 and REQUIREMENTS.md.
- **Using a separate SVG file loaded via `<img>` or `<object>`:** Blocks JS access to `data-caisse` paths and CSS fill styling from the outer document.
- **Relying on inherited CSS fills:** SVG path `fill` can inherit from `color` in some browsers. Always set explicit `fill` on `.map-caisse`.
- **Duplicating the full SVG twice in HTML:** For AT and Trajet views, the SVG markup will appear twice (once per view). This is acceptable at ~50 KB per copy but worth noting. An alternative is a single SVG accessed by both views via JS (Phase 8 pattern) but in Phase 7, static duplication is simplest.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| France department path geometry | Custom SVG paths drawn by hand | regisenguehard/carte-france-svg path data | 96 departments, accurate coordinates, already tested across browsers |
| Department-to-caisse lookup | Derive from JSON keys or PDF | Static hardcoded mapping table in code | Carsat boundaries predate JSON data; the mapping is institutional knowledge, not derivable |
| Responsive SVG scaling | JS ResizeObserver with manual dimension calculation | CSS `width:100%` + `height:auto` + `viewBox` | SVG scales natively when viewBox is set and no fixed px dimensions are present |

**Key insight:** The SVG path data is geography, not code. It takes months to accurately trace French department borders. Reuse the existing CC BY 4.0 source rather than redrawing.

---

## Common Pitfalls

### Pitfall 1: SVG inherits `color` as `fill`
**What goes wrong:** The `* { color: var(--text) }` cascade causes SVG paths to appear black/dark instead of grey on first render.
**Why it happens:** CSS `currentColor` keyword: SVG `fill` defaults to `currentColor` in some browser/SVG contexts when no explicit fill is set.
**How to avoid:** Always set `fill` explicitly on `.map-caisse` in `map.css`. Do not rely on SVG attribute `fill="none"` without a CSS override.
**Warning signs:** Paths appear black on dark theme, or disappear on light theme.

### Pitfall 2: Horizontal scroll at 375px
**What goes wrong:** Map creates horizontal scrollbar on iPhone SE, violating MAP-11.
**Why it happens:** The SVG has a non-square viewBox (568x567), and if `overflow: visible` is set, or the container has no `overflow: hidden`, the SVG can bleed right.
**How to avoid:** The `.map-section` wrapper must have `overflow: hidden`. The `<svg>` must have `width="100%"` and `height="auto"` (not pixel values). Never set `min-width` on the SVG or its container.
**Warning signs:** DevTools at 375px shows a horizontal scrollbar; body `overflow-x: hidden` already set in base.css `@media (max-width: 768px)` but the container is what matters.

### Pitfall 3: Nav injection of a 4th tab
**What goes wrong:** Adding the map section generates a new nav-item, breaking the 3-tab layout.
**Why it happens:** If the map HTML is added using a nav button rather than as a section inside an existing view, or if `switchView()` in `nav.js` is modified to handle a `map` viewId.
**How to avoid:** The map is a `<div class="map-section">` inside `#view-at` and `#view-trajet`. It is NOT referenced in `nav.js`, `state.js`, or any nav button. No `data-view="map"` attribute anywhere.
**Warning signs:** `document.querySelectorAll('.nav-item[data-view]')` returns 4 items instead of 4 (including the disabled overview button); or the nav-rail shows a new icon.

### Pitfall 4: Existing SVG width rules collide
**What goes wrong:** `.nav-icon-wrap svg { width: 15px; height: 15px; }` or `.comp-toggle button svg { width: 14px; height: 14px; }` applies to the map SVG.
**Why it happens:** If the map SVG is accidentally placed inside a `.nav-icon-wrap` or a `.comp-toggle button`.
**How to avoid:** Confirm the SVG's parent chain contains neither `.nav-icon-wrap` nor `.comp-toggle button`. The map SVG sits inside `.map-section > .map-svg`.
**Warning signs:** Map renders as a 14px or 15px tiny square.

### Pitfall 5: DOM-TOM caisse IDs in regional-data.json with no SVG counterpart
**What goes wrong:** Phase 8 coloring code iterates all caisses from JSON and fails to find SVG paths for `cgss-guadeloupe`, `cgss-guyane`, `cgss-martinique`, `cgss-reunion`, `css-mayotte`.
**Why it happens:** DOM-TOM are in the JSON but out of scope for the metropolitan map SVG.
**How to avoid:** In Phase 7, add a comment in the SVG: `<!-- DOM-TOM (cgss-guadeloupe, cgss-guyane, cgss-martinique, cgss-reunion, css-mayotte) non representés sur cette carte metropolitaine -->`. In Phase 8, filter them out before iterating.
**Warning signs:** Console errors about missing `[data-caisse="cgss-guadeloupe"]` elements.

---

## Code Examples

### Responsive SVG wrapper in HTML
```html
<!-- Source: MDN SVG docs + regisenguehard pattern -->
<div class="map-section" id="at-mapSection">
  <h3 class="map-title">Sinistralité par caisse régionale</h3>
  <div class="map-wrap">
    <svg
      id="france-map-at"
      class="map-svg"
      viewBox="105 18 568 567"
      width="100%"
      height="auto"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Carte de France des caisses régionales AT"
    >
      <title>Carte sinistralité AT par caisse régionale</title>
      <g data-caisse="alsace-moselle" class="map-caisse">
        <!-- paths for 57, 67, 68 -->
      </g>
      <!-- ... 16 more caisse groups ... -->
      <!-- DOM-TOM (cgss-*) non representes sur cette carte metropolitaine -->
    </svg>
  </div>
</div>
```

### Default map CSS (map.css)
```css
/* map.css */

.map-section {
  margin-top: 32px;
  margin-bottom: 24px;
}

.map-title {
  font-family: var(--sans);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
  margin-bottom: 16px;
  text-transform: uppercase;
}

.map-wrap {
  overflow: hidden; /* prevents horizontal scroll at 375px */
  border-radius: 8px;
}

.map-svg {
  display: block;
  width: 100%;
  height: auto;
}

.map-caisse {
  fill: var(--border-light);
  stroke: var(--bg-elevated);
  stroke-width: 1.2;
  stroke-linejoin: round;
}

/* Prevent any inherited color from becoming fill */
.map-caisse path {
  fill: inherit;
}

@media (max-width: 768px) {
  .map-section {
    margin-top: 24px;
  }
}
```

### Phase 7 smoke test (manual, in browser DevTools)
```javascript
// Verify each caisse-id in regional-data.json has an SVG counterpart
// Run in DevTools console after page load

const caisseIds = [
  'alsace-moselle','aquitaine','auvergne','bourgogne-franche-comte',
  'bretagne','centre-ouest','centre-val-de-loire','cramif',
  'languedoc-roussillon','midi-pyrenees','nord-est','nord-picardie',
  'normandie','pays-de-la-loire','rhone-alpes','sud-est'
];

caisseIds.forEach(id => {
  const el = document.querySelector(`[data-caisse="${id}"]`);
  if (!el) console.error('MISSING data-caisse:', id);
  else console.log('OK:', id, el.querySelectorAll('path').length, 'paths');
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| D3.js for SVG maps | Inline SVG + vanilla JS | ~2020 | 80 KB saved; no D3 dependency needed for static choropleth |
| GeoJSON + Leaflet | Inline SVG paths | ~2018 for static maps | No tile server, works offline, fully CSS-styleable |
| 22 old administrative regions | Department-grouped paths by caisse | Phase 7 decision | Required because Carsat boundaries don't align with 13 modern regions |

**Deprecated/outdated:**
- `<svg>` with fixed `width="600" height="567"`: Replaced by `width="100%"` + `height="auto"` + `viewBox` for responsive scaling.
- Using `fill` attribute directly on `<path>` elements in SVG: Replaced by CSS class-based fill for dark mode support.

---

## Open Questions

1. **Corse visibility at 375px**
   - What we know: Corse (2A, 2B) are in the far south-east of the viewBox; the viewBox is 568x567 units
   - What's unclear: Whether Corse is visually large enough to be identified at mobile size
   - Recommendation: Accept if readable; if too small, it's a visual issue only (not a requirement violation since MAP-11 only requires no horizontal scroll, not minimum caisse size)

2. **Exact SVG file size after restructuring**
   - What we know: Source SVG is ~45-50 KB; duplicated for AT and Trajet views = ~100 KB extra HTML
   - What's unclear: Whether gzip compression makes this irrelevant in production
   - Recommendation: Acceptable for a static GitHub Pages site; if large, extract to a shared `<template>` element and clone via JS in app.js init

3. **Single SVG vs. two copies**
   - What we know: AT and Trajet views are separate DOM subtrees; each needs its own map instance for Phase 8 coloring
   - What's unclear: Whether Phase 8 will animate or independently color the two maps
   - Recommendation: For Phase 7, use two separate SVGs (one per view). Phase 8 can share a single coloring function called twice with different data.

---

## Sources

### Primary (HIGH confidence)
- [regisenguehard/carte-france-svg](https://github.com/regisenguehard/carte-france-svg) - SVG structure, viewBox, path IDs, CC BY 4.0 license confirmed
- Project codebase (`/Users/encarv/.claude/datagouv/`) - Existing CSS audit (no conflicting fill/stroke rules), HTML structure, view pattern, JS nav logic
- [chsctaudiovisuel.org/liste-des-carsat-et-direccte](https://chsctaudiovisuel.org/liste-des-carsat-et-direccte/) - Authoritative Carsat-to-department mapping (all 16 metropolitan caisses + CRAMIF)

### Secondary (MEDIUM confidence)
- [12daysofweb.dev/2023/responsive-svgs](https://12daysofweb.dev/2023/responsive-svgs) - `viewBox` + `width:100%/height:auto` pattern for responsive SVG (verified against MDN)
- [INRS carteRegions](https://www.inrs.fr/publications/bdd/mp/carteRegions.html) - Confirmed 13 admin regions vs. Carsat boundary mismatch

### Tertiary (LOW confidence)
- WebSearch results on SVG choropleth patterns - General patterns only, project-specific decisions derived from codebase audit

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Inline SVG + regisenguehard source confirmed from codebase audit and GitHub
- Architecture: HIGH - Existing `.view` DOM pattern confirmed from index.html reading; CSS conflict audit complete
- Pitfalls: HIGH - CSS audit verified no conflicting fill rules; responsive SVG pattern verified against official docs
- Department mapping: HIGH - Confirmed from official Carsat sources (chsctaudiovisuel.org)

**Research date:** 2026-03-02
**Valid until:** 2026-09-01 (stable domain; SVG and CSS patterns are not fast-moving)
