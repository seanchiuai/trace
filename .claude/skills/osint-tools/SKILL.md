---
name: osint-tools
---

# OSINT Tools

## Overview

External tool for open-source intelligence gathering:
- **Maigret** — Username enumeration across 3,000+ sites (runs as a local Python sidecar)

## Maigret

### Architecture

Maigret is a Python CLI tool. Since Convex actions run in the cloud, we run a **local FastAPI sidecar** that wraps the CLI and exposes it as HTTP.

```
Convex action → HTTP GET → sidecar/search?username=X&top_sites=100 → Maigret CLI → JSON
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

### False Positive Rate

~86% of Maigret results are false positives. The Convex action supports a `filterContext` parameter to reduce noise:

```typescript
const result = await ctx.runAction(internal.tools.maigret.search, {
  username: "johndoe123",
  topSites: 100,
  filterContext: {
    name: "John Doe",       // filters by name match
    location: "Fremont",    // filters by location match
    bio: "software engineer", // filters by bio keyword overlap
  },
});
// Returns FilteredResult with filtered_out count
```

High-value platforms (Instagram, Facebook, Twitter, LinkedIn, GitHub, Telegram, TikTok, Reddit, YouTube) are always kept regardless of filter.

### Convex Integration

`convex/tools/maigret.ts` — four exported functions:

| Function | Type | Purpose |
|----------|------|---------|
| `search` | `internalAction` | Single username search with optional filtering |
| `batchSearch` | `internalAction` | Parallel search for up to 5 usernames |
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
python server.py                   # → http://localhost:8000
```

## Files

| File | What |
|------|------|
| `sidecar/server.py` | FastAPI server wrapping Maigret CLI (search, batch, health, info) |
| `sidecar/requirements.txt` | `maigret`, `fastapi`, `uvicorn[standard]` |
| `convex/tools/maigret.ts` | `search`, `batchSearch`, `healthCheck` internalActions + `filterResults` helper |

## Environment

- `MAIGRET_SIDECAR_URL` — Convex dashboard (optional, defaults to `http://localhost:8000`)
- Maigret requires Python 3.8+ installed locally
