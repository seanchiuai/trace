# TRACE — Task Tracking

## Development Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Scaffold Vite + Convex + schema | Complete |
| 2 | Maigret sidecar (FastAPI + wrapper) | Complete |
| 3 | Browser Use integration | Complete |
| 4 | Opus orchestrator loop | Complete |
| 5 | FaceCheck API integration | Complete (code written, needs API key testing) |
| 6 | Frontend: input form + live browser + activity stream | Complete |
| 7 | Laminar observability tree | Backlog (cut candidate) |
| 8 | Detective report generation + UI | Complete |
| 9 | Polish: dark theme, animations, loading states | Complete (noir redesign applied) |

## Complete

- [x] Initialize Vite + React + TypeScript project
- [x] Install dependencies (Convex, React Router, Framer Motion, Tailwind CSS 4)
- [x] Configure Tailwind via @tailwindcss/vite plugin
- [x] Define Convex schema (investigations, findings, steps tables with indexes)
- [x] Create investigation CRUD mutations and queries
- [x] Create orchestrator with Opus tool loop and report generation
- [x] Create Browser Use tool actions (create session, run task, get status, get session, stop session)
- [x] Fix Browser Use API v2 integration (endpoints, auth, polling, session lifecycle)
- [x] Create FaceCheck tool action (upload, poll, parse results)
- [x] Create Maigret tool action (calls local sidecar)
- [x] Create reports query (assembles investigation + findings + steps)
- [x] Create Maigret Python sidecar (FastAPI server.py + requirements.txt)
- [x] Create all frontend components (InputForm, BrowserView, ActivityStream, FindingsGrid, FaceScan, DetectiveReport, LeadTree, ImageGallery)
- [x] Create pages (Home with landing + form, Investigation dashboard)
- [x] Set up routing (/, /investigate/:id, /report/:id)
- [x] Set up Convex provider in App.tsx
- [x] Define dark theme CSS variables and animations (scanLine, bracketSnap, matchReveal, confidenceGlow)
- [x] Create .env.example with all required keys
- [x] Create GitHub repo and push
- [x] Rewrite orchestrator: adaptive strategy, session retry, free save_finding, web_search, multi-tool
- [x] Add Brave Search API tool (web_search via braveSearch.ts)
- [x] Add Maigret sidecar graceful degradation via health check
- [x] Add conversation history compression to reduce token costs
- [x] Create HudHeader component (status, steps, cost, token tracking)
- [x] Create CommandStrip component (collapsible activity stream)
- [x] Create FindingToasts component (real-time finding notifications)
- [x] Create CompletionFlash component (investigation completion overlay)
- [x] Create Report page (/report/:id with DetectiveReport)
- [x] Noir redesign: Outfit + JetBrains Mono fonts, updated color palette, HUD elements, film grain

## Active

(none)

## Backlog

### Phase 2: Maigret Testing
- [ ] Install Maigret locally and test sidecar
- [ ] Verify JSON output parsing for various username results
- [ ] Test timeout handling and error responses

### Phase 3: Browser Use Testing
- [ ] Set BROWSER_USE_API_KEY in Convex environment
- [ ] Test session creation and task execution end-to-end
- [ ] Verify live URL works in iframe

### Phase 4: Opus Orchestrator Testing
- [ ] Set ANTHROPIC_API_KEY in Convex environment
- [ ] Run end-to-end investigation with a test target
- [ ] Verify tool dispatch works for all 6 tools
- [ ] Test conversation history accumulation across steps
- [ ] Test max step limit enforcement (20 steps)
- [ ] Test report generation on "done" tool call

### Phase 5: FaceCheck Testing
- [ ] Sign up for FaceCheck.id API key
- [ ] Test image upload and polling flow
- [ ] Verify confidence scores and platform detection
- [ ] Wire FaceScan overlay to face_check step results

### Phase 7: Laminar (cut candidate)
- [ ] Evaluate if Laminar adds enough value for demo
- [ ] If keeping: add observability tree view component

### Remaining Polish
- [ ] Render report as formatted markdown (not raw pre)
- [ ] Add export-to-PDF functionality
- [ ] Mobile responsiveness (optional — demo is desktop)
- [ ] Error states and retry UI
