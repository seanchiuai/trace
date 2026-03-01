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
  └── scheduler.runAfter(0, step)
        │
        ▼
      step (internalAction) ←──────────────────┐
        │                                       │
        ├── Check: status complete/failed? STOP  │
        ├── Check: stepCount >= 20? → report     │
        ├── Call Anthropic Messages API           │
        ├── Parse response: text + tool_use       │
        ├── Log reasoning to steps table          │
        ├── Execute tool (switch on tool name)    │
        ├── Log result to steps table             │
        ├── Append to conversation history         │
        └── scheduler.runAfter(0, step) ──────────┘
```

## Tools Available to Opus

Defined as Anthropic tool schemas in the `step` function:

| Tool Name | Args | Dispatches To | Returns |
|-----------|------|---------------|---------|
| `maigret_search` | `username` | `internal.tools.maigret.search` | Profile URLs + metadata JSON |
| `browser_action` | `instruction` | `internal.tools.browserUse.runTask` | Screenshot + page text JSON |
| `face_check` | `imageUrl` | `internal.tools.faceCheck.searchByImage` | Matching profiles + scores |
| `save_finding` | `source, category, data, confidence, platform?, profileUrl?` | `api.investigations.addFinding` | "Finding saved successfully." |
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
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: conversationHistory,
    tools: [...],
  }),
});
```

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
    content: [{
      type: "tool_result",
      tool_use_id: toolUseBlock.id,
      content: toolResult.slice(0, 4000),
    }],
  },
];
```

## Report Generation

Triggered by the `done` tool or when `stepCount >= MAX_STEPS`:

1. Fetches all findings for the investigation
2. Builds a prompt with findings summary
3. Calls Opus to generate markdown report
4. Stores report on investigation record
5. Sets status to "complete"

Overall confidence = average of all finding confidence scores.

## System Prompt

The system prompt defines:
- Role: "expert missing persons investigator"
- Available tools with descriptions
- Strategy: Maigret first → Browser Use for profiles → FaceCheck on photos → follow leads → save findings → report
- Instruction to explain reasoning before each action

## Safety Limits

- **MAX_STEPS = 20** — Hard cap, forces report generation
- **Tool result truncation** — Results capped at 2000 chars for steps, 4000 chars for conversation
- **Reasoning truncation** — Logged reasoning capped at 500 chars
- **Error handling** — Tool errors caught and returned as text, don't crash the loop
- **Terminal states** — Loop exits if status is "complete" or "failed"

## Key Files

| File | What |
|------|------|
| `convex/orchestrator.ts` | `startInvestigation`, `step`, `generateReport`, `calculateOverallConfidence` |
| `convex/tools/browserUse.ts` | `createSession`, `runTask`, `getTaskStatus` |
| `convex/tools/faceCheck.ts` | `searchByImage`, `extractPlatform` |
| `convex/tools/maigret.ts` | `search` |
