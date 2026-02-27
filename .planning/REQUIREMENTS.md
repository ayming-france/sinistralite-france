# Requirements: Sinistralité France

**Defined:** 2026-02-27
**Core Value:** A user can search any NAF sector code and instantly see its accident profile compared to national averages, with clear visual indicators of risk severity.

## v1 Requirements

Requirements for polish release. Each maps to roadmap phases.

### Branding

- [x] **BRAND-01**: All French labels display proper accents (12 occurrences in kpi.js, state.js)
- [x] **BRAND-02**: Nav logo and page title show "Sinistralité France"
- [x] **BRAND-03**: Inline SVG favicon appears in browser tab on both index.html and landing.html

### Robustness

- [ ] **ROBUST-01**: User sees a loading skeleton/spinner while data fetches
- [ ] **ROBUST-02**: User sees a clear error message with retry button if data fetch fails
- [x] **ROBUST-03**: Chart.js font references use Lato (not DM Sans which is not loaded)
- [ ] **ROBUST-04**: Dead CSS classes from removed features are cleaned up
- [x] **ROBUST-05**: localStorage theme key is consistent between dashboard and landing page

### Mobile

- [ ] **MOBILE-01**: User can switch between AT/MP/Trajet views on screens under 768px
- [ ] **MOBILE-02**: Nav rail transforms to a usable mobile navigation pattern (bottom bar or hamburger)

### Accessibility

- [ ] **A11Y-01**: All interactive elements (buttons, inputs, links) have aria-labels
- [ ] **A11Y-02**: Drawer open/close is announced to screen readers
- [ ] **A11Y-03**: Skip-to-content link is present for keyboard users

### Export

- [ ] **EXPORT-01**: User can export current sector's KPI data as a CSV file
- [ ] **EXPORT-02**: CSV includes sector code, name, and all displayed KPI values

### Data Pipeline

- [ ] **PIPE-01**: Project contains self-contained data pipeline in `data/pipeline/`
- [ ] **PIPE-02**: Pipeline downloads Excel files from ameli.fr and outputs JSON to `data/`
- [ ] **PIPE-03**: Pipeline parses per-NAF PDF fiches for demographics data
- [ ] **PIPE-04**: Pipeline has a README explaining how to run a data refresh

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extended Data

- **EDATA-01**: IF by company size (taille d'établissement) per CTN sector
- **EDATA-02**: Regional breakdown (caisse régionale) for AT/Trajet
- **EDATA-03**: MP exposure duration demographics
- **EDATA-04**: 23-year historical series (2000-2023) for MP evolution

### Compliance

- **COMPL-01**: RGAA 4.1 accessibility declaration page
- **COMPL-02**: Color contrast meets WCAG AA on all themes

### Features

- **FEAT-01**: Multi-sector comparison (select 2+ NAF codes side by side)
- **FEAT-02**: Data freshness indicator ("données au 2023" badge from live metadata)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live datagouv MCP queries | Sinistralité data is on ameli.fr, not data.gouv.fr |
| Cloudflare Worker proxy | Data is static, no live queries needed |
| Landing page redesign | Defer until needed |
| User authentication | Public dashboard, no login needed |
| Mobile native app | Responsive web is sufficient |
| SIRENE company lookup | Separate app |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BRAND-01 | Phase 1 | Complete (01-01) |
| BRAND-02 | Phase 1 | Complete (01-01) |
| BRAND-03 | Phase 1 | Complete (01-01) |
| ROBUST-01 | Phase 1 | Pending |
| ROBUST-02 | Phase 1 | Pending |
| ROBUST-03 | Phase 1 | Complete (01-01) |
| ROBUST-04 | Phase 1 | Pending |
| ROBUST-05 | Phase 1 | Complete (01-01) |
| MOBILE-01 | Phase 2 | Pending |
| MOBILE-02 | Phase 2 | Pending |
| A11Y-01 | Phase 3 | Pending |
| A11Y-02 | Phase 3 | Pending |
| A11Y-03 | Phase 3 | Pending |
| EXPORT-01 | Phase 4 | Pending |
| EXPORT-02 | Phase 4 | Pending |
| PIPE-01 | Phase 5 | Pending |
| PIPE-02 | Phase 5 | Pending |
| PIPE-03 | Phase 5 | Pending |
| PIPE-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 — BRAND-01/02/03, ROBUST-03/05 completed via plan 01-01*
