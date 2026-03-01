# TRACE — Task Tracking

## Development Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Scaffold Vite + Convex + schema | Complete |
| 2 | Maigret sidecar (FastAPI + wrapper) | Complete (code written, needs testing) |
| 3 | Browser Use integration | Complete (code written, needs API key testing) |
| 4 | Opus orchestrator loop | Pending |
| 5 | FaceCheck API integration | Pending |
| 6 | Frontend: input form + live browser + activity stream | Pending |
| 7 | Laminar observability tree | Backlog (cut candidate) |
| 8 | Detective report generation + UI | Pending |
| 9 | Polish: dark theme, animations, loading states | Pending |

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
- [x] Set up routing (/, /investigate/:id)
- [x] Set up Convex provider in App.tsx
- [x] Define dark theme CSS variables and animations (scanLine, bracketSnap, matchReveal, confidenceGlow)
- [x] Create .env.example with all required keys
- [x] Create GitHub repo and push

## Active

(none)

## Backlog

### Phase 2: Maigret Testing
- [ ] Install Maigret locally and test sidecar
- [ ] Verify JSON output parsing for various username results
- [ ] Test timeout handling and error responses

### Phase 3: Browser Use Integration
- [x] Fix API v2 endpoints, auth header, and endpoint paths in browserUse.ts
- [x] Add task polling loop (POST /tasks → poll GET /tasks/{id} until finished/failed)
- [x] Add getSession and stopSession actions
- [x] Add eager session creation in orchestrator startInvestigation
- [x] Wire session cleanup into all orchestrator exit paths
- [x] Relax iframe sandbox (allow-forms, allow-popups) for live view
- [ ] Set BROWSER_USE_API_KEY in Convex environment
- [ ] Test session creation and task execution end-to-end
- [ ] Verify live URL works in iframe

### Phase 4: Opus Orchestrator Testing
- [ ] Set ANTHROPIC_API_KEY in Convex environment
- [ ] Run end-to-end investigation with a test target
- [ ] Verify tool dispatch works for all 5 tools
- [ ] Test conversation history accumulation across steps
- [ ] Test max step limit enforcement (20 steps)
- [ ] Test report generation on "done" tool call

### Phase 5: FaceCheck Integration
- [ ] Sign up for FaceCheck.id API key
- [ ] Test image upload and polling flow
- [ ] Verify confidence scores and platform detection
- [ ] Wire FaceScan overlay to face_check step results

### Phase 6: Frontend Live Testing
- [ ] Configure Convex deployment (npx convex dev)
- [ ] Set VITE_CONVEX_URL in .env.local
- [ ] Verify real-time step streaming via Convex subscriptions
- [ ] Test form submission → investigation creation → redirect flow
- [ ] Verify Browser Use iframe loads live URL
- [ ] Test activity stream auto-scroll and animation


### Phase 8: Laminar (cut candidate)
- [ ] Evaluate if Laminar adds enough value for demo
- [ ] If keeping: add observability tree view component

### Phase 9: Detective Report
- [ ] Render report as formatted markdown (not raw pre)
- [ ] Add export-to-PDF functionality
- [ ] Style report page with detective board aesthetic

### Phase 10: Polish
- [ ] Verify no default Vite styles leaking
- [ ] Test all animations in browser (FaceScan sequence, activity stream)
- [ ] Add loading states for all async operations
- [ ] Mobile responsiveness (optional — demo is desktop)
- [ ] Error states and retry UI
