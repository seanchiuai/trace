import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
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

  const [started, setStarted] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
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
    if (investigation && investigation.status === "planning" && !started) {
      setStarted(true);
      startInvestigation({ investigationId });
    }
  }, [investigation, started, startInvestigation, investigationId]);

  // Trigger cinematic completion flash, then redirect to report
  useEffect(() => {
    if (investigation?.status === "complete" && investigation.report && !showCompletion) {
      setShowCompletion(true);
    }
  }, [investigation?.status, investigation?.report, showCompletion]);

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
  const isLive =
    investigation.status === "investigating" ||
    investigation.status === "planning" ||
    investigation.status === "analyzing" ||
    investigation.status === "awaiting_input";

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

  return (
    <div className="h-screen w-screen bg-bg-primary overflow-hidden relative">
      {/* Layer 0: Ambient background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(0,255,136,0.03) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Layer 1: Main content view */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="absolute inset-0 z-10 p-3 pt-16 pb-14 sm:p-4 sm:pt-16 sm:pb-14 pl-14"
      >
        {activeView === "browser" && (
          <BrowserView
            liveUrl={investigation.browserLiveUrl}
            status={investigation.status}
          />
        )}
        {activeView === "graph" && (
          <div className="h-full w-full rounded-xl overflow-hidden border border-border/30 bg-bg-card/20">
            <RelationshipGraph nodes={graphData.nodes} links={graphData.links} />
          </div>
        )}
        {activeView === "map" && (
          <div className="h-full w-full rounded-xl overflow-hidden border border-border/30 bg-bg-card/20">
            <GeoIntelMap findings={findings || []} />
          </div>
        )}
      </motion.div>

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
      <FindingToasts findings={findings || []} investigationId={investigationId} isLive={isLive} />

      {/* Layer 3.5: Steering input */}
      <SteeringInput investigationId={investigationId} isLive={isLive} />

      {/* Layer 4: Command strip */}
      <CommandStrip
        steps={steps || []}
        directives={directives || []}
        isLive={isLive}
        progress={progress}
        onStop={handleStop}
      />

      {/* Layer 5: Clarification overlay */}
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

      {/* Layer 6: Completion cinematic flash */}
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
