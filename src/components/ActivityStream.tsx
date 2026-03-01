import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Step {
  _id: string;
  stepNumber: number;
  action: string;
  tool: string;
  result?: string;
  createdAt: number;
}

export const TOOL_CONFIG: Record<
  string,
  { letter: string; color: string; bg: string; border: string }
> = {
  reasoning: {
    letter: "R",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
  },
  maigret: {
    letter: "M",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  browser_action: {
    letter: "B",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
  },
  save_finding: {
    letter: "S",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
  },
  web_search: {
    letter: "W",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  geospy: {
    letter: "G",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
  },
  whitepages: {
    letter: "P",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  reverse_image: {
    letter: "I",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    border: "border-pink-400/20",
  },
  darkweb: {
    letter: "D",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  ask_user: {
    letter: "?",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
};

export function ToolBadge({ tool, size = "md" }: { tool: string; size?: "sm" | "md" }) {
  const config = TOOL_CONFIG[tool] || {
    letter: "?",
    color: "text-text-muted",
    bg: "bg-bg-card",
    border: "border-border",
  };

  const sizeClass = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-[11px]";

  return (
    <div
      className={`${sizeClass} rounded-lg ${config.bg} border ${config.border} flex items-center justify-center font-bold ${config.color} shrink-0`}
    >
      {config.letter}
    </div>
  );
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Collapsed single-line row for completed steps */
export function CollapsedStep({
  step,
  onExpand,
}: {
  step: Step;
  onExpand: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onExpand}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group cursor-pointer text-left"
    >
      <ToolBadge tool={step.tool} size="sm" />

      <span className="text-[10px] font-medium text-text-muted tracking-wider uppercase whitespace-nowrap">
        {step.tool.replace("_", " ")}
      </span>

      <span className="text-[11px] text-text-secondary truncate flex-1 min-w-0">
        {step.action}
      </span>

      <span className="text-[10px] text-text-muted/50 font-mono tabular-nums whitespace-nowrap">
        {formatTime(step.createdAt)}
      </span>

      <svg
        className="w-3 h-3 text-accent/60 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </motion.button>
  );
}

/** Expanded detail card for active / manually-expanded steps */
export function ExpandedStep({
  step,
  isActive,
  onCollapse,
}: {
  step: Step;
  isActive: boolean;
  onCollapse?: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`rounded-xl border px-4 py-3 ${
        isActive
          ? "bg-accent/[0.04] border-accent/15"
          : "bg-white/[0.02] border-border/60 cursor-pointer hover:bg-white/[0.03]"
      }`}
      onClick={!isActive ? onCollapse : undefined}
    >
      <div className="flex items-center gap-3">
        <ToolBadge tool={step.tool} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-text-secondary tracking-wider uppercase">
              {step.tool.replace("_", " ")}
            </span>
            <span className="text-[10px] text-text-muted/60 font-mono">
              #{step.stepNumber}
            </span>
            <span className="ml-auto text-[10px] text-text-muted/50 font-mono tabular-nums">
              {formatTime(step.createdAt)}
            </span>
          </div>
        </div>

        {isActive && (
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
        )}
      </div>

      <p className="text-[13px] text-text-primary leading-relaxed mt-2 ml-11">
        {step.action}
      </p>

      {step.result && (
        <details className="mt-2 ml-11 group/details">
          <summary className="text-[10px] text-text-muted cursor-pointer hover:text-text-secondary transition-colors tracking-wide">
            View result
          </summary>
          <pre className="mt-1.5 text-[10px] text-text-muted bg-bg-primary rounded-lg p-3 overflow-x-auto max-h-28 overflow-y-auto border border-border/40 leading-relaxed">
            {step.result}
          </pre>
        </details>
      )}
    </motion.div>
  );
}

export default function ActivityStream({
  steps,
  isLive = false,
}: {
  steps: Step[];
  isLive?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Detect if user has scrolled away from bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setUserScrolledUp(!atBottom);
  }, []);

  // Auto-scroll to bottom when new steps arrive (unless user scrolled up)
  useEffect(() => {
    if (!userScrolledUp && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [steps.length, userScrolledUp]);

  const jumpToLatest = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUserScrolledUp(false);
  };

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
    <div className="flex flex-col h-full relative">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
        <div className="h-px w-3 bg-accent/30" />
        <h3 className="text-[10px] font-bold text-text-secondary tracking-[0.2em] uppercase font-mono">
          Activity
        </h3>
        {steps.length > 0 && (
          <span className="text-[10px] text-text-muted font-mono tabular-nums">
            {steps.length} step{steps.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Scrollable step list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 pb-3 min-h-0"
      >
        {steps.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 mx-auto mb-3 rounded-lg bg-bg-card border border-border flex items-center justify-center">
              <div className="w-3 h-3 border border-text-muted/30 rounded-full" />
            </div>
            <p className="text-text-muted text-xs">
              Waiting for investigation to begin...
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <AnimatePresence mode="popLayout">
              {steps.map((step) => {
                const isLast = step._id === lastStepId;
                const isActiveStep = isLast && isLive;
                const isManuallyExpanded = expandedIds.has(step._id);

                // Show expanded if: it's the active (last) step, or user clicked to expand
                if (isActiveStep || isManuallyExpanded) {
                  return (
                    <ExpandedStep
                      key={step._id}
                      step={step}
                      isActive={isActiveStep}
                      onCollapse={
                        !isActiveStep
                          ? () => toggleExpand(step._id)
                          : undefined
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

      {/* Jump to latest button */}
      <AnimatePresence>
        {userScrolledUp && steps.length > 3 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/25 text-accent text-[10px] font-medium tracking-wide backdrop-blur-sm hover:bg-accent/25 transition-colors cursor-pointer"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
            Jump to latest
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
