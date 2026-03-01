import { motion } from "framer-motion";

interface BrowserViewProps {
  liveUrl?: string;
  status: string;
}

export default function BrowserView({ liveUrl, status }: BrowserViewProps) {
  if (!liveUrl) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-12 text-center relative rounded-xl overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          {/* Globe icon with rings */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border border-border" />
            <div className="absolute inset-2 rounded-full border border-border/60" />
            <div className="absolute inset-4 rounded-full border border-border/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-text-muted/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            </div>
            {status === "investigating" && (
              <div className="absolute inset-0 rounded-full border border-accent/20 animate-ping" />
            )}
          </div>

          <p className="font-display text-text-secondary text-base font-medium mb-2">
            Browser View
          </p>
          <p className="text-text-muted text-xs max-w-xs leading-relaxed mx-auto">
            {status === "planning"
              ? "Waiting for investigation to initialize..."
              : status === "complete" || status === "failed" || status === "stopped"
              ? "No browser session was used in this investigation."
              : "The agent will open a browser when it needs to interact with a website. Most lookups use faster tools first."}
          </p>

          {(status === "investigating" || status === "awaiting_input") && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex items-center justify-center gap-2"
            >
              <div className="status-dot" />
              <span className="text-[10px] text-text-muted tracking-[0.2em] uppercase font-mono">
                Standby — waiting for browser action
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="h-full w-full relative rounded-xl overflow-hidden hud-corners"
      style={{ isolation: "isolate" }}
    >
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none rounded-xl"
        style={{
          animation: "vignetteBreath 4s ease-in-out infinite",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.5), inset 0 0 120px rgba(0,0,0,0.2)",
        }}
      />

      {/* Floating LIVE pill */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full glass">
        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        <span className="text-[9px] text-accent tracking-[0.2em] uppercase font-mono font-bold">
          Live
        </span>
      </div>

      {/* Floating URL label */}
      <div className="absolute bottom-3 left-3 z-10 max-w-[60%]">
        <span className="text-[10px] text-text-muted/50 font-mono truncate block px-2 py-0.5 rounded glass">
          {liveUrl}
        </span>
      </div>

      {/* iframe — full-bleed, no sandbox to allow Browser Use live stream */}
      <iframe
        src={liveUrl}
        className="w-full h-full bg-black rounded-xl"
        title="Browser Use Live View"
        allow="clipboard-read; clipboard-write"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
