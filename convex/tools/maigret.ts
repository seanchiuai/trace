import { v } from "convex/values";
import { internalAction } from "../_generated/server";

const SIDECAR_URL =
  process.env.MAIGRET_SIDECAR_URL || "http://localhost:8000";

interface MaigretProfile {
  url: string;
  site_name?: string;
  category?: string;
  fullname?: string;
  bio?: string;
  location?: string;
  [key: string]: unknown;
}

interface MaigretResponse {
  username: string;
  results: Record<string, MaigretProfile>;
  count: number;
  categories?: Record<string, number>;
  error?: string;
}

interface Lead {
  username: string;
  platform?: string;
  reason: string;
}

interface InvestigationResult {
  primary_username: string;
  primary_profiles: Record<string, MaigretProfile>;
  leads_extracted: Lead[];
  lead_profiles: Record<string, Record<string, MaigretProfile>>;
  lead_graph: Array<{
    from: string;
    to: string;
    platform?: string;
    reason: string;
  }>;
  llm_analysis: string;
  total_profiles: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helper: direct fetch to sidecar (used by both search action and investigate)
// ---------------------------------------------------------------------------

async function searchSidecar(
  username: string,
  topSites: number
): Promise<MaigretResponse> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const url = `${SIDECAR_URL}/search?username=${encodeURIComponent(username)}&top_sites=${topSites}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(130_000) });
      if (!res.ok) {
        throw new Error(`Sidecar returned ${res.status}: ${await res.text()}`);
      }
      return await res.json();
    } catch (error) {
      console.error(`Maigret attempt ${attempt + 1} for "${username}":`, error instanceof Error ? error.message : error);
      if (attempt === 1) {
        return {
          username,
          results: {},
          count: 0,
          error: `Sidecar unavailable: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  return { username, results: {}, count: 0, error: "Unexpected" };
}

// ---------------------------------------------------------------------------
// Core: search a single username via the sidecar (Convex action)
// ---------------------------------------------------------------------------

export const search = internalAction({
  args: {
    username: v.string(),
    topSites: v.optional(v.number()),
  },
  handler: async (_, args): Promise<MaigretResponse> => {
    return searchSidecar(args.username, args.topSites ?? 100);
  },
});

// ---------------------------------------------------------------------------
// Intelligent investigate: search → LLM lead extraction → follow leads
// ---------------------------------------------------------------------------

export const investigate = internalAction({
  args: {
    username: v.string(),
    targetName: v.optional(v.string()),
    targetDescription: v.optional(v.string()),
    topSites: v.optional(v.number()),
  },
  handler: async (_, args): Promise<InvestigationResult> => {
    const topSites = args.topSites ?? 100;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // --- Step 1: Search primary username ---
    console.log(`[investigate] Searching primary username: ${args.username}`);
    const primaryResult = await searchSidecar(args.username, topSites);

    if (primaryResult.count === 0 && primaryResult.error) {
      return {
        primary_username: args.username,
        primary_profiles: {},
        leads_extracted: [],
        lead_profiles: {},
        lead_graph: [],
        llm_analysis: "",
        total_profiles: 0,
        error: primaryResult.error,
      };
    }

    // --- Step 2: Use Claude to extract leads from profile data ---
    let leads: Lead[] = [];
    let analysis = "";

    if (apiKey && Object.keys(primaryResult.results).length > 0) {
      console.log(`[investigate] Asking Claude to extract leads from ${primaryResult.count} profiles`);
      const extraction = await extractLeadsWithLLM(
        apiKey,
        args.username,
        args.targetName,
        args.targetDescription,
        primaryResult.results
      );
      leads = extraction.leads;
      analysis = extraction.analysis;
      console.log(`[investigate] Claude extracted ${leads.length} leads: ${leads.map((l) => l.username).join(", ")}`);
    } else if (!apiKey) {
      console.warn("[investigate] No ANTHROPIC_API_KEY — skipping LLM lead extraction");
    }

    // --- Step 3: Search each extracted lead ---
    const leadProfiles: Record<string, Record<string, MaigretProfile>> = {};
    const leadGraph: InvestigationResult["lead_graph"] = [];

    // Add edges from primary to each lead
    for (const lead of leads) {
      leadGraph.push({
        from: args.username,
        to: lead.username,
        platform: lead.platform,
        reason: lead.reason,
      });
    }

    // Search leads in parallel batches of 3
    const uniqueLeadUsernames = [
      ...new Set(
        leads
          .map((l) => l.username.toLowerCase())
          .filter((u) => u !== args.username.toLowerCase())
      ),
    ];

    for (let i = 0; i < uniqueLeadUsernames.length; i += 3) {
      const batch = uniqueLeadUsernames.slice(i, i + 3);
      const batchPromises = batch.map((leadUsername) =>
        searchSidecar(leadUsername, Math.min(topSites, 50))
      );

      const batchResults = await Promise.all(batchPromises);
      for (const result of batchResults) {
        if (result.count > 0) {
          leadProfiles[result.username] = result.results;
        }
      }
    }

    // Count total unique profiles
    let totalProfiles = Object.keys(primaryResult.results).length;
    for (const profiles of Object.values(leadProfiles)) {
      totalProfiles += Object.keys(profiles).length;
    }

    return {
      primary_username: args.username,
      primary_profiles: primaryResult.results,
      leads_extracted: leads,
      lead_profiles: leadProfiles,
      lead_graph: leadGraph,
      llm_analysis: analysis,
      total_profiles: totalProfiles,
    };
  },
});

// ---------------------------------------------------------------------------
// LLM lead extraction: Claude reads profile data and finds real leads
// ---------------------------------------------------------------------------

async function extractLeadsWithLLM(
  apiKey: string,
  username: string,
  targetName: string | undefined,
  targetDescription: string | undefined,
  profiles: Record<string, MaigretProfile>
): Promise<{ leads: Lead[]; analysis: string }> {
  // Build a concise summary of all profiles for Claude
  const profileSummary = Object.entries(profiles)
    .map(([site, p]) => {
      const fields: string[] = [`  Site: ${p.site_name || site}`, `  URL: ${p.url}`];
      if (p.fullname) fields.push(`  Full Name: ${p.fullname}`);
      if (p.bio) fields.push(`  Bio: ${p.bio}`);
      if (p.location) fields.push(`  Location: ${p.location}`);
      // Include all other metadata
      for (const [k, val] of Object.entries(p)) {
        if (
          typeof val === "string" &&
          val &&
          !["url", "site_name", "category", "fullname", "bio", "location"].includes(k)
        ) {
          fields.push(`  ${k}: ${val}`);
        }
      }
      return fields.join("\n");
    })
    .join("\n\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are analyzing OSINT profile data for an investigation.

Target username: "${username}"
${targetName ? `Target real name: "${targetName}"` : ""}
${targetDescription ? `Target description: "${targetDescription}"` : ""}

Here are the profiles found for this username across the internet:

${profileSummary}

Your job:
1. Analyze ALL profile metadata carefully — bios, descriptions, linked accounts, mentioned handles
2. Extract EVERY concrete lead: other usernames, handles, or accounts mentioned or linked in the data
3. Look for patterns like "X: @handle", "Twitter: handle", "IG: handle", "github.com/user", "@mentions", linked URLs, email-derived usernames, etc.
4. Identify which profiles actually belong to the same person vs false positives
5. Note any connected people (friends, collaborators, etc.) mentioned

Respond with EXACTLY this JSON format (no markdown, no code fences):
{
  "analysis": "Brief analysis of what you found — which profiles are real, key observations, connections",
  "leads": [
    {
      "username": "the_extracted_handle",
      "platform": "twitter|instagram|tiktok|github|etc or null if unknown",
      "reason": "Why this is a lead — e.g. 'Mentioned as X/Twitter handle in Telegram bio'"
    }
  ]
}

Only include leads that are REAL — extracted from actual profile data, not guessed. If a bio says "X: @handle", that's a real lead. Do NOT generate random username variations. Every lead must trace back to something in the profile data.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("Claude lead extraction failed:", await response.text());
    return { leads: [], analysis: "LLM extraction failed" };
  }

  const data = await response.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text || "";

  try {
    // Parse the JSON response — handle potential markdown fences
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
      analysis: parsed.analysis || "",
    };
  } catch (e) {
    console.error("Failed to parse Claude lead extraction:", e, "Raw:", text);
    return { leads: [], analysis: text };
  }
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export const healthCheck = internalAction({
  args: {},
  handler: async () => {
    try {
      const res = await fetch(`${SIDECAR_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { healthy: false, error: `Status ${res.status}` };
      return { healthy: true, ...(await res.json()) };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
