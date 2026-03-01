import { v } from "convex/values";
import { internalAction } from "../_generated/server";

const INTELX_API = "https://2.intelx.io";
const MAX_POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const search = internalAction({
  args: {
    term: v.string(),
    maxResults: v.optional(v.number()),
  },
  handler: async (_, args) => {
    const apiKey = process.env.INTELX_API_KEY;
    if (!apiKey) throw new Error("INTELX_API_KEY not set");

    const maxResults = Math.min(args.maxResults ?? 10, 20);

    // Step 1: Submit search
    const searchRes = await fetch(`${INTELX_API}/intelligent/search`, {
      method: "POST",
      headers: {
        "x-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        term: args.term,
        maxresults: maxResults,
        media: 0,
        sort: 2,
        terminate: [],
      }),
    });

    if (!searchRes.ok) {
      const errBody = await searchRes.text();
      throw new Error(`IntelX search failed (${searchRes.status}): ${errBody}`);
    }

    const { id } = await searchRes.json();
    if (!id) throw new Error("IntelX search returned no ID");

    // Step 2: Poll for results
    let results: Array<{
      name: string;
      date: string;
      bucket: string;
      mediah: number;
      storageid: string;
      systemid: string;
    }> = [];
    let searchComplete = false;
    let timedOut = false;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const params = new URLSearchParams({
        id,
        limit: String(maxResults),
      });

      const pollRes = await fetch(
        `${INTELX_API}/intelligent/search/result?${params}`,
        {
          headers: { "x-key": apiKey },
        }
      );

      if (!pollRes.ok) {
        const errBody = await pollRes.text();
        throw new Error(`IntelX poll failed (${pollRes.status}): ${errBody}`);
      }

      const pollData = await pollRes.json();

      if (pollData.records && pollData.records.length > 0) {
        results = pollData.records;
      }

      // status >= 2 means search is finished
      if (pollData.status >= 2) {
        searchComplete = true;
        break;
      }
    }

    if (!searchComplete) {
      timedOut = true;
    }

    const formattedResults = results.slice(0, maxResults).map(
      (r) => ({
        name: r.name ?? "Unknown",
        date: r.date ?? null,
        bucket: r.bucket ?? null,
        mediaType: r.mediah ?? 0,
        storageId: r.storageid ?? null,
        systemId: r.systemid ?? null,
      })
    );

    return {
      term: args.term,
      results: formattedResults,
      totalResults: formattedResults.length,
      searchComplete,
      timedOut,
    };
  },
});
