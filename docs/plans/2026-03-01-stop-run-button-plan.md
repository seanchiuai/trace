# Stop Run Button — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a stop button to the CommandStrip so users can terminate a running investigation early, cleaning up the browser session and halting the orchestrator loop.

**Architecture:** Add a `"stopped"` status to the schema. A new public action `stopInvestigation` sets the status and cleans up the browser session. The orchestrator's step guard already exits on terminal statuses — we add `"stopped"` to that check. The frontend renders a stop button in the CommandStrip when the investigation is live.

**Tech Stack:** Convex (schema, mutations, actions), React, Framer Motion, TypeScript

---

### Task 1: Add "stopped" status to schema

**Files:**
- Modify: `convex/schema.ts:12-18`

**Step 1: Add the literal to the status union**

In `convex/schema.ts`, the `status` field union (lines 12-18) currently has 5 values. Add `v.literal("stopped")` after `"failed"`:

```typescript
    status: v.union(
      v.literal("planning"),
      v.literal("investigating"),
      v.literal("analyzing"),
      v.literal("complete"),
      v.literal("failed"),
      v.literal("stopped")
    ),
```

**Step 2: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add 'stopped' status to investigation schema"
```

---

### Task 2: Add "stopped" to updateStatus mutation

**Files:**
- Modify: `convex/investigations.ts:46-68`

**Step 1: Update the status union in updateStatus args**

In `convex/investigations.ts`, the `updateStatus` mutation args (lines 48-55) need `"stopped"` added. Also handle `completedAt` for stopped status:

```typescript
export const updateStatus = mutation({
  args: {
    id: v.id("investigations"),
    status: v.union(
      v.literal("planning"),
      v.literal("investigating"),
      v.literal("analyzing"),
      v.literal("complete"),
      v.literal("failed"),
      v.literal("stopped")
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "complete" || args.status === "stopped") {
      patch.completedAt = Date.now();
    }
    if (args.status === "failed" && args.errorMessage) {
      patch.errorMessage = args.errorMessage;
    }
    await ctx.db.patch(args.id, patch);
  },
});
```

**Step 2: Commit**

```bash
git add convex/investigations.ts
git commit -m "feat: accept 'stopped' in updateStatus mutation"
```

---

### Task 3: Add stopInvestigation action to orchestrator

**Files:**
- Modify: `convex/orchestrator.ts:228` (after startInvestigation), `convex/orchestrator.ts:284`

**Step 1: Add the public stopInvestigation action**

Add this right after the `startInvestigation` action (after its closing `});`). Find the end of `startInvestigation` and add:

```typescript
export const stopInvestigation = action({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const investigation = await ctx.runQuery(api.investigations.get, { id: args.investigationId });
    if (!investigation) throw new Error("Investigation not found");
    if (investigation.status === "complete" || investigation.status === "failed" || investigation.status === "stopped") {
      return; // Already in a terminal state
    }
    await ctx.runMutation(api.investigations.updateStatus, {
      id: args.investigationId,
      status: "stopped",
    });
    await cleanupBrowserSession(ctx, args.investigationId);
  },
});
```

**Step 2: Update the step guard to include "stopped"**

At line 284 in the `step` internalAction, change:

```typescript
if (investigation.status === "complete" || investigation.status === "failed") return;
```

to:

```typescript
if (investigation.status === "complete" || investigation.status === "failed" || investigation.status === "stopped") return;
```

**Step 3: Verify Convex dev server accepts the changes**

Run: `npx convex dev` should not show errors (or check the running dev terminal).

**Step 4: Commit**

```bash
git add convex/orchestrator.ts
git commit -m "feat: add stopInvestigation action and update step guard"
```

---

### Task 4: Add stop button to CommandStrip

**Files:**
- Modify: `src/components/CommandStrip.tsx`

**Step 1: Add onStop prop and stopping state**

Update the interface and component:

```typescript
interface CommandStripProps {
  steps: Step[];
  isLive: boolean;
  progress: number;
  onStop?: () => void;
}

export default function CommandStrip({ steps, isLive, progress, onStop }: CommandStripProps) {
```

Add a `stopping` state inside the component:

```typescript
  const [stopping, setStopping] = useState(false);
```

**Step 2: Add the stop button in the chyron bar**

In the collapsed chyron bar `<div>` (line 149), add a stop button right before the expand/collapse button (before line 173). Place it between the live pulse dot area and the expand button:

```tsx
        {/* Stop button */}
        <AnimatePresence>
          {isLive && onStop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, width: 0 }}
              animate={{ opacity: 1, scale: 1, width: "auto" }}
              exit={{ opacity: 0, scale: 0.8, width: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setStopping(true);
                onStop();
              }}
              disabled={stopping}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger/10 hover:bg-danger/20 transition-colors text-danger cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              {stopping ? (
                <div className="w-3 h-3 border border-danger/50 border-t-danger rounded-full animate-spin" />
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              )}
              <span className="text-[10px] font-mono font-medium tracking-wider whitespace-nowrap">
                {stopping ? "STOPPING" : "STOP"}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
```

**Step 3: Reset stopping state when isLive changes to false**

Add a useEffect:

```typescript
  useEffect(() => {
    if (!isLive) setStopping(false);
  }, [isLive]);
```

**Step 4: Commit**

```bash
git add src/components/CommandStrip.tsx
git commit -m "feat: add stop button to CommandStrip"
```

---

### Task 5: Wire stop button in Investigation page

**Files:**
- Modify: `src/pages/Investigation.tsx`

**Step 1: Add "stopped" to STATUS_CONFIG**

Add after the `failed` entry (line 51):

```typescript
  stopped: {
    label: "STOPPED",
    color: "text-warning",
    dotColor: "bg-warning",
    pulse: false,
  },
```

**Step 2: Wire the stop action**

Add `useMutation` import if not present (it uses `useAction` already). Add after the `startInvestigation` action (line 68):

```typescript
  const stopInvestigation = useAction(api.orchestrator.stopInvestigation);
```

Create a handler:

```typescript
  const handleStop = async () => {
    try {
      await stopInvestigation({ investigationId });
    } catch (e) {
      console.error("Failed to stop investigation:", e);
    }
  };
```

**Step 3: Pass onStop to CommandStrip**

Update the CommandStrip usage (line 234):

```tsx
      <CommandStrip
        steps={steps || []}
        isLive={isLive}
        progress={progress}
        onStop={handleStop}
      />
```

**Step 4: Verify the UI works**

Run: `npm run dev` — navigate to a live investigation and confirm the stop button appears in the bottom bar.

**Step 5: Commit**

```bash
git add src/pages/Investigation.tsx
git commit -m "feat: wire stop button in Investigation page"
```

---

### Task 6: Build check

**Step 1: Run TypeScript and build check**

Run: `npm run build`
Expected: No TypeScript errors, clean build.

**Step 2: Commit any fixes if needed**
