import { useMemo } from "react";

interface Step {
  _id: string;
  tool: string;
  stepNumber: number;
  createdAt: number;
}

/**
 * Derives the currently active tool from the investigation steps array.
 * Returns the tool name and stepId of the most recent step while live.
 */
export function useActiveTool(
  steps: Step[],
  isLive: boolean
): { tool: string | null; stepId: string | null } {
  return useMemo(() => {
    if (!isLive || steps.length === 0) {
      return { tool: null, stepId: null };
    }

    // Steps are ordered by stepNumber; grab the latest
    const latest = steps[steps.length - 1];
    // Skip "directive" steps — they're internal
    if (latest.tool === "directive") {
      // Find the most recent non-directive step
      for (let i = steps.length - 2; i >= 0; i--) {
        if (steps[i].tool !== "directive") {
          return { tool: steps[i].tool, stepId: steps[i]._id };
        }
      }
      return { tool: null, stepId: null };
    }

    return { tool: latest.tool, stepId: latest._id };
  }, [steps, isLive]);
}
