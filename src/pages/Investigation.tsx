import { useParams } from "react-router-dom";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BrowserView from "../components/BrowserView";
import ActivityStream from "../components/ActivityStream";
import FindingsGrid from "../components/FindingsGrid";
import FaceScan from "../components/FaceScan";
import DetectiveReport from "../components/DetectiveReport";

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
};

export default function Investigation() {
  const { id } = useParams<{ id: string }>();
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

  const [started, setStarted] = useState(false);
  const [activeFaceScan, setActiveFaceScan] = useState<{
    imageUrl: string;
    results?: { score: number; url: string; platform: string }[];
  } | null>(null);
  const [shownFaceSteps, setShownFaceSteps] = useState<Set<string>>(new Set());

  // Auto-start investigation
  useEffect(() => {
    if (investigation && investigation.status === "planning" && !started) {
      setStarted(true);
      startInvestigation({ investigationId });
    }
  }, [investigation, started, startInvestigation, investigationId]);

  // Detect face_check steps to trigger FaceScan animation (only once per step)
  useEffect(() => {
    if (!steps) return;
    const faceCheckStep = steps.find(
      (s) =>
        s.tool === "face_check" &&
        s.result &&
        !s.result.includes("error") &&
        !shownFaceSteps.has(s._id)
    );
    if (faceCheckStep?.result) {
      try {
        const parsed = JSON.parse(faceCheckStep.result);
        if (parsed.faces?.length > 0) {
          setShownFaceSteps((prev) => new Set(prev).add(faceCheckStep._id));
          setActiveFaceScan({
            imageUrl: "",
            results: parsed.faces.map(
              (f: { score: number; url: string; platform: string }) => ({
                score: f.score,
                url: f.url,
                platform: f.platform,
              })
            ),
          });
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [steps, shownFaceSteps]);

  // Auto-dismiss FaceScan overlay after 8 seconds (with proper cleanup)
  useEffect(() => {
    if (!activeFaceScan) return;
    const timer = setTimeout(() => setActiveFaceScan(null), 8000);
    return () => clearTimeout(timer);
  }, [activeFaceScan]);

  if (!investigation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
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

  const totalTokens = (investigation.totalInputTokens ?? 0) + (investigation.totalOutputTokens ?? 0);
  const contextWindowPct = Math.min(
    ((investigation.totalInputTokens ?? 0) / 200_000) * 100,
    100
  );
  const costDisplay = investigation.estimatedCost != null
    ? `$${investigation.estimatedCost.toFixed(2)}`
    : "$0.00";

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative border-b border-border px-6 py-0"
      >
        <div className="flex items-center h-14">
          {/* Logo + Target */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="relative w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center group hover:bg-accent/15 transition-colors"
            >
              <span className="font-display font-bold text-accent text-xs">
                T
              </span>
              <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-accent/40" />
              <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-accent/40" />
            </a>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted tracking-wider uppercase font-mono">
                Subject
              </span>
              <span className="text-sm text-text-primary font-display font-medium">
                {investigation.targetName}
              </span>
            </div>
          </div>

          {/* Status + Progress */}
          <div className="ml-auto flex items-center gap-5">
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <div
                  className={`w-2 h-2 rounded-full ${status.dotColor}`}
                />
                {status.pulse && (
                  <div
                    className={`absolute inset-0 rounded-full ${status.dotColor} animate-ping opacity-40`}
                  />
                )}
              </div>
              <span
                className={`text-[10px] font-bold tracking-[0.2em] ${status.color}`}
              >
                {status.label}
              </span>
            </div>

            {/* Step counter */}
            <div className="flex items-center gap-2">
              <div className="w-24 h-1 bg-bg-card rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-accent/60 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <span className="text-[10px] text-text-muted font-mono tabular-nums">
                {investigation.stepCount}/20
              </span>
            </div>

            <div className="h-4 w-px bg-border" />

            {/* Token / Context / Cost stats */}
            <div className="flex items-center gap-3">
              {/* Context window usage */}
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1 bg-bg-card rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${contextWindowPct > 80 ? "bg-danger" : contextWindowPct > 50 ? "bg-warning" : "bg-info/60"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${contextWindowPct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <span className="text-[10px] text-text-muted font-mono tabular-nums">
                  {contextWindowPct.toFixed(0)}%
                </span>
              </div>

              {/* Token count */}
              <span className="text-[10px] text-text-muted font-mono tabular-nums" title={`Input: ${(investigation.totalInputTokens ?? 0).toLocaleString()} | Output: ${(investigation.totalOutputTokens ?? 0).toLocaleString()}`}>
                {totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens} tok
              </span>

              {/* Cost */}
              <span className="text-[10px] text-text-muted font-mono tabular-nums">
                {costDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom glow line */}
        {status.pulse && (
          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--color-accent) 30%, var(--color-accent) 70%, transparent)",
              opacity: 0.15,
            }}
          />
        )}
      </motion.header>

      {/* FaceScan overlay */}
      <AnimatePresence>
        {activeFaceScan && (
          <FaceScan
            imageUrl={activeFaceScan.imageUrl}
            results={activeFaceScan.results}
            onDismiss={() => setActiveFaceScan(null)}
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] min-h-0">
        {/* Left: Browser view */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="border-r border-border min-h-0 relative"
        >
          <BrowserView
            liveUrl={investigation.browserLiveUrl}
            status={investigation.status}
          />
        </motion.div>

        {/* Right: Activity + Findings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col min-h-0 overflow-hidden"
        >
          {/* Activity Stream */}
          <div className="flex-1 overflow-y-auto border-b border-border">
            <ActivityStream steps={steps || []} />
          </div>

          {/* Findings */}
          <div className="h-72 lg:h-80 overflow-y-auto">
            <FindingsGrid findings={findings || []} />
          </div>
        </motion.div>
      </div>

      {/* Report section */}
      <AnimatePresence>
        {investigation.status === "complete" && investigation.report && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="border-t border-accent/20"
          >
            <DetectiveReport
              report={investigation.report}
              targetName={investigation.targetName}
              confidence={investigation.confidence}
              findings={findings || []}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
