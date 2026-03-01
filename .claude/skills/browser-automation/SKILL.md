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
| `/sessions` | POST | Create session + run a task (combined in v3) |
| `/sessions/{sessionId}` | GET | Poll session status until idle/stopped/error |
| `/sessions/{sessionId}/stop` | POST | Stop a session |

### Session Statuses (v3)

| Status | Meaning |
|--------|---------|
| `created` | Sandbox spinning up |
| `running` | Task currently executing |
| `idle` | Task finished, session alive (`keepAlive: true`), ready for next task |
| `stopped` | Session terminated |
| `timed_out` | Session exceeded time limit |
| `error` | Session encountered an error |

### Task Execution

```typescript
// convex/tools/browserUse.ts — runTask
// v3: session creation and task execution are combined
const body: Record<string, unknown> = {
  task: "Go to imginn.com/johndoe and describe what you see",
  keepAlive: true,
};
if (existingSessionId) {
  body.sessionId = existingSessionId;  // reuses session
}

const createRes = await fetch(`${API}/sessions`, {
  method: "POST",
  headers: getHeaders(),
  body: JSON.stringify(body),
});
const created = await createRes.json();
const sessionId = created.id;

// Poll GET /sessions/{id} until status is "idle" (finished)
// Adaptive polling: 1s for first 10 checks, then 2s after
// Max 200 attempts (~6 minutes)
```

## Session Reuse

Before reusing a session, `waitForSessionIdle()` polls the session status for up to 60s:
- If `idle` → reuse by passing `sessionId` in the POST body
- If dead (`stopped`, `timed_out`, `error`) → create a fresh session
- If `running`/`created` → wait up to 60s, then create fresh

## Graceful Error Handling

Terminal states return structured results with recovery hints instead of throwing:

```typescript
// Instead of: throw new Error("Browser Use task timed out")
// Returns:
{
  output: "Browser timed out. RECOVERY: Use web_search instead.",
  sessionId,
  liveUrl,
  status: "timed_out",
}
```

This lets the orchestrator pass the recovery hint to Opus, which can then switch to `web_search`.

## Browser Budget

The orchestrator limits browser actions to `MAX_BROWSER_ACTIONS` (6) per investigation:
- Tracked via `browserActionsUsed` counter across steps
- When limit reached, `browser_action` is removed from available tools
- Step context warns: `[Browser limit reached. Use web_search for all remaining lookups.]`

## Integration with Orchestrator

1. `startInvestigation` checks maigret health, builds initial context, starts the step loop
2. First `browser_action` call creates the session; `sessionId` and `liveUrl` stored on investigation
3. Subsequent `browser_action` calls reuse the session via `waitForSessionIdle`
4. Frontend picks up `browserLiveUrl` and renders it in `BrowserView` iframe
5. On investigation completion/failure, `cleanupBrowserSession` stops the session

## Frontend: BrowserView Component

`src/components/BrowserView.tsx`

- Empty state (planning): globe icon + "Waiting for investigation to start..."
- Connecting state (investigating, no URL yet): green pulse + "Connecting to browser..."
- Active state: URL bar (green dot + "LIVE" badge) + full-height iframe

## Convex Implementation

All functions are `internalAction` — only callable by the orchestrator.

| Function | File | Purpose |
|----------|------|---------|
| `runTask` | `convex/tools/browserUse.ts` | Create/reuse session + run task + poll until idle (up to ~6 min) |
| `getSession` | `convex/tools/browserUse.ts` | Fetch session details |
| `stopSession` | `convex/tools/browserUse.ts` | Stop a session (POST to /stop endpoint) |

## Gotchas

- **Session reuse**: `waitForSessionIdle` ensures the session is ready before sending a new task
- **Extreme mode**: Sets `model: "bu-2-0"` for +12% accuracy
- **iframe sandbox**: `allow-same-origin allow-scripts allow-forms allow-popups` needed for Browser Use player
- **Retry on 5xx/429**: `runTask` retries up to 2 times with 3s delay for server errors
- **404 on stop**: `stopSession` treats 404 as success — session may already be gone
- **Error recovery**: Timeouts and errors return structured output with `RECOVERY:` hints, not exceptions
