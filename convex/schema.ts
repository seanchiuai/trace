import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  investigations: defineTable({
    query: v.string(),
    targetName: v.string(),
    targetDescription: v.optional(v.string()),
    targetPhone: v.optional(v.string()),
    targetPhoto: v.optional(v.string()),
    knownLinks: v.array(v.string()),
    status: v.union(
      v.literal("planning"),
      v.literal("investigating"),
      v.literal("analyzing"),
      v.literal("complete"),
      v.literal("failed")
    ),
    browserSessionId: v.optional(v.string()),
    browserLiveUrl: v.optional(v.string()),
    report: v.optional(v.string()),
    confidence: v.optional(v.number()),
    stepCount: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }),

  findings: defineTable({
    investigationId: v.id("investigations"),
    source: v.string(),
    category: v.string(),
    platform: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    data: v.string(),
    confidence: v.number(),
    createdAt: v.number(),
  }).index("by_investigation", ["investigationId"]),

  steps: defineTable({
    investigationId: v.id("investigations"),
    stepNumber: v.number(),
    action: v.string(),
    tool: v.string(),
    result: v.optional(v.string()),
    screenshot: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_investigation", ["investigationId"]),
});
