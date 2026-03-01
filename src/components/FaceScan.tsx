import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FaceScanProps {
  imageUrl: string;
  results?: { score: number; url: string; platform: string }[];
  onDismiss: () => void;
}

type ScanPhase = "scanning" | "matching" | "results";

function ConfidenceCounter({ target }: { target: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = target / steps;
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      setCurrent(Math.min(Math.round(increment * frame), target));
      if (frame >= steps) clearInterval(interval);
    }, duration / steps);

    return () => clearInterval(interval);
  }, [target]);

  return <span>{current}%</span>;
}

export default function FaceScan({
  results,
  onDismiss,
}: FaceScanProps) {
  const [phase, setPhase] = useState<ScanPhase>("scanning");

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("matching"), 2000),
      setTimeout(() => setPhase("results"), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const phaseLabel = {
    scanning: "Analyzing facial features...",
    matching: "Searching 200M+ faces...",
    results: "Matches identified",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-bg-secondary border border-border rounded-2xl p-8 max-w-2xl w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-accent), transparent)",
            opacity: 0.4,
          }}
        />

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <div className="absolute -top-px -left-px w-2.5 h-2.5 border-t border-l border-accent/40" />
            <div className="absolute -bottom-px -right-px w-2.5 h-2.5 border-b border-r border-accent/40" />
          </div>
          <div>
            <h3 className="font-display text-text-primary font-bold text-lg">
              Face Recognition
            </h3>
            <p className="text-text-muted text-[10px] tracking-wide font-mono">
              FaceCheck.id // Deep face matching engine
            </p>
          </div>
          <div className="ml-auto">
            <span className="text-[10px] text-accent/60 font-mono tracking-wider">
              {phase === "scanning" && "PHASE 1/3"}
              {phase === "matching" && "PHASE 2/3"}
              {phase === "results" && "PHASE 3/3"}
            </span>
          </div>
        </div>

        {/* Scan visualization */}
        <div className="relative w-full h-48 bg-bg-primary rounded-xl overflow-hidden mb-6 border border-border/60">
          {/* Scan line */}
          {phase === "scanning" && (
            <div
              className="absolute left-0 w-full h-0.5 bg-accent"
              style={{
                animation: "scanLine 1.5s ease-in-out infinite",
                boxShadow: "0 0 30px rgba(0,255,136,0.6), 0 0 60px rgba(0,255,136,0.2)",
              }}
            />
          )}

          {/* Grid overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,255,136,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px)",
              backgroundSize: "10% 10%",
            }}
          />

          {/* Face detection brackets */}
          <AnimatePresence>
            {(phase === "matching" || phase === "results") && (
              <>
                {[
                  { x: 18, y: 12, w: 16, h: 22 },
                  { x: 43, y: 18, w: 14, h: 19 },
                  { x: 68, y: 10, w: 17, h: 24 },
                ].map((face, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.2, type: "spring", damping: 20 }}
                    className="absolute border border-accent/60 rounded"
                    style={{
                      left: `${face.x}%`,
                      top: `${face.y}%`,
                      width: `${face.w}%`,
                      height: `${face.h}%`,
                      boxShadow:
                        phase === "results"
                          ? "0 0 15px rgba(0,255,136,0.2)"
                          : undefined,
                    }}
                  >
                    <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-accent" />
                    <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-accent" />
                    <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-accent" />
                    <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-accent" />
                    {phase === "results" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-accent font-mono font-bold whitespace-nowrap"
                      >
                        MATCH {i + 1}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Bottom status bar */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-bg-primary/90 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="status-dot" />
                <span className="text-[10px] text-accent font-bold tracking-[0.15em] uppercase font-mono">
                  {phaseLabel[phase]}
                </span>
              </div>
            </div>
            <div className="w-full h-1 bg-bg-card rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: "0%" }}
                animate={{
                  width:
                    phase === "scanning"
                      ? "35%"
                      : phase === "matching"
                        ? "75%"
                        : "100%",
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{
                  boxShadow: "0 0 8px rgba(0,255,136,0.4)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Match results */}
        <AnimatePresence>
          {phase === "results" && results && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2.5"
            >
              {results.map((match, i) => {
                const isHighConf = match.score >= 90;

                return (
                  <motion.div
                    key={i}
                    initial={{ x: 60, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                      delay: i * 0.25,
                      type: "spring",
                      damping: 22,
                    }}
                    className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      isHighConf
                        ? "bg-accent/5 border-accent/25"
                        : "bg-bg-card/60 border-border/60"
                    }`}
                    style={
                      isHighConf
                        ? {
                            boxShadow:
                              "0 0 20px rgba(0,255,136,0.08), inset 0 0 20px rgba(0,255,136,0.02)",
                          }
                        : undefined
                    }
                  >
                    {/* Platform icon */}
                    <div className="w-11 h-11 rounded-xl bg-bg-primary border border-border flex items-center justify-center">
                      <span className="text-text-muted text-[10px] font-bold font-mono tracking-wide">
                        {match.platform.slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-display text-text-primary text-sm font-medium">
                        {match.platform}
                      </p>
                      <p className="text-text-muted text-[10px] font-mono truncate">
                        {match.url}
                      </p>
                    </div>

                    <div
                      className={`text-2xl font-display font-bold tabular-nums ${
                        isHighConf ? "text-accent" : "text-warning"
                      }`}
                    >
                      <ConfidenceCounter target={Math.round(match.score)} />
                    </div>

                    {isHighConf && (
                      <div className="absolute top-2 right-2">
                        <span className="text-[8px] text-accent/60 font-mono tracking-wider">
                          HIGH MATCH
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dismiss hint */}
        <p className="text-center text-text-muted/40 text-[10px] mt-6 tracking-wide font-mono">
          Click anywhere to dismiss
        </p>
      </motion.div>
    </motion.div>
  );
}
