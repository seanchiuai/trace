# Implementation Plan: Live Steering

**Branch:** `feat/live-steering`
**Estimated time:** 30-45 min
**Risk:** Low — backend orchestrator already processes directives, this is mutation + UI only

## Context

The orchestrator already checks for pending directives at each step boundary (line 474 of `orchestrator.ts`). It reads unacknowledged directives from the `directives` table, injects them into the conversation as `[HUMAN OPERATOR DIRECTIVES]`, and acknowledges them. The schema supports two types: `kill_lead` (tied to a finding) and `general` (free-text steering).

**What's missing:** A mutation to create directives and UI to send/display them.

## Changes

### 1. `convex/directives.ts` — Add `createDirective` mutation

```ts
export const createDirective = mutation({
  args: {
    investigationId: v.id("investigations"),
    type: v.union(v.literal("kill_lead"), v.literal("general")),
    message: v.string(),
    findingId: v.optional(v.id("findings")),
  },
  handler: async (ctx, args) => {
    // Only allow directives on active investigations
    const investigation = await ctx.db.get(args.investigationId);
    if (!investigation || !["investigating", "planning", "awaiting_input"].includes(investigation.status)) {
      throw new Error("Cannot add directive to inactive investigation");
    }
    return await ctx.db.insert("directives", {
      investigationId: args.investigationId,
      type: args.type,
      message: args.message,
      findingId: args.findingId,
      acknowledged: false,
      createdAt: Date.now(),
    });
  },
});
```

### 2. `src/components/SteeringInput.tsx` — New component

Text input bar pinned above the CommandStrip. Visible only when investigation is active.

**Design:**
- Dark input field matching existing theme (bg-bg-card, border-border)
- Placeholder: "Steer the investigation..." 
- Send button with arrow icon (accent color)
- On submit: calls `createDirective` mutation with type `"general"`
- Shows brief "Directive queued ✓" toast/flash after sending
- Disabled state while submitting
- Enter to send, Shift+Enter for newline (single line by default)

**Layout in Investigation.tsx:**
```
[BrowserView / Graph / Map]
[SteeringInput]        ← NEW, only when isLive
[CommandStrip]
[ClarificationCard]
```

### 3. `src/components/CommandStrip.tsx` — Show directive pills

Add directive display inline in the step timeline:
- Query `api.directives.getDirectives` for the investigation
- Render directive entries as distinct pills between steps (by timestamp ordering)
- Style: amber/yellow border, "👤 OPERATOR" badge, message text
- Acknowledged directives show a ✓ checkmark

### 4. `src/pages/Investigation.tsx` — Wire it up

- Import `SteeringInput`
- Pass `investigationId` and `isLive` to it
- Place between FindingToasts and CommandStrip layers

### 5. Kill Lead shortcut (bonus, optional)

On `FindingsGrid`, add a small "✕ Kill Lead" button on each finding card. Calls `createDirective` with `type: "kill_lead"` and `findingId`. This tells the agent to stop pursuing that lead.

## Files Changed

| File | Change |
|------|--------|
| `convex/directives.ts` | Add `createDirective` mutation |
| `src/components/SteeringInput.tsx` | **New** — text input + send |
| `src/components/CommandStrip.tsx` | Interleave directive pills in timeline |
| `src/pages/Investigation.tsx` | Wire SteeringInput into layout |
| `src/components/FindingsGrid.tsx` | *(optional)* Kill Lead button |

## How It Works End-to-End

1. User types "Focus on LinkedIn connections, skip Instagram" → hits Send
2. `createDirective` mutation inserts row: `{ type: "general", message: "Focus on LinkedIn...", acknowledged: false }`
3. Agent finishes current step → `orchestrator.step` runs → line 474 queries pending directives
4. Directive injected into conversation: `[HUMAN OPERATOR DIRECTIVES]\nGeneral directive: Focus on LinkedIn connections, skip Instagram`
5. Agent sees it as operator instruction, adjusts strategy on next tool call
6. Directive marked `acknowledged: true` → shows ✓ in CommandStrip

## Not In Scope
- Voice input
- Suggested steering prompts / quick actions (future enhancement)
- Directive history page
