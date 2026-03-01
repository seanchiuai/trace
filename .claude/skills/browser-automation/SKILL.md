---
name: browser-automation
description: Browser Use Cloud API integration for autonomous web browsing
---

# Browser Automation

## Overview

Browser Use Cloud provides "dumb hands" for the AI investigator. The orchestrator (Opus) sends natural language instructions, Browser Use executes them in a cloud browser, and returns extracted page text. The user can watch via a live iframe.

## API

Base URL: `https://api.browser-use.com/api/v2`

Auth: `X-Browser-Use-API-Key: {BROWSER_USE_API_KEY}`

### Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sessions` | POST | Create a new browser session |
| `/sessions/{sessionId}` | GET | Fetch session details (includes `liveUrl`) |
| `/sessions/{sessionId}` | PATCH | Stop a session (`{ action: "stop" }`) |
| `/tasks` | POST | Create and execute a natural language browser task |
| `/tasks/{taskId}` | GET | Poll task status until finished/failed |

### Task Execution

```typescript
// convex/tools/browserUse.ts — runTask
// Step 1: Create the task
const body: Record<string, unknown> = { task: "Go to instagram.com/johndoe123 and describe what you see" };
if (existingSessionId) {
  body.session_id = existingSessionId;  // reuses session
}

const createRes = await fetch(`${API}/tasks`, {
  method: "POST",
  headers: { "X-Browser-Use-API-Key": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const created = await createRes.json();
const taskId = created.id;

// Step 2: Poll until finished/failed (max 120 attempts x 2s = 4 min)
const pollRes = await fetch(`${API}/tasks/${taskId}`, {
  headers: { "X-Browser-Use-API-Key": apiKey },
});
const task = await pollRes.json();
// task.status === "finished" | "failed"
```

### Response Shape

```typescript
// Task creation response
{
  id: string;           // task ID for polling
}

// Task poll response (when finished)
{
  id: string;
  status: "finished" | "failed";
  output: string;       // extracted text content from the browser
  sessionId: string;    // session used
  error?: string;       // present if failed
}

// Session response
{
  id: string;
  liveUrl: string;      // iframe-embeddable URL for live viewing
}
```

## Integration with Orchestrator

1. `startInvestigation` eagerly creates a browser session via `createSession` so the live URL appears immediately
2. Session `id` and `liveUrl` are stored on the investigation record via `updateBrowserSession`
3. Opus decides to browse: `browser_action("Go to instagram.com/johndoe123")`
4. Orchestrator calls `internal.tools.browserUse.runTask` (passes `sessionId` if available)
5. Frontend picks up `browserLiveUrl` and renders it in `BrowserView` iframe
6. Opus gets the `output` text back and reasons about what it saw
7. On investigation completion/failure, `cleanupBrowserSession` stops the session via `stopSession`

## Frontend: BrowserView Component

`src/components/BrowserView.tsx`

- Empty state (planning): globe icon + "Waiting for investigation to start..."
- Connecting state (investigating, no URL yet): green pulse + "Connecting to browser..."
- Active state: URL bar (green dot + "LIVE" badge) + full-height iframe

```tsx
<iframe
  src={liveUrl}
  className="flex-1 w-full bg-black"
  title="Browser Use Live View"
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
/>
```

## Convex Implementation

All five functions are `internalAction` — only callable by the orchestrator, never from the frontend.

| Function | File | Purpose |
|----------|------|---------|
| `createSession` | `convex/tools/browserUse.ts` | Create a new browser session |
| `runTask` | `convex/tools/browserUse.ts` | Create task + poll until finished (up to 4 min) |
| `getTaskStatus` | `convex/tools/browserUse.ts` | Check status of a specific task |
| `getSession` | `convex/tools/browserUse.ts` | Fetch session details (for `liveUrl`) |
| `stopSession` | `convex/tools/browserUse.ts` | Stop a session (PATCH with `{ action: "stop" }`) |

## Session Persistence

The `browserSessionId` and `browserLiveUrl` are stored on the investigation record so:
- Subsequent browser actions reuse the same session (maintains cookies, state)
- The frontend can display the live URL at any time
- Session is cleaned up when the investigation completes or fails

## Gotchas

- **Session reuse**: Always pass `session_id` for subsequent tasks to maintain login state
- **iframe sandbox**: `allow-same-origin allow-scripts allow-forms allow-popups` needed for Browser Use player
- **CORS**: Browser Use live URLs should be embeddable — if not, may need to proxy
- **Polling timeout**: `runTask` polls up to 120 attempts x 2s = 4 minutes max per task
- **404 on stop**: `stopSession` treats 404 as success — session may already be gone
