# Phase 6: Pipeline régional - Research

**Researched:** 2026-03-02
**Domain:** Python PDF table extraction (pdfplumber) + JSON pipeline output
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-05 | Parser extracts AT data by caisse régionale from rapport annuel PDF (Tableau 9), all years 2020-2024 | pdfplumber `extract_table()` with "lines" strategy; year column detection via 4-digit header scan |
| PIPE-06 | Parser extracts Trajet data by caisse régionale from rapport annuel PDF (Tableau 17), all years 2020-2024 | Same extraction pattern as PIPE-05 applied to Tableau 17 (page ~37) |
| PIPE-07 | Parser handles multi-line caisse names and produces clean regional JSON | `' '.join(cell.split())` normalization + `merge_multiline_rows()` post-processing |
| PIPE-08 | Regional JSON includes effectifs salariés and AT/Trajet counts per caisse per year | Salariés column detected in Tableau 9 alongside AT counts; absent from Tableau 17 |
</phase_requirements>

## Summary

Phase 6 is a pure Python data pipeline task. It creates `data/pipeline/parse_regional.py`, a new script that extracts AT (Tableau 9) and Trajet (Tableau 17) data from the rapport annuel PDF, then writes `data/regional-data.json`. The frontend phases (7-9) depend entirely on this JSON being correct before they begin.

The technical domain is well-researched: pdfplumber 0.11.9 is already in use via `parse_pdf.py`. The rapport annuel tables have predictable structure with known pitfalls (multi-line caisse names, merged "Total" rows, variable DOM-TOM presence). The caisse-to-region mapping is not bijective — 16 metropolitan caisses cover 13 administrative regions; Auvergne-Rhône-Alpes has two distinct caisses (CARSAT Auvergne + CARSAT Rhône-Alpes). The mapping table must be hardcoded and manually validated.

The rapport annuel PDF is not in the repository — it must be downloaded manually from ameli.fr. The parser should be runnable standalone with `--pdf /path/to/rapport.pdf` and optionally integrated into `refresh_data.py` via `--rapport-pdf`. The output schema has been fully designed in prior research.

**Primary recommendation:** Write `parse_regional.py` as a standalone script with `--pdf` and `--out` arguments. Use pdfplumber `"lines"` strategy with `debug_tablefinder()` first to confirm page numbers and column structure before writing extraction logic.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdfplumber | 0.11.9 (>=0.10 in requirements.txt) | Extract tables from rapport annuel PDF | Already used in `parse_pdf.py`; handles bordered tables with `"lines"` strategy; released January 5, 2026 |
| Python stdlib (re, json, pathlib, unicodedata) | stdlib | Regex normalization, JSON output, path handling | No new deps needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdfplumber `debug_tablefinder()` | 0.11.9 | Visual inspection of table boundaries before coding extraction | Use first to confirm exact page numbers for Tableau 9 and Tableau 17 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdfplumber | camelot-py | Camelot is better for complex spanning headers but requires system-level Ghostscript; avoid for CI |
| pdfplumber | PyMuPDF (fitz) | Faster for image/text but weaker table detection; pdfplumber already in use |

**Installation:**
```bash
# Already installed — no new dependencies
pip install pdfplumber>=0.10
```

## Architecture Patterns

### Recommended Project Structure

```
data/
├── regional-data.json          # Output: new file
└── pipeline/
    ├── parse_regional.py       # New: standalone script for rapport annuel PDF
    ├── parse_pdf.py            # Existing: NAF fiche parser (unchanged)
    ├── refresh_data.py         # Modified: add optional --rapport-pdf argument
    └── requirements.txt        # Unchanged (pdfplumber already present)
```

### Pattern 1: Standalone parser with --pdf / --out arguments

**What:** `parse_regional.py` accepts `--pdf /path/to/rapport.pdf` and `--out data/regional-data.json`. Mirrors the `--pdf-dir` convention already in `parse_pdf.py`. Runnable independently for development/testing.

**When to use:** Always. Do not bake the PDF path as a constant. The PDF is not in the repository.

**Example:**
```python
# data/pipeline/parse_regional.py
import argparse, json, pdfplumber
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True, help="Chemin vers le rapport annuel PDF")
    parser.add_argument("--out", default="data/regional-data.json")
    args = parser.parse_args()
    data = parse_regional_pdf(Path(args.pdf))
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Ecrit: {args.out} ({len(data['caisses'])} caisses)")
```

### Pattern 2: `debug_tablefinder()` before coding extraction

**What:** Open the PDF with pdfplumber, call `page.debug_tablefinder(settings).show()` to visually confirm cell boundaries, then write the `extract_table()` call with correct settings.

**When to use:** At the start of development, before writing any extraction logic. Saves debugging time.

**Example:**
```python
import pdfplumber

with pdfplumber.open("rapport-annuel.pdf") as pdf:
    # Confirm page number for Tableau 9
    page = pdf.pages[23]  # ~page 24 (0-indexed)
    settings = {
        "vertical_strategy": "lines",
        "horizontal_strategy": "lines",
        "snap_tolerance": 3,
        "join_tolerance": 3,
        "intersection_tolerance": 3,
    }
    im = page.debug_tablefinder(settings)
    im.show()  # or im.save("debug_p24.png")
```

### Pattern 3: Multi-line row merge

**What:** pdfplumber returns `None` for merged cells. When a caisse name wraps to a second PDF line, `extract_table()` produces two consecutive rows: one with the first name fragment + numeric values, and one with the continuation text + `None` for numeric columns.

**When to use:** After every `extract_table()` call on the rapport annuel tables.

**Example:**
```python
def merge_multiline_rows(raw_rows: list) -> list:
    """Fusionne les lignes de continuation où les colonnes numériques sont None."""
    merged = []
    for row in raw_rows:
        if not row:
            continue
        # Ligne de continuation: toutes les colonnes sauf la première sont None
        if all(cell is None for cell in row[1:]):
            if merged and row[0]:
                # Ajouter la suite du nom de caisse avec un espace
                merged[-1][0] = (merged[-1][0] or '') + ' ' + row[0].strip()
            continue
        merged.append(list(row))
    return merged
```

### Pattern 4: Caisse name normalization

**What:** After merging rows, normalize caisse names with `' '.join(cell.split())` + `unicodedata.normalize('NFC', s)` before matching against the canonical lookup dict.

**When to use:** On every caisse name cell before lookup.

**Example:**
```python
import unicodedata

def normalize_caisse_name(s: str) -> str:
    """Normalise un nom de caisse: espaces unifiés, unicode NFC, strip."""
    if not s:
        return ''
    s = ' '.join(s.split())  # fusionne \n et espaces multiples
    s = unicodedata.normalize('NFC', s)
    return s.strip()
```

### Pattern 5: Canonical caisse mapping table (hardcoded)

**What:** A dict mapping canonical caisse names (as they appear in the PDF) to stable IDs used in the JSON output. Must be defined once and validated manually.

**When to use:** Always. Do not derive IDs algorithmically from names — names may change between PDF editions.

**Example:**
```python
# Noms canoniques tels qu'ils apparaissent dans le rapport annuel Ameli
# 16 caisses métropolitaines + 4 CGSS DOM-TOM + 1 CSS Mayotte = 21 max
CAISSE_MAP = {
    "CRAMIF": "cramif",
    "Carsat Normandie": "normandie",
    "Carsat Nord-Picardie": "nord-picardie",
    "Carsat Nord-Est": "nord-est",
    "Carsat Alsace-Moselle": "alsace-moselle",
    "Carsat Bourgogne-Franche-Comté": "bourgogne-franche-comte",
    "Carsat Centre-Val de Loire": "centre-val-de-loire",
    "Carsat Bretagne": "bretagne",
    "Carsat Pays de la Loire": "pays-de-la-loire",
    "Carsat Aquitaine": "aquitaine",
    "Carsat Centre-Ouest": "centre-ouest",
    "Carsat Midi-Pyrénées": "midi-pyrenees",
    "Carsat Languedoc-Roussillon": "languedoc-roussillon",
    "Carsat Auvergne": "auvergne",
    "Carsat Rhône-Alpes": "rhone-alpes",
    "Carsat Sud-Est": "sud-est",
    # DOM-TOM (présence variable selon édition)
    "CGSS Martinique": "cgss-martinique",
    "CGSS Guadeloupe": "cgss-guadeloupe",
    "CGSS Guyane": "cgss-guyane",
    "CGSS La Réunion": "cgss-reunion",
    "CSS Mayotte": "css-mayotte",
}
```

### Pattern 6: Output JSON schema

**What:** The agreed schema for `data/regional-data.json`, designed for direct frontend consumption by Phase 7+.

**When to use:** This is the contract. Do not change the schema without updating the planner.

```json
{
  "meta": {
    "source": "Rapport annuel Assurance Maladie - Risques professionnels 2024",
    "generated": "2026-03-02",
    "years": ["2020", "2021", "2022", "2023", "2024"]
  },
  "caisses": [
    {
      "id": "bretagne",
      "name": "Carsat Bretagne",
      "type": "carsat",
      "at": { "2020": 12345, "2021": 11900, "2022": 12100, "2023": 11800, "2024": 11600 },
      "trajet": { "2020": 2100, "2021": 2050, "2022": 2000, "2023": 1950, "2024": 1900 },
      "salaries": { "2020": 580000, "2021": 590000, "2022": 605000, "2023": 610000, "2024": 615000 }
    }
  ]
}
```

Note: `salaries` is from Tableau 9 (AT table only — not available in Tableau 17). Include it when present; omit the key when absent for DOM-TOM rows with missing data.

### Anti-Patterns to Avoid

- **Trusting row count equals caisse count:** Always assert `len(merged_rows) >= 16` after merging. Fewer means multi-line merging failed or "Total" rows polluted the output.
- **Using `split('\n')[0]` on caisse name cells:** Drops the second line of multi-line names. Use `' '.join(cell.split())` instead.
- **Silently ignoring unmatched caisse names:** Log a warning for each name not found in `CAISSE_MAP`. Silent failure produces incomplete JSON.
- **Hardcoding page 24 and page 37 as constants:** Verify with `debug_tablefinder()` on the actual PDF first — page numbers shift between annual editions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF table extraction | Custom text coordinate parser | `pdfplumber.extract_table()` with `"lines"` strategy | pdfplumber handles cell boundary detection, text ordering, merged cell representation |
| French number parsing | Custom regex | `int(s.replace(" ", "").replace("\xa0", ""))` (already in `parse_fr_number()` in `parse_pdf.py`) | Same function already written and tested |
| Unicode normalization | Custom accent mapping | `unicodedata.normalize('NFC', s)` from stdlib | Handles all French accents including composed forms |

**Key insight:** All needed tools are already in the project. Phase 6 is assembly work, not new infrastructure.

## Common Pitfalls

### Pitfall 1: Multi-line caisse names truncated

**What goes wrong:** "Carsat Bourgogne-Franche-Comté" wraps across two PDF lines. pdfplumber returns two rows. The parser only reads the first row, producing "Carsat Bourgogne-" as the name. The lookup in `CAISSE_MAP` returns `None`. The caisse is silently dropped.

**Why it happens:** `extract_table()` preserves intra-cell newlines. If the parser iterates rows directly without a merge pass, continuation rows look like independent rows with empty numeric cells.

**How to avoid:** Always run `merge_multiline_rows()` immediately after `extract_table()`. Test explicitly on the "Bourgogne-Franche-Comté" and "Île-de-France" rows.

**Warning signs:** Fewer than 16 entries in the output JSON; any caisse name ending in "-".

### Pitfall 2: "Total" / "Ensemble" rows included in output

**What goes wrong:** The rapport annuel tables have a "Total" or "Ensemble" summary row at the bottom. If included, it inflates one "caisse" with national-level aggregates. The frontend would render a wildly outlier "region" on the map.

**Why it happens:** The merge loop does not filter label rows. "Total" rows have non-None values in numeric columns so they pass the continuation-row filter.

**How to avoid:** After merging, filter rows where the first column matches "Total", "Ensemble", or "France métropolitaine" (case-insensitive, normalized).

**Warning signs:** One entry in the JSON has values 10x larger than all others; the entry name is "Total" or "France entière".

### Pitfall 3: Merged cells (None) in numeric columns misinterpreted

**What goes wrong:** A merged header cell across multiple columns appears as `None` for all but the first column. If the parser tries to cast `None` to `int`, it raises `TypeError`. If it silently skips the column, values shift left by one column.

**Why it happens:** pdfplumber represents merged cells as `None` in all cells that belong to the merge region except the top-left.

**How to avoid:** Wrap all numeric cell parsing in `if cell is not None else None`. Log when a caisse row has unexpected `None` in numeric columns.

**Warning signs:** `TypeError: int() argument must be a string` in the parser output; year values that look like counts (e.g., 2023 instead of 11800).

### Pitfall 4: Page numbers wrong between PDF editions

**What goes wrong:** Tableau 9 is coded as page 24 based on one edition. In a different edition (e.g., the 2023 edition vs. 2024 edition), the table is on page 23 or 25 due to added sections.

**Why it happens:** Annual reports add/remove editorial pages (foreword, summary boxes) between editions. Table page numbers are not stable.

**How to avoid:** Use `debug_tablefinder()` on the actual PDF to confirm before hardcoding. Or scan all pages for the Tableau 9 header text: `[p for p in pdf.pages if "Tableau 9" in (p.extract_text() or "")]`.

**Warning signs:** `extract_table()` returns `None` or an empty list on the expected page.

### Pitfall 5: Salariés column absent from Tableau 17

**What goes wrong:** Phase 8 plans to compute an accident rate using `salaries`. If the parser assumes `salaries` is in both Tableau 9 and Tableau 17, and it silently fails to find it in Tableau 17, it may populate `salaries: 0` instead of `null`, causing division by zero or incorrect rates downstream.

**Why it happens:** Tableau 17 (Trajet) does not include the effectifs salariés column — only Tableau 9 (AT) does.

**How to avoid:** Extract `salaries` only from Tableau 9. In the output JSON, populate `salaries` from Tableau 9 data and leave it absent from the per-caisse entry if the value is missing.

**Warning signs:** All `salaries` values are 0 in the output.

### Pitfall 6: DOM-TOM rows variable between editions

**What goes wrong:** CGSS Martinique, Guadeloupe, Guyane, Réunion appear in some editions and not others, or in a separate sub-table at the bottom. Parser fails if it expects a fixed row count.

**Why it happens:** Report format varies year to year. DOM-TOM data may appear in an annex.

**How to avoid:** Make DOM-TOM presence optional. Assert `len(caisses_metropolitaines) >= 16` (not a total count). Log a warning if DOM-TOM caisses are absent; do not fail.

## Code Examples

Verified patterns from existing codebase and pdfplumber documentation:

### Table extraction with settings

```python
# Source: pdfplumber docs + STACK.md (verified against 0.11.9)
import pdfplumber

TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
    "snap_tolerance": 3,
    "join_tolerance": 3,
    "intersection_tolerance": 3,
    "text_x_tolerance": 5,
    "text_y_tolerance": 3,
}

def extract_table_from_page(page):
    rows = page.extract_table(TABLE_SETTINGS)
    return rows or []
```

### Finding the right page by searching text

```python
# Source: pdfplumber docs pattern (verified)
def find_tableau_page(pdf, tableau_label: str):
    """Trouve la première page contenant le label de tableau."""
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ""
        if tableau_label in text:
            return i, page
    return None, None
```

### French number parsing (reuse from parse_pdf.py)

```python
# Source: existing parse_pdf.py (line 19-21)
def parse_fr_number(s: str) -> int | None:
    """Parse un nombre au format français (espaces/nbsp comme séparateurs de milliers)."""
    if not s:
        return None
    try:
        return int(s.replace(" ", "").replace("\u00a0", ""))
    except ValueError:
        return None
```

### Output validation assertion

```python
# Assertion minimale avant d'écrire le JSON
def validate_output(caisses: list) -> None:
    metro = [c for c in caisses if c["type"] == "carsat" or c["type"] == "cramif"]
    assert len(metro) >= 16, (
        f"Seulement {len(metro)} caisses métropolitaines extraites (minimum 16 attendu). "
        "Vérifier le parsing multi-lignes et le filtrage des lignes Total."
    )
    for c in caisses:
        for year in ["2020", "2021", "2022", "2023", "2024"]:
            assert c["at"].get(year) not in (None, 0) or c["type"] not in ("carsat", "cramif"), (
                f"AT manquant pour {c['id']} année {year}"
            )
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PyMuPDF for PDF parsing | pdfplumber for table extraction | Already established in v1.0 | pdfplumber handles bordered tables reliably; stay with it |
| Manual PDF download each time | Standalone script with `--pdf` arg | Phase 6 design | Script is runnable without touching the rest of the pipeline |

**No deprecated approaches in this domain for Phase 6.** pdfplumber 0.11.9 is current (January 2026).

## Open Questions

1. **Exact page numbers for Tableau 9 and Tableau 17**
   - What we know: approximately page 24 for Tableau 9, page 37 for Tableau 17 (from prior research)
   - What's unclear: exact pages for the specific PDF edition being used
   - Recommendation: Use `find_tableau_page(pdf, "Tableau 9")` text scan at script startup; log the found page number for the operator

2. **Exact column layout of Tableau 9 (salariés column index)**
   - What we know: effectifs salariés is in Tableau 9 alongside AT counts
   - What's unclear: which column index (0-based) contains salariés in the actual table
   - Recommendation: Use `debug_tablefinder()` and inspect the header row in the first task of the plan

3. **Canonical caisse names in the current PDF edition**
   - What we know: the canonical mapping table is defined in PITFALLS.md
   - What's unclear: exact spelling variations in the 2024 edition (accents, spacing, abbreviations)
   - Recommendation: Print all extracted caisse names in a dry-run mode before doing any lookup matching; adjust `CAISSE_MAP` keys accordingly

## Sources

### Primary (HIGH confidence)

- `.planning/research/STACK.md` — pdfplumber settings, multi-line merge pattern, output JSON schema
- `.planning/research/PITFALLS.md` — caisse mapping table, multi-line names, merged cells, DOM-TOM handling
- `.planning/research/ARCHITECTURE.md` — `parse_regional.py` design, `refresh_data.py` integration, output schema
- `data/pipeline/parse_pdf.py` — existing `parse_fr_number()` to reuse, pdfplumber patterns already in production
- `data/pipeline/requirements.txt` — confirms pdfplumber already in requirements

### Secondary (MEDIUM confidence)

- pdfplumber GitHub (jsvine/pdfplumber) — multi-line row behavior, `None` for merged cells (community discussions #768, #719)

### Tertiary (LOW confidence)

- None for this phase. All critical claims are backed by existing codebase or prior HIGH-confidence research.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pdfplumber already in use; no new dependencies
- Architecture: HIGH — `parse_regional.py` design fully specified in ARCHITECTURE.md; patterns validated against existing `parse_pdf.py`
- Pitfalls: HIGH — sourced from prior PITFALLS.md research which cited pdfplumber GitHub issues directly

**Research date:** 2026-03-02
**Valid until:** 2026-06-01 (pdfplumber is stable; rapport annuel format is annual)
