---
name: face-recognition
description: FaceCheck.id API integration and FaceScan UI wow-moment component
---

# Face Recognition

## Overview

Two parts: the **FaceCheck.id API** backend integration (search faces across 200M+ images) and the **FaceScan** frontend component (the dramatic demo animation sequence).

## Backend: FaceCheck.id API

Located in `convex/tools/faceCheck.ts`.

### API Flow

1. **Upload**: POST image (URL or base64) to `/upload_pic` → get `id_search`
2. **Poll**: POST to `/search` with `id_search` every 2s until `output` exists
3. **Parse**: Extract matches with `score`, `url`, `thumbnailUrl`, platform detection

```typescript
// Step 1: Upload
const searchRes = await fetch(`${FACECHECK_API}/upload_pic`, {
  method: "POST",
  headers: { Authorization: apiKey, "Content-Type": "application/json" },
  body: JSON.stringify({ id_search: "", images: [imageUrl] }),
});
const { id_search } = await searchRes.json();

// Step 2: Poll (max 30 attempts, 2s interval)
const resultRes = await fetch(`${FACECHECK_API}/search`, {
  method: "POST",
  headers: { Authorization: apiKey, "Content-Type": "application/json" },
  body: JSON.stringify({ id_search: searchId, with_progress: true }),
});
```

### Platform Detection

The `extractPlatform()` helper maps URLs to platform names:

| URL Contains | Returns |
|-------------|---------|
| `instagram.com` | Instagram |
| `facebook.com` | Facebook |
| `twitter.com` / `x.com` | X/Twitter |
| `linkedin.com` | LinkedIn |
| `tiktok.com` | TikTok |
| `youtube.com` | YouTube |
| (other) | Web |

### Response Shape (normalized)

```typescript
{
  faces: [
    {
      score: 94.2,
      url: "https://instagram.com/janedoe456",
      thumbnailUrl: "https://...",
      platform: "Instagram",
    }
  ]
}
```

## Frontend: FaceScan Component

Located in `src/components/FaceScan.tsx`. This is the demo money shot — a 5-8 second dramatic sequence.

### Phase Sequence

| Phase | Duration | Visual |
|-------|----------|--------|
| `scanning` | 0-2s | Green scan line sweeps top→bottom, grid overlay |
| `matching` | 2-4s | Face bounding boxes snap in with corner brackets |
| `results` | 4s+ | Match cards slide in from right with confidence counters |

### Key Sub-components

**ConfidenceCounter** — Animates a number from 0 to target value over 1.5s using `setInterval` with 60 frames.

**Face Brackets** — Three mock face positions with corner bracket decorations, spring-animated entry via Framer Motion with staggered delays.

**Match Cards** — Slide in from right (`x: 100 → 0`) with spring animation. High confidence (>=90) gets green glow (`confidenceGlow` keyframe) and accent border.

### CSS Animations Used

| Animation | Defined In | Used For |
|-----------|-----------|----------|
| `scanLine` | `src/index.css` | Green line sweep |
| `confidenceGlow` | `src/index.css` | Pulsing glow on high-confidence matches |
| `bracketSnap` | `src/index.css` | Face bracket snap-in (available but using Framer Motion instead) |
| `matchReveal` | `src/index.css` | Card slide-in (available but using Framer Motion instead) |

### Triggering

In `src/pages/Investigation.tsx`, a `useEffect` watches for `face_check` steps with results. When detected:

1. Parse the JSON result
2. Set `activeFaceScan` state with results
3. Render `<FaceScan>` overlay
4. Auto-dismiss after 8 seconds

### Props

```typescript
interface FaceScanProps {
  imageUrl: string;       // Source image (for future use)
  results?: {
    score: number;        // Confidence 0-100
    url: string;          // Matched profile URL
    platform: string;     // Platform name
  }[];
  onDismiss: () => void;  // Close overlay
}
```

## Environment

- `FACECHECK_API_KEY` — Set in Convex dashboard. ~$0.30 per search.

## Files

| File | What |
|------|------|
| `convex/tools/faceCheck.ts` | `searchByImage` internalAction, `extractPlatform` helper |
| `src/components/FaceScan.tsx` | Full overlay component with all animation phases |
| `src/pages/Investigation.tsx` | Trigger logic (watches steps for face_check results) |
| `src/index.css` | CSS keyframe definitions |
