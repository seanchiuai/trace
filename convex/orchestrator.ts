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

function buildSystemPrompt(maigretAvailable: boolean): string {
  const toolLines: string[] = [];
  let n = 1;
  if (maigretAvailable) {
    toolLines.push(
      `${n++}. maigret_search(username) — Intelligent OSINT: searches 3,000+ sites for the username, then an AI reads all profile bios/metadata to extract REAL connected handles (e.g. "X: @handle" in a Telegram bio, GitHub profile linking to Twitter, etc.), and automatically searches those leads too. Returns primary profiles, AI-extracted leads with reasoning, lead search results, and a connection graph. One call gives you a deep web of connected accounts — not just the primary username.`
    );
  }
  toolLines.push(
    `${n++}. browser_action(instruction) — Control a web browser. Give clear instructions like "Go to instagram.com/username and report what you see." Returns screenshots and page text. Use for interactive pages that require login walls, scrolling, or JS rendering. EXPENSIVE — prefer web_search for simple lookups.`,
    `${n++}. face_check(imageUrl) — Run facial recognition on an image. Returns matching profiles with confidence scores. Use on group photos or profile pictures.`,
    `${n++}. web_search(query, count?) — Fast web search. Returns titles, URLs, and snippets. Use this FIRST for simple lookups like "John Smith LinkedIn", "username site:twitter.com", company info, news articles, etc. Much faster and cheaper than browser_action.`,
    `${n++}. save_finding(source, category, platform, data, confidence) — Save a confirmed finding. Categories: "social", "connection", "location", "activity", "identity". FREE — does not count toward your step budget. Save findings liberally as you discover them.`,
    `${n++}. done(report) — End the investigation and generate the final report.`
  );

  const strategyBullets: string[] = [
    `- Look at the available info summary to decide your first move:`,
    ...(maigretAvailable
      ? [`  - Username known → start with maigret_search to cast a wide OSINT net`]
      : []),
    `  - Only a name → use web_search to find usernames, profiles, and leads first`,
    `  - Photo available → consider face_check early to find visual matches`,
    `  - Social links provided → explore those profiles directly (web_search or browser_action)`,
    `  - Phone number → search it via web_search`,
    `- Consider the target type and pick platforms accordingly:`,
    `  - Younger person → prioritize TikTok, Instagram, Snapchat, Discord`,
    `  - Professional → prioritize LinkedIn, GitHub, company pages`,
    `  - Founder/entrepreneur → check Crunchbase, AngelList, press coverage`,
    `  - General → cast a wide net across major platforms`,
    `- Use web_search for simple lookups; reserve browser_action for pages that need interaction`,
    `- Save findings as you go (it's free — doesn't burn steps)`,
    `- You can call multiple tools at once — do so when actions are independent`,
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
          description: 'What to do in the browser, e.g. "Go to instagram.com/johndoe and describe what you see"',
        },
      },
      required: ["instruction"],
    },
  },
  {
    name: "face_check",
    description: "Run facial recognition on an image URL. Returns matching profiles with confidence scores.",
    input_schema: {
      type: "object",
      properties: {
        imageUrl: { type: "string", description: "URL of the image to search faces in" },
      },
      required: ["imageUrl"],
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
    name: "save_finding",
    description: "Save a confirmed finding from the investigation. FREE — does not count toward your step budget.",
    input_schema: {
      type: "object",
      properties: {
        source: { type: "string", description: 'Where this finding came from: "instagram", "facecheck", "maigret", "browser", "web_search", etc.' },
        category: { type: "string", enum: ["social", "connection", "location", "activity", "identity"] },
        platform: { type: "string", description: "Platform name" },
        profileUrl: { type: "string", description: "URL if applicable" },
        data: { type: "string", description: "Description of the finding" },
        confidence: { type: "number", description: "Confidence 0-100" },
      },
      required: ["source", "category", "data", "confidence"],
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

    // Eagerly create a browser session so the live URL appears in the UI immediately.
    // Non-blocking: if this fails, runTask will auto-create a session later.
    try {
      const session = await ctx.runAction(internal.tools.browserUse.createSession, {});
      if (session?.id && session?.liveUrl) {
        await ctx.runMutation(api.investigations.updateBrowserSession, {
          id: args.investigationId,
          browserSessionId: session.id,
          browserLiveUrl: session.liveUrl,
        });
      }
    } catch (e) {
      console.warn("Eager browser session creation failed (non-blocking):", e);
    }

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

    await ctx.scheduler.runAfter(0, internal.orchestrator.step, {
      investigationId: args.investigationId,
      conversationHistory: JSON.stringify([{
        role: "user",
        content: `Investigate this person.\n\nAvailable info summary:\n${infoLines.join("\n")}\n\nBegin your investigation. Adapt your strategy to the available information — what's your first move?`,
      }]),
      consecutiveSaveOnlySteps: 0,
      maigretAvailable,
    });
  },
});

export const step = internalAction({
  args: {
    investigationId: v.id("investigations"),
    conversationHistory: v.string(),
    consecutiveSaveOnlySteps: v.optional(v.number()),
    maigretAvailable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const investigation = await ctx.runQuery(api.investigations.get, { id: args.investigationId });
    if (!investigation) return;
    if (investigation.status === "complete" || investigation.status === "failed") return;
    if (investigation.stepCount >= MAX_STEPS) {
      await generateReport(ctx, args.investigationId);
      return;
    }

    const conversationHistory = JSON.parse(args.conversationHistory);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const maigretAvailable = args.maigretAvailable ?? false;
    const tools = maigretAvailable
      ? TOOL_DEFINITIONS
      : TOOL_DEFINITIONS.filter((t) => t.name !== "maigret_search");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 2048,
        system: buildSystemPrompt(maigretAvailable),
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

    if (reasoning) {
      await ctx.runMutation(api.investigations.addStep, {
        investigationId: args.investigationId,
        stepNumber,
        action: reasoning.slice(0, 500),
        tool: "reasoning",
      });
    }

    if (toolCalls.length === 0) {
      await generateReport(ctx, args.investigationId);
      return;
    }

    if (toolCalls.find((tc) => tc.tool === "done")) {
      await generateReport(ctx, args.investigationId);
      return;
    }

    const toolResults: { id: string; tool: string; result: string }[] = [];
    let hasNonSaveFinding = false;

    for (const tc of toolCalls) {
      if (tc.tool !== "save_finding") hasNonSaveFinding = true;
      const result = await executeToolCall(ctx, {
        investigationId: args.investigationId,
        investigation,
        toolCall: tc,
        stepNumber,
      });
      toolResults.push({ id: tc.id, tool: tc.tool, result });
    }

    let consecutiveSaveOnly = args.consecutiveSaveOnlySteps ?? 0;
    if (hasNonSaveFinding) {
      await ctx.runMutation(api.investigations.incrementStep, { id: args.investigationId });
      consecutiveSaveOnly = 0;
    } else {
      consecutiveSaveOnly++;
      // After N consecutive save-only steps, force an increment to prevent runaway loops
      if (consecutiveSaveOnly >= MAX_CONSECUTIVE_SAVE_ONLY) {
        await ctx.runMutation(api.investigations.incrementStep, { id: args.investigationId });
        consecutiveSaveOnly = 0;
      }
    }

    for (const tr of toolResults) {
      await ctx.runMutation(api.investigations.addStep, {
        investigationId: args.investigationId,
        stepNumber,
        action: `Result from ${tr.tool}`,
        tool: tr.tool,
        result: tr.result.slice(0, 2000),
      });
    }

    const toolResultBlocks = toolResults.map((tr) => ({
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
      });
    }

    await ctx.scheduler.runAfter(0, internal.orchestrator.step, {
      investigationId: args.investigationId,
      conversationHistory: JSON.stringify(finalHistory),
      consecutiveSaveOnlySteps: consecutiveSaveOnly,
      maigretAvailable,
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

        let browserResult;
        try {
          browserResult = await ctx.runAction(internal.tools.browserUse.runTask, {
            task: toolCall.args.instruction as string,
            sessionId,
          });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          if (errMsg.includes("BROWSER_TASK_CREATION_FAILED:400") && sessionId) {
            console.warn("Browser session expired, creating fresh session...");
            try {
              const newSession = await ctx.runAction(internal.tools.browserUse.createSession, {});
              if (newSession?.id) {
                await ctx.runMutation(api.investigations.updateBrowserSession, {
                  id: investigationId,
                  browserSessionId: newSession.id,
                  browserLiveUrl: newSession.liveUrl,
                });
              }
              browserResult = await ctx.runAction(internal.tools.browserUse.runTask, {
                task: toolCall.args.instruction as string,
                sessionId: newSession?.id,
              });
            } catch (retryError) {
              return `Tool error (browser retry failed): ${retryError instanceof Error ? retryError.message : String(retryError)}`;
            }
          } else {
            throw error;
          }
        }

        const toolResult = browserResult?.output ?? JSON.stringify(browserResult);

        if (!sessionId && browserResult?.sessionId) {
          try {
            const session = await ctx.runAction(internal.tools.browserUse.getSession, {
              sessionId: browserResult.sessionId,
            });
            await ctx.runMutation(api.investigations.updateBrowserSession, {
              id: investigationId,
              browserSessionId: browserResult.sessionId,
              browserLiveUrl: session?.liveUrl,
            });
          } catch {
            await ctx.runMutation(api.investigations.updateBrowserSession, {
              id: investigationId,
              browserSessionId: browserResult.sessionId,
            });
          }
        }
        return toolResult;
      }

      case "face_check": {
        await ctx.runMutation(api.investigations.addStep, {
          investigationId,
          stepNumber,
          action: `Running face recognition on image`,
          tool: "face_check",
        });
        const faceResult = await ctx.runAction(internal.tools.faceCheck.searchByImage, {
          imageUrl: toolCall.args.imageUrl as string,
        });
        return JSON.stringify(faceResult);
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

      case "save_finding": {
        const findingArgs = toolCall.args as {
          source: string;
          category: string;
          platform?: string;
          profileUrl?: string;
          data: string;
          confidence: number;
        };
        await ctx.runMutation(api.investigations.addFinding, {
          investigationId,
          source: findingArgs.source,
          category: findingArgs.category,
          platform: findingArgs.platform,
          profileUrl: findingArgs.profileUrl,
          data: findingArgs.data,
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
  const serialized = JSON.stringify(conversationHistory);
  const tokens = estimateTokens(serialized);

  // If already compressed, raise threshold to avoid thrashing
  const alreadyCompressed =
    typeof conversationHistory[0]?.content === "string" &&
    (conversationHistory[0].content as string).includes("[INVESTIGATION PROGRESS");
  const effectiveThreshold = alreadyCompressed
    ? COMPRESSION_TOKEN_THRESHOLD * 1.3
    : COMPRESSION_TOKEN_THRESHOLD;

  if (tokens <= effectiveThreshold || conversationHistory.length < 6) {
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

    // Merge original brief + summary into one user message.
    // recentMessages[0] is always an assistant message, so alternation is valid.
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

  if (!response.ok) {
    const errText = await response.text();
    console.error("Report generation API error:", errText);
    await cleanupBrowserSession(ctx, investigationId);
    await ctx.runMutation(api.investigations.updateStatus, {
      id: investigationId,
      status: "failed",
      errorMessage: `Report generation failed (${response.status}): ${errText.slice(0, 500)}`,
    });
    return;
  }

  const data = await response.json();

  if (data.usage) {
    await ctx.runMutation(api.investigations.updateTokenUsage, {
      id: investigationId,
      inputTokens: data.usage.input_tokens ?? 0,
      outputTokens: data.usage.output_tokens ?? 0,
    });
  }

  const report = data.content.find((b: { type: string }) => b.type === "text")?.text || "";

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
