import { v } from "convex/values";
import { query } from "./_generated/server";

export const getReport = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const investigation = await ctx.db.get(args.investigationId);
    if (!investigation) return null;

    const findings = await ctx.db
      .query("findings")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();

    const steps = await ctx.db
      .query("steps")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .order("asc")
      .collect();

    return {
      investigation,
      findings,
      steps,
    };
  },
});
