import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { TOOL_NAMES } from "./toolNames";

const MAX_STEPS = 20;
const MAX_CONSECUTIVE_SAVE_ONLY = 3;
const COMPRESSION_TOKEN_THRESHOLD = 20_000;
const KEEP_RECENT_EXCHANGES = 3;
const MAX_CONSECUTIVE_ERRORS = 3;
const MAX_BROWSER_ACTIONS = Infinity;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

function buildSystemPrompt(maigretAvailable: boolean, extremeMode: boolean = false, disabledTools: string[] = []): string {
  const toolLines: string[] = [];
  let n = 1;
  const isEnabled = (name: string) => !disabledTools.includes(name);
  if (maigretAvailable && isEnabled(TOOL_NAMES.MAIGRET_SEARCH)) {
    toolLines.push(
      `${n++}. maigret_search(username) - OSINT search across 3,000+ sites. AI extracts connected handles from bios/metadata and auto-searches those leads. Returns profiles, leads, connection graph. High-value first move when you have a username.`
    );
  }
  if (isEnabled(TOOL_NAMES.BROWSER_ACTION)) {
    toolLines.push(
      `${n++}. browser_action(instruction) - Control a real browser. Returns page text + visual content descriptions. SLOW (~60-180s) but UNLIMITED. HIGH VALUE for imginn.com (Instagram OSINT), TikTok, and visual platforms — use it freely to browse profiles, photos, location tags, and connections. See BROWSER RULES below.`
    );
  }
  if (isEnabled(TOOL_NAMES.WEB_SEARCH)) {
    toolLines.push(
      `${n++}. web_search(query, count?) - Fast web search (<1s). Returns titles, URLs, snippets. YOUR DEFAULT TOOL for lookups.`
    );
  }
  if (isEnabled(TOOL_NAMES.GEO_LOCATE)) {
    toolLines.push(
      `${n++}. geo_locate(imageUrl) - Picarta AI geolocation. Returns coordinates, confidence, EXIF, top-3 predictions. CAVEAT: Picarta predictions are rough estimates — treat results with a grain of salt. Only trust high-confidence results (>70%) backed by EXIF data or corroborating evidence. Never state a location as confirmed based on Picarta alone.`
    );
  }
  if (isEnabled(TOOL_NAMES.REVERSE_IMAGE_SEARCH)) {
    toolLines.push(
      `${n++}. reverse_image_search(imageUrl) - Find where a photo appears online. Returns visual matches, knowledge graph, OCR text.`
    );
  }
  if (extremeMode && isEnabled(TOOL_NAMES.WHITEPAGES_LOOKUP)) {
    toolLines.push(
      `${n++}. whitepages_lookup(name?, phone?, city?, stateCode?) - Deep person lookup. Returns current/historic addresses, owned properties, phones, emails, employer, LinkedIn, relatives.`
    );
  }
  if (extremeMode && isEnabled(TOOL_NAMES.DARKWEB_SEARCH)) {
    toolLines.push(
      `${n++}. darkweb_search(term, maxResults?) - Search leaked databases and paste sites for emails, usernames, phones.`
    );
  }
  toolLines.push(
    `${n++}. save_finding(source, category, platform, data, confidence, imageUrl?, profileUrl?) - Save a confirmed finding. Categories: "social", "connection", "location", "activity", "identity". FREE - does not count toward your step budget. Save liberally. Always include imageUrl when you have one.`,
    `${n++}. ask_user(question, options, context?) - Ask the user a clarifying question with 2-4 selectable options. Use when results are ambiguous and a quick answer would save multiple steps (e.g. "Found 12 John Smiths - which city are they likely in?"). Always include "Not sure" as the last option. FREE - doesn't burn steps.`,
    `${n++}. done(summary) - End the investigation. Call this when you've gathered enough evidence or are running low on steps.`
  );

  return `You are an expert OSINT investigator. You think methodically, follow leads, and build a comprehensive digital footprint.

## TOOLS
${toolLines.join("\n")}

## BROWSER RULES - READ CAREFULLY
browser_action controls a REAL browser. Use it strategically — it's slow (~60-180s) but extremely powerful for visual intelligence.

Decision tree:
1. Can web_search answer this? (LinkedIn profiles, GitHub pages, news articles) -> Use web_search first
2. Need to see photos, posts, stories, location tags, or visual content? -> Use browser_action (this is its strength)
3. Did browser_action just fail/timeout? -> NEVER retry the same page. Try an alternative URL or switch to web_search.

BEST uses of browser_action: imginn.com (Instagram OSINT — photos, location tags, tagged people, stories), TikTok profiles, any page with visual/interactive content.
AVOID browser_action for: LinkedIn, GitHub, Wikipedia, news articles - web_search gets the same text data faster.

## MANDATORY: IMGINN INSTAGRAM BROWSING
THIS IS YOUR #1 MOST IMPORTANT RULE: Whenever you discover an Instagram username, you MUST immediately browse imginn.com/username with browser_action. Do NOT skip this. Do NOT delay it. Do NOT substitute web_search for it. Imginn is your single most powerful OSINT tool.

WHY: imginn.com shows the target's full Instagram WITHOUT login — photos, reels, stories, tagged posts, location tags, bio, connections. Previous investigations found exact addresses, workplaces (like Y Combinator), and real-time locations from Instagram photos alone.

HOW TO USE IMGINN:
1. As soon as you have ANY Instagram username -> browser_action("Go to imginn.com/USERNAME. Scroll through ALL their photos. For EACH photo describe: the location tag, any landmarks or building names visible, all people tagged, the caption text, and any identifying details like addresses, company logos, or event names.")
2. If the first page has more photos, scroll down and keep going — don't stop at the first few.
3. Save EVERY location, connection, and identifying detail as separate findings.
4. If imginn.com is down -> try picuki.com/profile/username -> then instagram.com/username as last resort.
- TikTok -> urlebird.com/user/username (public viewer) or browse tiktok.com/@username directly
- Facebook -> mbasic.facebook.com/username or web_search "site:facebook.com name"
- LinkedIn -> web_search "site:linkedin.com/in/ name title" (NEVER browse directly, login wall is strict)
- Twitter/X -> browse x.com/username directly, or nitter.net/username as fallback
- Pinterest -> browse pinterest.com/username/ (usually public)
- Reddit -> old.reddit.com/user/username (no login needed)

## PARALLEL EXECUTION
<use_parallel_tool_calls>
ALWAYS invoke independent tools simultaneously. If you need 3 web searches, call all 3 at once - not one at a time.
Combine save_finding calls with your next research action in the same turn.
</use_parallel_tool_calls>

## STRATEGY - PHASE-BASED APPROACH
Adapt to what you know. Each step is precious - make it count.

**Phase 1 - Cast the Net (Steps 1-5):**
- Instagram link or username provided -> IMMEDIATELY browser_action imginn.com/username (DO THIS FIRST, before anything else)
${maigretAvailable && isEnabled(TOOL_NAMES.MAIGRET_SEARCH) ? "- Username known -> start with maigret_search (wide OSINT net), then IMMEDIATELY browse imginn.com/username" : ""}
- Name only -> parallel web_search: "Name LinkedIn", "Name Twitter", "Name Instagram", "Name GitHub"
- ALWAYS search: "Name + Description + Instagram" (e.g. "John Doe San Francisco tech Instagram") — this often finds the exact Instagram profile when a generic name search fails
- When you find an Instagram username from ANY source -> STOP and browse imginn.com/username before continuing
- Common name -> add description details (city, job, age) to searches; use ask_user if results are ambiguous
- Photo available -> parallel: geo_locate + reverse_image_search (geo_locate is approximate — corroborate with other evidence before reporting as fact)
- Links provided -> web_search each link for context
${extremeMode && isEnabled(TOOL_NAMES.DARKWEB_SEARCH) ? "- Email/username -> darkweb_search for breach records" : ""}

**Phase 2 - Follow Leads (Steps 6-14):**
- Cross-reference findings: verify identities across platforms
- Browse confirmed Instagram profiles via imginn.com/username with browser_action — look at photos for locations, landmarks, faces, tagged people, bio links, captions
- Explore confirmed profiles deeper (web_search for text-heavy sites, browser_action for visual platforms like Instagram)
- Search for connections between discovered accounts
- Target demographics: younger -> TikTok/Instagram/Discord; professional -> LinkedIn/GitHub

**Phase 3 - Verify & Wrap Up (Steps 15-20):**
- Verify uncertain findings, fill gaps in the profile
- Ensure all confirmed findings are saved
- Call done() with a comprehensive summary

## LEAD VALIDATION - CRITICAL (avoid false positives)
- Never assume a profile belongs to the target just because the name or username matches
- Before saving a finding, require 2+ independent corroborating signals (e.g. same name + same city, cross-linked accounts, matching photo)
- Maigret false-positive warning: common usernames match many unrelated accounts - always verify profile content before attribution
- Check profile content (bio, photos, location, activity dates) before attributing to target
- A username match alone is NOT sufficient - look for bio details, location, connections, or photos that corroborate
- If a profile contradicts known info (wrong city, wrong age, wrong profession), do NOT save it as a finding
- When in doubt, note the lead but mark confidence low and explain why attribution is uncertain

## SELF-ASSESSMENT CHECKPOINTS
- Every 3-4 tool calls, pause and verify: "Am I still investigating the right person?"
- Ask: "Do my findings corroborate each other, or am I mixing up different people?"
- When to abandon a lead: no corroborating info after 2 searches, or profile details contradict known info
- When to pursue deeper: multiple signals align, cross-linked accounts, unique identifiers match
- Explicitly state "Abandoning this lead because..." when you redirect to prevent re-exploring dead ends

## DIRECTIVE AWARENESS
- A human investigator may inject KILL LEAD directives during the investigation
- When you see a KILL LEAD directive, immediately stop ALL activity related to that lead
- Never re-search, reference, or save findings about killed leads
- Trust the human operator's judgment and redirect your efforts to other leads

## ERROR RECOVERY
- If a tool returns an error, DO NOT retry the same tool with the same input
- If browser_action fails -> switch to web_search for that URL/query
- If web_search returns empty -> try different query terms, not browser_action
- After 2+ consecutive errors, reassess your approach entirely

## DEDUPLICATION
Before each action, review your previous steps. Do NOT:
- Search for the same query twice
- Visit a URL you've already visited
- Save a finding you've already saved

## MANDATORY TOOL USAGE — NON-NEGOTIABLE
You MUST use every available tool listed above at least once during the investigation. No exceptions.
Even if you believe a tool is not relevant to the case, find a creative reason to invoke it — partial results are better than skipping a tool entirely.
Before calling done(), review the list of tools and confirm you have used each one at least once. If any tool has not been called, use it before wrapping up.
Tools you MUST use at least once this investigation: ${toolLines.filter(l => !l.includes("save_finding") && !l.includes("ask_user") && !l.includes("done(")).map(l => l.match(/\. (\w+)\(/)?.[1]).filter(Boolean).join(", ")}.

## CRITICAL RULES
- Save findings AS you discover them (it's free)
- When you find images, ALWAYS include imageUrl in save_finding
- Explain your reasoning briefly before each action
- Quality over quantity - one good verified finding beats five unverified ones`;
}

function buildStepContext(params: {
  stepNumber: number;
  maxSteps: number;
  findingsCount: number;
  browserActionsUsed: number;
  maxBrowserActions: number;
  consecutiveErrors: number;
}): string {
  const remaining = params.maxSteps - params.stepNumber;
  const phase = params.stepNumber <= 5 ? "Phase 1 (Cast the Net)" :
    params.stepNumber <= 14 ? "Phase 2 (Follow Leads)" :
    "Phase 3 (Verify & Wrap Up)";

  const parts = [
    `[Step ${params.stepNumber}/${params.maxSteps} | ${remaining} remaining | ${phase}]`,
    `[Findings saved: ${params.findingsCount} | Browser uses: ${params.browserActionsUsed}/${params.maxBrowserActions}]`,
  ];

  if (remaining <= 3) {
    parts.push(`[WARNING: Only ${remaining} steps left. Wrap up investigation and call done() soon.]`);
  }

  if (params.browserActionsUsed >= params.maxBrowserActions) {
    parts.push(`[Browser limit reached. Use web_search for all remaining lookups.]`);
  }

  if (params.consecutiveErrors >= 2) {
    parts.push(`[${params.consecutiveErrors} consecutive errors. Reassess your approach - try a different tool or query.]`);
  }

  return parts.join("\n");
}

function formatToolResult(tool: string, rawResult: string): string {
  const MAX_CONTEXT_CHARS = 3500;

  switch (tool) {
    case "web_search": {
      try {
        const parsed = JSON.parse(rawResult);
        if (parsed.results && Array.isArray(parsed.results)) {
          const formatted = parsed.results.slice(0, 8).map(
            (r: { title: string; url: string; description: string }, i: number) =>
              `${i + 1}. ${r.title}\n   ${r.url}\n   ${(r.description || "").slice(0, 150)}`
          ).join("\n");
          return `Search: "${parsed.query}"\n${formatted}`.slice(0, MAX_CONTEXT_CHARS);
        }
      } catch { /* fall through */ }
      return rawResult.slice(0, MAX_CONTEXT_CHARS);
    }

    case "browser_action":
      return rawResult.slice(0, MAX_CONTEXT_CHARS);

    case "save_finding":
      return "Finding saved.";

    case "maigret_search":
      return rawResult.slice(0, 5000);

    default:
      return rawResult.slice(0, MAX_CONTEXT_CHARS);
  }
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
          description: 'What to do in the browser, e.g. "Go to imginn.com/johndoe and describe their photos, location tags, bio, and tagged people"',
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
      "Deep person lookup - search by name, phone number, or both. Returns real addresses, age, phone numbers, and associated people. EXTREME MODE ONLY.",
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
      "Reverse image search - find where a photo appears online. Returns visual matches (pages containing the image), knowledge graph identity, and text found in/near the image. Use on any photo of the target to find social profiles, news articles, or other appearances.",
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
    description: "Save a confirmed finding from the investigation. FREE - does not count toward your step budget.",
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
      "Ask the user a clarifying question when you're stuck or results are ambiguous. Present 2-4 clear options. Use sparingly - only when disambiguation would save multiple wasted steps. Examples: 'Multiple John Smiths found - which city?', 'Is this the right person?' FREE - does not count toward step budget.",
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
      // Sidecar unreachable - will be excluded from tools
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
      infoLines.push(`Photo URL: ${investigation.targetPhoto}`);
    else
      infoLines.push(`No photo provided`);

    const extremeMode = investigation.extremeMode ?? false;
    const disabledTools = investigation.disabledTools ?? [];

    let userMessage = `Investigate this person.\n\nAvailable info summary:\n${infoLines.join("\n")}`;
    if (investigation.instructions) {
      userMessage += `\n\nSpecial Instructions:\n${investigation.instructions}`;
    }
    userMessage += `\n\nBegin your investigation. Adapt your strategy to the available information - what's your first move?`;

    await ctx.scheduler.runAfter(0, internal.orchestrator.step, {
      investigationId: args.investigationId,
      conversationHistory: JSON.stringify([{
        role: "user",
        content: userMessage,
      }]),
      consecutiveSaveOnlySteps: 0,
      maigretAvailable,
      extremeMode,
      disabledTools,
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
    consecutiveErrors: v.optional(v.number()),
    browserActionsUsed: v.optional(v.number()),
    maigretAvailable: v.optional(v.boolean()),
    extremeMode: v.optional(v.boolean()),
    disabledTools: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const investigation = await ctx.runQuery(api.investigations.get, { id: args.investigationId });
    if (!investigation) return;
    if (investigation.status === "complete" || investigation.status === "failed" || investigation.status === "stopped") return;
    if (investigation.stepCount >= MAX_STEPS) {
      await generateReport(ctx, args.investigationId);
      return;
    }

    let conversationHistory = JSON.parse(args.conversationHistory);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    // --- Directive injection ---
    const pendingDirectives = await ctx.runQuery(api.directives.getPendingDirectives, {
      investigationId: args.investigationId,
    });

    if (pendingDirectives.length > 0) {
      const directiveLines = pendingDirectives.map((d) => {
        if (d.type === "kill_lead") {
          return `OPERATOR DIRECTIVE: KILL LEAD. Stop pursuing: ${d.message}`;
        }
        return `OPERATOR DIRECTIVE: ${d.message}`;
      });
      const directiveText = `[HUMAN OPERATOR DIRECTIVES]\n\n${directiveLines.join("\n\n")}`;

      const lastMsg = conversationHistory[conversationHistory.length - 1];
      if (lastMsg?.role === "user" && Array.isArray(lastMsg.content)) {
        // Last message is tool_results array - append directive as text block
        lastMsg.content.push({ type: "text", text: directiveText });
      } else if (lastMsg?.role === "assistant") {
        // Add new user message with directive
        conversationHistory.push({ role: "user", content: directiveText });
      } else {
        // Fallback: add as new user message
        conversationHistory.push({ role: "user", content: directiveText });
      }

      // Acknowledge directives
      await ctx.runMutation(api.directives.acknowledgeDirectives, {
        directiveIds: pendingDirectives.map((d) => d._id),
      });

      // Log directive step
      await ctx.runMutation(api.investigations.addStep, {
        investigationId: args.investigationId,
        stepNumber: investigation.stepCount + 1,
        action: `Human operator directive: ${directiveLines.join("; ").slice(0, 400)}`,
        tool: "directive",
      });
    }

    // Build killed leads list (all kill_lead directives, including already acknowledged)
    const allDirectives = await ctx.runQuery(api.directives.getDirectives, {
      investigationId: args.investigationId,
    });
    const killedLeads = allDirectives
      .filter((d) => d.type === "kill_lead")
      .map((d) => d.message);

    const maigretAvailable = args.maigretAvailable ?? false;
    const extremeMode = args.extremeMode ?? false;
    const disabledTools = args.disabledTools ?? [];
    let browserActionsUsed = args.browserActionsUsed ?? 0;
    let consecutiveErrors = args.consecutiveErrors ?? 0;

    const findings = await ctx.runQuery(api.investigations.getFindings, { investigationId: args.investigationId });
    const stepNumber = investigation.stepCount + 1;

    const stepContext = buildStepContext({
      stepNumber,
      maxSteps: MAX_STEPS,
      findingsCount: findings.length,
      browserActionsUsed,
      maxBrowserActions: MAX_BROWSER_ACTIONS,
      consecutiveErrors,
    });

    const tools = TOOL_DEFINITIONS.filter((t) => {
      if (disabledTools.includes(t.name)) return false;
      if (t.name === TOOL_NAMES.MAIGRET_SEARCH && !maigretAvailable) return false;
      if (t.name === TOOL_NAMES.WHITEPAGES_LOOKUP && !extremeMode) return false;
      if (t.name === TOOL_NAMES.DARKWEB_SEARCH && !extremeMode) return false;
      if (t.name === TOOL_NAMES.BROWSER_ACTION && browserActionsUsed >= MAX_BROWSER_ACTIONS) return false;
      return true;
    });

    // Append step context to the last user message so the LLM sees its budget/state
    const messagesWithContext = [...conversationHistory];
    const lastMsg = messagesWithContext[messagesWithContext.length - 1];
    if (lastMsg && lastMsg.role === "user") {
      if (Array.isArray(lastMsg.content)) {
        messagesWithContext[messagesWithContext.length - 1] = {
          ...lastMsg,
          content: [...lastMsg.content, { type: "text", text: `\n${stepContext}` }],
        };
      } else {
        messagesWithContext[messagesWithContext.length - 1] = {
          ...lastMsg,
          content: `${lastMsg.content}\n\n${stepContext}`,
        };
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: buildSystemPrompt(maigretAvailable, extremeMode, disabledTools),
        messages: messagesWithContext,
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

    // Log reasoning step (non-blocking - fire and continue)
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

    // Handle ask_user - pause the loop and wait for user response
    const askUserCall = toolCalls.find((tc) => tc.tool === "ask_user");
    if (askUserCall) {
      await reasoningPromise;
      const askArgs = askUserCall.args as { question: string; options: string[]; context?: string };

      // Build the frozen conversation history (include assistant's response with the ask_user call)
      const frozenHistory = [
        ...conversationHistory,
        { role: "assistant", content: data.content },
      ];

      // Create clarification record (mutation sets status to "awaiting_input")
      await ctx.runMutation(api.investigations.createClarification, {
        investigationId: args.investigationId,
        question: askArgs.question,
        options: askArgs.options,
        context: askArgs.context,
        conversationHistory: JSON.stringify(frozenHistory),
        consecutiveSaveOnlySteps: args.consecutiveSaveOnlySteps ?? 0,
        maigretAvailable: args.maigretAvailable ?? false,
        extremeMode: args.extremeMode ?? false,
        disabledTools: args.disabledTools,
      });

      // Log the question as a step
      await ctx.runMutation(api.investigations.addStep, {
        investigationId: args.investigationId,
        stepNumber,
        action: `Asking user: ${askArgs.question}`,
        tool: "ask_user",
      });

      // DON'T schedule next step - wait for user response
      return;
    }

    await reasoningPromise;

    const toolResults: { id: string; tool: string; result: string }[] = [];
    let hasNonSaveFinding = false;

    // Pre-compute step number - no need to re-query per tool
    let currentStepNumber = stepNumber;
    for (const tc of toolCalls) {
      if (tc.tool !== "save_finding") {
        hasNonSaveFinding = true;
      }
    }
    if (hasNonSaveFinding) {
      currentStepNumber = stepNumber + 1;
    }

    // Separate browser_action calls (must be sequential - shared session) from parallelizable tools
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
      browserActionsUsed++;
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

    const nonSaveResults = orderedResults.filter((tr) => tr.tool !== "save_finding");
    const allToolsFailed = nonSaveResults.length > 0 && nonSaveResults.every((tr) =>
      tr.result.startsWith("Tool error:") || tr.result.includes("RECOVERY:")
    );
    if (allToolsFailed) {
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.warn(`[escalation] ${consecutiveErrors} consecutive errors — forcing report generation`);
        await generateReport(ctx, args.investigationId);
        return;
      }
    } else {
      consecutiveErrors = 0;
    }

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
      content: formatToolResult(tr.tool, tr.result),
    }));

    const updatedHistory = [
      ...conversationHistory,
      { role: "assistant", content: data.content },
      { role: "user", content: toolResultBlocks },
    ];

    const { history: finalHistory, compressionTokens } = await compressHistory(updatedHistory, killedLeads);

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
      consecutiveErrors,
      browserActionsUsed,
      maigretAvailable,
      extremeMode,
      disabledTools,
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
          action: `Running intelligent OSINT search for "${toolCall.args.username}" - searching 3,000+ sites, extracting leads via AI, following connections`,
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
              data: `Lead extracted: @${lead.username}${lead.platform ? ` on ${lead.platform}` : ""} - ${lead.reason}`,
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

        // v3: runTask returns sessionId + liveUrl directly - always update
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
        // Only auto-save if EXIF confirms location OR confidence is very high (>70%)
        // Picarta is non-deterministic and gives different answers each time for the same image
        if (picartaResult.latitude && picartaResult.longitude) {
          const locationParts = [picartaResult.city, picartaResult.province, picartaResult.country].filter(Boolean);
          const conf = picartaResult.confidence ? Math.round(picartaResult.confidence * 100) : 0;
          const hasExif = !!(picartaResult.exifLat && picartaResult.exifLon);
          if (hasExif || conf >= 70) {
            await ctx.runMutation(api.investigations.addFinding, {
              investigationId,
              source: "picarta",
              category: "location",
              platform: "picarta",
              data: hasExif
                ? `Photo EXIF confirms location: ${picartaResult.exifCountry ?? locationParts.join(", ")} (${picartaResult.exifLat}, ${picartaResult.exifLon}). AI prediction: ${locationParts.join(", ")} (${conf}% confidence)`
                : `Photo geo-located to ${locationParts.join(", ")} (${picartaResult.latitude}, ${picartaResult.longitude}). Confidence: ${conf}% — treat as approximate`,
              confidence: hasExif ? Math.max(conf, 80) : conf,
              latitude: hasExif ? picartaResult.exifLat : picartaResult.latitude,
              longitude: hasExif ? picartaResult.exifLon : picartaResult.longitude,
            });
          }
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
        // Auto-save address findings from WhitePages results
        if (wpResult.results && Array.isArray(wpResult.results)) {
          for (const person of wpResult.results.slice(0, 3)) {
            const allAddresses = [
              ...(person.currentAddresses || []),
              ...(person.historicAddresses || []),
            ];
            for (const addr of allAddresses.slice(0, 3)) {
              if (addr) {
                await ctx.runMutation(api.investigations.addFinding, {
                  investigationId,
                  source: "whitepages",
                  category: "location",
                  data: `Address: ${addr}`,
                  confidence: 65,
                });
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
            data: `Identified via reverse image: ${risResult.knowledgeGraph.title}${risResult.knowledgeGraph.subtitle ? ` - ${risResult.knowledgeGraph.subtitle}` : ""}${risResult.knowledgeGraph.description ? `. ${risResult.knowledgeGraph.description}` : ""}`,
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
  conversationHistory: Array<Record<string, unknown>>,
  killedLeads?: string[]
): Promise<CompressionResult> {
  // Early return for small histories - skip serialization entirely
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

Be concise but preserve all actionable intelligence. No raw tool output - only meaningful findings and conclusions.

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
            content: `${originalMessage.content as string}\n\n---\n\n[INVESTIGATION PROGRESS - Steps 1-${Math.floor(adjustedCutoff / 2)} compressed]\n\n${summary}${killedLeads && killedLeads.length > 0 ? `\n\n[KILLED LEADS - Do NOT pursue these]\n${killedLeads.map((l) => `- ${l}`).join("\n")}` : ""}\n\n[End of progress summary. Recent steps follow.]`,
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
        content: `${originalMessage.content as string}\n\n---\n\n[INVESTIGATION PROGRESS - Steps 1-${Math.floor(cutoffIndex / 2)} compressed]\n\n${summary}${killedLeads && killedLeads.length > 0 ? `\n\n[KILLED LEADS - Do NOT pursue these]\n${killedLeads.map((l) => `- ${l}`).join("\n")}` : ""}\n\n[End of progress summary. Recent steps follow.]`,
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
  "behavioralNotes": ["Key behavioral observations - posting frequency, content type preferences, engagement patterns, privacy level"]
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

  // Handle behavioral analysis result (non-critical - don't fail on error)
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
      sections.push(`• @${lead.username}${lead.platform ? ` (${lead.platform})` : ""} - ${lead.reason}`);
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
        if (p.bio) line.push(`- "${(p.bio as string).slice(0, 100)}"`);
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

    // Restore frozen conversation + inject user response as tool_result
    const frozenHistory = JSON.parse(clar.conversationHistory);

    // Find the ask_user tool_use block in the last assistant message to get its ID
    const lastAssistant = frozenHistory[frozenHistory.length - 1];

    const toolResultBlocks = lastAssistant.content
      .filter((b: { type: string }) => b.type === "tool_use")
      .map((b: { type: string; id: string; name: string }) => {
        if (b.name === "ask_user") {
          return { type: "tool_result", tool_use_id: b.id, content: `User answered: "${clar.response}"` };
        }
        // For any other tool calls in the same message, return a skip result
        return { type: "tool_result", tool_use_id: b.id, content: "Skipped - paused for user clarification" };
      });

    const resumedHistory = [
      ...frozenHistory,
      { role: "user", content: toolResultBlocks },
    ];

    // Set status back to "investigating"
    await ctx.runMutation(api.investigations.updateStatus, {
      id: clar.investigationId,
      status: "investigating",
    });

    // Resume the loop
    await ctx.scheduler.runAfter(0, internal.orchestrator.step, {
      investigationId: clar.investigationId,
      conversationHistory: JSON.stringify(resumedHistory),
      consecutiveSaveOnlySteps: clar.consecutiveSaveOnlySteps,
      maigretAvailable: clar.maigretAvailable,
      extremeMode: clar.extremeMode,
      disabledTools: clar.disabledTools,
    });
  },
});
