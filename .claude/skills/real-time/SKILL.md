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
  │
  ├── ctx.runMutation(addStep, { action: "Running Maigret..." })
  │     └── Convex DB write triggers subscription update
  │           └── Frontend useQuery(getSteps) auto-re-renders
  │
  ├── ctx.runMutation(addFinding, { data: "Found GitHub profile" })
  │     └── Convex DB write triggers subscription update
  │           └── Frontend useQuery(getFindings) auto-re-renders
  │
  └── ctx.runMutation(updateStatus, { status: "complete" })
        └── Frontend useQuery(get) sees new status → shows report
```

## Frontend Subscriptions

Three reactive queries power the investigation dashboard:

```tsx
// src/pages/Investigation.tsx

// 1. Investigation record (status, step count, browser URL, report)
const investigation = useQuery(api.investigations.get, { id: investigationId });

// 2. Activity stream (steps appear as orchestrator logs them)
const steps = useQuery(api.investigations.getSteps, { investigationId });

// 3. Findings (evidence cards appear as orchestrator saves them)
const findings = useQuery(api.investigations.getFindings, { investigationId });
```

All three re-render automatically when the orchestrator writes to the DB.

## Real-Time Data Flow

### Steps → ActivityStream

Each orchestrator iteration calls `addStep` 1-2 times (reasoning + tool result). The `ActivityStream` component renders these with Framer Motion enter animations:

```tsx
<AnimatePresence>
  {steps.map((step) => (
    <motion.div
      key={step._id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* step content */}
    </motion.div>
  ))}
</AnimatePresence>
```

New steps slide in from the left as they appear.

### Findings → FindingsGrid

When the orchestrator calls `save_finding`, a new card animates in:

```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
>
  {/* finding card */}
</motion.div>
```

### Status → Header + Report

```tsx
// Status badge updates automatically
<span className={status.color}>{status.label}</span>

// Report section appears when status changes to "complete"
{investigation.status === "complete" && investigation.report && (
  <div>...</div>
)}
```

### Browser URL → BrowserView

When the orchestrator stores `browserLiveUrl`, the `BrowserView` component transitions from empty state to live iframe:

```tsx
// Empty → iframe transition is automatic via Convex subscription
const investigation = useQuery(api.investigations.get, { id });
// investigation.browserLiveUrl goes from undefined → URL
```

## Auto-Start Pattern

The investigation auto-starts when the page loads:

```tsx
const [started, setStarted] = useState(false);

useEffect(() => {
  if (investigation && investigation.status === "planning" && !started) {
    setStarted(true);
    startInvestigation({ investigationId });
  }
}, [investigation, started]);
```

## Orchestrator Self-Chaining

The orchestrator avoids Convex's 10-minute timeout by scheduling each step as a separate action:

```typescript
// End of each step
await ctx.scheduler.runAfter(0, internal.orchestrator.step, {
  investigationId,
  conversationHistory: JSON.stringify(updatedHistory),
});
```

`runAfter(0, ...)` schedules immediately — the new action starts within ~100ms, and the frontend sees continuous updates.

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Subscription latency | ~50-100ms (Convex cloud → client) |
| Step frequency | Every 15-60s (depends on tool speed) |
| Max concurrent subscriptions | 3 per investigation page |
| Data volume per step | ~2KB (action text + optional result) |

## Files

| File | Real-Time Role |
|------|----------------|
| `src/pages/Investigation.tsx` | 3 `useQuery` subscriptions, auto-start logic |
| `src/components/ActivityStream.tsx` | Renders steps with enter animations |
| `src/components/FindingsGrid.tsx` | Renders findings with enter animations |
| `src/components/BrowserView.tsx` | Reacts to `browserLiveUrl` changes |
| `convex/investigations.ts` | Mutations that trigger subscription updates |
| `convex/orchestrator.ts` | Writes steps/findings, chains via scheduler |
