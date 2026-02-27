# Project Research Summary

**Project:** Sinistralité France — dashboard open data AT/MP/Trajet
**Domain:** Static SPA dashboard migrating from pre-built JSON to live open data API
**Researched:** 2026-02-27
**Confidence:** HIGH (stack and architecture verified with live API calls; features from official RGAA sources; pitfalls from official datagouv GitHub issues)

## Executive Summary

This project is an upgrade of an existing vanilla JS dashboard that currently serves French workplace accident statistics (sinistralité AT/MP/Trajet) from pre-built JSON files. The data source is ameli.fr Excel files processed by an existing Python pipeline. The upgrade has two distinct workstreams: (1) a "polish" pass to bring the dashboard to production quality, covering accessibility (RGAA 4.1 compliance), mobile navigation, loading states, and metadata; and (2) a "live data" migration that replaces the 9.2 MB static JSON files with live queries. These workstreams have different risk profiles and the polish pass should ship first.

The recommended architecture is a thin Cloudflare Worker acting as a REST-to-JSON-RPC adapter in front of the datagouv MCP server. The browser calls the Worker via a plain REST endpoint (CORS-safe); the Worker proxies to `mcp.data.gouv.fr/mcp` using JSON-RPC 2.0 and caches responses at the edge. For cases where only dataset metadata is needed, the datagouv REST API is CORS-enabled and can be called directly from the browser without any proxy. The existing GitHub Actions pipeline for Excel processing remains the correct approach for the raw sinistralité data, since those files live on ameli.fr (not on data.gouv.fr) and cannot be reached via the datagouv MCP.

The main risks are: the Cloudflare free-tier CPU limit (10 ms per request) may be too tight if the Worker does any JSON transformation beyond simple forwarding; the datagouv Tabular API has a documented, open encoding bug that corrupts French accented characters; and static JSON must not be removed until live data is validated on 50+ NAF codes. All three risks have documented mitigation strategies and none are blockers, but each must be tested before the static JSON is decommissioned.

## Key Findings

### Recommended Stack

The existing stack (vanilla JS ES modules, Chart.js 4.4.7, no build step, CDN dependencies, GitHub Pages) is fixed and will not change. The addition for live data integration is a single-file Cloudflare Worker deployed on the free tier, callable at a `workers.dev` subdomain. No npm packages are needed for the static site. The Worker itself needs no dependencies if it stays a thin proxy. If MCP session management becomes complex, `@modelcontextprotocol/sdk@1.x` can be added to the Worker build only.

Direct datagouv REST API calls from the browser (for metadata and dataset discovery) are CORS-enabled and require no proxy. The datagouv Tabular API is also CORS-enabled and supports filtered, paginated queries, but it only indexes resources hosted on data.gouv.fr. The ameli.fr Excel files are not on data.gouv.fr and therefore not accessible via the Tabular API. Those must continue to be processed by the GitHub Actions pipeline.

**Core technologies:**
- Datagouv REST API v1: dataset metadata discovery, CORS-enabled, no auth, browser-callable directly
- Datagouv MCP Server v1.26.0: full data queries via Streamable HTTP/JSON-RPC 2.0, no CORS, Worker-only
- Cloudflare Workers (free tier): CORS proxy + REST-to-JSON-RPC adapter, 100k requests/day, 10 ms CPU/request
- GitHub Actions: scheduled pre-build pipeline for ameli.fr Excel files, outputs JSON to repo, already implemented
- Wrangler CLI 3.x: Cloudflare Worker deployment tooling

### Expected Features

The dashboard already has a strong feature set (NAF search, 6 chart types, 3 views, deep linking, dark mode, print styles). This milestone adds production quality and live data, not new analytical features.

**Must have (table stakes):**
- Loading states and fetch error messages — required before live data migration; currently absent
- Navigation mobile alternative (bottom tab bar or hamburger) — nav rail disappears at 768px with no fallback
- ARIA attributes on interactive components (nav, search dropdown, drawers) — RGAA 4.1 legal obligation
- Skip-to-content link — required for keyboard users; currently absent
- Alternative text for Chart.js canvases — screen reader compliance, RGAA 4 requirement
- Data source attribution (footer/about section) — required for Licence Ouverte v2.0 reuse
- Favicon + Open Graph tags — basic production hygiene; currently absent
- Corrected French accents (12 occurrences identified in source code) — project-wide requirement
- localStorage key unification between dashboard and landing page

**Should have (competitive):**
- Export CSV for the current sector view — analysts expect this; moderate effort
- Accessibility declaration (déclaration d'accessibilité) — required after RGAA fixes are in place
- Color contrast fixes (CSS variables) — several elements below WCAG AA 4.5:1 threshold
- Live data via datagouv MCP + Cloudflare Worker proxy — replaces 9.2 MB static JSON
- Lazy loading per view (load at-data.json only when AT view is active) — required for live data performance

**Defer (v2+):**
- Multi-sector comparison (high complexity, partial SPA refactor)
- "Consultant mode" with estimated cost ratios
- Extended permalink (year + indicator in hash)
- Interactive multi-year trend with indicator toggle

### Architecture Approach

The architecture adds a single new deployment artifact (Cloudflare Worker) between the static SPA and the datagouv MCP server. Only `js/data.js` changes in the existing SPA; all other modules (`app.js`, `kpi.js`, `charts.js`, `insights.js`, etc.) remain unchanged. The Worker exposes a simple REST endpoint that the browser calls with `?tool=X&args=Y` query parameters. The Worker handles CORS, edge caching (1h TTL via `Cache-Control: s-maxage=3600`), MCP session management, and JSON-RPC envelope unwrapping. A three-layer cache (in-memory in `data.js` > browser HTTP cache > Cloudflare edge cache) ensures repeat queries for the same NAF code are served at zero latency.

**Major components:**
1. Browser SPA (`js/*.js` on GitHub Pages) — renders charts, manages state, calls Worker for data
2. `js/data.js` (data layer, modified) — issues fetch to Worker, maintains in-memory `QUERY_CACHE` Map
3. Cloudflare Worker (`worker/worker.js`, new) — CORS, edge cache, REST-to-JSON-RPC translation, response normalisation
4. datagouv MCP Server (external) — executes dataset queries, called only from Worker
5. GitHub Actions pipeline (existing) — processes ameli.fr Excel files, commits pre-built JSON fallback

### Critical Pitfalls

1. **Schema rupture silencieuse de l'API tabulaire** — datagouv columns can be renamed without notice when the source file changes. Add a `normalizeATRow()` adapter layer immediately; never hardcode column names in render logic. Detect `NaN`/`undefined` KPIs as schema-change indicators.

2. **Cloudflare Worker CPU limit (10 ms)** — JSON-RPC marshalling may exceed the free-tier CPU budget. Keep the Worker as a thin forwarder with no data transformation. Validate in production on the `workers.dev` URL, not just in `wrangler dev` (local has no CPU limit). Budget $5/month for Workers Paid if needed.

3. **Encodage UTF-8 corrompu dans l'API tabulaire** — documented open bug (forum datagouv, February 2026): accented characters appear as `Ã©` or `?`. Test accent integrity (é, è, ê, à, ç) in raw API JSON before decommissioning static JSON. Fall back to `download_and_parse_resource` if encoding is corrupt.

4. **Suppression prématurée des JSON statiques** — removing `at-data.json`, `mp-data.json`, `trajet-data.json` before live data is fully validated risks regression with no fallback. Implement a feature flag (`USE_LIVE_DATA`) and validate on 50+ NAF codes across all divisions before removal.

5. **Pas d'état de chargement** — the current codebase has no `.catch()` on fetch calls and no loading state. This is a silent failure mode that becomes visible and broken the moment network latency is introduced by live API calls. Fix this before enabling live data.

## Implications for Roadmap

Based on research, the dependency graph strongly dictates a two-track approach: polish first, live data second. The live data migration depends on loading states being in place, which depends on error handling patterns being established. Removing static JSON depends on live data being validated, which depends on the Worker being stable.

### Phase 1: Polish et qualité production

**Rationale:** The dashboard has strong analytical features but is missing basic production-quality signals (loading states, error handling, mobile nav, accessibility). These are P1 blockers that affect all users today and are prerequisites for the live data migration. They also represent legal obligations (RGAA 4.1) that carry financial penalties. This phase has no external dependencies and can ship immediately.

**Delivers:** A production-quality dashboard ready for public launch. All P1 features from FEATURES.md.

**Addresses:**
- Loading states and fetch error messages (currently silent failures)
- Navigation mobile alternative (bottom tab bar or hamburger menu)
- ARIA on nav, search dropdown, drawers
- Skip-to-content link
- Chart.js canvas alternative text
- Data source attribution
- Favicon + Open Graph tags
- French accent corrections (12 occurrences)
- localStorage key unification

**Avoids:** Anti-pattern 3 (no loading state during fetch), UX pitfall (no error message on fetch failure), mobile navigation pitfall.

### Phase 2: Accessibilité et conformité RGAA

**Rationale:** After loading states and interactive ARIA are in place (Phase 1), the remaining accessibility work (color contrast, accessibility declaration) requires a measurable compliance rate to be published honestly. This phase should follow Phase 1 closely, not be bundled with it, to allow testing the Phase 1 ARIA work before committing to a published conformity rate.

**Delivers:** Published accessibility declaration with a credible conformity rate; CSV export; color contrast fixes.

**Addresses:**
- Export CSV (P2)
- Déclaration d'accessibilité (requires P1 ARIA work)
- Color contrast corrections (CSS variables)

**Uses:** Existing CSS variable system; no new dependencies.

**Implements:** No architecture changes; purely frontend quality improvements.

### Phase 3: Cloudflare Worker scaffold

**Rationale:** Before touching `data.js`, deploy and validate the Worker in isolation. This is the highest-risk component (CPU limits, CORS configuration, MCP session management). It must be verified against the live `workers.dev` URL before any SPA code is changed. The static JSON remains the source of truth during this phase.

**Delivers:** A deployed, tested Cloudflare Worker that can proxy one MCP tool call and return correctly shaped JSON. The SPA is not yet connected.

**Uses:** Cloudflare Workers free tier, Wrangler CLI 3.x, `@modelcontextprotocol/sdk@1.x` (optional).

**Implements:** Architecture Pattern 1 (REST-over-MCP Adapter), Architecture Pattern 2 (Two-Layer Caching).

**Avoids:** Pitfall 2 (CPU limit — test in production on workers.dev, not only locally), Anti-pattern 1 (calling MCP directly from browser).

### Phase 4: Migration vers données live

**Rationale:** With the Worker validated and loading states in place (Phases 1 and 3), `js/data.js` can be modified to call the Worker. The static JSON is kept as a fallback behind a feature flag. This phase ends only when 50+ NAF codes across all divisions are validated and the feature flag is confirmed to restore static behavior correctly.

**Delivers:** Live data from datagouv MCP replacing pre-built JSON; lazy loading per view; full error handling end-to-end.

**Addresses:**
- Données live via datagouv MCP (P2)
- Lazy loading par vue (P2)

**Uses:** Cloudflare Worker from Phase 3; existing GitHub Actions pipeline as fallback.

**Implements:** Architecture Pattern 3 (Module-scope in-memory cache), Build Order steps 3-7 from ARCHITECTURE.md.

**Avoids:** Pitfall 1 (schema rupture — normalizeATRow adapter), Pitfall 3 (UTF-8 encoding — smoke test before decommission), Pitfall 4 (premature static JSON removal — feature flag + 50-code validation).

### Phase 5: Fonctionnalités analytiques avancées (v2)

**Rationale:** Only after live data is stable and the dashboard is at production quality should new analytical features be added. These are high-complexity features (multi-sector comparison requires partial SPA refactor) that should not compete for attention with reliability work.

**Delivers:** Multi-sector comparison, consultant mode, extended permalink, interactive trend toggle.

**Addresses:** All P3 features from FEATURES.md.

**Avoids:** Over-engineering before the foundation is solid.

### Phase Ordering Rationale

- **Polish before live data:** Loading states and error handling are prerequisites for live data. Shipping live data without them produces a broken user experience on cache miss.
- **Worker before SPA modification:** The Worker is an external deployment with its own failure modes (CPU limits, CORS config). Validating it in isolation prevents debugging two changes at once (Anti-pattern 4 from ARCHITECTURE.md).
- **Accessibility declaration after ARIA fixes:** Publishing a conformity rate before the fixes are tested would be inaccurate and legally problematic.
- **Feature flag throughout migration:** The coexistence strategy (static + live behind a flag) is the only safe migration path given the 700+ NAF codes that cannot all be tested manually.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Worker scaffold):** CPU budget validation needs a real test on workers.dev with the actual MCP round-trip. The 10 ms limit for JSON-RPC marshalling has not been empirically measured for this specific use case.
- **Phase 4 (Live data migration):** The exact MCP response shape for `query_resource_data` on the CNAM datasets needs inspection before writing the `normalizeATRow()` adapter. The resource IDs for the ameli.fr AT/MP/Trajet datasets on data.gouv.fr need to be confirmed (they may not exist, meaning the MCP cannot serve them at all).

Phases with standard patterns (skip research-phase):
- **Phase 1 (Polish):** All changes are in the existing codebase; patterns (ARIA, skip link, OG tags) are well-documented standards.
- **Phase 2 (RGAA):** RGAA 4.1 criteria are published and deterministic; no novel integration needed.
- **Phase 5 (v2 features):** Defer until Phase 4 is stable; no research needed now.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core findings verified with live curl: MCP no CORS confirmed, datagouv REST API CORS confirmed, Cloudflare limits from official docs |
| Features | MEDIUM | RGAA requirements from official sources (HIGH); dashboard UX patterns from multiple credible sources (MEDIUM); feature gaps from direct code inspection (HIGH) |
| Architecture | HIGH | Cloudflare Workers Cache API and CORS proxy verified against official docs; MCP transport confirmed via GitHub repo and live request |
| Pitfalls | HIGH | CPU limit from official Cloudflare docs; encoding bug confirmed on official datagouv forum (open issue, February 2026); schema rupture documented in datagouv GitHub issue |

**Overall confidence:** HIGH

### Gaps to Address

- **Data availability on datagouv:** The ameli.fr AT/MP/Trajet Excel files may not be indexed as queryable resources on data.gouv.fr. If they are not, the MCP `query_resource_data` tool cannot serve them, and the live data path must use `download_and_parse_resource` or remain on the GitHub Actions pre-build pipeline. This must be confirmed by inspecting the actual dataset resources on data.gouv.fr before Phase 3 begins.

- **MCP response shape:** The shape of a `query_resource_data` response for the CNAM AT dataset is unknown. The `normalizeATRow()` adapter cannot be written until the raw response is inspected. Plan for an exploratory step at the start of Phase 4.

- **Cloudflare Worker CPU budget empirical validation:** The 10 ms CPU limit is confirmed from docs but the actual CPU cost of one MCP round-trip (JSON-RPC serialize + fetch + JSON-RPC deserialize + CORS headers) has not been measured. This is the single biggest technical unknown in the project.

## Sources

### Primary (HIGH confidence)
- Live API verification: `curl -D -` on `mcp.data.gouv.fr/mcp` — confirmed Streamable HTTP, no CORS, MCP v1.26.0
- Live API verification: `curl -D -` on `www.data.gouv.fr/api/1/datasets/` — confirmed CORS enabled
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) — 10 ms CPU, 100k req/day, 50 subrequests
- [Cloudflare Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) — edge caching patterns
- [Cloudflare Workers CORS proxy example](https://developers.cloudflare.com/workers/examples/cors-header-proxy/) — confirmed proxy pattern
- [datagouv/datagouv-mcp GitHub](https://github.com/datagouv/datagouv-mcp) — Streamable HTTP only, no auth, 11 tools
- [RGAA 4.1 — accessibilite.numerique.gouv.fr](https://accessibilite.numerique.gouv.fr/) — official French accessibility standard
- `.planning/codebase/QUALITY.md` — direct code inspection, 12 accent issues, missing ARIA

### Secondary (MEDIUM confidence)
- [datagouv/api-tabular GitHub](https://github.com/datagouv/api-tabular) — pagination 50 rows, disabled aggregations
- [datagouv/data.gouv.fr issue #1861](https://github.com/datagouv/data.gouv.fr/issues/1861) — schema rupture documentation
- [Forum data.gouv.fr — encoding bug](https://forum.data.gouv.fr/t/erreur-de-gestion-de-lencodage-dans-tabular-api-data-gouv-fr-et-explore-data-gouv-fr/338) — open bug confirmed February 2026
- [MCP Transports spec 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) — Streamable HTTP protocol
- [Level Access — France Digital Accessibility Laws](https://www.levelaccess.com/wp-content/uploads/2025/02/France-Digital-Accessibility-Laws.pdf) — RGAA penalties up to EUR 50,000
- [Smashing Magazine — UX strategies for real-time dashboards](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/) — loading state UX patterns
- [Dashboard UX Patterns — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards) — export, error states, accessibility

### Tertiary (LOW confidence)
- [CNAM Sinistralité par secteur](https://www.assurance-maladie.ameli.fr/etudes-et-donnees/sinistralite-atmp-secteur-activite-ctn) — inspected directly; resource IDs on data.gouv.fr not confirmed

---
*Research completed: 2026-02-27*
*Ready for roadmap: yes*
