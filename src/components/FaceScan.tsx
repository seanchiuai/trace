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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-bg-secondary border border-border rounded-2xl p-8 max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <span className="text-accent text-lg">F</span>
          </div>
          <div>
            <h3 className="text-text-primary font-bold">
              Face Recognition
            </h3>
            <p className="text-text-muted text-xs">
              Searching 200M+ faces across the internet
            </p>
          </div>
        </div>

        {/* Scan visualization */}
        <div className="relative w-full h-48 bg-bg-primary rounded-xl overflow-hidden mb-6 border border-border">
          {/* Scan line */}
          {phase === "scanning" && (
            <div
              className="absolute left-0 w-full h-0.5 bg-accent shadow-[0_0_20px_rgba(0,255,136,0.8)]"
              style={{
                animation: "scanLine 1.5s ease-in-out infinite",
              }}
            />
          )}

          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`h-${i}`}
                className="absolute w-full h-px bg-accent"
                style={{ top: `${(i + 1) * 10}%` }}
              />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`v-${i}`}
                className="absolute h-full w-px bg-accent"
                style={{ left: `${(i + 1) * 10}%` }}
              />
            ))}
          </div>

          {/* Face detection brackets */}
          <AnimatePresence>
            {(phase === "matching" || phase === "results") && (
              <>
                {[
                  { x: 20, y: 15, w: 15, h: 20 },
                  { x: 45, y: 20, w: 14, h: 18 },
                  { x: 70, y: 12, w: 16, h: 22 },
                ].map((face, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.2, type: "spring" }}
                    className="absolute border-2 border-accent rounded"
                    style={{
                      left: `${face.x}%`,
                      top: `${face.y}%`,
                      width: `${face.w}%`,
                      height: `${face.h}%`,
                      animation:
                        phase === "results"
                          ? "confidenceGlow 2s ease-in-out infinite"
                          : undefined,
                    }}
                  >
                    {/* Corner brackets */}
                    <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-accent" />
                    <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-accent" />
                    <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-accent" />
                    <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-accent" />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Center status */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2">
              <span className="text-accent text-xs font-bold uppercase tracking-wider">
                {phase === "scanning" && "Scanning faces..."}
                {phase === "matching" && "Searching database..."}
                {phase === "results" && "Matches found"}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1 bg-bg-card rounded-full mt-2 overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: "0%" }}
                animate={{
                  width:
                    phase === "scanning"
                      ? "40%"
                      : phase === "matching"
                        ? "80%"
                        : "100%",
                }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        </div>

        {/* Match results */}
        <AnimatePresence>
          {phase === "results" && results && (
            <div className="space-y-3">
              {results.map((match, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.3, type: "spring" }}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${
                    match.score >= 90
                      ? "bg-accent/10 border-accent/30"
                      : "bg-bg-card border-border"
                  }`}
                  style={
                    match.score >= 90
                      ? { animation: "confidenceGlow 2s ease-in-out infinite" }
                      : undefined
                  }
                >
                  {/* Platform icon placeholder */}
                  <div className="w-12 h-12 rounded-xl bg-bg-primary border border-border flex items-center justify-center text-text-muted text-xs font-bold">
                    {match.platform.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-text-primary text-sm font-medium">
                      {match.platform}
                    </p>
                    <p className="text-text-muted text-xs truncate">
                      {match.url}
                    </p>
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      match.score >= 90 ? "text-accent" : "text-warning"
                    }`}
                  >
                    <ConfidenceCounter target={Math.round(match.score)} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Dismiss hint */}
        <p className="text-center text-text-muted text-xs mt-6">
          Click anywhere to dismiss
        </p>
      </motion.div>
    </motion.div>
  );
}
