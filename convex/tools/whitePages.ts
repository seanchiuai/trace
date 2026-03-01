import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const findPerson = internalAction({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    stateCode: v.optional(v.string()),
  },
  handler: async (_, args) => {
    const apiKey = process.env.WHITEPAGES_API_KEY;
    if (!apiKey) throw new Error("WHITEPAGES_API_KEY not set");

    if (!args.name && !args.phone) {
      throw new Error("At least one of name or phone is required");
    }

    // Build query params (v1 API)
    const params = new URLSearchParams();
    if (args.name) params.set("name", args.name);
    if (args.phone) params.set("phone", args.phone);
    if (args.city) params.set("city", args.city);
    if (args.stateCode) params.set("state_code", args.stateCode);

    const res = await fetch(
      `https://api.whitepages.com/v1/person?${params.toString()}`,
      {
        headers: { "X-Api-Key": apiKey },
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("WhitePages lookup error:", errBody);
      throw new Error(`WhitePages lookup failed (${res.status}): ${errBody.slice(0, 300)}`);
    }

    const data = await res.json();

    // v1 API returns a top-level array of person records
    const persons = Array.isArray(data) ? data : [];

    const results = persons.map((person: Record<string, unknown>) => ({
      name: (person.name as string) || null,
      aliases: (person.aliases as string[]) || [],
      isDead: person.is_dead ?? null,
      dateOfBirth: (person.date_of_birth as string) || null,
      // Addresses come as { id, address } where address is a full string
      currentAddresses: (
        (person.current_addresses as Array<{ id: string; address: string }>) ||
        []
      ).map((a) => a.address),
      historicAddresses: (
        (person.historic_addresses as Array<{ id: string; address: string }>) ||
        []
      ).map((a) => a.address),
      ownedProperties: (
        (person.owned_properties as Array<{ id: string; address: string }>) ||
        []
      ).map((a) => a.address),
      phones: (
        (person.phones as Array<{ number: string; type: string; score: number }>) ||
        []
      ).map((p) => ({
        number: p.number || null,
        type: p.type || null,
        score: p.score ?? null,
      })),
      emails: (person.emails as string[]) || [],
      linkedinUrl: (person.linkedin_url as string) || null,
      company: (person.company_name as string) || null,
      jobTitle: (person.job_title as string) || null,
      relatives: (
        (person.relatives as Array<{ id: string; name: string }>) || []
      ).map((r) => r.name),
    }));

    return { results, query: args };
  },
});
