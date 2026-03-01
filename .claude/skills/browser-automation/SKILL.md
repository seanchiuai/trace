---
name: browser-automation
description: Browser Use Cloud API integration for autonomous web browsing
---

# Browser Automation

## Overview

Browser Use Cloud provides "dumb hands" for the AI investigator. The orchestrator (Opus) sends natural language instructions, Browser Use executes them in a cloud browser, and returns extracted page text. The user can watch via a live iframe.

## API

Base URL: `https://api.browser-use.com/api/v3`

Auth: `X-Browser-Use-API-Key: {BROWSER_USE_API_KEY}`

### Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sessions` | POST | Create session + run a task (returns session with `liveUrl`) |
| `/sessions/{sessionId}` | GET | Poll session status until idle/stopped/error |
| `/sessions/{sessionId}/stop` | POST | Terminate a session |

### Session Lifecycle (v3)

Sessions have these statuses:
- `created` — sandbox spinning up
- `running` — task currently executing
- `idle` — task finished, session alive (`keepAlive: true`), ready for next task
- `stopped` — session terminated
- `timed_out` — session exceeded time limit
- `error` — session encountered an error

Only `idle` means the session is ready to accept a new task.

### Task Execution

```typescript
// convex/tools/browserUse.ts — runTask
const body: Record<string, unknown> = {
  task: "Go to instagram.com/johndoe123 and describe what you see",
  keepAlive: true,          // session persists after task for reuse
};

// Reuse existing session (must be idle first)
if (args.sessionId) {
  const check = await waitForSessionIdle(args.sessionId);
  if (check.idle) {
    body.sessionId = args.sessionId;  // camelCase in v3
  }
}

// Extreme mode: premium model for +12% accuracy
if (args.extremeMode) {
  body.model = "bu-2-0";
}

// POST /sessions creates session + starts task in one call
const createRes = await fetch(`${API}/sessions`, {
  method: "POST",
  headers: getHeaders(),
  body: JSON.stringify(body),
});
const session = await createRes.json();
// session = { id, liveUrl, status, output }

// Poll GET /sessions/{id} until idle/stopped/error
// Adaptive intervals: 1s for first 10 polls, then 2s (max 200 attempts ~6.5 min)
```

### Response Shape

```typescript
// Session creation response (POST /sessions)
{
  id: string;           // session ID for polling and reuse
  liveUrl: string;      // iframe-embeddable URL for live viewing
  status: string;       // "created" | "running" | "idle" | etc.
  output?: string;      // extracted text (present when idle)
}

// Session poll response (GET /sessions/{id})
{
  id: string;
  status: "created" | "running" | "idle" | "stopped" | "timed_out" | "error";
  output?: string;      // extracted text content from the browser
  liveUrl?: string;     // iframe URL
}
```

### Retry Logic

Session creation retries up to 3 attempts with 3s backoff. Rate limit (429) is retried; other 4xx errors fail immediately.

## Integration with Orchestrator

1. `startInvestigation` schedules the first orchestrator step (no eager browser session)
2. On first `browser_action`, orchestrator calls `internal.tools.browserUse.runTask`
3. `runTask` creates a session via `POST /sessions` with `keepAlive: true`
4. `liveUrl` is pushed to the investigation record immediately so the iframe loads while polling continues
5. Session `id` and `liveUrl` are stored on the investigation via `updateBrowserSession`
6. Subsequent browser actions reuse the session via `waitForSessionIdle` pre-check
7. Opus gets the `output` text back and reasons about what it saw
8. On investigation completion/failure, `cleanupBrowserSession` stops the session via `stopSession`

## Frontend: BrowserView Component

`src/components/BrowserView.tsx`

- Planning state: globe icon + "Waiting for investigation to initialize..."
- Connecting state (investigating, no URL yet): status dot + "Connecting to browser"
- Active state: floating "Live" pill (top-right) + floating URL label (bottom-left) + full-height iframe

```tsx
<iframe
  src={liveUrl}
  className="w-full h-full bg-black rounded-xl"
  title="Browser Use Live View"
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
/>
```

## Convex Implementation

All three functions are `internalAction` — only callable by the orchestrator, never from the frontend.

| Function | File | Purpose |
|----------|------|---------|
| `runTask` | `convex/tools/browserUse.ts` | Create session + run task + poll until idle (up to ~6.5 min) |
| `getSession` | `convex/tools/browserUse.ts` | Fetch session details (for `liveUrl`) |
| `stopSession` | `convex/tools/browserUse.ts` | Stop a session (POST to `/sessions/{id}/stop`, treats 404 as success) |

## Session Persistence

The `browserSessionId` and `browserLiveUrl` are stored on the investigation record so:
- Subsequent browser actions reuse the same session (maintains cookies, state)
- `waitForSessionIdle` checks if the session is ready before reuse; creates fresh if dead
- The frontend can display the live URL at any time
- Session is cleaned up when the investigation completes or fails

## Gotchas

- **Session reuse**: Always pass `sessionId` (camelCase in v3) for subsequent tasks to maintain login state
- **`waitForSessionIdle`**: Must wait for `idle` status before sending a new task to an existing session
- **`keepAlive: true`**: Always set to keep sessions alive after task completion for reuse
- **iframe sandbox**: `allow-same-origin allow-scripts allow-forms allow-popups` needed for Browser Use player
- **Adaptive polling**: First 10 polls at 1s, then 2s intervals (max 200 attempts ~6.5 min)
- **Eager liveUrl push**: `liveUrl` is pushed to the investigation record immediately after creation and during polling
- **404 on stop**: `stopSession` treats 404 as success — session may already be gone
- **Extreme mode**: Setting `extremeMode: true` uses the premium `bu-2-0` model for +12% accuracy
