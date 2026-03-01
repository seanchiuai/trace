# Stop Run Button — Design

## Goal
Add a stop button to the investigation UI so users can terminate a running investigation early.

## Placement
CommandStrip bottom bar — a stop button to the left of the expand/collapse button, visible only when `isLive` is true. Animates in/out with Framer Motion.

## UI Design
- Small pill button: stop icon (square) + "STOP" text in `text-danger` red
- Hover: brighter red bg glow
- On click: switches to "STOPPING..." state with spinner (optimistic UI)
- Framer Motion `AnimatePresence` for smooth entry/exit
- When stopped, user stays on investigation page (no redirect) to see partial results

## Backend Changes

### Schema (`convex/schema.ts`)
- Add `v.literal("stopped")` to the `status` union

### Investigations (`convex/investigations.ts`)
- New mutation `stopInvestigation`: sets status to `"stopped"`, sets `completedAt`

### Orchestrator (`convex/orchestrator.ts`)
- New public action `stopInvestigation`: calls the mutation, then cleans up browser session via `cleanupBrowserSession`
- Update the step guard to also exit on `"stopped"` status

## Frontend Changes

### CommandStrip (`src/components/CommandStrip.tsx`)
- New `onStop` callback prop
- Render stop button when `isLive` is true, hide when not

### Investigation page (`src/pages/Investigation.tsx`)
- Wire `useAction(api.orchestrator.stopInvestigation)` and pass as `onStop` to CommandStrip
- Add `"stopped"` entry to `STATUS_CONFIG`: label "STOPPED", color amber/warning, no pulse
- No redirect on stopped — user stays on page with partial results
