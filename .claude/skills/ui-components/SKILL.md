---
name: ui-components
description: React component architecture, dark theme design system, and animation patterns
---

# UI Components

## Overview

React 19 + TypeScript frontend with Tailwind CSS 4, Framer Motion animations, and a dark detective-themed design system. All components in `src/components/`, pages in `src/pages/`.

## Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 5.9 | Type safety |
| Tailwind CSS | 4 | Utility-first styling (via `@tailwindcss/vite` plugin) |
| Framer Motion | 12 | Component animations (enter/exit, spring, layout) |
| React Router DOM | 7 | Client routing (`/`, `/investigate/:id`) |

## Design System

### Colors (CSS custom properties via `@theme`)

Defined in `src/index.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#0a0a0f` | Page background |
| `bg-secondary` | `#12121a` | Section backgrounds |
| `bg-card` | `#1a1a2e` | Cards, inputs, containers |
| `bg-card-hover` | `#1f1f35` | Card hover state |
| `border` | `#2a2a3e` | Default borders |
| `border-bright` | `#3a3a5e` | Hover/active borders |
| `accent` | `#00ff88` | CTA buttons, active indicators, highlights |
| `accent-dim` | `#00cc6a` | Accent hover state |
| `accent-glow` | `rgba(0, 255, 136, 0.3)` | Glow effects |
| `danger` | `#ff4444` | Errors, low confidence (<40%) |
| `warning` | `#ffaa00` | Medium confidence (40-79%) |
| `info` | `#4488ff` | Planning status |
| `text-primary` | `#e8e8f0` | Main body text |
| `text-secondary` | `#8888aa` | Labels, secondary info |
| `text-muted` | `#555577` | Placeholders, hints |

### Typography

```css
font-family: "JetBrains Mono", "Fira Code", "SF Mono", monospace;
```

All text is monospace. Labels use `text-xs uppercase tracking-wider text-text-secondary`.

## Component Inventory

| Component | File | Purpose |
|-----------|------|---------|
| `InputForm` | `src/components/InputForm.tsx` | Investigation submission form |
| `BrowserView` | `src/components/BrowserView.tsx` | Live browser iframe with URL bar |
| `ActivityStream` | `src/components/ActivityStream.tsx` | Real-time step timeline |
| `FindingsGrid` | `src/components/FindingsGrid.tsx` | Evidence cards with confidence |
| `FaceScan` | `src/components/FaceScan.tsx` | Face recognition animation overlay |
| `DetectiveReport` | `src/components/DetectiveReport.tsx` | Final report with stats + evidence |
| `LeadTree` | `src/components/LeadTree.tsx` | Connection network visualization |
| `ImageGallery` | `src/components/ImageGallery.tsx` | Found images grid |

## Pages

| Page | Route | Layout |
|------|-------|--------|
| `Home` | `/` | Header → Hero → InputForm → Disclaimer |
| `Investigation` | `/investigate/:id` | Header → 2-col (BrowserView \| ActivityStream + FindingsGrid) → Report |

## Common Patterns

### Input styling

```tsx
<input
  className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg
             text-text-primary placeholder:text-text-muted
             focus:outline-none focus:border-accent transition-colors"
/>
```

### Card styling

```tsx
<div className="bg-bg-card border border-border rounded-lg p-3
                hover:border-border-bright transition-colors">
```

### Label styling

```tsx
<label className="block text-xs text-text-secondary mb-1.5 uppercase tracking-wider">
```

### Animated list items (Framer Motion)

```tsx
<AnimatePresence>
  {items.map((item) => (
    <motion.div
      key={item._id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* content */}
    </motion.div>
  ))}
</AnimatePresence>
```

### Confidence color coding

```typescript
// Used across FindingsGrid, DetectiveReport
let color = "text-danger";        // < 40%
if (confidence >= 80) color = "text-accent";    // green
else if (confidence >= 60) color = "text-yellow-400";
else if (confidence >= 40) color = "text-orange-400";
```

### Category badge colors

```typescript
const CATEGORY_COLORS = {
  social: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  connection: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  location: "bg-green-500/20 text-green-400 border-green-500/30",
  activity: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  identity: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};
```

### Tool icons in ActivityStream

Single-letter abbreviations with tool-specific colors:

| Tool | Letter | Color |
|------|--------|-------|
| reasoning | R | `text-purple-400` |
| maigret | M | `text-blue-400` |
| browser_action | B | `text-cyan-400` |
| face_check | F | `text-green-400` |
| save_finding | S | `text-yellow-400` |

### BrowserView States

| State | Condition | Display |
|-------|-----------|---------|
| Planning | `status === "planning"`, no URL | Globe icon + "Waiting for investigation to start..." |
| Connecting | `status === "investigating"`, no URL | Green pulse + "Connecting to browser..." |
| Active | `liveUrl` present | URL bar (green dot + "LIVE" badge) + full-height iframe |

## CSS Animations

Defined in `src/index.css`, used primarily by FaceScan:

| Name | Effect | Duration |
|------|--------|----------|
| `scanLine` | Top-to-bottom sweep with fade | 1.5s infinite |
| `bracketSnap` | Scale 1.5→0.95→1 with opacity | One-shot |
| `matchReveal` | Slide in from right 100px | One-shot |
| `confidenceGlow` | Pulsing green box-shadow | 2s infinite |
| `pulse` | Opacity 1→0.5→1 | Custom keyframe in index.css |

## Convex Integration

Frontend uses Convex React hooks:

```tsx
// Queries (real-time subscriptions)
const investigation = useQuery(api.investigations.get, { id });
const steps = useQuery(api.investigations.getSteps, { investigationId });
const findings = useQuery(api.investigations.getFindings, { investigationId });

// Mutations
const createInvestigation = useMutation(api.investigations.create);

// Actions
const startInvestigation = useAction(api.orchestrator.startInvestigation);
```

`useQuery` returns reactive data — components re-render automatically when Convex data changes. This powers the real-time activity stream and findings updates.

## Gotchas

- **Tailwind v4**: Uses `@theme` directive in CSS instead of `tailwind.config.js`. Plugin is `@tailwindcss/vite`, not PostCSS.
- **No App.css**: Removed default Vite styles. All styling via Tailwind utilities in `index.css`.
- **Convex provider**: Must wrap app in `<ConvexProvider client={convex}>` in `App.tsx`
- **Route params**: `useParams<{ id: string }>()` returns string, cast to `Id<"investigations">` for Convex
