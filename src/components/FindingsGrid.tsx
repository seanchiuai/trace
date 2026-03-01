import { motion, AnimatePresence } from "framer-motion";

interface Finding {
  _id: string;
  source: string;
  category: string;
  platform?: string;
  profileUrl?: string;
  imageUrl?: string;
  data: string;
  confidence: number;
  createdAt: number;
}

const CATEGORY_STYLE: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  social: {
    bg: "bg-blue-500/8",
    text: "text-blue-400",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
  },
  connection: {
    bg: "bg-purple-500/8",
    text: "text-purple-400",
    border: "border-purple-500/20",
    dot: "bg-purple-400",
  },
  location: {
    bg: "bg-green-500/8",
    text: "text-green-400",
    border: "border-green-500/20",
    dot: "bg-green-400",
  },
  activity: {
    bg: "bg-yellow-500/8",
    text: "text-yellow-400",
    border: "border-yellow-500/20",
    dot: "bg-yellow-400",
  },
  identity: {
    bg: "bg-cyan-500/8",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
    dot: "bg-cyan-400",
  },
};

function ConfidenceBar({ confidence }: { confidence: number }) {
  let color = "bg-danger";
  let textColor = "text-danger";
  if (confidence >= 80) {
    color = "bg-accent";
    textColor = "text-accent";
  } else if (confidence >= 60) {
    color = "bg-yellow-400";
    textColor = "text-yellow-400";
  } else if (confidence >= 40) {
    color = "bg-orange-400";
    textColor = "text-orange-400";
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1 bg-bg-primary rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className={`text-[10px] font-bold font-mono tabular-nums ${textColor}`}>
        {confidence}%
      </span>
    </div>
  );
}

export default function FindingsGrid({
  findings,
}: {
  findings: Finding[];
}) {
  return (
    <div className="p-4">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px w-3 bg-accent/30" />
        <h3 className="text-[10px] font-bold text-text-secondary tracking-[0.2em] uppercase font-mono">
          Findings
        </h3>
        {findings.length > 0 && (
          <span className="text-[10px] text-text-muted font-mono tabular-nums">
            {findings.length} found
          </span>
        )}
      </div>

      {findings.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-8 h-8 mx-auto mb-3 rounded-lg bg-bg-card border border-border flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-text-muted/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <p className="text-text-muted text-xs">
            Findings will appear as the investigation progresses...
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {findings.map((finding) => {
              const style =
                CATEGORY_STYLE[finding.category] || CATEGORY_STYLE.identity;

              return (
                <motion.div
                  key={finding._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative bg-bg-card/60 border border-border/60 rounded-lg p-3 hover:border-border-bright hover:bg-bg-card-hover transition-all duration-200 group"
                >
                  {/* Top row: category + confidence */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${style.dot}`}
                        />
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${style.bg} ${style.text} border ${style.border} tracking-wide uppercase font-mono`}
                        >
                          {finding.category}
                        </span>
                      </div>
                      {finding.platform && (
                        <span className="text-[10px] text-text-muted/60 font-mono">
                          {finding.platform}
                        </span>
                      )}
                    </div>
                    <ConfidenceBar confidence={finding.confidence} />
                  </div>

                  {/* Data */}
                  <p className="text-[13px] text-text-primary leading-relaxed">
                    {finding.data}
                  </p>

                  {/* Profile URL */}
                  {finding.profileUrl && (
                    <a
                      href={finding.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-accent/70 hover:text-accent mt-1.5 inline-flex items-center gap-1 transition-colors font-mono"
                    >
                      <svg
                        className="w-2.5 h-2.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      {finding.profileUrl}
                    </a>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted/50 font-mono">
                    <span>via {finding.source}</span>
                    <span className="tabular-nums">
                      {new Date(finding.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
