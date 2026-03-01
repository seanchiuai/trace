# All Runs Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/runs` page that lists all investigation runs as a card grid, with an "ALL RUNS" nav link in the header across all pages.

**Architecture:** New `Runs.tsx` page component using the existing `investigations.list()` Convex query. No backend changes. Header navigation added to Home page inline (it already has a header) and to the HudHeader component (used by Investigation page). Report page gets a minimal header added.

**Tech Stack:** React 19, Convex (useQuery), Framer Motion, Tailwind CSS 4, React Router DOM 7

---

### Task 1: Create the Runs page component

**Files:**
- Create: `src/pages/Runs.tsx`

**Step 1: Create the Runs page**

```tsx
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { motion } from "framer-motion";

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  planning: { label: "PLANNING", color: "text-info", dotColor: "bg-info" },
  investigating: { label: "INVESTIGATING", color: "text-accent", dotColor: "bg-accent" },
  analyzing: { label: "ANALYZING", color: "text-warning", dotColor: "bg-warning" },
  complete: { label: "COMPLETE", color: "text-accent", dotColor: "bg-accent" },
  failed: { label: "FAILED", color: "text-danger", dotColor: "bg-danger" },
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getRunLink(status: string, id: string): string {
  return status === "complete" ? `/report/${id}` : `/investigate/${id}`;
}

export default function Runs() {
  const investigations = useQuery(api.investigations.list);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Atmospheric background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          animation: "gridFadeIn 2s ease-out forwards",
        }}
      />
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,255,136,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 border-b border-border px-8 py-5"
      >
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <div className="relative w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <span className="font-display font-bold text-accent text-sm">T</span>
              <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-accent/50" />
              <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-accent/50" />
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="font-display text-lg font-bold tracking-tight text-text-primary">
                TRACE
              </h1>
              <div className="h-3 w-px bg-border" />
              <span className="text-[10px] text-text-muted tracking-[0.25em] uppercase font-mono">
                Intelligence System
              </span>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-[10px] text-accent/60 tracking-[0.2em] uppercase font-mono">
              All Runs
            </span>
            <div className="flex items-center gap-2">
              <span className="status-dot" />
              <span className="text-[10px] text-text-muted tracking-wider uppercase font-mono">
                Online
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="relative z-10 flex-1 px-8 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Page heading */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="h-px flex-1 max-w-12 bg-accent/30" />
            <span className="text-[10px] text-accent/60 tracking-[0.3em] uppercase font-mono">
              Investigation Log
            </span>
            <div className="h-px flex-1 max-w-12 bg-accent/30" />
          </motion.div>

          {/* Loading state */}
          {investigations === undefined && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-2 border-accent/20 rounded-full" />
                  <div className="absolute inset-0 border-2 border-transparent border-t-accent rounded-full animate-spin" />
                </div>
                <span className="text-[10px] text-text-muted tracking-[0.3em] uppercase font-mono">
                  Loading investigations
                </span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {investigations && investigations.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <p className="text-text-secondary text-sm mb-4">
                No investigations yet.
              </p>
              <Link
                to="/"
                className="text-accent text-xs font-mono tracking-wider hover:text-accent-bright transition-colors"
              >
                Start your first investigation &rarr;
              </Link>
            </motion.div>
          )}

          {/* Card grid */}
          {investigations && investigations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {investigations.map((inv, i) => {
                const status = STATUS_CONFIG[inv.status] || STATUS_CONFIG.planning;
                return (
                  <motion.div
                    key={inv._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <Link
                      to={getRunLink(inv.status, inv._id)}
                      className="block p-5 rounded-xl bg-bg-card border border-border hover:bg-bg-card-hover hover:border-accent/20 transition-all duration-200 group"
                    >
                      {/* Top row: name + status */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <h3 className="font-display font-semibold text-text-primary text-sm truncate flex-1 group-hover:text-accent transition-colors">
                          {inv.targetName}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                          <span className={`text-[9px] font-bold tracking-[0.15em] ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {/* Metadata row */}
                      <div className="flex items-center gap-3 text-[10px] text-text-muted font-mono">
                        <span>{timeAgo(inv.createdAt)}</span>
                        <div className="h-2.5 w-px bg-white/10" />
                        <span>{inv.stepCount}/20 steps</span>
                        {inv.estimatedCost != null && (
                          <>
                            <div className="h-2.5 w-px bg-white/10" />
                            <span>${inv.estimatedCost.toFixed(2)}</span>
                          </>
                        )}
                      </div>

                      {/* Confidence bar (complete only) */}
                      {inv.status === "complete" && inv.confidence != null && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                inv.confidence >= 80
                                  ? "bg-accent"
                                  : inv.confidence >= 60
                                    ? "bg-warning"
                                    : inv.confidence >= 40
                                      ? "bg-orange-400"
                                      : "bg-danger"
                              }`}
                              style={{ width: `${inv.confidence}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-text-muted font-mono tabular-nums">
                            {inv.confidence}%
                          </span>
                        </div>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

**Step 2: Verify the file was created**

Run: `head -5 src/pages/Runs.tsx`
Expected: First 5 lines of the component

**Step 3: Commit**

```bash
git add src/pages/Runs.tsx
git commit -m "feat: add Runs page component with card grid layout"
```

---

### Task 2: Add the /runs route to App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add the import and route**

Add `import Runs from "./pages/Runs";` after the Report import (line 5), and add `<Route path="/runs" element={<Runs />} />` after the report route (line 16).

After the edit, `App.tsx` should look like:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import Home from "./pages/Home";
import Investigation from "./pages/Investigation";
import Report from "./pages/Report";
import Runs from "./pages/Runs";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/investigate/:id" element={<Investigation />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/runs" element={<Runs />} />
        </Routes>
      </BrowserRouter>
    </ConvexProvider>
  );
}
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /runs route"
```

---

### Task 3: Add "ALL RUNS" nav link to the Home page header

**Files:**
- Modify: `src/pages/Home.tsx`

**Step 1: Add Link import**

Change line 2 from:
```tsx
import { useNavigate } from "react-router-dom";
```
to:
```tsx
import { useNavigate, Link } from "react-router-dom";
```

**Step 2: Add ALL RUNS link to the header**

Find the `ml-auto` div in the header (around line 116):

```tsx
          <div className="ml-auto flex items-center gap-2">
            <span className="status-dot" />
```

Replace with:

```tsx
          <div className="ml-auto flex items-center gap-4">
            <Link
              to="/runs"
              className="text-[10px] text-text-muted tracking-[0.2em] uppercase font-mono hover:text-accent transition-colors"
            >
              All Runs
            </Link>
            <div className="flex items-center gap-2">
              <span className="status-dot" />
```

And add a closing `</div>` after the "Online" span's closing `</div>` (after line 121). The header's `ml-auto` section should now be:

```tsx
          <div className="ml-auto flex items-center gap-4">
            <Link
              to="/runs"
              className="text-[10px] text-text-muted tracking-[0.2em] uppercase font-mono hover:text-accent transition-colors"
            >
              All Runs
            </Link>
            <div className="flex items-center gap-2">
              <span className="status-dot" />
              <span className="text-[10px] text-text-muted tracking-wider uppercase font-mono">
                Online
              </span>
            </div>
          </div>
```

**Step 3: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: add ALL RUNS nav link to Home header"
```

---

### Task 4: Add "ALL RUNS" nav link to the HudHeader (Investigation page)

**Files:**
- Modify: `src/components/HudHeader.tsx`

**Step 1: Add Link import**

Add at the top of the file:

```tsx
import { Link } from "react-router-dom";
```

**Step 2: Add ALL RUNS link**

Find the right pills container (around line 56):

```tsx
        {/* Right pills */}
        <div className="flex items-center gap-2">
```

Add the ALL RUNS link as the first child inside that div:

```tsx
        {/* Right pills */}
        <div className="flex items-center gap-2">
          <Link
            to="/runs"
            className="flex items-center h-9 px-3.5 rounded-full glass text-[10px] text-text-muted tracking-[0.15em] uppercase font-mono hover:text-accent hover:bg-white/[0.07] transition-colors"
          >
            All Runs
          </Link>
```

**Step 3: Commit**

```bash
git add src/components/HudHeader.tsx
git commit -m "feat: add ALL RUNS nav link to HudHeader"
```

---

### Task 5: Add "ALL RUNS" nav link to the Report page

**Files:**
- Modify: `src/components/DetectiveReport.tsx`

This needs investigation since the Report page delegates rendering entirely to `DetectiveReport`. Read the component to find where to add the nav link. The link should appear in whatever header/top area DetectiveReport provides. If DetectiveReport has a back-to-home link, add "ALL RUNS" near it.

Alternatively, the Report page itself (`src/pages/Report.tsx`) could be modified to wrap DetectiveReport with a header. Use the simpler approach — check DetectiveReport for its header structure first, then add the link where appropriate.

**Step 1: Read DetectiveReport.tsx to find the header area**

Read the file and identify where to place the link.

**Step 2: Add the link in the appropriate location**

Add a Link import and an "ALL RUNS" navigation element.

**Step 3: Commit**

```bash
git add src/components/DetectiveReport.tsx  # or src/pages/Report.tsx
git commit -m "feat: add ALL RUNS nav link to Report page"
```

---

### Task 6: Manual verification

**Step 1: Verify dev server runs**

Run: `npm run dev` (check for compile errors)

**Step 2: Verify in browser**

Open `http://localhost:5173/runs` — should see the card grid or empty state.

Navigate to Home, confirm "ALL RUNS" link in header works.

Check Investigation page header for the link.

Check Report page for the link.

**Step 3: Fix any issues found**

Address compile errors or visual issues.

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address review feedback for Runs page"
```
