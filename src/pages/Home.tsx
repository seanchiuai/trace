import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion } from "framer-motion";
import InputForm from "../components/InputForm";

function TypeWriter({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span>
      {displayed}
      {started && displayed.length < text.length && (
        <span
          className="inline-block w-[2px] h-[1em] bg-accent ml-0.5 align-text-bottom"
          style={{ animation: "cursorBlink 0.8s step-end infinite" }}
        />
      )}
    </span>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const createInvestigation = useMutation(api.investigations.create);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: {
    targetName: string;
    targetDescription?: string;
    targetPhone?: string;
    targetPhoto?: string;
    knownLinks: string[];
  }) => {
    setLoading(true);
    try {
      const id = await createInvestigation(data);
      navigate(`/investigate/${id}`);
    } catch (err) {
      console.error("Failed to create investigation:", err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Atmospheric background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          animation: "gridFadeIn 2s ease-out forwards",
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

      {/* Diagonal accent line */}
      <div
        className="fixed top-0 right-0 w-px h-screen pointer-events-none opacity-10"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--color-accent) 40%, var(--color-accent) 60%, transparent)",
          transform: "translateX(-120px)",
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
          <div className="relative w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <span className="font-display font-bold text-accent text-sm">T</span>
            <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-accent/50" />
            <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-accent/50" />
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-lg font-bold tracking-tight text-text-primary">
              TRACE
            </h1>
            <div className="h-3 w-px bg-border" />
            <span className="text-[10px] text-text-muted tracking-[0.25em] uppercase font-mono">
              Intelligence System
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Link
              to="/runs"
              className="text-[10px] text-text-muted hover:text-accent tracking-[0.2em] uppercase font-mono transition-colors"
            >
              All Runs
            </Link>
            <div className="flex items-center gap-2">
              <span className="status-dot" />
              <span className="text-[10px] text-text-muted tracking-wider uppercase font-mono">
                Online
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-20">
        {/* Hero section */}
        <div className="max-w-2xl w-full mb-16">
          {/* Classification badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="h-px flex-1 max-w-12 bg-accent/30" />
            <span className="text-[10px] text-accent/60 tracking-[0.3em] uppercase font-mono">
              Autonomous Investigation
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="font-display text-6xl sm:text-7xl font-800 leading-[0.9] tracking-tight mb-8"
          >
            <span className="text-text-primary">Find</span>
            <br />
            <span className="text-accent">anyone.</span>
          </motion.h2>

          {/* Subtitle with typewriter effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-text-secondary text-sm leading-relaxed max-w-md mb-3"
          >
            <TypeWriter
              text="Provide a name, photo, or social link — our AI investigator explores the web autonomously and assembles a comprehensive digital profile."
              delay={1200}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.6 }}
            className="text-text-muted text-xs font-mono"
          >
            Claude Opus / Browser Use / Maigret
          </motion.p>
        </div>

        {/* Form section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="w-full max-w-lg"
        >
          <InputForm onSubmit={handleSubmit} loading={loading} />
        </motion.div>

        {/* Legal disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.8 }}
          className="mt-16 max-w-md text-center"
        >
          <div className="glow-line mb-4 max-w-32 mx-auto" />
          <p className="text-[10px] text-text-muted leading-relaxed tracking-wide">
            For lawful purposes only. Not a consumer reporting agency. Do not
            use for employment, housing, or credit decisions. All data sourced
            from publicly available information. Missing persons & family
            reconnection use only.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
