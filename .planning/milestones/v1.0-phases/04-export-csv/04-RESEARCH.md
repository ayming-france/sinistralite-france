# Phase 4: Export CSV - Research

**Researched:** 2026-02-28
**Domain:** Client-side CSV generation, vanilla JS, browser download API
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Button placement: Replace the broken PDF button in the Share drawer with the CSV button. Label: "Télécharger CSV" with a download icon. One button per view (AT, MP, Trajet) in the shared shareDrawer. Same position as the old PDF button (below the link-sharing option).
- CSV content scope: Columns: Code NAF, Secteur, Indice de fréquence, Taux de gravité, Événements, Incapacités permanentes, Décès, Jours perdus, Salariés. French headers matching dashboard labels. Export only the currently selected NAF level (not all levels). Export only the currently displayed sector (one data row). UTF-8 BOM encoding for Excel compatibility with French accents.
- File naming: Format `sinistralite-{vue}-{code-NAF}.csv`. View codes: AT, MP, Trajet. Example: `sinistralite-AT-62.01Z.csv`. No date in filename.
- No-data behavior: CSV button disabled (grayed, not clickable) when no sector is selected. Silent download on click (no toast or notification). Browser handles download natively.

### Claude's Discretion

- Technical mechanism for CSV generation (Blob, data URI, etc.)
- Exact style of the disabled button
- CSV separator (semicolon recommended for French Excel compatibility)

### Deferred Ideas (OUT OF SCOPE)

None. Discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXPORT-01 | User can export current sector's KPI data as a CSV file | Blob + anchor download pattern covers this entirely client-side |
| EXPORT-02 | CSV includes sector code, name, and all displayed KPI values | stats object in data.js has all required fields; libelle is on the entry object |
</phase_requirements>

## Summary

This phase is pure client-side work with no external dependencies. All data is already in memory via `getData(viewId)` and `getStore(viewId, level)` accessed from `data.js`. The state module tracks `state.views[viewId].code` and `state.views[viewId].level`, so the currently selected sector is always accessible.

The single Share drawer (`#shareDrawer`) is shared across all three views. The broken `#downloadPDFBtn` must be replaced in-place in `index.html`. The event listener is wired in `attachDrawerListeners()` in `app.js` (line 28-29). The `downloadPDF` function lives in `insights.js` (line 198) and must be replaced with a `downloadCSV` function.

The entire implementation is: (1) update HTML button, (2) replace `downloadPDF` in `insights.js` with `downloadCSV`, (3) update the import and listener in `app.js`, (4) add disabled state logic tied to sector selection.

**Primary recommendation:** Use the Blob + anchor click pattern with UTF-8 BOM. Semicolon separator. No library needed.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Browser Blob API | Native | Create in-memory file content | No dependency, universally supported |
| HTMLAnchorElement.download | Native | Trigger file download | Standard W3C, supported in all modern browsers |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| URL.createObjectURL | Native | Create temporary URL from Blob | Use with Blob pattern to avoid long data URIs |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Blob + anchor | data: URI | Blob is cleaner for larger strings; data URIs have length limits in some browsers |
| Blob + anchor | FileSaver.js | No external library needed for a single download action |

**Installation:** None. No packages required.

## Architecture Patterns

### Pattern 1: Blob Download

**What:** Build a string, wrap in Blob with MIME type, create object URL, click a synthetic anchor, revoke URL.

**When to use:** Always for client-side file downloads in vanilla JS.

```js
// Source: MDN Web Docs - Blob, URL.createObjectURL
function downloadCSV(viewId) {
  var vs = state.views[viewId];
  if (!vs.code) return;
  var data = getData(viewId);
  var entry = getStore(viewId, vs.level)[vs.code];
  var cfg = VIEW_CONFIG[viewId];
  var s = entry.stats;

  var BOM = '\uFEFF';
  var sep = ';';
  var headers = ['Code NAF', 'Secteur', 'Indice de fréquence', 'Taux de gravité',
    cfg.eventLabel, 'Incapacités permanentes', 'Décès', 'Jours perdus', 'Salariés'];
  var row = [
    vs.code,
    '"' + entry.libelle.replace(/"/g, '""') + '"',
    s.indice_frequence,
    s.taux_gravite,
    s[cfg.eventKey],
    s.nouvelles_ip,
    s.deces,
    s.journees_it,
    s.nb_salaries
  ];

  var csv = BOM + headers.join(sep) + '\n' + row.join(sep);
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var viewCode = viewId === 'trajet' ? 'Trajet' : viewId.toUpperCase();
  a.href = url;
  a.download = 'sinistralite-' + viewCode + '-' + vs.code + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}
```

### Pattern 2: Disabled button state

**What:** Disable the CSV button when `state.views[activeView].code` is null. Re-enable after sector selection.

**When to use:** On every render cycle. The `render()` function in `app.js` is the right hook since it runs on every sector selection.

```js
// In render() or after selectCode resolves
var csvBtn = el('downloadCSVBtn');
if (csvBtn) {
  csvBtn.disabled = !code;
  csvBtn.setAttribute('aria-disabled', !code ? 'true' : 'false');
}
```

### Anti-Patterns to Avoid

- **Using `window.print()` for CSV:** The existing `downloadPDF` is `window.print()` which opens print dialog, not a real PDF. Do not keep this.
- **Passing raw numbers to CSV without null guard:** Some fields like `taux_gravite` can be null for Trajet view. Use `s.field || 0` or `s.field != null ? s.field : ''`.
- **Not quoting the libelle field:** Sector names can contain commas and quotes. Always quote and escape.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UTF-8 BOM | Custom byte encoding | `'\uFEFF'` string prefix | JS strings are already UTF-16; Blob with charset=utf-8 handles conversion |
| File download | Server-side endpoint | Blob + anchor | Data is already in memory client-side |

**Key insight:** UTF-8 BOM is just the three-byte sequence `\uFEFF` prepended as a string. The Blob with `charset=utf-8` handles actual encoding. Excel on Windows detects the BOM and opens with correct accents automatically.

## Common Pitfalls

### Pitfall 1: Taux de gravité field absent for Trajet view

**What goes wrong:** `trajet-data.json` entries may not have `taux_gravite` in stats (Trajet data sourced from PDF fiches, different structure).

**Why it happens:** The three datasets have different fields. MP and Trajet do not have the same keys as AT.

**How to avoid:** Guard with `s.taux_gravite != null ? s.taux_gravite : ''` for all optional fields. Verify per view.

**Warning signs:** `undefined` appearing in CSV output.

### Pitfall 2: Single shared drawer, state must be view-aware

**What goes wrong:** The `#shareDrawer` is shared. The CSV button click must know which view is active to call `downloadCSV(viewId)`.

**Why it happens:** `attachDrawerListeners()` wires the PDF button once, not per-view. The active view at click time is `state.activeView`.

**How to avoid:** Inside the click handler: `downloadCSV(state.activeView)`.

### Pitfall 3: Button disabled attribute not reset on view switch

**What goes wrong:** User selects sector in AT view, switches to MP (no sector selected yet), CSV button stays enabled.

**Why it happens:** The disabled state is only set during `render()` which runs per-view, but the button is shared.

**How to avoid:** Also update disabled state in `switchView()` or at drawer open time by reading `state.views[state.activeView].code`.

## Code Examples

### Data field availability per view

```js
// AT stats keys (verified from at-data.json):
// nb_salaries, nb_heures, nb_siret, at_1er_reglement, at_4j_arret,
// nouvelles_ip, deces, journees_it, indice_frequence, taux_gravite

// cfg.eventKey per view:
// at     → 'at_1er_reglement'
// mp     → 'mp_1er_reglement'
// trajet → 'trajet_count'
```

### View code mapping for filename

```js
var VIEW_CODES = { at: 'AT', mp: 'MP', trajet: 'Trajet' };
// Result: sinistralite-AT-62.01Z.csv, sinistralite-MP-62.01Z.csv, sinistralite-Trajet-62.01Z.csv
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `window.print()` as PDF | Blob + anchor for real download | This phase | Actual file download vs. print dialog |

**Deprecated/outdated:**
- `downloadPDF` / `#downloadPDFBtn`: Replace entirely. Function is `window.print()` which is broken for this purpose.

## Open Questions

1. **Taux de gravité in MP and Trajet data**
   - What we know: AT data has `taux_gravite` confirmed. MP and Trajet sourced from different Ameli datasets.
   - What's unclear: Whether `taux_gravite` is present in mp-data.json and trajet-data.json stats.
   - Recommendation: Executor should inspect mp-data.json and trajet-data.json stats keys before writing the CSV row builder. Use empty string fallback if absent.

## Sources

### Primary (HIGH confidence)
- Codebase inspection (`js/insights.js`, `js/app.js`, `js/state.js`, `js/data.js`, `index.html`) - verified current structure
- `data/at-data.json` - verified stats field names
- MDN Blob API (well-established, stable API since 2012)

### Secondary (MEDIUM confidence)
- UTF-8 BOM behavior in Excel: well-documented community pattern, consistent across Excel versions on Windows and Mac

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - native browser APIs, no libraries
- Architecture: HIGH - codebase fully inspected, integration points confirmed
- Pitfalls: MEDIUM - taux_gravite presence in MP/Trajet not verified from JSON, executor must check

**Research date:** 2026-02-28
**Valid until:** 2026-04-28 (stable APIs, no external dependencies)
