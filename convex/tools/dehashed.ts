import { v } from "convex/values";
import { internalAction } from "../_generated/server";

// Dehashed via Browser Use — logs into dehashed.com web UI and performs searches
// No API subscription needed, just account credentials stored as env vars:
//   DEHASHED_EMAIL, DEHASHED_PASSWORD

const SEARCH_TYPES = [
  "email",
  "username",
  "name",
  "phone",
  "ip_address",
  "address",
  "domain",
  "password",
  "hashed_password",
  "vin",
] as const;

type SearchType = (typeof SEARCH_TYPES)[number];

export const search = internalAction({
  args: {
    query: v.string(),
    searchType: v.string(),
  },
  handler: async (_, args) => {
    const email = process.env.DEHASHED_EMAIL;
    const password = process.env.DEHASHED_PASSWORD;
    const browserUseKey = process.env.BROWSER_USE_API_KEY;

    if (!email || !password) {
      throw new Error("DEHASHED_EMAIL and DEHASHED_PASSWORD must both be set");
    }
    if (!browserUseKey) {
      throw new Error("BROWSER_USE_API_KEY not set");
    }

    const searchType = args.searchType as SearchType;
    if (!SEARCH_TYPES.includes(searchType)) {
      throw new Error(
        `Invalid search type: ${searchType}. Must be one of: ${SEARCH_TYPES.join(", ")}`
      );
    }

    // Use Browser Use to log in and search
    const instruction = `
1. Go to https://www.dehashed.com/login
2. Log in with email "${email}" and password "${password}"
3. After login, go to https://www.dehashed.com/search?query=${encodeURIComponent(`${searchType}:${args.query}`)}
4. Wait for search results to load
5. Extract ALL visible results from the table. For each row, capture: email, username, password (if shown), hashed_password, name, phone, ip_address, address, database_name (breach source)
6. Return the complete data as structured text, one entry per line with fields separated by " | "

If there's a CAPTCHA, solve it. If login fails, report the error.
If "No results found", report that clearly.
Do NOT navigate away from dehashed.com.
`;

    // Create a Browser Use task
    const createRes = await fetch("https://api.browser-use.com/api/v1/run-task", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${browserUseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: instruction,
        model: "bu-max",
      }),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text();
      throw new Error(`Browser Use task creation failed (${createRes.status}): ${errBody.slice(0, 300)}`);
    }

    const { id: taskId } = await createRes.json();
    if (!taskId) throw new Error("Browser Use returned no task ID");

    // Poll for completion (max 3 minutes)
    const MAX_POLLS = 36;
    const POLL_MS = 5000;

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_MS));

      const pollRes = await fetch(
        `https://api.browser-use.com/api/v1/task/${taskId}`,
        {
          headers: { Authorization: `Bearer ${browserUseKey}` },
        }
      );

      if (!pollRes.ok) continue;

      const task = await pollRes.json();

      if (task.status === "finished") {
        const output = task.output || task.result || "No output";
        return {
          query: args.query,
          searchType: args.searchType,
          rawOutput: typeof output === "string" ? output : JSON.stringify(output),
          source: "dehashed_browser",
        };
      }

      if (task.status === "failed" || task.status === "error") {
        throw new Error(`Browser task failed: ${task.error || task.output || "Unknown error"}`);
      }
    }

    throw new Error("Dehashed browser search timed out after 3 minutes");
  },
});
