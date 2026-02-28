---
phase: 04-export-csv
verified: 2026-02-28T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Open Share drawer and verify CSV button visibility and initial disabled state"
    expected: "Bouton Telecharger CSV visible, grise/desactive quand aucun secteur n'est selectionne"
    why_human: "Button rendering and disabled visual state require browser to confirm appearance"
  - test: "Select a sector in AT view, open Share drawer, click Telecharger CSV"
    expected: "Un fichier sinistralite-AT-{code}.csv se telecharge avec une ligne d'en-tetes et une ligne de donnees"
    why_human: "Blob download + file content require browser execution to verify"
  - test: "Open sinistralite-AT-{code}.csv in Excel"
    expected: "Accents francais preserves (e.g. Frequence, Gravite), colonnes separees par point-virgule"
    why_human: "UTF-8 BOM + Excel rendering cannot be verified programmatically"
  - test: "Switch from AT view (sector selected) to MP view (no sector), open Share drawer"
    expected: "Le bouton CSV est grise/desactive dans la vue MP"
    why_human: "View-switch disabled state coverage requires live interaction"
  - test: "Select a sector in Trajet view, download CSV"
    expected: "Taux de gravite column is empty (not zero) because trajet data omits that field"
    why_human: "Null guard output for taux_gravite must be verified against real trajet data"
---

# Phase 4: Export CSV Verification Report

**Phase Goal:** Un utilisateur peut telecharger les donnees KPI du secteur affiche sous forme de fichier CSV
**Verified:** 2026-02-28
**Status:** human_needed (all automated checks passed)
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Un bouton Telecharger CSV est visible dans le Share drawer pour chaque vue (AT, MP, Trajet) | VERIFIED | `index.html` line 340: `id="downloadCSVBtn"` with label "Telecharger CSV" inside `#shareDrawer`. The drawer is shared across all three views. |
| 2 | Le bouton CSV est desactive quand aucun secteur n'est selectionne | VERIFIED | `index.html` line 340: `disabled aria-disabled="true"` on button by default. `app.js` `updateCSVBtnState()` (line 13-19) toggles `disabled` based on `state.views[state.activeView].code`. Called both at `render()` end (line 106) and on each share button click (line 29). |
| 3 | Le clic sur le bouton CSV telecharge un fichier .csv contenant le code NAF, le nom du secteur et toutes les valeurs KPI | VERIFIED | `insights.js` `downloadCSV()` (lines 198-258): builds headers + data row with Code NAF, Secteur, Indice de frequence, Taux de gravite, eventLabel, Incapacites permanentes, Deces, Jours perdus, Salaries. Uses `URL.createObjectURL` + synthetic anchor click. |
| 4 | Le fichier CSV s'ouvre dans Excel avec les accents francais preserves | VERIFIED (automated) | `insights.js` line 249: `'\uFEFF'` BOM prepended. Blob type `'text/csv;charset=utf-8;'`. Needs human to confirm Excel rendering. |
| 5 | Le nom du fichier suit le format sinistralite-{vue}-{code-NAF}.csv | VERIFIED | `insights.js` line 254: `'sinistralite-' + viewCodes[viewId] + '-' + code + '.csv'` where `viewCodes = { at: 'AT', mp: 'MP', trajet: 'Trajet' }`. |

**Score:** 5/5 truths verified (automated)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `index.html` | CSV download button in Share drawer | VERIFIED | Line 340-344: `#downloadCSVBtn` with `disabled`, `aria-disabled="true"`, `aria-label="Telecharger les donnees du secteur en CSV"`, label "Telecharger CSV". PDF button completely absent. |
| `js/insights.js` | `downloadCSV` function with Blob + BOM | VERIFIED | Lines 198-258: 61-line substantive implementation. Guards: `!vs.code` early return, `!entry` early return. BOM at line 249. Null guards on all 7 KPI fields. `downloadPDF` fully removed. |
| `js/app.js` | CSV button click listener and disabled state management | VERIFIED | Line 10: imports `downloadCSV` from insights.js. Line 13-19: `updateCSVBtnState()`. Line 29: called on share button clicks. Line 38: CSV button click calls `downloadCSV(state.activeView)`. Line 106: called at end of `render()`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `js/app.js` | `js/insights.js` | `import downloadCSV` | WIRED | Line 10: `import { ..., downloadCSV, ... } from './insights.js'`. Used at line 38 in click handler. |
| `js/app.js` | `js/state.js` | `state.views[activeView].code` for disabled state | WIRED | Line 16: `state.views[state.activeView].code` evaluated in `updateCSVBtnState()`. |
| `js/insights.js` | `js/data.js` | `getData` and `getStore` for KPI values | WIRED | Line 5: `import { getData, getStore } from './data.js'`. Both used in `downloadCSV` at lines 202-203. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EXPORT-01 | 04-01-PLAN.md | User can export current sector's KPI data as a CSV file | SATISFIED | `downloadCSV()` in insights.js + wired click listener in app.js with disabled state management |
| EXPORT-02 | 04-01-PLAN.md | CSV includes sector code, name, and all displayed KPI values | SATISFIED | CSV headers include Code NAF, Secteur, IF, TG, event count, IP, Deces, Jours perdus, Salaries - matching all KPI cards rendered by `renderKPIs()` |

No orphaned requirements: REQUIREMENTS.md maps exactly EXPORT-01 and EXPORT-02 to Phase 4. Both are accounted for in the plan.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No TODO/FIXME, no stubs, no empty implementations found |

`downloadPDF` references: zero matches across all JS and HTML files (confirmed via grep). The broken `window.print()` implementation is fully gone.

### Human Verification Required

#### 1. CSV button visual state in Share drawer

**Test:** Open the dashboard without selecting any sector. Click any Share button (AT, MP, or Trajet view). Observe the "Telecharger CSV" button.
**Expected:** Button appears visually greyed-out/disabled. Clicking it has no effect.
**Why human:** Visual disabled state and click-blocking require browser rendering.

#### 2. Successful CSV download (AT view)

**Test:** Select any sector (e.g., type "01" in AT search, pick a result). Open Share drawer. Click "Telecharger CSV".
**Expected:** Browser downloads a file named `sinistralite-AT-01.csv` (or matching the selected code). No toast/notification appears.
**Why human:** Blob download flow and filename require browser execution.

#### 3. Excel compatibility with French accents

**Test:** Open the downloaded CSV in Microsoft Excel (or LibreOffice Calc).
**Expected:** Column headers show "Indice de frequence", "Taux de gravite", "Incapacites permanentes", "Deces" with correct accents. Semicolons separate columns. Sector name (libelle) appears in column B with quotes if it contains commas.
**Why human:** UTF-8 BOM + Excel rendering cannot be verified programmatically.

#### 4. Disabled state updates on view switch

**Test:** Select a sector in AT view (button should become active). Switch to MP view without selecting a sector. Open Share drawer.
**Expected:** CSV button is disabled in the MP view Share drawer.
**Why human:** View-switch state management requires live browser interaction to confirm timing.

#### 5. Trajet CSV null guard for taux_gravite

**Test:** Select any sector in Trajet view. Download CSV. Open file.
**Expected:** "Taux de gravite" column is empty (not "0" or "null") for the Trajet data row.
**Why human:** Requires real trajet-data.json to be loaded and field absence confirmed in output.

### Gaps Summary

No gaps. All automated verifications passed:

- The `#downloadCSVBtn` element exists in `index.html` at the correct location inside `#shareDrawer`, disabled by default.
- `downloadCSV()` is a full 61-line implementation (not a stub) in `js/insights.js` with UTF-8 BOM, semicolon separator, null guards, correct filename format, and Blob/anchor download pattern.
- `js/app.js` wires the click listener, imports `downloadCSV`, manages disabled state at render-time and at drawer-open time.
- All three key links are verified at import + usage level.
- Both EXPORT-01 and EXPORT-02 are satisfied.
- No `downloadPDF` remnants anywhere in the codebase.
- No anti-patterns (no TODOs, no stubs, no empty returns).

Five items are flagged for human verification because they require browser execution: visual rendering of disabled state, actual file download, Excel accent rendering, cross-view disabled state timing, and Trajet null-guard output.

---

_Verified: 2026-02-28_
_Verifier: Claude (gsd-verifier)_
