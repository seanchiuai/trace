---
name: osint-tools
description: Maigret username OSINT and Supermemory investigation memory
---

# OSINT Tools

## Overview

Two external tools for open-source intelligence gathering:
- **Maigret** — Username enumeration across 3,000+ sites (runs as a local Python sidecar)
- **Supermemory** — Persistent memory store for investigation context across steps

## Maigret

### Architecture

Maigret is a Python CLI tool. Since Convex actions run in the cloud, we run a **local FastAPI sidecar** that wraps the CLI and exposes it as HTTP.

```
Convex action → HTTP GET → localhost:8000/search?username=X → Maigret CLI → JSON
```

### Sidecar Server

Located in `sidecar/server.py`:

- **Framework**: FastAPI with CORS middleware (allows all origins)
- **Endpoint**: `GET /search?username=X`
- **Health check**: `GET /health`
- **Process**: Spawns Maigret as a subprocess with `asyncio.create_subprocess_exec`
- **Timeout**: 60 seconds per search
- **Output**: Writes to temp JSON file, parses results

### Maigret CLI Flags

```bash
maigret {username} \
  --json simple \          # Simplified JSON output
  -o /tmp/results.json \   # Output file
  --top-sites 100 \        # Only check top 100 sites (speed)
  --timeout 10 \           # Per-site timeout
  --no-color               # Clean output
```

### Response Format

```json
{
  "username": "johndoe123",
  "count": 8,
  "results": {
    "github": { "url": "github.com/johndoe123", "location": "Fremont", "repos": 26 },
    "telegram": { "url": "t.me/johndoe123", "fullname": "John Doe", "bio": "..." },
    "tiktok": { "url": "tiktok.com/@johndoe123" }
  }
}
```

### False Positive Rate

~86% of Maigret results are false positives. The orchestrator (Opus) filters results by cross-referencing:
- Name matches
- Location matches
- Age/bio consistency
- Profile photo similarity

Only confirmed matches become investigation findings.

### Convex Integration

`convex/tools/maigret.ts` — `internalAction` that calls the sidecar:

```typescript
const res = await fetch(
  `${SIDECAR_URL}/search?username=${encodeURIComponent(args.username)}`,
  { signal: AbortSignal.timeout(60000) }
);
```

**Non-blocking**: If the sidecar is down, returns `{ error: "...", results: {} }` instead of throwing. The investigation continues without Maigret leads.

### Running the Sidecar

```bash
cd sidecar
pip install -r requirements.txt   # maigret, fastapi, uvicorn
python server.py                   # → http://localhost:8000
```

## Supermemory

### Purpose

Persists investigation context across orchestrator steps. Opus can store findings and recall relevant memories before making decisions.

### API

Base URL: `https://api.supermemory.com/v1`

Auth: `Authorization: Bearer {SUPERMEMORY_API_KEY}`

### Functions

Located in `convex/tools/supermemory.ts`:

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `store` | POST `/memories` | Save data with key + investigation ID |
| `recall` | POST `/search` | Query memories filtered by investigation ID |

### Non-blocking

Both functions are non-blocking — if `SUPERMEMORY_API_KEY` is not set, they log a warning and return empty results. The investigation works without Supermemory by passing conversation history directly to Opus.

### Cut Candidate

Supermemory is a cut candidate if running low on time. Without it, Opus relies on the accumulated conversation history for context, which works fine for investigations under 20 steps.

## Files

| File | What |
|------|------|
| `sidecar/server.py` | FastAPI server wrapping Maigret CLI |
| `sidecar/requirements.txt` | `maigret`, `fastapi`, `uvicorn[standard]` |
| `convex/tools/maigret.ts` | `search` internalAction |
| `convex/tools/supermemory.ts` | `store`, `recall` internalActions |

## Environment

- `SUPERMEMORY_API_KEY` — Convex dashboard (optional, free tier)
- Maigret requires Python 3.8+ installed locally
