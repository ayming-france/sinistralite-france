---
phase: 05-pipeline-de-donn-es
plan: 01
subsystem: infra
tags: [python, openpyxl, ameli, pipeline, json, xlsx]

requires:
  - phase: none
    provides: n/a

provides:
  - "data/pipeline/refresh_data.py : script autonome de telechargement Excel ameli.fr et generation JSON"
  - "JSON output vers data/ (at-data.json, mp-data.json, trajet-data.json)"
  - "Integration PDF optionnelle via --pdf-dir CLI arg"

affects: [05-pipeline-de-donn-es/05-02]

tech-stack:
  added: [openpyxl, subprocess/curl, argparse]
  patterns:
    - "PIPELINE_DIR/OUTPUT_DIR separation : scripts dans data/pipeline/, JSON dans data/"
    - "write_json() sans pickle : JSON seul comme format de sortie"
    - "PDF optionnel via try/except ImportError + CLI --pdf-dir"

key-files:
  created:
    - data/pipeline/refresh_data.py
  modified: []

key-decisions:
  - "naf38 supprime des sorties JSON (aucune reference dans le dashboard JS confirme par grep)"
  - "AT 2021 secondary download conserve : fournit les colonnes de causes de risque (col. 20-31) absentes du format 2023"
  - "PDF/Trajet rendu entierement optionnel : sans --pdf-dir, AT et MP JSON sont generes seuls"
  - "PIPELINE_DIR = Path(__file__).parent, OUTPUT_DIR = PIPELINE_DIR.parent pour separation pipeline/data"

patterns-established:
  - "Pattern separation pipeline/output : scripts dans sous-dossier, artefacts JSON un niveau au-dessus"
  - "Pattern PDF optionnel : try/except ImportError + verification dossier + message clair a l'utilisateur"

requirements-completed: [PIPE-01, PIPE-02]

duration: 4min
completed: 2026-02-28
---

# Phase 5 Plan 01: Pipeline de donnees (refresh_data.py) Summary

**Pipeline Python autonome adapte du projet BPO : telechargement Excel ameli.fr via curl, generation at-data.json et mp-data.json dans data/, PDF et Trajet optionnels via --pdf-dir**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-28T07:42:22Z
- **Completed:** 2026-02-28T07:46:19Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Script refresh_data.py adapte de /Users/encarv/.claude/bpo/data/refresh_data.py (1157 lignes source)
- Chemins corriges : PIPELINE_DIR/OUTPUT_DIR, JSON dans data/, Excel temporaires dans data/pipeline/
- Pickle supprime entierement (import + .pkl paths + write_outputs remplace par write_json)
- Agregation by_naf38 supprimee (confirmee non utilisee dans dashboard par grep)
- Integration PDF rendue optionnelle avec --pdf-dir CLI arg et try/except ImportError clair
- AT 2021 conserve avec commentaire expliquant la necessite (causes de risque colonnes 20-31)

## Task Commits

1. **Task 1: Copier et adapter refresh_data.py** - `df31e26` (feat)

**Plan metadata:** a venir (docs: complete plan)

## Files Created/Modified

- `data/pipeline/refresh_data.py` - Pipeline principal : telechargement Excel + generation JSON AT/MP/Trajet

## Decisions Made

- naf38 supprime des sorties JSON : grep sur dashboard JS confirme aucune reference `by_naf38`
- AT 2021 conserve : les colonnes de causes de risque (col. 20-31) de l'Excel 2021 sont necessaires pour les graphiques
- PDF rendu optionnel : permet de generer AT+MP sans avoir les PDFs NAF (usage courant)
- argparse avec --pdf-dir : standard Python, lisible, extensible

## Deviations from Plan

None - plan executed exactly as written.

Note: `naf38` apparait dans AT_COL et MP_COL comme cles de dictionnaire de colonnes (pour reference aux indices 6 et 4 dans l'Excel). Ce sont des references de navigation dans l'Excel, pas de la logique de construction by_naf38. La suppression de by_naf38 est complete.

## Issues Encountered

None.

## User Setup Required

None - pipeline s'execute en local, aucun service externe requis.

## Next Phase Readiness

- refresh_data.py pret pour plan 02 (adaptation parse_pdf.py)
- Plan 02 devra adapter parse_all_pdfs() pour accepter pdf_dir comme argument
- Actuellement, refresh_data.py appelle parse_all_pdfs(pdf_dir) - parse_pdf.py doit etre adapte en consequence

---
*Phase: 05-pipeline-de-donn-es*
*Completed: 2026-02-28*
