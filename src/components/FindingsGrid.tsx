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

const CATEGORY_COLORS: Record<string, string> = {
  social: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  connection: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  location: "bg-green-500/20 text-green-400 border-green-500/30",
  activity: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  identity: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  let color = "text-danger";
  if (confidence >= 80) color = "text-accent";
  else if (confidence >= 60) color = "text-yellow-400";
  else if (confidence >= 40) color = "text-orange-400";

  return (
    <span className={`text-xs font-bold ${color}`}>{confidence}%</span>
  );
}

export default function FindingsGrid({
  findings,
}: {
  findings: Finding[];
}) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
          Findings
        </h3>
        {findings.length > 0 && (
          <span className="text-xs text-text-muted">
            {findings.length} found
          </span>
        )}
      </div>

      {findings.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-text-muted text-sm">
            Findings will appear here as the investigation progresses...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <AnimatePresence>
            {findings.map((finding) => {
              const categoryStyle =
                CATEGORY_COLORS[finding.category] || CATEGORY_COLORS.identity;

              return (
                <motion.div
                  key={finding._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-bg-card border border-border rounded-lg p-3 hover:border-border-bright transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${categoryStyle}`}
                      >
                        {finding.category}
                      </span>
                      {finding.platform && (
                        <span className="text-xs text-text-muted">
                          {finding.platform}
                        </span>
                      )}
                    </div>
                    <ConfidenceBadge confidence={finding.confidence} />
                  </div>
                  <p className="text-sm text-text-primary leading-relaxed">
                    {finding.data}
                  </p>
                  {finding.profileUrl && (
                    <a
                      href={finding.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:text-accent-dim mt-1 inline-block"
                    >
                      {finding.profileUrl}
                    </a>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                    <span>via {finding.source}</span>
                    <span>
                      {new Date(finding.createdAt).toLocaleTimeString()}
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
