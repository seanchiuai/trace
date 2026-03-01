import { v } from "convex/values";
import { internalAction } from "../_generated/server";

const SERPAPI_URL = "https://serpapi.com/search";

export const search = internalAction({
  args: {
    imageUrl: v.string(),
  },
  handler: async (_, args) => {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) throw new Error("SERPAPI_API_KEY not set");

    const params = new URLSearchParams({
      engine: "google_lens",
      url: args.imageUrl,
      api_key: apiKey,
    });

    const res = await fetch(`${SERPAPI_URL}?${params}`);

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`SerpAPI Google Lens failed (${res.status}): ${errBody}`);
    }

    const data = await res.json();

    const visualMatches = (data.visual_matches ?? [])
      .slice(0, 15)
      .map((m: { title?: string; link?: string; source?: string; thumbnail?: string }) => ({
        title: m.title ?? null,
        url: m.link ?? null,
        source: m.source ?? null,
        thumbnail: m.thumbnail ?? null,
      }));

    const knowledgeGraph = data.knowledge_graph
      ? {
          title: data.knowledge_graph.title ?? null,
          subtitle: data.knowledge_graph.subtitle ?? null,
          description: data.knowledge_graph.description ?? null,
          link: data.knowledge_graph.link ?? null,
        }
      : null;

    const textResults = (data.text_results ?? [])
      .slice(0, 10)
      .map((t: { text?: string; link?: string }) => ({
        text: t.text ?? null,
        link: t.link ?? null,
      }));

    return {
      visualMatches,
      knowledgeGraph,
      textResults,
      totalMatches: visualMatches.length,
      searchUrl: data.search_metadata?.google_lens_url ?? null,
    };
  },
});
