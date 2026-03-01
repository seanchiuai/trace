import { useParams } from "react-router-dom";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import BrowserView from "../components/BrowserView";
import ActivityStream from "../components/ActivityStream";
import FindingsGrid from "../components/FindingsGrid";
import FaceScan from "../components/FaceScan";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planning: { label: "PLANNING", color: "text-info" },
  investigating: { label: "INVESTIGATING", color: "text-accent" },
  analyzing: { label: "ANALYZING", color: "text-warning" },
  complete: { label: "COMPLETE", color: "text-accent" },
  failed: { label: "FAILED", color: "text-danger" },
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

  // Auto-start investigation
  useEffect(() => {
    if (investigation && investigation.status === "planning" && !started) {
      setStarted(true);
      startInvestigation({ investigationId });
    }
  }, [investigation, started, startInvestigation, investigationId]);

  // Detect face_check steps to trigger FaceScan animation
  useEffect(() => {
    if (!steps) return;
    const faceCheckStep = steps.find(
      (s) => s.tool === "face_check" && s.result && !s.result.includes("error")
    );
    if (faceCheckStep?.result) {
      try {
        const parsed = JSON.parse(faceCheckStep.result);
        if (parsed.faces?.length > 0) {
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
          // Auto-dismiss after 8 seconds
          setTimeout(() => setActiveFaceScan(null), 8000);
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [steps]);

  if (!investigation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const status = STATUS_LABELS[investigation.status] || STATUS_LABELS.planning;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="w-7 h-7 rounded bg-accent/20 flex items-center justify-center text-accent font-bold text-xs"
          >
            T
          </a>
          <span className="text-sm text-text-secondary">
            Investigating:{" "}
            <span className="text-text-primary font-medium">
              {investigation.targetName}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-xs font-bold tracking-wider ${status.color}`}>
            {investigation.status === "investigating" && (
              <span className="inline-block w-2 h-2 bg-accent rounded-full mr-2 animate-pulse" />
            )}
            {status.label}
          </span>
          <span className="text-xs text-text-muted">
            Step {investigation.stepCount} / 20
          </span>
        </div>
      </header>

      {/* FaceScan overlay */}
      {activeFaceScan && (
        <FaceScan
          imageUrl={activeFaceScan.imageUrl}
          results={activeFaceScan.results}
          onDismiss={() => setActiveFaceScan(null)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Left: Browser view */}
        <div className="border-r border-border min-h-0">
          <BrowserView
            liveUrl={investigation.browserLiveUrl}
            status={investigation.status}
          />
        </div>

        {/* Right: Activity + Findings */}
        <div className="flex flex-col min-h-0 overflow-hidden">
          {/* Activity Stream */}
          <div className="flex-1 overflow-y-auto border-b border-border">
            <ActivityStream steps={steps || []} />
          </div>

          {/* Findings */}
          <div className="h-64 lg:h-80 overflow-y-auto">
            <FindingsGrid findings={findings || []} />
          </div>
        </div>
      </div>

      {/* Report section (when complete) */}
      {investigation.status === "complete" && investigation.report && (
        <div className="border-t border-accent/30 bg-bg-secondary px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-accent text-sm font-bold uppercase tracking-wider">
                Detective Report
              </span>
              {investigation.confidence && (
                <span className="text-xs text-text-muted">
                  Overall confidence: {investigation.confidence}%
                </span>
              )}
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-text-secondary">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                {investigation.report}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
