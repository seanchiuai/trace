# Implementation Plan: Parallelize Tool Execution

## Problem
Tools execute sequentially in a `for` loop (orchestrator.ts:279). When Claude returns 3 tool calls in one turn (e.g. `web_search` + `save_finding` + `browser_action`), they run one after another. Browser Use tasks take 10-30s each, so 3 sequential calls = 30-90s wasted.

## Solution
Replace the sequential `for` loop with `Promise.all` for independent tools, while keeping `save_finding` calls sequential (they're instant and order doesn't matter much, but they're also free so no need to complicate).

## Current Code (orchestrator.ts:275-294)
```typescript
for (const tc of toolCalls) {
  if (tc.tool !== "save_finding") {
    hasNonSaveFinding = true;
    currentStepNumber = (await ctx.runQuery(...))?.stepCount ?? currentStepNumber;
    currentStepNumber += 1;
  }
  const result = await executeToolCall(ctx, {
    investigationId: args.investigationId,
    investigation,
    toolCall: tc,
    stepNumber: currentStepNumber,
  });
  toolResults.push({ id: tc.id, tool: tc.tool, result });
}
```

## New Code
```typescript
// Separate save_findings (instant, run first) from expensive tools (parallelize)
const saveFindingCalls = toolCalls.filter(tc => tc.tool === "save_finding");
const expensiveCalls = toolCalls.filter(tc => tc.tool !== "save_finding");

// Run save_findings first (instant, sequential is fine)
for (const tc of saveFindingCalls) {
  const result = await executeToolCall(ctx, {
    investigationId: args.investigationId,
    investigation,
    toolCall: tc,
    stepNumber: currentStepNumber,
  });
  toolResults.push({ id: tc.id, tool: tc.tool, result });
}

// Run expensive tools in parallel
if (expensiveCalls.length > 0) {
  hasNonSaveFinding = true;
  // Pre-allocate step numbers
  const baseStep = (await ctx.runQuery(api.investigations.get, { id: args.investigationId }))?.stepCount ?? currentStepNumber;
  
  const parallelResults = await Promise.all(
    expensiveCalls.map((tc, i) =>
      executeToolCall(ctx, {
        investigationId: args.investigationId,
        investigation,
        toolCall: tc,
        stepNumber: baseStep + i + 1,
      }).then(result => ({ id: tc.id, tool: tc.tool, result }))
    )
  );
  toolResults.push(...parallelResults);
  currentStepNumber = baseStep + expensiveCalls.length;
}
```

## What This Changes
- `web_search` + `browser_action` called in same turn → run simultaneously
- `save_finding` still runs first (instant, no cost)
- Step numbers pre-allocated in bulk instead of queried per-tool

## Risk Assessment
- **LOW**: Each tool call is independent (different API calls, different DB writes)
- **Edge case**: Two `browser_action` calls in same turn could conflict on the shared Browser Use session. Mitigation: Browser Use sessions handle one task at a time anyway — they'll just queue internally. The parallel `Promise.all` still saves time on the non-BU tools running alongside.
- **Step number collisions**: Pre-allocating fixes this. Steps are just for display/timeline.

## Expected Impact
- **2 independent tools in one turn**: ~50% faster (e.g. 20s → 10s)
- **3 independent tools**: ~66% faster
- **Per investigation (14 steps, ~4-5 multi-tool turns)**: 30-60s saved

## Files Changed
- `convex/orchestrator.ts` — ~20 lines changed in the tool execution block
