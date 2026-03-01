import { v } from "convex/values";
import { internalAction } from "../_generated/server";

const BRAVE_SEARCH_API = "https://api.search.brave.com/res/v1/web/search";

export const search = internalAction({
  args: {
    query: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (_, args) => {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) throw new Error("BRAVE_API_KEY not set");

    const count = Math.min(Math.max(1, args.count ?? 10), 20);
    const params = new URLSearchParams({
      q: args.query,
      count: String(count),
    });

    const res = await fetch(`${BRAVE_SEARCH_API}?${params}`, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Brave Search failed (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const results = (data.web?.results ?? []).map(
      (r: { title: string; url: string; description: string }) => ({
        title: r.title,
        url: r.url,
        description: r.description,
      })
    );

    return { results, query: args.query };
  },
});
