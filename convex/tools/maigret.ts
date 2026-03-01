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

interface FilteredResult {
  username: string;
  results: Record<string, MaigretProfile>;
  count: number;
  categories: Record<string, number>;
  filtered_out: number;
  error?: string;
}

/**
 * Search for a username across 3,000+ sites via Maigret sidecar.
 */
export const search = internalAction({
  args: {
    username: v.string(),
    topSites: v.optional(v.number()),
    filterContext: v.optional(
      v.object({
        name: v.optional(v.string()),
        location: v.optional(v.string()),
        bio: v.optional(v.string()),
      })
    ),
  },
  handler: async (_, args): Promise<FilteredResult> => {
    const topSites = args.topSites ?? 100;

    // Try up to 2 times
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `${SIDECAR_URL}/search?username=${encodeURIComponent(args.username)}&top_sites=${topSites}`;

        const res = await fetch(url, {
          signal: AbortSignal.timeout(130_000), // slightly above sidecar's 120s
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Sidecar returned ${res.status}: ${errText}`);
        }

        const data: MaigretResponse = await res.json();

        // Apply contextual filtering if provided
        if (args.filterContext) {
          return filterResults(data, args.filterContext);
        }

        return {
          username: data.username,
          results: data.results,
          count: data.count,
          categories: data.categories ?? {},
          filtered_out: 0,
          error: data.error,
        };
      } catch (error) {
        console.error(
          `Maigret attempt ${attempt + 1} failed:`,
          error instanceof Error ? error.message : error
        );

        if (attempt === 1) {
          // Final attempt failed
          return {
            username: args.username,
            results: {},
            count: 0,
            categories: {},
            filtered_out: 0,
            error: `Maigret sidecar unavailable after 2 attempts: ${
              error instanceof Error ? error.message : String(error)
            }`,
          };
        }

        // Wait 2s before retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Should never reach here, but TypeScript needs it
    return {
      username: args.username,
      results: {},
      count: 0,
      categories: {},
      filtered_out: 0,
      error: "Unexpected error",
    };
  },
});

/**
 * Batch search multiple usernames in parallel.
 */
export const batchSearch = internalAction({
  args: {
    usernames: v.array(v.string()),
  },
  handler: async (_, args) => {
    if (args.usernames.length === 0) {
      return { results: {} };
    }

    const usernameParam = args.usernames.slice(0, 5).join(",");

    try {
      const res = await fetch(
        `${SIDECAR_URL}/batch?usernames=${encodeURIComponent(usernameParam)}`,
        { signal: AbortSignal.timeout(180_000) }
      );

      if (!res.ok) {
        throw new Error(`Batch search returned ${res.status}`);
      }

      return await res.json();
    } catch (error) {
      console.error("Maigret batch search error:", error);
      return {
        usernames: args.usernames,
        results: {},
        error: `Batch search failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

/**
 * Check if the Maigret sidecar is running and healthy.
 */
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

/**
 * Filter Maigret results using known context about the target.
 * Maigret has ~86% false positive rate, so filtering is critical.
 */
function filterResults(
  data: MaigretResponse,
  context: { name?: string; location?: string; bio?: string }
): FilteredResult {
  const filtered: Record<string, MaigretProfile> = {};
  let filteredOut = 0;

  const nameParts = context.name
    ?.toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length > 2) ?? [];
  const locationLower = context.location?.toLowerCase();

  for (const [site, profile] of Object.entries(data.results)) {
    // High-value platforms are always kept (likely real leads)
    const highValue = [
      "instagram",
      "facebook",
      "twitter",
      "x",
      "linkedin",
      "github",
      "telegram",
      "tiktok",
      "reddit",
      "youtube",
    ];
    if (highValue.some((hv) => site.includes(hv))) {
      filtered[site] = profile;
      continue;
    }

    // Check if profile metadata matches known context
    let matchScore = 0;

    if (nameParts.length > 0 && profile.fullname) {
      const fullnameLower = profile.fullname.toLowerCase();
      for (const part of nameParts) {
        if (fullnameLower.includes(part)) matchScore += 2;
      }
    }

    if (locationLower && profile.location) {
      if (profile.location.toLowerCase().includes(locationLower)) {
        matchScore += 2;
      }
    }

    if (profile.bio && context.bio) {
      // Simple keyword overlap check
      const bioWords = context.bio.toLowerCase().split(/\s+/);
      const profileBioWords = profile.bio.toLowerCase().split(/\s+/);
      const overlap = bioWords.filter((w) => profileBioWords.includes(w));
      if (overlap.length > 1) matchScore += 1;
    }

    // Keep if any context matches, or if no context was available to filter with
    if (matchScore > 0 || (nameParts.length === 0 && !locationLower)) {
      filtered[site] = profile;
    } else {
      filteredOut++;
    }
  }

  const categories: Record<string, number> = {};
  for (const profile of Object.values(filtered)) {
    const cat = (profile.category as string) ?? "other";
    categories[cat] = (categories[cat] ?? 0) + 1;
  }

  return {
    username: data.username,
    results: filtered,
    count: Object.keys(filtered).length,
    categories,
    filtered_out: filteredOut,
  };
}
