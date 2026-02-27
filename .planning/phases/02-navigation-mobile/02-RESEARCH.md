# Phase 2: Navigation mobile - Research

**Researched:** 2026-02-27
**Domain:** CSS responsive layout, mobile bottom tab bar, vanilla JS
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

L'utilisateur a donné carte blanche sur toutes les décisions d'implémentation. Les choix suivants reflètent les meilleures pratiques pour ce type d'interface.

**Pattern de navigation : bottom tab bar**
- Barre fixe en bas de l'écran avec 3 onglets (AT, MP, Trajet)
- Chaque onglet reprend l'icône Lucide correspondante (hard-hat, thermometer, car) et un label court
- Le bottom bar est le pattern standard pour 3 vues de même niveau (iOS tab bar, Material bottom nav). Un hamburger cacherait les options derrière un tap inutile pour seulement 3 items.

**Indicateur de vue active**
- L'onglet actif est mis en avant par la couleur accent du thème et un indicateur visuel (fond ou bordure supérieure)
- Pas d'animation complexe lors du changement de vue. Transition simple (couleur) pour rester cohérent avec le style existant.

**Breakpoint**
- Le breakpoint existant à 768px est conservé
- En dessous de 768px : le nav rail est masqué (`width: 0` existant), le bottom bar apparaît
- Au dessus de 768px : le nav rail est affiché, le bottom bar est masqué
- Pas de zone grise intermédiaire. Un seul breakpoint, un seul switch.

**"Vue d'ensemble" sur mobile**
- L'item désactivé "Vue d'ensemble (bientôt)" est masqué sur mobile
- 3 items actifs sur un bottom bar = lisibilité optimale. Ajouter un 4e item désactivé gaspille de l'espace sur petit écran.
- Il réapparaîtra quand la fonctionnalité sera prête.

### Claude's Discretion

Aucune zone de liberté explicite au-delà du pattern déjà décidé. Intégration visuelle cohérente avec le design system existant.

### Deferred Ideas (OUT OF SCOPE)

None. Discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOBILE-01 | User can switch between AT/MP/Trajet views on screens under 768px | `switchView()` already implemented in nav.js — the bottom bar only needs to call it. The existing `.nav-item[data-view]` selector in `initNav()` will automatically pick up bottom bar buttons if they share the same class and `data-view` attribute. |
| MOBILE-02 | Nav rail transforms to a usable mobile navigation pattern (bottom bar or hamburger) | Bottom bar pattern: add `<nav class="bottom-nav">` after `.container`, show it via `@media (max-width: 768px)`, hide nav rail (already `width: 0` at that breakpoint). |
</phase_requirements>

## Summary

Phase 2 adds a bottom tab bar for mobile screens under 768px. The project is vanilla JS + CSS with no build step. The existing `switchView()` function in `js/nav.js` already handles all view switching logic including updating active state on `.nav-item[data-view]` elements. The bottom bar buttons can reuse the same selector pattern, making JS changes minimal or zero if the buttons share the `.nav-item` class.

The main work is: (1) add a bottom nav HTML element to `index.html`, (2) add CSS in `styles/nav.css` that shows it below 768px and hides it above, and (3) ensure the bottom bar padding is accounted for in the `.container` layout so content is not obscured by the fixed bar.

The existing `container` mobile media query (`padding: 24px 16px 60px`) already reserves 60px at the bottom, which matches a standard 56-60px bottom bar height. This is a fortunate coincidence that reduces the risk of content overlap.

**Primary recommendation:** Add the bottom bar as a new `<nav class="bottom-nav">` in `index.html`, styled purely in `nav.css`, with buttons sharing the `nav-item` class so `initNav()` picks them up automatically.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla CSS | N/A | Bottom nav layout and responsive show/hide | No dependencies, matches existing project |
| Vanilla JS | N/A | Event delegation or reuse of existing `initNav()` | Already used for nav rail |
| Lucide icons | latest (unpkg CDN) | Tab icons (hard-hat, thermometer, car) | Already loaded, same icons as nav rail |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS custom properties | N/A | Theme colors (--accent, --bg-card, --border, --text-dim) | Already defined in base.css for both light and dark themes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reusing `.nav-item` class on bottom bar buttons | Separate class + duplicate JS listener | Reuse is cleaner; initNav already queries `.nav-item[data-view]`, so bottom bar buttons get free event binding |
| CSS `display: none` to hide nav rail on mobile | Current `width: 0` approach | `width: 0` is already in place and working; no change needed |

**Installation:** No installation needed. Vanilla CSS + existing Lucide CDN.

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes touch:
```
index.html          — add <nav class="bottom-nav"> block
styles/nav.css      — add .bottom-nav rules + @media (max-width: 768px) show/hide
js/nav.js           — no change needed IF bottom bar buttons use .nav-item class
```

### Pattern 1: Shared selector reuse

**What:** Bottom bar buttons use the same `class="nav-item"` and `data-view="at|mp|trajet"` as nav rail buttons. `initNav()` queries `document.querySelectorAll('.nav-item[data-view]')` and attaches click handlers to all matches, including the new bottom bar buttons.

**When to use:** Always in this project. Avoids duplicating event listener logic.

**Example:**
```html
<!-- Bottom bar (add before </body>) -->
<nav class="bottom-nav" id="bottomNav">
  <button class="nav-item bottom-nav-item active" data-view="at">
    <span class="nav-icon-wrap"><i data-lucide="hard-hat"></i></span>
    <span class="bottom-nav-label">AT</span>
  </button>
  <button class="nav-item bottom-nav-item" data-view="mp">
    <span class="nav-icon-wrap"><i data-lucide="thermometer"></i></span>
    <span class="bottom-nav-label">MP</span>
  </button>
  <button class="nav-item bottom-nav-item" data-view="trajet">
    <span class="nav-icon-wrap"><i data-lucide="car"></i></span>
    <span class="bottom-nav-label">Trajet</span>
  </button>
</nav>
```

**Note:** The `bottom-nav-label` class (not `nav-label`) avoids inheriting `opacity: 0` from the nav rail CSS, which hides labels until hover on rail. Bottom bar labels must always be visible.

### Pattern 2: Active state sync in switchView()

**What:** `switchView()` in nav.js already does `document.querySelectorAll('.nav-item[data-view]').forEach(...)` to set/remove the `active` class. Because both nav rail and bottom bar buttons share this selector, both will be synchronized automatically when the view changes.

**When to use:** No additional code needed. Works out of the box.

### Pattern 3: CSS show/hide at breakpoint

**What:** Bottom bar hidden by default, visible only below 768px. Nav rail already hides itself via `width: 0` at 768px in nav.css.

**Example:**
```css
/* In nav.css */

.bottom-nav {
  display: none; /* hidden on desktop */
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 56px;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  flex-direction: row;
  align-items: stretch;
}

@media (max-width: 768px) {
  .bottom-nav {
    display: flex;
  }
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 100%;
  padding: 0;
  font-size: 0.7rem;
  color: var(--text-dim);
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--sans);
  border-top: 2px solid transparent; /* active indicator placeholder */
  transition: color 0.15s, border-color 0.15s;
}

.bottom-nav-item.active {
  color: var(--accent);
  border-top-color: var(--accent);
}

.bottom-nav-item .nav-icon-wrap {
  background: none;
  border: none;
}

.bottom-nav-item.active .nav-icon-wrap {
  background: var(--accent-glow);
}

.bottom-nav-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
}
```

### Anti-Patterns to Avoid

- **Using `nav-label` class on bottom bar items:** The nav rail CSS sets `.nav-label { opacity: 0 }` and reveals it only on hover. Bottom bar labels must always be visible — use a separate `bottom-nav-label` class.
- **Adding the bottom bar outside the normal stacking context:** The existing drawers use `z-index: 120+`. Keep bottom bar at `z-index: 100` to stay below drawers.
- **Forgetting `lucide.createIcons()` is already called in `updateThemeUI()`:** The initNav flow calls `lucide.createIcons()` on theme toggle. Since Lucide scans the DOM at call time, the bottom bar icons will be rendered only if this is called after the bottom nav HTML is present, which it is (HTML is static, scripts load after).
- **Padding conflict with `.container`:** The mobile `@media (max-width: 768px)` rule in `base.css` already sets `padding-bottom: 60px` on `.container`. Do not reduce this. The 60px bottom padding is what prevents content from sliding under the fixed bottom bar.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| View switching logic | New event listeners on bottom bar buttons | Reuse `switchView()` via shared `.nav-item` selector | Logic is identical; duplication creates sync bugs |
| Active state management | Track bottom bar state separately | `switchView()` already updates all `.nav-item[data-view]` | Double-update is free, guaranteed sync |
| Icon rendering | Manual SVG injection for bottom bar | Lucide CDN already loaded, `data-lucide` attribute works | `lucide.createIcons()` processes all `data-lucide` elements in the DOM |

**Key insight:** The existing `switchView()` implementation is already general-purpose. The bottom bar is purely a CSS + HTML addition with zero new JS logic.

## Common Pitfalls

### Pitfall 1: nav-label opacity inheritance

**What goes wrong:** Developer adds bottom bar buttons with class `nav-item` and then adds a label `<span class="nav-label">AT</span>`. Labels are invisible because `.nav-label { opacity: 0 }` in nav.css is unconditional.
**Why it happens:** The nav rail hides labels until hover to save space. Bottom bar has no hover state on touch devices.
**How to avoid:** Use `bottom-nav-label` as a separate class (not `nav-label`) for bottom bar text labels.
**Warning signs:** Labels invisible on mobile even though HTML is correct.

### Pitfall 2: Bottom bar obscures footer on short screens

**What goes wrong:** On very short screens (iPhone SE in landscape), the footer overlaps with the bottom bar.
**Why it happens:** `.container` has `padding-bottom: 60px` on mobile, but footer is inside container and might not have enough clearance.
**How to avoid:** The existing 60px bottom padding on `.container` covers a 56px bar with 4px margin. This is already in place and should be sufficient. Verify by testing at 375x667 (iPhone SE portrait).
**Warning signs:** Footer text hidden behind bottom bar.

### Pitfall 3: Drawer z-index conflict

**What goes wrong:** Bottom nav appears on top of insights or share drawers.
**Why it happens:** Drawers use high z-index and slide in from the right. If bottom-nav z-index is too high, it overlaps drawers.
**How to avoid:** Set bottom-nav `z-index: 100` (same as nav-rail). The drawers use z-index values above 100.
**Warning signs:** Bottom bar tabs are clickable through a drawer overlay.

### Pitfall 4: Dark theme bottom bar not styled

**What goes wrong:** Bottom bar looks fine in light mode but loses contrast in dark mode.
**Why it happens:** Forgetting that `--bg-card`, `--border`, `--accent`, `--text-dim` all have dark overrides in base.css via `[data-theme="dark"]`. Using these tokens means dark mode works for free.
**How to avoid:** Use only CSS custom properties from base.css (not hardcoded hex values) for all bottom bar colors.
**Warning signs:** Bottom bar has wrong background or invisible borders in dark mode.

## Code Examples

### Complete bottom-nav HTML block

```html
<!-- Mobile bottom nav (hidden on desktop via CSS) -->
<nav class="bottom-nav" id="bottomNav" aria-label="Navigation mobile">
  <button class="nav-item bottom-nav-item active" data-view="at" aria-label="Accidents du Travail">
    <span class="nav-icon-wrap"><i data-lucide="hard-hat"></i></span>
    <span class="bottom-nav-label">AT</span>
  </button>
  <button class="nav-item bottom-nav-item" data-view="mp" aria-label="Maladies Professionnelles">
    <span class="nav-icon-wrap"><i data-lucide="thermometer"></i></span>
    <span class="bottom-nav-label">MP</span>
  </button>
  <button class="nav-item bottom-nav-item" data-view="trajet" aria-label="Accidents de Trajet">
    <span class="nav-icon-wrap"><i data-lucide="car"></i></span>
    <span class="bottom-nav-label">Trajet</span>
  </button>
</nav>
```

### Placement in index.html

Insert the `<nav class="bottom-nav">` block immediately before `</body>` (after the drawers, before the `<script>` tag).

### CSS in nav.css (additions)

```css
/* Bottom navigation bar (mobile only) */
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 56px;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  flex-direction: row;
  align-items: stretch;
}

@media (max-width: 768px) {
  .bottom-nav {
    display: flex;
  }
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 100%;
  padding: 0;
  border: none;
  border-top: 2px solid transparent;
  background: none;
  cursor: pointer;
  font-family: var(--sans);
  color: var(--text-dim);
  transition: color 0.15s, border-color 0.15s;
}

.bottom-nav-item:hover { color: var(--text); }
.bottom-nav-item.active { color: var(--accent); border-top-color: var(--accent); }
.bottom-nav-item.active .nav-icon-wrap { background: var(--accent-glow); }

.bottom-nav-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
}
```

### Verification that switchView() requires no change

Current `switchView()` code (nav.js line 37):
```js
document.querySelectorAll('.nav-item[data-view]').forEach(function(item) {
  item.classList.toggle('active', item.dataset.view === viewId);
});
```

This selector already matches bottom bar buttons (`class="nav-item bottom-nav-item"` with `data-view`). No modification needed.

### initNav() event binding verification

Current `initNav()` code (nav.js line 70):
```js
document.querySelectorAll('.nav-item[data-view]').forEach(function(item) {
  if (!item.classList.contains('disabled')) {
    item.addEventListener('click', function() {
      switchView(this.dataset.view);
    });
  }
});
```

This also already matches bottom bar buttons. Event listeners will be attached automatically. No JS change required.

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Hamburger menu for 3+ items | Bottom tab bar for 3 items | Bottom bar is the iOS/Material standard for 3-5 top-level views |
| Custom toggle JS | Shared selector reuse | Simpler, less code, same result |

## Open Questions

1. **Safe area inset on iPhone (notch/home indicator)**
   - What we know: iOS Safari reserves space at the bottom for the home indicator bar (~34px on newer iPhones). If the bottom nav sits at `bottom: 0`, part of it may overlap the home indicator area.
   - What's unclear: Whether `env(safe-area-inset-bottom)` is needed. The `<meta name="viewport">` in index.html uses `width=device-width, initial-scale=1.0` without `viewport-fit=cover`, so iOS will handle the safe area automatically and not overlap content. This means the safe area inset is NOT needed for this project.
   - Recommendation: Do not add `viewport-fit=cover` or `env(safe-area-inset-bottom)` unless needed. The default viewport behavior provides safe-area protection automatically.

2. **Initial active state on page load**
   - What we know: The bottom bar button for `at` should be `active` by default (matching `state.activeView = 'at'`). The HTML above hardcodes `active` on the AT button. This is correct for the initial load.
   - What's unclear: If the URL hash sets a different initial view (hash routing exists in nav.js), the bottom bar must also reflect it.
   - Recommendation: Check if `initNav()` or the app boot sequence calls `switchView()` to restore state from hash. If it does, the active class update happens automatically. If not, ensure initial active state is set during boot.

## Validation Architecture

Nyquist validation is not enabled in config.json (`workflow.nyquist_validation` key absent). Section skipped.

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `styles/nav.css` — existing breakpoints, nav rail behavior at 768px
- Direct codebase inspection: `js/nav.js` — `switchView()` and `initNav()` selectors confirmed to be general-purpose
- Direct codebase inspection: `styles/base.css` — existing mobile padding (`padding: 24px 16px 60px`) already reserves 60px for a bottom bar
- Direct codebase inspection: `index.html` — nav rail HTML structure, Lucide icon usage pattern

### Secondary (MEDIUM confidence)

- Material Design guidelines (training knowledge): Bottom navigation is the recommended pattern for 3-5 top-level destinations
- iOS Human Interface Guidelines (training knowledge): Tab bars at the bottom for switching top-level views

### Tertiary (LOW confidence)

None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no external libraries, all decisions based on direct codebase reading
- Architecture: HIGH — `switchView()` and `initNav()` selector behavior verified in source
- Pitfalls: HIGH — identified from direct CSS rules (nav-label opacity, container padding)

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable codebase, no external dependencies)
