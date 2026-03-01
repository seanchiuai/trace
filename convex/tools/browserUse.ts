import { v } from "convex/values";
import { internalAction } from "../_generated/server";

const BROWSER_USE_API = "https://api.browser-use.com/api/v3";

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

// v3: POST /sessions creates a session AND starts the task in one call.
// Without sessionId it creates a new session; with sessionId it reuses one.
export const createSession = internalAction({
  args: {},
  handler: async () => {
    // In v3, we create a session by posting a no-op task with keepAlive
    const res = await fetch(`${BROWSER_USE_API}/sessions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        task: "Wait for further instructions.",
        keepAlive: true,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Browser Use session creation error:", errBody);
      throw new Error(`Browser Use session creation failed (${res.status}): ${errBody.slice(0, 300)}`);
    }
    const session = await res.json();
    return { id: session.id, liveUrl: session.liveUrl };
  },
});

export const runTask = internalAction({
  args: {
    task: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (_, args) => {
    const body: Record<string, unknown> = {
      task: args.task,
      keepAlive: true,
    };
    if (args.sessionId) {
      body.sessionId = args.sessionId;
    }

    // Create a session+task (or run task in existing session)
    const createRes = await fetch(`${BROWSER_USE_API}/sessions`, {
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
    const sessionId = created.id;

    // If already finished (fast task), return immediately
    if (created.status === "idle" || created.status === "stopped") {
      return {
        output: created.output,
        sessionId,
        liveUrl: created.liveUrl,
        status: created.status,
      };
    }

    // Poll GET /sessions/{id} until finished (max 120 attempts x 2s = 4 min)
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pollRes = await fetch(`${BROWSER_USE_API}/sessions/${sessionId}`, {
        headers: { "X-Browser-Use-API-Key": getApiKey() },
      });

      if (!pollRes.ok) {
        const errBody = await pollRes.text();
        throw new Error(`Browser Use poll failed (${pollRes.status}): ${errBody.slice(0, 300)}`);
      }
      const session = await pollRes.json();

      // "idle" means task finished, session still alive (keepAlive=true)
      if (session.status === "idle" || session.status === "stopped") {
        return {
          output: session.output,
          sessionId,
          liveUrl: session.liveUrl,
          status: session.status,
        };
      }
      if (session.status === "error" || session.status === "timed_out") {
        throw new Error(`Browser Use task failed: ${session.output || session.status}`);
      }
      // "running" or "created" — keep polling
    }

    throw new Error("Browser Use task timed out after 4 minutes");
  },
});

export const getTaskStatus = internalAction({
  args: { taskId: v.string() },
  handler: async (_, args) => {
    // v3: tasks are sessions, so poll the session
    const res = await fetch(`${BROWSER_USE_API}/sessions/${args.taskId}`, {
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
    // v3: POST /sessions/{id}/stop
    const res = await fetch(`${BROWSER_USE_API}/sessions/${args.sessionId}/stop`, {
      method: "POST",
      headers: getHeaders(),
    });

    // 404 is fine — session may already be gone
    if (!res.ok && res.status !== 404) {
      throw new Error(`Browser Use session stop failed: ${res.status}`);
    }
    return { stopped: true };
  },
});
