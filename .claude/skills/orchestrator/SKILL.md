---
name: orchestrator
description: Claude Opus agentic loop — think, pick tool, execute, repeat
---

# Orchestrator

## Overview

The orchestrator is the brain of TRACE. It runs Claude Opus in an agentic loop inside Convex actions, where each iteration: reads state -> asks Opus "what next?" -> executes the chosen tool -> logs the step -> schedules the next iteration.

Located in `convex/orchestrator.ts`.

## Architecture

```
startInvestigation (public action)
  |
  |-- Sets status to "investigating"
  |-- Checks Maigret sidecar health (conditionally includes maigret_search tool)
  |-- Reads extremeMode flag from investigation record
  +-- scheduler.runAfter(0, step)
        |
        v
      step (internalAction) <---------------------------+
        |                                                |
        |-- Check: status complete/failed? STOP          |
        |-- Check: stepCount >= 20? -> report            |
        |-- Check: consecutive save-only >= 3? -> force  |
        |-- Compress history if tokens > 20,000          |
        |-- Call Anthropic Messages API                  |
        |-- Parse response: text + tool_use              |
        |-- Execute tools (parallel except browser)      |
        |-- Log steps (batch via addSteps)               |
        |-- Save graph edges from tool results           |
        |-- Track token usage + cost                     |
        |-- Append to conversation history               |
        +-- scheduler.runAfter(0, step) -----------------+
```

## Tools Available to Opus

Defined as Anthropic tool schemas in the `step` function. Tools are conditionally included based on `maigretAvailable` and `extremeMode`:

| Tool Name | Args | Dispatches To | Returns |
|-----------|------|---------------|---------|
| `maigret_search` | `username` | `internal.tools.maigret.investigate` | Profile URLs + LLM-extracted leads |
| `browser_action` | `instruction` | `internal.tools.browserUse.runTask` | `output` text from browser |
| `web_search` | `query, count?` | `internal.tools.braveSearch.search` | Titles, URLs, snippets (Brave Search API) |
| `geospy_predict` | `imageUrl` | `internal.tools.geoSpy.predict` | Lat/lon/confidence geo prediction |
| `geo_locate` | `imageUrl` | `internal.tools.picarta.localize` | Lat/lon/confidence via Picarta AI |
| `whitepages_lookup` | `name, city?, state?` | `internal.tools.whitePages.findPerson` | Name, address, phone records (extreme mode only) |
| `reverse_image_search` | `imageUrl` | `internal.tools.reverseImageSearch.search` | Visual matches via Google Lens |
| `darkweb_search` | `query` | `internal.tools.intelx.search` | Dark web / data breach results (extreme mode only) |
| `save_finding` | `source, category, data, confidence, platform?, profileUrl?, imageUrl?` | `api.investigations.addFinding` | "Finding saved successfully." |
| `done` | `summary` | `generateReport()` | Ends loop, generates report |

## Anthropic API Integration

Direct `fetch` to the Messages API (no SDK dependency):

```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-opus-4-20250514",
    max_tokens: 4096,
    system: buildSystemPrompt(maigretAvailable, extremeMode),
    messages: conversationHistory,
    tools: [...],
  }),
});
```

## Dynamic System Prompt

`buildSystemPrompt(maigretAvailable, extremeMode)` constructs the prompt based on runtime conditions:
- Role: "expert missing persons investigator"
- Strategy bullets for investigation approach
- Available tools (conditionally includes `maigret_search`, `whitepages_lookup`, `darkweb_search`)
- `<use_parallel_tool_calls>` directive for efficiency

## Conversation History Management

History is serialized as a JSON string and passed between `step` invocations via the scheduler. Each step appends:

1. The assistant's response (including `tool_use` blocks)
2. A `tool_result` message with the execution output

```typescript
const updatedHistory = [
  ...conversationHistory,
  { role: "assistant", content: data.content },
  {
    role: "user",
    content: toolResults.map(tr => ({
      type: "tool_result",
      tool_use_id: tr.id,
      content: tr.result.slice(0, 4000),
    })),
  },
];
```

### History Compression

When estimated tokens exceed `COMPRESSION_TOKEN_THRESHOLD` (20,000), `compressHistory()` calls Claude Sonnet to summarize older exchanges, keeping the 3 most recent exchanges intact. This prevents context window overflow during long investigations.

## Parallel Tool Execution

When Opus requests multiple tools in a single response:
- **Browser actions** run sequentially (shared session state)
- **All other tools** run concurrently via `Promise.allSettled`
- Results are re-ordered to match the original call order

## Report Generation

Triggered by the `done` tool or when `stepCount >= MAX_STEPS`:

1. Fetches all findings AND steps for the investigation
2. Builds a prompt with findings + steps summary
3. Runs two API calls in parallel:
   - **Opus** generates the markdown report (max_tokens: 4096)
   - **Sonnet** generates behavioral analysis (timezone, username patterns, predicted handles, interest clusters)
4. Stores report + behavioral analysis on investigation record
5. Calculates overall confidence (average of all finding confidence scores)
6. Cleans up the browser session via `cleanupBrowserSession`
7. Sets status to "complete"

## Token Usage Tracking

Every Anthropic API call tracks `input_tokens` and `output_tokens` via `api.investigations.updateTokenUsage`, including per-model cost estimation (Sonnet vs Opus pricing).

## Safety Limits

- **MAX_STEPS = 20** — Hard cap, forces report generation
- **MAX_CONSECUTIVE_SAVE_ONLY = 3** — If orchestrator only calls `save_finding` for 3 consecutive steps, forces a step increment to prevent infinite save-only loops
- **Tool result truncation** — Results capped at 2000 chars for steps, 4000 chars for conversation
- **Reasoning truncation** — Logged reasoning capped at 500 chars
- **Error handling** — Tool errors caught and returned as text, don't crash the loop
- **Terminal states** — Loop exits if status is "complete" or "failed"
- **API failure** — Cleans up browser session and sets status to "failed"

## Browser Session Cleanup

After report generation (or on API failure), the orchestrator cleans up:

```typescript
async function cleanupBrowserSession(ctx, investigationId) {
  const investigation = await ctx.runQuery(api.investigations.get, { id: investigationId });
  if (investigation?.browserSessionId) {
    await ctx.runAction(internal.tools.browserUse.stopSession, {
      sessionId: investigation.browserSessionId,
    });
    await ctx.runMutation(api.investigations.updateBrowserSession, {
      id: investigationId,
      browserSessionId: undefined,
      browserLiveUrl: undefined,
    });
  }
}
```

## Key Files

| File | What |
|------|------|
| `convex/orchestrator.ts` | `startInvestigation`, `step`, `generateReport`, `cleanupBrowserSession`, `calculateOverallConfidence`, `compressHistory` |
| `convex/tools/browserUse.ts` | `runTask`, `getSession`, `stopSession` |
| `convex/tools/maigret.ts` | `search`, `investigate`, `healthCheck` |
| `convex/tools/braveSearch.ts` | `search` |
| `convex/tools/picarta.ts` | `localize` |
| `convex/tools/intelx.ts` | `search` |
| `convex/tools/reverseImageSearch.ts` | `search` |
| `convex/graphEdges.ts` | `addEdge`, `addEdges`, `getEdges` |
