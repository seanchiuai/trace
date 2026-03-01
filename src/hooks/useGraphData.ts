import { useMemo } from "react";

interface Finding {
  _id: string;
  source: string;
  category: string;
  platform?: string;
  profileUrl?: string;
  data: string;
  confidence: number;
}

interface GraphEdge {
  _id: string;
  fromLabel: string;
  toLabel: string;
  fromType: string;
  toType: string;
  edgeType: string;
  platform?: string;
  reason?: string;
  confidence: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  confidence?: number;
  isRoot?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  edgeType: string;
  reason?: string;
  confidence: number;
}

export function useGraphData(
  findings: Finding[],
  edges: GraphEdge[],
  targetName: string
) {
  return useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();

    // Root node = investigation target
    const rootId = `person:${targetName}`;
    nodeMap.set(rootId, {
      id: rootId,
      label: targetName,
      type: "person",
      isRoot: true,
    });

    // Add nodes from findings
    for (const f of findings) {
      const type =
        f.category === "location"
          ? "location"
          : f.category === "social"
            ? "profile"
            : f.category === "connection"
              ? "person"
              : f.category === "activity"
                ? "activity"
                : "profile";
      const label = f.platform
        ? `${f.platform}: ${f.data.slice(0, 30)}`
        : f.data.slice(0, 40);
      const key = `${type}:${label}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, {
          id: key,
          label,
          type,
          confidence: f.confidence,
        });
      }
    }

    // Add nodes from edges
    for (const e of edges) {
      const fromKey = `${e.fromType}:${e.fromLabel}`;
      const toKey = `${e.toType}:${e.toLabel}`;
      if (!nodeMap.has(fromKey)) {
        nodeMap.set(fromKey, {
          id: fromKey,
          label: e.fromLabel,
          type: e.fromType,
        });
      }
      if (!nodeMap.has(toKey)) {
        nodeMap.set(toKey, {
          id: toKey,
          label: e.toLabel,
          type: e.toType,
        });
      }
    }

    const nodes = Array.from(nodeMap.values());

    // Build links from edges
    const links: GraphLink[] = edges.map((e) => ({
      source: `${e.fromType}:${e.fromLabel}`,
      target: `${e.toType}:${e.toLabel}`,
      edgeType: e.edgeType,
      reason: e.reason,
      confidence: e.confidence,
    }));

    // Add implicit links from target → findings that don't have explicit edges
    const linkedTargets = new Set(
      links
        .filter((l) => l.source === rootId)
        .map((l) => l.target)
    );
    for (const f of findings) {
      const type =
        f.category === "location"
          ? "location"
          : f.category === "social"
            ? "profile"
            : f.category === "connection"
              ? "person"
              : f.category === "activity"
                ? "activity"
                : "profile";
      const label = f.platform
        ? `${f.platform}: ${f.data.slice(0, 30)}`
        : f.data.slice(0, 40);
      const key = `${type}:${label}`;
      if (!linkedTargets.has(key)) {
        links.push({
          source: rootId,
          target: key,
          edgeType: "found_via",
          confidence: f.confidence,
        });
        linkedTargets.add(key);
      }
    }

    return { nodes, links };
  }, [findings, edges, targetName]);
}
