# TRACE — Design Specification

## Aesthetic Direction

**Noir Intelligence Bureau** — Cold, precise, atmospheric. A surveillance command center rendered as a web interface. HUD-style brackets, film grain texture, dramatic typography, orchestrated motion. Every element feels like it belongs in a classified intelligence dashboard.

## Font System

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| Display | `Outfit` | 300–900 | Headings, hero text, stat numbers, CTA buttons |
| Data | `JetBrains Mono` | 300–700 | Labels, metadata, code, timestamps, body text |

**Class**: `.font-display` for Outfit, `font-mono` (default body) for JetBrains Mono.

**Pairing rules**: Outfit for anything that needs visual impact (headings, large numbers, names). JetBrains Mono for everything data-oriented (labels, timestamps, URLs, tool names). Never use generic system fonts.

## Color Palette

### Surfaces

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#07070c` | Page background (near-black with blue undertone) |
| `bg-secondary` | `#0d0d14` | Section backgrounds, header fills |
| `bg-card` | `#13131f` | Cards, inputs, elevated containers |
| `bg-card-hover` | `#191928` | Card hover state |
| `bg-elevated` | `#1a1a2a` | Modals, dropdowns |

### Borders

| Token | Hex | Usage |
|-------|-----|-------|
| `border` | `#1e1e32` | Default borders (subtle, not harsh) |
| `border-bright` | `#2e2e4a` | Hover/active borders |
| `border-accent` | `rgba(0,255,136,0.2)` | Accent-tinted borders |

### Accent

| Token | Value | Usage |
|-------|-------|-------|
| `accent` | `#00ff88` | Primary accent — CTAs, active states, data highlights |
| `accent-dim` | `#00cc6a` | Hover state for accent elements |
| `accent-glow` | `rgba(0,255,136,0.15)` | Glow/shadow effects |
| `accent-bright` | `#33ffaa` | Bright accent for button hover |

### Semantic

| Token | Hex | Usage |
|-------|-----|-------|
| `danger` | `#ff3b4f` | Errors, low confidence, failed states |
| `warning` | `#ffb224` | Medium confidence, warnings |
| `info` | `#3b82f6` | Informational, planning state |
| `success` | `#00ff88` | Alias for accent |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#e4e4ef` | Main readable text |
| `text-secondary` | `#7e7e9a` | Labels, secondary info |
| `text-muted` | `#4a4a66` | Placeholders, timestamps, metadata |
| `text-accent` | `#00ff88` | Accent-colored text |

## Atmospheric Effects

### Film Grain
A `body::before` pseudo-element applies a subtle SVG noise texture at 2.5% opacity across the entire viewport. Fixed position, `pointer-events: none`, z-index 9999. Creates analog film atmosphere.

### Grid Background
Utility class `.grid-bg` or inline `backgroundImage` with green-tinted grid lines at 40–60px spacing. Used on Home page background and BrowserView empty state. Fades in with `gridFadeIn` animation.

### Radial Glow
Elliptical gradient at page top center, accent-tinted at 4% opacity. Creates a subtle light source effect without being distracting.

### Selection
Custom `::selection` with accent background at 20% opacity.

### Scrollbar
5px thin scrollbar with transparent track and border-colored thumb. Brightens on hover.

## HUD Design Elements

### Corner Brackets
Signature visual motif. 2px accent-colored borders on two opposing corners of a container. Applied via:
- CSS utility `.hud-corners` (top-left + bottom-right)
- Inline absolute-positioned divs for all four corners
- Rounded variants that follow the container's border-radius
- Opacity 0.2–0.5, brightens on hover

### Section Headers
Consistent pattern across all components:
```
[accent line (w-3 h-px)] [LABEL in 10px mono, 0.2em tracking, uppercase] [count]
```

### Status Dot
`.status-dot` — 6px pulsing green circle with glow shadow. Used for live/online indicators.

### Glow Line
`.glow-line` — 1px horizontal rule with gradient fade from transparent edges to accent center. Used as section dividers.

## Typography Scale

| Purpose | Size | Font | Weight | Tracking | Transform |
|---------|------|------|--------|----------|-----------|
| Hero heading | `text-6xl`/`7xl` | Outfit | 800 | tight | — |
| Page heading | `text-3xl` | Outfit | bold | tight | — |
| Component heading | `text-lg` | Outfit | bold | tight | — |
| Section label | `10px` | JetBrains Mono | bold | 0.2em | uppercase |
| Body text | `13px` | JetBrains Mono | 400 | — | — |
| Input label | `10px` | JetBrains Mono | 400 | 0.2em | uppercase |
| Metadata | `10px` | JetBrains Mono | 400 | wider | — |
| Micro label | `9px`/`8px` | JetBrains Mono | bold | wider | uppercase |

## Animation System

### Keyframes

| Name | Description | Duration | Usage |
|------|-------------|----------|-------|
| `scanLine` | Vertical sweep `top: 0→100%`, fading | 1.5s infinite | FaceScan scan line |
| `bracketSnap` | Scale `1.5→0.95→1` with fade-in | 0.3s | Face detection brackets |
| `matchReveal` | Slide from `x:100px` with fade-in | 0.3s | Match card entrance |
| `confidenceGlow` | Box-shadow pulse `5px→25px→5px` | 2s infinite | High confidence elements |
| `pulse` | Opacity `1→0.4→1` | 2s infinite | Status indicators |
| `horizontalScan` | Left-to-right sweep across element | 2s infinite | Button hover effect |
| `float` | Gentle `translateY(0→-6px→0)` | — | Decorative floating elements |
| `cursorBlink` | Step-function opacity blink | 0.8s infinite | TypeWriter cursor |
| `gridFadeIn` | Opacity `0→0.04` | 2s | Background grid entrance |
| `dataStream` | Vertical translateY scroll | — | Data visualization |
| `radarSweep` | Full 360° rotation | — | Radar animation |

### Framer Motion Patterns

| Pattern | Properties | Usage |
|---------|------------|-------|
| Fade up | `y:20→0, opacity:0→1` | Section entrances |
| Slide left | `x:-16→0, opacity:0→1` | Timeline steps |
| Slide right | `x:60→0, opacity:0→1` | Match cards |
| Scale in | `scale:0.9→1, opacity:0→1` | Modal, loading elements |
| Spring | `type:"spring", damping:22` | Interactive elements |
| Stagger | Incremental `delay` per item | List/grid items |

**Orchestration**: Home page uses staggered delays (0.2s→1.8s) to create a cinematic reveal sequence. Investigation page uses shorter delays (0.1s→0.2s) for quick panel appearance.

## Components

### InputForm
- Container: rounded-xl, border, bg-secondary/40, backdrop-blur-sm
- Four HUD corner brackets (accent/30, follows border-radius)
- FormField component: accent line prefix + 10px mono label
- Inputs: bg-card/80, transition from border-border to accent/40 glow on focus
- Focus glow: `shadow-[0_0_20px_rgba(0,255,136,0.06)]`
- Submit: accent bg, display font, tracking-[0.15em], `horizontalScan` effect on hover
- Photo upload: dashed border, icon-centered, group-hover transitions

### BrowserView
- Empty state: concentric ring globe icon, grid background, status dot
- URL bar: traffic light dots + monospace URL in card-bg pill + "Live" badge
- Investigating: ping animation on globe ring

### ActivityStream
- Consistent section header with accent line
- ToolBadge: 8x8 rounded-lg with tool-specific bg/border/text colors
- Timeline: `w-px bg-border/60` connecting line between badges
- Step content: 10px tool label + step number + timestamp, 13px action text
- Collapsible result: bordered pre block with 10px monospace

### FindingsGrid
- ConfidenceBar: 12px-wide progress bar + percentage
- Category: dot indicator + styled badge (bg/text/border per category)
- Profile URL: link icon + monospace URL
- Hover: border brightens, bg shifts to card-hover

### FaceScan (Overlay)
- Full-screen: bg-black/85, backdrop-blur-md
- Modal: spring entrance, top glow line
- Header: eye icon with HUD corners, phase counter (1/3, 2/3, 3/3)
- Scan: enhanced glow shadow on scan line, grid overlay
- Brackets: match labels, corner brackets
- Results: spring slide-in, HIGH MATCH badge for >=90%, glow shadow
- Confidence: animated counter 0→target

### DetectiveReport
- Header: accent border, HUD corners, display font subject name, large confidence number
- Stats: 4-column grid, StatCard with corner accents and staggered entrance
- Report: pre block with 1.8 line-height for readability
- Evidence: list with confidence color coding, external link icons

### LeadTree
- Node-style cards with type dot and category color
- Connection count display
- Staggered scale entrance animation

### ImageGallery
- Grid with scale hover effect (1.05x)
- Corner accent brackets appear on hover
- Backdrop-blur source badges
- Gradient overlay for captions

## Pages

### Home (`/`)
- Background: grid overlay (60px), radial glow (top-center), diagonal accent line
- Header: HUD logo with corner brackets, "Intelligence System" label, status dot
- Hero: classification badge → 7xl Outfit "Find / anyone." → TypeWriter subtitle
- Form: centered InputForm with HUD wrapper
- Footer: glow-line separator → 10px legal disclaimer

### Investigation (`/investigate/:id`)
- Header: HUD logo, "Subject: {name}", status dot+ping, animated progress bar, step counter
- Layout: `grid-cols-[1fr_420px]` for desktop
- Left: BrowserView (full height)
- Right top: ActivityStream (flex-1, scrollable)
- Right bottom: FindingsGrid (h-72/h-80, scrollable)
- FaceScan: z-50 overlay with AnimatePresence
- Report: slides up from bottom when status="complete"

## Responsive

- Mobile: single column stack
- Desktop (lg+): asymmetric 2-column (wider browser view, narrower right panel at 420px)
- Demo target: desktop optimized
