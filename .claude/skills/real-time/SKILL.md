---
name: real-time
description: Convex real-time subscriptions powering live investigation updates
---

# Real-Time

## Overview

TRACE uses Convex's built-in real-time subscriptions to stream investigation progress to the frontend. No WebSockets, SSE, or polling — Convex queries automatically push updates when underlying data changes.

## How It Works

```
Orchestrator (Convex action)
  |
  |-- ctx.runMutation(addStep, { action: "Running Maigret..." })
  |     +-- Convex DB write triggers subscription update
  |           +-- Frontend useQuery(getSteps) auto-re-renders
  |
  |-- ctx.runMutation(addFinding, { data: "Found GitHub profile" })
  |     +-- Convex DB write triggers subscription update
  |           +-- Frontend useQuery(getFindings) auto-re-renders
  |
  |-- ctx.runMutation(addEdges, [...])
  |     +-- Frontend useQuery(getEdges) auto-re-renders
  |
  +-- ctx.runMutation(updateStatus, { status: "complete" })
        +-- Frontend useQuery(get) sees new status -> navigates to report
```

## Frontend Subscriptions

Four reactive queries power the investigation dashboard:

```tsx
// src/pages/Investigation.tsx

// 1. Investigation record (status, step count, browser URL)
const investigation = useQuery(api.investigations.get, { id: investigationId });

// 2. Activity stream (steps appear as orchestrator logs them)
const steps = useQuery(api.investigations.getSteps, { investigationId });

// 3. Findings (evidence cards appear as orchestrator saves them)
const findings = useQuery(api.investigations.getFindings, { investigationId });

// 4. Graph edges (relationship connections for the graph view)
const edges = useQuery(api.graphEdges.getEdges, { investigationId });
```

All four re-render automatically when the orchestrator writes to the DB.

### Additional Subscriptions on Other Pages

- `src/pages/Runs.tsx`: `useQuery(api.investigations.list)` — all investigations
- `src/pages/Report.tsx`: `useQuery(api.reports.getReport, { investigationId })` — report data

## Real-Time Data Flow

### Steps -> CommandStrip (via ActivityStream sub-components)

Each orchestrator iteration calls `addSteps` (batch) with reasoning + tool results. The `CommandStrip` component renders a collapsible bottom strip that imports sub-components from `ActivityStream` (`CollapsedStep`, `ExpandedStep`, `ToolBadge`):

```tsx
// CollapsedStep animation
<motion.div
  key={step._id}
  initial={{ opacity: 0, x: -12 }}
  animate={{ opacity: 1, x: 0 }}
>

// ExpandedStep animation
<motion.div
  initial={{ opacity: 0, x: -16 }}
  animate={{ opacity: 1, x: 0 }}
>
```

New steps slide in from the left as they appear.

### Findings -> FindingToasts

When the orchestrator calls `save_finding`, a toast notification animates in from the right, auto-dismisses after 5 seconds. Uses a `useEffect` with `seenIdsRef` to detect new findings:

```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
>
  {/* finding card */}
</motion.div>
```

The `FindingToasts` component also has a slide-out tray panel that shows the full `FindingsGrid`.

### Edges -> RelationshipGraph

Graph edges power a force-directed 2D visualization via `react-force-graph-2d`. The `useGraphData` hook transforms findings and edges into nodes/links.

### Status -> CompletionFlash -> Report Navigation

When status changes to "complete":
1. `CompletionFlash` overlay plays a 2.5-second animation
2. Page navigates to `/report/${id}` (report is NOT shown inline)

```tsx
// Investigation.tsx
useEffect(() => {
  if (investigation?.status === "complete") {
    // Show CompletionFlash, then navigate to /report/:id
  }
}, [investigation?.status]);
```

### Browser URL -> BrowserView

When the orchestrator stores `browserLiveUrl`, the `BrowserView` component transitions from empty state to live iframe. `BrowserView` receives both `liveUrl` and `status` props.

## ViewSwitcher

The Investigation page supports three views, all powered by the same real-time subscriptions:
- **Browser** — Live browser iframe (`BrowserView`)
- **Graph** — Force-directed relationship visualization (`RelationshipGraph`)
- **Map** — Geo-located findings on a Leaflet map (`GeoIntelMap`)

`ViewSwitcher` shows pulse indicators when new data is available for Graph/Map views.

## Auto-Start Pattern

The investigation auto-starts when the page loads:

```tsx
const [started, setStarted] = useState(false);

useEffect(() => {
  if (investigation && investigation.status === "planning" && !started) {
    setStarted(true);
    startInvestigation({ investigationId });
  }
}, [investigation, started, startInvestigation, investigationId]);
```

## Orchestrator Self-Chaining

The orchestrator avoids Convex's 10-minute timeout by scheduling each step as a separate action:

```typescript
// End of each step
await ctx.scheduler.runAfter(0, internal.orchestrator.step, {
  investigationId: args.investigationId,
  conversationHistory: JSON.stringify(finalHistory),
  consecutiveSaveOnlySteps: consecutiveSaveOnly,
  maigretAvailable,
  extremeMode,
});
```

`runAfter(0, ...)` schedules immediately — the new action starts within ~100ms, and the frontend sees continuous updates.

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Subscription latency | ~50-100ms (Convex cloud -> client) |
| Step frequency | Every 15-60s (depends on tool speed) |
| Max concurrent subscriptions | 4 per investigation page |
| Data volume per step | ~2KB (action text + optional result) |

## Files

| File | Real-Time Role |
|------|----------------|
| `src/pages/Investigation.tsx` | 4 `useQuery` subscriptions, auto-start logic, ViewSwitcher |
| `src/pages/Runs.tsx` | `useQuery(list)` for all investigations |
| `src/pages/Report.tsx` | `useQuery(getReport)` for report data |
| `src/components/CommandStrip.tsx` | Collapsible bottom strip, imports ActivityStream sub-components |
| `src/components/ActivityStream.tsx` | `CollapsedStep`, `ExpandedStep`, `ToolBadge` sub-components |
| `src/components/FindingToasts.tsx` | Toast notifications + slide-out FindingsGrid tray |
| `src/components/FindingsGrid.tsx` | Evidence card grid (rendered inside FindingToasts tray) |
| `src/components/BrowserView.tsx` | Reacts to `browserLiveUrl` changes |
| `src/components/RelationshipGraph.tsx` | Force-directed graph from edges subscription |
| `src/components/GeoIntelMap.tsx` | Leaflet map from findings with lat/lon |
| `src/components/ViewSwitcher.tsx` | Switches between Browser/Graph/Map views |
| `src/hooks/useGraphData.ts` | Transforms findings + edges into graph nodes/links |
| `convex/investigations.ts` | Mutations that trigger subscription updates |
| `convex/graphEdges.ts` | Edge mutations that trigger graph subscription |
| `convex/orchestrator.ts` | Writes steps/findings/edges, chains via scheduler |
