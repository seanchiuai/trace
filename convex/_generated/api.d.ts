/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as graphEdges from "../graphEdges.js";
import type * as investigations from "../investigations.js";
import type * as orchestrator from "../orchestrator.js";
import type * as reports from "../reports.js";
import type * as tools_braveSearch from "../tools/braveSearch.js";
import type * as tools_browserUse from "../tools/browserUse.js";
import type * as tools_geoSpy from "../tools/geoSpy.js";
import type * as tools_intelx from "../tools/intelx.js";
import type * as tools_maigret from "../tools/maigret.js";
import type * as tools_reverseImageSearch from "../tools/reverseImageSearch.js";
import type * as tools_whitePages from "../tools/whitePages.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  graphEdges: typeof graphEdges;
  investigations: typeof investigations;
  orchestrator: typeof orchestrator;
  reports: typeof reports;
  "tools/braveSearch": typeof tools_braveSearch;
  "tools/browserUse": typeof tools_browserUse;
  "tools/geoSpy": typeof tools_geoSpy;
  "tools/intelx": typeof tools_intelx;
  "tools/maigret": typeof tools_maigret;
  "tools/reverseImageSearch": typeof tools_reverseImageSearch;
  "tools/whitePages": typeof tools_whitePages;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
