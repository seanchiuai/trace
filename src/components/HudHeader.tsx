import { motion, AnimatePresence } from "framer-motion";

interface HudHeaderProps {
  targetName: string;
  statusLabel: string;
  statusColor: string;
  dotColor: string;
  pulse: boolean;
  stepCount: number;
  costDisplay: string;
  contextWindowPct: number;
  totalTokens: number;
  errorMessage?: string;
}

export default function HudHeader({
  targetName,
  statusLabel,
  statusColor,
  dotColor,
  pulse,
  stepCount,
  costDisplay,
  contextWindowPct,
  totalTokens,
  errorMessage,
}: HudHeaderProps) {
  const progress = Math.min((stepCount / 20) * 100, 100);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 inset-x-0 z-20 h-14 flex items-center justify-between px-4 sm:px-6"
      >
        {/* Left pill — Logo + target */}
        <a
          href="/"
          className="flex items-center gap-2.5 h-9 px-3.5 rounded-full glass hover:bg-white/[0.07] transition-colors group"
        >
          <div className="relative w-6 h-6 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center">
            <span className="font-display font-bold text-accent text-[10px]">T</span>
          </div>
          <div className="h-3.5 w-px bg-white/10" />
          <span className="text-[10px] text-text-muted tracking-wider uppercase font-mono max-sm:hidden">
            Subject
          </span>
          <span className="text-[13px] text-text-primary font-display font-medium truncate max-w-[180px]">
            {targetName}
          </span>
        </a>

        {/* Right pills */}
        <div className="flex items-center gap-2">
          {/* Status badge */}
          <div className="flex items-center gap-2 h-9 px-3.5 rounded-full glass">
            <div className="relative">
              <div className={`w-2 h-2 rounded-full ${dotColor}`} />
              {pulse && (
                <div className={`absolute inset-0 rounded-full ${dotColor} animate-ping opacity-40`} />
              )}
            </div>
            <span className={`text-[10px] font-bold tracking-[0.2em] ${statusColor}`}>
              {statusLabel}
            </span>
          </div>

          {/* Step counter */}
          <div className="flex items-center gap-2 h-9 px-3.5 rounded-full glass">
            <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent/60 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <span className="text-[10px] text-text-muted font-mono tabular-nums">
              {stepCount}/20
            </span>
          </div>

          {/* Context + tokens + cost (hidden on small screens) */}
          <div className="hidden sm:flex items-center gap-2 h-9 px-3.5 rounded-full glass">
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    contextWindowPct > 80
                      ? "bg-danger"
                      : contextWindowPct > 50
                        ? "bg-warning"
                        : "bg-info/60"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${contextWindowPct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <span className="text-[10px] text-text-muted font-mono tabular-nums">
                {contextWindowPct.toFixed(0)}%
              </span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-[10px] text-text-muted font-mono tabular-nums">
              {totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens} tok
            </span>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-[10px] text-text-muted font-mono tabular-nums">
              {costDisplay}
            </span>
          </div>
        </div>
      </motion.header>

      {/* Error alert pill */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-20 max-w-lg w-[90vw]"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-danger/10 backdrop-blur-xl border border-danger/20">
              <span className="text-danger font-bold text-sm">!</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-danger font-bold tracking-[0.2em] uppercase mb-0.5">
                  Investigation Failed
                </p>
                <p className="text-[11px] text-text-secondary font-mono truncate">
                  {errorMessage}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
