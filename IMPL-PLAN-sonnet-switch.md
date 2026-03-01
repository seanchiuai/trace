# Implementation Plan: Switch Agentic Loop to Sonnet

## Problem
The main orchestrator loop uses `claude-opus-4-20250514` (line 213) for every step — deciding which tool to call, interpreting results, planning next action. Opus is the smartest but also the slowest model. For tool-routing decisions, Sonnet is fast enough and 3-5x quicker at inference.

## Solution
Use Sonnet for the agentic loop (tool selection + reasoning). Keep Opus for the final report generation where quality matters most.

## Current Code

### Agentic loop (orchestrator.ts:213)
```typescript
model: "claude-opus-4-20250514",
```

### Report generation (orchestrator.ts:675) — KEEP AS-IS
```typescript
model: "claude-opus-4-20250514",  // Already correct — quality matters for reports
```

Wait — checking line 675...

### All model references in orchestrator.ts
| Line | Purpose | Current | Action |
|------|---------|---------|--------|
| 213 | **Agentic loop** (tool selection + reasoning) | Opus | **→ Sonnet** |
| 335 | History compression | Sonnet | Already correct |
| 554 | History summarization | Sonnet | Already correct |
| 675 | **Final report generation** | Opus | Keep Opus (quality matters) |

## Change — ONE LINE

### orchestrator.ts:213
```diff
- model: "claude-opus-4-20250514",
+ model: "claude-sonnet-4-20250514",
```

That's it. Everything else is already optimal.

## Risk Assessment
- **VERY LOW**: Sonnet handles tool routing well. The thinking/analysis is captured in findings along the way, so even if individual step reasoning is slightly less deep, the investigation quality stays high.
- **Rollback**: One-line change back to Opus if quality drops noticeably.

## Expected Impact
- **Per LLM call**: Opus ~8-15s → Sonnet ~2-5s
- **Per investigation (14 steps)**: 14 × (8s saved) = **75-150s saved**
- **Cost**: Sonnet is ~5x cheaper per token → significant cost reduction too

## Files Changed
- `convex/orchestrator.ts` — 1-3 lines changed (model string swaps)
