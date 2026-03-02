# Phase 9: Navigation et mobile - Research

**Researched:** 2026-03-02
**Domain:** Touch events, CSS fixed panel, URL hash routing, MP message
**Confidence:** HIGH

## Summary

Phase 9 completes the map feature by adding three distinct behaviors: (1) a touch device tap panel replacing the hover tooltip, (2) an explanatory message for the MP view where regional data is unavailable, and (3) ensuring hash routing correctly reflects the active view for shareable URLs. All three are small, self-contained additions built on top of the already-complete Phase 8 infrastructure.

The existing codebase already has most scaffolding in place. `app.js` has full hash routing (`loadFromHash`, `hashchange` listener, `switchView` that already writes `window.location.hash`). `map.js` already gates the tooltip behind `navigator.maxTouchPoints > 0` with a comment "reporté à la Phase 9". The bottom nav exists in HTML and `nav.js`. No new library or framework is needed.

The three deliverables are independent enough to be implemented as one plan. Total LOC estimate is under 80 lines of JS + 40 lines of CSS.

**Primary recommendation:** Build everything in `js/map.js` (tap panel logic) and `styles/map.css` (panel CSS), add one HTML fragment for the MP message, and verify hash routing via the already-working `app.js` router.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAP-10 | Fixed info panel on tap replaces hover tooltip on touch devices | `setupTooltip` already excluded on touch (`navigator.maxTouchPoints > 0`); add `setupTapPanel` mirror function in `map.js`; CSS `.map-tap-panel` with `position:fixed; bottom:0; left:0; right:0` pattern validated against existing `.bottom-nav` and drawer patterns in the codebase |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS (ES modules) | ES2020 | Touch events, DOM manipulation, hash routing | Already the project standard (no framework, no build step) |
| CSS custom properties | Native | Panel theming (dark/light) | Project uses `var(--bg-elevated)`, `var(--border-light)`, etc. throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | No new dependency needed | All required APIs are native browser |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `touchstart`/`click` | Hammer.js, gesture library | Overkill: only need tap-to-open and tap-outside-to-close |
| `navigator.maxTouchPoints` | `'ontouchstart' in window`, CSS `@media (pointer: coarse)` | `maxTouchPoints` already used in Phase 8; keep consistent |
| Hash routing (already exists) | `history.pushState` | Overkill for a static dashboard; hash is already implemented and working |

**Installation:** None required.

## Architecture Patterns

### Recommended Project Structure

No new files needed. All changes go into existing files:

```
js/map.js           ← add setupTapPanel(), closeTapPanel()
styles/map.css      ← add .map-tap-panel, .tap-panel-* rules
index.html          ← add #mapTapPanel div (once, shared), MP message div
app.js              ← verify/adjust hash for bare #at / #mp / #trajet (already works)
```

### Pattern 1: Fixed Bottom Panel for Touch Tap

**What:** A `position:fixed; bottom:0` panel that slides up when a region is tapped, dismissed by tapping outside.

**When to use:** Always on touch devices (gated by `navigator.maxTouchPoints > 0`, same gate as existing tooltip suppression).

**Example (CSS pattern):**
```css
/* Source: existing .bottom-nav in styles/nav.css as reference */
.map-tap-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-light);
  border-radius: 12px 12px 0 0;
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
  transform: translateY(100%);
  transition: transform 0.25s ease;
}

.map-tap-panel.open {
  transform: translateY(0);
}
```

**Example (JS pattern):**
```js
// Source: existing setupTooltip() in js/map.js as structural reference
function setupTapPanel(svgId, viewType) {
  if (navigator.maxTouchPoints === 0) return;

  const svg = document.getElementById(svgId);
  const panel = document.getElementById('mapTapPanel');
  if (!svg || !panel) return;

  const metricLabel = viewType === 'at' ? 'Accidents du travail' : 'Accidents de trajet';

  svg.addEventListener('click', (e) => {
    const g = e.target.closest('[data-caisse]');
    if (!g) return;
    const caisseId = g.dataset.caisse;
    const caisses = regionalData ? regionalData.caisses || [] : [];
    const caisse = caisses.find(c => c.id === caisseId);
    if (!caisse) return;
    const year = getActiveYear(viewType);
    const metric = viewType === 'at' ? 'at' : 'trajet';
    const val = caisse[metric] && caisse[metric][year];
    if (val == null) return;
    const name = caisse.name || caisseId;
    panel.querySelector('.tap-panel-name').textContent = name;
    panel.querySelector('.tap-panel-val').textContent =
      `${metricLabel} : ${val.toLocaleString('fr-FR')} (${year})`;
    panel.classList.add('open');
    e.stopPropagation();
  });

  document.addEventListener('click', (e) => {
    if (panel.classList.contains('open') && !panel.contains(e.target)) {
      panel.classList.remove('open');
    }
  });
}
```

### Pattern 2: MP View Regional Data Message

**What:** A static informational div inside `#view-mp` that is always visible, explaining that regional data is not available for MP.

**When to use:** Always visible in the MP map section (or where the map would appear).

**Implementation note:** The MP view has no `map-section` block currently (only AT and Trajet have `id="at-mapSection"` and `id="trajet-mapSection"`). The message goes in `#view-mp` in place of a map section, or as a styled info banner within a dedicated `.map-section` block.

**Example:**
```html
<!-- Source: project pattern — styled consistent with empty-state -->
<div class="map-section" id="mp-mapSection">
  <h3 class="map-title">Sinistralité par caisse régionale</h3>
  <div class="mp-map-unavailable">
    <p>Les données régionales ne sont pas disponibles pour les maladies professionnelles.</p>
    <p>Le rapport annuel de la CNAM ne publie pas de ventilation par caisse régionale pour les MP.</p>
  </div>
</div>
```

**CSS:**
```css
.mp-map-unavailable {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.6;
}
```

### Pattern 3: Hash Routing for Bare View Hashes

**What:** Ensure that `#at`, `#mp`, `#trajet` in the URL cause the correct view to activate on page load.

**When to use:** This already works in `app.js` via `loadFromHash()`. The relevant code block:

```js
// Source: js/app.js lines 127-129 (already implemented)
} else if (hash === 'at' || hash === 'mp' || hash === 'trajet') {
  switchView(hash);
  return;
}
```

And `switchView()` in `nav.js` line 59 already writes:
```js
window.location.hash = viewId; // when no code selected
```

**Conclusion:** Hash routing for bare view names is fully implemented and working. Phase 9 only needs to verify the behavior holds correctly (no regression from the MP message addition, no regression when switching views).

### Anti-Patterns to Avoid

- **Creating a second `DOMContentLoaded` listener in `map.js`:** Phase 8 already has one. Add `setupTapPanel` calls inside the existing `DOMContentLoaded` block, after `setupTooltip` calls.
- **Attaching `touchstart` instead of `click` on SVG:** `click` fires reliably on touch after 300ms delay in modern iOS/Android. Since there is no need for immediate response, `click` is cleaner and avoids phantom events. If 300ms delay is noticeable, use `touchend` with `preventDefault()`.
- **Using `event.touches` or `touchstart` for close-on-outside detection:** Use `click` on `document` instead (same pattern as existing drawers in `app.js` lines 197-206).
- **Separate tap panels per view (AT and Trajet):** Use a single `#mapTapPanel` element shared across both views (same pattern as `#mapTooltip`). The panel content is dynamically set on each tap.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dismiss-on-outside-tap | Custom event capture logic | `document.addEventListener('click')` with `!panel.contains(e.target)` | Already pattern-matched in `app.js` drawers (lines 197-206) |
| Safe area insets for iPhone notch | Custom JS detection | `env(safe-area-inset-bottom, 0px)` CSS | Already used in `.bottom-nav` in `styles/nav.css` line 163 |
| Touch detection | Custom feature detection | `navigator.maxTouchPoints > 0` | Already the codebase convention (Phase 8, `map.js` line 211) |

**Key insight:** All three patterns (dismiss-on-outside, safe area, touch detection) are already in the codebase. Copy, don't invent.

## Common Pitfalls

### Pitfall 1: SVG Click Event Bubbling on Touch

**What goes wrong:** On touch devices, tapping on a `<path>` inside a `<g data-caisse>` fires the event on the path, not the group. If the listener is on the SVG and uses `e.target`, it misses the group.

**Why it happens:** SVG path elements are the actual target. `e.target.closest('[data-caisse]')` traverses up to the `<g>` parent.

**How to avoid:** Always use `e.target.closest('[data-caisse]')` (already the pattern in Phase 8 tooltip and linked highlight code).

**Warning signs:** Panel opens for some regions but not others on mobile.

### Pitfall 2: Panel Stays Open When Switching Views

**What goes wrong:** User taps a region in AT view, panel opens. User switches to Trajet view via bottom nav. Panel is still open and shows AT data.

**Why it happens:** Panel open state is not cleared on view switch.

**How to avoid:** Close the panel in `switchView()` in `nav.js`, or listen to the view switch and call `panel.classList.remove('open')`.

**Warning signs:** Panel shows stale caisse name after switching views.

### Pitfall 3: Click Event on Document Fires Immediately After SVG Tap

**What goes wrong:** Tap on region opens panel, then the same event bubbles to `document` and immediately closes it.

**Why it happens:** The SVG tap handler and the document close handler both fire for the same event. Bubbling from SVG to document is immediate.

**How to avoid:** Call `e.stopPropagation()` inside the SVG `click` handler after opening the panel (shown in Pattern 1 example above). This is the standard solution.

**Warning signs:** Panel flashes open for a fraction of a second and closes immediately on mobile.

### Pitfall 4: Hash Routing Does Not Trigger Map Initialization

**What goes wrong:** User loads `index.html#at` directly. `loadFromHash` calls `switchView('at')` which shows the AT view. But `map.js` `DOMContentLoaded` already fired before the hash routing logic ran, so map is initialized correctly regardless.

**Why it happens (not a real issue):** `DOMContentLoaded` fires before `loadFromHash`. Both the map and the view switch are handled by that single event. Map is always initialized on load. View switch via hash only needs to show the correct container.

**Conclusion:** No action needed. Existing flow is correct.

### Pitfall 5: MP Map Section Conflicts with `app.js` `mapSection` Hide Logic

**What goes wrong:** `app.js` line 51-52 hides `mapSection` when NAF sector results are shown:

```js
var mapSec = viewEl(viewId, 'mapSection');
if (mapSec) mapSec.style.display = 'none';
```

For viewId `mp`, if an `mp-mapSection` element is added, it will be hidden when a user selects a sector in MP view. This is actually correct behavior (same as AT and Trajet). The MP informational message should be inside `mp-mapSection` so it disappears when sector results are shown, then reappears when navigating back. This is consistent with AT/Trajet behavior.

**How to avoid:** No special action. Create `mp-mapSection` with the same structure as AT/Trajet map sections. `app.js` will handle hide/show automatically.

## Code Examples

### Complete setupTapPanel function structure
```js
// To add in js/map.js, called in DOMContentLoaded after setupTooltip calls
function setupTapPanel(svgId, viewType) {
  if (navigator.maxTouchPoints === 0) return;

  const svg = document.getElementById(svgId);
  const panel = document.getElementById('mapTapPanel');
  if (!svg || !panel) return;

  const metricLabel = viewType === 'at' ? 'Accidents du travail' : 'Accidents de trajet';

  svg.addEventListener('click', (e) => {
    const g = e.target.closest('[data-caisse]');
    if (!g) return;

    const caisseId = g.dataset.caisse;
    const caisses = regionalData ? regionalData.caisses || [] : [];
    const caisse = caisses.find(c => c.id === caisseId);
    if (!caisse) return;

    const year = getActiveYear(viewType);
    const metric = viewType === 'at' ? 'at' : 'trajet';
    const val = caisse[metric] && caisse[metric][year];
    if (val == null) return;

    panel.querySelector('.tap-panel-name').textContent = caisse.name || caisseId;
    panel.querySelector('.tap-panel-metric').textContent = metricLabel;
    panel.querySelector('.tap-panel-val').textContent =
      `${val.toLocaleString('fr-FR')} (${year})`;
    panel.classList.add('open');
    e.stopPropagation();
  });
}

// Single document listener (call once, not per view) — in DOMContentLoaded
document.addEventListener('click', () => {
  const panel = document.getElementById('mapTapPanel');
  if (panel) panel.classList.remove('open');
});
```

### HTML for shared tap panel (once in index.html, before closing body)
```html
<div class="map-tap-panel" id="mapTapPanel" aria-live="polite" aria-label="Informations caisse régionale">
  <div class="tap-panel-close" aria-hidden="true"></div>
  <span class="tap-panel-name"></span>
  <span class="tap-panel-metric"></span>
  <span class="tap-panel-val"></span>
</div>
```

### Verifying hash routing (no code change needed, just verification)
```
Load: index.html#at     → switchView('at') fires → AT view shown
Load: index.html#mp     → switchView('mp') fires → MP view shown
Load: index.html#trajet → switchView('trajet') fires → Trajet view shown
Switch from AT to Trajet → hash becomes #trajet (nav.js line 59)
```
All paths already implemented in `app.js` / `nav.js`. Phase 9 verification confirms no regression.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `touchstart` detection on mobile SVG | `click` event (works on both touch and mouse) | Standard since iOS 13 / Chrome 70 | No need for separate touch event handling |
| `window.onhashchange` | `window.addEventListener('hashchange', ...)` | Standard since 2010 | Already used correctly in `app.js` |
| 300ms tap delay on iOS | Eliminated by `touch-action: manipulation` CSS or `<meta name="viewport">` with `width=device-width` | iOS 13+ | Already handled by the project's existing viewport meta tag |

**Deprecated/outdated:**
- `FastClick.js`: Not needed. Modern iOS/Android have eliminated 300ms delay with proper viewport meta. Project already has `<meta name="viewport" content="width=device-width, initial-scale=1">` (standard in any modern app).

## Open Questions

1. **Should the tap panel show a close button explicitly?**
   - What we know: Tapping outside closes the panel (via document click listener). This is the standard mobile pattern for bottom sheets.
   - What's unclear: Whether a visible close button improves usability, especially for accessibility (keyboard/screen reader users).
   - Recommendation: Add a visual drag indicator (small rounded bar at top of panel) and a close button, consistent with native mobile bottom sheet pattern. Aria-live region for screen reader announcement.

2. **Should the MP map section be shown in empty state or only when sector results are visible?**
   - What we know: AT and Trajet map sections are always visible (shown in empty state, hidden when sector selected). `app.js` line 52 hides it when results are shown.
   - What's unclear: For MP, the message "données régionales non disponibles" is always true regardless of sector selection. Should it stay visible even after a sector is selected?
   - Recommendation: Same behavior as AT/Trajet: show in empty state, hide when results are shown. The message is informational context for the view, not sector-specific.

## Sources

### Primary (HIGH confidence)
- Source code analysis: `/Users/encarv/.claude/datagouv/js/map.js` - Phase 8 complete, touch gate at line 211
- Source code analysis: `/Users/encarv/.claude/datagouv/js/app.js` - Hash routing lines 111-159, drawer dismiss pattern lines 197-206
- Source code analysis: `/Users/encarv/.claude/datagouv/js/nav.js` - `switchView` function writes hash at line 59
- Source code analysis: `/Users/encarv/.claude/datagouv/styles/nav.css` - `env(safe-area-inset-bottom)` pattern at line 163
- Source code analysis: `/Users/encarv/.claude/datagouv/index.html` - Existing `#mapTooltip` and bottom nav elements
- Source code analysis: `/Users/encarv/.claude/datagouv/styles/map.css` - All existing map CSS patterns

### Secondary (MEDIUM confidence)
- MDN Web Docs (training knowledge): `navigator.maxTouchPoints`, `e.stopPropagation()`, `e.target.closest()` - all standard Web APIs, widely supported
- CSS `env(safe-area-inset-bottom)` - standard since Safari 11.1 / Chrome 69, already used in project

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, all vanilla JS/CSS, confirmed by existing codebase
- Architecture: HIGH - all patterns derived directly from existing code in the project
- Pitfalls: HIGH - derived from concrete analysis of actual code interactions (bubbling, view-switch state, `app.js` map-hide logic)

**Research date:** 2026-03-02
**Valid until:** Stable (no external dependencies; valid until codebase changes)
