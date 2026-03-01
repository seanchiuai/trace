import { motion } from "framer-motion";

interface DetectiveReportProps {
  report: string;
  targetName: string;
  confidence?: number;
  findings: {
    _id: string;
    source: string;
    category: string;
    platform?: string;
    profileUrl?: string;
    data: string;
    confidence: number;
  }[];
}

function StatCard({
  label,
  count,
  color,
  delay,
}: {
  label: string;
  count: number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative bg-bg-card/60 border border-border/60 rounded-xl p-5 text-center group hover:border-border-bright transition-all"
    >
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-accent/20 rounded-tl-xl" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-accent/20 rounded-br-xl" />
      <span className={`text-3xl font-display font-bold tabular-nums ${color}`}>
        {count}
      </span>
      <p className="text-[10px] text-text-muted mt-1.5 tracking-[0.15em] uppercase font-mono">
        {label}
      </p>
    </motion.div>
  );
}

export default function DetectiveReport({
  report,
  targetName,
  confidence,
  findings,
}: DetectiveReportProps) {
  const socialFindings = findings.filter((f) => f.category === "social");
  const connectionFindings = findings.filter(
    (f) => f.category === "connection"
  );
  const locationFindings = findings.filter((f) => f.category === "location");
  const activityFindings = findings.filter((f) => f.category === "activity");

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      {/* Report header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative border border-accent/20 rounded-xl p-7 bg-accent/[0.02] overflow-hidden"
      >
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-accent/30 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-accent/30 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-accent/30 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-accent/30 rounded-br-xl" />

        {/* Top label */}
        <div className="flex items-center gap-2 mb-5">
          <div className="h-px w-4 bg-accent/40" />
          <span className="text-[10px] text-accent/60 tracking-[0.3em] uppercase font-mono">
            Investigation Report
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-text-muted tracking-wider uppercase font-mono mb-1">
              Subject
            </p>
            <h2 className="font-display text-3xl font-bold text-text-primary">
              {targetName}
            </h2>
          </div>
          {confidence && (
            <div className="text-right">
              <span className="font-display text-4xl font-bold text-accent tabular-nums">
                {confidence}
                <span className="text-lg text-accent/60">%</span>
              </span>
              <p className="text-[10px] text-text-muted tracking-wider font-mono mt-0.5">
                Overall Confidence
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Social Profiles"
          count={socialFindings.length}
          color="text-blue-400"
          delay={0.1}
        />
        <StatCard
          label="Connections"
          count={connectionFindings.length}
          color="text-purple-400"
          delay={0.15}
        />
        <StatCard
          label="Locations"
          count={locationFindings.length}
          color="text-green-400"
          delay={0.2}
        />
        <StatCard
          label="Activity"
          count={activityFindings.length}
          color="text-yellow-400"
          delay={0.25}
        />
      </div>

      {/* Full report */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative bg-bg-card/40 border border-border/60 rounded-xl p-7"
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="h-px w-4 bg-accent/30" />
          <h3 className="text-[10px] font-bold text-text-secondary tracking-[0.2em] uppercase font-mono">
            Full Report
          </h3>
        </div>
        <pre className="whitespace-pre-wrap text-[13px] text-text-primary/90 font-mono leading-[1.8]">
          {report}
        </pre>
      </motion.div>

      {/* Evidence list */}
      {findings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative bg-bg-card/40 border border-border/60 rounded-xl p-7"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px w-4 bg-accent/30" />
            <h3 className="text-[10px] font-bold text-text-secondary tracking-[0.2em] uppercase font-mono">
              All Evidence
            </h3>
            <span className="text-[10px] text-text-muted font-mono tabular-nums">
              {findings.length} items
            </span>
          </div>

          <div className="space-y-2">
            {findings.map((f) => {
              let confColor = "text-danger";
              if (f.confidence >= 80) confColor = "text-accent";
              else if (f.confidence >= 50) confColor = "text-warning";

              return (
                <div
                  key={f._id}
                  className="flex items-start gap-3 p-3.5 bg-bg-primary/50 rounded-lg border border-border/30 hover:border-border/60 transition-colors"
                >
                  <div className="flex flex-col items-center gap-0.5 pt-0.5">
                    <span
                      className={`text-[10px] font-bold font-mono tabular-nums ${confColor}`}
                    >
                      {f.confidence}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary leading-relaxed">
                      {f.data}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-text-muted/60 font-mono">
                        {f.source}
                      </span>
                      {f.platform && (
                        <span className="text-[10px] text-text-muted/60 font-mono">
                          {f.platform}
                        </span>
                      )}
                      {f.profileUrl && (
                        <a
                          href={f.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-accent/60 hover:text-accent transition-colors font-mono inline-flex items-center gap-1"
                        >
                          <svg
                            className="w-2 h-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          link
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
