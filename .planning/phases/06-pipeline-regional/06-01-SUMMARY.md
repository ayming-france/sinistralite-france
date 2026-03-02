---
phase: 06-pipeline-regional
plan: 01
subsystem: pipeline
tags: [pdfplumber, python, json, pdf-parsing, regional-data]

requires: []

provides:
  - "data/pipeline/parse_regional.py: standalone PDF parser extracting AT/Trajet data per caisse régionale"
  - "data/pipeline/test_parse_regional.py: 24 unit tests for pure extraction functions"
  - "CAISSE_MAP with 21 entries (16 metro + 5 DOM-TOM) as stable caisse ID reference"
  - "data/regional-data.json output schema (meta + caisses) ready for Phase 7 SVG consumption"

affects:
  - "07-structure-svg: consumes data/regional-data.json schema"
  - "08-choroplethe: uses caisse IDs from CAISSE_MAP and annual AT/Trajet values"
  - "09-navigation-mobile: depends on JSON structure for region panel data"

tech-stack:
  added: [pytest]
  patterns:
    - "pdfplumber extract_table() with lines strategy for bordered PDF tables"
    - "merge_multiline_rows() post-processing to handle wrapped caisse names"
    - "normalize_caisse_name() with NFC Unicode normalization before CAISSE_MAP lookup"
    - "Dynamic page detection via find_tableau_page() text scan (not hardcoded page numbers)"
    - "has_salaries flag pattern to share extract_regional_table() between Tableau 9 and 17"

key-files:
  created:
    - data/pipeline/parse_regional.py
    - data/pipeline/test_parse_regional.py
  modified: []

key-decisions:
  - "Salariés extracted from Tableau 9 only and stored per caisse in output JSON (absent from Tableau 17)"
  - "CAISSE_MAP uses tuple values (stable_id, type) to avoid separate type lookup table"
  - "validate_output() asserts >=16 metro caisses and non-zero AT+Trajet per year before writing JSON"
  - "All script output (logs, warnings) goes to stderr; JSON output to file only"
  - "DOM-TOM absence triggers warning but not failure (variable between PDF editions)"

patterns-established:
  - "Pattern: find_tableau_page() text scan — never hardcode PDF page numbers between annual editions"
  - "Pattern: merge_multiline_rows() always applied immediately after extract_table() before any lookup"
  - "Pattern: normalize_caisse_name() NFC + whitespace collapse applied on every name before CAISSE_MAP lookup"

requirements-completed: [PIPE-05, PIPE-06, PIPE-07, PIPE-08]

duration: 4min
completed: 2026-03-02
---

# Phase 6 Plan 01: Pipeline Régional Summary

**Standalone pdfplumber parser extracting AT/Trajet data per caisse régionale from rapport annuel PDF, with 21-entry CAISSE_MAP, dynamic page detection, multi-line name merging, and 24 pytest unit tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T08:20:08Z
- **Completed:** 2026-03-02T08:24:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `parse_regional.py` is a complete standalone script with `--pdf`, `--out`, `--dry-run` arguments ready to run against the actual PDF
- CAISSE_MAP with 21 entries (16 metropolitan + 5 DOM-TOM) including stable IDs and type per caisse
- 24 unit tests covering all pure functions without requiring a PDF file

## Task Commits

Each task was committed atomically:

1. **Task 1: Create parse_regional.py with full extraction pipeline** - `34e7b00` (feat)
2. **Task 2: Create unit tests for pure functions** - `643e5d1` (test)

## Files Created/Modified

- `data/pipeline/parse_regional.py` - Standalone PDF parser with CAISSE_MAP, extraction pipeline, validation, and CLI
- `data/pipeline/test_parse_regional.py` - 24 pytest unit tests for pure functions (no PDF required)

## Decisions Made

- Salariés are extracted from Tableau 9 only (not present in Tableau 17). If the salary column is detected in Tableau 9, its value is mapped to all available years for that caisse.
- validate_output() runs before writing the JSON and raises AssertionError on fewer than 16 metropolitan caisses or any null AT/Trajet value, preventing silent partial output.
- DOM-TOM absence emits a stderr warning but does not block execution, since their presence varies between annual report editions.
- CAISSE_MAP tuple values `(id, type)` avoid a separate lookup for the type field.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **pytest not installed:** The verification command required pytest which was not yet installed. Fixed by running `pip3 install pytest` (Rule 3 - blocking). This was a one-time environment setup, not a code issue.

## User Setup Required

None - no external service configuration required.
The PDF itself must be provided at runtime via `--pdf`. The script is ready to run when the rapport annuel PDF is available locally.

## Next Phase Readiness

- `parse_regional.py` is complete and ready to run against the actual rapport annuel PDF
- Actual PDF extraction will be verified in Plan 02 (PDF execution + output validation)
- The JSON output schema is finalized and ready for Phase 7 SVG structure to consume
- All 21 CAISSE_MAP entries have been manually curated from the RESEARCH.md canonical table

---
*Phase: 06-pipeline-regional*
*Completed: 2026-03-02*
