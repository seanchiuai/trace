import { v } from "convex/values";
import { action } from "../_generated/server";

const BROWSER_USE_API = "https://api.browser-use.com/api/v1";

export const createSession = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.BROWSER_USE_API_KEY;
    if (!apiKey) throw new Error("BROWSER_USE_API_KEY not set");

    const res = await fetch(`${BROWSER_USE_API}/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) throw new Error(`Browser Use session creation failed: ${res.status}`);
    return await res.json();
  },
});

export const runTask = action({
  args: {
    task: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (_, args) => {
    const apiKey = process.env.BROWSER_USE_API_KEY;
    if (!apiKey) throw new Error("BROWSER_USE_API_KEY not set");

    const body: Record<string, unknown> = {
      task: args.task,
    };
    if (args.sessionId) {
      body.session_id = args.sessionId;
    }

    const res = await fetch(`${BROWSER_USE_API}/run-task`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Browser Use task failed: ${res.status}`);
    return await res.json();
  },
});

export const getTaskStatus = action({
  args: { taskId: v.string() },
  handler: async (_, args) => {
    const apiKey = process.env.BROWSER_USE_API_KEY;
    if (!apiKey) throw new Error("BROWSER_USE_API_KEY not set");

    const res = await fetch(`${BROWSER_USE_API}/task/${args.taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) throw new Error(`Browser Use status check failed: ${res.status}`);
    return await res.json();
  },
});
