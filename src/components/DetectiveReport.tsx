import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import BehavioralProfile from "./BehavioralProfile";

interface Finding {
  _id: string;
  source: string;
  category: string;
  platform?: string;
  profileUrl?: string;
  imageUrl?: string;
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

interface CandidateProfile {
  label: string;
  matchConfidence: number;
  findingIndices: number[];
  findingIds: string[];
  keyEvidence: number[];
  keyEvidenceIds: string[];
  redFlags: string[];
  summary: string;
}

interface ProfileReport {
  profiles: CandidateProfile[];
  unattributed: string[];
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
  behavioralAnalysis?: string;
  profileReport?: string;
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
  save_finding: "Intel Logged",
  web_search: "Web Search",
  geo_locate: "Photo Geolocation",
  whitepages: "Person Lookup",
  reverse_image: "Image Search",
  darkweb: "Dark Web Intel",
  ask_user: "User Input",
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

function EvidenceCard({ finding, index, onImageClick }: { finding: Finding; index: number; onImageClick?: (finding: Finding) => void }) {
  const style = CATEGORY_STYLE[finding.category] || CATEGORY_STYLE.identity;
  const [imgFailed, setImgFailed] = useState(false);

  let confColor = "text-danger";
  if (finding.confidence >= 80) confColor = "text-accent";
  else if (finding.confidence >= 60) confColor = "text-warning";
  else if (finding.confidence >= 40) confColor = "text-orange-400";

  const hasImage = finding.imageUrl && !imgFailed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.05 * index, ease: "easeOut" }}
      className="relative group bg-bg-card/50 border border-border/40 rounded-xl overflow-hidden hover:border-border-bright hover:bg-bg-card-hover transition-all duration-300"
    >
      {/* Scan line effect on hover */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="absolute left-0 w-full h-px bg-accent/20"
          style={{ animation: "dossierScan 3s linear infinite" }}
        />
      </div>

      <div className={hasImage ? "flex" : ""}>
        {/* Image thumbnail */}
        {hasImage && (
          <div
            className="relative w-28 shrink-0 bg-bg-primary cursor-pointer"
            onClick={() => onImageClick?.(finding)}
          >
            <img
              src={finding.imageUrl}
              alt={finding.data.slice(0, 80)}
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-bg-card/50 pointer-events-none" />
            {/* Zoom icon on hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
              <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-80 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </div>
        )}

        <div className="flex-1 p-4 min-w-0">
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
        </div>
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-accent/15 rounded-tl-xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-accent/15 rounded-br-xl pointer-events-none" />
    </motion.div>
  );
}

/* ─── Gallery Card ─── */

function GalleryCard({
  finding,
  index,
  catStyle,
  onImageClick,
}: {
  finding: Finding;
  index: number;
  catStyle?: { dot: string; text: string; bg: string; border: string; label: string };
  onImageClick: (finding: Finding) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group relative border border-border rounded-lg overflow-hidden bg-bg-secondary hover:border-accent/30 transition-colors cursor-pointer"
      onClick={() => onImageClick(finding)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-bg-primary">
        <img
          src={finding.imageUrl}
          alt={finding.data.slice(0, 100)}
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
        {/* Zoom overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </div>
        {/* Category badge */}
        {catStyle && (
          <span
            className={`absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}
          >
            {catStyle.label}
          </span>
        )}
        {/* Confidence badge */}
        <span
          className={`absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
            finding.confidence >= 80
              ? "bg-accent/20 text-accent"
              : finding.confidence >= 60
                ? "bg-yellow-400/20 text-yellow-400"
                : "bg-red-400/20 text-red-400"
          }`}
        >
          {finding.confidence}%
        </span>
      </div>
      {/* Caption */}
      <div className="p-2">
        <p className="text-[10px] text-text-secondary leading-tight line-clamp-2">
          {finding.data.slice(0, 120)}
        </p>
        {finding.platform && (
          <p className="text-[9px] text-text-muted mt-1 uppercase tracking-wider">
            {finding.platform}
          </p>
        )}
        {finding.profileUrl && (
          <a
            href={finding.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-accent hover:underline mt-0.5 block truncate"
          >
            {finding.profileUrl}
          </a>
        )}
      </div>
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
  behavioralAnalysis,
  profileReport: profileReportJson,
}: DetectiveReportProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showFullReport, setShowFullReport] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<Finding | null>(null);
  const [activeProfileIdx, setActiveProfileIdx] = useState(0);

  // Parse profile report JSON (graceful fallback if missing/invalid)
  const profileReport = useMemo<ProfileReport | null>(() => {
    if (!profileReportJson) return null;
    try {
      const parsed = JSON.parse(profileReportJson);
      if (parsed.profiles && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        return parsed as ProfileReport;
      }
    } catch { /* fall through */ }
    return null;
  }, [profileReportJson]);

  const hasMultipleProfiles = profileReport !== null && profileReport.profiles.length > 1;
  const activeProfile = profileReport?.profiles[activeProfileIdx] ?? null;

  // Build finding lookup for profile view
  const findingById = useMemo(() => {
    const map = new Map<string, Finding>();
    for (const f of findings) map.set(f._id, f);
    return map;
  }, [findings]);

  // Get findings for the active profile tab (or all findings if no profile report)
  const profileFindings = useMemo(() => {
    if (!activeProfile) return findings;
    return activeProfile.findingIds
      .map((id: string) => findingById.get(id))
      .filter((f): f is Finding => f !== undefined);
  }, [activeProfile, findings, findingById]);

  const unattributedFindings = useMemo(() => {
    if (!profileReport) return [];
    return profileReport.unattributed
      .map((id: string) => findingById.get(id))
      .filter((f): f is Finding => f !== undefined);
  }, [profileReport, findingById]);

  // Use profile-scoped findings for category counts when viewing a profile
  const displayFindings = activeProfileIdx === -1
    ? unattributedFindings
    : activeProfile
      ? profileFindings
      : findings;

  const categories = ["all", "social", "connection", "location", "activity", "identity"];
  const filteredFindings =
    activeCategory === "all"
      ? displayFindings
      : displayFindings.filter((f) => f.category === activeCategory);

  const categoryCounts = categories.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === "all" ? displayFindings.length : displayFindings.filter((f) => f.category === cat).length;
    return acc;
  }, {});

  const socialCount = categoryCounts["social"] ?? 0;
  const connectionCount = categoryCounts["connection"] ?? 0;
  const locationCount = categoryCounts["location"] ?? 0;
  const activityCount = categoryCounts["activity"] ?? 0;

  const caseNumber = formatCaseNumber(caseId, completedAt);

  return (
    <div className="min-h-screen bg-bg-primary relative">
      {/* ═══ IMAGE LIGHTBOX ═══ */}
      <AnimatePresence>
        {lightboxImage && lightboxImage.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative max-w-4xl max-h-[85vh] mx-4 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImage.imageUrl}
                alt={lightboxImage.data.slice(0, 100)}
                className="max-w-full max-h-[75vh] object-contain rounded-lg border border-border/40"
                referrerPolicy="no-referrer"
              />
              {/* Image info bar */}
              <div className="mt-3 bg-bg-card/80 border border-border/40 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  {CATEGORY_STYLE[lightboxImage.category] && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${CATEGORY_STYLE[lightboxImage.category].bg} ${CATEGORY_STYLE[lightboxImage.category].text} border ${CATEGORY_STYLE[lightboxImage.category].border} tracking-[0.15em] uppercase font-mono font-medium`}>
                      {CATEGORY_STYLE[lightboxImage.category].label}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold font-mono tabular-nums ${lightboxImage.confidence >= 80 ? "text-accent" : lightboxImage.confidence >= 60 ? "text-warning" : "text-danger"}`}>
                    {lightboxImage.confidence}%
                  </span>
                  {lightboxImage.platform && (
                    <span className="text-[10px] text-text-muted/60 font-mono">
                      {lightboxImage.platform}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-text-secondary leading-relaxed line-clamp-2">
                  {lightboxImage.data}
                </p>
                {lightboxImage.profileUrl && (
                  <a
                    href={lightboxImage.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-accent/60 hover:text-accent font-mono mt-1.5 inline-block transition-colors"
                  >
                    {lightboxImage.profileUrl}
                  </a>
                )}
              </div>
              {/* Close button */}
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-accent/40 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <div className="flex items-center gap-3">
              <Link
                to="/runs"
                className="text-[9px] text-text-muted/40 hover:text-accent font-mono tracking-[0.2em] uppercase transition-colors"
              >
                All Runs
              </Link>
              <div className="h-3 w-px bg-border/30" />
              <span className="text-[9px] text-text-muted/30 font-mono tabular-nums">
                {caseNumber}
              </span>
            </div>
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
                <Link
                  to="/"
                  className="relative w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center group hover:bg-accent/15 transition-colors"
                >
                  <span className="font-display font-bold text-accent text-xs">T</span>
                  <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-accent/40" />
                  <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-accent/40" />
                </Link>
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

        {/* ── Profile Tabs (multi-profile only) ── */}
        {hasMultipleProfiles && profileReport && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <SectionHeader label="Candidate Profiles" count={profileReport.profiles.length} delay={0.45} />

            {/* Tab bar */}
            <div className="flex flex-wrap gap-2 mb-4">
              {profileReport.profiles.map((profile, idx) => {
                const isActive = activeProfileIdx === idx;
                let confColor = "text-danger";
                if (profile.matchConfidence >= 80) confColor = "text-accent";
                else if (profile.matchConfidence >= 60) confColor = "text-warning";
                else if (profile.matchConfidence >= 40) confColor = "text-orange-400";

                return (
                  <button
                    key={idx}
                    onClick={() => { setActiveProfileIdx(idx); setActiveCategory("all"); }}
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                      isActive
                        ? "bg-accent/10 text-accent border border-accent/30"
                        : "bg-bg-card/40 text-text-secondary hover:text-text-primary border border-border/40 hover:border-border-bright"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-accent/40 rounded-tl-lg" />
                    )}
                    <span className="truncate max-w-[220px]">{profile.label}</span>
                    <span className={`font-bold tabular-nums ${confColor}`}>
                      {profile.matchConfidence}%
                    </span>
                  </button>
                );
              })}
              {unattributedFindings.length > 0 && (
                <button
                  onClick={() => { setActiveProfileIdx(-1); setActiveCategory("all"); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                    activeProfileIdx === -1
                      ? "bg-text-muted/10 text-text-primary border border-text-muted/30"
                      : "bg-bg-card/40 text-text-muted hover:text-text-secondary border border-border/40 hover:border-border-bright"
                  }`}
                >
                  Unattributed
                  <span className="tabular-nums text-text-muted/60">{unattributedFindings.length}</span>
                </button>
              )}
            </div>

            {/* Active profile card */}
            <AnimatePresence mode="wait">
              {activeProfile && (
                <motion.div
                  key={activeProfileIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="bg-bg-card/30 border border-border/40 rounded-xl p-5 space-y-3"
                >
                  {/* Summary */}
                  {activeProfile.summary && (
                    <p className="text-[13px] text-text-secondary leading-relaxed font-mono">
                      {activeProfile.summary}
                    </p>
                  )}

                  {/* Key evidence highlights */}
                  {activeProfile.keyEvidenceIds.length > 0 && (
                    <div>
                      <span className="text-[9px] text-accent/60 tracking-[0.2em] uppercase font-mono font-bold">
                        Key Evidence
                      </span>
                      <div className="mt-1.5 space-y-1">
                        {activeProfile.keyEvidenceIds.map((id: string) => {
                          const f = findingById.get(id);
                          if (!f) return null;
                          return (
                            <div key={id} className="flex items-start gap-2 text-[11px]">
                              <div className="w-1.5 h-1.5 rounded-full bg-accent/60 mt-1.5 shrink-0" />
                              <span className="text-text-primary/80">{f.data}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Red flags */}
                  {activeProfile.redFlags.length > 0 && (
                    <div>
                      <span className="text-[9px] text-danger/60 tracking-[0.2em] uppercase font-mono font-bold">
                        Red Flags
                      </span>
                      <div className="mt-1.5 space-y-1">
                        {activeProfile.redFlags.map((flag: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-[11px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-danger/60 mt-1.5 shrink-0" />
                            <span className="text-danger/80">{flag}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Unattributed view */}
              {activeProfileIdx === -1 && (
                <motion.div
                  key="unattributed"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="bg-bg-card/30 border border-border/40 rounded-xl p-5"
                >
                  <p className="text-[12px] text-text-muted font-mono">
                    These findings could not be confidently attributed to any candidate profile.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

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
                <EvidenceCard key={finding._id} finding={finding} index={i} onImageClick={setLightboxImage} />
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

        {/* ── Behavioral Profile ── */}
        {behavioralAnalysis && (
          <BehavioralProfile analysisJson={behavioralAnalysis} />
        )}

        {/* ── Visual Evidence Gallery ── */}
        {findings.some((f) => f.imageUrl) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <SectionHeader
              label="Visual Evidence"
              count={findings.filter((f) => f.imageUrl).length}
              delay={0.7}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {findings
                .filter((f) => f.imageUrl)
                .map((finding, i) => {
                  const catStyle = CATEGORY_STYLE[finding.category];
                  return (
                    <GalleryCard
                      key={finding._id + "-img"}
                      finding={finding}
                      index={i}
                      catStyle={catStyle}
                      onImageClick={setLightboxImage}
                    />
                  );
                })}
            </div>
          </motion.div>
        )}

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
              <Link
                to="/"
                className="text-[9px] text-accent/40 hover:text-accent font-mono tracking-wider uppercase transition-colors"
              >
                New Investigation →
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
