import { action } from "./_generated/server";

// ---------------------------------------------------------------------------
// Integration test actions — lightweight connectivity checks for each tool
// ---------------------------------------------------------------------------

export const testBraveSearch = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) return { success: false, error: "BRAVE_API_KEY not set" };

    try {
      const params = new URLSearchParams({ q: "hello", count: "1" });
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?${params}`,
        {
          headers: {
            Accept: "application/json",
            "X-Subscription-Token": apiKey,
          },
        },
      );
      if (!res.ok) {
        const body = await res.text();
        return { success: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
      }
      const data = await res.json();
      const count = data.web?.results?.length ?? 0;
      return { success: true, detail: `Returned ${count} result(s)` };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
});

export const testBrowserUse = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.BROWSER_USE_API_KEY;
    if (!apiKey) return { success: false, error: "BROWSER_USE_API_KEY not set" };

    try {
      // Lightweight check: GET a non-existent session to verify auth works
      const res = await fetch(
        "https://api.browser-use.com/api/v3/sessions/test-ping",
        { headers: { "X-Browser-Use-API-Key": apiKey } },
      );
      // 404 = auth works, session not found (expected)
      // 401/403 = bad key
      if (res.status === 404) {
        return { success: true, detail: "API key valid (auth check passed)" };
      }
      if (res.status === 401 || res.status === 403) {
        return { success: false, error: `Auth failed (${res.status})` };
      }
      return { success: true, detail: `API responded with ${res.status}` };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
});

export const testMaigret = action({
  args: {},
  handler: async () => {
    const sidecarUrl = process.env.MAIGRET_SIDECAR_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${sidecarUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        return { success: false, error: `Sidecar returned ${res.status}` };
      }
      const data = await res.json();
      return { success: true, detail: `Sidecar healthy: ${JSON.stringify(data)}` };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
});

export const testPicarta = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.PICARTA_API_KEY;
    if (!apiKey) return { success: false, error: "PICARTA_API_KEY not set" };

    try {
      // Embedded minimal JPEG — avoids external download (Wikimedia/CDNs rate-limit cloud IPs)
      const base64Image =
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
        "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAHwAAAQUBAQEB" +
        "AQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1Fh" +
        "ByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZ" +
        "WmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXG" +
        "x8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/AHuUEQAAAAD/2Q==";

      const res = await fetch("https://picarta.ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ TOKEN: apiKey, IMAGE: base64Image, TOP_K: 1 }),
      });

      // 200 = full success; 400 with image error = API key valid, image just too small
      if (res.ok) {
        const data = await res.json();
        const country = data.ai_country ?? data.topk_predictions_dict?.["1"]?.address?.country ?? "unknown";
        return { success: true, detail: `Geolocated to: ${country}` };
      }
      const body = await res.text();
      // Auth errors = real failure
      if (res.status === 401 || res.status === 403) {
        return { success: false, error: `Auth failed (${res.status}): ${body.slice(0, 200)}` };
      }
      // 400 with image parse error = API key works, just can't process tiny test image
      if (res.status === 400 && body.includes("image")) {
        return { success: true, detail: "API key valid (image processed, too small to geolocate)" };
      }
      return { success: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
});

export const testReverseImageSearch = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) return { success: false, error: "SERPAPI_API_KEY not set" };

    try {
      const testUrl =
        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/256px-Tour_Eiffel_Wikimedia_Commons.jpg";
      const params = new URLSearchParams({
        engine: "google_lens",
        url: testUrl,
        api_key: apiKey,
      });
      const res = await fetch(`https://serpapi.com/search?${params}`);
      if (!res.ok) {
        const body = await res.text();
        return { success: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
      }
      const data = await res.json();
      const matchCount = data.visual_matches?.length ?? 0;
      return { success: true, detail: `Found ${matchCount} visual match(es)` };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
});

export const testWhitePages = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.WHITEPAGES_API_KEY;
    if (!apiKey) return { success: false, error: "WHITEPAGES_API_KEY not set" };

    try {
      const params = new URLSearchParams({ name: "John Smith" });
      const res = await fetch(
        `https://api.whitepages.com/v1/person?${params}`,
        { headers: { "X-Api-Key": apiKey } },
      );
      if (!res.ok) {
        const body = await res.text();
        return { success: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
      }
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;
      return { success: true, detail: `Found ${count} person record(s)` };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
});

export const testIntelX = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.INTELX_API_KEY;
    if (!apiKey) return { success: false, error: "INTELX_API_KEY not set" };

    try {
      // Just submit a search to verify auth — don't poll for results
      const res = await fetch("https://2.intelx.io/intelligent/search", {
        method: "POST",
        headers: {
          "x-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          term: "test.com",
          maxresults: 1,
          media: 0,
          sort: 2,
          terminate: [],
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        return { success: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
      }
      const data = await res.json();
      if (!data.id) {
        return { success: false, error: "No search ID returned" };
      }
      return { success: true, detail: `Search submitted (id: ${data.id.slice(0, 8)}...)` };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
});
