import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Finding {
  _id: string;
  source: string;
  category: string;
  platform?: string;
  profileUrl?: string;
  data: string;
  confidence: number;
}

interface Step {
  _id: string;
  stepNumber: number;
  action: string;
  tool: string;
  createdAt?: number;
}

interface DetectiveReportProps {
  report: string;
  targetName: string;
  confidence?: number;
  findings: Finding[];
  steps?: Step[];
  caseId: string;
  completedAt?: number;
  estimatedCost?: number;
}

/* ─── Helpers ─── */

const CATEGORY_STYLE: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  social: { dot: "bg-blue-400", text: "text-blue-400", bg: "bg-blue-400/8", border: "border-blue-400/20", label: "Social" },
  connection: { dot: "bg-purple-400", text: "text-purple-400", bg: "bg-purple-400/8", border: "border-purple-400/20", label: "Connection" },
  location: { dot: "bg-green-400", text: "text-green-400", bg: "bg-green-400/8", border: "border-green-400/20", label: "Location" },
  activity: { dot: "bg-yellow-400", text: "text-yellow-400", bg: "bg-yellow-400/8", border: "border-yellow-400/20", label: "Activity" },
  identity: { dot: "bg-cyan-400", text: "text-cyan-400", bg: "bg-cyan-400/8", border: "border-cyan-400/20", label: "Identity" },
};

const TOOL_LABELS: Record<string, string> = {
  reasoning: "Analysis",
  maigret: "OSINT Scan",
  browser_action: "Web Recon",
  face_check: "Face Match",
  save_finding: "Intel Logged",
  web_search: "Web Search",
};

function formatCaseNumber(id: string, completedAt?: number): string {
  const hash = id.slice(-6).toUpperCase();
  const year = completedAt ? new Date(completedAt).getFullYear() : new Date().getFullYear();
  return `TRC-${year}-${hash}`;
}

function formatDate(ts?: number): string {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })
    + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/* ─── Confidence Ring ─── */

function ConfidenceRing({ value, size = 120 }: { value: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  let color = "var(--color-danger)";
  if (value >= 80) color = "var(--color-accent)";
  else if (value >= 60) color = "var(--color-warning)";
  else if (value >= 40) color = "orange";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={6}
        />
        {/* Value ring */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="font-display text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {value}
        </motion.span>
        <span className="text-[9px] text-text-muted tracking-[0.2em] uppercase font-mono">
          confidence
        </span>
      </div>
    </div>
  );
}

/* ─── Typewriter Text ─── */

function TypewriterText({ text, speed = 8 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!text) return;
    let i = 0;
    // Reveal in chunks for performance
    const chunkSize = 15;
    const interval = setInterval(() => {
      i += chunkSize;
      if (i >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, i));
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <pre
      ref={containerRef}
      className={`whitespace-pre-wrap text-[13px] text-text-primary/90 font-mono leading-[1.8] ${
        !done ? "border-r-2 border-accent" : ""
      }`}
      style={!done ? { animation: "typewriterCursor 0.8s step-end infinite" } : undefined}
    >
      {displayed}
    </pre>
  );
}

/* ─── Section Header ─── */

function SectionHeader({ label, count, delay = 0 }: { label: string; count?: number; delay?: number }) {
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
      {count !== undefined && (
        <span className="text-[10px] text-text-muted font-mono tabular-nums">
          [{count}]
        </span>
      )}
      <div className="flex-1 h-px bg-border/40" />
    </motion.div>
  );
}

/* ─── Evidence Card ─── */

function EvidenceCard({ finding, index }: { finding: Finding; index: number }) {
  const style = CATEGORY_STYLE[finding.category] || CATEGORY_STYLE.identity;

  let confColor = "text-danger";
  if (finding.confidence >= 80) confColor = "text-accent";
  else if (finding.confidence >= 60) confColor = "text-warning";
  else if (finding.confidence >= 40) confColor = "text-orange-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.05 * index, ease: "easeOut" }}
      className="relative group bg-bg-card/50 border border-border/40 rounded-xl p-4 hover:border-border-bright hover:bg-bg-card-hover transition-all duration-300"
    >
      {/* Scan line effect on hover */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="absolute left-0 w-full h-px bg-accent/20"
          style={{ animation: "dossierScan 3s linear infinite" }}
        />
      </div>

      {/* Top row */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${style.dot}`} />
          <span className={`text-[9px] px-2 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border} tracking-[0.15em] uppercase font-mono font-medium`}>
            {style.label}
          </span>
          {finding.platform && (
            <span className="text-[10px] text-text-muted/60 font-mono">
              // {finding.platform}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-1 bg-bg-primary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${finding.confidence >= 80 ? "bg-accent" : finding.confidence >= 60 ? "bg-yellow-400" : finding.confidence >= 40 ? "bg-orange-400" : "bg-danger"}`}
              style={{ width: `${finding.confidence}%` }}
            />
          </div>
          <span className={`text-[10px] font-bold font-mono tabular-nums ${confColor}`}>
            {finding.confidence}%
          </span>
        </div>
      </div>

      {/* Content */}
      <p className="text-[13px] text-text-primary leading-relaxed">
        {finding.data}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-3 mt-3 text-[10px] text-text-muted/40 font-mono">
        <span className="flex items-center gap-1">
          <span className="text-text-muted/20">SRC:</span> {finding.source}
        </span>
        {finding.profileUrl && (
          <a
            href={finding.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent/50 hover:text-accent transition-colors inline-flex items-center gap-1"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            open
          </a>
        )}
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-accent/15 rounded-tl-xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-accent/15 rounded-br-xl pointer-events-none" />
    </motion.div>
  );
}

/* ─── Timeline Step ─── */

function TimelineStep({ step, index, isLast }: { step: Step; index: number; isLast: boolean }) {
  const toolLabel = TOOL_LABELS[step.tool] || step.tool.replace("_", " ");

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.03 * index }}
      className="flex gap-3"
    >
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-accent/40 border border-accent/60 shrink-0 mt-1.5" />
        {!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}
      </div>

      {/* Content */}
      <div className="pb-4 min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] text-accent/60 font-mono font-bold tracking-wider uppercase">
            {toolLabel}
          </span>
          <span className="text-[9px] text-text-muted/30 font-mono">
            #{step.stepNumber}
          </span>
        </div>
        <p className="text-[11px] text-text-secondary leading-relaxed truncate">
          {step.action}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─── */

export default function DetectiveReport({
  report,
  targetName,
  confidence,
  findings,
  steps,
  caseId,
  completedAt,
  estimatedCost,
}: DetectiveReportProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showFullReport, setShowFullReport] = useState(false);

  const categories = ["all", "social", "connection", "location", "activity", "identity"];
  const filteredFindings =
    activeCategory === "all"
      ? findings
      : findings.filter((f) => f.category === activeCategory);

  const categoryCounts = categories.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === "all" ? findings.length : findings.filter((f) => f.category === cat).length;
    return acc;
  }, {});

  const socialCount = categoryCounts["social"] ?? 0;
  const connectionCount = categoryCounts["connection"] ?? 0;
  const locationCount = categoryCounts["location"] ?? 0;
  const activityCount = categoryCounts["activity"] ?? 0;

  const caseNumber = formatCaseNumber(caseId, completedAt);

  return (
    <div className="min-h-screen bg-bg-primary relative">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ═══ DOSSIER HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative border-b border-accent/10"
      >
        {/* Top classification bar */}
        <div className="bg-accent/[0.03] border-b border-accent/10 px-6 py-2">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                <span className="text-[9px] text-danger/80 tracking-[0.3em] uppercase font-mono font-bold">
                  Classified
                </span>
              </div>
              <div className="h-3 w-px bg-border" />
              <span className="text-[9px] text-text-muted/40 tracking-[0.2em] uppercase font-mono">
                For authorized personnel only
              </span>
            </div>
            <span className="text-[9px] text-text-muted/30 font-mono tabular-nums">
              {caseNumber}
            </span>
          </div>
        </div>

        {/* Main header */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-8">
            {/* Left: Case info */}
            <div className="flex-1">
              {/* Case file label */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-4"
              >
                <a
                  href="/"
                  className="relative w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center group hover:bg-accent/15 transition-colors"
                >
                  <span className="font-display font-bold text-accent text-xs">T</span>
                  <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-accent/40" />
                  <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-accent/40" />
                </a>
                <div className="h-4 w-px bg-border" />
                <span className="text-[10px] text-accent/50 tracking-[0.3em] uppercase font-mono">
                  Case File {caseNumber}
                </span>
              </motion.div>

              {/* Subject name */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-[10px] text-text-muted tracking-wider uppercase font-mono mb-1">
                  Subject
                </p>
                <h1 className="font-display text-4xl sm:text-5xl font-bold text-text-primary tracking-tight">
                  {targetName}
                </h1>
              </motion.div>

              {/* Meta row */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap items-center gap-4 mt-5"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-[10px] text-accent font-bold tracking-[0.2em] uppercase font-mono">
                    Complete
                  </span>
                </div>
                <div className="h-3 w-px bg-border" />
                <span className="text-[10px] text-text-muted font-mono tabular-nums">
                  {formatDate(completedAt)}
                </span>
                <div className="h-3 w-px bg-border" />
                <span className="text-[10px] text-text-muted font-mono tabular-nums">
                  {steps?.length ?? 0} steps executed
                </span>
                {estimatedCost != null && (
                  <>
                    <div className="h-3 w-px bg-border" />
                    <span className="text-[10px] text-text-muted font-mono tabular-nums">
                      ${estimatedCost.toFixed(2)} cost
                    </span>
                  </>
                )}
              </motion.div>
            </div>

            {/* Right: Confidence ring */}
            {confidence != null && confidence > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", damping: 20 }}
                className="shrink-0 hidden sm:block"
              >
                <ConfidenceRing value={confidence} />
              </motion.div>
            )}
          </div>
        </div>

        {/* Classified stamp overlay */}
        <div
          className="absolute top-12 right-12 pointer-events-none select-none hidden lg:block"
          style={{ animation: "stampSlam 0.6s ease-out 0.8s both" }}
        >
          <div className="text-danger/[0.07] font-display font-black text-6xl tracking-[0.2em] uppercase -rotate-[4deg] border-4 border-danger/[0.07] rounded-lg px-6 py-2">
            Classified
          </div>
        </div>
      </motion.div>

      {/* ═══ CONTENT ═══ */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10 relative">

        {/* ── Quick stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Social Profiles", count: socialCount, color: "text-blue-400", accent: "border-blue-400/20" },
            { label: "Connections", count: connectionCount, color: "text-purple-400", accent: "border-purple-400/20" },
            { label: "Locations", count: locationCount, color: "text-green-400", accent: "border-green-400/20" },
            { label: "Activity Intel", count: activityCount, color: "text-yellow-400", accent: "border-yellow-400/20" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              className={`relative bg-bg-card/40 border border-border/40 ${stat.accent} rounded-xl p-5 text-center group hover:border-border-bright hover:bg-bg-card/60 transition-all duration-300`}
            >
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-accent/15 rounded-tl-xl" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-accent/15 rounded-br-xl" />
              <span className={`text-3xl font-display font-bold tabular-nums ${stat.color}`}>
                {stat.count}
              </span>
              <p className="text-[10px] text-text-muted mt-1.5 tracking-[0.15em] uppercase font-mono">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Executive Summary / Full Report ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="relative bg-bg-card/30 border border-border/40 rounded-xl overflow-hidden"
        >
          {/* Slow scan line effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute left-0 w-full h-px bg-accent/10"
              style={{ animation: "dossierScan 8s linear infinite" }}
            />
          </div>

          <div className="p-7">
            <div className="flex items-center justify-between mb-5">
              <SectionHeader label="Intelligence Report" delay={0.5} />
              <button
                onClick={() => setShowFullReport((v) => !v)}
                className="text-[10px] text-accent/50 hover:text-accent font-mono tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {showFullReport ? (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    hide
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    expand full report
                  </>
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {showFullReport ? (
                <motion.div
                  key="full"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TypewriterText text={report} speed={4} />
                </motion.div>
              ) : (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <pre className="whitespace-pre-wrap text-[13px] text-text-primary/90 font-mono leading-[1.8] line-clamp-6">
                    {report}
                  </pre>
                  <div className="mt-3 h-8 bg-gradient-to-t from-bg-card/30 to-transparent pointer-events-none -mb-7" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Evidence Board ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <SectionHeader label="Evidence Board" count={findings.length} delay={0.6} />

          {/* Category filter tabs */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              const catStyle = cat !== "all" ? CATEGORY_STYLE[cat] : null;
              const count = categoryCounts[cat];
              if (cat !== "all" && count === 0) return null;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wider uppercase transition-all cursor-pointer ${
                    isActive
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "bg-white/[0.02] text-text-muted hover:text-text-secondary border border-transparent hover:border-border"
                  }`}
                >
                  {catStyle && <div className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />}
                  {cat === "all" ? "All" : catStyle?.label}
                  <span className={`tabular-nums ${isActive ? "text-accent/60" : "text-text-muted/40"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Evidence cards grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {filteredFindings.map((finding, i) => (
                <EvidenceCard key={finding._id} finding={finding} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>

          {filteredFindings.length === 0 && (
            <div className="text-center py-10">
              <p className="text-text-muted text-xs font-mono">
                No findings in this category.
              </p>
            </div>
          )}
        </motion.div>

        {/* ── Operation Timeline ── */}
        {steps && steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="relative bg-bg-card/30 border border-border/40 rounded-xl p-7"
          >
            <SectionHeader label="Operation Timeline" count={steps.length} delay={0.7} />

            <div className="max-h-80 overflow-y-auto pr-2">
              {steps.map((step, i) => (
                <TimelineStep
                  key={step._id}
                  step={step}
                  index={i}
                  isLast={i === steps.length - 1}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Classification Footer ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="border-t border-border/30 pt-6 pb-10"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-danger/40" />
                <span className="text-[9px] text-text-muted/30 tracking-[0.3em] uppercase font-mono">
                  Classified — Handle with care
                </span>
              </div>
              <div className="h-3 w-px bg-border/30" />
              <span className="text-[9px] text-text-muted/20 font-mono tabular-nums">
                {caseNumber}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[9px] text-text-muted/20 font-mono">
                Generated by TRACE Intelligence System
              </span>
              <div className="h-3 w-px bg-border/30" />
              <a
                href="/"
                className="text-[9px] text-accent/40 hover:text-accent font-mono tracking-wider uppercase transition-colors"
              >
                New Investigation →
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
