import { v } from "convex/values";
import { internalAction } from "../_generated/server";

const SIDECAR_URL = "http://localhost:8000";

export const search = internalAction({
  args: {
    username: v.string(),
  },
  handler: async (_, args) => {
    try {
      const res = await fetch(
        `${SIDECAR_URL}/search?username=${encodeURIComponent(args.username)}`,
        { signal: AbortSignal.timeout(60000) }
      );

      if (!res.ok) {
        throw new Error(`Maigret sidecar returned ${res.status}`);
      }

      return await res.json();
    } catch (error) {
      // Non-blocking: if Maigret sidecar is down, return empty results
      console.error("Maigret sidecar error:", error);
      return {
        error: "Maigret sidecar unavailable",
        results: {},
      };
    }
  },
});
