# Requirements: Sinistralité France

**Defined:** 2026-03-01
**Core Value:** A user can search any NAF sector code and instantly see its accident profile compared to national averages, with clear visual indicators of risk severity.

## v1.1 Requirements

Requirements for regional map feature. Each maps to roadmap phases.

### Pipeline

- [x] **PIPE-05**: Parser extracts AT data by caisse régionale from rapport annuel PDF (Tableau 9), all years 2020-2024
- [x] **PIPE-06**: Parser extracts Trajet data by caisse régionale from rapport annuel PDF (Tableau 17), all years 2020-2024
- [x] **PIPE-07**: Parser handles multi-line caisse names and produces clean regional JSON
- [x] **PIPE-08**: Regional JSON includes effectifs salariés and AT/Trajet counts per caisse per year

### Map Rendering

- [x] **MAP-01**: Inline SVG map of France with identifiable paths per caisse régionale
- [x] **MAP-02**: Choropleth coloring using sequential color scale based on selected metric
- [x] **MAP-03**: Color legend showing scale range and units
- [x] **MAP-04**: Map appears as a section within AT and Trajet views (not a 4th nav tab)
- [x] **MAP-05**: Default year is 2023 (matches sector data)

### Interaction

- [x] **MAP-06**: Desktop tooltip showing region name and stats on hover
- [x] **MAP-07**: AT/Trajet toggle follows the current view (no separate toggle needed)
- [x] **MAP-08**: Discreet year selector (small, not prominent) to switch map year
- [x] **MAP-09**: Sortable region ranking sidebar alongside the map

### Mobile

- [ ] **MAP-10**: Fixed info panel on tap replaces hover tooltip on touch devices
- [x] **MAP-11**: SVG scales responsively without horizontal scroll

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extended Data

- **EDATA-01**: IF by company size (taille d'établissement) per CTN sector
- **EDATA-02**: MP exposure duration demographics
- **EDATA-03**: 23-year historical series (2000-2023) for MP evolution

### Map Enhancements

- **MAPENH-01**: Click-to-detail panel with mini evolution chart per region
- **MAPENH-02**: Animated transitions between years/metrics
- **MAPENH-03**: DOM-TOM inset boxes on the SVG map

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
| MP by caisse régionale | Not available in rapport annuel (only AT and Trajet) |
| IF by company size | Bar chart in PDF (vector graphic), values not extractable as text |
| Map zoom/pan | Overkill for ~16 regions, Leaflet territory |
| Map as 4th nav tab | Breaks existing 3-tab AT/MP/Trajet structure |
| Landing page redesign | Defer until needed |
| User authentication | Public dashboard, no login needed |
| Mobile native app | Responsive web is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-05 | Phase 6 | Complete |
| PIPE-06 | Phase 6 | Complete |
| PIPE-07 | Phase 6 | Complete |
| PIPE-08 | Phase 6 | Complete |
| MAP-01 | Phase 7 | Complete |
| MAP-04 | Phase 7 | Complete |
| MAP-11 | Phase 7 | Complete |
| MAP-02 | Phase 8 | Complete |
| MAP-03 | Phase 8 | Complete |
| MAP-05 | Phase 8 | Complete |
| MAP-06 | Phase 8 | Complete |
| MAP-07 | Phase 8 | Complete |
| MAP-08 | Phase 8 | Complete |
| MAP-09 | Phase 8 | Complete |
| MAP-10 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after roadmap v1.1 creation*
