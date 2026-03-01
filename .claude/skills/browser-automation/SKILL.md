---
name: browser-automation
description: Browser Use Cloud API integration for autonomous web browsing
---

# Browser Automation

## Overview

Browser Use Cloud provides "dumb hands" for the AI investigator. The orchestrator (Opus) sends natural language instructions, Browser Use executes them in a cloud browser, and returns screenshots + extracted page text. The user can watch via a live iframe.

## API

Base URL: `https://api.browser-use.com/api/v1`

Auth: `Authorization: Bearer {BROWSER_USE_API_KEY}`

### Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sessions` | POST | Create a new browser session |
| `/run-task` | POST | Execute a natural language browser action |
| `/task/{taskId}` | GET | Poll task status |

### Task Execution

```typescript
// convex/tools/browserUse.ts — runTask
const body = {
  task: "Go to instagram.com/johndoe123 and describe what you see",
  session_id: existingSessionId,  // optional, reuses session
};

const res = await fetch(`${API}/run-task`, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
```

### Response Shape

```typescript
{
  task_id: string;
  session_id: string;
  live_url: string;       // iframe-embeddable URL for live viewing
  status: "running" | "completed" | "failed";
  result: {
    screenshot: string;   // base64 or URL
    page_text: string;    // extracted text content
    url: string;          // current page URL
  };
}
```

## Integration with Orchestrator

1. Opus decides to browse: `browser_action("Go to instagram.com/johndoe123")`
2. Orchestrator calls `internal.tools.browserUse.runTask`
3. Response includes `session_id` and `live_url`
4. Orchestrator stores these on the investigation record via `updateBrowserSession`
5. Frontend picks up `browserLiveUrl` and renders it in `BrowserView` iframe
6. Opus gets the result text back and reasons about what it saw

## Frontend: BrowserView Component

`src/components/BrowserView.tsx`

- Empty state: globe icon + "Waiting for browser session"
- Connecting state: green pulse + "Connecting to browser..."
- Active state: URL bar (green dot + "LIVE" badge) + full-height iframe

```tsx
<iframe
  src={liveUrl}
  className="flex-1 w-full bg-black"
  sandbox="allow-same-origin allow-scripts"
/>
```

## Convex Implementation

All three endpoints are `internalAction` — only callable by the orchestrator, never from the frontend.

| Function | File | Visibility |
|----------|------|-----------|
| `createSession` | `convex/tools/browserUse.ts` | internal |
| `runTask` | `convex/tools/browserUse.ts` | internal |
| `getTaskStatus` | `convex/tools/browserUse.ts` | internal |

## Session Persistence

The `browserSessionId` and `browserLiveUrl` are stored on the investigation record so:
- Subsequent browser actions reuse the same session (maintains cookies, state)
- The frontend can display the live URL at any time

## Gotchas

- **Session reuse**: Always pass `session_id` for subsequent tasks to maintain login state
- **iframe sandbox**: `allow-same-origin allow-scripts` needed for Browser Use player
- **CORS**: Browser Use live URLs should be embeddable — if not, may need to proxy
- **Task timeout**: Individual tasks are short (15-30s each). Long browsing sessions are split across multiple task calls by the orchestrator
