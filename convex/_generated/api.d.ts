/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as directives from "../directives.js";
import type * as graphEdges from "../graphEdges.js";
import type * as integrationTests from "../integrationTests.js";
import type * as investigations from "../investigations.js";
import type * as orchestrator from "../orchestrator.js";
import type * as reports from "../reports.js";
import type * as toolNames from "../toolNames.js";
import type * as tools_braveSearch from "../tools/braveSearch.js";
import type * as tools_browserUse from "../tools/browserUse.js";
import type * as tools_intelx from "../tools/intelx.js";
import type * as tools_maigret from "../tools/maigret.js";
import type * as tools_picarta from "../tools/picarta.js";
import type * as tools_reverseImageSearch from "../tools/reverseImageSearch.js";
import type * as tools_whitePages from "../tools/whitePages.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  directives: typeof directives;
  graphEdges: typeof graphEdges;
  integrationTests: typeof integrationTests;
  investigations: typeof investigations;
  orchestrator: typeof orchestrator;
  reports: typeof reports;
  toolNames: typeof toolNames;
  "tools/braveSearch": typeof tools_braveSearch;
  "tools/browserUse": typeof tools_browserUse;
  "tools/intelx": typeof tools_intelx;
  "tools/maigret": typeof tools_maigret;
  "tools/picarta": typeof tools_picarta;
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
