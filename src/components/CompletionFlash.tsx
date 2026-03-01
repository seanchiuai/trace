import { motion } from "framer-motion";

interface CompletionFlashProps {
  findingsCount: number;
  stepsCount: number;
  confidence: number;
}

export default function CompletionFlash({
  findingsCount,
  stepsCount,
  confidence,
}: CompletionFlashProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(0,255,136,0.08) 0%, rgba(7,7,12,0.98) 70%)",
      }}
    >
      {/* Animated checkmark */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", damping: 20, stiffness: 200 }}
        className="relative w-24 h-24 mb-8"
      >
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          style={{
            boxShadow: "0 0 30px rgba(0,255,136,0.2), inset 0 0 30px rgba(0,255,136,0.05)",
          }}
        />

        {/* Check SVG */}
        <svg
          className="absolute inset-0 w-full h-full p-6"
          viewBox="0 0 24 24"
          fill="none"
        >
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
          />
        </svg>

        {/* Glow pulse */}
        <motion.div
          className="absolute inset-0 rounded-full bg-accent/10"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
        />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="font-display text-2xl sm:text-3xl font-bold tracking-[0.3em] text-text-primary mb-8"
      >
        INVESTIGATION COMPLETE
      </motion.h1>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="flex items-center gap-6 sm:gap-10"
      >
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-accent tabular-nums">
            {confidence}%
          </p>
          <p className="text-[10px] text-text-muted tracking-[0.2em] uppercase font-mono mt-1">
            Confidence
          </p>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-text-primary tabular-nums">
            {findingsCount}
          </p>
          <p className="text-[10px] text-text-muted tracking-[0.2em] uppercase font-mono mt-1">
            Findings
          </p>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-text-primary tabular-nums">
            {stepsCount}
          </p>
          <p className="text-[10px] text-text-muted tracking-[0.2em] uppercase font-mono mt-1">
            Steps
          </p>
        </div>
      </motion.div>

      {/* Loading report text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="mt-10 text-[11px] text-text-muted tracking-[0.2em] uppercase font-mono flex items-center gap-2"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        Loading report...
      </motion.p>
    </motion.div>
  );
}
