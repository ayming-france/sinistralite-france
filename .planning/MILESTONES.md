# Milestones

## v1.0 Sinistralité France (Shipped: 2026-02-28)

**Phases completed:** 5 phases, 7 plans
**Files modified:** 59
**Lines of code:** 7,091 (JS + CSS + HTML + Python)
**Timeline:** 2 days (2026-02-27 to 2026-02-28)
**Git range:** d54b41d..bec0955

**Key accomplishments:**
- SVG favicon, Lato font, skeleton loaders, error handling with retry, dead CSS cleanup
- Bottom tab bar for mobile navigation (AT, MP, Trajet) with synchronized active state
- Skip link, 38 aria-labels in French, focus trap on drawers, :focus-visible styling
- CSV export from Share drawer with UTF-8 BOM, semicolon separator, per-view disabled state
- Python pipeline (refresh_data.py, parse_pdf.py) for autonomous data refresh from ameli.fr

**Tech debt carried forward:**
- Dead import: releaseFocus in app.js (harmless, works internally)
- CSV export pending human verification (download, Excel accents, disabled state)

---

