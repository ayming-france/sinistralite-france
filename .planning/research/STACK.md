# Stack Research

**Domain:** SVG choropleth map + PDF table extraction for vanilla JS dashboard
**Researched:** 2026-02-28
**Confidence:** HIGH (core SVG approach verified; pdfplumber settings verified on PyPI 0.11.9)

## Context

This is an additive milestone (v1.1) on an existing vanilla JS dashboard (7,091 LOC, Chart.js 4.4.7,
no build step, GitHub Pages). The existing stack is fixed. This research covers only what is needed
to add the regional map view: SVG rendering, color interpolation, tooltips, and PDF table extraction.

The caisses régionales in the rapport annuel correspond to a pre-2016 administrative geography:
15 Carsat + 4 CGSS (DOM-TOM: Martinique, Guadeloupe, Guyane, La Réunion) + 1 CSS (Mayotte) = 20
entities. The PROJECT.md refers to "21 caisses" (likely including CRAM Île-de-France, which handles
AT/Trajet for that region where no Carsat exists). The SVG must reflect this geography, which does
not map 1:1 to France's post-2016 13-region administrative map.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Inline SVG (handcrafted) | N/A | France map with caisse régionale boundaries | Zero dependency, inlined in HTML, coloring via JS setAttribute on `fill`, no CDN round-trip. Libraries (D3, Leaflet, amCharts) are all overkill for a static 21-region choropleth. |
| Vanilla JS (existing) | ES2020 | Choropleth coloring, tooltip positioning, event handling | Already the project standard. SVG DOM manipulation requires no library: `path.setAttribute('fill', color)` is the entire API. |
| pdfplumber | 0.11.9 | Python: extract AT/Trajet tables from rapport annuel PDF | Already used in parse_pdf.py for demographics. Latest version (Jan 2026). Handles line-based tables well. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None for color math | N/A | Linear RGB interpolation is 10 lines of JS | Use inline helper function `interpolateColor(t, hexLow, hexHigh)`. Chroma.js (58 KB) is not justified for a single two-color gradient. |
| None for tooltips | N/A | HTML div absolutely positioned on mousemove | Use a single `<div id="map-tooltip">` with `position: fixed`, `pointer-events: none`. No library needed. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pdfplumber 0.11.9 | Extract Tableau 9 (p.24) and Tableau 17 (p.37) from rapport annuel | `pip install pdfplumber==0.11.9`; already in pipeline venv |
| Inkscape (optional) | Inspect/edit SVG path structure | Only needed if the SVG source needs manual cleanup or path ID assignment |

---

## SVG Map Source

### Recommended: Handcraft from Wikimedia Commons base

**Source:** [France, administrative divisions - en (+overseas) - colored 2016.svg](https://commons.wikimedia.org/wiki/File:France,_administrative_divisions_-_en_(%2Boverseas)_-_colored_2016.svg)

**License:** Creative Commons Attribution-Share Alike 3.0 — free for commercial use with attribution.

**Why this source:**
- Includes DOM-TOM insets (Martinique, Guadeloupe, Guyane, La Réunion, Mayotte) already positioned as map insets
- Based on the 2016 administrative reform boundaries (the ones used in the rapport annuel)
- Available as editable SVG with named paths

**Required post-processing:**
1. Open in Inkscape or a text editor
2. Group department paths by caisse régionale (not by post-2016 region)
3. Assign `id` attributes matching the caisse keys in the JSON (e.g., `id="carsat-bretagne"`)
4. Simplify paths with Inkscape "Simplify" (Ctrl+L) to reduce file size
5. Inline the cleaned SVG into the dashboard HTML

**Alternative source:** [simplemaps.com France SVG](https://simplemaps.com/svg/country/fr) uses post-2016 13-region boundaries (FRARA, FRBFC, etc.) and does NOT include DOM-TOM. It maps to the wrong geography for this use case.

**Why not D3 GeoJSON rendering:** D3 is 60 KB+ and requires a projection + GeoJSON dataset. For a static 21-region map that never changes, an inline SVG is simpler, faster, and zero-dependency.

**Why not Leaflet:** Leaflet is a tile-map library. Using it for a static choropleth requires a GeoJSON plugin and the full Leaflet CSS/JS. 100+ KB for 21 colored regions is not justified.

---

## Color Interpolation

### Recommendation: Inline linear RGB interpolation

No library. Implement a helper in `js/map.js`:

```javascript
function interpolateColor(t, hexLow, hexHigh) {
  // t: 0.0 (low) to 1.0 (high)
  const parse = h => [
    parseInt(h.slice(1,3), 16),
    parseInt(h.slice(3,5), 16),
    parseInt(h.slice(5,7), 16)
  ];
  const [r1,g1,b1] = parse(hexLow);
  const [r2,g2,b2] = parse(hexHigh);
  const r = Math.round(r1 + (r2-r1)*t);
  const g = Math.round(g1 + (g2-g1)*t);
  const b = Math.round(b1 + (b2-b1)*t);
  return `rgb(${r},${g},${b})`;
}
```

**Color scale:** `#fee8d6` (light orange, low IF) to `#c0392b` (dark red, high IF). Matches the
dashboard's existing risk color vocabulary (red = danger). Works in both light and dark themes.

**Why not chroma.js:** 58 KB CDN dependency for a single two-color linear interpolation. The 10-line
function above is correct and sufficient. Chroma.js is justified only if you need perceptual color
spaces (Lab, Lch) for multi-hue scales, which this map does not require.

---

## Tooltip Pattern

### Recommendation: HTML div with `position: fixed`, no library

```javascript
// In map.js
const tooltip = document.getElementById('map-tooltip');

svgEl.addEventListener('mousemove', e => {
  const path = e.target.closest('[data-caisse]');
  if (!path) { tooltip.hidden = true; return; }
  tooltip.hidden = false;
  tooltip.style.left = (e.clientX + 14) + 'px';
  tooltip.style.top  = (e.clientY - 28) + 'px';
  tooltip.innerHTML = buildTooltipHTML(path.dataset.caisse);
});
svgEl.addEventListener('mouseleave', () => { tooltip.hidden = true; });
```

```html
<!-- In index.html -->
<div id="map-tooltip" hidden aria-hidden="true"
     style="position:fixed;pointer-events:none;z-index:100"></div>
```

**Why `position: fixed` over `position: absolute`:** SVG elements report coordinates in `clientX/Y`
(viewport space). Fixed positioning avoids scroll offset calculations. Tooltip never overflows the
SVG container.

**Why `pointer-events: none`:** Prevents the tooltip div from triggering a `mouseleave` on the SVG
path when the cursor moves near the tooltip boundary (flickering bug common in choropleth tooltips).

---

## PDF Table Extraction (pdfplumber)

### Context

The rapport annuel PDF contains Tableau 9 (AT by caisse régionale, ~p.24) and Tableau 17 (Trajet by
caisse régionale, ~p.37). Both tables have multi-line rows where the caisse name wraps across two
lines. pdfplumber version 0.11.9 (released January 5, 2026) is the current stable version.

### Recommended approach

```python
import pdfplumber

def extract_regional_table(page):
    """Extract a caisse régionale table from one page."""
    rows = page.extract_table({
        "vertical_strategy": "lines",
        "horizontal_strategy": "lines",
        "snap_tolerance": 3,
        "join_tolerance": 3,
        "intersection_tolerance": 3,
        "text_x_tolerance": 5,
        "text_y_tolerance": 3,
    })
    return rows
```

### Multi-line row handling

pdfplumber does not natively merge multi-line cells. When a caisse name wraps to a second line,
`extract_table()` returns two consecutive rows where the second row has `None` for numeric columns.
Post-process with a merge pass:

```python
def merge_multiline_rows(raw_rows):
    """Merge rows where numeric columns are None (continuation of previous row)."""
    merged = []
    for row in raw_rows:
        if not row:
            continue
        # A continuation row has None for all numeric columns (cols 1+)
        if all(cell is None for cell in row[1:]):
            if merged:
                merged[-1][0] = (merged[-1][0] or '') + ' ' + (row[0] or '')
            continue
        merged.append(list(row))
    return merged
```

### Alternative: `text` strategy

If the table lacks explicit lines (shaded rows without borders), switch to:

```python
"vertical_strategy": "text",
"horizontal_strategy": "text",
"min_words_vertical": 3,
"min_words_horizontal": 1,
```

The rapport annuel tables are well-structured with visible borders, so `"lines"` strategy is
expected to work without adjustment. Verify by inspecting `page.debug_tablefinder()` output first.

---

## Regional Data JSON Format

### Recommended structure

```json
{
  "meta": {
    "source": "Rapport annuel Assurance Maladie - Risques professionnels 2024",
    "generated": "2026-02-28",
    "years": [2020, 2021, 2022, 2023, 2024]
  },
  "caisses": [
    {
      "id": "carsat-bretagne",
      "name": "Bretagne",
      "type": "carsat",
      "departments": ["22", "29", "35", "56"],
      "at": { "2020": 12345, "2021": 11900, "2022": 12100, "2023": 11800, "2024": 11600 },
      "trajet": { "2020": 2100, "2021": 2050, "2022": 2000, "2023": 1950, "2024": 1900 }
    }
  ]
}
```

**Key decisions:**
- `id` slug matches SVG `data-caisse` attribute for direct lookup (no mapping table needed)
- `type` distinguishes Carsat (metropolitan), CGSS (DOM-TOM), and CSS (Mayotte) for map rendering
- Numeric columns are event counts (not IF), matching what Tableau 9 and 17 provide directly
- IF would require salarié headcount per caisse, which may not be in the same table; defer IF computation to a later pass if headcount is available

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Inline SVG (handcrafted) | D3.js + GeoJSON | Only if regions change dynamically or pan/zoom is required |
| Inline SVG (handcrafted) | Leaflet + GeoJSON | Only if tile-based maps with street context are needed |
| Inline SVG (handcrafted) | amCharts SVG maps | Only if budget for commercial license exists and 20+ maps are needed |
| Inline RGB interpolation | chroma.js | Only if multi-hue perceptual scale (Lab/Lch) is required |
| pdfplumber | PyMuPDF (fitz) | PyMuPDF is faster for image/text extraction but table detection is weaker; stay with pdfplumber since it is already in use |
| pdfplumber | camelot-py | Camelot is better for complex spanning headers but requires Ghostscript as a system dep; avoid for CI |
| Wikimedia Commons SVG | simplemaps.com SVG | simplemaps maps post-2016 regions only; wrong geography for caisse régionale coverage |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| D3.js | 60+ KB dependency, requires GeoJSON + projection for a static 21-polygon map; massive overkill | Inline SVG + `setAttribute('fill', color)` |
| Leaflet | Tile-map library; no meaningful feature overlap with a static choropleth | Inline SVG |
| chroma.js | 58 KB CDN for one linear interpolation; no perceptual benefit for a two-color scale | 10-line inline `interpolateColor()` function |
| simplemaps.com SVG | Maps post-2016 administrative regions (13 regions); caisse régionale boundaries differ from this geography | Wikimedia Commons SVG with manual caisse grouping |
| camelot-py | Requires system-level Ghostscript; fragile in CI environments | pdfplumber (already installed) |
| `@svg-maps/france.regions` npm package | Requires a build step (npm); maps regions not caisses | Inline SVG sourced from Wikimedia Commons |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| pdfplumber 0.11.9 | Python 3.10, 3.11, 3.12, 3.13 | Current as of January 5, 2026; no breaking changes from 0.11.x |
| pdfplumber 0.11.9 | pdfminer.six (auto-installed) | pdfplumber manages this dependency; do not pin pdfminer separately |
| Chart.js 4.4.7 | Existing choropleth view code | No conflict; map view is a separate HTML section, not a Chart.js canvas |

---

## Installation

No new browser-side dependencies. No CDN additions.

For the Python pipeline only:

```bash
# Upgrade pdfplumber to current stable (if not already 0.11.9)
pip install --upgrade pdfplumber==0.11.9
```

The SVG file is checked directly into the repository (under `data/` or inlined in `index.html`).
No package installation required for the SVG.

---

## Sources

- [pdfplumber PyPI (0.11.9)](https://pypi.org/project/pdfplumber/) — confirmed latest version January 5, 2026; table_settings parameters verified
- [pdfplumber GitHub jsvine/pdfplumber](https://github.com/jsvine/pdfplumber) — multi-line row behavior, merge pattern from community discussions #768, #84
- [Wikimedia Commons: France administrative divisions 2016 SVG (+overseas)](https://commons.wikimedia.org/wiki/File:France,_administrative_divisions_-_en_(%2Boverseas)_-_colored_2016.svg) — CC BY-SA 3.0 DE, includes DOM-TOM insets
- [simplemaps.com France SVG](https://simplemaps.com/svg/country/fr) — verified: post-2016 13-region boundaries with ISO codes (FRARA, etc.); does not match caisse régionale geography
- [pdfplumber discussions #1071](https://github.com/jsvine/pdfplumber/discussions/1071) — snap_tolerance, join_tolerance, intersection_tolerance default values confirmed
- Peter Collingridge SVG tooltip pattern — mousemove + `pointer-events: none` approach for flicker-free choropleth tooltips (MEDIUM confidence, community source)
- [CARSAT territorial structure (Wikipedia FR)](https://fr.wikipedia.org/wiki/Caisse_d'assurance_retraite_et_de_sant%C3%A9_au_travail) — confirmed 15 Carsat + 4 CGSS + 1 CSS = 20 entities; Île-de-France served by CNAM Cnav directly

---

*Stack research for: v1.1 carte régionale AT/Trajet (SVG choropleth + PDF pipeline)*
*Researched: 2026-02-28*
