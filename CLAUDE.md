# TRACE — AI Investigation System

AI-powered missing persons investigation tool. Provides a name, photo, or social link — an autonomous AI agent explores the web and builds a comprehensive digital profile.

## Commands

```bash
npm run dev              # Start Vite dev server
npm run dev:convex       # Start Convex dev (backend)
npm run build            # TypeScript check + Vite build
npm run lint             # ESLint
npm run preview          # Preview production build

# Maigret sidecar
cd sidecar && pip install -r requirements.txt && python server.py
```

## Tech Stack

- **Vite 7** + **React 19** + **TypeScript 5.9** — Frontend
- **Tailwind CSS 4** (via @tailwindcss/vite) — Styling
- **Convex** — Backend (schema, mutations, queries, actions, scheduler)
- **Framer Motion** — Animations
- **React Router DOM 7** — Client-side routing
- **Leaflet** + **React Leaflet 5** — Geographic map rendering
- **react-force-graph-2d** — Force-directed graph visualization
- **Anthropic API** (Claude Sonnet for agentic loop, Opus for reports) — Orchestrator LLM
- **Browser Use API** — Cloud browser automation
- **Maigret** — Username OSINT (Python sidecar via FastAPI)
- **GeoSpy AI** — Photo geolocation (visual clue analysis)
- **Picarta AI** — Photo geolocation (alternative engine, EXIF extraction)
- **SerpAPI** — Reverse image search (Google Lens)
- **WhitePages** — Person lookup by name/phone (extreme mode)
- **IntelX** — Dark web / breach search (extreme mode)

## Architecture

```
src/
├── components/
│   ├── InputForm.tsx        # Investigation input form
│   ├── BrowserView.tsx      # Live browser iframe
│   ├── ActivityStream.tsx   # Real-time step log
│   ├── FindingsGrid.tsx     # Evidence cards with confidence
│   ├── DetectiveReport.tsx  # Final report (lightbox, visual evidence gallery)
│   ├── LeadTree.tsx         # Connection network
│   ├── ImageGallery.tsx     # Found images grid
│   ├── GeoIntelMap.tsx      # Geographic intelligence map
│   ├── RelationshipGraph.tsx # Entity relationship visualization
│   ├── BehavioralProfile.tsx # Behavioral analysis display
│   ├── ViewSwitcher.tsx     # Tab switcher for investigation views
│   ├── HudHeader.tsx        # Investigation HUD header
│   ├── CommandStrip.tsx     # Command strip + stop button
│   ├── FindingToasts.tsx    # Real-time finding notifications
│   ├── CompletionFlash.tsx  # Investigation completion animation
│   └── ClarificationCard.tsx # User clarification/directive input
├── pages/
│   ├── Home.tsx             # Landing + form
│   ├── Runs.tsx             # All investigations list
│   ├── Investigation.tsx    # Live dashboard
│   └── Report.tsx           # Investigation report page
├── hooks/
│   └── useGraphData.ts     # Graph data processing hook
convex/
├── schema.ts            # Tables: investigations, findings, steps, graph_edges
├── investigations.ts    # CRUD + queries
├── orchestrator.ts      # Agentic loop (Sonnet for steps, Opus for reports)
├── reports.ts           # Report assembly
├── graphEdges.ts        # Graph edge CRUD (connection network)
├── directives.ts        # User directives/clarifications during investigation
└── tools/
    ├── braveSearch.ts       # Brave Search API (fast web lookups)
    ├── browserUse.ts        # Browser Use Cloud API v3
    ├── maigret.ts           # Username OSINT (calls Python sidecar)
    ├── picarta.ts           # Picarta AI photo geolocation
    ├── geoSpy.ts            # GeoSpy AI photo geolocation
    ├── reverseImageSearch.ts # Google Lens via SerpAPI
    ├── whitePages.ts        # Person lookup (extreme mode)
    └── intelx.ts            # Dark web / breach search (extreme mode)
sidecar/
├── server.py            # FastAPI wrapper for Maigret CLI
└── requirements.txt
```

## Environment Variables

Frontend (`.env.local`):
- `VITE_CONVEX_URL` — Convex deployment URL (auto-set by `npx convex dev`)

Convex dashboard (Settings → Environment Variables):
- `ANTHROPIC_API_KEY` — Claude API key for orchestrator (required)
- `BROWSER_USE_API_KEY` — Browser Use Cloud API key (required)
- `BRAVE_API_KEY` — Brave Search API key (required)
- `PICARTA_API_KEY` — Picarta AI geolocation (free tier: 100 calls/month)
- `GEOSPY_API_KEY` — GeoSpy AI geolocation
- `SERPAPI_API_KEY` — SerpAPI for reverse image search (Google Lens)
- `WHITEPAGES_API_KEY` — WhitePages person lookup (extreme mode only)
- `INTELX_API_KEY` — IntelX dark web search (extreme mode only)
- `MAIGRET_SIDECAR_URL` — Maigret sidecar URL (optional, defaults to `http://localhost:8000`)

Note: Missing API keys are handled gracefully — the tool returns an error message to the LLM which then skips it and uses alternatives.

## Boundaries

- Dark theme only (bg #0a0a0f, accent #00ff88)
- All API keys live in Convex environment variables, never in frontend
- Orchestrator max 20 steps per investigation
- Maigret runs as a separate Python process, not in Node
- Legal disclaimer required on landing page


Rule #1: always make commits after every code change.