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

    const params = new URLSearchParams({ api_key: apiKey });
    if (args.name) params.set("name", args.name);
    if (args.phone) params.set("phone", args.phone);
    if (args.city) params.set("address.city", args.city);
    if (args.stateCode) params.set("address.state_code", args.stateCode);

    const res = await fetch(
      `https://proapi.whitepages.com/3.0/person?${params.toString()}`
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("WhitePages lookup error:", errBody);
      throw new Error(`WhitePages lookup failed (${res.status}): ${errBody.slice(0, 300)}`);
    }

    const data = await res.json();

    // Normalize the response into a consistent shape
    const results = (data.person || []).map((person: any) => ({
      name: person.name || null,
      age: person.age_range || null,
      phones: (person.phones || []).map((p: any) => ({
        number: p.phone_number || null,
        type: p.line_type || null,
        carrier: p.carrier || null,
      })),
      addresses: (person.found_at_address
        ? [person.found_at_address, ...(person.historical_addresses || [])]
        : person.historical_addresses || []
      ).map((addr: any) => ({
        address: addr.street_line_1 || null,
        city: addr.city || null,
        state: addr.state_code || null,
        zip: addr.postal_code || null,
        lat: addr.lat_long?.latitude ?? null,
        lng: addr.lat_long?.longitude ?? null,
      })),
      associatedPeople: (person.associated_people || []).map((ap: any) => ({
        name: ap.name || null,
        relation: ap.relation || null,
      })),
    }));

    return { results, query: args };
  },
});
