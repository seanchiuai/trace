import { v } from "convex/values";
import { action } from "../_generated/server";

const SUPERMEMORY_API = "https://api.supermemory.com/v1";

export const store = action({
  args: {
    key: v.string(),
    data: v.string(),
    investigationId: v.string(),
  },
  handler: async (_, args) => {
    const apiKey = process.env.SUPERMEMORY_API_KEY;
    if (!apiKey) {
      console.warn("SUPERMEMORY_API_KEY not set, skipping memory store");
      return { stored: false };
    }

    try {
      const res = await fetch(`${SUPERMEMORY_API}/memories`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: args.data,
          metadata: {
            key: args.key,
            investigationId: args.investigationId,
          },
        }),
      });

      if (!res.ok) throw new Error(`Supermemory store failed: ${res.status}`);
      return { stored: true, ...(await res.json()) };
    } catch (error) {
      console.error("Supermemory store error:", error);
      return { stored: false };
    }
  },
});

export const recall = action({
  args: {
    query: v.string(),
    investigationId: v.string(),
  },
  handler: async (_, args) => {
    const apiKey = process.env.SUPERMEMORY_API_KEY;
    if (!apiKey) {
      console.warn("SUPERMEMORY_API_KEY not set, skipping memory recall");
      return { memories: [] };
    }

    try {
      const res = await fetch(`${SUPERMEMORY_API}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: args.query,
          filter: {
            investigationId: args.investigationId,
          },
        }),
      });

      if (!res.ok) throw new Error(`Supermemory recall failed: ${res.status}`);
      return await res.json();
    } catch (error) {
      console.error("Supermemory recall error:", error);
      return { memories: [] };
    }
  },
});
