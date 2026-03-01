import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { motion } from "framer-motion";

const STATUS_STYLES: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  planning:      { label: "Planning",      dot: "bg-blue-400",   text: "text-blue-400",   bg: "bg-blue-400/8",   border: "border-blue-400/20" },
  investigating: { label: "Investigating", dot: "bg-amber-400",  text: "text-amber-400",  bg: "bg-amber-400/8",  border: "border-amber-400/20" },
  analyzing:     { label: "Analyzing",     dot: "bg-purple-400", text: "text-purple-400", bg: "bg-purple-400/8", border: "border-purple-400/20" },
  complete:      { label: "Complete",      dot: "bg-accent",     text: "text-accent",     bg: "bg-accent/8",     border: "border-accent/20" },
  failed:        { label: "Failed",        dot: "bg-danger",     text: "text-danger",     bg: "bg-danger/8",     border: "border-danger/20" },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function Runs() {
  const investigations = useQuery(api.investigations.list);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Atmospheric background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow — top center */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,255,136,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 border-b border-border px-8 py-5"
      >
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link
            to="/"
            className="relative w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center group hover:bg-accent/15 transition-colors"
          >
            <span className="font-display font-bold text-accent text-sm">T</span>
            <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-accent/50" />
            <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-accent/50" />
          </Link>
          <div className="flex items-baseline gap-3">
            <Link to="/" className="font-display text-lg font-bold tracking-tight text-text-primary hover:text-accent transition-colors">
              TRACE
            </Link>
            <div className="h-3 w-px bg-border" />
            <span className="text-[10px] text-accent font-bold tracking-[0.25em] uppercase font-mono">
              All Runs
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="status-dot" />
            <span className="text-[10px] text-text-muted tracking-wider uppercase font-mono">
              Online
            </span>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="relative z-10 flex-1 px-8 py-10">
        <div className="max-w-5xl mx-auto">
          {/* HUD heading */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="h-px w-6 bg-accent/40" />
            <h2 className="text-[10px] font-bold text-accent/80 tracking-[0.3em] uppercase font-mono">
              Investigation Log
            </h2>
            {investigations && (
              <span className="text-[10px] text-text-muted font-mono tabular-nums">
                [{investigations.length}]
              </span>
            )}
            <div className="flex-1 h-px bg-border/40" />
          </motion.div>

          {/* Loading */}
          {investigations === undefined && (
            <div className="flex items-center justify-center py-32">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-2 border-accent/20 rounded-full" />
                  <div className="absolute inset-0 border-2 border-transparent border-t-accent rounded-full animate-spin" />
                </div>
                <span className="text-[10px] text-text-muted tracking-[0.3em] uppercase font-mono">
                  Loading investigations
                </span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {investigations && investigations.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="w-16 h-16 rounded-2xl bg-accent/5 border border-accent/10 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-accent/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-text-muted text-xs font-mono mb-1">No investigations yet.</p>
              <Link
                to="/"
                className="text-[10px] text-accent/60 hover:text-accent font-mono tracking-wider uppercase transition-colors mt-2"
              >
                Start your first investigation →
              </Link>
            </motion.div>
          )}

          {/* Card grid */}
          {investigations && investigations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {investigations.map((inv, i) => {
                const style = STATUS_STYLES[inv.status] || STATUS_STYLES.planning;
                const isComplete = inv.status === "complete";
                const href = isComplete ? `/report/${inv._id}` : `/investigate/${inv._id}`;

                return (
                  <motion.div
                    key={inv._id}
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.05 * i, ease: "easeOut" }}
                  >
                    <Link
                      to={href}
                      className="group relative block bg-bg-card/50 border border-border/40 rounded-xl p-5 hover:border-border-bright hover:bg-bg-card-hover transition-all duration-300"
                    >
                      {/* Hover glow */}
                      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{ boxShadow: "inset 0 0 30px rgba(0,255,136,0.03)" }}
                      />

                      {/* Corner accents */}
                      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-accent/15 rounded-tl-xl pointer-events-none" />
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-accent/15 rounded-br-xl pointer-events-none" />

                      {/* Top row: name + status */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-display font-semibold text-text-primary text-sm truncate group-hover:text-accent transition-colors">
                          {inv.targetName}
                        </h3>
                        <div className={`flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full ${style.bg} border ${style.border}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${style.dot} ${inv.status === "investigating" || inv.status === "analyzing" ? "animate-pulse" : ""}`} />
                          <span className={`text-[9px] font-bold tracking-[0.15em] uppercase font-mono ${style.text}`}>
                            {style.label}
                          </span>
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 text-[10px] text-text-muted/50 font-mono">
                        <span className="tabular-nums">{timeAgo(inv.createdAt)}</span>
                        <div className="h-2.5 w-px bg-border/30" />
                        <span className="tabular-nums">{inv.stepCount}/{20} steps</span>
                        {inv.estimatedCost != null && (
                          <>
                            <div className="h-2.5 w-px bg-border/30" />
                            <span className="tabular-nums">${inv.estimatedCost.toFixed(2)}</span>
                          </>
                        )}
                      </div>

                      {/* Confidence bar (complete only) */}
                      {isComplete && inv.confidence != null && inv.confidence > 0 && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
                          <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                inv.confidence >= 80 ? "bg-accent" : inv.confidence >= 60 ? "bg-yellow-400" : inv.confidence >= 40 ? "bg-orange-400" : "bg-danger"
                              }`}
                              style={{ width: `${inv.confidence}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-bold font-mono tabular-nums ${
                            inv.confidence >= 80 ? "text-accent" : inv.confidence >= 60 ? "text-yellow-400" : inv.confidence >= 40 ? "text-orange-400" : "text-danger"
                          }`}>
                            {inv.confidence}%
                          </span>
                        </div>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
