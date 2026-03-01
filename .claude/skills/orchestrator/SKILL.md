---
name: orchestrator
description: Claude Opus agentic loop — think, pick tool, execute, repeat
---

# Orchestrator

## Overview

The orchestrator is the brain of TRACE. It runs Claude Opus in an agentic loop inside Convex actions, where each iteration: reads state → asks Opus "what next?" → executes the chosen tool → logs the step → schedules the next iteration.

Located in `convex/orchestrator.ts`.

## Architecture

```
startInvestigation (public action)
  │
  ├── Sets status to "investigating"
  ├── Checks maigret sidecar health
  ├── Builds initial context (name, description, photo URL, links)
  └── scheduler.runAfter(0, step)
        │
        ▼
      step (internalAction) ←──────────────────┐
        │                                       │
        ├── Check: status complete/failed? STOP  │
        ├── Check: stepCount >= 20? → report     │
        ├── Pre-fetch findings count             │
        ├── Build step context (budget/state)    │
        ├── Inject step context into messages    │
        ├── Call Anthropic Messages API           │
        ├── Parse response: text + tool_use      │
        ├── Execute tools (parallel + sequential)│
        ├── Track errors, browser usage          │
        ├── Format results per tool type         │
        ├── Compress history if needed           │
        └── scheduler.runAfter(0, step) ─────────┘
```

## Tools Available to Opus

Defined as Anthropic tool schemas in `TOOL_DEFINITIONS`:

| Tool Name | Args | Dispatches To |
|-----------|------|---------------|
| `maigret_search` | `username` | `internal.tools.maigret.investigate` |
| `browser_action` | `instruction` | `internal.tools.browserUse.runTask` |
| `web_search` | `query, count?` | `internal.tools.braveSearch.search` |
| `geospy_predict` | `imageUrl` | `internal.tools.geoSpy.predict` |
| `geo_locate` | `imageUrl` | `internal.tools.picarta.localize` |
| `reverse_image_search` | `imageUrl` | `internal.tools.reverseImageSearch.search` |
| `whitepages_lookup` | `name?, phone?, city?, stateCode?` | `internal.tools.whitePages.findPerson` (extreme mode) |
| `darkweb_search` | `term, maxResults?` | `internal.tools.intelx.search` (extreme mode) |
| `save_finding` | `source, category, data, confidence, ...` | `api.investigations.addFinding` |
| `done` | `summary` | `generateReport()` |

## System Prompt

Built by `buildSystemPrompt(maigretAvailable, extremeMode)`. Structured with:
- Tool descriptions with usage constraints
- Browser decision tree (last resort, max 6 uses)
- Phase-based strategy (Cast Net → Follow Leads → Verify & Wrap Up)
- Error recovery rules
- Deduplication rules
- Parallel execution guidance via `<use_parallel_tool_calls>`

## Step Context Injection

Each step injects a status line into the last user message via `buildStepContext()`:

```
[Step 8/20 | 12 remaining | Phase 2 (Follow Leads)]
[Findings saved: 5 | Browser uses: 2/6]
```

Warnings appear when resources are low:
- `[WARNING: Only 3 steps left...]` when ≤3 remaining
- `[Browser limit reached...]` when 6/6 browser actions used
- `[N consecutive errors...]` when ≥2 consecutive all-tool failures

## Tool Result Formatting

`formatToolResult(tool, rawResult)` applies per-tool truncation instead of a fixed character limit:

| Tool | Strategy | Max Chars |
|------|----------|-----------|
| `web_search` | Parse JSON, format as numbered list (title + URL + 150-char desc) | 3500 |
| `browser_action` | Raw text (already summarized by Browser Use) | 3500 |
| `save_finding` | Returns `"Finding saved."` | — |
| `maigret_search` | Raw text (formatted by `formatInvestigationForOpus`) | 5000 |
| Other tools | Raw text | 3500 |

## Tool Execution

Tools are split into parallel and sequential:
- `browser_action` calls run sequentially (shared session)
- All other tools run in parallel via `Promise.allSettled`

## Error Escalation

- `consecutiveErrors` tracks steps where ALL non-save tools failed
- After `MAX_CONSECUTIVE_ERRORS` (3) consecutive all-tool failures → force report generation
- Reset to 0 on any step with at least one successful tool

## Browser Budget

- `MAX_BROWSER_ACTIONS` = 6 per investigation
- `browserActionsUsed` tracked across steps
- When limit reached, `browser_action` is removed from available tools
- Step context warns the agent when browser budget is exhausted

## History Compression

When conversation exceeds `COMPRESSION_TOKEN_THRESHOLD` (20K tokens):
1. Keeps initial user message + last 3 exchanges
2. Summarizes older exchanges via Claude Sonnet
3. Injects summary as `[INVESTIGATION PROGRESS]` block

## Report Generation

Triggered by the `done` tool or when `stepCount >= MAX_STEPS`:
1. Fetches all findings and steps
2. Runs Opus (report) and Sonnet (behavioral analysis) in parallel
3. Stores report + behavioral analysis on investigation record
4. Cleans up browser session
5. Sets status to "complete"

## Safety Limits

| Limit | Value |
|-------|-------|
| MAX_STEPS | 20 |
| MAX_BROWSER_ACTIONS | 6 |
| MAX_CONSECUTIVE_ERRORS | 3 |
| MAX_CONSECUTIVE_SAVE_ONLY | 3 (then counts as a step) |
| Tool result (steps table) | 2000 chars |
| Reasoning log | 500 chars |
| Compression threshold | 20K tokens |

## Key Files

| File | What |
|------|------|
| `convex/orchestrator.ts` | `startInvestigation`, `step`, `generateReport`, `buildSystemPrompt`, `buildStepContext`, `formatToolResult`, `compressHistory`, `cleanupBrowserSession` |
| `convex/tools/browserUse.ts` | `runTask`, `getSession`, `stopSession` |
| `convex/tools/maigret.ts` | `search`, `investigate`, `healthCheck` |
| `convex/tools/braveSearch.ts` | `search` |
| `convex/tools/geoSpy.ts` | `predict` |
| `convex/tools/picarta.ts` | `localize` |
| `convex/tools/reverseImageSearch.ts` | `search` |
