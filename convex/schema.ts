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
      v.literal("failed"),
      v.literal("stopped"),
      v.literal("awaiting_input")
    ),
    browserSessionId: v.optional(v.string()),
    browserLiveUrl: v.optional(v.string()),
    report: v.optional(v.string()),
    profileReport: v.optional(v.string()),
    confidence: v.optional(v.number()),
    instructions: v.optional(v.string()),
    extremeMode: v.optional(v.boolean()),
    disabledTools: v.optional(v.array(v.string())),
    errorMessage: v.optional(v.string()),
    stepCount: v.number(),
    totalInputTokens: v.optional(v.number()),
    totalOutputTokens: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    behavioralAnalysis: v.optional(v.string()),
    profileReport: v.optional(v.string()),
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
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
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

  directives: defineTable({
    investigationId: v.id("investigations"),
    type: v.union(v.literal("kill_lead"), v.literal("general")),
    findingId: v.optional(v.id("findings")),
    message: v.string(),
    acknowledged: v.boolean(),
    createdAt: v.number(),
  }).index("by_investigation", ["investigationId"])
    .index("by_investigation_pending", ["investigationId", "acknowledged"]),

  clarifications: defineTable({
    investigationId: v.id("investigations"),
    question: v.string(),
    options: v.array(v.string()),
    context: v.optional(v.string()),
    response: v.optional(v.string()),
    respondedAt: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("answered"), v.literal("skipped")),
    conversationHistory: v.string(),
    consecutiveSaveOnlySteps: v.number(),
    maigretAvailable: v.boolean(),
    extremeMode: v.boolean(),
    disabledTools: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }).index("by_investigation", ["investigationId"]),

  graph_edges: defineTable({
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
    createdAt: v.number(),
  }).index("by_investigation", ["investigationId"]),
});
