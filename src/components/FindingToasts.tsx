import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Id } from "../../convex/_generated/dataModel";
import FindingsGrid from "./FindingsGrid";

interface Finding {
  _id: Id<"findings">;
  source: string;
  category: string;
  platform?: string;
  profileUrl?: string;
  imageUrl?: string;
  data: string;
  confidence: number;
  createdAt: number;
}

interface Directive {
  findingId?: Id<"findings">;
  type: "kill_lead" | "general";
}

const CATEGORY_DOT: Record<string, string> = {
  social: "bg-blue-400",
  connection: "bg-purple-400",
  location: "bg-green-400",
  activity: "bg-yellow-400",
  identity: "bg-cyan-400",
};

const CATEGORY_TEXT: Record<string, string> = {
  social: "text-blue-400",
  connection: "text-purple-400",
  location: "text-green-400",
  activity: "text-yellow-400",
  identity: "text-cyan-400",
};

interface FindingToastsProps {
  findings: Finding[];
  investigationId?: Id<"investigations">;
  isLive?: boolean;
  directives?: Directive[];
}

export default function FindingToasts({ findings, investigationId, isLive, directives }: FindingToastsProps) {
  const [visibleToasts, setVisibleToasts] = useState<Finding[]>([]);
  const [trayOpen, setTrayOpen] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Detect new findings and show as toasts
  useEffect(() => {
    const newFindings: Finding[] = [];
    for (const f of findings) {
      if (!seenIdsRef.current.has(f._id)) {
        seenIdsRef.current.add(f._id);
        newFindings.push(f);
      }
    }

    if (newFindings.length === 0) return;

    setVisibleToasts((prev) => {
      const combined = [...newFindings, ...prev];
      return combined.slice(0, 3);
    });

    // Set dismiss timers for new toasts
    for (const f of newFindings) {
      const timer = setTimeout(() => {
        setVisibleToasts((prev) => prev.filter((t) => t._id !== f._id));
        timersRef.current.delete(f._id);
      }, 5000);
      timersRef.current.set(f._id, timer);
    }
  }, [findings]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    setVisibleToasts((prev) => prev.filter((t) => t._id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const confidenceColor = (c: number) => {
    if (c >= 80) return "text-accent";
    if (c >= 60) return "text-yellow-400";
    if (c >= 40) return "text-orange-400";
    return "text-danger";
  };

  return (
    <>
      {/* Toast stack */}
      <div className="fixed bottom-24 right-5 z-50 flex flex-col-reverse gap-2 max-sm:right-3 max-sm:left-3 pointer-events-none">
        <AnimatePresence>
          {visibleToasts.map((finding) => {
            const dotColor = CATEGORY_DOT[finding.category] || "bg-cyan-400";
            const textColor = CATEGORY_TEXT[finding.category] || "text-cyan-400";

            return (
              <motion.div
                key={finding._id}
                initial={{ x: 100, opacity: 0, scale: 0.95 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: 60, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-80 max-sm:w-full bg-bg-secondary/90 backdrop-blur-xl border border-white/[0.06] rounded-xl p-3 cursor-pointer hover:border-white/[0.12] transition-colors pointer-events-auto"
                style={{
                  animation: "toastGlow 0.6s ease-out",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                }}
                onClick={() => dismissToast(finding._id)}
              >
                {/* Top row: category + platform + confidence */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    <span className={`text-[10px] font-mono tracking-wide uppercase ${textColor}`}>
                      {finding.category}
                    </span>
                    {finding.platform && (
                      <>
                        <div className="h-2.5 w-px bg-white/10" />
                        <span className="text-[10px] text-text-muted/60 font-mono">
                          {finding.platform}
                        </span>
                      </>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold font-mono tabular-nums ${confidenceColor(finding.confidence)}`}>
                    {finding.confidence}%
                  </span>
                </div>

                {/* Data summary */}
                <p className="text-[12px] text-text-primary leading-relaxed line-clamp-2">
                  {finding.data}
                </p>

                {/* Footer: source */}
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-text-muted/40 font-mono">
                  <span>via {finding.source}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Findings counter badge (always visible when there are findings) */}
      {findings.length > 0 && (
        <button
          onClick={() => setTrayOpen(true)}
          className={`fixed bottom-24 right-5 z-50 items-center gap-1.5 px-3 py-1.5 rounded-full glass-accent hover:bg-accent/[0.08] transition-colors cursor-pointer ${visibleToasts.length > 0 ? "hidden" : "flex"}`}
        >
          <svg className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span className="text-[10px] text-accent font-mono font-bold tabular-nums">
            {findings.length}
          </span>
        </button>
      )}

      {/* Full findings tray (slide-out panel) */}
      <AnimatePresence>
        {trayOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setTrayOpen(false)}
            />

            {/* Tray panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[420px] max-w-[90vw] bg-bg-primary/95 backdrop-blur-xl border-l border-white/[0.06] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] sticky top-0 bg-bg-primary/95 backdrop-blur-xl z-10">
                <div className="flex items-center gap-2">
                  <div className="h-px w-3 bg-accent/30" />
                  <h3 className="text-[10px] font-bold text-text-secondary tracking-[0.2em] uppercase font-mono">
                    All Findings
                  </h3>
                  <span className="text-[10px] text-text-muted font-mono tabular-nums">
                    {findings.length}
                  </span>
                </div>
                <button
                  onClick={() => setTrayOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors text-text-muted hover:text-text-secondary cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <FindingsGrid findings={findings} investigationId={investigationId} isLive={isLive} directives={directives} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
