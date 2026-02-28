---
phase: 05-pipeline-de-donn-es
plan: "02"
subsystem: pipeline
tags: [python, pipeline, pdf-parsing, documentation]
dependency_graph:
  requires: []
  provides: [data/pipeline/parse_pdf.py, data/pipeline/requirements.txt, data/pipeline/README.md]
  affects: [data/pipeline/refresh_data.py]
tech_stack:
  added: [pdfplumber>=0.10, openpyxl>=3.1, requests>=2.31]
  patterns: [argparse CLI, configurable paths, French-accented documentation]
key_files:
  created:
    - data/pipeline/parse_pdf.py
    - data/pipeline/requirements.txt
    - data/pipeline/README.md
  modified: []
decisions:
  - "parse_pdf.py adapted from BPO project: hardcoded PDF_DIR removed, replaced with required --pdf-dir CLI argument"
  - "parse_all_pdfs() signature kept explicit (pdf_dir: Path parameter) for clean integration with refresh_data.py"
  - "README documents both Excel-only and Excel+PDF modes clearly; PDFs marked as optional"
metrics:
  duration: "8 min"
  completed: "2026-02-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
---

# Phase 5 Plan 02: Pipeline PDF Parsing and Documentation Summary

**One-liner:** parse_pdf.py adapted from BPO with argparse --pdf-dir CLI, requirements.txt (3 deps), README in French documenting prérequis, commandes and fréquence annuelle de mise à jour.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Copier et adapter parse_pdf.py | 356eff5 | data/pipeline/parse_pdf.py |
| 2 | Créer requirements.txt et README.md | 47defcf | data/pipeline/requirements.txt, data/pipeline/README.md |

## What Was Built

### parse_pdf.py

Adapted from `/Users/encarv/.claude/bpo/data/parse_pdf.py` (393 lines source). Key changes:

- **Hardcoded path removed:** `PDF_DIR = Path("/Users/encarv/Desktop/...")` deleted entirely
- **argparse block added** in `main()`: `--pdf-dir` required argument with help text
- **Validation added:** checks directory exists and is a directory; exits with code 1 and clear stderr message if not
- **Warning for empty directory:** prints avertissement if no `NAF_*.pdf` files found
- **`parse_all_pdfs()` signature:** explicit `pdf_dir: Path` parameter (no global dependency)
- **Log messages improved:** per-file `[i/total]` progress + final résumé with success/failure counts
- **All docstrings translated** to French
- **No `/Users/encarv/` paths** remain anywhere in the file

### requirements.txt

Three production dependencies, minimum versions pinned:
```
requests>=2.31
openpyxl>=3.1
pdfplumber>=0.10
```

### README.md

French documentation with proper accents covering:
1. Prérequis (Python 3.10+, pip install, PDFs facultatifs)
2. Commandes de mise à jour (mode Excel seul et mode Excel+PDFs)
3. Tableau des fichiers produits (at-data.json, mp-data.json, trajet-data.json)
4. Fréquence de mise à jour (annuelle, renvoi à la nouvelle publication ameli.fr)
5. Sources de données avec URLs ameli.fr complètes
6. Section "Parsing PDF seul" pour utilisation standalone de parse_pdf.py

## Decisions Made

1. **argparse obligatoire (--pdf-dir required):** PDF_DIR n'est pas optionnel pour éviter les exécutions silencieuses sans données démographiques. Si l'utilisateur veut ignorer les PDFs, il passe par `refresh_data.py` sans `--pdf-dir`.
2. **`parse_all_pdfs()` conserve l'interface explicite** (paramètre positionnel `pdf_dir: Path`) pour être compatible avec l'appel depuis `refresh_data.py`.
3. **README bilingue mode:** documente les deux modes (Excel seul vs. Excel+PDFs) car le README est la porte d'entrée principale pour l'utilisateur.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

### Files verified:
- [x] data/pipeline/parse_pdf.py - EXISTS
- [x] data/pipeline/requirements.txt - EXISTS
- [x] data/pipeline/README.md - EXISTS

### Commits verified:
- [x] 356eff5 - parse_pdf.py
- [x] 47defcf - requirements.txt + README.md

### Criteria verified:
- [x] `python3 -c "import ast; ast.parse(...)"` passes
- [x] parse_pdf.py contains `argparse` and `--pdf-dir`
- [x] No `/Users/encarv` in parse_pdf.py
- [x] requirements.txt contains requests, openpyxl, pdfplumber
- [x] README.md contains Prérequis and Fréquence sections with French accents

## Self-Check: PASSED
