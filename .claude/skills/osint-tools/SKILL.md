---
name: osint-tools
description: OSINT tool integrations for intelligence gathering
---

# OSINT Tools

## Overview

External tools for open-source intelligence gathering, all located in `convex/tools/`:

| Tool | File | Purpose | Env Var |
|------|------|---------|---------|
| **Maigret** | `maigret.ts` | Username enumeration across 3,000+ sites (Python sidecar) | `MAIGRET_SIDECAR_URL` |
| **Brave Search** | `braveSearch.ts` | Fast web search via Brave Search API | `BRAVE_API_KEY` |
| **Browser Use** | `browserUse.ts` | Cloud browser automation (v3 API) | `BROWSER_USE_API_KEY` |
| **Picarta** | `picarta.ts` | AI photo geolocation | `PICARTA_API_KEY` |
| **Intelligence X** | `intelx.ts` | Dark web / data breach search (extreme mode) | `INTELX_API_KEY` |
| **Reverse Image Search** | `reverseImageSearch.ts` | Google Lens via SerpAPI | `SERPAPI_API_KEY` |

All tool files follow the same pattern: `internalAction` with env var guard at the top.

## Maigret

### Architecture

Maigret is a Python CLI tool. Since Convex actions run in the cloud, we run a **local FastAPI sidecar** that wraps the CLI and exposes it as HTTP.

```
Convex action -> HTTP GET -> sidecar/search?username=X&top_sites=100 -> Maigret CLI -> JSON
```

### Sidecar Server

Located in `sidecar/server.py`:

- **Framework**: FastAPI with CORS middleware (allows all origins)
- **Endpoints**:
  - `GET /search?username=X&top_sites=100&timeout=10` — Single username search
  - `GET /batch?usernames=X,Y,Z&top_sites=50` — Parallel batch search (max 5)
  - `GET /health` — Health check (verifies Maigret is installed)
  - `GET /info` — Maigret version and sidecar info
- **Process**: Spawns Maigret as a subprocess with `asyncio.create_subprocess_exec`
- **Timeout**: 120 seconds per search subprocess
- **Output**: Writes to temp directory via `--folderoutput`, parses `report_{username}_simple.json`

### Maigret CLI Flags

```bash
maigret {username} \
  -J simple \                # Simplified JSON output (capital J)
  --folderoutput {dir} \     # Output directory for reports
  --top-sites 100 \          # Only check top N sites (max 500)
  --timeout 10 \             # Per-site timeout (max 30)
  --no-color \               # Clean output
  --no-progressbar           # No progress bar (cleaner logs)
```

### Response Format

```json
{
  "username": "johndoe123",
  "count": 8,
  "results": {
    "github": { "url": "https://github.com/johndoe123", "site_name": "GitHub", "category": "professional", "fullname": "John Doe", "location": "Fremont" },
    "telegram": { "url": "https://t.me/johndoe123", "site_name": "Telegram", "category": "messaging", "fullname": "John Doe", "bio": "..." },
    "tiktok": { "url": "https://tiktok.com/@johndoe123", "site_name": "TikTok", "category": "social" }
  },
  "categories": { "professional": 1, "messaging": 1, "social": 1 }
}
```

### Convex Integration

`convex/tools/maigret.ts` — three exported functions:

| Function | Type | Purpose |
|----------|------|---------|
| `search` | `internalAction` | Single username search via sidecar |
| `investigate` | `internalAction` | Deep investigation: primary search -> Claude extracts leads -> searches lead usernames -> builds connection graph |
| `healthCheck` | `internalAction` | Check if sidecar is running |

```typescript
const url = `${SIDECAR_URL}/search?username=${encodeURIComponent(args.username)}&top_sites=${topSites}`;
const res = await fetch(url, {
  signal: AbortSignal.timeout(130_000), // slightly above sidecar's 120s
});
```

**Retry logic**: Tries up to 2 times with 2s backoff between attempts.

**Non-blocking**: If the sidecar is down after 2 attempts, returns `{ error: "...", results: {} }` instead of throwing. The investigation continues without Maigret leads.

### Running the Sidecar

```bash
cd sidecar
pip install -r requirements.txt   # maigret, fastapi, uvicorn[standard]
python server.py                   # -> http://localhost:8000
```

## Brave Search

`convex/tools/braveSearch.ts` — `search` internalAction.

Fast web lookups via the Brave Search API. Used by the `web_search` orchestrator tool. Returns titles, URLs, and snippets.

## Browser Use

`convex/tools/browserUse.ts` — See the `browser-automation` skill for full documentation.

Cloud browser automation via Browser Use v3 API. Exports `runTask`, `getSession`, `stopSession`.

## Picarta

`convex/tools/picarta.ts` — `localize` internalAction.

AI photo geolocation. Takes an image URL, returns lat/lon/confidence predictions. Used by the `geo_locate` orchestrator tool. Free tier: 100 calls/month.

## Intelligence X

`convex/tools/intelx.ts` — `search` internalAction.

Dark web and data breach search via the IntelX API. Only available in extreme mode. Uses a polling pattern: submit search, wait 2s intervals, fetch results.

## Reverse Image Search

`convex/tools/reverseImageSearch.ts` — `search` internalAction.

Google Lens reverse image search via SerpAPI. Takes an image URL, returns visual matches with titles, links, and thumbnails.

## Common Tool Pattern

All tools follow the same structure:

```typescript
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const someAction = internalAction({
  args: { /* ... */ },
  handler: async (_, args) => {
    const apiKey = process.env.SOME_API_KEY;
    if (!apiKey) throw new Error("SOME_API_KEY not set");
    // fetch external API...
  },
});
```

Orchestrator calls tools via: `await ctx.runAction(internal.tools.<name>.<function>, { ... })`

## Files

| File | What |
|------|------|
| `sidecar/server.py` | FastAPI server wrapping Maigret CLI (search, batch, health, info) |
| `sidecar/requirements.txt` | `maigret`, `fastapi`, `uvicorn[standard]` |
| `convex/tools/maigret.ts` | `search`, `investigate`, `healthCheck` internalActions |
| `convex/tools/braveSearch.ts` | `search` internalAction |
| `convex/tools/browserUse.ts` | `runTask`, `getSession`, `stopSession` internalActions |
| `convex/tools/picarta.ts` | `localize` internalAction |
| `convex/tools/intelx.ts` | `search` internalAction |
| `convex/tools/reverseImageSearch.ts` | `search` internalAction |

## Environment

- `MAIGRET_SIDECAR_URL` — Convex dashboard (optional, defaults to `http://localhost:8000`)
- `BRAVE_API_KEY` — Brave Search API
- `BROWSER_USE_API_KEY` — Browser Use Cloud
- `PICARTA_API_KEY` — Picarta AI geolocation
- `INTELX_API_KEY` — Intelligence X dark web search
- `SERPAPI_API_KEY` — SerpAPI for reverse image search
- Maigret requires Python 3.8+ installed locally
