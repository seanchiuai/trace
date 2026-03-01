# TRACE — Product Requirements Document

## Overview

AI-powered missing persons investigation tool. User provides name, description, photo, known social links. An autonomous AI investigator explores the web, streams live investigation progress, and generates a detective report.

## User Stories

### US-001: Submit Investigation Request
**As a** user, **I want to** enter a target's name, description, phone, photo, and known social links **so that** the AI can begin an autonomous investigation.

**Acceptance Criteria:**
- [x] Input form with name (required), description, phone, photo upload, known links
- [x] Form validation (name required)
- [x] Submit creates investigation in Convex with status "planning"
- [x] Redirects to investigation dashboard on submit

### US-002: Maigret Username Search
**As a** system, **I want to** search a username across 3,000+ sites **so that** we discover the target's digital footprint quickly.

**Acceptance Criteria:**
- [x] Python FastAPI sidecar wraps Maigret CLI
- [x] GET /search?username=X returns structured JSON
- [x] Convex action calls sidecar via HTTP
- [x] Results displayed in activity stream
- [x] Opus filters false positives using known info (via reasoning + confidence scores)

### US-003: Browser Use Integration
**As a** system, **I want to** control a cloud browser **so that** the AI can navigate social media profiles and extract information.

**Acceptance Criteria:**
- [x] Convex action creates Browser Use sessions
- [x] Convex action runs tasks with natural language instructions
- [x] Browser session ID stored on investigation
- [x] Live URL stored for iframe embedding
- [x] Live browser iframe visible in investigation dashboard
- [ ] Screenshots captured and stored

### US-004: Opus Orchestrator Loop
**As a** system, **I want** Claude Opus to autonomously decide next actions **so that** the investigation proceeds without human intervention.

**Acceptance Criteria:**
- [x] System prompt defines investigator persona and available tools
- [x] Orchestrator calls Opus with conversation history
- [x] Tool results fed back to Opus for next decision
- [x] Steps logged to Convex for real-time frontend updates
- [x] Max 20 steps enforced
- [x] Report generation triggered on "done" or step limit
- [ ] End-to-end loop tested with real API keys


### US-005: Reverse Image / Geolocation Search
**As a** system, **I want to** reverse-search images and geolocate photos **so that** we discover location data and visual matches.

**Acceptance Criteria:**
- [x] Returns matching URLs with confidence scores and platform detection
- [ ] Scan animation -> face brackets -> match cards with confidence ticker

### US-006: Live Investigation Dashboard
**As a** user, **I want to** watch the investigation in real-time **so that** I can see what the AI is doing and discovering.

**Acceptance Criteria:**
- [x] Investigation page loads and displays status
- [x] Status bar shows current phase (planning → investigating → analyzing → complete)
- [x] Activity stream renders steps with tool icons and timestamps
- [x] Findings grid shows evidence cards with confidence badges
- [x] Browser view component with iframe + URL bar
- [x] Auto-starts investigation on page load
- [x] Steps stream in real-time via Convex subscription
- [x] Browser iframe loads Browser Use live URL

### US-008: Detective Report
**As a** user, **I want to** see a comprehensive investigation report **so that** I can review all findings in one place.

**Acceptance Criteria:**
- [x] Report generation calls Opus with all findings
- [x] Report stored as markdown on investigation record
- [x] Report section appears in dashboard when status is "complete"
- [x] DetectiveReport component with stats, evidence list, confidence
- [ ] Report renders formatted markdown (not raw pre block)
- [ ] Export as PDF

### US-009: Face Scanning Animation
**As a** demo viewer, **I want to** see a dramatic face scanning animation **so that** the demo is memorable.

**Acceptance Criteria:**
- [x] Green scan line animation sweeps across image area
- [x] Face bounding boxes with corner brackets snap in
- [x] Match cards slide in with platform icon + confidence counter
- [x] High-confidence matches (>90%) pulse with green glow
- [x] Progress bar shows scan progress
- [ ] Confidence counter animates from 0 to final value (verified)

### US-010: Dark Detective Theme
**As a** user, **I want** the app to have a dark, detective-themed aesthetic **so that** it feels professional and appropriate.

**Acceptance Criteria:**
- [x] Dark background (#07070c primary, #0d0d14 secondary)
- [x] Green accent (#00ff88) for highlights and active states
- [x] Monospace font (JetBrains Mono / Fira Code)
- [x] Custom scrollbar styling
- [x] Consistent card styling (bg-card, border, hover states)
- [ ] Verified in browser — no Vite default styles leaking
