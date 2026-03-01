# Implementation Plan: Multi-Profile Report Output (Option A)

**Branch:** `feat/profile-splitting`
**Estimated time:** 1-2 hours
**Risk:** Low — report-time clustering only, no schema or orchestrator changes

## Problem

When investigating common names (e.g. "John Smith"), the agent discovers profiles belonging to different people. Currently all findings are dumped into one flat report, mixing identities. The user can't tell which findings belong together.

## Approach

Cluster findings into candidate profiles **at report generation time** using Opus. The report prompt asks Opus to output structured JSON with profiles, then the frontend renders each profile as a separate tab/section.

No changes to: schema, orchestrator, tool execution, or `save_finding`. The investigation runs exactly as today. Only the report generation prompt and report rendering change.

## Changes

### 1. `convex/orchestrator.ts` — Change report prompt (~line 1318)

Replace the current markdown report prompt with a structured JSON output prompt:

```
You are analyzing OSINT investigation findings to identify distinct individuals.

Target query: ${investigation?.targetName}
${investigation?.targetDescription ? `Description: ${investigation.targetDescription}` : ""}

## All Findings
${findingsContext}

## Investigation Steps
${stepsContext}

TASK: Group these findings into candidate profiles. Each profile represents a distinct individual that could match the target query. Attribute each finding to the most likely profile, or mark it as unattributed.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "profiles": [
    {
      "label": "Short identifier (e.g. 'John Smith — NYC Software Engineer')",
      "matchConfidence": 0-100,
      "isPrimaryMatch": true/false,
      "summary": "2-3 sentence profile summary",
      "findings": ["finding indices that belong to this person"],
      "digitalFootprint": [
        { "platform": "LinkedIn", "url": "...", "username": "..." }
      ],
      "locations": ["NYC, NY", "Brooklyn, NY"],
      "connections": ["Jane Smith (relative)", "Acme Corp (employer)"],
      "keyEvidence": "What makes this a match or not — corroborating signals",
      "redFlags": "Contradictions or weak signals"
    }
  ],
  "unattributed": ["findings that couldn't be confidently attributed to any profile"],
  "analysisNotes": "Brief note on disambiguation challenges"
}

Rules:
- Primary match = highest confidence profile, the one most likely to be the actual target
- If ALL findings clearly belong to one person, return a single profile at high confidence
- If findings are ambiguous, split into 2-4 candidate profiles
- matchConfidence reflects how likely THIS profile is the actual target (not data quality)
- Include finding indices (0-based) from the findings list above
- Always explain corroborating evidence in keyEvidence
```

**Keep the existing markdown report as a fallback.** If JSON parsing fails, fall back to the current markdown report path.

### 2. `convex/schema.ts` — Add `profileReport` field

```ts
// In investigations table, add:
profileReport: v.optional(v.string()), // JSON string of structured profile report
```

The `generateReport` function stores the structured JSON in `profileReport` alongside the existing `report` (markdown) field. This way the markdown report still works as fallback.

### 3. `convex/orchestrator.ts` — Store structured report

In `generateReport`, after the Opus call:

```ts
// Try to parse as structured JSON
let profileReport: string | undefined;
try {
  const parsed = JSON.parse(reportText);
  if (parsed.profiles && Array.isArray(parsed.profiles)) {
    profileReport = reportText; // Valid structured report
    // Generate a markdown summary for backward compat
    reportText = parsed.profiles
      .map((p: any) => `## ${p.label} (${p.matchConfidence}% match)\n\n${p.summary}\n\n**Key Evidence:** ${p.keyEvidence}\n\n**Locations:** ${(p.locations || []).join(", ")}\n\n**Digital Footprint:**\n${(p.digitalFootprint || []).map((d: any) => `- ${d.platform}: ${d.url || d.username}`).join("\n")}`)
      .join("\n\n---\n\n");
  }
} catch {
  // Not JSON — keep as markdown (backward compat)
}

// Patch investigation with both
await ctx.runMutation(api.investigations.updateInvestigation, {
  id: investigationId,
  report: reportText,
  profileReport, // new field
  ...
});
```

### 4. `src/components/DetectiveReport.tsx` — Multi-profile rendering

Add a new section above the markdown report when `profileReport` is available:

**UI Design:**
- **Profile tabs** at top: "John Smith — NYC Engineer (85%)" | "John Smith — LA Student (35%)" | "Unattributed"
- Each tab shows:
  - Match confidence badge (color-coded: green >70%, yellow 40-70%, red <40%)
  - Summary paragraph
  - Digital footprint links
  - Locations list
  - Key evidence callout (green box)
  - Red flags callout (red box, if any)
  - Attributed findings grid (reuse existing FindingsGrid with filtered findings)
- **"Unattributed" tab** shows findings that couldn't be tied to a specific person
- Active profile tab has accent border, others are muted

```tsx
interface Profile {
  label: string;
  matchConfidence: number;
  isPrimaryMatch: boolean;
  summary: string;
  findings: number[];
  digitalFootprint: { platform: string; url?: string; username?: string }[];
  locations: string[];
  connections: string[];
  keyEvidence: string;
  redFlags?: string;
}

interface ProfileReport {
  profiles: Profile[];
  unattributed: number[];
  analysisNotes: string;
}
```

### 5. `src/pages/Report.tsx` — Pass profileReport

Pass `investigation.profileReport` to `DetectiveReport`. The component checks if it's valid JSON with profiles, and if so renders the tabbed view. Otherwise falls back to the existing markdown display.

## Files Changed

| File | Change |
|------|--------|
| `convex/orchestrator.ts` | New report prompt (structured JSON), parse + store `profileReport` |
| `convex/schema.ts` | Add `profileReport` optional field to `investigations` |
| `src/components/DetectiveReport.tsx` | Multi-profile tab UI with per-profile evidence |
| `src/pages/Report.tsx` | Pass `profileReport` prop |

## What Doesn't Change

- Schema for findings, steps, directives — untouched
- Orchestrator agentic loop — untouched
- save_finding tool — no profileId needed
- Behavioral analysis — runs independently, not per-profile
- Investigation page (live view) — unchanged

## Edge Cases

1. **Single person (clear match):** Opus returns 1 profile at high confidence → renders as single profile (no tabs needed, just the profile card)
2. **JSON parse failure:** Falls back to markdown report (existing behavior)
3. **Old investigations:** No `profileReport` field → renders markdown only (backward compat)
4. **Zero findings:** Opus still generates report noting no evidence found

## Demo Value

High. Shows the tool is intelligent enough to **not mix up different people** — a common failure mode in OSINT tools. Judges will appreciate the disambiguation UX, especially for common name searches.
