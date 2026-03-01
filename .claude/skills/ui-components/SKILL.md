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
| React Router DOM | 7 | Client routing (`/`, `/runs`, `/investigate/:id`, `/report/:id`) |

## Design System

### Colors (CSS custom properties via `@theme`)

Defined in `src/index.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#07070c` | Page background (near-black with blue undertone) |
| `bg-secondary` | `#0d0d14` | Section backgrounds |
| `bg-card` | `#13131f` | Cards, inputs, containers |
| `bg-card-hover` | `#191928` | Card hover state |
| `bg-elevated` | `#1a1a2a` | Modals, dropdowns |
| `border` | `#1e1e32` | Default borders |
| `border-bright` | `#2e2e4a` | Hover/active borders |
| `border-accent` | `rgba(0, 255, 136, 0.2)` | Accent-tinted borders |
| `accent` | `#00ff88` | CTA buttons, active indicators, highlights |
| `accent-dim` | `#00cc6a` | Accent hover state |
| `accent-glow` | `rgba(0, 255, 136, 0.15)` | Glow effects |
| `accent-bright` | `#33ffaa` | Bright accent for button hover |
| `danger` | `#ff3b4f` | Errors, low confidence (<40%) |
| `warning` | `#ffb224` | Medium confidence (40-79%) |
| `info` | `#3b82f6` | Planning status |
| `success` | `#00ff88` | Alias for accent |
| `text-primary` | `#e4e4ef` | Main body text |
| `text-secondary` | `#7e7e9a` | Labels, secondary info |
| `text-muted` | `#4a4a66` | Placeholders, hints |
| `text-accent` | `#00ff88` | Accent-colored text |

### Typography

Two font families:

| Role | Font | Usage |
|------|------|-------|
| Display | `Outfit` (300-900) | Headings, hero text, stat numbers, CTA buttons |
| Data | `JetBrains Mono` (300-700) | Labels, metadata, code, timestamps, body text |

```css
--font-display: "Outfit", system-ui, sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;
```

Use `.font-display` for Outfit, `font-mono` (default body) for JetBrains Mono.

## Component Inventory

| Component | File | Purpose |
|-----------|------|---------|
| `InputForm` | `src/components/InputForm.tsx` | Investigation submission form with extreme mode toggle |
| `BrowserView` | `src/components/BrowserView.tsx` | Live browser iframe with floating LIVE pill + URL label |
| `ActivityStream` | `src/components/ActivityStream.tsx` | Step sub-components (CollapsedStep, ExpandedStep, ToolBadge) |
| `FindingsGrid` | `src/components/FindingsGrid.tsx` | Evidence cards with confidence bars and category badges |
| `DetectiveReport` | `src/components/DetectiveReport.tsx` | Dossier-style report with stats, evidence, image gallery, typewriter effect |
| `LeadTree` | `src/components/LeadTree.tsx` | Connection network (superseded by RelationshipGraph) |
| `ImageGallery` | `src/components/ImageGallery.tsx` | Found images grid (superseded by inline gallery in DetectiveReport) |
| `HudHeader` | `src/components/HudHeader.tsx` | Investigation HUD header with status, steps, cost, tokens |
| `CommandStrip` | `src/components/CommandStrip.tsx` | Collapsible bottom activity stream strip |
| `FindingToasts` | `src/components/FindingToasts.tsx` | Real-time finding notification toasts + slide-out tray |
| `CompletionFlash` | `src/components/CompletionFlash.tsx` | Full-screen investigation completion overlay |
| `BehavioralProfile` | `src/components/BehavioralProfile.tsx` | Behavioral analysis cards (timezone, username patterns, predicted handles) |
| `GeoIntelMap` | `src/components/GeoIntelMap.tsx` | Leaflet map with confidence-colored markers for geo-located findings |
| `RelationshipGraph` | `src/components/RelationshipGraph.tsx` | Force-directed 2D graph (react-force-graph-2d) for relationship visualization |
| `ViewSwitcher` | `src/components/ViewSwitcher.tsx` | Vertical toolbar to switch Browser/Graph/Map views with pulse indicators |

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useGraphData` | `src/hooks/useGraphData.ts` | Transforms findings + graph edges into nodes/links for RelationshipGraph |

## Pages

| Page | Route | Layout |
|------|-------|--------|
| `Home` | `/` | Header (with All Runs link) -> Hero -> InputForm -> Disclaimer |
| `Runs` | `/runs` | Card grid of all investigations with status, confidence, time, cost |
| `Investigation` | `/investigate/:id` | Layered HUD: ambient bg -> ViewSwitcher (Browser/Graph/Map) -> HudHeader (floating) -> FindingToasts (floating) -> CommandStrip (bottom) -> CompletionFlash (overlay) |
| `Report` | `/report/:id` | DetectiveReport with stats, evidence, behavioral profile, image gallery |

## Common Patterns

### Section header (most repeated pattern)

```tsx
<div className="flex items-center gap-3 mb-5">
  <div className="h-px w-3 bg-accent/30" />
  <h3 className="text-[10px] font-bold text-text-secondary tracking-[0.2em] uppercase font-mono">
    {label}
  </h3>
  <span className="text-[10px] text-text-muted font-mono tabular-nums">{count}</span>
</div>
```

### Input styling

```tsx
<input
  className="w-full px-4 py-3 bg-bg-card/80 border rounded-lg text-text-primary text-sm
             placeholder:text-text-muted/60 focus:outline-none transition-all duration-300
             border-border hover:border-border-bright
             focus:border-accent/40 focus:shadow-[0_0_20px_rgba(0,255,136,0.06)]"
/>
```

### Card styling

```tsx
<div className="relative bg-bg-card/60 border border-border/60 rounded-lg p-3
                hover:border-border-bright hover:bg-bg-card-hover transition-all duration-200 group">
```

### Label styling

```tsx
<span className="text-[10px] text-text-secondary tracking-[0.2em] uppercase font-mono">
```

### HUD corner brackets

```tsx
<div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-accent/15 rounded-tl-xl pointer-events-none" />
<div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-accent/15 rounded-br-xl pointer-events-none" />
```

Also available as `.hud-corners` CSS class in `index.css`.

### Glass surface

```css
.glass { backdrop-filter: blur(12px); background: rgba(7,7,12,0.7); }
.glass-accent { backdrop-filter: blur(12px); background: rgba(0,255,136,0.08); }
```

### Loading spinner

```tsx
<div className="relative w-12 h-12">
  <div className="absolute inset-0 border-2 border-accent/20 rounded-full" />
  <div className="absolute inset-0 border-2 border-transparent border-t-accent rounded-full animate-spin" />
</div>
<span className="text-[10px] text-text-muted tracking-[0.3em] uppercase font-mono">Loading...</span>
```

### Animated list items (Framer Motion)

```tsx
<AnimatePresence mode="popLayout">
  {items.map((item) => (
    <motion.div
      key={item._id}
      initial={{ opacity: 0, x: -12 }}
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
// Used across FindingsGrid, DetectiveReport, Runs
// Takes prefix param ("text-" or "bg-") for flexibility
if (confidence >= 80) return `${prefix}accent`;     // green
if (confidence >= 60) return `${prefix}yellow-400`;  // or text-warning in DetectiveReport
if (confidence >= 40) return `${prefix}orange-400`;
return `${prefix}danger`;                            // red, < 40%
```

### Category badge colors

```typescript
const CATEGORY_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  social:     { bg: "bg-blue-500/8",    text: "text-blue-400",    border: "border-blue-500/20",    dot: "bg-blue-400" },
  connection: { bg: "bg-purple-500/8",  text: "text-purple-400",  border: "border-purple-500/20",  dot: "bg-purple-400" },
  location:   { bg: "bg-green-500/8",   text: "text-green-400",   border: "border-green-500/20",   dot: "bg-green-400" },
  activity:   { bg: "bg-yellow-500/8",  text: "text-yellow-400",  border: "border-yellow-500/20",  dot: "bg-yellow-400" },
  identity:   { bg: "bg-cyan-500/8",    text: "text-cyan-400",    border: "border-cyan-500/20",    dot: "bg-cyan-400" },
};
```

### Tool icons in ActivityStream

Single-letter abbreviations with tool-specific colors (includes `bg` and `border` fields):

| Tool | Letter | Color |
|------|--------|-------|
| reasoning | R | `text-purple-400` |
| maigret | M | `text-blue-400` |
| browser_action | B | `text-cyan-400` |
| web_search | W | `text-orange-400` |
| save_finding | S | `text-yellow-400` |
| geo_locate | G | `text-green-400` |
| whitepages | P | `text-red-400` |
| reverse_image | I | `text-pink-400` |
| darkweb | D | `text-red-500` |

### BrowserView States

| State | Condition | Display |
|-------|-----------|---------|
| Planning | `status === "planning"`, no URL | Globe icon + "Waiting for investigation to initialize..." |
| Connecting | `status === "investigating"`, no URL | Status dot + "Connecting to browser" |
| Active | `liveUrl` present | Floating "Live" pill (top-right) + URL label (bottom-left) + full-height iframe |

## CSS Animations (in `src/index.css`)

| Name | Effect |
|------|--------|
| `pulse` | Opacity 1->0.5->1 |
| `horizontalScan` | Left-to-right sweep with fade |
| `float` | Subtle vertical float |
| `cursorBlink` | Typing cursor blink (step function) |
| `gridFadeIn` | Fade opacity 0->0.04 |
| `dataStream` | Vertical translateY scroll |
| `radarSweep` | 360 degree rotation |
| `vignetteBreath` | Pulsing vignette box-shadow (4s) |
| `toastGlow` | Toast entrance flash with box-shadow (0.6s) |
| `drawCheck` | SVG stroke-dashoffset to 0 |
| `progressShimmer` | Background-position shimmer |
| `typewriterCursor` | Border-right color blink |
| `stampSlam` | Scale 3->0.9->1.05->1 with rotation (0.6s) |
| `dossierScan` | Top-to-bottom scan line (3s/8s) |
| `ringDraw` | SVG stroke-dashoffset ring draw |
| `redactFlicker` | Opacity flicker 0.06->0.12 |

## Atmospheric Effects

- **Film grain**: `body::before` with SVG noise at 2.5% opacity
- **Grid background**: `.grid-bg` class or inline styles with green-tinted grid lines (40-60px)
- **Radial glow**: Accent-colored radial gradient on hero sections

## Convex Integration

Frontend uses Convex React hooks:

```tsx
// Queries (real-time subscriptions)
const investigation = useQuery(api.investigations.get, { id });
const steps = useQuery(api.investigations.getSteps, { investigationId });
const findings = useQuery(api.investigations.getFindings, { investigationId });
const edges = useQuery(api.graphEdges.getEdges, { investigationId });
const allInvestigations = useQuery(api.investigations.list);
const report = useQuery(api.reports.getReport, { investigationId });

// Mutations
const createInvestigation = useMutation(api.investigations.create);

// Actions
const startInvestigation = useAction(api.orchestrator.startInvestigation);
```

`useQuery` returns reactive data — components re-render automatically when Convex data changes.

## Gotchas

- **Tailwind v4**: Uses `@theme` directive in CSS instead of `tailwind.config.js`. Plugin is `@tailwindcss/vite`, not PostCSS.
- **No App.css**: Removed default Vite styles. All styling via Tailwind utilities in `index.css`.
- **Convex provider**: Must wrap app in `<ConvexProvider client={convex}>` in `App.tsx`
- **Route params**: `useParams<{ id: string }>()` returns string, cast to `Id<"investigations">` for Convex
