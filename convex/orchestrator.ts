import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

const MAX_STEPS = 20;

const SYSTEM_PROMPT = `You are an expert missing persons investigator. You think methodically, follow leads, and build a comprehensive picture of a person's digital footprint.

You have access to these tools:
1. maigret_search(username) — Search 3,000+ sites for matching profiles. High false positive rate (~86%), so filter results using known info (name, location, age, bio).
2. browser_action(instruction) — Control a web browser. Give clear instructions like "Go to instagram.com/username and report what you see." Returns screenshots and page text.
3. face_check(imageUrl) — Run facial recognition on an image. Returns matching profiles with confidence scores. Use on group photos or profile pictures.
4. save_finding(source, category, platform, data, confidence) — Save a confirmed finding. Categories: "social", "connection", "location", "activity", "identity".
5. done(report) — End the investigation and generate the final report.

Strategy:
- Start with Maigret to cast a wide net for the username
- Use Browser Use to explore confirmed social profiles
- Use FaceCheck on photos to find connected people
- Follow leads autonomously — check friends, tagged accounts, recent activity
- Save findings as you go
- After gathering enough evidence (or hitting 20 steps), generate a comprehensive report

Always explain your reasoning before choosing an action. Be thorough but efficient.`;

interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

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
      // Force report generation
      await generateReport(ctx, args.investigationId, args.conversationHistory);
      return;
    }

    const conversationHistory = JSON.parse(args.conversationHistory);

    // Call Claude Opus to decide next action
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

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
        system: SYSTEM_PROMPT,
        messages: conversationHistory,
        tools: [
          {
            name: "maigret_search",
            description:
              "Search for a username across 3,000+ sites using Maigret. Returns profile URLs and metadata.",
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
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      await ctx.runMutation(api.investigations.updateStatus, {
        id: args.investigationId,
        status: "failed",
      });
      return;
    }

    const data = await response.json();
    const stepNumber = await ctx.runMutation(api.investigations.incrementStep, {
      id: args.investigationId,
    });

    // Process the response
    let reasoning = "";
    let toolCall: ToolCall | null = null;

    for (const block of data.content) {
      if (block.type === "text") {
        reasoning = block.text;
      } else if (block.type === "tool_use") {
        toolCall = { tool: block.name, args: block.input };
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

    if (!toolCall) {
      // No tool call — might be done or confused
      await generateReport(ctx, args.investigationId, args.conversationHistory);
      return;
    }

    // Execute the tool
    let toolResult = "";

    try {
      switch (toolCall.tool) {
        case "maigret_search": {
          await ctx.runMutation(api.investigations.addStep, {
            investigationId: args.investigationId,
            stepNumber,
            action: `Running Maigret search for "${toolCall.args.username}"`,
            tool: "maigret",
          });
          const maigretResult = await ctx.runAction(
            internal.tools.maigret.search,
            { username: toolCall.args.username as string }
          );
          toolResult = JSON.stringify(maigretResult);
          break;
        }

        case "browser_action": {
          await ctx.runMutation(api.investigations.addStep, {
            investigationId: args.investigationId,
            stepNumber,
            action: `Browser: ${(toolCall.args.instruction as string).slice(0, 200)}`,
            tool: "browser_action",
          });
          const browserResult = await ctx.runAction(
            internal.tools.browserUse.runTask,
            {
              task: toolCall.args.instruction as string,
              sessionId: investigation.browserSessionId ?? undefined,
            }
          );
          toolResult = JSON.stringify(browserResult);

          // Update browser session info if we got one
          if (browserResult?.session_id || browserResult?.live_url) {
            await ctx.runMutation(api.investigations.updateBrowserSession, {
              id: args.investigationId,
              browserSessionId: browserResult.session_id,
              browserLiveUrl: browserResult.live_url,
            });
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
          const faceResult = await ctx.runAction(
            internal.tools.faceCheck.searchByImage,
            { imageUrl: toolCall.args.imageUrl as string }
          );
          toolResult = JSON.stringify(faceResult);
          break;
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
            investigationId: args.investigationId,
            source: findingArgs.source,
            category: findingArgs.category,
            platform: findingArgs.platform,
            profileUrl: findingArgs.profileUrl,
            data: findingArgs.data,
            confidence: findingArgs.confidence,
          });
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
          toolResult = `Unknown tool: ${toolCall.tool}`;
      }
    } catch (error) {
      toolResult = `Tool error: ${error instanceof Error ? error.message : String(error)}`;
    }

    // Update step with result
    await ctx.runMutation(api.investigations.addStep, {
      investigationId: args.investigationId,
      stepNumber,
      action: `Result from ${toolCall.tool}`,
      tool: toolCall.tool,
      result: toolResult.slice(0, 2000),
    });

    // Continue the conversation
    const updatedHistory = [
      ...conversationHistory,
      { role: "assistant", content: data.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: data.content.find(
              (b: { type: string }) => b.type === "tool_use"
            )?.id,
            content: toolResult.slice(0, 4000),
          },
        ],
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
  ctx: Pick<ActionCtx, "runQuery" | "runMutation">,
  investigationId: string,
  conversationHistory: string
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const findings = await ctx.runQuery(api.investigations.getFindings, {
    investigationId: investigationId as any,
  });

  const history = JSON.parse(conversationHistory);
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
      messages: history,
    }),
  });

  if (!response.ok) {
    await ctx.runMutation(api.investigations.updateStatus, {
      id: investigationId as any,
      status: "failed",
    });
    return;
  }

  const data = await response.json();
  const report =
    data.content.find((b: { type: string }) => b.type === "text")?.text || "";

  await ctx.runMutation(api.investigations.updateReport, {
    id: investigationId as any,
    report,
    confidence: calculateOverallConfidence(findings),
  });

  await ctx.runMutation(api.investigations.updateStatus, {
    id: investigationId as any,
    status: "complete",
  });
}

function calculateOverallConfidence(
  findings: { confidence: number }[]
): number {
  if (findings.length === 0) return 0;
  const sum = findings.reduce((acc, f) => acc + f.confidence, 0);
  return Math.round(sum / findings.length);
}
