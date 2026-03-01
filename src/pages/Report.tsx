import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect } from "react";
import { motion } from "framer-motion";
import DetectiveReport from "../components/DetectiveReport";

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const investigationId = id as Id<"investigations">;

  const data = useQuery(api.reports.getReport, {
    investigationId,
  });

  // Guard: not found → redirect home
  useEffect(() => {
    if (data === null) {
      navigate("/", { replace: true });
    }
  }, [data, navigate]);

  // Guard: not complete yet → redirect to live investigation
  useEffect(() => {
    if (data?.investigation && data.investigation.status !== "complete") {
      navigate(`/investigate/${id}`, { replace: true });
    }
  }, [data, id, navigate]);

  // Loading
  if (data === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-accent/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-accent rounded-full animate-spin" />
          </div>
          <span className="text-[10px] text-text-muted tracking-[0.3em] uppercase font-mono">
            Decrypting dossier
          </span>
        </div>
      </div>
    );
  }

  // Null or not complete — effects above will redirect
  if (!data?.investigation || data.investigation.status !== "complete") {
    return null;
  }

  const { investigation, findings, steps } = data;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DetectiveReport
        report={investigation.report || ""}
        targetName={investigation.targetName}
        confidence={investigation.confidence}
        findings={findings || []}
        steps={steps || []}
        caseId={id || ""}
        completedAt={investigation.completedAt}
        estimatedCost={investigation.estimatedCost}
        behavioralAnalysis={investigation.behavioralAnalysis}
        profileReport={investigation.profileReport}
      />
    </motion.div>
  );
}
