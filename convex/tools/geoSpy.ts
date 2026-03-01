import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const predict = internalAction({
  args: {
    imageUrl: v.string(),
  },
  handler: async (_, args) => {
    const apiKey = process.env.GEOSPY_API_KEY;
    if (!apiKey) throw new Error("GEOSPY_API_KEY not set");

    if (!args.imageUrl.startsWith("http://") && !args.imageUrl.startsWith("https://")) {
      throw new Error("Invalid image URL: must start with http:// or https://");
    }

    // Fetch image and convert to base64
    const imageRes = await fetch(args.imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch image (${imageRes.status}): ${args.imageUrl.slice(0, 200)}`);
    }
    const imageBuffer = await imageRes.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    const res = await fetch("https://dev.geospy.ai/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        image: base64Image,
        top_k: 5,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("GeoSpy prediction error:", errBody);
      throw new Error(`GeoSpy prediction failed (${res.status}): ${errBody.slice(0, 300)}`);
    }

    const data = await res.json();
    const top = data.geo_predictions?.[0];

    if (!top) {
      return {
        city: null,
        state: null,
        country: null,
        latitude: null,
        longitude: null,
        explanation: "No predictions returned",
        predictions: [],
      };
    }

    // Parse address string (e.g. "City, State, Country") into parts
    const addressParts = (top.address || "").split(",").map((s: string) => s.trim());
    const city = addressParts[0] || null;
    const state = addressParts.length >= 3 ? addressParts[1] : null;
    const country = addressParts[addressParts.length - 1] || null;

    return {
      city,
      state,
      country,
      latitude: top.coordinates?.[0] ?? null,
      longitude: top.coordinates?.[1] ?? null,
      explanation: `GeoSpy predicted location: ${top.address || "unknown"} (score: ${top.score?.toFixed(2) ?? "N/A"}, similarity: ${top.similarity_score_1km?.toFixed(2) ?? "N/A"})`,
      predictions: (data.geo_predictions || []).map((p: any) => ({
        address: p.address,
        latitude: p.coordinates?.[0],
        longitude: p.coordinates?.[1],
        score: p.score,
        similarity: p.similarity_score_1km,
      })),
    };
  },
});
