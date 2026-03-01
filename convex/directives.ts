import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getPendingDirectives = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("directives")
      .withIndex("by_investigation_pending", (q) =>
        q.eq("investigationId", args.investigationId).eq("acknowledged", false)
      )
      .collect();
  },
});

export const getDirectives = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("directives")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();
  },
});

export const createDirective = mutation({
  args: {
    investigationId: v.id("investigations"),
    type: v.union(v.literal("kill_lead"), v.literal("general")),
    message: v.string(),
    findingId: v.optional(v.id("findings")),
  },
  handler: async (ctx, args) => {
    const investigation = await ctx.db.get(args.investigationId);
    if (
      !investigation ||
      !["investigating", "planning", "awaiting_input"].includes(
        investigation.status
      )
    ) {
      throw new Error("Cannot add directive to inactive investigation");
    }
    return await ctx.db.insert("directives", {
      investigationId: args.investigationId,
      type: args.type,
      message: args.message,
      findingId: args.findingId,
      acknowledged: false,
      createdAt: Date.now(),
    });
  },
});

export const acknowledgeDirectives = mutation({
  args: { directiveIds: v.array(v.id("directives")) },
  handler: async (ctx, args) => {
    for (const id of args.directiveIds) {
      await ctx.db.patch(id, { acknowledged: true });
    }
  },
});
