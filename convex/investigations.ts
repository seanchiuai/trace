import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    targetName: v.string(),
    targetDescription: v.optional(v.string()),
    targetPhone: v.optional(v.string()),
    targetPhoto: v.optional(v.string()),
    knownLinks: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("investigations", {
      query: `Investigate ${args.targetName}`,
      targetName: args.targetName,
      targetDescription: args.targetDescription,
      targetPhone: args.targetPhone,
      targetPhoto: args.targetPhoto,
      knownLinks: args.knownLinks,
      status: "planning",
      stepCount: 0,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const get = query({
  args: { id: v.id("investigations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("investigations")
      .order("desc")
      .take(20);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("investigations"),
    status: v.union(
      v.literal("planning"),
      v.literal("investigating"),
      v.literal("analyzing"),
      v.literal("complete"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "complete") {
      patch.completedAt = Date.now();
    }
    await ctx.db.patch(args.id, patch);
  },
});

export const updateReport = mutation({
  args: {
    id: v.id("investigations"),
    report: v.string(),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      report: args.report,
      confidence: args.confidence,
    });
  },
});

export const updateBrowserSession = mutation({
  args: {
    id: v.id("investigations"),
    browserSessionId: v.optional(v.string()),
    browserLiveUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      browserSessionId: args.browserSessionId,
      browserLiveUrl: args.browserLiveUrl,
    });
  },
});

export const incrementStep = mutation({
  args: { id: v.id("investigations") },
  handler: async (ctx, args) => {
    const investigation = await ctx.db.get(args.id);
    if (!investigation) throw new Error("Investigation not found");
    await ctx.db.patch(args.id, {
      stepCount: investigation.stepCount + 1,
    });
    return investigation.stepCount + 1;
  },
});

export const getFindings = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("findings")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .order("desc")
      .collect();
  },
});

export const getSteps = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("steps")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .order("asc")
      .collect();
  },
});

export const addStep = mutation({
  args: {
    investigationId: v.id("investigations"),
    stepNumber: v.number(),
    action: v.string(),
    tool: v.string(),
    result: v.optional(v.string()),
    screenshot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("steps", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const addFinding = mutation({
  args: {
    investigationId: v.id("investigations"),
    source: v.string(),
    category: v.string(),
    platform: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    data: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("findings", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
