# Codebase Quality Assessment

**Analysis Date:** 2026-02-27

## Overview

Single-page vanilla JS dashboard (no build step, no framework) with 1,524 lines of JS across 8 modules and 1,327 lines of CSS across 7 files. A separate `landing.html` (1,869 lines, fully self-contained with inline CSS/JS) serves as the marketing page. Total data payload: 9.2 MB across three JSON files.

## Code Consistency

**Strengths:**
- Consistent module pattern: every JS file uses ES module `export`/`import`
- Uniform naming: `viewId` + suffix pattern for DOM IDs (`at-kpiGrid`, `mp-compChart`)
- Consistent use of `var` (ES5-style) in all dashboard JS modules
- CSS custom properties used consistently for theming, with a single `[data-theme="dark"]` override block

**Inconsistencies:**

1. **ES5 vs ES6 style split.** Dashboard JS (`js/*.js`) uses `var`, `function(){}`, no arrow functions. Landing page JS uses `const`, `let`, arrow functions (`=>`). If code is ever shared between the two, this will cause friction.
   - Files: `js/app.js`, `js/charts.js` (ES5) vs `landing.html` lines 1793-1866 (ES6)

2. **localStorage key mismatch.** The dashboard stores theme preference as `theme`, but the landing page uses `datagouv-theme`. Switching theme on the landing page does not carry over to the dashboard and vice versa.
   - Files: `js/nav.js` lines 21, 24, 84 vs `landing.html` lines 1801, 1804

3. **Font family reference to unloaded font.** Chart.js configurations reference `'DM Sans'` (6 occurrences), but no Google Fonts link loads DM Sans. The loaded fonts are `Lato` and `JetBrains Mono`. The browser silently falls back to `sans-serif`.
   - Files: `js/nav.js` line 66, `js/charts.js` lines 65, 95, 554, 574, 638

4. **Duplicate CSS variable declarations.** The landing page re-declares all `:root` variables with slight differences (adds `--bg-alt`, `--warning`, `--warning-dim`, `--accent-strong`, `--card-shadow-lg`, `--card-shadow-xl`, `--grid-dot`, `--mockup-bg`, `--mockup-border`, `--glow-1`, `--glow-2`). The base values for shared variables are identical but drift risk is high.
   - Files: `styles/base.css` lines 2-49 vs `landing.html` lines 12-70

5. **Google Fonts weight mismatch.** `index.html` loads JetBrains Mono at weights `400;500;600`, while `landing.html` loads `400;500;600;700`. The 700 weight is used in landing but missing from the dashboard font load.
   - Files: `index.html` line 9 vs `landing.html` line 9

## Error Handling

**Critical gap: no error handling on data fetch.** The `loadDataset()` function in `js/data.js` does not catch fetch errors. If any of the three JSON files fails to load (network error, 404, corrupt JSON), the `Promise.all` in `js/app.js` will reject and the `DOMContentLoaded` async handler will silently fail. No loading state, no error message, no retry.

```js
// js/data.js lines 5-11 - no try/catch, no .catch(), no response.ok check
export async function loadDataset(type) {
  if (DATASETS[type]) return DATASETS[type];
  var resp = await fetch('./data/' + type + '-data.json');
  var json = await resp.json();
  DATASETS[type] = json;
  return json;
}
```

**Other error handling gaps:**
- `js/app.js` line 38: `if (!entry) return;` silently exits render if the code is not found. No user feedback.
- `js/charts.js` line 111: `var maxVal = items[items.length - 1].value || 1;` avoids division by zero but if `items` is empty this will throw.
- `js/insights.js` line 142: `navigator.clipboard.writeText()` has a `.then()` but no `.catch()`. Will silently fail on HTTP (non-HTTPS) origins or if clipboard permission is denied.
- No global error handler (`window.onerror` or `window.addEventListener('unhandledrejection')`).
- Zero `console.log`, `console.warn`, or `console.error` calls in the entire JS codebase. While clean, it means zero observability in production.

## Accessibility

**Significant gaps.**

1. **Almost no ARIA attributes.** The entire `index.html` has a single `aria-label` (on the theme toggle button, line 27). No other interactive elements have accessible labels.
   - Nav rail buttons: no `aria-label`, no `role` attributes
   - Autocomplete dropdown: no `role="listbox"`, no `aria-expanded`, no `aria-activedescendant`
   - Drawer panels: no `role="dialog"`, no `aria-modal`, no focus trap
   - Level tab buttons: no `role="tablist"` / `role="tab"` / `aria-selected`
   - KPI help tooltips: rely on hover only, no keyboard trigger

2. **Keyboard navigation incomplete.** The `/` shortcut and `Escape` key are handled, but:
   - Position strip dots are only clickable via mouse (no `tabindex`, no keyboard event)
   - Comparison chart bar clicks require a mouse
   - Top sector rows in national state have no `tabindex`
   - Autocomplete items: arrow keys work, but items have no `tabindex` or `role`

3. **Color contrast concerns.** Several text elements use `--text-dim` (#80868b on light, #545d68 on dark) at small font sizes (0.62rem-0.72rem). These are likely below WCAG AA contrast ratio (4.5:1) for small text.
   - `.pos-axis`, `.ac-count`, `.naf-badge`, `.breadcrumb .sep`, `.funnel-rate`

4. **No skip-to-content link.** Fixed nav bar + nav rail means keyboard users must tab through navigation on every page load.

5. **Charts are not accessible.** Chart.js canvases have no `aria-label` or text alternative. Screen readers see nothing.

## Responsive Design

**Handled with media queries at 768px and 480px breakpoints.**

**What works:**
- KPI grid collapses: 3 cols -> 2 cols -> 1 col (`styles/kpi.css` lines 99-109)
- Charts row collapses to single column at 768px (`styles/charts.css` line 335)
- Nav rail collapses to width 0 at 768px (`styles/nav.css` line 150)
- Drawers go full-width at 768px (`styles/drawers.css` lines 198-201)
- Footer stacks vertically at 768px (`styles/base.css` line 249)

**Issues:**
- Container padding override at 768px declares `padding` twice in the same rule (`styles/base.css` lines 246-248): first `padding: 24px 16px 60px`, then `padding-left: 16px; padding-top: 72px;`. The second declarations override the first partially, making the intent unclear.
- Nav rail hidden at 768px but no mobile navigation alternative (hamburger menu, bottom nav). Users lose the ability to switch between AT/MP/Trajet views on mobile.
- Position strip with many dots becomes unreadable on small screens. No responsive handling for this component.
- Comparison chart with many bars overflows horizontally. The `overflow-x: auto` on `.comparison-card .chart-wrap` (line 339) applies, but the chart canvas may not resize properly within the scrollable container.
- Landing page at 768px: feature rows collapse to 1 column, which works, but the mockup screenshots remain at full width and may cause overflow.

## Performance Patterns

**Data loading:**
- Three JSON files totaling 9.2 MB are loaded in parallel on page load (`js/app.js` line 152). All three must complete before any UI becomes interactive. On slow connections, this creates a significant blank-screen period.
- No lazy loading: even if the user only views AT data, MP and Trajet data are fetched immediately.
- No loading spinner or skeleton UI while data loads.
- Data is cached in memory (`DATASETS` object in `js/data.js`) but there is no disk/service-worker cache. Every page reload re-fetches 9.2 MB.

**Chart rendering:**
- Charts are properly destroyed before re-creation (`vs.causesChart.destroy()`, `vs.compChart.destroy()`, etc.), preventing Chart.js memory leaks.
- `themeColor()` in `js/utils.js` calls `getComputedStyle()` on every invocation. During chart rendering, this is called dozens of times. The result should be cached per render cycle.
- Evolution charts use `Object.assign({}, baseOpts, ...)` which creates shallow copies. The nested `plugins` and `scales` objects are shared references. This works because Chart.js doesn't mutate options, but it is fragile.

**DOM manipulation:**
- Heavy use of `innerHTML` with string concatenation (14 occurrences across JS files). No DOM diffing. Each render cycle fully rebuilds KPIs, breadcrumbs, funnel, position strip, comparison table, and insights.
- Event listeners are re-attached on every render (breadcrumb links, position strip dots, table rows). Previous listeners on destroyed DOM are garbage collected, but this is wasteful.

**CDN dependencies:**
- `lucide@latest` loaded from unpkg without version pinning. A breaking change in Lucide will silently break the icon system. Pin to a specific version.
- Chart.js pinned at `4.4.7` (good).
- ChartDataLabels pinned at `2.2.0` (good).

## Potential Bugs

1. **Theme not shared between pages.** Landing uses `datagouv-theme`, dashboard uses `theme` in localStorage. Users who set dark mode on the landing page will see light mode on the dashboard.
   - Fix: use the same key (`datagouv-theme`) in both pages.

2. **DM Sans font never loaded.** Chart labels reference `'DM Sans'` which is not in the Google Fonts link. Browsers fall back to the generic `sans-serif`. The visual result is acceptable but unintentional.
   - Fix: replace `'DM Sans'` with `var(--sans)` or `'Lato'` in all Chart.js font configs.

3. **Funnel chart crash on empty items.** In `js/charts.js` line 111, `items[items.length - 1].value` will throw if `cfg.funnelItems(s)` returns an empty array. This is unlikely with current data but not guarded.
   - Fix: add `if (items.length === 0) return;` before line 111.

4. **Hash routing case sensitivity.** `loadFromHash()` in `js/app.js` first tries exact match (lines 129-137), then uppercase (lines 138-146). But NAF codes in the data may use mixed case. The dual-pass approach handles this, but the URL hash will preserve the user's original casing while the data lookup uses a different case, potentially causing "code not found" for unusual inputs.

5. **Click-outside handler leak.** In `js/app.js` lines 180-189, the click-outside handler for drawers is added to `document`. It checks if drawers are open on every click anywhere in the page. This is minor but inefficient. More critically, it could close a drawer that was just opened if the event propagation is not stopped (the `!e.target.closest('.action-btn')` guard handles this, but it is fragile).

6. **Multiple document click handlers.** `setupSearch()` in `js/search.js` line 151 adds a `document.addEventListener('click', ...)` for each of the three views. These handlers never get removed, meaning three separate click handlers run on every click for autocomplete close logic.

7. **Breadcrumb separator missing for non-current items.** In `js/app.js` line 70, the separator is added only when `i < crumbs.length - 1`, but for the current (last) item no separator is needed. However, the separator is placed AFTER the link, before the next item. This means the last non-current breadcrumb gets a separator, but the visual result may show a trailing separator before the current item. On inspection, this appears to work correctly for the existing 2-3 crumb cases.

## Dead Code and Unused CSS

**Unused CSS classes in `styles/base.css`:**
- `.empty-lead` (line 163): not used in `index.html` or any JS file
- `.naf-table` (line 172): not used
- `.naf-row` (line 178): not used
- `.naf-badge` (line 190): not used
- `.naf-desc` (line 197): not used
- `.naf-example` (line 201): not used
- `.naf-label` (line 208): not used

These appear to be remnants of a previous "NAF table" empty state that was replaced by the national KPIs + top 10 table.

**Unused CSS classes in `styles/charts.css`:**
- `.evo-delta`, `.evo-delta.up`, `.evo-delta.down`, `.evo-delta.neutral` (lines 306-317): not generated by any JS code. The delta percentage is rendered via a Chart.js plugin (`deltaPlugin` in `js/charts.js`) directly on the canvas, not as HTML.
- `.funnel-tooltip .tt-pct` (line 272): the `tt-pct` class is never applied by `js/charts.js`

**Unused CSS variable:**
- `--serif` declared in `styles/base.css` line 24 (`'Lato', Georgia, serif`) but never referenced with `var(--serif)` anywhere.

**Empty CSS file:**
- `styles/dark.css` contains only a comment ("reserved for future component-specific overrides"). It is loaded on every page but contributes nothing.

## Test Coverage

**No tests exist.** Zero test files, no test framework, no testing configuration, no CI pipeline. There are no `.test.js`, `.spec.js`, `jest.config.*`, `vitest.config.*`, or `playwright.config.*` files.

**No linting or formatting tools.** No `.eslintrc`, `.prettierrc`, `biome.json`, or equivalent. Code style is enforced only by convention.

**Impact:** All changes are manually verified in a browser. There is no safety net for regressions in data rendering, search behavior, chart configurations, or hash routing.

## Security Considerations

1. **innerHTML with user-adjacent data.** The `highlightText()` function in `js/search.js` (line 59) wraps matched text in `<mark>` tags, then the result is inserted via `innerHTML`. The data comes from the pre-built JSON files (not user input), so XSS risk is low. However, if the JSON data were ever to contain HTML entities or if the search query were reflected directly, this pattern would be exploitable. The `query` parameter in `highlightText` comes from the search input, but only the matched substring of the data label is wrapped, not the raw query. Still, the pattern is unsafe by design.

2. **No Content Security Policy.** The HTML files load scripts from `cdn.jsdelivr.net` and `unpkg.com` without a CSP header or meta tag.

3. **clipboard API without HTTPS check.** `navigator.clipboard.writeText()` requires a secure context. On HTTP, it will fail silently (no `.catch()`).

## Print Support

Print styles are well-implemented in `styles/base.css` lines 252-278. Navigation, search, drawers, and empty states are hidden. Cards retain borders and readable colors. Print color adjustment is enabled for funnel bars. This is a notable quality feature.

## Summary of Priority Fixes

| Priority | Issue | Files |
|----------|-------|-------|
| High | No error handling on data fetch | `js/data.js` |
| High | 9.2 MB loaded eagerly, no loading state | `js/app.js`, `js/data.js` |
| Medium | localStorage key mismatch between pages | `js/nav.js`, `landing.html` |
| Medium | DM Sans font referenced but not loaded | `js/charts.js`, `js/nav.js` |
| Medium | Lucide unpinned (`@latest`) | `index.html`, `landing.html` |
| Medium | No accessibility (ARIA, keyboard, contrast) | `index.html`, all JS modules |
| Low | Dead CSS rules (7 naf-* classes, evo-delta, etc.) | `styles/base.css`, `styles/charts.css` |
| Low | Empty `styles/dark.css` loaded for nothing | `styles/dark.css`, `index.html` |
| Low | Unused `--serif` CSS variable | `styles/base.css` |
| Low | Three document click handlers from search setup | `js/search.js` |
