import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

const MAX_STEPS = 20;

const SYSTEM_PROMPT = `You are an expert missing persons investigator. Your mission is to LOCATE a missing individual — where they are NOW or were last seen. Every action you take should work toward answering: "Where is this person?"

You have access to these tools:
1. maigret_search(username) — Intelligent OSINT: searches 3,000+ sites for the username, extracts connected handles from profile bios/metadata, and follows those leads automatically. Returns profiles, leads, and a connection graph. Use this FIRST to cast a wide net.
2. browser_action(instruction) — Control a web browser. Give clear instructions like "Go to instagram.com/username and look for location tags, check-ins, or geo-tagged posts." Returns page text.
3. face_check(imageUrl) — Run facial recognition on an image. Returns matching profiles. Use on profile pictures to find alternate accounts.
4. save_finding(source, category, platform, data, confidence) — Save a confirmed finding. Categories: "social", "connection", "location", "activity", "identity". SAVE IMMEDIATELY when you find location data — don't wait.
5. done(report) — End the investigation and generate the final report.

PRIORITY: LOCATION DATA IS KING
- Geo-tagged posts, check-ins, tagged locations, "currently in [city]" bios
- Timestamps on recent activity (last seen online, last post date)
- Location mentions in posts, comments, stories, bios
- Friends/connections who tag or mention the person's location
- Workplace/school listed on profiles (implies city)

Strategy — BREADTH FIRST, then targeted depth:
1. START: Run maigret_search on the primary username to discover all accounts
2. TRIAGE: From the results, mentally rank leads by location-relevance:
   - HIGH: Platforms with geo-data (Instagram, Facebook, Snapchat, Strava, Swarm/Foursquare)
   - MEDIUM: Platforms with activity timestamps (Twitter/X, Telegram, Discord)
   - LOW: Code/professional platforms (GitHub, LinkedIn) — check briefly for city/employer only
3. DRILL: Browse the HIGH-priority profiles first. Look for:
   - Most recent post/story (when? where?)
   - Location tags, check-ins, tagged places
   - Bio location field, "based in", "moved to"
   - Tagged photos with identifiable landmarks
4. CONNECTIONS: Only pursue connections if they might reveal the person's location (e.g. a friend who recently posted with them, a partner's profile showing a shared location)
5. FACE CHECK: Use on profile photos to find unlisted accounts that may have location data
6. SAVE as you go — every location mention, timestamp, or geo-clue gets saved immediately

DO NOT waste steps on:
- Reading every post on a profile — scan for location clues and move on
- Following connections that won't yield location data
- Exploring platforms that have no geo-features
- Re-checking profiles you've already visited

You have 20 steps maximum. Spend them wisely — prioritize actions most likely to reveal WHERE this person is. Explain your reasoning briefly before each action.`;

const TOOLS_SCHEMA = [
  {
    name: "maigret_search",
    description:
      "Intelligent OSINT search: searches a username across 3,000+ sites, then uses AI to extract connected handles/leads from profile bios and metadata (e.g. 'X: @handle' in a Telegram bio), and automatically searches those leads too. Returns primary profiles, extracted leads with reasoning, lead profiles, and a connection graph.",
    input_schema: {
      type: "object",
      properties: {
        username: {
          type: "string",
          description: "The username to search for",
        },
      },
      required: ["username"],
    },
  },
  {
    name: "browser_action",
    description:
      "Control a web browser. Give natural language instructions. Returns screenshot and page text.",
    input_schema: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description:
            'What to do in the browser, e.g. "Go to instagram.com/johndoe and describe what you see"',
        },
      },
      required: ["instruction"],
    },
  },
  {
    name: "face_check",
    description:
      "Run facial recognition on an image URL. Returns matching profiles with confidence scores.",
    input_schema: {
      type: "object",
      properties: {
        imageUrl: {
          type: "string",
          description: "URL of the image to search faces in",
        },
      },
      required: ["imageUrl"],
    },
  },
  {
    name: "save_finding",
    description: "Save a confirmed finding from the investigation.",
    input_schema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description:
            'Where this finding came from: "instagram", "facecheck", "maigret", "browser", etc.',
        },
        category: {
          type: "string",
          enum: [
            "social",
            "connection",
            "location",
            "activity",
            "identity",
          ],
        },
        platform: { type: "string", description: "Platform name" },
        profileUrl: { type: "string", description: "URL if applicable" },
        data: {
          type: "string",
          description: "Description of the finding",
        },
        confidence: {
          type: "number",
          description: "Confidence 0-100",
        },
      },
      required: ["source", "category", "data", "confidence"],
    },
  },
  {
    name: "done",
    description:
      "End the investigation and generate the final detective report.",
    input_schema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Brief summary of all findings",
        },
      },
      required: ["summary"],
    },
  },
];

interface ToolCall {
  id: string;
  tool: string;
  args: Record<string, unknown>;
}

// --- Helpers ---

const TOOL_TIMEOUTS: Record<string, number> = {
  browser_action: 90_000,
  maigret_search: 130_000,
  face_check: 30_000,
  save_finding: 30_000,
};

async function withToolTimeout<T>(
  promise: Promise<T>,
  toolName: string,
): Promise<T> {
  const timeoutMs = TOOL_TIMEOUTS[toolName] ?? 30_000;
  let timerId: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => clearTimeout(timerId)),
    new Promise<never>((_, reject) => {
      timerId = setTimeout(
        () => reject(new Error(`${toolName} timed out after ${timeoutMs / 1000}s`)),
        timeoutMs,
      );
    }),
  ]);
}

async function callClaude(body: object): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY not set" };

  const maxRetries = 2;
  let lastError = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });

      if (response.ok) {
        const data = await response.json();
        return { ok: true, data };
      }

      lastError = await response.text();
      console.error(`Anthropic API error (attempt ${attempt + 1}):`, lastError);

      // Don't retry on 4xx client errors (except 429 rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return { ok: false, error: `Anthropic API ${response.status}: ${lastError}` };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`Anthropic fetch error (attempt ${attempt + 1}):`, lastError);
    }

    // Backoff before retry (skip after last attempt)
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  return { ok: false, error: `Anthropic API failed after ${maxRetries + 1} attempts: ${lastError}` };
}

function trimConversationHistory(
  history: Array<{ role: string; content: any }>,
): Array<{ role: string; content: any }> {
  if (history.length <= 20) return history;

  const first = history[0]; // investigation brief — always keep
  const keepLast = 12; // last 6 pairs (assistant + user)
  const tail = history.slice(-keepLast);
  const dropped = history.slice(1, history.length - keepLast);

  // Build a summary of dropped messages
  const summaryParts: string[] = [];
  for (const msg of dropped) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "text" && block.text) {
          summaryParts.push(block.text.slice(0, 150));
        } else if (block.type === "tool_use") {
          summaryParts.push(`Called ${block.name}(${JSON.stringify(block.input).slice(0, 80)})`);
        }
      }
    } else if (msg.role === "user" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "tool_result" && typeof block.content === "string") {
          summaryParts.push(`Result: ${block.content.slice(0, 150)}`);
        }
      }
    }
  }

  const summaryText = `[Previous steps summary — ${dropped.length} messages condensed]\n${summaryParts.join("\n").slice(0, 3000)}`;

  // Maintain strict user/assistant alternation required by the Anthropic API.
  // The first message is always role:user (investigation brief) and the tail
  // typically starts with role:assistant, so we insert the summary as an
  // assistant message to bridge them: user(brief) → assistant(summary) → tail.
  // If the tail happens to start with user, we merge the summary into the
  // first message of the brief instead.
  if (tail.length > 0 && tail[0].role === "assistant") {
    return [
      first,
      { role: "assistant" as const, content: summaryText },
      ...tail,
    ];
  }

  // Tail starts with user — merge summary into the investigation brief
  return [
    {
      ...first,
      content: (typeof first.content === "string" ? first.content : "") + `\n\n${summaryText}`,
    },
    ...tail,
  ];
}

function toolErrorMessage(toolName: string, error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  switch (toolName) {
    case "maigret_search":
      return `OSINT search failed: ${msg}. The sidecar may be down. Try browser_action instead.`;
    case "browser_action":
      return `Browser action failed: ${msg}. Try a simpler instruction or different URL.`;
    case "face_check":
      return `Face recognition failed: ${msg}. Ensure the image URL is publicly accessible.`;
    default:
      return `Tool ${toolName} error: ${msg}`;
  }
}

// --- Main actions ---

export const startInvestigation = action({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const investigation = await ctx.runQuery(api.investigations.get, {
      id: args.investigationId,
    });
    if (!investigation) throw new Error("Investigation not found");

    await ctx.runMutation(api.investigations.updateStatus, {
      id: args.investigationId,
      status: "investigating",
    });

    // Eagerly create a browser session so the live URL appears in the UI immediately.
    // Non-blocking: if this fails, runTask will auto-create a session later.
    try {
      const session = await ctx.runAction(
        internal.tools.browserUse.createSession,
        {}
      );
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

    // Start the orchestrator loop
    await ctx.scheduler.runAfter(0, internal.orchestrator.step, {
      investigationId: args.investigationId,
      conversationHistory: JSON.stringify([
        {
          role: "user",
          content: `Investigate this person:
Name: ${investigation.targetName}
${investigation.targetDescription ? `Description: ${investigation.targetDescription}` : ""}
${investigation.targetPhone ? `Phone: ${investigation.targetPhone}` : ""}
Known links: ${investigation.knownLinks.join(", ") || "None provided"}
${investigation.targetPhoto ? `Photo available: Yes` : "No photo provided"}

Begin your investigation. What's your first move?`,
        },
      ]),
    });
  },
});

export const step = internalAction({
  args: {
    investigationId: v.id("investigations"),
    conversationHistory: v.string(),
  },
  handler: async (ctx, args) => {
    const investigation = await ctx.runQuery(api.investigations.get, {
      id: args.investigationId,
    });
    if (!investigation) return;
    if (investigation.status === "complete" || investigation.status === "failed") return;
    if (investigation.stepCount >= MAX_STEPS) {
      await generateReport(ctx, args.investigationId, args.conversationHistory);
      return;
    }

    let conversationHistory = JSON.parse(args.conversationHistory);
    conversationHistory = trimConversationHistory(conversationHistory);

    // Call Claude Opus to decide next action
    const result = await callClaude({
      model: "claude-opus-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: conversationHistory,
      tools: TOOLS_SCHEMA,
    });

    if (!result.ok) {
      console.error("Claude API failed:", result.error);
      await cleanupBrowserSession(ctx, args.investigationId);
      await ctx.runMutation(api.investigations.updateStatus, {
        id: args.investigationId,
        status: "failed",
        errorMessage: `Claude API error: ${result.error.slice(0, 500)}`,
      });
      return;
    }

    const data = result.data;

    // Track token usage
    if (data.usage) {
      await ctx.runMutation(api.investigations.updateTokenUsage, {
        id: args.investigationId,
        inputTokens: data.usage.input_tokens ?? 0,
        outputTokens: data.usage.output_tokens ?? 0,
      });
    }

    const stepNumber = await ctx.runMutation(api.investigations.incrementStep, {
      id: args.investigationId,
    });

    // Process the response — collect ALL text and tool_use blocks
    let reasoning = "";
    const toolCalls: ToolCall[] = [];

    for (const block of data.content) {
      if (block.type === "text") {
        reasoning = block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({ id: block.id, tool: block.name, args: block.input });
      }
    }

    // Log the reasoning step
    if (reasoning) {
      await ctx.runMutation(api.investigations.addStep, {
        investigationId: args.investigationId,
        stepNumber,
        action: reasoning.slice(0, 500),
        tool: "reasoning",
      });
    }

    if (toolCalls.length === 0) {
      // No tool call — might be done or confused
      await generateReport(ctx, args.investigationId, args.conversationHistory);
      return;
    }

    // Execute all tool calls sequentially, collecting results
    const toolResults: Array<{ tool_use_id: string; content: string }> = [];

    for (const tc of toolCalls) {
      let toolResult = "";

      try {
        switch (tc.tool) {
          case "maigret_search": {
            await ctx.runMutation(api.investigations.addStep, {
              investigationId: args.investigationId,
              stepNumber,
              action: `Running intelligent OSINT search for "${tc.args.username}" — searching 3,000+ sites, extracting leads via AI, following connections`,
              tool: "maigret",
            });
            const investigateResult = await withToolTimeout(
              ctx.runAction(
                internal.tools.maigret.investigate,
                {
                  username: tc.args.username as string,
                  targetName: investigation.targetName || undefined,
                  targetDescription: investigation.targetDescription || undefined,
                },
              ),
              "maigret_search",
            );

            const formattedResult = formatInvestigationForOpus(investigateResult);
            toolResult = formattedResult;

            // Auto-save leads as findings
            if (investigateResult.leads_extracted?.length > 0) {
              for (const lead of investigateResult.leads_extracted.slice(0, 5)) {
                await ctx.runMutation(api.investigations.addFinding, {
                  investigationId: args.investigationId,
                  source: "maigret",
                  category: "connection",
                  platform: lead.platform || undefined,
                  data: `Lead extracted: @${lead.username}${lead.platform ? ` on ${lead.platform}` : ""} — ${lead.reason}`,
                  confidence: 70,
                });
              }
            }
            break;
          }

          case "browser_action": {
            await ctx.runMutation(api.investigations.addStep, {
              investigationId: args.investigationId,
              stepNumber,
              action: `Browser: ${(tc.args.instruction as string).slice(0, 200)}`,
              tool: "browser_action",
            });
            const browserResult = await withToolTimeout(
              ctx.runAction(
                internal.tools.browserUse.runTask,
                {
                  task: tc.args.instruction as string,
                  sessionId: investigation.browserSessionId ?? undefined,
                },
              ),
              "browser_action",
            );
            // Use the task output text as the tool result for the LLM
            toolResult = browserResult?.output ?? JSON.stringify(browserResult);

            // If we didn't have a session before, fetch session details for liveUrl
            if (!investigation.browserSessionId && browserResult?.sessionId) {
              try {
                const session = await ctx.runAction(
                  internal.tools.browserUse.getSession,
                  { sessionId: browserResult.sessionId }
                );
                await ctx.runMutation(api.investigations.updateBrowserSession, {
                  id: args.investigationId,
                  browserSessionId: browserResult.sessionId,
                  browserLiveUrl: session?.liveUrl,
                });
              } catch {
                // Best-effort: store session_id even without liveUrl
                await ctx.runMutation(api.investigations.updateBrowserSession, {
                  id: args.investigationId,
                  browserSessionId: browserResult.sessionId,
                });
              }
            }
            break;
          }

          case "face_check": {
            await ctx.runMutation(api.investigations.addStep, {
              investigationId: args.investigationId,
              stepNumber,
              action: `Running face recognition on image`,
              tool: "face_check",
            });
            const faceResult = await withToolTimeout(
              ctx.runAction(
                internal.tools.faceCheck.searchByImage,
                { imageUrl: tc.args.imageUrl as string },
              ),
              "face_check",
            );
            toolResult = JSON.stringify(faceResult);
            break;
          }

          case "save_finding": {
            const findingArgs = tc.args as {
              source: string;
              category: string;
              platform?: string;
              profileUrl?: string;
              data: string;
              confidence: number;
            };
            await withToolTimeout(
              ctx.runMutation(api.investigations.addFinding, {
                investigationId: args.investigationId,
                source: findingArgs.source,
                category: findingArgs.category,
                platform: findingArgs.platform,
                profileUrl: findingArgs.profileUrl,
                data: findingArgs.data,
                confidence: findingArgs.confidence,
              }),
              "save_finding",
            );
            await ctx.runMutation(api.investigations.addStep, {
              investigationId: args.investigationId,
              stepNumber,
              action: `Saved finding: ${findingArgs.data.slice(0, 200)}`,
              tool: "save_finding",
            });
            toolResult = "Finding saved successfully.";
            break;
          }

          case "done": {
            await generateReport(ctx, args.investigationId, args.conversationHistory);
            return;
          }

          default:
            toolResult = `Unknown tool: ${tc.tool}`;
        }
      } catch (error) {
        toolResult = toolErrorMessage(tc.tool, error);
      }

      toolResults.push({
        tool_use_id: tc.id,
        content: toolResult.slice(0, 4000),
      });
    }

    // Continue the conversation with ALL tool results
    const updatedHistory = [
      ...conversationHistory,
      { role: "assistant", content: data.content },
      {
        role: "user",
        content: toolResults.map((tr) => ({
          type: "tool_result",
          tool_use_id: tr.tool_use_id,
          content: tr.content,
        })),
      },
    ];

    // Schedule the next step
    await ctx.scheduler.runAfter(0, internal.orchestrator.step, {
      investigationId: args.investigationId,
      conversationHistory: JSON.stringify(updatedHistory),
    });
  },
});

async function generateReport(
  ctx: Pick<ActionCtx, "runQuery" | "runMutation" | "runAction">,
  investigationId: string,
  conversationHistory: string,
) {
  const findings = await ctx.runQuery(api.investigations.getFindings, {
    investigationId: investigationId as any,
  });

  let history = JSON.parse(conversationHistory);
  history = trimConversationHistory(history);
  history.push({
    role: "user",
    content: `Generate a comprehensive detective report based on all findings so far. Include:
1. Subject Profile (name, known info, confirmed identities)
2. Digital Footprint (all confirmed social profiles)
3. Connections (people identified through photos, tags, interactions)
4. Recent Activity (last known online activity, locations mentioned)
5. Key Evidence (most important findings with confidence scores)
6. Recommendations (suggested next steps for further investigation)

Findings so far:
${findings.map((f: { category: string; data: string; confidence: number; source: string }) => `- [${f.category}] ${f.data} (confidence: ${f.confidence}%, source: ${f.source})`).join("\n")}

Format as markdown. Be thorough and professional.`,
  });

  const result = await callClaude({
    model: "claude-opus-4-20250514",
    max_tokens: 4096,
    messages: history,
  });

  if (!result.ok) {
    console.error("Report generation failed:", result.error);
    await cleanupBrowserSession(ctx, investigationId as any);
    await ctx.runMutation(api.investigations.updateStatus, {
      id: investigationId as any,
      status: "failed",
      errorMessage: `Report generation failed: ${result.error.slice(0, 500)}`,
    });
    return;
  }

  // Track token usage for report generation
  if (result.data.usage) {
    await ctx.runMutation(api.investigations.updateTokenUsage, {
      id: investigationId as any,
      inputTokens: result.data.usage.input_tokens ?? 0,
      outputTokens: result.data.usage.output_tokens ?? 0,
    });
  }

  const report =
    result.data.content.find((b: { type: string }) => b.type === "text")?.text || "";

  await ctx.runMutation(api.investigations.updateReport, {
    id: investigationId as any,
    report,
    confidence: calculateOverallConfidence(findings),
  });

  await cleanupBrowserSession(ctx, investigationId as any);

  await ctx.runMutation(api.investigations.updateStatus, {
    id: investigationId as any,
    status: "complete",
  });
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

  // Header
  sections.push(`=== OSINT Investigation: @${result.primary_username} ===`);
  sections.push(`Total profiles found: ${result.total_profiles}`);
  if (result.error) sections.push(`Warning: ${result.error}`);

  // Primary profiles
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

  // AI analysis
  if (result.llm_analysis) {
    sections.push(`\n--- AI Analysis ---`);
    sections.push(result.llm_analysis);
  }

  // Extracted leads
  if (result.leads_extracted.length > 0) {
    sections.push(`\n--- Extracted Leads (${result.leads_extracted.length} found) ---`);
    for (const lead of result.leads_extracted) {
      sections.push(
        `- @${lead.username}${lead.platform ? ` (${lead.platform})` : ""} — ${lead.reason}`
      );
    }
  }

  // Lead profiles (results from searching the leads)
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

  // Connection graph
  if (result.lead_graph.length > 0) {
    sections.push(`\n--- Connection Graph ---`);
    for (const edge of result.lead_graph) {
      sections.push(
        `@${edge.from} → @${edge.to}${edge.platform ? ` [${edge.platform}]` : ""}: ${edge.reason}`
      );
    }
  }

  return sections.join("\n");
}

async function cleanupBrowserSession(
  ctx: Pick<ActionCtx, "runQuery" | "runMutation" | "runAction">,
  investigationId: any,
) {
  try {
    const investigation = await ctx.runQuery(api.investigations.get, {
      id: investigationId,
    });
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

function calculateOverallConfidence(
  findings: { confidence: number }[]
): number {
  if (findings.length === 0) return 0;
  const sum = findings.reduce((acc, f) => acc + f.confidence, 0);
  return Math.round(sum / findings.length);
}
