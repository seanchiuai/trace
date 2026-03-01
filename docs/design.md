# TRACE — Design Specification

## Theme

Dark detective aesthetic. Minimal, monospace, high-contrast green accents on near-black backgrounds.

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#0a0a0f` | Page background |
| `bg-secondary` | `#12121a` | Section backgrounds |
| `bg-card` | `#1a1a2e` | Cards, inputs |
| `bg-card-hover` | `#1f1f35` | Card hover state |
| `border` | `#2a2a3e` | Default borders |
| `border-bright` | `#3a3a5e` | Active/hover borders |
| `accent` | `#00ff88` | Primary accent, CTAs, active indicators |
| `accent-dim` | `#00cc6a` | Hover state for accent |
| `accent-glow` | `rgba(0,255,136,0.3)` | Glow effects |
| `danger` | `#ff4444` | Errors, low confidence |
| `warning` | `#ffaa00` | Medium confidence, warnings |
| `info` | `#4488ff` | Informational |
| `text-primary` | `#e8e8f0` | Main text |
| `text-secondary` | `#8888aa` | Secondary text |
| `text-muted` | `#555577` | Muted/placeholder text |

## Typography

- **Font**: `JetBrains Mono`, `Fira Code`, `SF Mono`, monospace
- **Labels**: `text-xs`, uppercase, `tracking-wider`, `text-secondary`
- **Body**: `text-sm`, `text-primary`
- **Headings**: `font-bold`, `text-primary`
- **Code/data**: `font-mono`, `text-sm`

## Components

### InputForm
- Full-width inputs with `bg-card`, `border`, rounded-lg
- Focus state: `border-accent`
- Submit button: `bg-accent`, `text-bg-primary`, uppercase, tracking-wider
- Photo upload: dashed border placeholder, hover turns `border-accent/50`
- Links textarea: monospace, one-per-line hint

### BrowserView
- Top URL bar with green pulse dot + "LIVE" badge
- iframe fills remaining height
- Empty state: globe icon + "Waiting for browser session" message
- Connecting state: green pulse dot + "Connecting to browser..."

### ActivityStream
- Vertical timeline with tool-colored icons (R=purple, M=blue, B=cyan, F=green, S=yellow)
- Connecting line between steps (`w-px bg-border`)
- Each step: tool label + step number + timestamp + action text
- Collapsible result detail (`<details>`)
- Framer Motion: slides in from left (`x: -20 → 0`)

### FindingsGrid
- Cards with category badge (color-coded), confidence percentage, data text
- Category colors: social=blue, connection=purple, location=green, activity=yellow, identity=cyan
- Confidence: >=80 green, >=60 yellow, >=40 orange, <40 red
- Profile URL as clickable accent-colored link
- Framer Motion: slides up (`y: 10 → 0`)

### FaceScan (overlay)
- Full-screen backdrop (`bg-black/80 backdrop-blur`)
- Center modal with scan visualization area
- Phase 1 "scanning": green scan line sweeps top→bottom (CSS `scanLine` keyframes)
- Phase 2 "matching": face bounding boxes snap in with corner brackets (CSS `bracketSnap`)
- Phase 3 "results": match cards slide in from right with platform icon + confidence counter
- High confidence (>90%): pulsing green glow (`confidenceGlow` keyframes)
- Progress bar animates 0% → 40% → 80% → 100% across phases
- Auto-dismisses after 8 seconds, click-anywhere to dismiss

### DetectiveReport
- Header card with accent border: title + overall confidence percentage
- 4-column stat grid: social profiles, connections, locations, activity
- Full report in `pre` block (to be upgraded to rendered markdown)
- Evidence list with confidence badge + data + source + platform

### StatusBar (in Investigation header)
- Current phase label with color coding
- Investigating state: green pulse dot
- Step counter: "Step N / 20"

## Animations

| Name | Keyframes | Duration | Usage |
|------|-----------|----------|-------|
| `scanLine` | `top: 0 → 100%, opacity: 1 → 0.3` | 1.5s infinite | FaceScan scan line |
| `bracketSnap` | `scale(1.5) → scale(0.95) → scale(1), opacity 0 → 1` | 0.3s | Face detection brackets |
| `matchReveal` | `translateX(100px) → 0, opacity 0 → 1` | 0.3s | Match card entrance |
| `confidenceGlow` | `box-shadow 5px → 20px → 5px (green)` | 2s infinite | High confidence pulse |
| `pulse` | `opacity 1 → 0.5 → 1` | built-in | Status indicators |

## Pages

### Home (`/`)
- Header: TRACE logo (green "T" box) + title + subtitle
- Hero: "Find anyone." heading + description paragraph
- Centered InputForm (max-w-lg)
- Legal disclaimer footer (text-xs, text-muted)

### Investigation (`/investigate/:id`)
- Header: logo + "Investigating: {name}" + status badge + step counter
- 2-column layout (lg breakpoint):
  - Left: BrowserView (full height, border-right)
  - Right top: ActivityStream (scrollable, flex-1)
  - Right bottom: FindingsGrid (h-64 lg:h-80, scrollable)
- FaceScan overlay (z-50, triggered by face_check results)
- Report section at bottom when status="complete"

## Responsive Behavior

- Mobile: single column stack (browser view → activity → findings)
- Desktop (lg+): 2-column split
- Demo target: desktop only
