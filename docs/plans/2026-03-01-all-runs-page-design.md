# All Runs Page Design

## Overview

Add a new page at `/runs` that displays all investigation runs as a card grid. View-only with click-to-navigate. Accessible via a persistent "ALL RUNS" link in the header bar across all pages.

## Route

- `/runs` -> `src/pages/Runs.tsx`

## Navigation

- Add "ALL RUNS" link to the header bar, positioned left of the ONLINE indicator
- Present on all pages (Home, Investigation, Report, Runs)
- On Runs page, TRACE logo links back to Home

## Page Layout

- Same atmospheric background as other pages (grid overlay + radial glow)
- HUD-style heading (e.g., "INVESTIGATION LOG")
- Responsive card grid: 1 col mobile, 2 col medium, 3 col large
- Uses existing `investigations.list()` Convex query (returns 20 most recent)

## Card Design

Each card displays:
- **Target name** (primary text)
- **Status badge** (color-coded: planning=info, investigating=accent, analyzing=warning, complete=accent, failed=danger)
- **Timestamp** (relative, e.g., "2 hours ago")
- **Step count** (e.g., "14/20 steps")
- **Confidence** (small ring or bar, only shown if status is complete)
- **Estimated cost** (e.g., "$0.42")

## Click Behavior

- planning/investigating/analyzing -> `/investigate/:id`
- complete -> `/report/:id`
- failed -> `/investigate/:id`

## Animations

- Staggered card entrance via Framer Motion
- Hover glow effect (bg-card-hover)

## Empty State

- Message with link to start a new investigation if no runs exist

## Data Source

- Existing `investigations.list()` query — no backend changes needed
