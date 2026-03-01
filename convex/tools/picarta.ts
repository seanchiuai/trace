import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const localize = internalAction({
  args: {
    imageUrl: v.string(),
  },
  handler: async (_, args) => {
    const apiKey = process.env.PICARTA_API_KEY;
    if (!apiKey) throw new Error("PICARTA_API_KEY not set");

    if (!args.imageUrl.startsWith("http://") && !args.imageUrl.startsWith("https://")) {
      throw new Error("Invalid image URL: must start with http:// or https://");
    }

    // Picarta accepts URLs directly in the IMAGE field
    const res = await fetch("https://picarta.ai/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        TOKEN: apiKey,
        IMAGE: args.imageUrl,
        TOP_K: 3,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Picarta prediction error:", errBody);
      throw new Error(`Picarta prediction failed (${res.status}): ${errBody.slice(0, 300)}`);
    }

    const data = await res.json();

    // Extract the top prediction
    const top = data.topk_predictions_dict?.["1"];

    return {
      city: top?.address?.city ?? data.city ?? null,
      province: top?.address?.province ?? data.province ?? null,
      country: top?.address?.country ?? data.ai_country ?? null,
      latitude: top?.gps?.[0] ?? data.ai_lat ?? null,
      longitude: top?.gps?.[1] ?? data.ai_lon ?? null,
      confidence: top?.confidence ?? data.ai_confidence ?? null,
      // Include runner-up predictions for context
      predictions: Object.values(data.topk_predictions_dict ?? {}).map(
        (p: any) => ({
          city: p.address?.city,
          country: p.address?.country,
          latitude: p.gps?.[0],
          longitude: p.gps?.[1],
          confidence: p.confidence,
        }),
      ),
      // EXIF metadata if present
      exifLat: data.exif_lat ?? null,
      exifLon: data.exif_lon ?? null,
      exifCountry: data.exif_country ?? null,
      cameraMaker: data.camera_maker ?? null,
      timestamp: data.timestamp ?? null,
    };
  },
});
