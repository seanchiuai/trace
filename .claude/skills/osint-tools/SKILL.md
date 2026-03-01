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

## Files

| File | What |
|------|------|
| `sidecar/server.py` | FastAPI server wrapping Maigret CLI |
| `sidecar/requirements.txt` | `maigret`, `fastapi`, `uvicorn[standard]` |
| `convex/tools/maigret.ts` | `search` internalAction |

## Environment

- Maigret requires Python 3.8+ installed locally
