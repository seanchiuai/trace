import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BrowserView from "../components/BrowserView";
import HudHeader from "../components/HudHeader";
import CommandStrip from "../components/CommandStrip";
import FindingToasts from "../components/FindingToasts";
import CompletionFlash from "../components/CompletionFlash";
import ViewSwitcher from "../components/ViewSwitcher";
import type { ViewMode } from "../components/ViewSwitcher";
import RelationshipGraph from "../components/RelationshipGraph";
import GeoIntelMap from "../components/GeoIntelMap";
import ClarificationCard from "../components/ClarificationCard";
import SteeringInput from "../components/SteeringInput";
import { useGraphData } from "../hooks/useGraphData";
import ToolAnimationOverlay from "../components/overlays/ToolAnimationOverlay";
import { useActiveTool } from "../components/overlays/useActiveTool";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dotColor: string; pulse: boolean }
> = {
  planning: {
    label: "PLANNING",
    color: "text-info",
    dotColor: "bg-info",
    pulse: true,
  },
  investigating: {
    label: "INVESTIGATING",
    color: "text-accent",
    dotColor: "bg-accent",
    pulse: true,
  },
  analyzing: {
    label: "ANALYZING",
    color: "text-warning",
    dotColor: "bg-warning",
    pulse: true,
  },
  complete: {
    label: "COMPLETE",
    color: "text-accent",
    dotColor: "bg-accent",
    pulse: false,
  },
  failed: {
    label: "FAILED",
    color: "text-danger",
    dotColor: "bg-danger",
    pulse: false,
  },
  stopped: {
    label: "STOPPED",
    color: "text-warning",
    dotColor: "bg-warning",
    pulse: false,
  },
  awaiting_input: {
    label: "AWAITING INPUT",
    color: "text-amber-400",
    dotColor: "bg-amber-400",
    pulse: true,
  },
};

const VIEW_CONFIG: Record<ViewMode, { label: string; description: string }> = {
  browser: {
    label: "Live Browser",
    description: "Agent viewport with active web automation feed",
  },
  graph: {
    label: "Relationship Graph",
    description: "Entity links and evidence confidence network",
  },
  map: {
    label: "Geo Intelligence",
    description: "Location findings with temporal map context",
  },
};

export default function Investigation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const investigationId = id as Id<"investigations">;

  const investigation = useQuery(api.investigations.get, {
    id: investigationId,
  });
  const steps = useQuery(api.investigations.getSteps, {
    investigationId,
  });
  const findings = useQuery(api.investigations.getFindings, {
    investigationId,
  });
  const startInvestigation = useAction(api.orchestrator.startInvestigation);
  const stopInvestigation = useAction(api.orchestrator.stopInvestigation);
  const directives = useQuery(api.directives.getDirectives, {
    investigationId,
  });
  const pendingClarification = useQuery(api.investigations.getPendingClarification, {
    investigationId,
  });

  const edges = useQuery(api.graphEdges.getEdges, { investigationId });

  const startTriggeredRef = useRef(false);
  const [activeView, setActiveView] = useState<ViewMode>("browser");

  const handleStop = async () => {
    try {
      await stopInvestigation({ investigationId });
    } catch (e) {
      console.error("Failed to stop investigation:", e);
    }
  };

  // Auto-start investigation
  useEffect(() => {
    if (investigation?.status === "planning" && !startTriggeredRef.current) {
      startTriggeredRef.current = true;
      void startInvestigation({ investigationId });
    }
  }, [investigation?.status, startInvestigation, investigationId]);

  const showCompletion = investigation?.status === "complete" && Boolean(investigation.report);
  useEffect(() => {
    if (!showCompletion) return;
    const timer = setTimeout(() => {
      navigate(`/report/${id}`, { replace: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, [showCompletion, id, navigate]);

  // All hooks must be called before any early return
  const graphData = useGraphData(
    findings || [],
    edges || [],
    investigation?.targetName || ""
  );
  const isLive =
    investigation?.status === "investigating" ||
    investigation?.status === "planning" ||
    investigation?.status === "analyzing" ||
    investigation?.status === "awaiting_input";
  const { tool: activeTool, stepId: activeStepId } = useActiveTool(steps || [], isLive);

  if (!investigation) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-accent/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-accent rounded-full animate-spin" />
          </div>
          <span className="text-[10px] text-text-muted tracking-[0.3em] uppercase font-mono">
            Loading investigation
          </span>
        </div>
      </div>
    );
  }

  const status =
    STATUS_CONFIG[investigation.status] || STATUS_CONFIG.planning;
  const progress = Math.min(
    (investigation.stepCount / 20) * 100,
    100
  );

  const totalTokens =
    (investigation.totalInputTokens ?? 0) +
    (investigation.totalOutputTokens ?? 0);
  const contextWindowPct = Math.min(
    ((investigation.totalInputTokens ?? 0) / 200_000) * 100,
    100
  );
  const costDisplay =
    investigation.estimatedCost != null
      ? `$${investigation.estimatedCost.toFixed(2)}`
      : "$0.00";

  // Average confidence from findings
  const avgConfidence =
    findings && findings.length > 0
      ? Math.round(
          findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length
        )
      : 0;

  const hasConnections = (edges?.length ?? 0) > 0 || (findings?.some(f => f.category === "connection") ?? false);
  const hasLocations = findings?.some(f => f.category === "location") ?? false;
  const viewConfig = VIEW_CONFIG[activeView];

  return (
    <div className="h-screen w-screen bg-bg-primary overflow-hidden relative investigation-shell">
      <div className="absolute inset-0 z-0 investigation-aurora" />
      <div className="absolute inset-0 z-0 investigation-grid" />
      <div className="absolute inset-0 z-0 investigation-vignette" />

      {/* Layer 1: Main content view — isolation prevents iframe from interfering with overlay animations */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="absolute inset-0 z-10 p-3 pt-16 pb-14 sm:p-4 sm:pt-16 sm:pb-14 pl-14"
        style={{ isolation: "isolate", contain: "layout style paint" }}
      >
        <div className="h-full w-full rounded-2xl overflow-hidden relative command-deck">
          <div className="pointer-events-none absolute inset-0 command-deck-glow" />

          <div className="absolute top-3 left-3 z-20 hidden md:flex items-center gap-3 px-3 py-2 rounded-xl chrome-panel">
            <span className="text-[10px] text-accent tracking-[0.22em] uppercase font-mono font-semibold">
              {viewConfig.label}
            </span>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-[10px] text-text-muted font-mono max-w-[26ch] truncate">
              {viewConfig.description}
            </span>
          </div>

          <div className="absolute top-3 right-3 z-20 hidden lg:flex items-center gap-2">
            <div className="px-2.5 py-1.5 rounded-lg chrome-pill">
              <span className="text-[9px] text-text-muted tracking-[0.15em] uppercase font-mono">
                Steps
              </span>
              <p className="text-[11px] text-text-primary font-semibold tabular-nums mt-0.5">
                {investigation.stepCount}
              </p>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg chrome-pill">
              <span className="text-[9px] text-text-muted tracking-[0.15em] uppercase font-mono">
                Findings
              </span>
              <p className="text-[11px] text-text-primary font-semibold tabular-nums mt-0.5">
                {findings?.length ?? 0}
              </p>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg chrome-pill">
              <span className="text-[9px] text-text-muted tracking-[0.15em] uppercase font-mono">
                Cost
              </span>
              <p className="text-[11px] text-text-primary font-semibold tabular-nums mt-0.5">
                {costDisplay}
              </p>
            </div>
          </div>

          <div className="absolute inset-0 p-2 sm:p-3">
            {activeView === "browser" && (
              <BrowserView
                liveUrl={investigation.browserLiveUrl}
                status={investigation.status}
              />
            )}
            {activeView === "graph" && (
              <div className="h-full w-full rounded-xl overflow-hidden border border-white/10 bg-bg-card/30">
                <RelationshipGraph nodes={graphData.nodes} links={graphData.links} />
              </div>
            )}
            {activeView === "map" && (
              <div className="h-full w-full rounded-xl overflow-hidden border border-white/10 bg-bg-card/30">
                <GeoIntelMap findings={findings || []} />
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Layer 1.5: Tool animation overlays (above browser, below UI controls) */}
      <ToolAnimationOverlay activeTool={activeTool} stepId={activeStepId} />

      {/* View Switcher toolbar */}
      <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center">
        <ViewSwitcher
          activeView={activeView}
          onViewChange={setActiveView}
          hasConnections={hasConnections}
          hasLocations={hasLocations}
        />
      </div>

      {/* Layer 2: HUD Header */}
      <HudHeader
        targetName={investigation.targetName}
        statusLabel={status.label}
        statusColor={status.color}
        dotColor={status.dotColor}
        pulse={status.pulse}
        stepCount={investigation.stepCount}
        costDisplay={costDisplay}
        contextWindowPct={contextWindowPct}
        totalTokens={totalTokens}
        errorMessage={
          investigation.status === "failed"
            ? investigation.errorMessage
            : undefined
        }
      />

      {/* Layer 3: Finding toasts */}
      <FindingToasts findings={findings || []} investigationId={investigationId} isLive={isLive} directives={directives} />

      {/* Layer 4: Steering input */}
      <SteeringInput investigationId={investigationId} isLive={isLive} />

      {/* Layer 5: Command strip */}
      <CommandStrip
        steps={steps || []}
        directives={directives || []}
        isLive={isLive}
        progress={progress}
        onStop={handleStop}
      />

      {/* Layer 6: Clarification overlay */}
      <AnimatePresence>
        {pendingClarification && investigation.status === "awaiting_input" && (
          <ClarificationCard
            key={pendingClarification._id}
            clarificationId={pendingClarification._id}
            question={pendingClarification.question}
            options={pendingClarification.options}
            context={pendingClarification.context}
          />
        )}
      </AnimatePresence>

      {/* Layer 7: Completion cinematic flash */}
      <AnimatePresence>
        {showCompletion && (
          <CompletionFlash
            confidence={avgConfidence}
            findingsCount={findings?.length ?? 0}
            stepsCount={investigation.stepCount}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
