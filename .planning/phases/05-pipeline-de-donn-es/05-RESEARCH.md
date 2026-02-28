# Phase 5: Pipeline de données - Research

**Researched:** 2026-02-28
**Domain:** Python data pipeline (copy + adapt from BPO project)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Copier `refresh_data.py` et `parse_pdf.py` depuis `~/.claude/bpo/data/`
- Adapter les chemins pour que la sortie aille dans `data/` (at-data.json, mp-data.json, trajet-data.json)
- Nettoyer le code pendant la copie : simplifier, retirer la logique spécifique au projet BPO, améliorer les messages d'erreur
- Scripts dans `data/pipeline/`
- requirements.txt pour les dépendances Python
- README expliquant les prérequis, la commande à lancer, la fréquence de mise à jour

### Claude's Discretion
- Niveau de nettoyage et simplification du code
- Organisation interne des scripts (découpage en fonctions, modules)
- Format et verbosité des logs pendant l'exécution
- Gestion des erreurs (retry, fail fast, messages)
- Version Python minimale à documenter

### Deferred Ideas (OUT OF SCOPE)
None. Discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | Project contains self-contained data pipeline in `data/pipeline/` | Copy BPO scripts, adapt paths, add requirements.txt |
| PIPE-02 | Pipeline downloads Excel files from ameli.fr and outputs JSON to `data/` | refresh_data.py already does this; output path changes from DATA_DIR to `../` relative |
| PIPE-03 | Pipeline parses per-NAF PDF fiches for demographics data | parse_pdf.py handles this; PDF_DIR must be configurable (not hardcoded to ~/Desktop/) |
| PIPE-04 | Pipeline has a README explaining how to run a data refresh | New file: `data/pipeline/README.md` |
</phase_requirements>

## Summary

The pipeline already exists and works in the BPO project. The task is a copy-adapt-clean operation, not new development. The BPO `refresh_data.py` (1157 lines) downloads Excel from ameli.fr, parses it, and outputs JSON + pickle files. The datagouv project only needs JSON, so pickle generation is BPO-specific and must be removed.

The main structural change: `DATA_DIR = Path(__file__).parent` currently resolves to `bpo/data/`. In datagouv, scripts live in `data/pipeline/` and must write JSON to `data/` (one level up). This requires changing output paths to `Path(__file__).parent.parent` or equivalent.

The critical cleanup item is `parse_pdf.py` line 13: `PDF_DIR` is hardcoded to `/Users/encarv/Desktop/Etude-BPO/chart_extractor_project_full/input_pdfs`. This must become a configurable parameter (CLI arg or env var), not a hardcoded path. Without this, the pipeline cannot run on any machine other than the developer's.

**Primary recommendation:** Copy both scripts, remove pickle output, make PDF_DIR configurable via CLI argument, adjust all output paths to `../`, strip unused imports.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python | 3.10+ | Runtime | f-strings, `match`, `Path` used throughout |
| openpyxl | 3.x | Parse .xlsx files | Used by `parse_at_xlsx` via `load_workbook` |
| pdfplumber | 0.x | PDF text/table extraction | Used in `parse_pdf.py` via `pdfplumber.open()` |
| requests | 2.x | Download Excel files from ameli.fr | Used in `download_xlsx()` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pathlib | stdlib | Path manipulation | Already used throughout, no install needed |
| json | stdlib | JSON serialization | Already used, no install needed |
| re | stdlib | Regex in parse_pdf | Already used, no install needed |
| collections.defaultdict | stdlib | Aggregation | Already used, no install needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| requests | urllib | requests is cleaner, already used in BPO |
| openpyxl | pandas | pandas is heavier; direct openpyxl is fine here |

**Installation:**
```bash
pip install -r requirements.txt
```

requirements.txt content:
```
requests>=2.31
openpyxl>=3.1
pdfplumber>=0.10
```

## Architecture Patterns

### Target Project Structure
```
data/
├── at-data.json         # Output (consumed by dashboard)
├── mp-data.json         # Output
├── trajet-data.json     # Output
└── pipeline/
    ├── README.md        # PIPE-04
    ├── requirements.txt
    ├── refresh_data.py  # Downloads Excel, builds JSON (PIPE-01, PIPE-02)
    └── parse_pdf.py     # Parses per-NAF PDFs (PIPE-03)
```

### Pattern: Path Adaptation
**What:** All output paths in refresh_data.py use `DATA_DIR = Path(__file__).parent`. In `data/pipeline/`, this resolves to `data/pipeline/`. JSON outputs must go to `data/`.

**Change required:**
```python
# BPO original:
DATA_DIR = Path(__file__).parent
AT_JSON_PATH = DATA_DIR / "at-data.json"

# Datagouv adapted:
PIPELINE_DIR = Path(__file__).parent
OUTPUT_DIR = PIPELINE_DIR.parent  # data/
AT_JSON_PATH = OUTPUT_DIR / "at-data.json"
```

### Pattern: Remove Pickle Output
`write_outputs()` in BPO writes both JSON and `.pkl` files. The datagouv project only needs JSON. The function must be simplified to JSON-only:

```python
def write_json(data, json_path, label):
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  {label} JSON: {json_path.name} ({json_path.stat().st_size / 1024:.0f} KB)")
```

All calls `write_outputs(...)` become `write_json(...)`. Remove `import pickle`.

### Pattern: Configurable PDF_DIR
`parse_pdf.py` has hardcoded path:
```python
PDF_DIR = Path("/Users/encarv/Desktop/Etude-BPO/chart_extractor_project_full/input_pdfs")
```

This must become a CLI argument with a clear error if not provided:
```python
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf-dir", required=True, help="Chemin vers le dossier contenant les PDF NAF_*.pdf")
    args = parser.parse_args()
    pdf_dir = Path(args.pdf_dir)
    if not pdf_dir.exists():
        print(f"ERREUR: Dossier introuvable: {pdf_dir}")
        sys.exit(1)
    results = parse_all_pdfs(pdf_dir)
```

In `refresh_data.py`, the call to `parse_all_pdfs()` must also accept a `pdf_dir` argument passed from CLI.

### Anti-Patterns to Avoid
- **Keeping pickle imports:** `import pickle` and `.pkl` paths serve BPO MCP server only. Remove completely.
- **Hardcoded absolute paths:** Any `/Users/encarv/` path will break on other machines.
- **AT_2021 secondary download:** BPO downloads a 2021 backup Excel for risk cause data. Verify if still needed in 2023 dataset context before keeping.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel parsing | Custom reader | openpyxl (already used) | Sheet navigation, cell iteration, merged cells |
| PDF text extraction | Custom parser | pdfplumber (already used) | PDF layout complexity |
| HTTP download with progress | Custom urllib | requests (already used) | Retry, headers, streaming |

**Key insight:** All parsing logic is already battle-tested in BPO. The task is adaptation, not reimplementation.

## Common Pitfalls

### Pitfall 1: AT_2021 secondary Excel
**What goes wrong:** `refresh_data.py` downloads a 2021 Excel in addition to 2023. The 2021 file is used for risk cause breakdown data (`AT_RISK_CAUSES`). If removed blindly, risk cause charts break.
**How to avoid:** Keep the secondary download or verify the 2023 Excel contains risk cause columns. Check column indices `AT_COL` (columns 20-31 are risk cause columns).
**Warning signs:** Empty risk causes in JSON output.

### Pitfall 2: PDF_DIR not provided
**What goes wrong:** If `parse_all_pdfs()` is called without PDFs, it returns an empty dict silently, producing JSON with no demographics data.
**How to avoid:** Add explicit check + warning if PDF directory is empty or missing. The README must clearly state PDFs must be downloaded manually from ameli.fr.
**Warning signs:** All `demographics` keys absent from output JSON.

### Pitfall 3: Output directory not existing
**What goes wrong:** If `data/` directory doesn't exist when running from `data/pipeline/`, `json.dump` raises FileNotFoundError.
**How to avoid:** Add `OUTPUT_DIR.mkdir(parents=True, exist_ok=True)` before writing. (Unlikely since `data/` already exists, but defensive is better.)

### Pitfall 4: naf38 level in BPO not needed
**What goes wrong:** BPO builds `by_naf38` aggregation level. Datagouv dashboard only uses NAF5, NAF4, NAF2. Keeping naf38 wastes JSON size.
**How to avoid:** Check dashboard JS imports before stripping. If naf38 is not consumed, remove `by_naf38` from build functions.

## Code Examples

### Write JSON only (adapted from BPO write_outputs)
```python
def write_json(data, json_path, label):
    """Write JSON output file."""
    json_path.parent.mkdir(parents=True, exist_ok=True)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  {label}: {json_path.name} ({json_path.stat().st_size / 1024:.0f} KB)")
```

### Path setup in refresh_data.py
```python
PIPELINE_DIR = Path(__file__).parent
OUTPUT_DIR = PIPELINE_DIR.parent  # data/

AT_XLSX_PATH = PIPELINE_DIR / "at-by-ctn-naf.xlsx"   # temp download
AT_JSON_PATH = OUTPUT_DIR / "at-data.json"             # final output
```

### README minimum content
```markdown
# Pipeline de données - Sinistralite France

## Prerequis
- Python 3.10+
- pip install -r requirements.txt
- PDFs par NAF telecharges depuis ameli.fr (facultatif, pour les demographics)

## Lancer une mise a jour

cd data/pipeline/
python refresh_data.py [--pdf-dir /chemin/vers/pdfs]

## Frequence de mise a jour
Les donnees ameli.fr sont publiees annuellement (derniere edition : 2023).
Relancer le pipeline a chaque nouvelle publication.
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| BPO: writes pickle + JSON | Datagouv: JSON only | Removes pickle dependency, reduces output size |
| BPO: hardcoded PDF path | Datagouv: CLI arg --pdf-dir | Portable across machines |
| BPO: DATA_DIR = __file__.parent | Datagouv: OUTPUT_DIR = parent.parent | Scripts in pipeline/ subdir, JSON in data/ |

## Open Questions

1. **Is naf38 level consumed by the dashboard?**
   - What we know: BPO builds by_naf38 in all three datasets
   - What's unclear: Whether any JS in the datagouv dashboard reads by_naf38
   - Recommendation: Grep dashboard JS for "naf38" before deciding to strip it

2. **AT 2021 Excel secondary download**
   - What we know: BPO downloads 2021 for risk cause columns (columns 20-31)
   - What's unclear: Whether the 2023 Excel also has those columns at same indices
   - Recommendation: Keep the secondary download initially; document it in README

3. **PDF availability**
   - What we know: PDFs live on developer's Desktop, not version-controlled
   - What's unclear: Whether user has/will download PDFs separately
   - Recommendation: Make PDF parsing fully optional (skip silently if --pdf-dir not provided), document in README that demographics require separate PDF download

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `/Users/encarv/.claude/bpo/data/refresh_data.py` (1157 lines)
- Direct code inspection of `/Users/encarv/.claude/bpo/data/parse_pdf.py` (393 lines)
- Project file structure confirmed via `ls /Users/encarv/.claude/datagouv/data/`

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions (user-locked, 2026-02-28)
- REQUIREMENTS.md PIPE-01 through PIPE-04

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - inspected actual import statements in source files
- Architecture: HIGH - copy-adapt is deterministic, paths are inspected
- Pitfalls: HIGH - identified by reading source code directly

**Research date:** 2026-02-28
**Valid until:** Stable indefinitely (pipeline scripts don't change unless ameli.fr changes format)
