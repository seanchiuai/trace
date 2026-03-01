import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const MAX_STEPS = 20;
const MAX_CONSECUTIVE_SAVE_ONLY = 3;
const COMPRESSION_TOKEN_THRESHOLD = 20_000;
const KEEP_RECENT_EXCHANGES = 3;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

function buildSystemPrompt(maigretAvailable: boolean, extremeMode: boolean = false): string {
  const toolLines: string[] = [];
  let n = 1;
  if (maigretAvailable) {
    toolLines.push(
      `${n++}. maigret_search(username) — Intelligent OSINT: searches 3,000+ sites for the username, then an AI reads all profile bios/metadata to extract REAL connected handles (e.g. "X: @handle" in a Telegram bio, GitHub profile linking to Twitter, etc.), and automatically searches those leads too. Returns primary profiles, AI-extracted leads with reasoning, lead search results, and a connection graph. One call gives you a deep web of connected accounts — not just the primary username.`
    );
  }
  toolLines.push(
    `${n++}. browser_action(instruction) — Control a web browser. Give clear instructions like "Go to imginn.com/username and report what you see." IMPORTANT: Most social media sites (Instagram, LinkedIn, Facebook, Twitter) have login walls — NEVER browse them directly. Use proxy viewer sites instead (see Login Wall Avoidance in strategy). Returns screenshots and page text. Use for interactive pages that require scrolling or JS rendering. EXPENSIVE — prefer web_search for simple lookups.`,
    `${n++}. web_search(query, count?) — Fast web search. Returns titles, URLs, and snippets. Use this FIRST for simple lookups like "John Smith LinkedIn", "username site:twitter.com", company info, news articles, etc. Much faster and cheaper than browser_action.`,
    `${n++}. geospy_predict(imageUrl) — AI photo geolocation. Upload a photo URL and get predicted GPS coordinates, city, country, and an explanation of the visual clues used. Use on any image that might reveal a location (street views, landmarks, scenery).`,
    `${n++}. geo_locate(imageUrl) — AI geolocation via Picarta: analyzes an image and predicts WHERE it was taken (city, state, country, GPS coordinates) based on visual clues. Returns coordinates, confidence score, EXIF metadata, and top-3 predictions. Use on any photo with visible backgrounds, landmarks, or architecture.`,
    `${n++}. reverse_image_search(imageUrl) — Reverse image search. Find where a photo appears online — social profiles, news articles, blogs. Returns visual matches, knowledge graph identity, and text in the image.`
  );
  if (extremeMode) {
    toolLines.push(
      `${n++}. whitepages_lookup(name?, phone?, city?, stateCode?) — Deep person lookup using WhitePages. Search by name, phone number, or both. Returns real addresses (with lat/lng), age range, phone numbers, and associated people. Use when you have a name or phone number and need real-world identity data.`,
      `${n++}. darkweb_search(term, maxResults?) — Search dark web, leaked databases, and paste sites. Find breach records, leaked credentials, and data dump mentions for an email, username, phone, or domain. Use to uncover hidden connections or verify identities.`
    );
  }
  toolLines.push(
    `${n++}. save_finding(source, category, platform, data, confidence, imageUrl?, profileUrl?) — Save a confirmed finding. Categories: "social", "connection", "location", "activity", "identity". FREE — does not count toward your step budget. Save findings liberally as you discover them. IMPORTANT: When you find profile photos, post images, or any visual evidence, ALWAYS include the imageUrl. On imginn.com, image URLs look like "https://imginn.com/p/..." or CDN URLs from the page.`,
    `${n++}. ask_user(question, options, context?) — Ask the user a clarifying question with 2-4 selectable options. Use when results are ambiguous and a quick answer would save multiple steps (e.g. "Found 12 John Smiths — which city are they likely in?"). Always include "Not sure" as the last option. FREE — doesn't burn steps.`,
    `${n++}. done(report) — End the investigation and generate the final report.`
  );

  const strategyBullets: string[] = [
    `- Look at the available info summary to decide your first move:`,
    ...(maigretAvailable
      ? [`  - Username known → start with maigret_search to cast a wide OSINT net`]
      : []),
    `  - Only a name → use web_search to find usernames, profiles, and leads first`,
    `  - Common name + description → search "name" + key description details (city, job, age) on web_search FIRST to find leads; run maigret in parallel if a likely username emerges`,
    `  - If results are overwhelming or ambiguous → use ask_user to let the user disambiguate (e.g. which city, which age range, which profile photo matches)`,
    `  - Photo available → use geospy_predict to geolocate the photo; use reverse_image_search to find where it appears online`,
    `  - Social links provided → explore those profiles directly (web_search or browser_action)`,
    `  - Phone number → search it via web_search${extremeMode ? "; also use whitepages_lookup for deep identity data" : ""}`,
    ...(extremeMode
      ? [`  - Email/username known → use darkweb_search to check for leaked records, breach data, and paste site mentions`]
      : []),
    `- Consider the target type and pick platforms accordingly:`,
    `  - Younger person → prioritize TikTok, Instagram, Snapchat, Discord`,
    `  - Professional → prioritize LinkedIn, GitHub, company pages`,
    `  - Founder/entrepreneur → check Crunchbase, AngelList, press coverage`,
    `  - General → cast a wide net across major platforms`,
    `- When you find photos with visible backgrounds (buildings, streets, landscapes), run geo_locate to predict GPS location`,
    `- Use web_search for simple lookups; reserve browser_action for pages that need interaction`,
    `- Login wall avoidance — NEVER visit these sites directly in browser_action, use alternatives:`,
    `  - Instagram → use imginn.com/username or picuki.com/profile/username (public viewer, no login)`,
    `  - TikTok → use urlebird.com/user/username (public viewer, no login)`,
    `  - Facebook → use web_search "site:facebook.com name" for cached data; or try mbasic.facebook.com/username for minimal public view`,
    `  - LinkedIn → use web_search "site:linkedin.com/in/ name title" — Google caches public profiles; NEVER browse linkedin.com directly (login wall)`,
    `  - Twitter/X → try nitter.net/username or xcancel.com/username as public viewers; fall back to web_search "site:x.com username"`,
    `  - Pinterest → use web_search "site:pinterest.com username"; or browse pinterest.com/username/ (usually public without login)`,
    `  - Reddit → use old.reddit.com/user/username (no login needed for public profiles)`,
    `- Save findings as you go (it's free — doesn't burn steps)`,
    `<use_parallel_tool_calls>\nFor maximum efficiency, whenever you perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.\nPrioritize calling tools in parallel whenever possible.\n</use_parallel_tool_calls>`,
    `- After gathering enough evidence (or nearing 20 steps), call done()`,
  ];

  return `You are an expert missing persons investigator. You think methodically, follow leads, and build a comprehensive picture of a person's digital footprint.

You have access to these tools:
${toolLines.join("\n")}

Strategy — ADAPT to what you know:
${strategyBullets.join("\n")}

Always explain your reasoning before choosing an action. Be thorough but efficient.`;
}

interface ToolCall {
  id: string;
  tool: string;
  args: Record<string, unknown>;
}

const TOOL_DEFINITIONS = [
  {
    name: "maigret_search",
    description:
      "Intelligent OSINT search: searches a username across 3,000+ sites, then uses AI to extract connected handles/leads from profile bios and metadata (e.g. 'X: @handle' in a Telegram bio), and automatically searches those leads too. Returns primary profiles, extracted leads with reasoning, lead profiles, and a connection graph.",
    input_schema: {
      type: "object",
      properties: {
        username: { type: "string", description: "The username to search for" },
      },
      required: ["username"],
    },
  },
  {
    name: "browser_action",
    description:
      "Control a web browser. Give natural language instructions. Returns screenshot and page text. Use for interactive pages; prefer web_search for simple lookups.",
    input_schema: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description: 'What to do in the browser, e.g. "Go to imginn.com/johndoe and describe what you see"',
        },
      },
      required: ["instruction"],
    },
  },
  {
    name: "web_search",
    description: "Fast web search via Brave Search API. Returns titles, URLs, and snippets. Use for quick lookups instead of browser_action.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        count: { type: "number", description: "Number of results (default 10, max 20)" },
      },
      required: ["query"],
    },
  },
  {
    name: "geospy_predict",
    description:
      "AI geolocation — upload a photo and get predicted GPS coordinates, city, country, and an explanation of visual clues. Use on any photo that might reveal a location.",
    input_schema: {
      type: "object",
      properties: {
        imageUrl: {
          type: "string",
          description: "URL of the image to geolocate",
        },
      },
      required: ["imageUrl"],
    },
  },
  {
    name: "geo_locate",
    description:
      "AI geolocation via Picarta: analyzes an image and predicts WHERE it was taken based on visual clues. Returns city, country, GPS coordinates, confidence score, top-3 predictions, and EXIF metadata.",
    input_schema: {
      type: "object",
      properties: {
        imageUrl: { type: "string", description: "URL of the image to geo-locate" },
      },
      required: ["imageUrl"],
    },
  },
  {
    name: "whitepages_lookup",
    description:
      "Deep person lookup — search by name, phone number, or both. Returns real addresses, age, phone numbers, and associated people. EXTREME MODE ONLY.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name to search" },
        phone: { type: "string", description: "Phone number to search" },
        city: { type: "string", description: "City to narrow results" },
        stateCode: { type: "string", description: "Two-letter state code" },
      },
    },
  },
  {
    name: "reverse_image_search",
    description:
      "Reverse image search — find where a photo appears online. Returns visual matches (pages containing the image), knowledge graph identity, and text found in/near the image. Use on any photo of the target to find social profiles, news articles, or other appearances.",
    input_schema: {
      type: "object",
      properties: {
        imageUrl: {
          type: "string",
          description: "URL of the image to reverse search",
        },
      },
      required: ["imageUrl"],
    },
  },
  {
    name: "darkweb_search",
    description:
      "Search dark web, leaked databases, and paste sites for mentions of an email, username, phone number, or domain. Returns breach records, paste appearances, and leaked data references. EXTREME MODE ONLY.",
    input_schema: {
      type: "object",
      properties: {
        term: {
          type: "string",
          description: "Email, username, phone number, or domain to search for in leaked/dark web data",
        },
        maxResults: {
          type: "number",
          description: "Maximum results to return (default 10, max 20)",
        },
      },
      required: ["term"],
    },
  },
  {
    name: "save_finding",
    description: "Save a confirmed finding from the investigation. FREE — does not count toward your step budget.",
    input_schema: {
      type: "object",
      properties: {
        source: { type: "string", description: 'Where this finding came from: "instagram", "maigret", "browser", "web_search", etc.' },
        category: { type: "string", enum: ["social", "connection", "location", "activity", "identity"] },
        platform: { type: "string", description: "Platform name" },
        profileUrl: { type: "string", description: "URL if applicable" },
        imageUrl: { type: "string", description: "URL of a relevant image (profile photo, post image, etc.). Always include when available." },
        data: { type: "string", description: "Description of the finding" },
        confidence: { type: "number", description: "Confidence 0-100" },
      },
      required: ["source", "category", "data", "confidence"],
    },
  },
  {
    name: "ask_user",
    description:
      "Ask the user a clarifying question when you're stuck or results are ambiguous. Present 2-4 clear options. Use sparingly — only when disambiguation would save multiple wasted steps. Examples: 'Multiple John Smiths found — which city?', 'Is this the right person?' FREE — does not count toward step budget.",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The question to ask" },
        options: {
          type: "array",
          items: { type: "string" },
          description: "2-4 answer options (always include 'Not sure' as last option)",
        },
        context: {
          type: "string",
          description: "Brief context for why you're asking",
        },
      },
      required: ["question", "options"],
    },
  },
  {
    name: "done",
    description: "End the investigation and generate the final detective report.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Brief summary of all findings" },
      },
      required: ["summary"],
    },
  },
];

export const startInvestigation = action({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const investigation = await ctx.runQuery(api.investigations.get, { id: args.investigationId });
    if (!investigation) throw new Error("Investigation not found");

    await ctx.runMutation(api.investigations.updateStatus, { id: args.investigationId, status: "investigating" });

    let maigretAvailable = false;
    try {
      const health = await ctx.runAction(internal.tools.maigret.healthCheck, {});
      maigretAvailable = health.healthy === true;
    } catch {
      // Sidecar unreachable — will be excluded from tools
    }
    console.log(`Maigret sidecar health check: ${maigretAvailable ? "available" : "unavailable"}`);

    const infoLines: string[] = [];
    infoLines.push(`Name: ${investigation.targetName}`);
    if (investigation.targetDescription)
      infoLines.push(`Description: ${investigation.targetDescription}`);
    if (investigation.targetPhone)
      infoLines.push(`Phone: ${investigation.targetPhone}`);
    if (investigation.knownLinks.length > 0)
      infoLines.push(`Known links: ${investigation.knownLinks.join(", ")}`);
    if (investigation.targetPhoto)
      infoLines.push(`Photo available: Yes`);
    else
      infoLines.push(`No photo provided`);

    const extremeMode = investigation.extremeMode ?? false;

    await ctx.scheduler.runAfter(0, internal.orchestrator.step, {
      investigationId: args.investigationId,
      conversationHistory: JSON.stringify([{
        role: "user",
        content: `Investigate this person.\n\nAvailable info summary:\n${infoLines.join("\n")}\n\nBegin your investigation. Adapt your strategy to the available information — what's your first move?`,
      }]),
      consecutiveSaveOnlySteps: 0,
      maigretAvailable,
      extremeMode,
    });
  },
});

export const stopInvestigation = action({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const investigation = await ctx.runQuery(api.investigations.get, { id: args.investigationId });
    if (!investigation) throw new Error("Investigation not found");
    if (investigation.status === "complete" || investigation.status === "failed" || investigation.status === "stopped") {
      return;
    }
    await ctx.runMutation(api.investigations.updateStatus, {
      id: args.investigationId,
      status: "stopped",
    });
    await cleanupBrowserSession(ctx, args.investigationId);
  },
});

export const step = internalAction({
  args: {
    investigationId: v.id("investigations"),
    conversationHistory: v.string(),
    consecutiveSaveOnlySteps: v.optional(v.number()),
    maigretAvailable: v.optional(v.boolean()),
    extremeMode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const investigation = await ctx.runQuery(api.investigations.get, { id: args.investigationId });
    if (!investigation) return;
    if (investigation.status === "complete" || investigation.status === "failed" || investigation.status === "stopped") return;
    if (investigation.stepCount >= MAX_STEPS) {
      await generateReport(ctx, args.investigationId);
      return;
    }

    const conversationHistory = JSON.parse(args.conversationHistory);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const maigretAvailable = args.maigretAvailable ?? false;
    const extremeMode = args.extremeMode ?? false;
    const tools = TOOL_DEFINITIONS.filter((t) => {
      if (t.name === "maigret_search" && !maigretAvailable) return false;
      if (t.name === "whitepages_lookup" && !extremeMode) return false;
      if (t.name === "darkweb_search" && !extremeMode) return false;
      return true;
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 4096,
        system: buildSystemPrompt(maigretAvailable, extremeMode),
        messages: conversationHistory,
        tools,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      await cleanupBrowserSession(ctx, args.investigationId);
      await ctx.runMutation(api.investigations.updateStatus, {
        id: args.investigationId,
        status: "failed",
        errorMessage: `Anthropic API error (${response.status}): ${errText.slice(0, 500)}`,
      });
      return;
    }

    const data = await response.json();

    if (data.usage) {
      await ctx.runMutation(api.investigations.updateTokenUsage, {
        id: args.investigationId,
        inputTokens: data.usage.input_tokens ?? 0,
        outputTokens: data.usage.output_tokens ?? 0,
      });
    }

    let reasoning = "";
    const toolCalls: ToolCall[] = [];

    for (const block of data.content) {
      if (block.type === "text") {
        reasoning += (reasoning ? "\n" : "") + block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({ id: block.id, tool: block.name, args: block.input });
      }
    }

    const stepNumber = investigation.stepCount + 1;

    // Log reasoning step (non-blocking — fire and continue)
    const reasoningPromise = reasoning
      ? ctx.runMutation(api.investigations.addStep, {
          investigationId: args.investigationId,
          stepNumber,
          action: reasoning.slice(0, 500),
          tool: "reasoning",
        })
      : Promise.resolve();

    if (toolCalls.length === 0) {
      await reasoningPromise;
      await generateReport(ctx, args.investigationId);
      return;
    }

    if (toolCalls.find((tc) => tc.tool === "done")) {
      await reasoningPromise;
      await generateReport(ctx, args.investigationId);
      return;
    }

    // Handle ask_user — pause the loop and wait for user response
    const askUserCall = toolCalls.find((tc) => tc.tool === "ask_user");
    if (askUserCall) {
      await reasoningPromise;
      const askArgs = askUserCall.args as { question: string; options: string[]; context?: string };

      const frozenHistory = [
        ...conversationHistory,
        { role: "assistant", content: data.content },
      ];

      await ctx.runMutation(api.investigations.createClarification, {
        investigationId: args.investigationId,
        question: askArgs.question,
        options: askArgs.options,
        context: askArgs.context,
        conversationHistory: JSON.stringify(frozenHistory),
        consecutiveSaveOnlySteps: args.consecutiveSaveOnlySteps ?? 0,
        maigretAvailable: args.maigretAvailable ?? false,
        extremeMode: args.extremeMode ?? false,
      });

      await ctx.runMutation(api.investigations.addStep, {
        investigationId: args.investigationId,
        stepNumber,
        action: `Asking user: ${askArgs.question}`,
        tool: "ask_user",
      });

      // DON'T schedule next step — wait for user response
      return;
    }

    await reasoningPromise;

    const toolResults: { id: string; tool: string; result: string }[] = [];
    let hasNonSaveFinding = false;

    // Pre-compute step number — no need to re-query per tool
    let currentStepNumber = stepNumber;
    for (const tc of toolCalls) {
      if (tc.tool !== "save_finding") {
        hasNonSaveFinding = true;
      }
    }
    if (hasNonSaveFinding) {
      currentStepNumber = stepNumber + 1;
    }

    // Separate browser_action calls (must be sequential — shared session) from parallelizable tools
    const browserCalls = toolCalls.filter((tc) => tc.tool === "browser_action");
    const parallelCalls = toolCalls.filter((tc) => tc.tool !== "browser_action");

    const executionStart = Date.now();

    // Execute parallelizable tools concurrently
    const parallelPromises = parallelCalls.map(async (tc) => {
      const toolStart = Date.now();
      const result = await executeToolCall(ctx, {
        investigationId: args.investigationId,
        investigation,
        toolCall: tc,
        stepNumber: currentStepNumber,
        extremeMode,
      });
      console.log(`[timing] ${tc.tool} completed in ${Date.now() - toolStart}ms`);
      return { id: tc.id, tool: tc.tool, result };
    });

    // Execute browser_action calls sequentially (shared session)
    const browserResults: { id: string; tool: string; result: string }[] = [];
    for (const tc of browserCalls) {
      const toolStart = Date.now();
      const result = await executeToolCall(ctx, {
        investigationId: args.investigationId,
        investigation,
        toolCall: tc,
        stepNumber: currentStepNumber,
        extremeMode,
      });
      console.log(`[timing] browser_action completed in ${Date.now() - toolStart}ms (sequential)`);
      browserResults.push({ id: tc.id, tool: tc.tool, result });
    }

    const parallelResults = await Promise.allSettled(parallelPromises);
    parallelResults.forEach((r, i) => {
      if (r.status === "fulfilled") {
        toolResults.push(r.value);
      } else {
        toolResults.push({ id: parallelCalls[i].id, tool: parallelCalls[i].tool, result: `Tool error: ${r.reason}` });
      }
    });
    toolResults.push(...browserResults);

    console.log(`[timing] Step ${currentStepNumber}: ${toolCalls.length} tool(s) in ${Date.now() - executionStart}ms (${parallelCalls.length} parallel, ${browserCalls.length} sequential)`);

    // Re-order to match original toolCalls order for correct tool_result mapping
    const orderedResults = toolCalls.map((tc) =>
      toolResults.find((tr) => tr.id === tc.id) ?? { id: tc.id, tool: tc.tool, result: "Tool execution failed" }
    );

    let consecutiveSaveOnly = args.consecutiveSaveOnlySteps ?? 0;
    if (hasNonSaveFinding) {
      await ctx.runMutation(api.investigations.incrementStep, { id: args.investigationId });
      consecutiveSaveOnly = 0;
    } else {
      consecutiveSaveOnly++;
      if (consecutiveSaveOnly >= MAX_CONSECUTIVE_SAVE_ONLY) {
        await ctx.runMutation(api.investigations.incrementStep, { id: args.investigationId });
        consecutiveSaveOnly = 0;
      }
    }

    // Batch log all tool result steps in a single mutation
    const stepEntries = orderedResults.map((tr) => ({
      investigationId: args.investigationId,
      stepNumber,
      action: `Result from ${tr.tool}`,
      tool: tr.tool,
      result: tr.result.slice(0, 2000),
    }));
    await ctx.runMutation(api.investigations.addSteps, { steps: stepEntries });

    const toolResultBlocks = orderedResults.map((tr) => ({
      type: "tool_result",
      tool_use_id: tr.id,
      content: tr.result.slice(0, 4000),
    }));

    const updatedHistory = [
      ...conversationHistory,
      { role: "assistant", content: data.content },
      { role: "user", content: toolResultBlocks },
    ];

    const { history: finalHistory, compressionTokens } = await compressHistory(updatedHistory);

    if (compressionTokens) {
      await ctx.runMutation(api.investigations.updateTokenUsage, {
        id: args.investigationId,
        inputTokens: compressionTokens.input,
        outputTokens: compressionTokens.output,
        model: "claude-sonnet-4-20250514",
      });
    }

    await ctx.scheduler.runAfter(0, internal.orchestrator.step, {
      investigationId: args.investigationId,
      conversationHistory: JSON.stringify(finalHistory),
      consecutiveSaveOnlySteps: consecutiveSaveOnly,
      maigretAvailable,
      extremeMode,
    });
  },
});

async function executeToolCall(
  ctx: Pick<ActionCtx, "runQuery" | "runMutation" | "runAction">,
  params: {
    investigationId: Id<"investigations">;
    investigation: { targetName: string; targetDescription?: string };
    toolCall: ToolCall;
    stepNumber: number;
    extremeMode?: boolean;
  }
): Promise<string> {
  const { investigationId, investigation, toolCall, stepNumber } = params;

  try {
    switch (toolCall.tool) {
      case "maigret_search": {
        await ctx.runMutation(api.investigations.addStep, {
          investigationId,
          stepNumber,
          action: `Running intelligent OSINT search for "${toolCall.args.username}" — searching 3,000+ sites, extracting leads via AI, following connections`,
          tool: "maigret",
        });
        const investigateResult = await ctx.runAction(internal.tools.maigret.investigate, {
          username: toolCall.args.username as string,
          targetName: investigation.targetName || undefined,
          targetDescription: investigation.targetDescription || undefined,
        });

        const formattedResult = formatInvestigationForOpus(investigateResult);

        if (investigateResult.leads_extracted?.length > 0) {
          for (const lead of investigateResult.leads_extracted.slice(0, 5)) {
            await ctx.runMutation(api.investigations.addFinding, {
              investigationId,
              source: "maigret",
              category: "connection",
              platform: lead.platform || undefined,
              data: `Lead extracted: @${lead.username}${lead.platform ? ` on ${lead.platform}` : ""} — ${lead.reason}`,
              confidence: 70,
            });
          }
        }

        // Persist graph edges from connection graph
        if (investigateResult.lead_graph?.length > 0) {
          const edges = investigateResult.lead_graph.slice(0, 20).map((edge: { from: string; to: string; platform?: string; reason: string }) => ({
            investigationId,
            fromLabel: `@${edge.from}`,
            toLabel: `@${edge.to}`,
            fromType: "person",
            toType: "profile",
            edgeType: "found_via" as const,
            platform: edge.platform || undefined,
            reason: edge.reason,
            confidence: 70,
          }));
          await ctx.runMutation(api.graphEdges.addEdges, { edges });
        }

        if (investigateResult.llm_analysis) {
          await ctx.runMutation(api.investigations.addStep, {
            investigationId,
            stepNumber,
            action: `AI Lead Analysis: ${investigateResult.llm_analysis.slice(0, 500)}`,
            tool: "reasoning",
          });
        }
        return formattedResult;
      }

      case "browser_action": {
        await ctx.runMutation(api.investigations.addStep, {
          investigationId,
          stepNumber,
          action: `Browser: ${(toolCall.args.instruction as string).slice(0, 200)}`,
          tool: "browser_action",
        });

        const freshInvestigation = await ctx.runQuery(api.investigations.get, { id: investigationId });
        const sessionId = freshInvestigation?.browserSessionId ?? undefined;

        const browserResult = await ctx.runAction(internal.tools.browserUse.runTask, {
          task: toolCall.args.instruction as string,
          sessionId,
          investigationId,
          extremeMode: params.extremeMode,
        });

        const toolResult = browserResult?.output ?? JSON.stringify(browserResult);

        // v3: runTask returns sessionId + liveUrl directly — always update
        if (browserResult?.sessionId) {
          await ctx.runMutation(api.investigations.updateBrowserSession, {
            id: investigationId,
            browserSessionId: browserResult.sessionId,
            browserLiveUrl: browserResult.liveUrl,
          });
        }
        return toolResult;
      }

      case "web_search": {
        await ctx.runMutation(api.investigations.addStep, {
          investigationId,
          stepNumber,
          action: `Web search: "${(toolCall.args.query as string).slice(0, 200)}"`,
          tool: "web_search",
        });
        const searchResult = await ctx.runAction(internal.tools.braveSearch.search, {
          query: toolCall.args.query as string,
          count: toolCall.args.count as number | undefined,
        });
        return JSON.stringify(searchResult);
      }

      case "geospy_predict": {
        await ctx.runMutation(api.investigations.addStep, {
          investigationId,
          stepNumber,
          action: `GeoSpy: Geolocating image from ${(toolCall.args.imageUrl as string).slice(0, 100)}`,
          tool: "geospy",
        });
        const geoResult = await ctx.runAction(internal.tools.geoSpy.predict, {
          imageUrl: toolCall.args.imageUrl as string,
        });
        // Auto-save location finding with coordinates
        if (geoResult.city || geoResult.country) {
          const locationParts = [geoResult.city, geoResult.state, geoResult.country].filter(Boolean);
          await ctx.runMutation(api.investigations.addFinding, {
            investigationId,
            source: "geospy",
            category: "location",
            data: `Photo geolocated to ${locationParts.join(", ")} (${geoResult.latitude}, ${geoResult.longitude}). ${geoResult.explanation || ""}`,
            confidence: 70,
            latitude: typeof geoResult.latitude === "number" ? geoResult.latitude : undefined,
            longitude: typeof geoResult.longitude === "number" ? geoResult.longitude : undefined,
          });
        }
        return JSON.stringify(geoResult);
      }

      case "geo_locate": {
        await ctx.runMutation(api.investigations.addStep, {
          investigationId,
          stepNumber,
          action: `Running Picarta AI geolocation on image`,
          tool: "geo_locate",
        });
        const picartaResult = await ctx.runAction(internal.tools.picarta.localize, {
          imageUrl: toolCall.args.imageUrl as string,
        });
        // Auto-save location finding if we got coordinates
        if (picartaResult.latitude && picartaResult.longitude) {
          const locationParts = [picartaResult.city, picartaResult.province, picartaResult.country].filter(Boolean);
          const conf = picartaResult.confidence ? Math.round(picartaResult.confidence * 100) : 60;
          await ctx.runMutation(api.investigations.addFinding, {
            investigationId,
            source: "picarta",
            category: "location",
            platform: "picarta",
            data: `Photo geo-located to ${locationParts.join(", ")} (${picartaResult.latitude}, ${picartaResult.longitude}). Confidence: ${conf}%${picartaResult.exifCountry ? `. EXIF confirms: ${picartaResult.exifCountry}` : ""}`,
            confidence: conf,
          });
        }
        return JSON.stringify(picartaResult);
      }

      case "whitepages_lookup": {
        await ctx.runMutation(api.investigations.addStep, {
          investigationId,
          stepNumber,
          action: `WhitePages: Looking up ${toolCall.args.name || toolCall.args.phone || "target"}`,
          tool: "whitepages",
        });
        const wpResult = await ctx.runAction(internal.tools.whitePages.findPerson, {
          name: toolCall.args.name as string | undefined,
          phone: toolCall.args.phone as string | undefined,
          city: toolCall.args.city as string | undefined,
          stateCode: toolCall.args.stateCode as string | undefined,
        });
        // Auto-save location findings with lat/lng from address data
        if (wpResult.results && Array.isArray(wpResult.results)) {
          for (const person of wpResult.results.slice(0, 3)) {
            if (person.addresses && Array.isArray(person.addresses)) {
              for (const addr of person.addresses.slice(0, 2)) {
                if (addr.city || addr.state) {
                  await ctx.runMutation(api.investigations.addFinding, {
                    investigationId,
                    source: "whitepages",
                    category: "location",
                    data: `Address: ${addr.address || ""} ${addr.city || ""}, ${addr.state || ""} ${addr.zip || ""}`.trim(),
                    confidence: 65,
                    latitude: typeof addr.lat === "number" ? addr.lat : undefined,
                    longitude: typeof addr.lng === "number" ? addr.lng : undefined,
                  });
                }
              }
            }
          }
        }
        return JSON.stringify(wpResult);
      }

      case "reverse_image_search": {
        await ctx.runMutation(api.investigations.addStep, {
          investigationId,
          stepNumber,
          action: `Reverse Image Search: ${(toolCall.args.imageUrl as string).slice(0, 100)}`,
          tool: "reverse_image",
        });
        const risResult = await ctx.runAction(internal.tools.reverseImageSearch.search, {
          imageUrl: toolCall.args.imageUrl as string,
        });
        // Auto-save top 3 visual matches as social findings
        if (risResult.visualMatches && risResult.visualMatches.length > 0) {
          for (const match of risResult.visualMatches.slice(0, 3)) {
            if (match.title && match.url) {
              await ctx.runMutation(api.investigations.addFinding, {
                investigationId,
                source: "reverse_image_search",
                category: "social",
                platform: match.source || undefined,
                profileUrl: match.url || undefined,
                data: `Image found on: ${match.title} (${match.source || "unknown source"})`,
                confidence: 60,
              });
            }
          }
        }
        // Auto-save knowledge graph as identity finding
        if (risResult.knowledgeGraph?.title) {
          await ctx.runMutation(api.investigations.addFinding, {
            investigationId,
            source: "reverse_image_search",
            category: "identity",
            profileUrl: risResult.knowledgeGraph.link || undefined,
            data: `Identified via reverse image: ${risResult.knowledgeGraph.title}${risResult.knowledgeGraph.subtitle ? ` — ${risResult.knowledgeGraph.subtitle}` : ""}${risResult.knowledgeGraph.description ? `. ${risResult.knowledgeGraph.description}` : ""}`,
            confidence: 75,
          });
        }
        return JSON.stringify(risResult);
      }

      case "darkweb_search": {
        await ctx.runMutation(api.investigations.addStep, {
          investigationId,
          stepNumber,
          action: `Dark Web Search: "${(toolCall.args.term as string).slice(0, 100)}"`,
          tool: "darkweb",
        });
        const dwResult = await ctx.runAction(internal.tools.intelx.search, {
          term: toolCall.args.term as string,
          maxResults: toolCall.args.maxResults as number | undefined,
        });
        // Auto-save summary if records found
        if (dwResult.results && dwResult.results.length > 0) {
          const buckets = [...new Set(dwResult.results.map((r: { bucket: string | null }) => r.bucket).filter(Boolean))];
          await ctx.runMutation(api.investigations.addFinding, {
            investigationId,
            source: "darkweb_search",
            category: "identity",
            data: `Dark web/leak search for "${dwResult.term}": ${dwResult.totalResults} records found across ${buckets.length} source(s)${buckets.length > 0 ? ` (${buckets.slice(0, 5).join(", ")})` : ""}`,
            confidence: 65,
          });
        }
        return JSON.stringify(dwResult);
      }

      case "save_finding": {
        const findingArgs = toolCall.args as {
          source: string;
          category: string;
          platform?: string;
          profileUrl?: string;
          imageUrl?: string;
          data: string;
          confidence: number;
        };
        await ctx.runMutation(api.investigations.addFinding, {
          investigationId,
          source: findingArgs.source,
          category: findingArgs.category,
          platform: findingArgs.platform,
          profileUrl: findingArgs.profileUrl,
          imageUrl: findingArgs.imageUrl,
          data: findingArgs.data,
          confidence: findingArgs.confidence,
        });
        // Create implicit edge: target → finding entity
        const entityLabel = findingArgs.platform
          ? `${findingArgs.platform}: ${findingArgs.data.slice(0, 40)}`
          : findingArgs.data.slice(0, 50);
        const entityType = findingArgs.category === "location" ? "location"
          : findingArgs.category === "social" ? "profile"
          : findingArgs.category === "connection" ? "person"
          : "profile";
        await ctx.runMutation(api.graphEdges.addEdge, {
          investigationId,
          fromLabel: investigation.targetName,
          toLabel: entityLabel,
          fromType: "person",
          toType: entityType,
          edgeType: findingArgs.category === "location" ? "located_at" : "found_via",
          platform: findingArgs.platform || undefined,
          reason: findingArgs.source,
          confidence: findingArgs.confidence,
        });
        await ctx.runMutation(api.investigations.addStep, {
          investigationId,
          stepNumber,
          action: `Saved finding: ${findingArgs.data.slice(0, 200)}`,
          tool: "save_finding",
        });
        return "Finding saved successfully.";
      }

      default:
        return `Unknown tool: ${toolCall.tool}`;
    }
  } catch (error) {
    return `Tool error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

interface CompressionResult {
  history: Array<Record<string, unknown>>;
  compressionTokens?: { input: number; output: number };
}

async function compressHistory(
  conversationHistory: Array<Record<string, unknown>>
): Promise<CompressionResult> {
  // Early return for small histories — skip serialization entirely
  if (conversationHistory.length < 6) {
    return { history: conversationHistory };
  }

  const serialized = JSON.stringify(conversationHistory);
  const tokens = estimateTokens(serialized);

  // If already compressed, raise threshold to avoid thrashing
  const alreadyCompressed =
    typeof conversationHistory[0]?.content === "string" &&
    (conversationHistory[0].content as string).includes("[INVESTIGATION PROGRESS");
  const effectiveThreshold = alreadyCompressed
    ? COMPRESSION_TOKEN_THRESHOLD * 1.3
    : COMPRESSION_TOKEN_THRESHOLD;

  if (tokens <= effectiveThreshold) {
    return { history: conversationHistory };
  }

  // Each exchange = 2 messages (assistant + user/tool_result), starting at index 1
  const keepCount = KEEP_RECENT_EXCHANGES * 2;
  let cutoffIndex = Math.max(1, conversationHistory.length - keepCount);
  // Ensure cutoff falls on an exchange boundary (odd index = assistant start)
  if (cutoffIndex % 2 === 0) cutoffIndex--;
  if (cutoffIndex <= 1) return { history: conversationHistory };

  const originalMessage = conversationHistory[0];
  const messagesToSummarize = conversationHistory.slice(1, cutoffIndex);
  const recentMessages = conversationHistory.slice(cutoffIndex);

  const summaryInput = messagesToSummarize
    .map((msg) => {
      const role = msg.role as string;
      if (role === "assistant") {
        const content = msg.content as Array<{ type: string; text?: string; name?: string; input?: unknown }>;
        const text = content?.find((b) => b.type === "text")?.text || "";
        const toolUses = content?.filter((b) => b.type === "tool_use") || [];
        const toolSummary = toolUses
          .map((t) => `${t.name}(${JSON.stringify(t.input).slice(0, 200)})`)
          .join(", ");
        return `[Assistant] ${text.slice(0, 500)}${toolSummary ? `\nTools called: ${toolSummary}` : ""}`;
      } else if (role === "user") {
        const content = msg.content;
        if (Array.isArray(content)) {
          const results = (content as Array<{ type: string; content?: string }>)
            .filter((b) => b.type === "tool_result")
            .map((b) => (b.content || "").slice(0, 1000))
            .join("\n");
          return `[Tool results] ${results}`;
        }
        return `[User] ${String(content).slice(0, 500)}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { history: conversationHistory };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `You are summarizing the progress of an OSINT investigation. The investigator needs this summary to continue making good decisions.

Summarize the following investigation steps concisely. Include:
1. **Tools used & results**: What was searched and key data points found
2. **Confirmed findings**: Social profiles, identities, connections discovered
3. **Leads identified**: Usernames, platforms, connections worth exploring
4. **What's been explored**: So the investigator doesn't repeat work
5. **Dead ends**: Anything tried that yielded nothing

Be concise but preserve all actionable intelligence. No raw tool output — only meaningful findings and conclusions.

Steps to summarize:
${summaryInput}`,
        }],
      }),
    });

    if (!response.ok) {
      console.warn("History compression API call failed, using uncompressed history");
      return { history: conversationHistory };
    }

    const data = await response.json();
    const summary = data.content?.find((b: { type: string }) => b.type === "text")?.text || "";

    if (!summary) {
      console.warn("History compression returned empty summary, using uncompressed history");
      return { history: conversationHistory };
    }

    // Ensure recentMessages starts with an assistant message for valid alternation
    // (compressed user summary + assistant response + user tool_result + ...)
    if (recentMessages.length > 0 && recentMessages[0].role !== "assistant") {
      // Shift cutoff back by one to capture the preceding assistant message
      const adjustedCutoff = cutoffIndex - 1;
      if (adjustedCutoff <= 1) return { history: conversationHistory };
      const adjustedRecent = conversationHistory.slice(adjustedCutoff);
      const adjustedSummarize = conversationHistory.slice(1, adjustedCutoff);
      if (adjustedRecent[0]?.role !== "assistant") {
        console.warn("Cannot ensure assistant-first alternation after compression, skipping");
        return { history: conversationHistory };
      }
      // Use adjusted slices
      return {
        history: [
          {
            role: "user",
            content: `${originalMessage.content as string}\n\n---\n\n[INVESTIGATION PROGRESS — Steps 1-${Math.floor(adjustedCutoff / 2)} compressed]\n\n${summary}\n\n[End of progress summary. Recent steps follow.]`,
          },
          ...adjustedRecent,
        ],
        compressionTokens: data.usage
          ? { input: data.usage.input_tokens ?? 0, output: data.usage.output_tokens ?? 0 }
          : undefined,
      };
    }

    const compressedHistory: Array<Record<string, unknown>> = [
      {
        role: "user",
        content: `${originalMessage.content as string}\n\n---\n\n[INVESTIGATION PROGRESS — Steps 1-${Math.floor(cutoffIndex / 2)} compressed]\n\n${summary}\n\n[End of progress summary. Recent steps follow.]`,
      },
      ...recentMessages,
    ];

    const compressedSize = estimateTokens(JSON.stringify(compressedHistory));
    console.log(
      `History compressed: ${tokens} tokens -> ${compressedSize} tokens (${messagesToSummarize.length} messages summarized, ${recentMessages.length} kept)`
    );

    return {
      history: compressedHistory,
      compressionTokens: data.usage
        ? { input: data.usage.input_tokens ?? 0, output: data.usage.output_tokens ?? 0 }
        : undefined,
    };
  } catch (error) {
    console.warn("History compression failed, using uncompressed:", error);
    return { history: conversationHistory };
  }
}

async function generateReport(
  ctx: Pick<ActionCtx, "runQuery" | "runMutation" | "runAction">,
  investigationId: Id<"investigations">
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const investigation = await ctx.runQuery(api.investigations.get, { id: investigationId });

  const findings = await ctx.runQuery(api.investigations.getFindings, { investigationId });

  const steps = await ctx.runQuery(api.investigations.getSteps, { investigationId });

  const stepsContext = steps
    .map(
      (s: { stepNumber: number; tool: string; action: string; result?: string }) =>
        `Step ${s.stepNumber} [${s.tool}]: ${s.action}${s.result ? `\nResult: ${s.result}` : ""}`
    )
    .join("\n\n");

  const findingsContext = findings
    .map(
      (f: { category: string; data: string; confidence: number; source: string; platform?: string }) =>
        `- [${f.category}] ${f.data} (confidence: ${f.confidence}%, source: ${f.source}${f.platform ? `, platform: ${f.platform}` : ""})`
    )
    .join("\n");

  // Run report generation (Opus) and behavioral analysis (Sonnet) in parallel
  const apiHeaders = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };

  const reportPromise = fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: apiHeaders,
    body: JSON.stringify({
      model: "claude-opus-4-20250514",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `You are writing the final report for an investigation.

Target: ${investigation?.targetName || "Unknown"}
${investigation?.targetDescription ? `Description: ${investigation.targetDescription}` : ""}

## Investigation Steps Taken
${stepsContext}

## Confirmed Findings
${findingsContext}

Generate a comprehensive detective report. Include:
1. Subject Profile (name, known info, confirmed identities)
2. Digital Footprint (all confirmed social profiles)
3. Connections (people identified through photos, tags, interactions)
4. Recent Activity (last known online activity, locations mentioned)
5. Key Evidence (most important findings with confidence scores)
6. Recommendations (suggested next steps for further investigation)

Format as markdown. Be thorough and professional.`,
      }],
    }),
  });

  const behavioralPromise = fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: apiHeaders,
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `You are a behavioral analyst. Analyze the following OSINT investigation findings and extract behavioral patterns.

Target: ${investigation?.targetName || "Unknown"}
${investigation?.targetDescription ? `Description: ${investigation.targetDescription}` : ""}

## Findings
${findingsContext}

Respond with ONLY a valid JSON object (no markdown, no code fences) with these fields:
{
  "timezoneEstimate": "Best guess timezone based on activity patterns (e.g. 'UTC-5 / Eastern US')",
  "usernamePatterns": ["List of username mutation patterns observed (e.g. 'firstname_lastname', 'firstnamelastinitial')"],
  "predictedHandles": ["Predicted handles on platforms not yet found, based on username patterns"],
  "interestClusters": ["Groups of interests/topics based on profile bios, follows, and activity"],
  "platformAgeEstimation": "Estimated time period the person has been active online",
  "behavioralNotes": ["Key behavioral observations — posting frequency, content type preferences, engagement patterns, privacy level"]
}

If you cannot determine a field, use null or an empty array. Base analysis ONLY on the provided findings.`,
      }],
    }),
  });

  const [reportResult, behavioralResult] = await Promise.allSettled([reportPromise, behavioralPromise]);

  // Handle report result
  if (reportResult.status === "rejected" || (reportResult.status === "fulfilled" && !reportResult.value.ok)) {
    const errText = reportResult.status === "fulfilled" ? await reportResult.value.text() : reportResult.reason;
    console.error("Report generation API error:", errText);
    await cleanupBrowserSession(ctx, investigationId);
    await ctx.runMutation(api.investigations.updateStatus, {
      id: investigationId,
      status: "failed",
      errorMessage: `Report generation failed: ${String(errText).slice(0, 500)}`,
    });
    return;
  }

  const reportData = await reportResult.value.json();

  if (reportData.usage) {
    await ctx.runMutation(api.investigations.updateTokenUsage, {
      id: investigationId,
      inputTokens: reportData.usage.input_tokens ?? 0,
      outputTokens: reportData.usage.output_tokens ?? 0,
    });
  }

  const report = reportData.content.find((b: { type: string }) => b.type === "text")?.text || "";

  // Handle behavioral analysis result (non-critical — don't fail on error)
  if (behavioralResult.status === "fulfilled" && behavioralResult.value.ok) {
    try {
      const behavioralData = await behavioralResult.value.json();
      if (behavioralData.usage) {
        await ctx.runMutation(api.investigations.updateTokenUsage, {
          id: investigationId,
          inputTokens: behavioralData.usage.input_tokens ?? 0,
          outputTokens: behavioralData.usage.output_tokens ?? 0,
          model: "claude-sonnet-4-20250514",
        });
      }
      const behavioralText = behavioralData.content?.find((b: { type: string }) => b.type === "text")?.text || "";
      if (behavioralText) {
        await ctx.runMutation(api.investigations.updateBehavioralAnalysis, {
          id: investigationId,
          behavioralAnalysis: behavioralText,
        });
      }
    } catch (e) {
      console.warn("Behavioral analysis parsing failed (non-critical):", e);
    }
  } else {
    console.warn("Behavioral analysis failed (non-critical):", behavioralResult.status === "rejected" ? behavioralResult.reason : "API error");
  }

  await ctx.runMutation(api.investigations.updateReport, {
    id: investigationId,
    report,
    confidence: calculateOverallConfidence(findings),
  });

  await cleanupBrowserSession(ctx, investigationId);

  await ctx.runMutation(api.investigations.updateStatus, { id: investigationId, status: "complete" });
}

function formatInvestigationForOpus(result: {
  primary_username: string;
  primary_profiles: Record<string, Record<string, unknown>>;
  leads_extracted: Array<{ username: string; platform?: string; reason: string }>;
  lead_profiles: Record<string, Record<string, Record<string, unknown>>>;
  lead_graph: Array<{ from: string; to: string; platform?: string; reason: string }>;
  llm_analysis: string;
  total_profiles: number;
  error?: string;
}): string {
  const sections: string[] = [];

  sections.push(`=== OSINT Investigation: @${result.primary_username} ===`);
  sections.push(`Total profiles found: ${result.total_profiles}`);
  if (result.error) sections.push(`⚠ Error: ${result.error}`);

  sections.push(`\n--- Primary Profiles (username: ${result.primary_username}) ---`);
  for (const [site, profile] of Object.entries(result.primary_profiles)) {
    const p = profile as Record<string, unknown>;
    const details: string[] = [`${(p.site_name as string) || site}: ${p.url as string}`];
    if (p.fullname) details.push(`  Name: ${p.fullname}`);
    if (p.bio) details.push(`  Bio: ${p.bio}`);
    if (p.location) details.push(`  Location: ${p.location}`);
    if (p.is_company) details.push(`  Company: ${p.is_company}`);
    if (p.image) details.push(`  Avatar: ${p.image}`);
    if (p.created_at) details.push(`  Joined: ${p.created_at}`);
    if (p.follower_count) details.push(`  Followers: ${p.follower_count}`);
    if (p.following_count) details.push(`  Following: ${p.following_count}`);
    sections.push(details.join("\n"));
  }

  if (result.llm_analysis) {
    sections.push(`\n--- AI Analysis ---`);
    sections.push(result.llm_analysis);
  }

  if (result.leads_extracted.length > 0) {
    sections.push(`\n--- Extracted Leads (${result.leads_extracted.length} found) ---`);
    for (const lead of result.leads_extracted) {
      sections.push(`• @${lead.username}${lead.platform ? ` (${lead.platform})` : ""} — ${lead.reason}`);
    }
  }

  const leadUsernames = Object.keys(result.lead_profiles);
  if (leadUsernames.length > 0) {
    sections.push(`\n--- Lead Search Results ---`);
    for (const [leadUsername, profiles] of Object.entries(result.lead_profiles)) {
      const profileCount = Object.keys(profiles).length;
      sections.push(`\n@${leadUsername} → ${profileCount} profiles found:`);
      for (const [site, profile] of Object.entries(profiles)) {
        const p = profile as Record<string, unknown>;
        const line = [`  ${(p.site_name as string) || site}: ${p.url as string}`];
        if (p.fullname) line.push(`(${p.fullname})`);
        if (p.bio) line.push(`— "${(p.bio as string).slice(0, 100)}"`);
        sections.push(line.join(" "));
      }
    }
  }

  if (result.lead_graph.length > 0) {
    sections.push(`\n--- Connection Graph ---`);
    for (const edge of result.lead_graph) {
      sections.push(`@${edge.from} → @${edge.to}${edge.platform ? ` [${edge.platform}]` : ""}: ${edge.reason}`);
    }
  }

  return sections.join("\n");
}

async function cleanupBrowserSession(
  ctx: Pick<ActionCtx, "runQuery" | "runMutation" | "runAction">,
  investigationId: Id<"investigations">
) {
  try {
    const investigation = await ctx.runQuery(api.investigations.get, { id: investigationId });
    if (investigation?.browserSessionId) {
      await ctx.runAction(internal.tools.browserUse.stopSession, {
        sessionId: investigation.browserSessionId,
      });
      await ctx.runMutation(api.investigations.updateBrowserSession, {
        id: investigationId,
        browserSessionId: undefined,
        browserLiveUrl: undefined,
      });
    }
  } catch (e) {
    console.warn("Browser session cleanup failed (best-effort):", e);
  }
}

function calculateOverallConfidence(findings: { confidence: number }[]): number {
  if (findings.length === 0) return 0;
  const sum = findings.reduce((acc, f) => acc + f.confidence, 0);
  return Math.round(sum / findings.length);
}

export const resumeFromClarification = action({
  args: { clarificationId: v.id("clarifications") },
  handler: async (ctx, args) => {
    const clar = await ctx.runQuery(api.investigations.getClarification, { id: args.clarificationId });
    if (!clar || clar.status !== "answered") return;

    const frozenHistory = JSON.parse(clar.conversationHistory);
    const lastAssistant = frozenHistory[frozenHistory.length - 1];

    const toolResultBlocks = lastAssistant.content
      .filter((b: { type: string }) => b.type === "tool_use")
      .map((b: { type: string; id: string; name: string }) => {
        if (b.name === "ask_user") {
          return { type: "tool_result", tool_use_id: b.id, content: `User answered: "${clar.response}"` };
        }
        return { type: "tool_result", tool_use_id: b.id, content: "Skipped — paused for user clarification" };
      });

    const resumedHistory = [
      ...frozenHistory,
      { role: "user", content: toolResultBlocks },
    ];

    await ctx.runMutation(api.investigations.updateStatus, {
      id: clar.investigationId,
      status: "investigating",
    });

    await ctx.scheduler.runAfter(0, internal.orchestrator.step, {
      investigationId: clar.investigationId,
      conversationHistory: JSON.stringify(resumedHistory),
      consecutiveSaveOnlySteps: clar.consecutiveSaveOnlySteps,
      maigretAvailable: clar.maigretAvailable,
      extremeMode: clar.extremeMode,
    });
  },
});
