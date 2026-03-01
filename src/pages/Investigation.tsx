import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BrowserView from "../components/BrowserView";
import HudHeader from "../components/HudHeader";
import CommandStrip from "../components/CommandStrip";
import FindingToasts from "../components/FindingToasts";
import CompletionFlash from "../components/CompletionFlash";
import FaceScan from "../components/FaceScan";

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

  const [started, setStarted] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
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

  // Auto-dismiss FaceScan overlay after 8 seconds
  useEffect(() => {
    if (!activeFaceScan) return;
    const timer = setTimeout(() => setActiveFaceScan(null), 8000);
    return () => clearTimeout(timer);
  }, [activeFaceScan]);

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
    investigation.status === "analyzing";

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
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(0,255,136,0.03) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Layer 1: Browser hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="absolute inset-0 z-10 p-3 pt-16 pb-14 sm:p-4 sm:pt-16 sm:pb-14"
      >
        <BrowserView
          liveUrl={investigation.browserLiveUrl}
          status={investigation.status}
        />
      </motion.div>

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
      <FindingToasts findings={findings || []} />

      {/* Layer 4: Command strip */}
      <CommandStrip
        steps={steps || []}
        isLive={isLive}
        progress={progress}
      />

      {/* Layer 5: FaceScan overlay */}
      <AnimatePresence>
        {activeFaceScan && (
          <FaceScan
            imageUrl={activeFaceScan.imageUrl}
            results={activeFaceScan.results}
            onDismiss={() => setActiveFaceScan(null)}
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
