import { v } from "convex/values";
import { internalAction } from "../_generated/server";

const BROWSER_USE_API = "https://api.browser-use.com/api/v2";

function getApiKey(): string {
  const apiKey = process.env.BROWSER_USE_API_KEY;
  if (!apiKey) throw new Error("BROWSER_USE_API_KEY not set");
  return apiKey;
}

function getHeaders(): Record<string, string> {
  return {
    "X-Browser-Use-API-Key": getApiKey(),
    "Content-Type": "application/json",
  };
}

export const createSession = internalAction({
  args: {},
  handler: async () => {
    const res = await fetch(`${BROWSER_USE_API}/sessions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Browser Use session creation error:", errBody);
      throw new Error(`Browser Use session creation failed (${res.status}): ${errBody.slice(0, 300)}`);
    }
    return await res.json();
  },
});

export const runTask = internalAction({
  args: {
    task: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (_, args) => {
    const body: Record<string, unknown> = { task: args.task };
    if (args.sessionId) {
      body.session_id = args.sessionId;
    }

    // Create the task
    const createRes = await fetch(`${BROWSER_USE_API}/tasks`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text();
      console.error("Browser Use task creation error:", errBody);
      throw new Error(`Browser Use task creation failed (${createRes.status}): ${errBody.slice(0, 300)}`);
    }
    const created = await createRes.json();
    const taskId = created.id;

    // Poll until finished/failed (max 120 attempts × 2s = 4 min)
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pollRes = await fetch(`${BROWSER_USE_API}/tasks/${taskId}`, {
        headers: { "X-Browser-Use-API-Key": getApiKey() },
      });

      if (!pollRes.ok) throw new Error(`Browser Use poll failed: ${pollRes.status}`);
      const task = await pollRes.json();

      if (task.status === "finished") {
        return task;
      }
      if (task.status === "failed") {
        throw new Error(`Browser Use task failed: ${task.error || "unknown error"}`);
      }
    }

    throw new Error("Browser Use task timed out after 4 minutes");
  },
});

export const getTaskStatus = internalAction({
  args: { taskId: v.string() },
  handler: async (_, args) => {
    const res = await fetch(`${BROWSER_USE_API}/tasks/${args.taskId}`, {
      headers: { "X-Browser-Use-API-Key": getApiKey() },
    });

    if (!res.ok) throw new Error(`Browser Use status check failed: ${res.status}`);
    return await res.json();
  },
});

export const getSession = internalAction({
  args: { sessionId: v.string() },
  handler: async (_, args) => {
    const res = await fetch(`${BROWSER_USE_API}/sessions/${args.sessionId}`, {
      headers: { "X-Browser-Use-API-Key": getApiKey() },
    });

    if (!res.ok) throw new Error(`Browser Use session fetch failed: ${res.status}`);
    return await res.json();
  },
});

export const stopSession = internalAction({
  args: { sessionId: v.string() },
  handler: async (_, args) => {
    const res = await fetch(`${BROWSER_USE_API}/sessions/${args.sessionId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ action: "stop" }),
    });

    // 404 is fine — session may already be gone
    if (!res.ok && res.status !== 404) {
      throw new Error(`Browser Use session stop failed: ${res.status}`);
    }
    return { stopped: true };
  },
});
