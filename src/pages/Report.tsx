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
            Loading report
          </span>
        </div>
      </div>
    );
  }

  // Null or not complete — effects above will redirect
  if (!data?.investigation || data.investigation.status !== "complete") {
    return null;
  }

  const { investigation, findings } = data;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="border-b border-border px-6"
      >
        <div className="flex items-center h-14">
          {/* Logo */}
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

          <div className="h-4 w-px bg-border mx-3" />

          {/* Subject name */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted tracking-wider uppercase font-mono">
              Subject
            </span>
            <span className="text-sm text-text-primary font-display font-medium">
              {investigation.targetName}
            </span>
          </div>

          {/* COMPLETE badge */}
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-accent">
              COMPLETE
            </span>
          </div>
        </div>
      </motion.header>

      {/* Report content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <DetectiveReport
          report={investigation.report || ""}
          targetName={investigation.targetName}
          confidence={investigation.confidence}
          findings={findings || []}
        />
      </motion.main>
    </div>
  );
}
