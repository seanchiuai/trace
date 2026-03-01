/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as investigations from "../investigations.js";
import type * as orchestrator from "../orchestrator.js";
import type * as reports from "../reports.js";
import type * as tools_browserUse from "../tools/browserUse.js";
import type * as tools_faceCheck from "../tools/faceCheck.js";
import type * as tools_maigret from "../tools/maigret.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  investigations: typeof investigations;
  orchestrator: typeof orchestrator;
  reports: typeof reports;
  "tools/browserUse": typeof tools_browserUse;
  "tools/faceCheck": typeof tools_faceCheck;
  "tools/maigret": typeof tools_maigret;
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
