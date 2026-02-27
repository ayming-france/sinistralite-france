# Architecture Research

**Domain:** Static vanilla JS dashboard with thin backend proxy for live API queries
**Researched:** 2026-02-27
**Confidence:** HIGH (Cloudflare Workers docs verified; datagouv MCP transport verified via GitHub)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (GitHub Pages)                    │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  index.html  │  │   js/*.js   │  │  Browser Cache      │  │
│  │  (entry)    │  │  (SPA logic)│  │  (Cache-Control)    │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘  │
│         │                │                                   │
└─────────┼────────────────┼───────────────────────────────────┘
          │                │  fetch('/api/query?tool=X&args=Y')
          │                ▼
┌──────────────────────────────────────────────────────────────┐
│              Cloudflare Worker (workers.dev)                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  1. CORS preflight handler (OPTIONS)                    │ │
│  │  2. Request parser (tool name + args from query/body)   │ │
│  │  3. Edge cache lookup (caches.default.match)            │ │
│  │  4. MCP JSON-RPC call (POST /mcp upstream)              │ │
│  │  5. Response normaliser (extract .result from JSON-RPC) │ │
│  │  6. Cache write + plain JSON response                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────┬────────────────────────────────────┘
                          │  POST /mcp  (JSON-RPC 2.0)
                          │  {"jsonrpc":"2.0","method":"tools/call",
                          │   "params":{"name":"query_resource_data",...}}
                          ▼
┌──────────────────────────────────────────────────────────────┐
│            datagouv MCP Server (mcp.data.gouv.fr)            │
│                                                              │
│  Streamable HTTP transport — single POST /mcp endpoint       │
│  No authentication required (read-only, public)             │
│  Tools: search_datasets, query_resource_data, etc.          │
└──────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `index.html` + `js/*.js` (Browser SPA) | Render charts, handle user input, manage state | Cloudflare Worker (fetch) |
| `js/data.js` (Data Layer) | Issue fetch calls to Worker, cache responses in module memory | Browser SPA modules, Cloudflare Worker |
| Cloudflare Worker (`worker.js`) | CORS, edge caching, JSON-RPC translation, response normalisation | Browser SPA (inbound), datagouv MCP server (outbound) |
| datagouv MCP Server (`mcp.data.gouv.fr/mcp`) | Execute dataset queries against live French open data | Cloudflare Worker only |
| Browser Cache (HTTP headers) | Avoid redundant Worker fetches for repeated user queries | Controlled by `Cache-Control` headers from Worker |

## Recommended Project Structure

```
/
├── js/
│   ├── data.js          # Modified: calls Worker instead of loading JSON
│   ├── app.js           # Unchanged: render orchestration
│   ├── state.js         # Unchanged: mutable singleton
│   ├── search.js        # Unchanged: autocomplete, code selection
│   ├── kpi.js           # Unchanged: KPI card rendering
│   ├── charts.js        # Unchanged: Chart.js wrappers
│   ├── insights.js      # Unchanged: insights drawer
│   ├── nav.js           # Unchanged: nav rail, theme
│   └── utils.js         # Unchanged: helpers
├── worker/
│   └── worker.js        # New: Cloudflare Worker (single file)
├── data/                # Kept temporarily as fallback during migration
│   ├── at-data.json
│   ├── mp-data.json
│   └── trajet-data.json
├── styles/
│   └── base.css
├── index.html
└── wrangler.toml        # New: Cloudflare deployment config
```

### Structure Rationale

- **`worker/`**: Isolated from frontend. Single file is intentional — the Worker is a thin proxy, not a framework. No dependencies, no build step.
- **`data/` kept**: Serves as fallback while migration is tested. Removed in a later phase once Worker is stable.
- **`wrangler.toml`**: Required for `wrangler deploy`. Lives at repo root alongside the SPA.

## Architectural Patterns

### Pattern 1: REST-over-MCP Adapter

**What:** The Worker exposes a simple REST interface to the browser (`GET /api/query?tool=query_resource_data&dataset=xxx`) and translates it into JSON-RPC 2.0 calls to the datagouv MCP server. The browser never speaks JSON-RPC directly.

**When to use:** When the upstream protocol (MCP JSON-RPC) is not browser-friendly and the frontend is a static SPA that expects plain JSON responses.

**Why:** The datagouv MCP server uses Streamable HTTP transport with JSON-RPC 2.0 (POST /mcp, Content-Type: application/json). Browsers can technically POST JSON-RPC, but this requires the frontend to understand MCP session management, tool schemas, and error formats. Wrapping it in a Worker means the SPA sees a simple REST endpoint and the MCP complexity stays in one place.

**Example:**

```javascript
// worker/worker.js — inbound REST to outbound JSON-RPC

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const tool = url.searchParams.get('tool');
    const args = JSON.parse(url.searchParams.get('args') || '{}');

    // Edge cache check
    const cacheKey = new Request(request.url);
    const cached = await caches.default.match(cacheKey);
    if (cached) return cached;

    // MCP JSON-RPC call
    const mcpResponse = await fetch('https://mcp.data.gouv.fr/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: tool, arguments: args }
      })
    });

    const mcpJson = await mcpResponse.json();
    // Extract plain result from JSON-RPC envelope
    const result = mcpJson.result ?? mcpJson.error;

    const response = new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, max-age=3600',
        ...corsHeaders()
      }
    });

    ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    return response;
  }
};
```

### Pattern 2: Two-Layer Caching (Edge + Browser)

**What:** Responses are cached at two levels: at Cloudflare's edge (via `Cache API`, `s-maxage`) and in the browser (via `max-age` on the same `Cache-Control` header). The Worker sets both values identically. The browser caches the first response and avoids even hitting the Worker on repeat queries.

**When to use:** When data changes infrequently (BPO data is published annually) and the priority is zero-latency repeat queries.

**Trade-offs:**
- PRO: Repeat queries for the same NAF code are served instantly from browser cache, no network.
- PRO: Different users hitting the same Worker PoP get edge-cached responses with no upstream MCP calls.
- CON: Stale data until TTL expires. Acceptable here because BPO data is annual.
- CON: Cache API on `workers.dev` subdomain is local to a single PoP (no global replication). This is fine for this use case.

**TTL recommendation:**
- `s-maxage=3600` (1 hour) at edge: protects the MCP server from burst load.
- `max-age=3600` in browser: avoids repeat Worker calls during a session.
- Use `Cache-Control: no-cache` query param as a manual override for debugging.

### Pattern 3: Module-Scope In-Memory Cache in data.js

**What:** The existing `data.js` already caches loaded datasets in a module-scope `DATASETS` variable. This pattern extends to the live-data path: once a NAF query result is fetched from the Worker, it is stored in a `Map` keyed by `{view}:{code}` and served synchronously on subsequent calls within the same session.

**When to use:** Always. This is the third caching layer (after edge and browser HTTP caches) and prevents redundant `fetch()` calls when the user navigates back to a previously viewed code in the same session.

**Example:**

```javascript
// js/data.js — extend with in-memory result cache
const QUERY_CACHE = new Map();

export async function queryLive(view, code) {
  const key = `${view}:${code}`;
  if (QUERY_CACHE.has(key)) return QUERY_CACHE.get(key);

  const url = `/api/query?tool=query_resource_data&args=${encodeURIComponent(
    JSON.stringify({ dataset_id: DATASET_IDS[view], code })
  )}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Worker error: ${res.status}`);
  const data = await res.json();
  QUERY_CACHE.set(key, data);
  return data;
}
```

## Data Flow

### Request Flow: User Selects a NAF Code

```
User selects code in search autocomplete
    |
    v
search.js: selectCode(viewId, code, level, render)
    |
    v
app.js: render(viewId, code, level)
    |
    v
data.js: queryLive(viewId, code)
    |-- QUERY_CACHE hit? --> return data immediately (no network)
    |-- Browser cache hit? --> fetch() returns from disk (no network)
    |-- Worker cache hit? --> Worker returns edge-cached JSON (no MCP call)
    |-- Cache miss --> Worker calls POST /mcp, caches result, returns JSON
    |
    v
data.js resolves with { kpis, causes, funnel, evolution, ... }
    |
    v
app.js: calls renderKPIs(), renderCausesChart(), renderFunnelChart(), ...
    |
    v
DOM updated, Chart.js instances re-created
```

### Request Flow: Boot Sequence (Live Data Mode)

```
DOMContentLoaded
    |
    v
data.js: loadNafIndex()  -- fetch NAF code labels (light, ~50KB)
    |-- Worker fetches from datagouv MCP: search_datasets or static list
    |-- Cached aggressively (s-maxage=86400, 24h) — labels never change mid-year
    |
    v
search.js: builds autocomplete from naf_index array
    |
    v
nav.js: initNav(), theme restore, renderNationalState()
    |
    v
loadFromHash() -- if URL has #view/code, trigger queryLive() immediately
```

### Key Data Flows

1. **NAF index load:** One Worker request on boot, returns flat array of `{code, libelle, level}`. Long TTL (24h). Populates autocomplete.
2. **Sector query:** One Worker request per code+view combination. 1h TTL. Returns all data needed to render the full view (KPIs, charts, trends).
3. **National averages:** Fetched once per view on boot as part of `renderNationalState()`, same Worker endpoint with `code=national`.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k sessions/day | Single Worker on free plan (100k requests/day). Edge cache handles repeat queries. No changes needed. |
| 1k-50k sessions/day | Free plan suffices if cache hit rate is high (expected >90% because NAF codes are bounded, ~1430 total). Monitor usage. |
| 50k+ sessions/day | Upgrade to Workers Paid ($5/month, 10M requests/month). Consider Cloudflare KV for persistent cross-PoP cache if workers.dev PoP-local cache becomes a bottleneck. |

### Scaling Priorities

1. **First bottleneck:** MCP upstream rate limits or latency. Mitigation: aggressive edge caching (current approach). KV as persistent fallback if needed.
2. **Second bottleneck:** Cloudflare free tier 100k/day limit. Mitigation: browser cache reduces requests by 70-80% for repeat users. Paid tier if volume grows.

## Anti-Patterns

### Anti-Pattern 1: Calling MCP Directly from the Browser

**What people do:** POST JSON-RPC directly from `fetch()` in the SPA to `mcp.data.gouv.fr/mcp`.

**Why it's wrong:** The MCP server does not set CORS headers, so browsers will block the request with a CORS error. Additionally, the frontend would need to implement JSON-RPC session management, error envelope parsing, and MCP tool schemas. This embeds backend protocol knowledge into the SPA and makes the data source hard to swap later.

**Do this instead:** Route all MCP calls through the Worker. The Worker handles CORS, translates REST to JSON-RPC, and returns plain JSON. The SPA stays ignorant of the upstream protocol.

### Anti-Pattern 2: One Worker Request Per Chart

**What people do:** Issue separate fetch calls for KPIs, causes chart, funnel chart, and evolution charts.

**Why it's wrong:** The MCP `query_resource_data` tool can return a full row for a NAF code with all fields in one call. Splitting into multiple requests multiplies latency (each Worker invocation has cold-start + MCP round-trip overhead) and consumes more of the free tier quota.

**Do this instead:** Fetch all data for a NAF code in one Worker call. The Worker makes one MCP request and returns a single JSON object containing all fields. The SPA destructures it into chart inputs.

### Anti-Pattern 3: No Loading State During Fetch

**What people do:** Trigger `queryLive()` and call render functions synchronously, showing stale or empty charts while the network request is in flight.

**Why it's wrong:** The first cache-miss request (cold start) can take 300-800ms. The UI appears frozen or broken. This is a known quality gap in the current codebase (`fetch()` in `data.js` has no `.catch()` and no loading state).

**Do this instead:** Show a skeleton/spinner state before calling `queryLive()`, resolve on success, show an error message on failure. The Worker should return a proper HTTP error code (502, 504) on MCP failure so the SPA can detect and display it.

### Anti-Pattern 4: Replacing Static JSON Before Validating Data Shape

**What people do:** Remove `at-data.json`, `mp-data.json`, `trajet-data.json` immediately and switch to live MCP queries, then discover the MCP response shape differs from the static JSON.

**Why it's wrong:** The MCP `query_resource_data` response structure may not match the pre-processed shape in the static JSON (which was built from Excel in the BPO project). Adapting the entire SPA to a new data shape while also migrating the data source is two changes at once, making debugging harder.

**Do this instead:** Build the Worker and validate its response shape against the expected static JSON structure first. Run both in parallel (feature flag or dev/prod split). Only remove static JSON once the Worker output is confirmed to match what the SPA expects.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| `mcp.data.gouv.fr/mcp` | POST JSON-RPC 2.0 from Worker | No auth, read-only, Streamable HTTP transport. Browser cannot call directly (CORS). |
| Cloudflare Workers | Deploy via `wrangler deploy`, `workers.dev` subdomain | Free plan: 100k requests/day, 10ms CPU/request. Cache API works on workers.dev but is PoP-local. |
| GitHub Pages (`ayming-france`) | Static hosting, no server-side logic | SPA fetch calls go to Worker URL. CORS headers on Worker must allow `*.github.io` origin. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| SPA `js/data.js` to Worker | `fetch(WORKER_URL + '/api/query?...')` | Worker URL is a constant in `data.js`. Swappable between dev (local Wrangler) and prod (workers.dev). |
| Worker to datagouv MCP | `fetch('https://mcp.data.gouv.fr/mcp', { method: 'POST', body: JSON-RPC })` | Outbound subrequest. Counts against Worker's 50 subrequests/invocation limit (only one per invocation here). |
| SPA modules (unchanged) | Direct ES module imports | `app.js`, `kpi.js`, `charts.js`, `insights.js` all remain unchanged. Only `data.js` changes. |

## Build Order

The dependency chain dictates this build sequence:

1. **Worker scaffold and deploy** — Verify the Worker accepts requests, handles CORS, and returns a dummy JSON. Gate: curl from terminal and from the GitHub Pages domain.
2. **MCP integration in Worker** — Wire one MCP tool call (`query_resource_data`) and validate the JSON-RPC response. Gate: response shape logged and inspected.
3. **Data shape adapter** — Transform MCP response to match the shape expected by `app.js`/`kpi.js`/`charts.js`. Gate: render a single NAF code with live data, all charts correct.
4. **NAF index endpoint** — Add a Worker endpoint for the NAF code list (autocomplete data). Gate: search autocomplete works with live data.
5. **Modify `data.js`** — Replace `loadDataset()` with `queryLive()` and `loadNafIndex()`. Gate: full SPA works end-to-end with live data.
6. **Error and loading states** — Add loading skeleton and error messages in `app.js`/`data.js`. Gate: test with Worker returning 502.
7. **Remove static JSON** — Delete `data/*.json` files once live data is confirmed stable. Gate: all three views (AT, MP, Trajet) render correctly.

## Sources

- Cloudflare Workers Cache API: https://developers.cloudflare.com/workers/runtime-apis/cache/
- Cloudflare Workers Cache API example: https://developers.cloudflare.com/workers/examples/cache-api/
- Cloudflare Workers CORS proxy example: https://developers.cloudflare.com/workers/examples/cors-header-proxy/
- Cloudflare Workers limits (free tier): https://developers.cloudflare.com/workers/platform/limits/
- datagouv MCP server (official GitHub): https://github.com/datagouv/datagouv-mcp
- MCP Streamable HTTP transport spec: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
- Caching JSON/CORS proxy with Cloudflare Workers: https://www.conroyp.com/articles/serverless-api-caching-cloudflare-workers-json-cors-proxy

---
*Architecture research for: Sinistralité France — live data migration via Cloudflare Worker proxy*
*Researched: 2026-02-27*
