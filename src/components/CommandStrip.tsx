import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type Step,
  ToolBadge,
  CollapsedStep,
  ExpandedStep,
  formatTime,
  TOOL_CONFIG,
} from "./ActivityStream";

interface CommandStripProps {
  steps: Step[];
  isLive: boolean;
  progress: number;
}

export default function CommandStrip({ steps, isLive, progress }: CommandStripProps) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const currentStep = steps.length > 0 ? steps[steps.length - 1] : null;
  const config = currentStep
    ? TOOL_CONFIG[currentStep.tool] || { letter: "?", color: "text-text-muted", bg: "bg-bg-card", border: "border-border" }
    : null;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setUserScrolledUp(!atBottom);
  }, []);

  useEffect(() => {
    if (expanded && !userScrolledUp && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [steps.length, expanded, userScrolledUp]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const lastStepId = steps.length > 0 ? steps[steps.length - 1]._id : null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40">
      {/* Progress line */}
      <div className="h-px w-full bg-white/[0.04] relative">
        <motion.div
          className="absolute left-0 top-0 h-full bg-accent/50"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            boxShadow: "0 0 8px rgba(0, 255, 136, 0.3)",
          }}
        />
      </div>

      {/* Expanded drawer */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "50vh" }}
            exit={{ height: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="overflow-hidden bg-bg-primary/90 backdrop-blur-xl border-t border-white/[0.04]"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <div className="h-px w-3 bg-accent/30" />
                <h3 className="text-[10px] font-bold text-text-secondary tracking-[0.2em] uppercase font-mono">
                  Activity
                </h3>
                <span className="text-[10px] text-text-muted font-mono tabular-nums">
                  {steps.length} step{steps.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors text-text-muted hover:text-text-secondary cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-[calc(50vh-44px)] overflow-y-auto px-3 pb-3"
            >
              {steps.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-text-muted text-xs">
                    Waiting for investigation to begin...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1 pt-2">
                  <AnimatePresence mode="popLayout">
                    {steps.map((step) => {
                      const isLast = step._id === lastStepId;
                      const isActiveStep = isLast && isLive;
                      const isManuallyExpanded = expandedIds.has(step._id);

                      if (isActiveStep || isManuallyExpanded) {
                        return (
                          <ExpandedStep
                            key={step._id}
                            step={step}
                            isActive={isActiveStep}
                            onCollapse={
                              !isActiveStep ? () => toggleExpand(step._id) : undefined
                            }
                          />
                        );
                      }

                      return (
                        <CollapsedStep
                          key={step._id}
                          step={step}
                          onExpand={() => toggleExpand(step._id)}
                        />
                      );
                    })}
                  </AnimatePresence>
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed chyron bar */}
      <div className="bg-bg-primary/80 backdrop-blur-xl px-4 py-2.5 flex items-center gap-3">
        {currentStep ? (
          <>
            <ToolBadge tool={currentStep.tool} size="sm" />
            <span className={`text-[10px] font-medium tracking-wider uppercase ${config?.color ?? "text-text-muted"}`}>
              {currentStep.tool.replace("_", " ")}
            </span>
            <span className="text-[11px] text-text-secondary truncate flex-1 min-w-0">
              {currentStep.action}
            </span>
            {isLive && (
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
            )}
            <span className="text-[10px] text-text-muted/50 font-mono tabular-nums whitespace-nowrap">
              {formatTime(currentStep.createdAt)}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-text-muted flex-1">
            Waiting for investigation to begin...
          </span>
        )}

        {/* Expand/collapse button with step count */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-text-muted hover:text-text-secondary cursor-pointer"
        >
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          <span className="text-[10px] font-mono tabular-nums">
            {steps.length}
          </span>
        </button>
      </div>
    </div>
  );
}
