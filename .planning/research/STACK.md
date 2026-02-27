# Stack Research

**Domain:** Live French open data integration for a vanilla JS static dashboard
**Researched:** 2026-02-27
**Confidence:** HIGH (core findings verified with live API tests and official docs)

## Context

This is a subsequent-milestone addition to an existing vanilla JS dashboard deployed on GitHub Pages.
The existing stack (vanilla JS ES modules, Chart.js 4.4.7, no build step, CDN dependencies) is fixed.
This research covers only what is needed to add live datagouv queries.

The data source is **not** a datagouv dataset. It is ameli.fr Excel files downloaded directly from
predictable URLs (pattern: `https://assurance-maladie.ameli.fr/sites/default/files/{year}_Risque-AT-CTN-x-NAF_serie%20annuelle.xlsx`).
The datagouv MCP server provides discovery and metadata tools but the actual sinistralite data
lives on ameli.fr, not on data.gouv.fr.

---

## The Core Problem: Browser Cannot Call MCP Directly

The datagouv MCP server at `https://mcp.data.gouv.fr/mcp` uses Streamable HTTP transport
(verified: 200 OK with `text/event-stream` response on POST). It does NOT return CORS headers
(verified: live OPTIONS request returned 403 with no `Access-Control-Allow-Origin`).
A browser JavaScript client on GitHub Pages cannot call it directly.

Three possible approaches:

1. **Cloudflare Worker as MCP proxy** (recommended)
2. **Call datagouv REST API directly** (CORS confirmed, no MCP needed)
3. **Supabase Edge Function as MCP proxy** (over-engineered for this use case)

---

## Recommended Stack

### Approach: Hybrid REST + Caching

Do not proxy the MCP server. Call the datagouv REST API directly from the browser (CORS confirmed),
and serve the processed AT/MP Excel data as pre-built JSON via GitHub Actions (not live Excel parsing).

This avoids a proxy entirely for the primary use case while using MCP only for discovery tasks
that run at build time (GitHub Actions) rather than at user request time.

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| datagouv REST API | v1 (current) | Discover datasets, get metadata, search | CORS enabled, no auth required, browser-callable directly; verified live: returns `Access-Control-Allow-Origin` header |
| datagouv Tabular API | beta (current) | Query tabular resources by filter | CORS enabled (verified 404 returns CORS headers); REST, no JSON-RPC; paginated JSON |
| GitHub Actions | N/A | Scheduled data refresh pipeline | Runs server-side Python script from existing BPO project; outputs pre-built JSON to repo; free for public repos |
| Cloudflare Workers | free tier | MCP proxy (only if MCP tool calls are needed from browser at runtime) | 100k requests/day free; 10ms CPU/request; workers.dev subdomain available; no custom domain needed |

### When Each Approach Applies

**Approach A: Direct REST (no proxy needed)**
Use for: checking dataset metadata, discovering resource IDs, confirming update dates.
How: `fetch('https://www.data.gouv.fr/api/1/datasets/{id}/')` from the browser.
Status: CORS confirmed, works today.

**Approach B: GitHub Actions pre-build pipeline**
Use for: processing the 9.2 MB Excel files into JSON (requires Python + openpyxl).
How: schedule a daily or weekly GitHub Actions workflow that runs `refresh_data.py` and commits updated JSON files to the repo.
Status: existing `refresh_data.py` in `~/.claude/bpo/data/` already implements this.

**Approach C: Cloudflare Worker MCP proxy**
Use for: browser-side MCP tool calls (e.g., `query_resource_data` or `search_datasets` at runtime).
How: Worker receives `fetch` from browser, adds CORS headers, proxies to `https://mcp.data.gouv.fr/mcp`.
Status: straightforward; official CORS proxy example exists in Cloudflare Workers docs.

For this milestone, Approach A + B covers all requirements. Approach C is only needed if live MCP tool calls from the browser are required for a feature that cannot be pre-built.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SheetJS (xlsx) | 0.18.5 | Parse XLSX in browser or Node.js | Only if moving Excel parsing to browser; avoid for 9.2 MB files, use Node/Python at build time instead |
| `@modelcontextprotocol/sdk` | 1.x | Official MCP TypeScript SDK for building the Cloudflare Worker proxy | Only if implementing Approach C; not needed for Approach A+B |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Wrangler CLI | Deploy and test Cloudflare Workers | `npm install -g wrangler`; requires Cloudflare account (free); generates `wrangler.jsonc` |
| GitHub Actions | Scheduled data refresh | YAML workflow in `.github/workflows/`; use `actions/cache` v4 for Python deps |
| cURL | Verify CORS headers before writing code | Use `-D -` to show response headers; repeat after any API changes |

---

## Verified API Facts

### datagouv REST API (`www.data.gouv.fr/api/1/`)

- **CORS:** Enabled. Returns `Access-Control-Allow-Origin: <origin>` and `Access-Control-Allow-Credentials: true`. Verified live.
- **Auth:** None required for read-only public data.
- **Rate limits:** No `X-RateLimit-*` headers observed in responses. No documented public rate limit. Treat as best-effort; add exponential backoff.
- **Response format:** JSON.
- **Useful endpoints:**
  - `GET /datasets/{id}/` — dataset metadata, list of resources with IDs and URLs
  - `GET /datasets/?q={query}&page_size={n}` — full-text search
  - `GET /organizations/{slug}/datasets/` — datasets by organization

### datagouv Tabular API (`tabular-api.data.gouv.fr/api/`)

- **CORS:** Enabled on 4xx responses (verified). Assumed enabled on 2xx (same nginx config).
- **Auth:** None.
- **Endpoints:**
  - `GET /resources/{rid}/data/?page_size={n}&{col}__exact={val}` — paginated, filtered data
  - `GET /resources/{rid}/profile/` — column types and stats
- **Pagination:** Default 20 rows, max 50 per request.
- **Filter operators:** exact, contains, notcontains, in, notin, less, greater, strictly_less, strictly_greater.
- **Aggregations:** Disabled by default on the public instance.
- **Note:** Only works for CSV/XLSX resources that have been indexed by datagouv. The ameli.fr Excel files are NOT on datagouv and therefore NOT accessible via the Tabular API.

### datagouv MCP Server (`mcp.data.gouv.fr/mcp`)

- **Protocol:** Streamable HTTP (MCP spec 2025-03-26). SSE not supported. STDIO not supported.
- **CORS:** NOT enabled. Browser calls blocked. Verified: OPTIONS returns 403 with no CORS headers.
- **Auth:** None required.
- **Session:** Stateful; server returns `Mcp-Session-Id` header on initialize; must be included in subsequent requests.
- **Version:** `data.gouv.fr MCP server v1.26.0` (verified live).
- **Tools available:** `search_datasets`, `get_dataset_info`, `list_dataset_resources`, `get_resource_info`, `query_resource_data`, `download_and_parse_resource`, `search_dataservices`, `get_dataservice_info`, `get_dataservice_openapi_spec`, `get_metrics`.
- **Conclusion:** Cannot be called from browser. Must use server-side code (GitHub Actions, Cloudflare Worker, or local script).

### ameli.fr Excel Files

- **URL pattern:** `https://assurance-maladie.ameli.fr/sites/default/files/{year}_Risque-AT-CTN-x-NAF_serie%20annuelle.xlsx`
- **CORS:** Unknown (WebFetch returned binary content; live curl not available). Assume blocked (government site, no public API).
- **Update frequency:** Annual. 2023 data published 2024. 2024 data published November 2025.
- **Format:** XLSX with multi-sheet structure (one sheet per CTN sector). Processed by existing `refresh_data.py`.
- **Conclusion:** Download at build time (GitHub Actions), not at runtime (browser).

---

## Cloudflare Workers: Free Tier Limits

Relevant for Approach C (MCP proxy):

| Limit | Free Tier | Notes |
|-------|-----------|-------|
| Requests/day | 100,000 | Resets at 00:00 UTC; error 1027 when exceeded |
| CPU time/request | 10ms | Sufficient for a simple HTTP proxy with no computation |
| Memory | 128 MB | More than enough for a proxy |
| Worker size (compressed) | 3 MB | MCP proxy will be well under 1 MB |
| Workers KV reads/day | 100,000 | For caching MCP responses |
| Workers KV writes/day | 1,000 | Sufficient for annual data |
| Workers KV storage | 1 GB | More than enough for JSON cache |
| Subdomain | `{name}.{account}.workers.dev` | No custom domain required |

The free tier is sufficient. A public dashboard will not generate 100k MCP proxy requests/day.

---

## Caching Strategy

Data updates annually. Aggressive caching is correct.

### For pre-built JSON (Approach B — recommended)

The JSON files are committed to the repo and served by GitHub Pages. GitHub Pages serves static files with `Cache-Control: max-age=600` (10 minutes) by default, which cannot be overridden without a proxy. For annual data this is irrelevant: the files change once per year when a GitHub Actions run commits new JSON.

**Recommendation:** Use the existing `fetch()` pattern in `js/data.js` with an in-memory cache (already implemented as `DATASETS`). Do not add localStorage caching for the full 9.2 MB JSON: it exceeds typical localStorage limits (5 MB per origin).

### For REST API metadata (Approach A — dataset discovery)

Cache dataset metadata in memory for the session. A `Map` keyed by dataset ID, populated on first fetch, is sufficient. No localStorage, no service worker.

### For Cloudflare Workers KV (Approach C — MCP proxy)

If implementing the Worker proxy, cache MCP responses in Workers KV:
- Key: hash of the tool name + arguments
- TTL: 7 days (data is annual; weekly refresh is generous)
- Benefit: avoids re-calling MCP for identical queries; 100k KV reads/day free

```javascript
// Pattern for KV-cached MCP proxy in Cloudflare Worker
const cacheKey = `mcp:${toolName}:${JSON.stringify(args)}`;
const cached = await env.CACHE.get(cacheKey);
if (cached) return new Response(cached, { headers: corsHeaders });
const result = await callMcpTool(toolName, args);
await env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 604800 }); // 7 days
return new Response(JSON.stringify(result), { headers: corsHeaders });
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| GitHub Actions pre-build pipeline | Live browser Excel download | Never: ameli.fr Excel files are 9+ MB and likely CORS-blocked; parsing XLSX in the browser requires SheetJS and is slow |
| Direct datagouv REST API (CORS OK) | Cloudflare Worker proxy for REST | Only if datagouv removes CORS support (unlikely) |
| Cloudflare Worker for MCP proxy | Supabase Edge Functions | Supabase requires a project, database, and 500k/month limit vs 100k/day Cloudflare; Cloudflare is simpler for a pure proxy |
| Cloudflare Worker for MCP proxy | Netlify Functions | Netlify requires moving from GitHub Pages; Cloudflare is a smaller footprint addition |
| Workers KV for MCP cache | Cloudflare R2 | R2 is for large binary objects; KV is correct for small JSON cache entries |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| SheetJS in browser | Parsing 9 MB XLSX client-side blocks the UI thread; ameli.fr files likely CORS-blocked anyway | Python `openpyxl` in GitHub Actions (already works in `refresh_data.py`) |
| Service Worker for offline cache | Adds significant complexity for a public dashboard; data is annual, not real-time | In-memory `DATASETS` object (already implemented) |
| Supabase for proxy | Requires database project, overkill for a stateless HTTP proxy | Cloudflare Workers (stateless, free, simpler) |
| Fetch datagouv MCP directly from browser | No CORS headers; will fail in production | Either direct REST API or Cloudflare Worker proxy |
| `@latest` CDN tags | `lucide@latest` already flagged as risk in TECH.md; avoid for any new dependency | Pin explicit versions (e.g., `@modelcontextprotocol/sdk@1.x`) |
| `localStorage` for 9 MB JSON | localStorage limit is 5 MB per origin; JSON files exceed this | In-memory cache only (existing pattern is correct) |

---

## Stack Patterns by Variant

**If only dataset metadata is needed at runtime (checking last update date, resource IDs):**
- Call `https://www.data.gouv.fr/api/1/datasets/{id}/` directly from the browser
- No proxy needed; CORS confirmed

**If full sinistralite data must be live (not pre-built):**
- Cloudflare Worker fetches ameli.fr Excel at request time (server-side, no CORS issue)
- Worker parses with a WASM port of xlsx, caches result in Workers KV for 24h
- Returns filtered JSON to browser
- CPU limit (10ms/request) makes this risky; consider a pre-build approach instead

**If MCP tool calls are needed at browser runtime:**
- Deploy Cloudflare Worker that adds CORS headers and proxies to `https://mcp.data.gouv.fr/mcp`
- Worker handles MCP session lifecycle (initialize, maintain Mcp-Session-Id, tool calls)
- Cache responses in Workers KV with 7-day TTL

**If data must update more frequently than annually:**
- This does not apply: CNAM/ameli.fr publishes BPO data once per year
- Annual GitHub Actions refresh is exactly the right cadence

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| MCP spec 2025-03-26 | `mcp.data.gouv.fr/mcp` v1.26.0 | Server confirmed on this protocol version |
| Chart.js 4.4.7 | chartjs-plugin-datalabels 2.2.0 | Existing pinned versions; do not change |
| Cloudflare Workers free | Wrangler 3.x | Wrangler 3 is current; do not use Wrangler 1 or 2 |

---

## Installation

No npm packages are needed for Approach A (direct REST) or Approach B (GitHub Actions pre-build).

For Approach C (Cloudflare Worker MCP proxy) only:

```bash
# In a separate workers/ directory (not in the main project)
npm init -y
npm install @modelcontextprotocol/sdk@1
npm install -D wrangler@3

# Deploy
npx wrangler deploy
```

The Cloudflare Worker is a separate deployment artifact, not part of the main static site.

---

## Sources

- Live verification: `curl -D - https://mcp.data.gouv.fr/mcp` (POST InitializeRequest) — confirmed Streamable HTTP, no CORS headers, MCP session ID issued, server version 1.26.0
- Live verification: `curl -D - -H "Origin: https://ayming-france.github.io" https://www.data.gouv.fr/api/1/datasets/?q=...` — confirmed CORS enabled on datagouv REST API
- [MCP Transports specification (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) — Streamable HTTP protocol definition, browser requirements, session management
- [datagouv MCP GitHub (datagouv/datagouv-mcp)](https://github.com/datagouv/datagouv-mcp) — confirmed: Streamable HTTP only, no CORS, no auth required, 11 tools
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/) — 100k req/day, 10ms CPU, 128 MB memory
- [Cloudflare Workers KV limits](https://developers.cloudflare.com/kv/platform/limits/) — 100k reads/day, 1k writes/day, 1 GB storage
- [Cloudflare Workers CORS proxy example](https://developers.cloudflare.com/workers/examples/cors-header-proxy/) — confirmed pattern for CORS proxy
- [datagouv Tabular API (api-tabular GitHub)](https://github.com/datagouv/api-tabular) — filter operators, pagination, response format
- [FastMCP CORS issue #840](https://github.com/jlowin/fastmcp/issues/840) — confirms browser MCP calls blocked without explicit CORS middleware
- [bpo/data/refresh_data.py](file:///Users/encarv/.claude/bpo/data/refresh_data.py) — confirmed ameli.fr Excel URL patterns

---

*Stack research for: datagouv live data integration (sinistralite dashboard)*
*Researched: 2026-02-27*
