import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const addEdge = mutation({
  args: {
    investigationId: v.id("investigations"),
    fromLabel: v.string(),
    toLabel: v.string(),
    fromType: v.string(),
    toType: v.string(),
    edgeType: v.union(
      v.literal("follows"),
      v.literal("mentioned_by"),
      v.literal("same_username"),
      v.literal("found_via"),
      v.literal("located_at")
    ),
    platform: v.optional(v.string()),
    reason: v.optional(v.string()),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("graph_edges", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const addEdges = mutation({
  args: {
    edges: v.array(
      v.object({
        investigationId: v.id("investigations"),
        fromLabel: v.string(),
        toLabel: v.string(),
        fromType: v.string(),
        toType: v.string(),
        edgeType: v.union(
          v.literal("follows"),
          v.literal("mentioned_by"),
          v.literal("same_username"),
          v.literal("found_via"),
          v.literal("located_at")
        ),
        platform: v.optional(v.string()),
        reason: v.optional(v.string()),
        confidence: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const edge of args.edges) {
      await ctx.db.insert("graph_edges", { ...edge, createdAt: now });
    }
  },
});

export const getEdges = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("graph_edges")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();
  },
});
