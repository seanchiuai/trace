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

export const acknowledgeDirectives = mutation({
  args: { directiveIds: v.array(v.id("directives")) },
  handler: async (ctx, args) => {
    for (const id of args.directiveIds) {
      await ctx.db.patch(id, { acknowledged: true });
    }
  },
});
