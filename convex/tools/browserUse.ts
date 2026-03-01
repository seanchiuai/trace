import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { api } from "../_generated/api";

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

function authHeaders(): Record<string, string> {
  return { "X-Browser-Use-API-Key": getApiKey() };
}

// ---------------------------------------------------------------------------
// v3 session statuses:
//   "created"   — session just created, sandbox spinning up
//   "idle"      — task finished, session alive (keepAlive=true), ready for next
//   "running"   — task currently executing
//   "stopped"   — session terminated (via stop or manual)
//   "timed_out" — session exceeded time limit
//   "error"     — session encountered an error
//
// Only "idle" means the session is ready to accept a new task.
// ---------------------------------------------------------------------------

const DEAD_STATUSES = new Set(["stopped", "timed_out", "error"]);

/**
 * Wait for an existing session to become idle (ready for a new task).
 * Returns the session status, or null if the session is dead/unreachable.
 */
async function waitForSessionIdle(
  sessionId: string,
  maxWaitMs: number = 60_000,
): Promise<{ idle: true } | { idle: false; reason: string }> {
  const pollInterval = 1_000;
  const maxAttempts = Math.ceil(maxWaitMs / pollInterval);

  for (let i = 0; i < maxAttempts; i++) {
    // Check first, sleep after — no wasted time on first check
    try {
      const res = await fetch(`${BROWSER_USE_API}/sessions/${sessionId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        return { idle: false, reason: `GET session returned ${res.status}` };
      }
      const session = await res.json();

      if (session.status === "idle") return { idle: true };
      if (DEAD_STATUSES.has(session.status)) {
        return { idle: false, reason: `Session is ${session.status}` };
      }
      // "created" or "running" — keep waiting
    } catch (err) {
      console.warn(`waitForSessionIdle poll error:`, err);
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  return { idle: false, reason: `Timed out after ${maxWaitMs / 1000}s` };
}

// ---------------------------------------------------------------------------
// runTask: the primary action used by the orchestrator
// ---------------------------------------------------------------------------

export const runTask = internalAction({
  args: {
    task: v.string(),
    sessionId: v.optional(v.string()),
    investigationId: v.optional(v.string()),
    extremeMode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const body: Record<string, unknown> = {
      task: args.task,
      keepAlive: true,
      model: "bu-max",
    };

    // --- Session reuse: wait for idle or drop ---
    if (args.sessionId) {
      const check = await waitForSessionIdle(args.sessionId);
      if (check.idle) {
        body.sessionId = args.sessionId;
      } else {
        console.warn(
          `Session ${args.sessionId} not reusable (${check.reason}), creating fresh session`,
        );
        // Don't set sessionId — POST /sessions will create a new one
      }
    }

    // --- Create session + run task ---
    let created: any;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const createRes = await fetch(`${BROWSER_USE_API}/sessions`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      if (createRes.ok) {
        created = await createRes.json();
        break;
      }

      const errBody = await createRes.text();

      // Don't retry 4xx (except 429 rate limit)
      if (createRes.status >= 400 && createRes.status < 500 && createRes.status !== 429) {
        throw new Error(
          `Browser Use task creation failed (${createRes.status}): ${errBody.slice(0, 300)}`,
        );
      }

      console.error(`Browser Use POST /sessions attempt ${attempt + 1} failed:`, errBody);

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 3_000));
      } else {
        throw new Error(
          `Browser Use task creation failed after ${maxRetries + 1} attempts (${createRes.status}): ${errBody.slice(0, 300)}`,
        );
      }
    }

    const sessionId = created.id;
    let liveUrl: string | undefined = created.liveUrl;

    // Push liveUrl to UI immediately so the iframe loads while we poll
    if (liveUrl && args.investigationId) {
      try {
        await ctx.runMutation(api.investigations.updateBrowserSession, {
          id: args.investigationId as any,
          browserSessionId: sessionId,
          browserLiveUrl: liveUrl,
        });
      } catch (e) {
        console.warn("Early liveUrl update failed (non-blocking):", e);
      }
    }

    // If already finished (very fast task), return immediately
    if (created.status === "idle") {
      return {
        output: created.output ?? "Task completed (no output)",
        sessionId,
        liveUrl,
        status: created.status,
      };
    }

    // --- Poll GET /sessions/{id} until finished ---
    // Fast poll: 1s for first 10 checks, then 2s after
    const maxAttempts = 200;
    for (let i = 0; i < maxAttempts; i++) {
      // Sleep AFTER first iteration — check immediately on first pass
      if (i > 0) {
        const interval = i < 10 ? 1_000 : 2_000;
        await new Promise((resolve) => setTimeout(resolve, interval));
      }

      let session: any;
      try {
        const pollRes = await fetch(`${BROWSER_USE_API}/sessions/${sessionId}`, {
          headers: authHeaders(),
        });

        if (!pollRes.ok) {
          const errBody = await pollRes.text();
          console.error(`Browser Use poll attempt ${i + 1} failed (${pollRes.status}):`, errBody);
          continue;
        }
        session = await pollRes.json();
      } catch (err) {
        console.error(`Browser Use poll fetch error (attempt ${i + 1}):`, err);
        continue;
      }

      // Capture liveUrl on first available poll
      if (!liveUrl && session.liveUrl) {
        liveUrl = session.liveUrl;
        if (args.investigationId) {
          try {
            await ctx.runMutation(api.investigations.updateBrowserSession, {
              id: args.investigationId as any,
              browserSessionId: sessionId,
              browserLiveUrl: liveUrl,
            });
          } catch (e) {
            console.warn("Poll liveUrl update failed (non-blocking):", e);
          }
        }
      }

      // "idle" = task finished, session alive (keepAlive=true)
      if (session.status === "idle") {
        return {
          output: session.output ?? "Task completed (no output)",
          sessionId,
          liveUrl: session.liveUrl || liveUrl,
          status: "idle",
        };
      }

      // "stopped" = session terminated — return whatever output exists
      if (session.status === "stopped") {
        return {
          output: session.output ?? "Session was stopped before completing",
          sessionId,
          liveUrl: session.liveUrl || liveUrl,
          status: "stopped",
        };
      }

      // Terminal errors
      if (session.status === "error") {
        throw new Error(
          `Browser Use session error: ${session.output || "Unknown error"}`,
        );
      }
      if (session.status === "timed_out") {
        throw new Error(
          `Browser Use session timed out: ${session.output || "Session exceeded time limit"}`,
        );
      }

      // "running" or "created" — keep polling
    }

    throw new Error("Browser Use task timed out after polling");
  },
});

// ---------------------------------------------------------------------------
// getSession: fetch current session state
// ---------------------------------------------------------------------------

export const getSession = internalAction({
  args: { sessionId: v.string() },
  handler: async (_, args) => {
    const res = await fetch(`${BROWSER_USE_API}/sessions/${args.sessionId}`, {
      headers: authHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Browser Use session fetch failed: ${res.status}`);
    }
    return await res.json();
  },
});

// ---------------------------------------------------------------------------
// stopSession: terminate session and destroy sandbox
// ---------------------------------------------------------------------------

export const stopSession = internalAction({
  args: { sessionId: v.string() },
  handler: async (_, args) => {
    const res = await fetch(
      `${BROWSER_USE_API}/sessions/${args.sessionId}/stop`,
      {
        method: "POST",
        headers: getHeaders(),
      },
    );

    // 404 is fine — session may already be gone
    if (!res.ok && res.status !== 404) {
      const errBody = await res.text();
      console.warn(`Browser Use session stop failed (${res.status}):`, errBody);
    }
    return { stopped: true };
  },
});
