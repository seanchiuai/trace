import { useRef, useCallback, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { GraphNode, GraphLink } from "../hooks/useGraphData";

const TYPE_COLORS: Record<string, string> = {
  person: "#a855f7",   // purple
  profile: "#3b82f6",  // blue
  location: "#22c55e", // green
  activity: "#eab308", // yellow
};

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function RelationshipGraph({ nodes, links }: Props) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set());
  const prevNodeCountRef = useRef(0);

  // Track new nodes for glow animation
  useEffect(() => {
    if (nodes.length > prevNodeCountRef.current) {
      const newIds = new Set(
        nodes.slice(prevNodeCountRef.current).map((n) => n.id)
      );
      setNewNodeIds(newIds);
      const timer = setTimeout(() => setNewNodeIds(new Set()), 2000);
      prevNodeCountRef.current = nodes.length;
      return () => clearTimeout(timer);
    }
    prevNodeCountRef.current = nodes.length;
  }, [nodes.length]);

  // Responsive dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Zoom to fit on data change
  useEffect(() => {
    if (fgRef.current && nodes.length > 0) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 60);
      }, 500);
    }
  }, [nodes.length]);

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphNode = node as GraphNode & { x: number; y: number };
      const label = graphNode.label;
      const color = TYPE_COLORS[graphNode.type] || "#6b7280";
      const radius = graphNode.isRoot ? 10 : 6;
      const fontSize = Math.max(10 / globalScale, 2);
      const isNew = newNodeIds.has(graphNode.id);

      // Glow for new nodes
      if (isNew) {
        ctx.beginPath();
        ctx.arc(graphNode.x, graphNode.y, radius + 6, 0, 2 * Math.PI);
        ctx.fillStyle = `${color}33`;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(graphNode.x, graphNode.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Root node ring
      if (graphNode.isRoot) {
        ctx.beginPath();
        ctx.arc(graphNode.x, graphNode.y, radius + 2, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}88`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Label
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      const maxChars = Math.floor(20 * globalScale);
      const displayLabel =
        label.length > maxChars ? label.slice(0, maxChars) + "..." : label;
      ctx.fillText(displayLabel, graphNode.x, graphNode.y + radius + 3);
    },
    [newNodeIds]
  );

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node as GraphNode);
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 opacity-40">
          <svg className="w-12 h-12 text-accent/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="text-[10px] text-text-muted tracking-[0.3em] uppercase font-mono">
            Awaiting connections
          </span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full relative">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={{ nodes, links }}
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkColor={() => "rgba(0,255,136,0.15)"}
        linkWidth={1.5}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.85}
        linkDirectionalArrowColor={() => "rgba(0,255,136,0.3)"}
        backgroundColor="rgba(0,0,0,0)"
        onNodeClick={handleNodeClick}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />

      {/* Selected node detail popover */}
      {selectedNode && (
        <div
          className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-72
            bg-bg-card/80 backdrop-blur-xl border border-border/60 rounded-xl p-4
            shadow-2xl"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    TYPE_COLORS[selectedNode.type] || "#6b7280",
                }}
              />
              <span className="text-[10px] text-text-muted tracking-[0.15em] uppercase font-mono">
                {selectedNode.type}
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-text-muted/40 hover:text-text-primary transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-text-primary font-mono">
            {selectedNode.label}
          </p>
          {selectedNode.confidence != null && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-16 h-1 bg-bg-primary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${selectedNode.confidence}%` }}
                />
              </div>
              <span className="text-[10px] text-accent font-mono">
                {selectedNode.confidence}%
              </span>
            </div>
          )}
          {/* HUD corner accents */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-accent/20 rounded-tl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-accent/20 rounded-br-xl pointer-events-none" />
        </div>
      )}
    </div>
  );
}
