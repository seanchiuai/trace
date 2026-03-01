import { v } from "convex/values";
import { internalAction } from "../_generated/server";

// Dehashed API — breach database search
// Docs: GET https://api.dehashed.com/search?query=<field>:<value>&size=<n>
// Auth: Basic (email:api_key), Header: Accept: application/json

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

interface DehashedEntry {
  id: string;
  email: string;
  ip_address: string;
  username: string;
  password: string;
  hashed_password: string;
  name: string;
  phone: string;
  address: string;
  vin: string;
  database_name: string;
}

export const search = internalAction({
  args: {
    query: v.string(),
    searchType: v.string(),
    size: v.optional(v.number()),
  },
  handler: async (_, args) => {
    const apiKey = process.env.DEHASHED_API_KEY;
    const email = process.env.DEHASHED_EMAIL;
    if (!apiKey || !email) {
      throw new Error("DEHASHED_API_KEY and DEHASHED_EMAIL must both be set");
    }

    const searchType = args.searchType as SearchType;
    if (!SEARCH_TYPES.includes(searchType)) {
      throw new Error(
        `Invalid search type: ${searchType}. Must be one of: ${SEARCH_TYPES.join(", ")}`
      );
    }

    const size = Math.min(args.size ?? 20, 100);

    const params = new URLSearchParams({
      query: `${searchType}:${args.query}`,
      size: String(size),
    });

    const res = await fetch(
      `https://api.dehashed.com/search?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          Authorization:
            "Basic " +
            btoa(`${email}:${apiKey}`),
        },
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(
        `Dehashed search failed (${res.status}): ${errBody.slice(0, 300)}`
      );
    }

    const data = await res.json();

    if (data.success === false) {
      throw new Error("Dehashed API authentication failed");
    }

    const entries: DehashedEntry[] = data.entries || [];

    // Normalize and deduplicate
    const results = entries.slice(0, size).map((e) => ({
      email: e.email || null,
      username: e.username || null,
      password: e.password || null,
      hashedPassword: e.hashed_password || null,
      name: e.name || null,
      phone: e.phone || null,
      ipAddress: e.ip_address || null,
      address: e.address || null,
      database: e.database_name || null,
    }));

    // Summary stats for the agent
    const uniqueEmails = [
      ...new Set(results.map((r) => r.email).filter(Boolean)),
    ];
    const uniqueUsernames = [
      ...new Set(results.map((r) => r.username).filter(Boolean)),
    ];
    const passwordsFound = results.filter((r) => r.password).length;
    const breachSources = [
      ...new Set(results.map((r) => r.database).filter(Boolean)),
    ];

    return {
      query: args.query,
      searchType: args.searchType,
      total: data.total ?? results.length,
      results,
      summary: {
        uniqueEmails: uniqueEmails.length,
        uniqueUsernames: uniqueUsernames.length,
        passwordsFound,
        breachSources,
        totalResults: data.total ?? results.length,
      },
    };
  },
});
