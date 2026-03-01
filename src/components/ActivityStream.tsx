import { motion, AnimatePresence } from "framer-motion";

interface Step {
  _id: string;
  stepNumber: number;
  action: string;
  tool: string;
  result?: string;
  createdAt: number;
}

const TOOL_ICONS: Record<string, { icon: string; color: string }> = {
  reasoning: { icon: "brain", color: "text-purple-400" },
  maigret: { icon: "search", color: "text-blue-400" },
  browser_action: { icon: "globe", color: "text-cyan-400" },
  face_check: { icon: "scan", color: "text-green-400" },
  save_finding: { icon: "save", color: "text-yellow-400" },
};

function ToolIcon({ tool }: { tool: string }) {
  const config = TOOL_ICONS[tool] || { icon: "circle", color: "text-text-muted" };

  return (
    <div
      className={`w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center text-xs font-bold ${config.color}`}
    >
      {tool === "reasoning" && "R"}
      {tool === "maigret" && "M"}
      {tool === "browser_action" && "B"}
      {tool === "face_check" && "F"}
      {tool === "save_finding" && "S"}
      {!TOOL_ICONS[tool] && "?"}
    </div>
  );
}

export default function ActivityStream({ steps }: { steps: Step[] }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
          Activity
        </h3>
        {steps.length > 0 && (
          <span className="text-xs text-text-muted">
            {steps.length} step{steps.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-text-muted text-sm">
            Waiting for investigation to begin...
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {steps.map((step) => (
              <motion.div
                key={step._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex gap-3"
              >
                <div className="flex flex-col items-center">
                  <ToolIcon tool={step.tool} />
                  <div className="w-px flex-1 bg-border mt-2" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {step.tool.replace("_", " ")}
                    </span>
                    <span className="text-xs text-text-muted">
                      #{step.stepNumber}
                    </span>
                    <span className="ml-auto text-xs text-text-muted">
                      {new Date(step.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary leading-relaxed">
                    {step.action}
                  </p>
                  {step.result && (
                    <details className="mt-2">
                      <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary transition-colors">
                        View result
                      </summary>
                      <pre className="mt-1 text-xs text-text-muted bg-bg-primary rounded p-2 overflow-x-auto max-h-32 overflow-y-auto">
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
