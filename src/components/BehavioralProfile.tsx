import { useMemo } from "react";
import { motion } from "framer-motion";

interface BehavioralData {
  timezoneEstimate: string | null;
  usernamePatterns: string[];
  predictedHandles: string[];
  interestClusters: string[];
  platformAgeEstimation: string | null;
  behavioralNotes: string[];
}

interface Props {
  analysisJson: string;
}

function SectionHeader({ label, delay = 0 }: { label: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-3 mb-5"
    >
      <div className="h-px w-6 bg-accent/40" />
      <h3 className="text-[10px] font-bold text-accent/80 tracking-[0.3em] uppercase font-mono">
        {label}
      </h3>
      <div className="flex-1 h-px bg-border/40" />
    </motion.div>
  );
}

function AnalysisCard({
  label,
  children,
  index,
}: {
  label: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
      className="relative bg-bg-card/40 border border-border/40 rounded-xl p-5 group hover:border-border-bright hover:bg-bg-card/60 transition-all duration-300"
    >
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-accent/15 rounded-tl-xl" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-accent/15 rounded-br-xl" />
      <p className="text-[9px] text-text-muted tracking-[0.2em] uppercase font-mono mb-2.5">
        {label}
      </p>
      {children}
    </motion.div>
  );
}

export default function BehavioralProfile({ analysisJson }: Props) {
  const analysis = useMemo<BehavioralData | null>(() => {
    try {
      // Handle potential markdown code fences
      let cleaned = analysisJson.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }, [analysisJson]);

  if (!analysis) return null;

  let cardIndex = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.65 }}
    >
      <SectionHeader label="Behavioral Profile" delay={0.65} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Timezone */}
        {analysis.timezoneEstimate && (
          <AnalysisCard label="Timezone Estimate" index={cardIndex++}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-text-primary font-mono">
                {analysis.timezoneEstimate}
              </span>
            </div>
          </AnalysisCard>
        )}

        {/* Platform Age */}
        {analysis.platformAgeEstimation && (
          <AnalysisCard label="Online Since" index={cardIndex++}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span className="text-sm text-text-primary font-mono">
                {analysis.platformAgeEstimation}
              </span>
            </div>
          </AnalysisCard>
        )}

        {/* Username Patterns */}
        {analysis.usernamePatterns && analysis.usernamePatterns.length > 0 && (
          <AnalysisCard label="Username Patterns" index={cardIndex++}>
            <div className="flex flex-wrap gap-1.5">
              {analysis.usernamePatterns.map((pattern, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded-md bg-cyan-400/8 text-cyan-400 border border-cyan-400/20 text-[11px] font-mono"
                >
                  {pattern}
                </span>
              ))}
            </div>
          </AnalysisCard>
        )}

        {/* Predicted Handles */}
        {analysis.predictedHandles && analysis.predictedHandles.length > 0 && (
          <AnalysisCard label="Predicted Handles" index={cardIndex++}>
            <div className="flex flex-wrap gap-1.5">
              {analysis.predictedHandles.map((handle, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded-md bg-accent/10 text-accent border border-accent/20 text-[11px] font-mono font-medium"
                >
                  @{handle.replace(/^@/, "")}
                </span>
              ))}
            </div>
          </AnalysisCard>
        )}

        {/* Interest Clusters */}
        {analysis.interestClusters && analysis.interestClusters.length > 0 && (
          <AnalysisCard label="Interest Clusters" index={cardIndex++}>
            <div className="flex flex-wrap gap-1.5">
              {analysis.interestClusters.map((cluster, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded-md bg-yellow-400/8 text-yellow-400 border border-yellow-400/20 text-[11px] font-mono"
                >
                  {cluster}
                </span>
              ))}
            </div>
          </AnalysisCard>
        )}

        {/* Behavioral Notes */}
        {analysis.behavioralNotes && analysis.behavioralNotes.length > 0 && (
          <AnalysisCard label="Behavioral Notes" index={cardIndex++}>
            <ul className="space-y-1.5">
              {analysis.behavioralNotes.map((note, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-text-secondary leading-relaxed">
                  <span className="text-accent/40 shrink-0 mt-0.5">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </AnalysisCard>
        )}
      </div>
    </motion.div>
  );
}
