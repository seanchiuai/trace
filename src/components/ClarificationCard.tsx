import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { motion } from "framer-motion";

const AUTO_SKIP_SECONDS = 60;

interface ClarificationCardProps {
  clarificationId: Id<"clarifications">;
  question: string;
  options: string[];
  context?: string;
}

export default function ClarificationCard({
  clarificationId,
  question,
  options,
  context,
}: ClarificationCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_SKIP_SECONDS);
  const submittedRef = useRef(false);

  const respondToClarification = useMutation(api.investigations.respondToClarification);
  const resumeFromClarification = useAction(api.orchestrator.resumeFromClarification);

  const handleSubmit = useCallback(async (answer: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await respondToClarification({ id: clarificationId, response: answer });
      await resumeFromClarification({ clarificationId });
    } catch (e) {
      console.error("Failed to submit clarification:", e);
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [clarificationId, respondToClarification, resumeFromClarification]);

  const handleSkip = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      // Respond with "Not sure" and resume — same flow as a normal answer
      await respondToClarification({ id: clarificationId, response: "Not sure" });
      await resumeFromClarification({ clarificationId });
    } catch (e) {
      console.error("Failed to skip clarification:", e);
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [clarificationId, respondToClarification, resumeFromClarification]);

  // Auto-skip countdown
  useEffect(() => {
    if (submitting) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSkip();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitting, handleSkip]);

  const handleOptionClick = (option: string) => {
    if (option === "Other") {
      setSelected("Other");
    } else {
      setSelected(option);
      handleSubmit(option);
    }
  };

  const handleCustomSubmit = () => {
    const answer = customText.trim();
    if (answer) {
      handleSubmit(answer);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="relative max-w-lg w-full mx-4 bg-[#0d0d14] border border-[#00ff88]/20 rounded-2xl overflow-hidden shadow-2xl shadow-[#00ff88]/5">
        {/* Top accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-[#00ff88]/60 to-transparent" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-bold text-sm">
              ?
            </div>
            <span className="text-[10px] font-bold text-amber-400/80 tracking-[0.2em] uppercase font-mono">
              Agent Needs Input
            </span>
            <div className="flex-1" />
            {/* Countdown */}
            <div className="flex items-center gap-1.5">
              <div className="relative w-5 h-5">
                <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                  <circle
                    cx="10" cy="10" r="8"
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2"
                  />
                  <circle
                    cx="10" cy="10" r="8"
                    fill="none" stroke="#fbbf24" strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 8}
                    strokeDashoffset={2 * Math.PI * 8 * (1 - secondsLeft / AUTO_SKIP_SECONDS)}
                    className="transition-[stroke-dashoffset] duration-1000 linear"
                  />
                </svg>
              </div>
              <span className="text-[10px] text-text-muted font-mono tabular-nums">
                {secondsLeft}s
              </span>
            </div>
          </div>

          {/* Context */}
          {context && (
            <p className="text-[11px] text-text-muted/60 font-mono mb-3 leading-relaxed">
              {context}
            </p>
          )}

          {/* Question */}
          <p className="text-[15px] text-text-primary font-medium leading-relaxed mb-5">
            {question}
          </p>

          {/* Options */}
          <div className="flex flex-col gap-2 mb-4">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => handleOptionClick(option)}
                disabled={submitting}
                className={`w-full text-left px-4 py-3 rounded-xl border text-[13px] font-mono transition-all duration-200 cursor-pointer ${
                  selected === option
                    ? "bg-[#00ff88]/10 border-[#00ff88]/40 text-[#00ff88]"
                    : "bg-white/[0.02] border-white/[0.06] text-text-secondary hover:bg-white/[0.04] hover:border-white/[0.12]"
                } ${submitting ? "opacity-50 pointer-events-none" : ""}`}
              >
                {option}
              </button>
            ))}
            {/* Other option */}
            <button
              onClick={() => setSelected("Other")}
              disabled={submitting}
              className={`w-full text-left px-4 py-3 rounded-xl border text-[13px] font-mono transition-all duration-200 cursor-pointer ${
                selected === "Other"
                  ? "bg-[#00ff88]/10 border-[#00ff88]/40 text-[#00ff88]"
                  : "bg-white/[0.02] border-white/[0.06] text-text-muted hover:bg-white/[0.04] hover:border-white/[0.12]"
              } ${submitting ? "opacity-50 pointer-events-none" : ""}`}
            >
              Other...
            </button>
          </div>

          {/* Custom text input (shown when "Other" is selected) */}
          {selected === "Other" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex gap-2 mb-4"
            >
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                placeholder="Type your answer..."
                autoFocus
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[13px] text-text-primary font-mono placeholder:text-text-muted/30 focus:outline-none focus:border-[#00ff88]/30 transition-colors"
              />
              <button
                onClick={handleCustomSubmit}
                disabled={!customText.trim() || submitting}
                className="px-4 py-2.5 rounded-xl bg-[#00ff88]/15 border border-[#00ff88]/30 text-[#00ff88] text-[12px] font-bold font-mono tracking-wider uppercase hover:bg-[#00ff88]/25 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Send
              </button>
            </motion.div>
          )}

          {/* Skip button */}
          <button
            onClick={handleSkip}
            disabled={submitting}
            className="w-full text-center text-[10px] text-text-muted/40 font-mono tracking-wider uppercase hover:text-text-muted/60 transition-colors cursor-pointer py-1 disabled:pointer-events-none"
          >
            Skip (auto-skips in {secondsLeft}s)
          </button>
        </div>

        {/* Submitting overlay */}
        {submitting && (
          <div className="absolute inset-0 bg-[#0d0d14]/80 flex items-center justify-center rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[#00ff88]/30 border-t-[#00ff88] rounded-full animate-spin" />
              <span className="text-[12px] text-[#00ff88]/80 font-mono tracking-wider">
                Resuming investigation...
              </span>
            </div>
          </div>
        )}

        {/* Bottom accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-[#00ff88]/20 to-transparent" />
      </div>
    </motion.div>
  );
}
