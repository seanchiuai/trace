import { motion } from "framer-motion";

interface BrowserViewProps {
  liveUrl?: string;
  status: string;
}

export default function BrowserView({ liveUrl, status }: BrowserViewProps) {
  if (!liveUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center relative">
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
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border border-border" />
            <div className="absolute inset-2 rounded-full border border-border/60" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-text-muted/60"
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

          <p className="font-display text-text-secondary text-sm font-medium mb-2">
            Browser View
          </p>
          <p className="text-text-muted text-xs max-w-xs leading-relaxed">
            {status === "planning"
              ? "Waiting for investigation to initialize..."
              : "The live browser session will appear here when the agent starts browsing the web."}
          </p>

          {status === "investigating" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex items-center justify-center gap-2"
            >
              <div className="status-dot" />
              <span className="text-[10px] text-accent tracking-[0.2em] uppercase font-mono">
                Connecting to browser
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* URL bar */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-3 bg-bg-secondary/50">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-danger/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent/40" />
        </div>

        <div className="flex-1 flex items-center gap-2 px-3 py-1 bg-bg-card/60 rounded-md">
          <svg
            className="w-3 h-3 text-text-muted/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
            />
          </svg>
          <span className="text-[11px] text-text-muted font-mono truncate">
            {liveUrl}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="status-dot" />
          <span className="text-[10px] text-accent tracking-[0.15em] uppercase font-mono font-bold">
            Live
          </span>
        </div>
      </div>

      {/* iframe */}
      <iframe
        src={liveUrl}
        className="flex-1 w-full bg-black"
        title="Browser Use Live View"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
}
