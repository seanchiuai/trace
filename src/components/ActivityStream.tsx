import { motion, AnimatePresence } from "framer-motion";

interface Step {
  _id: string;
  stepNumber: number;
  action: string;
  tool: string;
  result?: string;
  createdAt: number;
}

const TOOL_CONFIG: Record<
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
  face_check: {
    letter: "F",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
  },
  save_finding: {
    letter: "S",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
  },
};

function ToolBadge({ tool }: { tool: string }) {
  const config = TOOL_CONFIG[tool] || {
    letter: "?",
    color: "text-text-muted",
    bg: "bg-bg-card",
    border: "border-border",
  };

  return (
    <div
      className={`w-8 h-8 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center text-[11px] font-bold ${config.color} shrink-0`}
    >
      {config.letter}
    </div>
  );
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ActivityStream({ steps }: { steps: Step[] }) {
  return (
    <div className="p-4">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
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
        <div className="space-y-1">
          <AnimatePresence>
            {steps.map((step, index) => (
              <motion.div
                key={step._id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex gap-3 group"
              >
                {/* Timeline column */}
                <div className="flex flex-col items-center">
                  <ToolBadge tool={step.tool} />
                  {index < steps.length - 1 && (
                    <div className="w-px flex-1 bg-border/60 mt-1.5 mb-1.5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-5 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
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

                  <p className="text-[13px] text-text-primary leading-relaxed">
                    {step.action}
                  </p>

                  {step.result && (
                    <details className="mt-2 group/details">
                      <summary className="text-[10px] text-text-muted cursor-pointer hover:text-text-secondary transition-colors tracking-wide">
                        View result
                      </summary>
                      <pre className="mt-1.5 text-[10px] text-text-muted bg-bg-primary rounded-lg p-3 overflow-x-auto max-h-28 overflow-y-auto border border-border/40 leading-relaxed">
                        {step.result}
                      </pre>
                    </details>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
