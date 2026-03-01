---
name: convex-backend
description: Convex database schema, mutations, queries, actions, and scheduler patterns
---

# Convex Backend

## Overview

Convex is the sole backend — no Express, no custom server. All state, business logic, and external API calls run through Convex functions. The frontend connects via real-time subscriptions.

## Schema

Three tables in `convex/schema.ts`:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `investigations` | Root record for each investigation | `targetName`, `status`, `stepCount`, `report`, `browserLiveUrl` |
| `findings` | Individual evidence items discovered | `investigationId` (FK), `source`, `category`, `confidence` |
| `steps` | Activity log for real-time frontend stream | `investigationId` (FK), `stepNumber`, `tool`, `action`, `result` |

### Investigation Status Flow

```
planning → investigating → analyzing → complete
                                     → failed
```

### Indexes

- `findings.by_investigation` → `["investigationId"]`
- `steps.by_investigation` → `["investigationId"]`

## Function Types

| Type | Use For | File Access | Can Call APIs |
|------|---------|-------------|--------------|
| `query` | Reading data, frontend subscriptions | Read-only DB | No |
| `mutation` | Writing data, state changes | Read/write DB | No |
| `action` | External API calls, orchestration | Via runQuery/runMutation | Yes |
| `internalAction` | Tool implementations (not exposed to client) | Via runQuery/runMutation | Yes |

### Public vs Internal

- **Public** (`action`, `mutation`, `query`): Callable from frontend via `api.*`
- **Internal** (`internalAction`, `internalMutation`): Only callable from other Convex functions via `internal.*`

Tool implementations (`convex/tools/*.ts`) use `internalAction` — they're only called by the orchestrator, never directly from the frontend.

## Key Patterns

### Creating an investigation

```typescript
// convex/investigations.ts — create mutation
const id = await ctx.db.insert("investigations", {
  query: `Investigate ${args.targetName}`,
  targetName: args.targetName,
  status: "planning",
  stepCount: 0,
  createdAt: Date.now(),
});
```

### Querying with indexes

```typescript
// Always use .withIndex() for FK lookups
const findings = await ctx.db
  .query("findings")
  .withIndex("by_investigation", (q) =>
    q.eq("investigationId", args.investigationId)
  )
  .order("desc")
  .collect();
```

### Scheduling next step (self-chaining)

```typescript
// convex/orchestrator.ts — chains via scheduler
await ctx.scheduler.runAfter(0, internal.orchestrator.step, {
  investigationId: args.investigationId,
  conversationHistory: JSON.stringify(updatedHistory),
});
```

This avoids the 10-minute Convex action timeout by splitting each step into its own action invocation.

### Actions calling mutations

```typescript
// Inside an action handler
await ctx.runMutation(api.investigations.updateStatus, {
  id: args.investigationId,
  status: "investigating",
});
```

### File uploads

```typescript
// Generate upload URL for photos
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
```

## File Map

| File | Exports | Purpose |
|------|---------|---------|
| `convex/schema.ts` | default schema | Table definitions + indexes |
| `convex/investigations.ts` | `create`, `get`, `list`, `updateStatus`, `updateReport`, `updateBrowserSession`, `incrementStep`, `getFindings`, `getSteps`, `addStep`, `addFinding`, `generateUploadUrl` | All investigation CRUD |
| `convex/orchestrator.ts` | `startInvestigation` (action), `step` (internalAction) | Opus agentic loop |
| `convex/reports.ts` | `getReport` | Assembles investigation + findings + steps |
| `convex/tools/*.ts` | Tool-specific internalActions | External API integrations |

## Environment Variables

Set in Convex dashboard (Settings → Environment Variables), NOT in `.env`:

- `ANTHROPIC_API_KEY` — Claude API for orchestrator
- `BROWSER_USE_API_KEY` — Browser Use Cloud
- `FACECHECK_API_KEY` — FaceCheck.id

## Gotchas

- **No `fetch` in mutations/queries** — Only actions can make HTTP requests
- **10-minute timeout** — Actions auto-terminate. Use `scheduler.runAfter(0, ...)` to chain long-running workflows
- **Convex IDs are typed** — Use `v.id("tableName")`, not `v.string()` for foreign keys
- **No raw SQL** — Use `.query()` builder with `.withIndex()`, `.filter()`, `.order()`
- **Conversation history is serialized** — Stored as JSON string since Convex doesn't support deeply nested dynamic objects in validators
