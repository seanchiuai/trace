import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

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
] as const;

type SearchType = (typeof SEARCH_TYPES)[number];

export const search = internalAction({
  args: {
    query: v.string(),
    searchType: v.string(),
  },
  handler: async (ctx, args): Promise<{ query: string; searchType: string; rawOutput: string; source: string }> => {
    const email = process.env.DEHASHED_EMAIL;
    const password = process.env.DEHASHED_PASSWORD;

    if (!email || !password) {
      throw new Error("DEHASHED_EMAIL and DEHASHED_PASSWORD must both be set");
    }

    const searchType = args.searchType as SearchType;
    if (!SEARCH_TYPES.includes(searchType)) {
      throw new Error(
        `Invalid search type: ${searchType}. Must be one of: ${SEARCH_TYPES.join(", ")}`
      );
    }

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

    const result = await ctx.runAction(internal.tools.browserUse.runTask, {
      task: instruction,
    });

    return {
      query: args.query,
      searchType: args.searchType,
      rawOutput: typeof result.output === "string" ? result.output : JSON.stringify(result.output),
      source: "dehashed_browser",
    };
  },
});
