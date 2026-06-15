# HANDOFF — Sinistralité France, v2 (2024 refresh + enrichment)

Session migrated here from another working dir. Resume the full conversation:

```
cd ~/projects/sinistralite
claude --resume        # pick "Sinistralité 2024 refresh + enrichment (resume)"
# or directly:
claude --resume 202f18ff-9705-4d75-8e3a-ee92bda5d2d8
```

Memories for this work live in this project's Claude memory dir: projects-root-layout,
ameli-naf-pdf-download-script, sinistralite-data-architecture, sinistralite-2024-enrichment.

---

## DONE — data (validated)
- **2024 refresh.** `data/pipeline/refresh_data.py` retargeted to 2024: new AT/MP Excel URLs;
  AT risk-cause columns remapped to the 2024 inline layout (the 2024 file ships causes inline at
  cols 20-31, so the old separate 2021-file workaround was removed); `YEARLY_YEARS` and the
  yearly-header detection (`parse_pdf.py`, the line keyed on the first year token) shifted 2019-2023 → 2020-2024.
- **6-year evolution 2019-2024.** The 2024 fiches only carry 2020-2024, so 2019 was grafted back
  from the prior data; `meta.years` = `["2019".."2024"]` in all three data files.
- **Immutability confirmed.** Overlap years (2020-2023) are ~99.7% identical old-vs-new → future
  refreshes only need to append the new year and graft the years that age out; never re-parse history.
- **Company size → `data/size-data.json`** (692 NAF5). Extracted by VECTOR geometry from the fiche
  bar chart (`data/pipeline/extract_size.py`): bars are measurable rects (green `(0.8,1,0.8)` = part
  accidents, purple `(0.502,0,0.502)` = part salariés); baseline = the 0% tick y; calibration read from
  each chart's own auto-scaling % ticks; band centers anchored on the x-axis "salariés" label tokens.
  100% of extracted sectors pass the sum-to-100% self-check. 37 sectors legitimately have no chart
  (Ameli draws none for tiny sectors). IF per band is derivable as (part_accidents/part_salaries)*sector_IF.
- **Text dims → `data/extra-dimensions.json`** (697 sectors, `data/pipeline/extract_extra.py`):
  siège des lésions, activité physique, modalité de blessure (reused from `parse_pdf.py` functions),
  sex, age, and the MP disease table (positional parse; long disease labels occasionally drop the count,
  the % is always correct).

### Data contracts
- `size-data.json`: `{ "<NAF5>": { "bands": [ {label, part_accidents, part_salaries}, ...6 ] } }`
- `extra-dimensions.json`: `{ "<NAF5>": { sex, age, siege_lesions, activite_physique, modalite_blessure,
  mp_diseases:[{code,libelle,nb,pct,nb_prev}] } }`  (siege/activite/modalite contain a `non_determine` key — see issue #2)

## DONE — app
- Labels flipped to 2024: `js/state.js` sourceLabels (AT/MP/trajet), `index.html` header eyebrow, `js/insights.js` décès line.
- Evolution titles + `meta.years` → 2019-2024. Evolution chart is data-driven by `meta.years` (`js/charts.js` `renderEvolutionCharts`).
- **Company-size view wired** (AT view only, NAF5 only):
  - `js/charts.js` → `renderSizeChart(viewId, bands, sectorIF)` (appended at end of file). Grouped bars + derived IF line; subtitle flags the sur-risque band.
  - `js/app.js` → imports it; `loadSizeData()` fetches `data/size-data.json` at startup (added to the `Promise.all`); `render()` calls it for `viewId==='at'` after `renderDemographics`.
  - `index.html` → `<div class="size-section" id="at-sizeSection">` after the demo-section; `styles/charts.css` has `.size-section`/`.size-sub`.
- Year-switch filter **dropped** per user (confusing because 2024 has dimensions 2023 lacks). The 6-year evolution chart covers trends.

## DONE — app (2026-06-15)
- **Stale 2023 → 2024 sweep (app + landing).** HANDOFF had claimed labels were flipped, but several
  2023 leftovers remained and are now fixed: Trajet evolution heading (`index.html` h3 was "2019 - 2023",
  AT/MP were already 2024); regional map default year (AT + Trajet `active` pill stuck on 2023, and
  `js/map.js DEFAULT_YEAR`) → 2024; CSV export source label (`js/insights.js` "ameli.fr 2023") → 2024;
  map.js JSDoc examples. `landing.html`: badge "Ameli 2023", historique/évolution "2019-2023" (×4),
  "Année : 2023", and "sur 5 ans" (×2) → 2024 / 2019-2024 / "sur 6 ans". Verified via headless Playwright
  (map active=2024, Trajet heading=2019-2024). Selectable 2023 year-buttons correctly retained.
- **Landing trajet claim corrected.** "baisse de 18% sur 5 ans" was stale (matched the 2020 COVID trough);
  real trend is IF 5.1→4.5 = −12% over 2019-2024 → changed to "baisse de 12% depuis 2019" (×2).
  Landing = marketing (see memory [[landing-page-is-marketing]]); illustrative stats OK but must not
  contradict the app.
- **Positionnement IF strip now includes zero-accident sectors.** `js/charts.js` `renderPositionStrip`
  filter changed `if_val > 0` → `nb_salaries > 0`. Rationale: a measured IF=0 (sector has salariés, 0
  accidents) is real signal (the safest sectors, some 700-1000 salariés), not missing data. Only the
  truly empty sectors (0 salariés, IF undefined 0/0) stay excluded. Strip counts: AT 695→725, MP
  651→725, Trajet 669→697. Verified via headless Playwright (title "725 codes NAF", 8421Z now renders).
  Note: strip renders `allIF.length` dots + 5 fixed reference markers (national tick+label, min/max axis,
  current-IF label) — a raw element count is therefore count+5, not a bug.

## DONE — v3 evolution (2026-06-15)
- **Research → roadmap.** 4-axis research (comparable OSH tools, dashboard UX, growth/SEO, AT/MP
  business needs) synthesized into `.planning/ROADMAP.md` "v3 Évolution" backlog (themes A-E).
  **Theme D (Google/SEO) + C4 (lead-capture CTA) ON HOLD** pending lead-magnet strategy (user decision).
- **Comparer view (A1 + A3).** New 4th tab `js/compare.js`: pick up to 4 NAF codes (any level) +
  domain toggle (AT/MP/Trajet); table with "Moyenne nationale" baseline + "x nationale" multiple;
  overlaid IF evolution chart. Wired in state.js (VIEW_CONFIG.compare), nav.js (#compare guard),
  app.js (initCompare), index.html (nav-rail + bottom-nav + view-compare), charts.css. Verified via
  Playwright (adds sectors, baseline, x-multiple, chart, domain switch; no regressions).

## KNOWN FOLLOW-UPS
- **Search synonym gap (small):** NAF labels use official wording ("Activités hospitalières"), so
  common terms ("hôpital", "clinique", "resto") return 0 hits. `normalize()` accent-stripping is fine;
  this needs a small synonym map (hôpital→hospital, resto→restauration, ...) in search.js + compare.js.
- **Next roadmap items (in order):** A4 Explorer/league table, B1 demo mode + guided tour,
  A2 "mon entreprise vs mon secteur" calculator, B2 glossaire métriques, B3 bloc confiance,
  C1/C2/C3 cotisation+ROI+DUERP. (D + C4 blocked on lead magnet.)

## OPEN ISSUES (start here next session)
1. ~~**Size card not visible at NAF5 8710A**~~ **RESOLVED 2026-06-14.** Playwright visual QA (headless
   chromium fallback, MCP not connected) confirmed `#at-sizeSection` renders at 8710A: grouped bars
   (part accidents / part salariés, 6 buckets) + IF line, subtitle flags the 50-99 sur-risque band.
   The earlier non-display was browser cache / below-the-fold, not a code bug. Render path is sound.
2. ~~**"valeur manquante" / unknown category**~~ **RESOLVED 2026-06-14.** Root cause found: it was a junk
   row in the **Excel** KPI table where the establishment's NAF was unrecorded — code literally `xxxxx`
   (NAF5) / `xxxx` (NAF4) / `xx` (NAF2), libellé "Valeur manquante", same 774-salariés pool replicated
   across all 3 levels, absurd IF 1312.7 that topped any ranking. Fixed in two places: (a) **pipeline
   root cause** — new `is_placeholder_naf()` helper in `refresh_data.py`, applied at all 4 NAF parse
   sites, so future refreshes drop it; (b) **current data** — stripped the entries + `naf_index` rows
   from `at-data.json` and `mp-data.json` (trajet was already clean). National KPIs unaffected
   (`meta.national` is precomputed, not summed from `by_naf` at runtime).
3. ~~**injury/disease panel**~~ **DONE 2026-06-15.** Wired `extra-dimensions.json` into the app:
   - AT view: "Nature des accidents" — 3 ranked horizontal bar charts (siège des lésions, activité
     physique, modalité de la blessure). `non_determine` excluded + renormalized to 100% per user rule.
   - MP view: "Maladies professionnelles reconnues" — table (code/libellé/cas/part), filtered to
     diseases with pct>0, sorted. Uses `pct` as source of truth (reliable even when PDF parse drops `nb`).
   - `charts.js` renderInjuryPanel/renderDiseaseTable; `app.js` loadExtraData + render calls (AT/MP,
     NAF5 only — hides at NAF4/NAF2); HTML sections + CSS. Verified via Playwright (4711D 3 charts, 0811Z 6 rows).
4. **Deferred:** statut/contract type (CDI/CDD/intérim) — not text-extractable, needs vector extraction like
   the size chart. **Skipped:** département/territory map (low value, regional data already exists).
5. **Nothing committed/pushed.** `/tmp/at-data.bak.json`, `/tmp/yearly-2019.json`, `/tmp/yearly-old-baseline.json`
   are ephemeral safety copies — may not survive a reboot; re-create from git/pipeline if needed.

## TEST / RESUME
```
cd ~/projects/sinistralite && python3 -m http.server 8765
# open http://localhost:8765/index.html → AT view → search a NAF5 (4711D supermarchés, 8710A EHPAD,
# 8610Z hôpitaux) → scroll past Démographie to the "Sinistralité par taille d'établissement" card.
```
Expected size patterns (sanity): supermarkets peak at 20-99 employees; hospitals/EHPAD at large bands.
Targeting signal: bands where part_accidents > part_salaries = disproportionate risk.

Push when ready (per global git rules): code/backup → `xXencarvXx/sinistralite`;
GitHub Pages → `gh auth switch --user ayming-france` → `git push deploy main` → switch back to `xXencarvXx`.

## KEY FILES
- Pipeline: `data/pipeline/refresh_data.py`, `parse_pdf.py`, `extract_size.py`, `extract_extra.py`
- Data: `data/at-data.json`, `mp-data.json`, `trajet-data.json`, `regional-data.json`, `size-data.json`, `extra-dimensions.json`
- App: `js/app.js`, `js/charts.js`, `js/state.js`, `js/kpi.js`, `js/insights.js`, `index.html`, `styles/charts.css`
- PDF downloader: `~/projects/bpo/data/download_naf_pdfs.sh`. 2024 fiches: `~/Desktop/Etude-BPO/pdfs_2024/` (729 PDFs).

## YEARLY REFRESH CONTRACT
Each year: `bpo/data/download_naf_pdfs.sh <year> naf_list.txt <outdir>` → re-run
`python refresh_data.py --pdf-dir <outdir>` (bump the Excel URL years + `YEARLY_YEARS`) → graft the older
years that age out of the 5-year fiche window. History is immutable (~99.7% stable) so only the new year matters.
Re-run `extract_size.py` and `extract_extra.py` against the new PDF dir for the new dimensions.
