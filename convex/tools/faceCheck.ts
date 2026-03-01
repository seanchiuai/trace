import { v } from "convex/values";
import { internalAction } from "../_generated/server";

const FACECHECK_API = "https://facecheck.id/api";

export const searchByImage = internalAction({
  args: {
    imageUrl: v.optional(v.string()),
    imageBase64: v.optional(v.string()),
  },
  handler: async (_, args) => {
    const apiKey = process.env.FACECHECK_API_KEY;
    if (!apiKey) throw new Error("FACECHECK_API_KEY not set");

    if (!args.imageUrl && !args.imageBase64) {
      throw new Error("Either imageUrl or imageBase64 is required");
    }

    // Step 1: Upload image and start search
    const searchBody: Record<string, unknown> = {
      id_search: "",
    };
    if (args.imageUrl) {
      searchBody.images = [args.imageUrl];
    } else if (args.imageBase64) {
      searchBody.images_base64 = [args.imageBase64];
    }

    const searchRes = await fetch(`${FACECHECK_API}/upload_pic`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchBody),
    });

    if (!searchRes.ok) {
      throw new Error(`FaceCheck upload failed: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    const searchId = searchData.id_search;

    // Step 2: Poll for results
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const resultRes = await fetch(`${FACECHECK_API}/search`, {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_search: searchId,
          with_progress: true,
        }),
      });

      if (!resultRes.ok) {
        throw new Error(`FaceCheck search failed: ${resultRes.status}`);
      }

      const resultData = await resultRes.json();

      if (resultData.output) {
        return {
          faces: resultData.output.items?.map(
            (item: {
              score: number;
              url: string;
              image_url: string;
              base64: string;
            }) => ({
              score: item.score,
              url: item.url,
              thumbnailUrl: item.image_url || item.base64,
              platform: extractPlatform(item.url),
            })
          ),
        };
      }

      attempts++;
    }

    throw new Error("FaceCheck search timed out");
  },
});

function extractPlatform(url: string): string {
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("facebook.com")) return "Facebook";
  if (url.includes("twitter.com") || url.includes("x.com")) return "X/Twitter";
  if (url.includes("linkedin.com")) return "LinkedIn";
  if (url.includes("tiktok.com")) return "TikTok";
  if (url.includes("youtube.com")) return "YouTube";
  return "Web";
}
