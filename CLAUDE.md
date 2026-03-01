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
- **Anthropic API** (Claude Opus) — Orchestrator LLM (called from Convex actions)
- **Browser Use API** — Cloud browser automation
- **Maigret** — Username OSINT (Python sidecar via FastAPI)

## Architecture

```
src/
├── components/          # React components
│   ├── InputForm.tsx        # Investigation input form
│   ├── BrowserView.tsx      # Live browser iframe
│   ├── ActivityStream.tsx   # Real-time step log
│   ├── FindingsGrid.tsx     # Evidence cards with confidence
│   ├── DetectiveReport.tsx  # Final report display
│   ├── LeadTree.tsx         # Connection network
│   ├── ImageGallery.tsx     # Found images grid
│   ├── HudHeader.tsx        # Investigation HUD header
│   ├── CommandStrip.tsx     # Command strip controls
│   ├── FindingToasts.tsx    # Real-time finding notifications
│   └── CompletionFlash.tsx  # Investigation completion animation
├── pages/
│   ├── Home.tsx             # Landing + form
│   ├── Investigation.tsx    # Live dashboard
│   └── Report.tsx           # Investigation report page
convex/
├── schema.ts            # Tables: investigations, findings, steps
├── investigations.ts    # CRUD + queries
├── orchestrator.ts      # Opus agentic loop (think → tool → execute → next)
├── reports.ts           # Report assembly
└── tools/
    ├── braveSearch.ts   # Brave Search API (fast web lookups)
    ├── browserUse.ts    # Browser Use Cloud API
    ├── maigret.ts       # Calls sidecar
    └── picarta.ts       # Picarta AI photo geolocation
sidecar/
├── server.py            # FastAPI wrapper for Maigret CLI
└── requirements.txt
```

## Environment Variables

Frontend (`.env.local`):
- `VITE_CONVEX_URL` — Convex deployment URL (auto-set by `npx convex dev`)

Convex dashboard (Settings → Environment Variables):
- `ANTHROPIC_API_KEY` — Claude API key for orchestrator
- `BROWSER_USE_API_KEY` — Browser Use Cloud API key
- `BRAVE_API_KEY` — Brave Search API key (for fast web lookups)
- `PICARTA_API_KEY` — Picarta AI geolocation API key (free tier: 100 calls/month)
- `MAIGRET_SIDECAR_URL` — Maigret sidecar URL (optional, defaults to `http://localhost:8000`)

## Boundaries

- Dark theme only (bg #0a0a0f, accent #00ff88)
- All API keys live in Convex environment variables, never in frontend
- Orchestrator max 20 steps per investigation
- Maigret runs as a separate Python process, not in Node
- Legal disclaimer required on landing page


Rule #1: always make commits after every code change.