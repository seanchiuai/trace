/** Canonical tool name constants shared between frontend toggles and backend orchestrator. */

export const TOOL_NAMES = {
  WEB_SEARCH: "web_search",
  BROWSER_ACTION: "browser_action",
  MAIGRET_SEARCH: "maigret_search",
  GEO_LOCATE: "geo_locate",
  REVERSE_IMAGE_SEARCH: "reverse_image_search",
  WHITEPAGES_LOOKUP: "whitepages_lookup",
  DARKWEB_SEARCH: "darkweb_search",
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

/** Standard (always-available) tools that can be toggled. */
export const STANDARD_TOOL_DEFS = [
  { name: TOOL_NAMES.WEB_SEARCH, label: "Brave Search" },
  { name: TOOL_NAMES.BROWSER_ACTION, label: "Browser Use" },
  { name: TOOL_NAMES.MAIGRET_SEARCH, label: "Maigret OSINT" },
  { name: TOOL_NAMES.GEO_LOCATE, label: "Photo Geolocation" },
  { name: TOOL_NAMES.REVERSE_IMAGE_SEARCH, label: "Reverse Image Search" },
] as const;

/** Extreme-mode-only tools. */
export const EXTREME_TOOL_DEFS = [
  { name: TOOL_NAMES.WHITEPAGES_LOOKUP, label: "WhitePages Lookup" },
  { name: TOOL_NAMES.DARKWEB_SEARCH, label: "Dark Web Search" },
] as const;
